/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";

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
  console.log("Testing FortyGuard Adapter Normalization");
  console.log("==================================================");

  const fixturePath = path.resolve(process.cwd(), "scratch/fortyguard-real-response-raw.json");
  if (!fs.existsSync(fixturePath)) {
    console.error("Fixture file not found at:", fixturePath);
    process.exit(1);
  }

  const rawJson = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
  const { normalizeFortyGuardResponse } = await import("../src/lib/fortyguard/normalize");

  const normalized = normalizeFortyGuardResponse(rawJson);

  console.log(">>> Normalization Succeeded!");
  console.log("Source Metadata:", normalized.metadata);
  console.log("Total Features:", normalized.mapData.features.length);
  console.log("Celsius Stats:", {
    min: normalized.stats.minTemperature,
    max: normalized.stats.maxTemperature,
    mean: normalized.stats.meanTemperature,
    stdDev: normalized.stats.standardDeviation,
    unit: normalized.stats.unit,
  });
  if (normalized.mapData.features.length > 0) {
    console.log("Sample Feature #0 Properties:", JSON.stringify(normalized.mapData.features[0].properties, null, 2));
  }
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
