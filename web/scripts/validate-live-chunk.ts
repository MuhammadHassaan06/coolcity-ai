import fs from "fs";
import path from "path";
import { submitHeatmap, getHeatmapStatus } from "../src/lib/fortyguard/client";
import { normalizeFortyGuardResponse } from "../src/lib/fortyguard/normalize";
import { generateTilingPlan } from "../src/lib/fortyguard/tiling";

// Load .env / .env.local manually if process.env.FORTYGUARD_API_KEY is not already present
function loadEnvSecurely() {
  const envPaths = [
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...valParts] = trimmed.split("=");
          const val = valParts.join("=").trim().replace(/^["']|["']$/g, "");
          if (key.trim() === "FORTYGUARD_API_KEY" && !process.env.FORTYGUARD_API_KEY) {
            process.env.FORTYGUARD_API_KEY = val;
          }
        }
      }
    }
  }
}

loadEnvSecurely();

// HARD SAFETY GUARD: Exactly 1 creation request allowed
const MAX_HEATMAP_CREATIONS = 1;
let creationRequestCount = 0;

async function runSingleChunkValidation() {
  console.log("=========================================================");
  console.log("FORTYGUARD 50 SQ MI SINGLE-CHUNK LIVE VALIDATION");
  console.log("=========================================================");

  if (!process.env.FORTYGUARD_API_KEY) {
    console.error("ERROR: FORTYGUARD_API_KEY is missing from environment.");
    console.error("Please add FORTYGUARD_API_KEY in web/.env.local before running.");
    process.exit(1);
  }

  console.log("API Key Status: CONFIGURED (Key string hidden)");

  // 1. Load Phoenix GeoJSON boundary & generate 50 sq mi tiling plan
  const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");
  if (!fs.existsSync(boundaryPath)) {
    console.error(`ERROR: Boundary file not found at ${boundaryPath}`);
    process.exit(1);
  }

  const geojson = JSON.parse(fs.readFileSync(boundaryPath, "utf-8"));
  const plan = generateTilingPlan(geojson, { maxAreaSqMi: 50.0 });

  // Select Representative Chunk #4 (Central Phoenix, ~47.59 sq mi)
  const targetChunk = plan.subPolygons[4] || plan.subPolygons[0];
  const chunkIndex = targetChunk.properties.chunkIndex;
  const chunkArea = targetChunk.properties.areaSqMi;
  const chunkBounds = targetChunk.properties.bounds;

  console.log(`Selected Chunk Index: ${chunkIndex}`);
  console.log(`Approximate Chunk Area: ${chunkArea} sq mi`);
  console.log(`Polygon Bounds: [${chunkBounds.join(", ")}]`);
  console.log(`Geometry Type: ${targetChunk.geometry.type}`);

  const dateTimeSnapshot = {
    startDate: "2024-07-15",
    filterType: 1,
    startTime: "14:00",
  };
  console.log(`Snapshot Date/Time: ${JSON.stringify(dateTimeSnapshot)}`);

  // Hard Safety Enforcement
  if (creationRequestCount >= MAX_HEATMAP_CREATIONS) {
    throw new Error(`SAFETY GUARD TRIPPED: Exceeded MAX_HEATMAP_CREATIONS limit of ${MAX_HEATMAP_CREATIONS}`);
  }

  creationRequestCount++;
  console.log(`\nSubmitting ONE heatmap creation request (Request #${creationRequestCount} of ${MAX_HEATMAP_CREATIONS})...`);

  const requestPayload = {
    aoi: {
      type: "FeatureCollection" as const,
      features: [targetChunk],
    },
    dateTime: dateTimeSnapshot,
    granularity: 100,
    analyticType: "tcm",
  };

  let submitRes;
  try {
    submitRes = await submitHeatmap(requestPayload);
  } catch (err: unknown) {
    const errorObj = err as { message?: string; status_code?: number };
    console.error(`\n[API REJECTED / SUBMISSION ERROR]: ${errorObj.message || String(err)}`);

    saveValidationResultLocally({
      validationTimestamp: new Date().toISOString(),
      requestedApproxAreaSqMi: chunkArea,
      requestedPolygonBounds: chunkBounds,
      snapshotDateTime: dateTimeSnapshot,
      httpStatus: errorObj.status_code || 500,
      activityId: null,
      finalProcessingStatus: "rejected",
      returnedMapFeatureCount: 0,
      returnedStatsSummary: null,
      requestCreationCount: creationRequestCount,
      rejectionReason: errorObj.message || String(err),
    });

    console.log("\nSTOPPING: Single creation request failed or rejected.");
    return;
  }

  const activityId = submitRes?.data?.activity_id;
  console.log(`API Submission Accepted! HTTP Status: ${submitRes.status_code || 200}`);
  console.log(`Activity ID: ${activityId}`);

  if (!activityId) {
    console.error("ERROR: No activity_id returned by FortyGuard API.");
    return;
  }

  // 2. Poll the SAME activity_id until completed or failed
  console.log("\nPolling status for activity_id (bounded 45s max)...");
  const startTime = Date.now();
  const maxPollMs = 45000;
  const pollIntervalMs = 3000;
  let finalStatusRes = null;

  while (Date.now() - startTime < maxPollMs) {
    try {
      const statusRes = await getHeatmapStatus(activityId);
      const statusStr = String(statusRes?.data?.status || "pending").toLowerCase();

      console.log(`- Status check: '${statusRes?.data?.status || "pending"}'...`);

      if (["completed", "succeeded"].includes(statusStr)) {
        finalStatusRes = statusRes;
        break;
      }

      if (["failed", "error"].includes(statusStr)) {
        console.error(`Upstream processing failed: ${statusRes?.data?.message || statusRes?.message}`);
        finalStatusRes = statusRes;
        break;
      }
    } catch (pollErr: unknown) {
      console.warn(`Warning during status poll: ${(pollErr as Error).message}`);
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  // 3. Process & normalize final result
  if (finalStatusRes && ["completed", "succeeded"].includes(String(finalStatusRes?.data?.status).toLowerCase())) {
    const normalized = normalizeFortyGuardResponse(finalStatusRes);
    console.log("\n=========================================================");
    console.log("50 SQ MI CHUNK VALIDATED SUCCESSFULLY!");
    console.log(`Features Count: ${normalized.mapData.features.length}`);
    console.log(`Temperature Stats (°C): Min=${normalized.stats.minTemperature}, Max=${normalized.stats.maxTemperature}, Mean=${normalized.stats.meanTemperature}`);
    console.log("=========================================================");

    saveValidationResultLocally({
      validationTimestamp: new Date().toISOString(),
      requestedApproxAreaSqMi: chunkArea,
      requestedPolygonBounds: chunkBounds,
      snapshotDateTime: dateTimeSnapshot,
      httpStatus: 200,
      activityId,
      finalProcessingStatus: "completed",
      returnedMapFeatureCount: normalized.mapData.features.length,
      returnedStatsSummary: normalized.stats,
      requestCreationCount: creationRequestCount,
    });
  } else {
    console.log("\n=========================================================");
    console.log(`Activity Processing Status: ${finalStatusRes?.data?.status || "timed_out"}`);
    console.log("=========================================================");

    saveValidationResultLocally({
      validationTimestamp: new Date().toISOString(),
      requestedApproxAreaSqMi: chunkArea,
      requestedPolygonBounds: chunkBounds,
      snapshotDateTime: dateTimeSnapshot,
      httpStatus: submitRes.status_code || 200,
      activityId,
      finalProcessingStatus: finalStatusRes?.data?.status || "timed_out",
      returnedMapFeatureCount: 0,
      returnedStatsSummary: null,
      requestCreationCount: creationRequestCount,
    });
  }
}

function saveValidationResultLocally(result: Record<string, unknown>) {
  const targetDir = path.resolve(__dirname, "../data/live-validation");
  fs.mkdirSync(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, "single-chunk-validation.json");
  fs.writeFileSync(targetFile, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\n[Saved Non-Secret Validation Artifact]: ${targetFile}`);
}

runSingleChunkValidation().catch((err) => {
  console.error("Unhandled Error in Validation Script:", err);
  process.exit(1);
});
