/**
 * Demo-mode load check. The server must already be listening.
 * DEMO_PACE_MS=0, or the scripted pause will miss the p50 target.
 *
 *   DEMO_MODE=true LLM_ENABLED=false DEMO_PACE_MS=0 npm run start
 *   node scripts/load-demo.mjs
 */
import { spawn } from "node:child_process";

const url = process.env.LOAD_URL ?? "http://127.0.0.1:43123/api/verify";
const child = spawn(
  "npx",
  [
    "--yes",
    "autocannon",
    "-c",
    "20",
    "-d",
    "30",
    "-m",
    "POST",
    "-H",
    "content-type: application/json",
    "-b",
    '{"mode":"medicine","scenarioId":"clearview-drops"}',
    url,
  ],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
