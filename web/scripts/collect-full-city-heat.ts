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

function parseCliArgs() {
  const args = process.argv.slice(2);
  let snapshotDate = "2026-08-30";
  let snapshotTime = "14:00";
  let customRunDir: string | null = null;
  let isConfirmed = false;
  let legacyMode = false;

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
    } else if (arg === "--run-dir" && args[i + 1]) {
      customRunDir = args[i + 1];
      i++;
    } else if (arg.startsWith("--run-dir=")) {
      customRunDir = arg.split("=")[1];
    } else if (arg === "--confirm-live-batch") {
      isConfirmed = true;
    } else if (arg === "--legacy-2024") {
      legacyMode = true;
      snapshotDate = "2024-07-15";
      snapshotTime = "14:00";
    }
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(snapshotDate)) {
    console.error(`\n[ERROR]: Invalid --snapshot-date '${snapshotDate}'. Format must be YYYY-MM-DD.`);
    process.exit(1);
  }

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(snapshotTime)) {
    console.error(`\n[ERROR]: Invalid --snapshot-time '${snapshotTime}'. Format must be HH:mm.`);
    process.exit(1);
  }

  const cleanTime = snapshotTime.replace(":", "");
  let baseDir: string;
  if (customRunDir) {
    baseDir = path.resolve(customRunDir);
  } else if (legacyMode) {
    baseDir = path.resolve(__dirname, "../data/full-city-run");
  } else {
    baseDir = path.resolve(__dirname, `../data/snapshots/${snapshotDate}-${cleanTime}`);
  }

  return {
    snapshotDate,
    snapshotTime,
    baseDir,
    isConfirmed,
    legacyMode,
  };
}

function getWorkingDirs(baseDir: string) {
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

function loadOrCreateManifest(
  manifestPath: string,
  plannedChunks: ReturnType<typeof generateTilingPlan>["subPolygons"],
  snapshotDate: string,
  snapshotTime: string,
  dailyLimit: number,
  knownCreations: number
): RunManifest {
  if (fs.existsSync(manifestPath)) {
    try {
      const data = fs.readFileSync(manifestPath, "utf-8");
      const manifest: RunManifest = JSON.parse(data);
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
      console.warn("Notice: Re-creating manifest for fresh run directory.");
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

  const cleanDate = snapshotDate.replace(/-/g, "");
  const cleanTime = snapshotTime.replace(":", "");

  return {
    runId: `phoenix-full-city-50sqmi-${cleanDate}-${cleanTime}`,
    boundarySource: "public/data/phoenix-city-boundary.geojson",
    snapshotDate,
    snapshotTime,
    configuredMaxAreaSqMi: 50.0,
    configuredDailyLimit: dailyLimit,
    knownCreationsBeforeRun: knownCreations,
    newCreationsThisRun: 0,
    totalPlannedChunks: plannedChunks.length,
    planningOnly: true,
    chunks: chunksMap,
  };
}

function verifyManifestBeforeNetwork(manifest: RunManifest, baseDir: string, plannedCount: number) {
  console.log("\n--- VERIFYING MANIFEST BEFORE NETWORK ---");
  const chunkKeys = Object.keys(manifest.chunks);
  if (chunkKeys.length !== plannedCount) {
    throw new Error(`Manifest validation failed: expected ${plannedCount} chunks, found ${chunkKeys.length}`);
  }

  // Check unique IDs
  const uniqueIds = new Set(chunkKeys);
  if (uniqueIds.size !== plannedCount) {
    throw new Error("Manifest validation failed: duplicate chunk IDs detected");
  }

  // Verify chunk-4 status and activityId
  const chunk4 = manifest.chunks["chunk-4"];
  if (chunk4 && chunk4.status === "completed") {
    if (!chunk4.activityId) {
      throw new Error("Manifest validation failed: chunk-4 marked completed but missing activityId");
    }
    const chunk4File = path.join(baseDir, "chunks", "chunk-4.json");
    if (!fs.existsSync(chunk4File)) {
      throw new Error(`Manifest validation failed: chunk-4 marked completed but result file missing at ${chunk4File}`);
    }
    console.log(`- Verified completed chunk-4 (Activity ID: ${chunk4.activityId}, Features: ${chunk4.returnedFeatureCount})`);
  }

  let completedCount = 0;
  let pendingCount = 0;
  Object.values(manifest.chunks).forEach((c) => {
    if (c.status === "completed") completedCount++;
    else pendingCount++;
    if (c.approxAreaSqMi > 50.0 + 1e-3) {
      throw new Error(`Manifest validation failed: ${c.chunkId} area (${c.approxAreaSqMi}) exceeds 50 sq mi`);
    }
  });

  console.log(`- Total planned: ${plannedCount}`);
  console.log(`- Already completed: ${completedCount}`);
  console.log(`- Remaining pending: ${pendingCount}`);
  console.log("MANIFEST VERIFICATION PASSED!");
}

async function runFullCityCollection() {
  const cliOptions = parseCliArgs();
  const { snapshotDate, snapshotTime, baseDir, isConfirmed, legacyMode } = cliOptions;

  const envDailyLimit = process.env.FORTYGUARD_DAILY_REQUEST_LIMIT
    ? parseInt(process.env.FORTYGUARD_DAILY_REQUEST_LIMIT, 10)
    : 30;

  const knownCreations = legacyMode ? 1 : 0;
  const maxNewCreations = envDailyLimit - knownCreations;

  console.log("=========================================================");
  console.log("FORTYGUARD FULL-CITY PHOENIX HEAT SNAPSHOT COLLECTION");
  console.log("=========================================================");

  const apiKeyConfigured = Boolean(process.env.FORTYGUARD_API_KEY && process.env.FORTYGUARD_API_KEY.trim() !== "");
  console.log(`FortyGuard API Key Configured: ${apiKeyConfigured ? "YES" : "NO"}`);

  // 1. Regenerate & Freeze the 50 sq mi Plan over Phoenix municipal boundary
  const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");
  const geojson = JSON.parse(fs.readFileSync(boundaryPath, "utf-8"));
  const plan = generateTilingPlan(geojson, { maxAreaSqMi: 50.0, dailyRequestLimit: envDailyLimit });
  const plannedChunks = plan.subPolygons;

  console.log(`\n--- SNAPSHOT PARAMETERS ---`);
  console.log(`Requested Snapshot Date: ${snapshotDate}`);
  console.log(`Requested Snapshot Time: ${snapshotTime}`);
  console.log(`Target Phoenix Local Timezone: MST (UTC-7)`);
  console.log(`Upstream API Payload Format: { startDate: "${snapshotDate}", startTime: "${snapshotTime}", filterType: 1 }`);
  console.log(`Run Output Directory: ${baseDir}`);
  console.log(`2024 Historical Snapshot Preserved: YES (web/data/full-city-run remains untouched)`);

  const { chunksDir, combinedDir, manifestPath } = getWorkingDirs(baseDir);
  const manifest = loadOrCreateManifest(
    manifestPath,
    plannedChunks,
    snapshotDate,
    snapshotTime,
    envDailyLimit,
    knownCreations
  );

  // Pre-network manifest verification
  verifyManifestBeforeNetwork(manifest, baseDir, plannedChunks.length);
  saveManifest(manifestPath, manifest);

  let alreadyCompleted = 0;
  Object.values(manifest.chunks).forEach((c) => {
    if (c.status === "completed") alreadyCompleted++;
  });
  const remainingToProcess = plannedChunks.length - alreadyCompleted;

  console.log(`\n--- FULL-CITY PLAN SUMMARY ---`);
  console.log(`Total Planned Chunks: ${plannedChunks.length}`);
  console.log(`Already Completed Chunks: ${alreadyCompleted}`);
  console.log(`Remaining Chunks To Process: ${remainingToProcess}`);
  console.log(`Configured Daily Request Limit: ${envDailyLimit}`);
  console.log(`Max Allowed New Creations: ${maxNewCreations}`);
  console.log(`Fits Within Daily Limit: ${remainingToProcess <= maxNewCreations ? "YES" : "NO"}`);

  if (!isConfirmed) {
    console.log("\n---------------------------------------------------------");
    console.log("DRY-RUN COMPLETE — ZERO NETWORK / API CALLS EXECUTED");
    console.log("Destination run directory initialized safely:");
    console.log(`  ${baseDir}`);
    console.log("\nTo test or execute live batch creation, pass:");
    console.log(`  npm run collect-full-city -- --snapshot-date ${snapshotDate} --snapshot-time ${snapshotTime} --confirm-live-batch`);
    console.log("---------------------------------------------------------");
    return;
  }

  // Live Batch Loop
  if (!apiKeyConfigured) {
    console.error("\n[ERROR]: FORTYGUARD_API_KEY is missing from environment. Cannot proceed with live collection.");
    process.exit(1);
  }

  if (remainingToProcess > maxNewCreations) {
    console.error(`\n[PLAN VALIDATION FAILED]: Remaining requests (${remainingToProcess}) exceed limit (${maxNewCreations}).`);
    process.exit(1);
  }

  console.log("\n=========================================================");
  console.log("STARTING SEQUENTIAL FULL-CITY COLLECTION");
  console.log("=========================================================");

  const dateTimeSnapshot = {
    startDate: snapshotDate,
    filterType: 1,
    startTime: snapshotTime,
  };

  for (let i = 0; i < plannedChunks.length; i++) {
    const sub = plannedChunks[i];
    const chunkId = `chunk-${i}`;
    const chunkEntry = manifest.chunks[chunkId];

    if (chunkEntry.status === "completed") {
      console.log(`[Chunk ${i + 1}/${plannedChunks.length}] ${chunkId} already COMPLETED (${chunkEntry.returnedFeatureCount} features). Reusing existing result.`);
      continue;
    }

    let activityId = chunkEntry.activityId;

    if (!activityId) {
      const totalUsedCreations = knownCreations + manifest.newCreationsThisRun;
      if (totalUsedCreations + 1 > envDailyLimit) {
        console.error(`\n[HARD SAFETY GUARD TRIPPED]: Daily limit of ${envDailyLimit} reached.`);
        break;
      }

      manifest.newCreationsThisRun++;
      chunkEntry.creationRequestCount = 1;
      chunkEntry.status = "submitted";
      saveManifest(manifestPath, manifest);

      console.log(`\n[Chunk ${i + 1}/${plannedChunks.length}] ${chunkId} (${sub.properties.areaSqMi} sq mi) - Submitting POST heatmap creation request (New Creation #${manifest.newCreationsThisRun})...`);

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
      console.log(`\n[Chunk ${i + 1}/${plannedChunks.length}] ${chunkId} - Polling status for existing activity_id: ${activityId}...`);
    }

    // Status Polling Loop
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
      console.error(`\n[POLLING TIMED OUT] on ${chunkId}.`);
      console.error("STOPPING BATCH IMMEDIATELY.");
      break;
    }

    // Normalize and save chunk
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
      console.log(`- ${chunkId} COMPLETED SUCCESSFULLY! Saved ${normalized.mapData.features.length} features.`);
    } catch (normErr: unknown) {
      chunkEntry.status = "failed";
      chunkEntry.error = `Normalization error: ${(normErr as Error).message}`;
      saveManifest(manifestPath, manifest);
      console.error(`\n[NORMALIZATION ERROR] on ${chunkId}: ${chunkEntry.error}`);
      console.error("STOPPING BATCH IMMEDIATELY.");
      break;
    }
  }

  // Full-City Dataset Combination
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
  console.log(`Reused Chunks (e.g. Chunk #4): ${reusedCount}`);
  console.log(`New Heatmap Creations Made: ${manifest.newCreationsThisRun}`);
  console.log(`Total Creations Used Today: ${knownCreations + manifest.newCreationsThisRun} / ${envDailyLimit}`);

  if (allCompleted) {
    console.log("\nCombining all 23 completed chunks into full-city dataset...");
    combineFullCityDataset(chunksDir, combinedDir, plannedChunks.length, manifest, snapshotDate, snapshotTime);
    console.log("\n=========================================================");
    console.log("FRESH FULL PHOENIX SNAPSHOT COMPLETE");
    console.log("=========================================================");
  } else {
    console.log(`\nCoverage Status: PARTIAL (${completedCount}/${plannedChunks.length} chunks completed)`);
    console.log("=========================================================");
    console.log("FRESH FULL PHOENIX SNAPSHOT PARTIAL");
    console.log("=========================================================");
  }
}

function combineFullCityDataset(
  chunksDir: string,
  combinedDir: string,
  totalPlanned: number,
  manifest: RunManifest,
  snapshotDate: string,
  snapshotTime: string
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

  // Deduplicate thermal tiles by tile_id or coordinate key
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

  // Calculate overall min, max, mean temperature across unique features
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
      snapshotDate,
      snapshotTime,
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
    reusedPreviousActivities: Object.values(manifest.chunks).filter((c) => c.creationRequestCount === 1 && c.chunkId === "chunk-4").length,
    estimatedTotalDailyCreationsUsed: 1 + manifest.newCreationsThisRun,
    totalRawFeatures,
    duplicatesRemoved,
    uniqueThermalFeatures: uniqueFeatures.length,
    overallMinTemperatureC: round2(minTemp),
    overallMaxTemperatureC: round2(maxTemp),
    overallMeanTemperatureC: round2(meanTemp),
    snapshotDateTime: { startDate: snapshotDate, startTime: snapshotTime, filterType: 1 },
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
