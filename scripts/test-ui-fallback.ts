/**
 * Exercises the REAL src/services/api.ts code (not a reimplementation) in
 * both branches:
 *  1. LIVE:     global.fetch patched to hit the actual running dev server ->
 *               should return real data and flip connectionStatus to "live".
 *  2. FALLBACK: global.fetch patched to hit a port nothing is listening on ->
 *               should catch the network error and transparently return
 *               mockApi's demo data instead, flipping connectionStatus to
 *               "fallback".
 *
 * Run with the dev server already up on the given port:
 *   npx next dev -p 3315 &
 *   npx tsx scripts/test-ui-fallback.ts 3315
 */
import { getConnectionState } from "../src/services/connectionStatus";

const port = process.argv[2] ?? "3315";
const originalFetch = global.fetch;

function patchFetchTo(baseUrl: string) {
  global.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" && input.startsWith("/") ? `${baseUrl}${input}` : input;
    return originalFetch(url as string, init);
  }) as typeof fetch;
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`OK:   ${msg}`);
  }
}

async function main() {
  // --- 1. LIVE path: point fetch at the real running server ---
  patchFetchTo(`http://localhost:${port}`);
  const { CaseService } = await import("../src/services/api");

  const liveCases = await CaseService.getCases();
  assert(Array.isArray(liveCases), "live getCases() returns an array");
  assert(getConnectionState().state === "live", "connection state is 'live' when the real server responds");
  console.log(`  -> got ${liveCases.length} real case(s) from the live server`);

  // --- 2. FALLBACK path: point fetch at a port nothing is listening on ---
  patchFetchTo("http://localhost:1"); // guaranteed connection refused
  const fallbackCases = await CaseService.getCases();
  assert(Array.isArray(fallbackCases), "fallback getCases() still returns an array (didn't throw to the UI)");
  assert(fallbackCases.length === 3, "fallback returns the 3 seeded mock demo cases");
  assert(
    fallbackCases.some((c) => c.id === "case_001" && c.title === "ISP Technician Appointment"),
    "fallback data matches the known mock seed (ISP Technician Appointment)"
  );
  const state = getConnectionState();
  assert(state.state === "fallback", "connection state flips to 'fallback' when the real server is unreachable");
  assert(!!state.reason, "a human-readable failure reason is captured");
  console.log(`  -> fallback reason: "${state.reason}"`);

  // --- 3. Recovery: once the server is reachable again, it goes back to live ---
  patchFetchTo(`http://localhost:${port}`);
  await CaseService.getCases();
  assert(getConnectionState().state === "live", "connection state recovers to 'live' once the server is reachable again");

  console.log(process.exitCode === 1 ? "\nSome assertions FAILED." : "\nAll assertions PASSED.");
}

main();
