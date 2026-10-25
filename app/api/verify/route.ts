import { publicStatus } from "@/lib/env";
import { MedicineModeError, runMedicineCheck } from "@/lib/modes/medicine/pipeline";
import type { VerifyBody } from "@/lib/modes/medicine/types";
import { clientKey, corsHeaders, rateLimit } from "@/lib/server/limit";
import { budgetPublic } from "@/lib/server/spend";

export const maxDuration = 60;

function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

export function OPTIONS(request: Request) {
  return withCors(request, new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
  return withCors(
    request,
    Response.json({
      ...publicStatus(),
      service: "medverify-gh",
      budget: budgetPublic(),
      llmKillSwitch: process.env.LLM_ENABLED === "false",
      checkedAt: new Date().toISOString(),
    }),
  );
}

export async function POST(request: Request) {
  const perIp = Number(process.env.RATE_LIMIT_PER_MINUTE ?? "30");
  const globalLimit = Number(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE ?? "120");
  const ip = rateLimit(`ip:${clientKey(request)}`, Number.isFinite(perIp) ? perIp : 30);
  const all = rateLimit("global", Number.isFinite(globalLimit) ? globalLimit : 120);
  if (!ip.ok || !all.ok) {
    const retryAfter = !ip.ok ? ip.retryAfter : !all.ok ? all.retryAfter : 60;
    return withCors(
      request,
      Response.json(
        { error: "Too many checks from this network. Wait a minute and try again." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      ),
    );
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return withCors(request, Response.json({ error: "Send a JSON body." }, { status: 400 }));
  }

  const mode = body.mode ?? "medicine";
  if (mode !== "medicine") {
    return withCors(
      request,
      Response.json({ error: "Only medicine mode is available. A future shell can register other modes." }, { status: 400 }),
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const result = await runMedicineCheck(body, { onStage: (step) => send("stage", step) });
        send("result", result);
      } catch (error) {
        const status = error instanceof MedicineModeError ? error.status : 500;
        const message = status >= 500 ? "The check failed. Try again." : error instanceof Error ? error.message : "The check failed.";
        send("error", { error: message, status });
      } finally {
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
      },
    }),
  );
}
