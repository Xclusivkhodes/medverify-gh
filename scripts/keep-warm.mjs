/**
 * Inbound ping for a judging window. Not imported by the app.
 *
 * Render free web services spin down after 15 minutes without an inbound request.
 * An inbound ping delays that and uses free instance hours (750 per workspace per month).
 * Set KEEP_WARM_URL to the site origin, with no trailing slash, only while you want that.
 *
 *   KEEP_WARM_URL=https://example.onrender.com node scripts/keep-warm.mjs
 */

const base = process.env.KEEP_WARM_URL?.trim();
if (!base) {
  console.error("KEEP_WARM_URL is not set. The app does not ping itself.");
  process.exit(1);
}

const url = `${base.replace(/\/$/, "")}/api/healthz`;
const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) {
  console.error(`Keep-warm ping failed (${response.status}) for ${url}`);
  process.exit(1);
}
console.log(`Keep-warm ping ok: ${url}`);
