/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";

// 1. Load .env.local from project root securely
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  }
}

// Check process.env.FORTYGUARD_API_KEY existence WITHOUT printing key
if (!process.env.FORTYGUARD_API_KEY || process.env.FORTYGUARD_API_KEY.trim() === "") {
  console.error(">>> [ERROR] process.env.FORTYGUARD_API_KEY is missing or empty.");
  process.exit(1);
}
console.log(">>> [CONFIRMED] process.env.FORTYGUARD_API_KEY exists in local environment.");

// Mock 'server-only' for Node standalone CLI runner context
import moduleAlias from "module";
const originalRequire = (moduleAlias.prototype as any).require;
(moduleAlias.prototype as any).require = function (modulePath: string) {
  if (modulePath === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

const PHOENIX_AOI: any = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-112.0790, 33.4435],
            [-112.0690, 33.4435],
            [-112.0690, 33.4525],
            [-112.0790, 33.4525],
            [-112.0790, 33.4435],
          ],
        ],
      },
    },
  ],
};

async function runIntegrationTest() {
  const { submitHeatmap, getHeatmapStatus } = await import("../src/lib/fortyguard/client");

  console.log("==================================================");
  console.log("Starting REAL FortyGuard Integration Test");
  console.log("Endpoint: POST https://api.fortyguard.com/v1/heatmap");
  console.log("Status:   GET  https://api.fortyguard.com/v1/status/{activity_id}");
  console.log("AOI:      Phoenix, Arizona rectangular polygon");
  console.log("Params:   filter_type: 1 (single-hour 2024-07-15 14:00), granularity: 100, analytic_type: 'tcm'");
  console.log("==================================================");

  const startTime = Date.now();

  // 1. Submit Request
  console.log("\n[STEP 1] Submitting heatmap request...");
  const submitResponse = await submitHeatmap({
    polygon_aoi: PHOENIX_AOI,
    date_time: {
      start_date: "2024-07-15",
      filter_type: 1,
      start_time: "14:00",
    },
    granularity: 100,
    analytic_type: "tcm",
  });

  const activityId = submitResponse.data.activity_id;
  console.log(`>>> [SUBMIT SUCCESS] activity_id: ${activityId}`);
  console.log(">>> Submit response metadata:", JSON.stringify({
    error: submitResponse.error || false,
    message: submitResponse.message || "Request accepted",
  }));

  // 2. Bounded Polling
  console.log("\n[STEP 2] Starting bounded status polling (interval: 5s, max duration: 600s)...");
  
  const pollIntervalMs = 5000;
  const maxDurationMs = 600000; // 10 minutes
  let attempt = 0;
  let statusResponse: any = null;
  let isTerminal = false;

  while (Date.now() - startTime < maxDurationMs) {
    attempt++;
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

    try {
      statusResponse = await getHeatmapStatus(activityId);
      const data = statusResponse?.data || {};
      const statusRaw = String(data.status || "unknown");
      const statusLower = statusRaw.toLowerCase();

      console.log(`  [Poll #${attempt} | ${elapsedSec}s elapsed] Status: "${statusRaw}"`);

      if (["completed", "succeeded"].includes(statusLower)) {
        isTerminal = true;
        console.log(`>>> [POLL TERMINAL SUCCESS] Task reached state: "${statusRaw}" after ${elapsedSec} seconds.`);
        break;
      }

      if (["failed", "error"].includes(statusLower)) {
        isTerminal = true;
        console.error(`>>> [POLL TERMINAL FAILURE] Task failed with state: "${statusRaw}". Message: ${data.message || statusResponse.message}`);
        break;
      }
    } catch (pollErr: any) {
      console.warn(`  [Poll #${attempt} | ${elapsedSec}s elapsed] Polling error: ${pollErr.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!isTerminal) {
    console.error(`>>> [POLL TIMEOUT] Polling timed out after ${totalDurationSec}s.`);
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log(`Integration Test Completed in ${totalDurationSec}s`);
  console.log("==================================================");

  // 3. Save raw response for analysis
  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const rawPath = path.resolve(scratchDir, "fortyguard-real-response-raw.json");
  fs.writeFileSync(rawPath, JSON.stringify(statusResponse, null, 2), "utf-8");
  console.log(`Saved raw full response to: ${rawPath}`);
}

runIntegrationTest().catch((err) => {
  console.error(">>> [FATAL ERROR] Integration test threw exception:", err);
  process.exit(1);
});
