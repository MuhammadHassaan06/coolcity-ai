import { runCoolCityPlanningAgent } from "../src/lib/agent/agent";

/**
 * Manual Integration Test Script for Track 6 Agent
 *
 * Usage:
 * $env:GEMINI_API_KEY="your-real-key"; npx tsx -r ./tests/mock-server-only.cjs scripts/run-agent-integration-test.ts
 */
async function main() {
  console.log("=== CoolCity AI Track 6 Agent - Manual Integration Test ===");
  console.log("GEMINI_API_KEY configured:", process.env.GEMINI_API_KEY ? "YES" : "NO (Running Offline Baseline)");

  const request = {
    goal: "Severe 44°C extreme heat warning in Phoenix. Deploy emergency mobile cooling units and water stations to vulnerable zones with elderly populations.",
    inventory: {
      mobileCoolingUnits: 4,
      waterStations: 8,
      outreachTeams: 3,
    },
  };

  console.log("\n--- Input Request ---");
  console.log(JSON.stringify(request, null, 2));

  try {
    const startTime = Date.now();
    const result = await runCoolCityPlanningAgent(request);
    const duration = Date.now() - startTime;

    console.log(`\n=== Plan Generated Successfully in ${duration}ms ===\n`);
    console.log("--- Summary ---");
    console.log(result.summary);

    console.log("\n--- Priority Zones ---");
    console.table(result.priorityZones);

    console.log("\n--- Allocated Resources ---");
    console.table(result.allocations);

    console.log("\n--- Remaining Inventory ---");
    console.log(result.remainingInventory);

    console.log("\n--- Evidence Sample (Top 5) ---");
    console.table(result.evidence.slice(0, 5));

    if (result.warnings.length > 0) {
      console.log("\n--- Warnings ---");
      console.log(result.warnings);
    }
  } catch (err: unknown) {
    console.error("\n❌ Agent Integration Test Failed:", err);
    process.exit(1);
  }
}

main();
