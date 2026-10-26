import { adminStatus, isAdmin } from "../../verify/route";
import { errorBody } from "@/lib/server/errors";
import { acceptRequestId } from "@/lib/server/request-id";

export function GET(request: Request) {
  const requestId = acceptRequestId(request.headers.get("x-request-id"));
  if (!isAdmin(request)) {
    return Response.json(errorBody("Not found.", "NOT_FOUND", requestId), { status: 404, headers: { "x-request-id": requestId } });
  }
  return Response.json(adminStatus(), { headers: { "x-request-id": requestId } });
}
