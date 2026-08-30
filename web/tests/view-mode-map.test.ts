import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getSnapshotPriorityZones } from "../src/lib/snapshots/snapshot-adapter";

describe("Heat / Risk View Mode & Census Tract Choropleth Suite", () => {
  const geojsonPath = path.join(process.cwd(), "public/data/phoenix-census-tracts.geojson");

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("1. verified census tract geometry file exists and contains exactly 359 tracts", () => {
    assert.ok(fs.existsSync(geojsonPath), "Compact Census tract GeoJSON must exist");
    const stats = fs.statSync(geojsonPath);
    const sizeMb = stats.size / (1024 * 1024);
    assert.ok(sizeMb < 5.0, `File size should be compact (< 5MB), actual: ${sizeMb.toFixed(2)}MB`);

    const raw = fs.readFileSync(geojsonPath, "utf-8");
    const geojson = JSON.parse(raw);

    assert.equal(geojson.type, "FeatureCollection");
    assert.equal(geojson.features.length, 359);

    const geoids = geojson.features.map((f: any) => f.properties?.GEOID);
    const uniqueGeoids = new Set(geoids);
    assert.equal(uniqueGeoids.size, 359, "All 359 Census Tract GEOIDs must be unique");

    for (const f of geojson.features) {
      assert.ok(f.properties?.GEOID, "Every feature must have a GEOID property");
      assert.equal(String(f.properties.GEOID).length, 11, "GEOID must be 11 characters");
      assert.ok(["Polygon", "MultiPolygon"].includes(f.geometry?.type), "Geometry must be Polygon or MultiPolygon");
    }
  });

  it("2. joins 100% of 359 tract geometries to 2026 snapshot analytics by GEOID", () => {
    const raw = fs.readFileSync(geojsonPath, "utf-8");
    const geojson = JSON.parse(raw);
    const zones2026 = getSnapshotPriorityZones("2026-08-30-1400");
    const zoneMap = new Map(zones2026.map((z) => [z.geoid, z]));

    let matchCount = 0;
    for (const f of geojson.features) {
      const geoid = f.properties.GEOID;
      const zone = zoneMap.get(geoid);
      if (zone) {
        matchCount++;
        assert.ok(typeof zone.avgTemperature === "number");
        assert.ok(typeof zone.riskScore === "number");
        assert.ok(["critical", "high", "moderate", "low"].includes(zone.status));
      }
    }

    assert.equal(matchCount, 359, "All 359 geometry features must join to 2026 snapshot");
  });

  it("3. joins 100% of 359 tract geometries to 2024 snapshot analytics by GEOID", () => {
    const raw = fs.readFileSync(geojsonPath, "utf-8");
    const geojson = JSON.parse(raw);
    const zones2024 = getSnapshotPriorityZones("2024-07-15-1400");
    const zoneMap = new Map(zones2024.map((z) => [z.geoid, z]));

    let matchCount = 0;
    for (const f of geojson.features) {
      const geoid = f.properties.GEOID;
      const zone = zoneMap.get(geoid);
      if (zone) {
        matchCount++;
      }
    }

    assert.equal(matchCount, 359, "All 359 geometry features must join to 2024 snapshot");
  });

  it("4. 2026 + Heat mode returns 2026 temperatures (top tract 04013113900 = 40.57°C)", () => {
    const zones = getSnapshotPriorityZones("2026-08-30-1400");
    const topTract = zones.find((z) => z.geoid === "04013113900");
    assert.ok(topTract);
    assert.equal(topTract.avgTemperature, 40.57);
  });

  it("5. 2026 + Risk mode returns 2026 risk scores & status (top tract 04013113900 = score 77.02, critical)", () => {
    const zones = getSnapshotPriorityZones("2026-08-30-1400");
    const topTract = zones.find((z) => z.geoid === "04013113900");
    assert.ok(topTract);
    assert.equal(topTract.riskScore, 77.02);
    assert.equal(topTract.status, "critical");
  });

  it("6. 2024 + Heat mode returns 2024 temperatures (tract 04013113900 = 39.67°C)", () => {
    const zones = getSnapshotPriorityZones("2024-07-15-1400");
    const tract = zones.find((z) => z.geoid === "04013113900");
    assert.ok(tract);
    assert.equal(tract.avgTemperature, 39.67);
  });

  it("7. 2024 + Risk mode returns 2024 risk scores (tract 04013113900 = score 72.45, high)", () => {
    const zones = getSnapshotPriorityZones("2024-07-15-1400");
    const tract = zones.find((z) => z.geoid === "04013113900");
    assert.ok(tract);
    assert.equal(tract.riskScore, 72.45);
    assert.equal(tract.status, "high");
  });

  it("8. handles missing or invalid GEOID lookups gracefully without throwing", () => {
    const zones = getSnapshotPriorityZones("2026-08-30-1400");
    const zoneMap = new Map(zones.map((z) => [z.geoid, z]));
    const invalidMatch = zoneMap.get("INVALID_GEOID_9999");
    assert.equal(invalidMatch, undefined);
  });

  it("9. simulates tract selection & clear filter synchronization", () => {
    const zones = getSnapshotPriorityZones("2026-08-30-1400");
    let selectedZoneId: string | undefined = "04013113900";

    const selectedZone = zones.find((z) => z.geoid === selectedZoneId);
    assert.ok(selectedZone);
    assert.equal(selectedZone.name, "Census Tract 1139");

    // Clear filter
    selectedZoneId = undefined;
    const clearedZone = zones.find((z) => z.geoid === selectedZoneId);
    assert.equal(clearedZone, undefined);
  });
});
