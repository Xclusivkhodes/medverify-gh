export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertBootEnv } = await import("./lib/server/env-check");
  assertBootEnv();
}
