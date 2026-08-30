import fs from "fs";
import path from "path";
import { submitHeatmap, getHeatmapStatus } from "../src/lib/fortyguard/client";
import { normalizeFortyGuardResponse } from "../src/lib/fortyguard/normalize";
import { generateTilingPlan } from "../src/lib/fortyguard/tiling";

// Load environment variables securely without exposing values
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
          const cleanKey = key.trim();
          if (cleanKey === "FORTYGUARD_API_KEY" && !process.env.FORTYGUARD_API_KEY) {
            process.env.FORTYGUARD_API_KEY = val;
          }
          if (cleanKey === "FORTYGUARD_DAILY_REQUEST_LIMIT" && !process.env.FORTYGUARD_DAILY_REQUEST_LIMIT) {
            process.env.FORTYGUARD_DAILY_REQUEST_LIMIT = val;
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

function parseCliArgs() {
  const args = process.argv.slice(2);
  let snapshotDate = "2026-08-30";
  let snapshotTime = "14:00";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--snapshot-date" && args[i + 1]) {
      snapshotDate = args[i + 1];
      i++;
    } else if (arg.startsWith("--snapshot-date=")) {
      snapshotDate = arg.split("=")[1];
    } else if (arg === "--snapshot-time" && args[i + 1]) {
      snapshotTime = args[i + 1];
      i++;
    } else if (arg.startsWith("--snapshot-time=")) {
      snapshotTime = arg.split("=")[1];
    }
  }

  // Strict Date Validation (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(snapshotDate)) {
    console.error(`\n[ERROR]: Invalid --snapshot-date '${snapshotDate}'. Format must be YYYY-MM-DD.`);
    process.exit(1);
  }

  // Strict Time Validation (HH:mm)
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(snapshotTime)) {
    console.error(`\n[ERROR]: Invalid --snapshot-time '${snapshotTime}'. Format must be HH:mm.`);
    process.exit(1);
  }

  const cleanTime = snapshotTime.replace(":", "");
  const baseDir = path.resolve(__dirname, `../data/snapshots/${snapshotDate}-${cleanTime}`);
  const validationDir = path.join(baseDir, "validation");
  const chunksDir = path.join(baseDir, "chunks");
  const manifestPath = path.join(baseDir, "manifest.json");

  fs.mkdirSync(validationDir, { recursive: true });
  fs.mkdirSync(chunksDir, { recursive: true });

  return { snapshotDate, snapshotTime, baseDir, validationDir, chunksDir, manifestPath };
}

async function runSingleChunkValidation() {
  const { snapshotDate, snapshotTime, baseDir, validationDir, chunksDir, manifestPath } = parseCliArgs();

  console.log("=========================================================");
  console.log("FORTYGUARD 50 SQ MI SINGLE-CHUNK LIVE VALIDATION");
  console.log("=========================================================");

  const apiKeyConfigured = Boolean(process.env.FORTYGUARD_API_KEY && process.env.FORTYGUARD_API_KEY.trim() !== "");
  console.log(`FortyGuard API Key Configured: ${apiKeyConfigured ? "YES" : "NO"}`);

  if (!apiKeyConfigured) {
    console.error("[ERROR]: FORTYGUARD_API_KEY is missing from environment.");
    process.exit(1);
  }

  // 1. Regenerate 50 sq mi Phoenix tiling plan
  const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");
  if (!fs.existsSync(boundaryPath)) {
    console.error(`[ERROR]: Boundary file not found at ${boundaryPath}`);
    process.exit(1);
  }

  const geojson = JSON.parse(fs.readFileSync(boundaryPath, "utf-8"));
  const plan = generateTilingPlan(geojson, { maxAreaSqMi: 50.0 });

  // Select Representative Chunk #4 (Central Phoenix, ~47.64 sq mi, non-edge sliver)
  const targetChunk = plan.subPolygons[4] || plan.subPolygons[0];
  const chunkIndex = targetChunk.properties.chunkIndex;
  const chunkArea = targetChunk.properties.areaSqMi;
  const chunkBounds = targetChunk.properties.bounds;

  console.log(`\n--- SELECTED CHUNK PARAMETERS ---`);
  console.log(`Selected Chunk ID: chunk-${chunkIndex}`);
  console.log(`Approximate Area: ${chunkArea} sq mi`);
  console.log(`Polygon Bounds: [${chunkBounds.join(", ")}]`);
  console.log(`Geometry Type: ${targetChunk.geometry.type}`);

  const dateTimeSnapshot = {
    startDate: snapshotDate,
    filterType: 1,
    startTime: snapshotTime,
  };
  console.log(`Snapshot Date/Time Parameter: ${JSON.stringify(dateTimeSnapshot)}`);

  // HARD SAFETY GUARD BEFORE POST
  if (creationRequestCount >= MAX_HEATMAP_CREATIONS) {
    console.error(`\n[HARD SAFETY GUARD TRIPPED]: Cannot exceed MAX_HEATMAP_CREATIONS limit of ${MAX_HEATMAP_CREATIONS}`);
    process.exit(1);
  }

  creationRequestCount++;
  console.log(`\nSubmitting EXACTLY ONE heatmap creation request (Request #${creationRequestCount} of MAX ${MAX_HEATMAP_CREATIONS})...`);

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
    const errMsg = errorObj.message || String(err);
    console.error(`\n[API REJECTED / SUBMISSION ERROR]: ${errMsg}`);

    saveValidationArtifact(validationDir, {
      snapshotDate,
      snapshotTime,
      requestedTimestamp: `${snapshotDate} ${snapshotTime}`,
      selectedChunkId: `chunk-${chunkIndex}`,
      requestedApproxAreaSqMi: chunkArea,
      requestedPolygonBounds: chunkBounds,
      snapshotDateTime: dateTimeSnapshot,
      creationRequestsMade: creationRequestCount,
      requestAccepted: false,
      activityId: null,
      finalProcessingStatus: "rejected",
      returnedMapFeatureCount: 0,
      returnedStatsSummary: null,
      rejectionReason: errMsg,
      reusableByFullCityRun: false,
    });

    console.log("\nSTOPPING: Single creation request rejected or failed.");
    return;
  }

  const activityId = submitRes?.data?.activity_id || null;
  console.log(`- Request Accepted! Activity ID: ${activityId}`);

  if (!activityId) {
    console.error("[ERROR]: No activity_id returned by FortyGuard API.");
    return;
  }

  // 2. Poll only the returned activity_id until completed, failed, or timed out
  console.log(`\nPolling status for activity_id (${activityId}) [bounded 60s max]...`);
  const startTime = Date.now();
  const maxPollMs = 60000;
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
        console.error(`- Upstream processing failed: ${statusRes?.data?.message || statusRes?.message}`);
        finalStatusRes = statusRes;
        break;
      }
    } catch (pollErr: unknown) {
      console.warn(`- Warning polling activity: ${(pollErr as Error).message}`);
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  // 3. Save validation result and update chunk file + run manifest for reuse
  const finalStatusStr = String(finalStatusRes?.data?.status || "timed_out").toLowerCase();
  const isCompleted = ["completed", "succeeded"].includes(finalStatusStr);

  if (isCompleted && finalStatusRes) {
    const normalized = normalizeFortyGuardResponse(finalStatusRes);
    console.log("\n=========================================================");
    console.log("LIVE 50 SQ MI CHUNK VALIDATED SUCCESSFULLY!");
    console.log(`Features Count: ${normalized.mapData.features.length}`);
    console.log(`Temperature Stats (°C): Min=${normalized.stats.minTemperature}, Max=${normalized.stats.maxTemperature}, Mean=${normalized.stats.meanTemperature}`);
    console.log("=========================================================");

    // Save individual chunk data file for chunk-4
    const chunkFile = path.join(chunksDir, `chunk-${chunkIndex}.json`);
    const chunkData = {
      chunkId: `chunk-${chunkIndex}`,
      chunkIndex,
      approxAreaSqMi: chunkArea,
      bounds: chunkBounds,
      activityId,
      snapshotDateTime: dateTimeSnapshot,
      stats: normalized.stats,
      mapData: normalized.mapData,
    };
    fs.writeFileSync(chunkFile, JSON.stringify(chunkData, null, 2), "utf-8");

    // Save validation summary
    saveValidationArtifact(validationDir, {
      snapshotDate,
      snapshotTime,
      requestedTimestamp: `${snapshotDate} ${snapshotTime}`,
      selectedChunkId: `chunk-${chunkIndex}`,
      requestedApproxAreaSqMi: chunkArea,
      requestedPolygonBounds: chunkBounds,
      snapshotDateTime: dateTimeSnapshot,
      creationRequestsMade: creationRequestCount,
      requestAccepted: true,
      activityId,
      finalProcessingStatus: "completed",
      returnedMapFeatureCount: normalized.mapData.features.length,
      returnedStatsSummary: normalized.stats,
      reusableByFullCityRun: true,
    });

    // Save/update manifest.json so full-city batch recognizes chunk-4 as COMPLETED
    updateRunManifestForReuse(manifestPath, plan.subPolygons, snapshotDate, snapshotTime, chunkIndex, activityId, normalized.mapData.features.length);
  } else {
    console.log("\n=========================================================");
    console.log(`Activity Processing Status: ${finalStatusRes?.data?.status || "timed_out"}`);
    console.log("=========================================================");

    saveValidationArtifact(validationDir, {
      snapshotDate,
      snapshotTime,
      requestedTimestamp: `${snapshotDate} ${snapshotTime}`,
      selectedChunkId: `chunk-${chunkIndex}`,
      requestedApproxAreaSqMi: chunkArea,
      requestedPolygonBounds: chunkBounds,
      snapshotDateTime: dateTimeSnapshot,
      creationRequestsMade: creationRequestCount,
      requestAccepted: true,
      activityId,
      finalProcessingStatus: finalStatusRes?.data?.status || "timed_out",
      returnedMapFeatureCount: 0,
      returnedStatsSummary: null,
      rejectionReason: finalStatusRes?.data?.message || "Upstream processing timeout or error",
      reusableByFullCityRun: false,
    });
  }
}

function saveValidationArtifact(validationDir: string, result: Record<string, unknown>) {
  const targetFile = path.join(validationDir, "single-chunk-validation.json");
  fs.writeFileSync(targetFile, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\n[Saved Non-Secret Validation Artifact]: ${targetFile}`);
}

function updateRunManifestForReuse(
  manifestPath: string,
  plannedChunks: ReturnType<typeof generateTilingPlan>["subPolygons"],
  snapshotDate: string,
  snapshotTime: string,
  completedChunkIdx: number,
  activityId: string,
  featureCount: number
) {
  const envDailyLimit = process.env.FORTYGUARD_DAILY_REQUEST_LIMIT
    ? parseInt(process.env.FORTYGUARD_DAILY_REQUEST_LIMIT, 10)
    : 30;

  const cleanDate = snapshotDate.replace(/-/g, "");
  const cleanTime = snapshotTime.replace(":", "");

  let manifest: Record<string, unknown>;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
      manifest = {};
    }
  } else {
    manifest = {};
  }

  manifest.runId = manifest.runId || `phoenix-full-city-50sqmi-${cleanDate}-${cleanTime}`;
  manifest.boundarySource = "public/data/phoenix-city-boundary.geojson";
  manifest.snapshotDate = snapshotDate;
  manifest.snapshotTime = snapshotTime;
  manifest.configuredMaxAreaSqMi = 50.0;
  manifest.configuredDailyLimit = envDailyLimit;
  manifest.knownCreationsBeforeRun = 1;
  manifest.newCreationsThisRun = 0;
  manifest.totalPlannedChunks = plannedChunks.length;

  const chunksMap = (manifest.chunks || {}) as Record<string, Record<string, unknown>>;
  plannedChunks.forEach((sub, idx) => {
    const chunkId = `chunk-${idx}`;
    if (!chunksMap[chunkId]) {
      chunksMap[chunkId] = {
        chunkId,
        chunkIndex: idx,
        approxAreaSqMi: sub.properties.areaSqMi,
        bounds: sub.properties.bounds,
        status: "pending",
        activityId: null,
        creationRequestCount: 0,
        returnedFeatureCount: 0,
        error: null,
        completedAt: null,
      };
    }
  });

  const completedChunkKey = `chunk-${completedChunkIdx}`;
  if (chunksMap[completedChunkKey]) {
    chunksMap[completedChunkKey].status = "completed";
    chunksMap[completedChunkKey].activityId = activityId;
    chunksMap[completedChunkKey].creationRequestCount = 1;
    chunksMap[completedChunkKey].returnedFeatureCount = featureCount;
    chunksMap[completedChunkKey].completedAt = new Date().toISOString();
    chunksMap[completedChunkKey].error = null;
  }

  manifest.chunks = chunksMap;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`[Manifest Updated for Full-City Reuse]: Chunk #${completedChunkIdx} marked as COMPLETED in ${manifestPath}`);
}

runSingleChunkValidation().catch((err) => {
  console.error("Unhandled Error in Validation Script:", err);
  process.exit(1);
});
