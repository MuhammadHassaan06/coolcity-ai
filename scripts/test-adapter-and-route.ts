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
  const { normalizeFortyGuardResponse } = await import("../src/lib/fortyguard/adapter");

  const normalized = normalizeFortyGuardResponse(rawJson);

  console.log(">>> Normalization Succeeded!");
  console.log("Activity ID:", normalized.activity_id);
  console.log("Status:", normalized.status);
  console.log("Total Zones:", normalized.stats.total_zones);
  console.log("Celsius Stats:", {
    min: normalized.stats.min_temp_c,
    max: normalized.stats.max_temp_c,
    mean: normalized.stats.mean_temp_c,
    stdDev: normalized.stats.std_dev_c,
  });
  console.log("Fahrenheit Stats:", {
    min: normalized.stats.min_temp_f,
    max: normalized.stats.max_temp_f,
    mean: normalized.stats.mean_temp_f,
    stdDev: normalized.stats.std_dev_f,
  });
  console.log("Sample Zone #0:", JSON.stringify(normalized.zones.features[0].properties, null, 2));
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
