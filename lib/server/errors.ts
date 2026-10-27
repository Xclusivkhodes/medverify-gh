export const ERROR_CODES = [
  "RATE_LIMITED",
  "BAD_INPUT",
  "LLM_UNAVAILABLE",
  "BUDGET_PAUSED",
  "NOT_FOUND",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function errorBody(error: string, code: ErrorCode, requestId: string) {
  return { error, code, requestId };
}
