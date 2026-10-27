import { adminAuthorized } from "@/lib/server/admin";
import { errorBody } from "@/lib/server/errors";
import { llmPaused, setLlmPaused } from "@/lib/server/pause";
import { acceptRequestId } from "@/lib/server/request-id";

export async function POST(request: Request) {
  const requestId = acceptRequestId(request.headers.get("x-request-id"));
  if (!adminAuthorized(request)) {
    return Response.json(errorBody("Not found.", "NOT_FOUND", requestId), { status: 404, headers: { "x-request-id": requestId } });
  }
  const body = (await request.json().catch(() => null)) as { paused?: unknown } | null;
  if (!body || typeof body.paused !== "boolean") {
    return Response.json(errorBody("Send paused true or false.", "BAD_INPUT", requestId), { status: 400 });
  }
  setLlmPaused(body.paused);
  return Response.json({ paused: llmPaused() }, { headers: { "x-request-id": requestId } });
}
