const BUCKETS = [5, 10, 25, 50, 100, 150, 250, 400, 800, 1500, 3000, 8000, 15000, 25000];

type Hist = { counts: number[]; count: number; sum: number };

const routes = new Map<string, Hist>();
const models = new Map<string, Hist>();

function empty(): Hist {
  return { counts: BUCKETS.map(() => 0), count: 0, sum: 0 };
}

function add(map: Map<string, Hist>, key: string, ms: number): void {
  const hist = map.get(key) ?? empty();
  const index = BUCKETS.findIndex((edge) => ms <= edge);
  hist.counts[index === -1 ? BUCKETS.length - 1 : index] += 1;
  hist.count += 1;
  hist.sum += ms;
  map.set(key, hist);
}

function percentile(hist: Hist, p: number): number {
  if (hist.count === 0) return 0;
  const target = Math.ceil((p / 100) * hist.count);
  let seen = 0;
  for (let i = 0; i < hist.counts.length; i += 1) {
    seen += hist.counts[i];
    if (seen >= target) return BUCKETS[i];
  }
  return BUCKETS[BUCKETS.length - 1];
}

function snapshot(map: Map<string, Hist>) {
  return Object.fromEntries(
    [...map.entries()].map(([key, hist]) => [
      key,
      {
        count: hist.count,
        p50: percentile(hist, 50),
        p95: percentile(hist, 95),
        p99: percentile(hist, 99),
      },
    ]),
  );
}

export function observeRoute(route: string, ms: number): void {
  add(routes, route, ms);
}

export function observeModel(model: string, ms: number): void {
  add(models, model, ms);
}

export function metricsSnapshot() {
  return { routes: snapshot(routes), models: snapshot(models) };
}

export function resetMetrics(): void {
  routes.clear();
  models.clear();
}
