import { prewarmShowcase } from "@/lib/modes/medicine/prewarm";
import { MedicineModeError, runMedicineCheck } from "@/lib/modes/medicine/pipeline";
import { verifyBodySchema } from "@/lib/modes/medicine/schemas";
import { publicStatus } from "@/lib/env";
import { adminAuthorized } from "@/lib/server/admin";
import { readLimitedJson, BodyError } from "@/lib/server/body";
import { errorBody, type ErrorCode } from "@/lib/server/errors";
import { clientKey, corsHeaders, rateLimit } from "@/lib/server/limit";
import { hashIp, logRequest } from "@/lib/server/log";
import { observeRoute } from "@/lib/server/metrics";
import { readyBody } from "@/lib/server/ready";
import { acceptRequestId } from "@/lib/server/request-id";
import { budgetPublic } from "@/lib/server/spend";

prewarmShowcase();

export const maxDuration = 60;

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

function jsonError(request: Request, requestId: string, status: number, message: string, code: ErrorCode) {
  return withCors(
    request,
    Response.json(errorBody(message, code, requestId), {
      status,
      headers: { "x-request-id": requestId, ...(status === 429 ? { "Retry-After": "60" } : {}) },
    }),
  );
}

export function OPTIONS(request: Request) {
  return withCors(request, new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
  const started = Date.now();
  const requestId = acceptRequestId(request.headers.get("x-request-id"));
  const body = await readyBody();
  const response = withCors(
    request,
    Response.json(body, { headers: { "x-request-id": requestId } }),
  );
  observeRoute("GET /api/verify", Date.now() - started);
  logRequest({
    requestId,
    route: "GET /api/verify",
    status: response.status,
    ms: Date.now() - started,
    mode: body.mode,
    ipHash: hashIp(clientKey(request)),
  });
  return response;
}

export async function POST(request: Request) {
  const started = Date.now();
  const requestId = acceptRequestId(request.headers.get("x-request-id"));
  const perIp = Number(process.env.RATE_LIMIT_PER_MINUTE ?? "30");
  const globalLimit = Number(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE ?? "120");
  const ip = rateLimit(`ip:${clientKey(request)}`, Number.isFinite(perIp) ? perIp : 30);
  const all = rateLimit("global", Number.isFinite(globalLimit) ? globalLimit : 120);
  if (!ip.ok || !all.ok) {
    const retryAfter = !ip.ok ? ip.retryAfter : !all.ok ? all.retryAfter : 60;
    const response = jsonError(request, requestId, 429, "Too many checks from this network. Wait a minute and try again.", "RATE_LIMITED");
    response.headers.set("Retry-After", String(retryAfter));
    logRequest({
      requestId,
      route: "POST /api/verify",
      status: 429,
      ms: Date.now() - started,
      mode: "demo",
      ipHash: hashIp(clientKey(request)),
    });
    return response;
  }

  let parsed: unknown;
  try {
    parsed = await readLimitedJson(request);
  } catch (error) {
    const status = error instanceof BodyError ? error.status : 400;
    const message = error instanceof BodyError ? error.message : "Send a JSON body.";
    return jsonError(request, requestId, status, message, "BAD_INPUT");
  }
  const body = verifyBodySchema.safeParse(parsed);
  if (!body.success) {
    return jsonError(request, requestId, 400, "The check body was not valid.", "BAD_INPUT");
  }
  if ((body.data.mode ?? "medicine") !== "medicine") {
    return jsonError(request, requestId, 400, "Only medicine mode is available.", "BAD_INPUT");
  }

  const encoder = new TextEncoder();
  let status = 200;
  let mode: "demo" | "live" | "fallback" = "demo";
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const result = await runMedicineCheck(body.data, { onStage: (step) => send("stage", step) });
        mode = result.runMode === "live" ? "live" : result.runMode === "fallback" ? "fallback" : "demo";
        send("result", result);
      } catch (error) {
        const coded = error instanceof MedicineModeError ? error.status : 500;
        status = coded;
        const code: ErrorCode =
          error instanceof MedicineModeError ? error.code : "INTERNAL";
        const message =
          coded >= 500 && !(error instanceof MedicineModeError)
            ? "The check failed. Try again."
            : error instanceof Error
              ? error.message
              : "The check failed.";
        const safe = coded >= 500 && code === "INTERNAL" ? "The check failed. Try again." : message;
        send("error", { ...errorBody(safe, code, requestId), status: coded });
      } finally {
        observeRoute("POST /api/verify", Date.now() - started);
        logRequest({
          requestId,
          route: "POST /api/verify",
          status,
          ms: Date.now() - started,
          mode,
          ipHash: hashIp(clientKey(request)),
        });
        controller.close();
      }
    },
  });

  return withCors(
    request,
    new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "x-request-id": requestId,
      },
    }),
  );
}

export function adminStatus() {
  return { ...publicStatus(), budget: budgetPublic() };
}

export function isAdmin(request: Request): boolean {
  return adminAuthorized(request);
}
