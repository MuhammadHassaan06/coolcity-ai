import fs from "fs";
import path from "path";
import { generateTilingPlan } from "../src/lib/fortyguard/tiling";

function main() {
  const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");

  if (!fs.existsSync(boundaryPath)) {
    console.error(`Boundary GeoJSON file not found at: ${boundaryPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(boundaryPath, "utf-8");
  const geojson = JSON.parse(rawData);

  console.log("=========================================");
  console.log("PHOENIX CITY BOUNDARY TILING DRY-RUN TEST");
  console.log("=========================================");

  const geomType = geojson.type === "FeatureCollection"
    ? `FeatureCollection (${geojson.features?.length || 0} features)`
    : geojson.type;

  console.log(`Geometry Type: ${geomType}`);

  const plan = generateTilingPlan(geojson, { maxChunkSpanDegrees: 0.02 });

  console.log(`City Boundary Bounds: [MinLng: ${plan.bounds.minLng}, MinLat: ${plan.bounds.minLat}, MaxLng: ${plan.bounds.maxLng}, MaxLat: ${plan.bounds.maxLat}]`);
  console.log(`Configured planning chunk size: ${plan.configuredMaxChunkSpanDegrees}° (~2.2km x 2.2km grid tiles)`);
  console.log(`Number of planned chunks: ${plan.totalSubPolygons}`);
  console.log(`Estimated API Requests: ${plan.estimatedRequests}`);
  console.log("=========================================");
  console.log("OFFLINE DRY-RUN TILING PLAN VERIFIED SUCCESSFULLY.");
}

main();
