/**
 * Shared mode contract for a future ScamCheck GH shell.
 * Medicine mode is the only registered mode in this MVP.
 * A scam mode would implement CheckMode and be added in registry.ts.
 */

export type ModeId = "medicine";

export type TraceStatus = "ok" | "skipped" | "demo" | "fallback" | "error";

export interface TraceStep {
  id: string;
  title: string;
  provider: "nebius" | "tavily" | "rules" | "demo";
  model: string | null;
  role: string;
  summary: string;
  status: TraceStatus;
  durationMs: number;
}

export interface CheckMode<TInput, TResult> {
  id: ModeId;
  label: string;
  description: string;
  run(input: TInput): Promise<TResult>;
}
