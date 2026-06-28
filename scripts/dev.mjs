import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Storefront + API routes to pre-compile so dev doesn't wait on first browser refresh. */
const WARMUP_ROUTES = [
  "/",
  "/collections",
  "/new-arrivals",
  "/bestsellers",
  "/search",
  "/admin-portal",
  "/api/admin/session",
];

const nextBin = join(
  root,
  "node_modules",
  "next",
  "dist",
  "bin",
  process.platform === "win32" ? "next" : "next"
);

const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: root,
  stdio: ["inherit", "pipe", "pipe"],
  env: {
    ...process.env,
    WATCHPACK_POLLING: process.platform === "win32" ? "true" : process.env.WATCHPACK_POLLING,
  },
});

let devPort = process.env.PORT ?? "3000";
let warmupStarted = false;

function handleOutput(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);

  const portMatch = text.match(/https?:\/\/localhost:(\d+)/);
  if (portMatch) devPort = portMatch[1];

  if (!warmupStarted && text.includes("Ready in")) {
    warmupStarted = true;
    warmup(devPort).catch(() => {});
  }
}

child.stdout.on("data", handleOutput);
child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  process.stderr.write(text);

  const portMatch = text.match(/https?:\/\/localhost:(\d+)/);
  if (portMatch) devPort = portMatch[1];

  if (!warmupStarted && text.includes("Ready in")) {
    warmupStarted = true;
    warmup(devPort).catch(() => {});
  }
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

async function warmup(port) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const origin = `http://localhost:${port}`;
  console.log(`\nWarming dev routes on ${origin}…`);

  for (const route of WARMUP_ROUTES) {
    try {
      await fetch(`${origin}${route}`, { signal: AbortSignal.timeout(120_000) });
    } catch {
      // Compilation is the goal; auth/404 responses are fine during warmup.
    }
  }

  console.log("Dev warmup complete — common routes are pre-compiled.\n");
}

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
