import { demoDecision } from "../env";
import { breakerIsOpen } from "./breaker";
import { llmPaused } from "./pause";
import { budgetPublic, spendDirWritable } from "./spend";

export type ReadyBody = {
  ok: boolean;
  mode: "demo" | "live";
  llm: "ok" | "paused" | "breaker_open";
};

export async function readyBody(): Promise<ReadyBody> {
  const decision = demoDecision();
  const mode = decision.demo ? "demo" : "live";
  const llm = breakerIsOpen()
    ? "breaker_open"
    : llmPaused() || decision.liveBlocked || budgetPublic().hardReached
      ? "paused"
      : "ok";
  const writable = mode === "demo" ? true : await spendDirWritable();
  return {
    ok: mode === "demo" ? true : writable && !decision.liveBlocked,
    mode,
    llm,
  };
}
