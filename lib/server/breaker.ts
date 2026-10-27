const WINDOW_MS = 30_000;
const OPEN_MS = 30_000;
const FAILURES_TO_OPEN = 5;

type State = "closed" | "open" | "half_open";

let failures: number[] = [];
let openedAt = 0;
let state: State = "closed";
let probeInFlight = false;

function now(): number {
  return Date.now();
}

function refresh(): State {
  if (state === "open" && now() - openedAt >= OPEN_MS) {
    state = "half_open";
    probeInFlight = false;
  }
  return state;
}

export function breakerState(): State {
  return refresh();
}

/** Call before a network attempt. "open" means do not call. "probe" is the single half-open try. */
export function breakerBeforeCall(): "ok" | "open" | "probe" {
  const current = refresh();
  if (current === "closed") return "ok";
  if (current === "open") return "open";
  if (probeInFlight) return "open";
  probeInFlight = true;
  return "probe";
}

export function breakerSuccess(): void {
  failures = [];
  state = "closed";
  probeInFlight = false;
  openedAt = 0;
}

export function breakerFailure(): void {
  probeInFlight = false;
  const stamp = now();
  failures = failures.filter((item) => stamp - item < WINDOW_MS);
  failures.push(stamp);
  if (state === "half_open" || failures.length >= FAILURES_TO_OPEN) {
    state = "open";
    openedAt = stamp;
    failures = [];
  }
}

export function breakerIsOpen(): boolean {
  const current = refresh();
  if (current === "open") return true;
  return current === "half_open" && probeInFlight;
}

export function resetBreaker(): void {
  failures = [];
  openedAt = 0;
  state = "closed";
  probeInFlight = false;
}
