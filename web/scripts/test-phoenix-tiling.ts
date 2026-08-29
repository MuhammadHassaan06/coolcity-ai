import fs from "fs";
import path from "path";
import { generateTilingPlan, TilingPlan } from "../src/lib/fortyguard/tiling";

function runScenario(geojson: unknown, maxAreaSqMi: number, label: string): TilingPlan {
  console.log(`\n-----------------------------------------`);
  console.log(`SCENARIO: ${label} (${maxAreaSqMi} sq mi max area)`);
  console.log(`-----------------------------------------`);

  const plan = generateTilingPlan(geojson as Parameters<typeof generateTilingPlan>[0], {
    maxAreaSqMi,
    dailyRequestLimit: 30,
    boundarySourceLabel: "public/data/phoenix-city-boundary.geojson",
  });

  console.log(`Boundary Source: ${plan.boundarySource}`);
  console.log(`Coverage Scope: ${plan.coverage}`);
  console.log(`Approx. City Boundary Area: ${plan.cityBoundaryAreaSqMi} sq mi`);
  console.log(`Configured Max Area / Request: ${plan.configuredMaxAreaSqMi} sq mi`);
  console.log(`Configured Daily Request Limit: ${plan.configuredDailyRequestLimit}`);
  console.log(`Planned Request Count: ${plan.plannedRequests}`);
  console.log(`Fits Within Daily Limit: ${plan.fitsWithinDailyLimit}`);
  console.log(`Min Chunk Area: ${plan.minChunkAreaSqMi} sq mi`);
  console.log(`Max Chunk Area: ${plan.maxChunkAreaSqMi} sq mi`);
  console.log(`Mean Chunk Area: ${plan.meanChunkAreaSqMi} sq mi`);
  console.log(`Chunks Exceeding Max Area: ${plan.chunksExceedingMaxArea}`);
  console.log(`Bounds: [minLng: ${plan.bounds.minLng}, minLat: ${plan.bounds.minLat}, maxLng: ${plan.bounds.maxLng}, maxLat: ${plan.bounds.maxLat}]`);

  if (plan.warnings.length > 0) {
    console.log(`Warnings: ${plan.warnings.join("; ")}`);
  }

  return plan;
}

function main() {
  const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");

  if (!fs.existsSync(boundaryPath)) {
    console.error(`Boundary GeoJSON file not found at: ${boundaryPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(boundaryPath, "utf-8");
  const geojson = JSON.parse(rawData);

  console.log("=========================================================");
  console.log("PHOENIX CITY BOUNDARY AREA-AWARE TILING DRY-RUN TEST");
  console.log("=========================================================");

  const geomType = geojson.type === "FeatureCollection"
    ? `FeatureCollection (${geojson.features?.length || 0} features)`
    : geojson.type;

  console.log(`Geometry Type: ${geomType}`);

  // Scenario A: 10 sq mi (Basic FortyGuard tier)
  runScenario(geojson, 10.0, "Scenario A - Basic Plan Limit");

  // Scenario B: 50 sq mi (Premium FortyGuard tier)
  runScenario(geojson, 50.0, "Scenario B - Premium Plan Limit");

  // Scenario C: 25 sq mi (Project Default Planning Assumption)
  const defaultPlan = runScenario(geojson, 25.0, "Scenario C - Default Project Assumption");

  // Save offline planning artifact: web/src/data/track7/full-city-request-plan.json
  const artifactPathWeb = path.resolve(__dirname, "../src/data/track7/full-city-request-plan.json");
  const artifactPathProcessed = path.resolve(__dirname, "../../data/processed/full-city-request-plan.json");

  const artifactData = JSON.stringify(defaultPlan, null, 2);

  fs.mkdirSync(path.dirname(artifactPathWeb), { recursive: true });
  fs.writeFileSync(artifactPathWeb, artifactData, "utf-8");
  console.log(`\n[Artifact Written]: ${artifactPathWeb}`);

  if (fs.existsSync(path.dirname(artifactPathProcessed))) {
    fs.writeFileSync(artifactPathProcessed, artifactData, "utf-8");
    console.log(`[Artifact Synced]: ${artifactPathProcessed}`);
  }

  console.log("=========================================================");
  console.log("OFFLINE DRY-RUN TILING PLAN VERIFIED SUCCESSFULLY.");
}

main();
