import { readyBody } from "@/lib/server/ready";
import { acceptRequestId } from "@/lib/server/request-id";

export async function GET(request: Request) {
  const requestId = acceptRequestId(request.headers.get("x-request-id"));
  const body = await readyBody();
  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "x-request-id": requestId } });
}
