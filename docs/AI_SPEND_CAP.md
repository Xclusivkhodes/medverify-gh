# AI spend cap

Live AI runs on Nebius Token Factory. The account has $1 of credit, shared by three hackathon apps. MedVerify GH gets **$0.30** of it, and the three caps add up to $0.90, which leaves a 10% margin.

## How the cap works (`lib/server/ai-spend-cap.ts`)

1. Before each live call, the server reserves the worst case: the estimated prompt tokens (about chars/3, plus 1600 per photo) at the model's input price, plus `max_tokens` at its output price.
2. If that reservation would take the total past the cap, the call is refused and never sent. If the cap is already used up when a check starts, the whole check runs in demo mode (rules and bundled FDA notices) and shows: *"The AI spend cap for this app is used up, so live AI is off. Showing demo results instead."* If the cap runs out partway through, the remaining model steps fall back to the rules.
3. When the reply comes back, the reservation is settled to the real cost from the `usage` field of the API response. If there is no usage, or the call timed out or failed after it was sent, the worst case is kept. A retry after a timeout reserves again.
4. Every call sends `max_tokens`: 512 by default, with a hard limit of 1024, inside a 2048-token budget per check. A failed parse is still counted.

Prices are per 1M tokens, from https://tokenfactory.nebius.com/model-catalog.md, checked on 2026-10-30. A model not in the table is priced at the Ultra rate, which is the safe side.

| Model | Input | Output |
|---|---|---|
| Nano-30B-A3B / Nemotron-3_5-Lightning | $0.06 | $0.24 |
| nemotron-3-super-120b-a12b / Nemotron-3.5-Super-VL | $0.30 | $0.90 |
| Ultra-550b | $1.00 | $3.00 |

## The math

A live check reads the pack photo with Super-VL, then runs Nano to normalise the fields and Nano to write the verdict. Super is optional and only used under the soft line.
- Vision: about 2,100 prompt tokens × $0.30/M plus up to 512 out × $0.90/M ≈ $0.0011.
- Two Nano steps ≈ $0.0004.
- The optional Super step ≈ $0.0012.
- The worst case is **about $0.003 per check**, and the 2048-token output budget keeps it there. A typical check is about $0.0012.
- The demo plan is about 100 live checks (judges plus rehearsals): 100 × $0.003 = **$0.30**, which is the cap at the worst case. At typical cost that is about 250 checks. Example scenarios always use the bundled snapshot and cost $0.

## Where the running total is kept

| Store | When | Limits |
|---|---|---|
| Upstash Redis (`INCRBYFLOAT ai-spend-cap:medverify-gh:usd`) | `UPSTASH_REDIS_REST_URL` + `_TOKEN`, or `KV_REST_API_URL` + `_TOKEN` | Durable and shared across all serverless instances. **Recommended on Vercel.** |
| File `data/ai-spend.json` (or `AI_SPEND_FILE`) | Local or single-server runs | Durable on one machine only. |
| `/tmp` file on Vercel | Only if `AI_SPEND_ALLOW_EPHEMERAL=1` | Each instance has its own counter, and the counter resets on a cold start, so the real spend can go past the cap. |

On Vercel with no Redis and no `AI_SPEND_ALLOW_EPHEMERAL=1`, live calls are refused and the app stays in demo mode.

## Settings

- `AI_SPEND_CAP_USD`: the cap in USD. The default is `0.30`.
- `BUDGET_USD`: an older setting, still read, but it can only *lower* the cap.

## Adding your own key (Eli)

The repo and Vercel hold no key. To go live:

1. In Vercel, open the project, go to **Storage**, and add **Upstash for Redis** from the Marketplace. This creates the `KV_REST_API_*` variables.
2. In **Settings → Environment Variables (Production)**, add `NEBIUS_API_KEY` (mark it Sensitive). Live checks also need `TAVILY_API_KEY`. Then set `LLM_ENABLED=true` and `DEMO_MODE=false`. You can also set `AI_SPEND_CAP_USD=0.30`.
3. Redeploy. To return to demo mode, remove the key or set `DEMO_MODE=true`.
