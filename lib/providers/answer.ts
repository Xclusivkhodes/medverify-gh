import { parseModelJson } from "../text";

export type AssistantMessage = {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
};

export type ExtractedAnswer = {
  text: string;
  source: "content" | "reasoning_content";
};

/**
 * Nemotron Super (and any model that reasons first) can fill max_tokens with
 * reasoning and return content: null. The reasoning is on
 * message.reasoning_content, not in content. Recover a JSON object from that
 * channel when it is there. Otherwise fail with a cap message instead of
 * treating the reasoning trace as the verdict.
 */
export function extractAssistantText(
  message: AssistantMessage | null | undefined,
  finishReason?: string | null,
): ExtractedAnswer {
  const content = message?.content?.trim() ?? "";
  if (content) {
    try {
      parseModelJson(content);
      return { text: content, source: "content" };
    } catch {
      // A non-JSON content stub can sit in front of the JSON in reasoning.
    }
  }

  const reasoning = (message?.reasoning_content ?? message?.reasoning ?? "").trim();
  if (reasoning) {
    try {
      const json = parseModelJson(reasoning);
      return { text: JSON.stringify(json), source: "reasoning_content" };
    } catch {
      const finish = finishReason ? ` Finish reason: ${finishReason}.` : "";
      throw new Error(
        `The model spent the token cap on reasoning and returned no answer.${finish} Raise NEBIUS_MAX_TOKENS, or keep text steps on Lightning or Nano.`,
      );
    }
  }

  if (content) return { text: content, source: "content" };
  throw new Error("The model returned an empty answer.");
}
