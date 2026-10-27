import { z } from "zod";

const envSchema = z.object({
  DEMO_MODE: z.string().optional(),
  LLM_ENABLED: z.string().optional(),
  NEBIUS_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  NEBIUS_BASE_URL: z.string().optional(),
  TRUST_PROXY: z.enum(["0", "1"]).optional(),
  ADMIN_SECRET: z.string().optional(),
});

/** Fail only when live mode is forced and a required key is missing. Demo boot stays up. */
export function assertBootEnv(): void {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Environment variables are not valid.");
  }
  const mode = (process.env.DEMO_MODE ?? "true").trim().toLowerCase();
  const llm = (process.env.LLM_ENABLED ?? "").trim().toLowerCase();
  const forcedLive = mode === "false" || mode === "0" || mode === "live";
  const llmOff = llm === "false" || llm === "0" || llm === "off" || llm === "no";
  if (!forcedLive || llmOff) return;
  if (!process.env.NEBIUS_API_KEY?.trim() || !process.env.TAVILY_API_KEY?.trim()) {
    throw new Error("DEMO_MODE is live, but NEBIUS_API_KEY or TAVILY_API_KEY is missing.");
  }
  const base = process.env.NEBIUS_BASE_URL?.trim();
  if (base && !/^https?:\/\//.test(base)) {
    throw new Error("NEBIUS_BASE_URL must be an http(s) URL.");
  }
}
