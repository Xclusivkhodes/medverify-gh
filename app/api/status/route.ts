import { publicStatus } from "@/lib/env";
import { corsHeaders } from "@/lib/server/limit";
import { budgetPublic } from "@/lib/server/spend";

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  return Response.json(
    {
      ...publicStatus(),
      budget: budgetPublic(),
      llmKillSwitch: process.env.LLM_ENABLED === "false",
      checkedAt: new Date().toISOString(),
    },
    { headers: corsHeaders(request) },
  );
}
