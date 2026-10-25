import { apiUrl } from "@/lib/client/api";
import type { TraceStep } from "@/lib/modes/types";
import type { MedicineResult, VerifyBody } from "@/lib/modes/medicine/types";

export async function streamCheck(
  body: VerifyBody,
  onStage: (step: TraceStep) => void,
  signal?: AbortSignal,
): Promise<MedicineResult> {
  const response = await fetch(apiUrl("/api/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "The check failed.");
  }
  if (!response.body) throw new Error("The check could not reach the server.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: MedicineResult | null = null;
  let failure: string | null = null;

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const event = part.match(/^event: (.+)$/m)?.[1] ?? "message";
      const dataLine = part
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!dataLine) continue;
      const data = JSON.parse(dataLine) as TraceStep & MedicineResult & { error?: string };
      if (event === "stage") onStage(data);
      if (event === "result") result = data;
      if (event === "error") failure = data.error || "The check failed.";
    }
  }

  if (failure) throw new Error(failure);
  if (!result) throw new Error("The check ended without an answer.");
  return result;
}
