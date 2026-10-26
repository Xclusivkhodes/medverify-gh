# Demo load

Measured on 26 October 2026 against `next start` on this machine (Node 22), `DEMO_MODE=true`, `LLM_ENABLED=false`, `DEMO_PACE_MS=0`.

Command:

```bash
npx autocannon -c 20 -d 30 -m POST \
  -H 'content-type: application/json' \
  -b '{"mode":"medicine","scenarioId":"clearview-drops"}' \
  http://127.0.0.1:43123/api/verify
```

The sample is the ClearView example. The server forces demo for a `scenarioId`, so the run does not call Nebius or Tavily.

## Check latency

Rate limits were raised (`RATE_LIMIT_PER_MINUTE=100000`, `RATE_LIMIT_GLOBAL_PER_MINUTE=100000`) so the 30 second flood measured the check, not the 429 short-circuit.

| Stat | Result | Target |
| --- | --- | --- |
| p50 | 33 ms | ≤ 150 ms |
| p99 | 102 ms | ≤ 800 ms |
| Requests | 16k in 30.01 s | |
| Non-2xx | none reported | only deliberate 429s |

## Default limiter

With the shipped limits (30 per minute per caller, 120 per minute globally) the same command returned 29 successes and 31,128 `429` responses. Those 429s are the rate limiter. Latency on that run was p50 18 ms and p99 36 ms, mostly the rejection path.
