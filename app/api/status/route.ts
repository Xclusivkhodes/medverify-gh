import { clientKey, corsHeaders } from "@/lib/server/limit";
import { hashIp, logRequest } from "@/lib/server/log";
import { observeRoute } from "@/lib/server/metrics";
import { readyBody } from "@/lib/server/ready";
import { acceptRequestId } from "@/lib/server/request-id";

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const started = Date.now();
  const requestId = acceptRequestId(request.headers.get("x-request-id"));
  const body = await readyBody();
  observeRoute("GET /api/status", Date.now() - started);
  logRequest({
    requestId,
    route: "GET /api/status",
    status: 200,
    ms: Date.now() - started,
    mode: body.mode,
    ipHash: hashIp(clientKey(request)),
  });
  return Response.json(body, { headers: { ...corsHeaders(request), "x-request-id": requestId } });
}
