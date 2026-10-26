import { env, liveCallsBlockedReason } from "../env";
import { ProviderError } from "./nebius";
import { STAGE_TTL_MS, cacheGet, cacheSet, stageCacheKey } from "./cache";
import { clip, stripTags } from "../text";

export interface TavilyHit {
  title: string;
  url: string;
  content: string;
  publisher: string;
}

interface TavilyResponse {
  results?: Array<{ title?: string; url?: string; content?: string }>;
}

export function isFdaGhanaHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return host === "fdaghana.gov.gh" || host.endsWith(".fdaghana.gov.gh");
  } catch {
    return false;
  }
}

function publisherFromUrl(url: string): string {
  return isFdaGhanaHost(url) ? "Ghana FDA" : "Web";
}

let tavilyAttempts = 0;

export function tavilyAttemptCount(): number {
  return tavilyAttempts;
}

export function resetTavilyAttempts(): void {
  tavilyAttempts = 0;
}

function assertLiveAllowed(): void {
  const blocked = liveCallsBlockedReason();
  if (blocked) throw new ProviderError(blocked, "tavily", null);
}

async function searchOnce(query: string, country?: string): Promise<TavilyHit[]> {
  const storedKey = stageCacheKey("tavily", { query, country: country ?? "" });
  const stored = cacheGet(storedKey);
  if (stored) return JSON.parse(stored.text) as TavilyHit[];

  tavilyAttempts += 1;
  assertLiveAllowed();
  const key = env("TAVILY_API_KEY");
  if (!key) throw new ProviderError("TAVILY_API_KEY is not set.", "tavily", null);

  const body: Record<string, unknown> = {
    query,
    search_depth: "basic",
    topic: "general",
    max_results: 5,
    chunks_per_source: 2,
    include_domains: ["fdaghana.gov.gh"],
  };
  if (country) body.country = country;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3_000),
  });

  if (!response.ok) {
    if (country && response.status === 400) return searchOnce(query);
    throw new ProviderError(`Tavily search failed (${response.status}).`, "tavily", response.status);
  }

  const payload = (await response.json()) as TavilyResponse;
  const hits = (payload.results ?? [])
    .map((result) => {
      const url = result.url ?? "";
      if (!url.startsWith("http")) return null;
      return {
        title: clip(stripTags(result.title || url), 160) || url,
        url,
      content: clip(stripTags(result.content || ""), 500),
      publisher: publisherFromUrl(url),
    };
    })
    .filter((hit): hit is TavilyHit => hit !== null && isFdaGhanaHost(hit.url));
  cacheSet(
    storedKey,
    {
      text: JSON.stringify(hits),
      usage: null,
      answerSource: "search",
    },
    STAGE_TTL_MS.tavily,
  );
  return hits;
}

export async function searchPublicAlerts(productName: string, batch: string): Promise<{
  hits: TavilyHit[];
  queries: string[];
  partial: boolean;
}> {
  const name = productName.trim();
  const lot = batch.trim();
  const queries = [
    [name, lot, "Ghana FDA recall alert"].filter(Boolean).join(" "),
    [name || lot, "Ghana FDA safety alert"].filter(Boolean).join(" "),
  ];

  const settled = await Promise.allSettled([
    searchOnce(queries[0], "ghana"),
    searchOnce(queries[1]),
  ]);

  const hits: TavilyHit[] = [];
  let failures = 0;
  for (const result of settled) {
    if (result.status === "fulfilled") hits.push(...result.value);
    else failures += 1;
  }
  if (failures === settled.length) {
    const reason = settled[0].status === "rejected" ? settled[0].reason : null;
    if (reason instanceof ProviderError) throw reason;
    throw new ProviderError("Tavily search failed.", "tavily", null);
  }

  const seen = new Set<string>();
  const unique = hits.filter((hit) => {
    if (seen.has(hit.url)) return false;
    seen.add(hit.url);
    return true;
  });
  return { hits: unique.slice(0, 8), queries, partial: failures > 0 };
}
