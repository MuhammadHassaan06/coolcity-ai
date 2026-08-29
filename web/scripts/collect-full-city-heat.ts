import fs from "fs";
import path from "path";
import { submitHeatmap, getHeatmapStatus } from "../src/lib/fortyguard/client";
import { normalizeFortyGuardResponse } from "../src/lib/fortyguard/normalize";
import { generateTilingPlan } from "../src/lib/fortyguard/tiling";

// Load environment variables securely
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

// HARD SAFETY COUNTERS & BUDGET LIMITS
const KNOWN_CREATIONS_BEFORE_RUN = 1; // 1 creation used previously during single-chunk validation
const CONFIGURED_DAILY_LIMIT = 30;
const MAX_NEW_CREATIONS_THIS_RUN = CONFIGURED_DAILY_LIMIT - KNOWN_CREATIONS_BEFORE_RUN; // Max 29 new POST requests allowed

interface ChunkManifestEntry {
  chunkId: string;
  chunkIndex: number;
  approxAreaSqMi: number;
  bounds: [number, number, number, number];
  status: "pending" | "submitted" | "processing" | "completed" | "failed" | "timed_out";
  activityId: string | null;
  creationRequestCount: number;
  returnedFeatureCount: number;
  error: string | null;
  completedAt: string | null;
}

interface RunManifest {
  runId: string;
  boundarySource: string;
  snapshotDate: string;
  snapshotTime: string;
  configuredMaxAreaSqMi: number;
  configuredDailyLimit: number;
  knownCreationsBeforeRun: number;
  newCreationsThisRun: number;
  totalPlannedChunks: number;
  planningOnly: boolean;
  chunks: Record<string, ChunkManifestEntry>;
}

function getWorkingDirs() {
  const baseDir = path.resolve(__dirname, "../data/full-city-run");
  const chunksDir = path.join(baseDir, "chunks");
  const combinedDir = path.join(baseDir, "combined");
  const manifestPath = path.join(baseDir, "manifest.json");

  fs.mkdirSync(chunksDir, { recursive: true });
  fs.mkdirSync(combinedDir, { recursive: true });

  return { baseDir, chunksDir, combinedDir, manifestPath };
}

function saveManifest(manifestPath: string, manifest: RunManifest) {
  const tempPath = `${manifestPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(manifest, null, 2), "utf-8");
  fs.renameSync(tempPath, manifestPath);
}

function loadOrCreateManifest(manifestPath: string, plannedChunks: ReturnType<typeof generateTilingPlan>["subPolygons"]): RunManifest {
  if (fs.existsSync(manifestPath)) {
    try {
      const data = fs.readFileSync(manifestPath, "utf-8");
      const manifest: RunManifest = JSON.parse(data);
      // Ensure all planned chunks are present in existing manifest
      plannedChunks.forEach((sub, idx) => {
        const chunkId = `chunk-${idx}`;
        if (!manifest.chunks[chunkId]) {
          manifest.chunks[chunkId] = {
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
      return manifest;
    } catch {
      console.warn("Warning: Failed to parse existing manifest. Creating a new fresh manifest.");
    }
  }

  const chunksMap: Record<string, ChunkManifestEntry> = {};
  plannedChunks.forEach((sub, idx) => {
    const chunkId = `chunk-${idx}`;
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
  });

  return {
    runId: "phoenix-full-city-50sqmi-20240715",
    boundarySource: "public/data/phoenix-city-boundary.geojson",
    snapshotDate: "2024-07-15",
    snapshotTime: "14:00",
    configuredMaxAreaSqMi: 50.0,
    configuredDailyLimit: CONFIGURED_DAILY_LIMIT,
    knownCreationsBeforeRun: KNOWN_CREATIONS_BEFORE_RUN,
    newCreationsThisRun: 0,
    totalPlannedChunks: plannedChunks.length,
    planningOnly: false,
    chunks: chunksMap,
  };
}

// PART 6: Check for previously validated activity to reuse
function tryReusePreviousValidation(manifest: RunManifest, chunksDir: string): boolean {
  const prevArtifactPath = path.resolve(__dirname, "../data/live-validation/single-chunk-validation.json");
  if (!fs.existsSync(prevArtifactPath)) return false;

  try {
    const raw = fs.readFileSync(prevArtifactPath, "utf-8");
    const prev = JSON.parse(raw);

    if (
      prev.finalProcessingStatus === "completed" &&
      prev.activityId &&
      prev.requestedPolygonBounds
    ) {
      const chunk4 = manifest.chunks["chunk-4"];
      if (chunk4 && chunk4.status !== "completed") {
        const boundsMatch =
          JSON.stringify(chunk4.bounds) === JSON.stringify(prev.requestedPolygonBounds);

        if (boundsMatch) {
          console.log(`\n[REUSE DETECTED]: Found completed Chunk #4 activity_id (${prev.activityId}) from live validation.`);
          console.log("Attempting GET status retrieval to populate Chunk #4 without creating a new heatmap...");

          // Synchronously check status / fetch result via GET (0 POST requests)
          chunk4.activityId = prev.activityId;
          chunk4.status = "processing";
          return true;
        }
      }
    }
  } catch (e: unknown) {
    console.warn("Notice: Could not reuse previous validation artifact:", (e as Error).message);
  }
  return false;
}

async function runFullCityCollection() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes("--confirm-live-batch");

  console.log("=========================================================");
  console.log("FORTYGUARD FULL-CITY PHOENIX HEAT SNAPSHOT COLLECTION");
  console.log("=========================================================");

  if (!process.env.FORTYGUARD_API_KEY) {
    console.error("ERROR: FORTYGUARD_API_KEY is missing from environment.");
    process.exit(1);
  }

  // 1. Regenerate & Freeze the 50 sq mi Plan
  const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");
  const geojson = JSON.parse(fs.readFileSync(boundaryPath, "utf-8"));
  const plan = generateTilingPlan(geojson, { maxAreaSqMi: 50.0 });
  const plannedChunks = plan.subPolygons;

  console.log(`Frozen Plan Chunk Count: ${plannedChunks.length}`);
  console.log(`Configured Max Area / Request: ${plan.configuredMaxAreaSqMi} sq mi`);
  console.log(`City Boundary Area: ${plan.cityBoundaryAreaSqMi} sq mi`);
  console.log(`Snapshot Date/Time: 2024-07-15 at 14:00 (Filter Type: 1)`);
  console.log(`Known Creations Before Run: ${KNOWN_CREATIONS_BEFORE_RUN}`);
  console.log(`Max New Creations Allowed This Run: ${MAX_NEW_CREATIONS_THIS_RUN}`);
  console.log(`Configured Daily Request Limit: ${CONFIGURED_DAILY_LIMIT}`);

  // Validation Checks
  if (plannedChunks.length > MAX_NEW_CREATIONS_THIS_RUN) {
    console.error(`\nPLAN VALIDATION FAILED: Planned requests (${plannedChunks.length}) exceed remaining daily limit (${MAX_NEW_CREATIONS_THIS_RUN}).`);
    console.error("STOPPING BEFORE ANY LIVE REQUEST.");
    process.exit(1);
  }

  const { chunksDir, combinedDir, manifestPath } = getWorkingDirs();
  const manifest = loadOrCreateManifest(manifestPath, plannedChunks);

  // Check reuse of previous Chunk #4 validation
  const canReuseChunk4 = tryReusePreviousValidation(manifest, chunksDir);
  if (canReuseChunk4) {
    saveManifest(manifestPath, manifest);
  }

  // Count existing status
  let alreadyCompleted = 0;
  Object.values(manifest.chunks).forEach((c) => {
    if (c.status === "completed") alreadyCompleted++;
  });

  const remainingToProcess = plannedChunks.length - alreadyCompleted;

  console.log(`\nAlready Completed Chunks: ${alreadyCompleted}`);
  console.log(`Remaining Chunks To Process: ${remainingToProcess}`);

  if (!isConfirmed) {
    console.log("\n---------------------------------------------------------");
    console.log("DRY-RUN / SUMMARY PREVIEW ONLY");
    console.log("To execute live full-city collection, run with:");
    console.log("  npm run collect-full-city -- --confirm-live-batch");
    console.log("---------------------------------------------------------");
    return;
  }

  // Live Batch Execution Loop
  console.log("\n=========================================================");
  console.log("STARTING SEQUENTIAL FULL-CITY COLLECTION");
  console.log("=========================================================");

  const dateTimeSnapshot = {
    startDate: "2024-07-15",
    filterType: 1,
    startTime: "14:00",
  };

  for (let i = 0; i < plannedChunks.length; i++) {
    const sub = plannedChunks[i];
    const chunkId = `chunk-${i}`;
    const chunkEntry = manifest.chunks[chunkId];

    if (chunkEntry.status === "completed") {
      console.log(`[Chunk ${i + 1}/${plannedChunks.length}] ${chunkId} already COMPLETED (${chunkEntry.returnedFeatureCount} features). Skipping.`);
      continue;
    }

    let activityId = chunkEntry.activityId;

    // Check if we need to issue a new POST request
    if (!activityId) {
      // HARD SAFETY CHECK BEFORE POST
      const totalUsedCreations = KNOWN_CREATIONS_BEFORE_RUN + manifest.newCreationsThisRun;
      if (totalUsedCreations + 1 > CONFIGURED_DAILY_LIMIT) {
        console.error(`\nHARD SAFETY GUARD TRIPPED: Cannot exceed daily budget limit of ${CONFIGURED_DAILY_LIMIT}. Used: ${totalUsedCreations}.`);
        console.error("STOPPING BATCH IMMEDIATELY.");
        break;
      }

      if (manifest.newCreationsThisRun + 1 > MAX_NEW_CREATIONS_THIS_RUN) {
        console.error(`\nHARD SAFETY GUARD TRIPPED: Exceeded maximum allowed new creations for this run (${MAX_NEW_CREATIONS_THIS_RUN}).`);
        console.error("STOPPING BATCH IMMEDIATELY.");
        break;
      }

      manifest.newCreationsThisRun++;
      chunkEntry.creationRequestCount = 1;
      chunkEntry.status = "submitted";
      saveManifest(manifestPath, manifest);

      console.log(`\n[Chunk ${i + 1}/${plannedChunks.length}] ${chunkId} (${sub.properties.areaSqMi} sq mi) - Submitting POST heatmap creation request (New creation #${manifest.newCreationsThisRun})...`);

      const requestPayload = {
        aoi: {
          type: "FeatureCollection" as const,
          features: [sub],
        },
        dateTime: dateTimeSnapshot,
        granularity: 100,
        analyticType: "tcm",
      };

      try {
        const submitRes = await submitHeatmap(requestPayload);
        activityId = submitRes?.data?.activity_id || null;

        if (!activityId) {
          chunkEntry.status = "failed";
          chunkEntry.error = "No activity_id returned by FortyGuard submission API.";
          saveManifest(manifestPath, manifest);
          console.error(`ERROR on ${chunkId}: ${chunkEntry.error}`);
          console.error("STOPPING BATCH IMMEDIATELY due to submission failure.");
          break;
        }

        chunkEntry.activityId = activityId;
        chunkEntry.status = "processing";
        saveManifest(manifestPath, manifest);
        console.log(`- Request accepted! Activity ID: ${activityId}`);
      } catch (submitErr: unknown) {
        const errStr = (submitErr as Error).message || String(submitErr);
        chunkEntry.status = "failed";
        chunkEntry.error = errStr;
        saveManifest(manifestPath, manifest);

        console.error(`\n[POST CREATION FAILED] on ${chunkId}: ${errStr}`);
        console.error("STOPPING BATCH IMMEDIATELY due to creation POST failure.");
        break;
      }
    } else {
      console.log(`\n[Chunk ${i + 1}/${plannedChunks.length}] ${chunkId} - Resuming status polling for existing activity_id: ${activityId} (0 new POST requests)...`);
    }

    // Poll status of activityId until completed or failed
    const maxPollMs = 60000;
    const pollIntervalMs = 3000;
    const pollStart = Date.now();
    let finalStatusRes = null;
    let pollFailed = false;

    while (Date.now() - pollStart < maxPollMs) {
      try {
        const statusRes = await getHeatmapStatus(activityId);
        const statusStr = String(statusRes?.data?.status || "pending").toLowerCase();

        if (["completed", "succeeded"].includes(statusStr)) {
          finalStatusRes = statusRes;
          break;
        }

        if (["failed", "error"].includes(statusStr)) {
          chunkEntry.status = "failed";
          chunkEntry.error = statusRes?.data?.message || statusRes?.message || "Upstream processing failed";
          saveManifest(manifestPath, manifest);
          console.error(`\n[UPSTREAM PROCESSING FAILED] on ${chunkId}: ${chunkEntry.error}`);
          pollFailed = true;
          break;
        }
      } catch (pollErr: unknown) {
        console.warn(`- Warning polling ${chunkId}: ${(pollErr as Error).message}`);
      }

      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    if (pollFailed) {
      console.error("STOPPING BATCH IMMEDIATELY due to chunk processing failure.");
      break;
    }

    if (!finalStatusRes) {
      chunkEntry.status = "timed_out";
      chunkEntry.error = "Polling timed out after 60s";
      saveManifest(manifestPath, manifest);
      console.error(`\n[POLLING TIMED OUT] on ${chunkId}. State saved as timed_out.`);
      console.error("STOPPING BATCH IMMEDIATELY.");
      break;
    }

    // Normalize and save chunk result
    try {
      const normalized = normalizeFortyGuardResponse(finalStatusRes);

      if (!normalized.mapData || normalized.mapData.features.length === 0) {
        chunkEntry.status = "failed";
        chunkEntry.error = "Completed response returned 0 features.";
        saveManifest(manifestPath, manifest);
        console.error(`\n[INVALID RESPONSE] on ${chunkId}: 0 features returned.`);
        console.error("STOPPING BATCH IMMEDIATELY.");
        break;
      }

      const chunkFile = path.join(chunksDir, `${chunkId}.json`);
      const chunkData = {
        chunkId,
        chunkIndex: i,
        approxAreaSqMi: sub.properties.areaSqMi,
        bounds: sub.properties.bounds,
        activityId,
        snapshotDateTime: dateTimeSnapshot,
        stats: normalized.stats,
        mapData: normalized.mapData,
      };

      fs.writeFileSync(chunkFile, JSON.stringify(chunkData, null, 2), "utf-8");

      chunkEntry.status = "completed";
      chunkEntry.returnedFeatureCount = normalized.mapData.features.length;
      chunkEntry.completedAt = new Date().toISOString();
      chunkEntry.error = null;
      saveManifest(manifestPath, manifest);

      alreadyCompleted++;
      console.log(`- ${chunkId} COMPLETED SUCCESSFULLY! Saved ${normalized.mapData.features.length} features. Min=${normalized.stats.minTemperature}°C, Max=${normalized.stats.maxTemperature}°C, Mean=${normalized.stats.meanTemperature}°C`);
    } catch (normErr: unknown) {
      chunkEntry.status = "failed";
      chunkEntry.error = `Normalization error: ${(normErr as Error).message}`;
      saveManifest(manifestPath, manifest);
      console.error(`\n[NORMALIZATION ERROR] on ${chunkId}: ${chunkEntry.error}`);
      console.error("STOPPING BATCH IMMEDIATELY.");
      break;
    }
  }

  // Combination Step if ALL chunks are completed
  const allCompleted = Object.values(manifest.chunks).every((c) => c.status === "completed");
  const failedCount = Object.values(manifest.chunks).filter((c) => c.status === "failed").length;
  const timedOutCount = Object.values(manifest.chunks).filter((c) => c.status === "timed_out").length;
  const completedCount = Object.values(manifest.chunks).filter((c) => c.status === "completed").length;
  const reusedCount = Object.values(manifest.chunks).filter((c) => c.status === "completed" && c.creationRequestCount === 0).length;

  console.log("\n=========================================================");
  console.log("COLLECTION BATCH SUMMARY");
  console.log("=========================================================");
  console.log(`Total Planned Chunks: ${plannedChunks.length}`);
  console.log(`Completed Chunks: ${completedCount}`);
  console.log(`Failed Chunks: ${failedCount}`);
  console.log(`Timed-Out Chunks: ${timedOutCount}`);
  console.log(`Reused Previous Activities: ${reusedCount}`);
  console.log(`New Heatmap Creations Made: ${manifest.newCreationsThisRun}`);
  console.log(`Estimated Total Daily Creations Used: ${KNOWN_CREATIONS_BEFORE_RUN + manifest.newCreationsThisRun} / ${CONFIGURED_DAILY_LIMIT}`);

  if (allCompleted) {
    console.log("\nCombining all completed chunks into full-city dataset...");
    combineFullCityDataset(chunksDir, combinedDir, plannedChunks.length, manifest);
    console.log("\n=========================================================");
    console.log("FULL PHOENIX HEAT SNAPSHOT COMPLETE");
    console.log("=========================================================");
  } else {
    console.log(`\nCoverage Status: PARTIAL (${completedCount}/${plannedChunks.length} chunks completed)`);
    console.log("=========================================================");
    console.log("FULL PHOENIX HEAT SNAPSHOT PARTIAL");
    console.log("=========================================================");
  }
}

function combineFullCityDataset(
  chunksDir: string,
  combinedDir: string,
  totalPlanned: number,
  manifest: RunManifest
) {
  const allFeatures: Array<Record<string, unknown>> = [];

  for (let i = 0; i < totalPlanned; i++) {
    const chunkId = `chunk-${i}`;
    const chunkFile = path.join(chunksDir, `${chunkId}.json`);
    if (fs.existsSync(chunkFile)) {
      const content = JSON.parse(fs.readFileSync(chunkFile, "utf-8"));
      const features = content.mapData?.features || [];
      allFeatures.push(...features);
    }
  }

  const totalRawFeatures = allFeatures.length;

  // Deduplicate tiles by tile_id (or coordinate key)
  const uniqueMap = new Map<string, Record<string, unknown>>();
  let duplicatesRemoved = 0;

  allFeatures.forEach((feat) => {
    const props = (feat.properties as Record<string, unknown>) || {};
    const geom = (feat.geometry as Record<string, unknown>) || {};

    let tileKey = "";
    if (props.tile_id !== undefined && props.tile_id !== null) {
      tileKey = `tile-${props.tile_id}`;
    } else {
      const coords = JSON.stringify(geom.coordinates);
      tileKey = `coord-${coords}`;
    }

    if (uniqueMap.has(tileKey)) {
      duplicatesRemoved++;
    } else {
      uniqueMap.set(tileKey, feat);
    }
  });

  const uniqueFeatures = Array.from(uniqueMap.values());

  // Calculate overall min, max, mean temperature
  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let sumTemp = 0;
  let tempCount = 0;

  uniqueFeatures.forEach((feat) => {
    const props = (feat.properties as Record<string, unknown>) || {};
    const temp = Number(props.averageTemperatureC ?? props.average_temperature);
    if (!isNaN(temp) && isFinite(temp)) {
      if (temp < minTemp) minTemp = temp;
      if (temp > maxTemp) maxTemp = temp;
      sumTemp += temp;
      tempCount++;
    }
  });

  const meanTemp = tempCount > 0 ? sumTemp / tempCount : 0;

  const combinedJsonPath = path.join(combinedDir, "phoenix_full_city_heat.json");
  const combinedGeoJsonPath = path.join(combinedDir, "phoenix_full_city_heat.geojson");
  const summaryPath = path.join(combinedDir, "full_city_collection_summary.json");

  const fullCityDataset = {
    metadata: {
      title: "City of Phoenix Full Thermal Heat Snapshot",
      snapshotDate: "2024-07-15",
      snapshotTime: "14:00",
      cityBoundaryAreaSqMi: 540.78,
      plannedChunks: totalPlanned,
      completedChunks: totalPlanned,
      coverageStatus: "complete coverage of the frozen Phoenix request plan",
      totalRawFeatures,
      duplicatesRemoved,
      uniqueFeatureCount: uniqueFeatures.length,
      stats: {
        minTemperatureC: round2(minTemp),
        maxTemperatureC: round2(maxTemp),
        meanTemperatureC: round2(meanTemp),
        unit: "C",
      },
    },
    features: uniqueFeatures,
  };

  const geoJsonDataset = {
    type: "FeatureCollection",
    features: uniqueFeatures,
  };

  const summaryData = {
    plannedChunks: totalPlanned,
    completedChunks: totalPlanned,
    creationRequestsNewlyMade: manifest.newCreationsThisRun,
    reusedPreviousActivities: Object.values(manifest.chunks).filter((c) => c.creationRequestCount === 0 && c.status === "completed").length,
    estimatedTotalDailyCreationsUsed: KNOWN_CREATIONS_BEFORE_RUN + manifest.newCreationsThisRun,
    totalRawFeatures,
    duplicatesRemoved,
    uniqueThermalFeatures: uniqueFeatures.length,
    overallMinTemperatureC: round2(minTemp),
    overallMaxTemperatureC: round2(maxTemp),
    overallMeanTemperatureC: round2(meanTemp),
    snapshotDateTime: { startDate: "2024-07-15", startTime: "14:00", filterType: 1 },
    coverageStatus: "complete coverage of the frozen Phoenix request plan",
  };

  fs.writeFileSync(combinedJsonPath, JSON.stringify(fullCityDataset, null, 2), "utf-8");
  fs.writeFileSync(combinedGeoJsonPath, JSON.stringify(geoJsonDataset, null, 2), "utf-8");
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2), "utf-8");

  console.log(`\n[Combined JSON Saved]: ${combinedJsonPath}`);
  console.log(`[Combined GeoJSON Saved]: ${combinedGeoJsonPath}`);
  console.log(`[Summary Saved]: ${summaryPath}`);
  console.log(`Total Raw Features: ${totalRawFeatures}`);
  console.log(`Duplicates Removed: ${duplicatesRemoved}`);
  console.log(`Final Unique Features: ${uniqueFeatures.length}`);
  console.log(`Overall Temperature Range: ${round2(minTemp)}°C to ${round2(maxTemp)}°C (Mean: ${round2(meanTemp)}°C)`);
}

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

runFullCityCollection().catch((err) => {
  console.error("Unhandled Error in Full-City Collection Script:", err);
  process.exit(1);
});
