/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";

// Load .env.local from project root without external dependencies
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

// Mock 'server-only' for Node standalone CLI runner context
import moduleAlias from "module";
const originalRequire = (moduleAlias.prototype as any).require;
(moduleAlias.prototype as any).require = function (modulePath: string) {
  if (modulePath === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

async function main() {
  console.log("==================================================");
  console.log("Executing PART 9: First real FortyGuard API call");
  console.log("==================================================");

  // Import after server-only mock
  const { submitHeatmap, getHeatmapStatus } = await import("../src/lib/fortyguard/client");

  const phoenixAOI: any = {
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

  console.log("Sending submitHeatmap request with Phoenix AOI...");
  const submitResult = await submitHeatmap({
    polygon_aoi: phoenixAOI,
    granularity: "100m" as any,
    date_time: "2024-07-15T14:00:00Z" as any,
  });

  const activityId = submitResult.data.activity_id;
  console.log(">>> [SUCCESS] Returned activity_id:", activityId);

  console.log("Fetching getHeatmapStatus for activity_id:", activityId);
  const statusResult = await getHeatmapStatus(activityId);
  console.log(">>> [SUCCESS] Initial status response:");
  console.log(JSON.stringify(statusResult, null, 2));
  console.log("==================================================");
}

main().catch((err) => {
  console.error(">>> [ERROR] Test script failed:", err);
  process.exit(1);
});
