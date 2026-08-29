import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CoolCityHeatmapRequestSchema } from "../src/lib/validation/fortyguard";
import { normalizeFortyGuardResponse } from "../src/lib/fortyguard/normalize";
import { FortyGuardStatusResponse } from "../src/lib/fortyguard/types";
import { generateTilingPlan } from "../src/lib/fortyguard/tiling";

const mockSampleAoIPolygon = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-112.079, 33.4435],
      [-112.069, 33.4435],
      [-112.069, 33.4525],
      [-112.079, 33.4525],
      [-112.079, 33.4435],
    ],
  ],
};

const mockValidRequest = {
  aoi: mockSampleAoIPolygon,
  dateTime: {
    startDate: "2024-07-15",
    filterType: 1,
    startTime: "14:00",
  },
  granularity: 100,
  analyticType: "tcm",
};

const mockRealFortyGuardResponse: FortyGuardStatusResponse = {
  error: false,
  status_code: 200,
  message: "Completed",
  data: {
    activity_id: "59de67ca-1570-41b9-9bee-6c8a58e27a1a",
    status: "Completed",
    result: {
      map_data: {
        type: "FeatureCollection",
        features: [
          {
            id: "0",
            type: "Feature",
            geometry: mockSampleAoIPolygon,
            properties: {
              tile_id: 0,
              average_temperature: 39.7388,
              min_temperature: 39.7388,
              max_temperature: 39.7388,
            },
          },
        ],
      },
      stats_data: {
        temperature_stats: {
          minimum: 39.6957,
          maximum: 39.7523,
          mean: 39.7224,
          standard_deviation: 0.015,
        },
      },
    },
  },
};

describe("FortyGuard Backend Adapter Test Suite", () => {
  let originalEnvApiKey: string | undefined;

  beforeEach(() => {
    originalEnvApiKey = process.env.FORTYGUARD_API_KEY;
    process.env.FORTYGUARD_API_KEY = "test-mock-api-key";
  });

  afterEach(() => {
    process.env.FORTYGUARD_API_KEY = originalEnvApiKey;
  });

  it("1. validates a valid CoolCity heatmap request payload", () => {
    const result = CoolCityHeatmapRequestSchema.safeParse(mockValidRequest);
    assert.equal(result.success, true);
  });

  it("2. normalizes status response cleanly into domain contract", () => {
    const normalized = normalizeFortyGuardResponse(mockRealFortyGuardResponse);
    assert.equal(normalized.metadata.activityId, "59de67ca-1570-41b9-9bee-6c8a58e27a1a");
    assert.equal(normalized.stats.unit, "C");
    assert.equal(normalized.mapData.features.length, 1);
    assert.equal(normalized.mapData.features[0].properties.averageTemperatureC, 39.7388);
  });

  it("3. performs full-city dry-run spatial tiling using 10 sq mi max area target", () => {
    const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");
    const geojson = JSON.parse(fs.readFileSync(boundaryPath, "utf-8"));

    const plan = generateTilingPlan(geojson, { maxAreaSqMi: 10.0, dailyRequestLimit: 30 });
    assert.equal(plan.configuredMaxAreaSqMi, 10.0);
    assert.equal(plan.chunksExceedingMaxArea, 0);
    assert.ok(plan.maxChunkAreaSqMi <= 10.0);
    assert.ok(plan.plannedRequests > 0);
    assert.equal(plan.fitsWithinDailyLimit, false); // 64 > 30
    assert.ok(plan.warnings.length > 0);
  });

  it("4. performs full-city dry-run spatial tiling using 50 sq mi max area target", () => {
    const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");
    const geojson = JSON.parse(fs.readFileSync(boundaryPath, "utf-8"));

    const plan = generateTilingPlan(geojson, { maxAreaSqMi: 50.0, dailyRequestLimit: 30 });
    assert.equal(plan.configuredMaxAreaSqMi, 50.0);
    assert.equal(plan.chunksExceedingMaxArea, 0);
    assert.ok(plan.maxChunkAreaSqMi <= 50.0);
    assert.ok(plan.plannedRequests <= 30);
    assert.equal(plan.fitsWithinDailyLimit, true);
    assert.equal(plan.warnings.length, 0);
  });

  it("5. rejects malformed, zero, or negative max area configuration", () => {
    assert.throws(() => {
      generateTilingPlan(mockSampleAoIPolygon, { maxAreaSqMi: 0 });
    }, /Invalid maxAreaSqMi configuration/);

    assert.throws(() => {
      generateTilingPlan(mockSampleAoIPolygon, { maxAreaSqMi: -15 });
    }, /Invalid maxAreaSqMi configuration/);
  });

  it("6. supports Polygon, MultiPolygon, Feature, and FeatureCollection geometries", () => {
    const polygonGeom = mockSampleAoIPolygon;
    const featureGeom = { type: "Feature", geometry: mockSampleAoIPolygon };
    const featureColl = { type: "FeatureCollection", features: [featureGeom] };

    const plan1 = generateTilingPlan(polygonGeom, { maxAreaSqMi: 10 });
    const plan2 = generateTilingPlan(featureGeom, { maxAreaSqMi: 10 });
    const plan3 = generateTilingPlan(featureColl, { maxAreaSqMi: 10 });

    assert.ok(plan1.plannedRequests > 0);
    assert.ok(plan2.plannedRequests > 0);
    assert.ok(plan3.plannedRequests > 0);
  });

  it("7. verifies area-aware planner replaces unscalable 640-request fixed degree grid", () => {
    const boundaryPath = path.resolve(__dirname, "../public/data/phoenix-city-boundary.geojson");
    const geojson = JSON.parse(fs.readFileSync(boundaryPath, "utf-8"));

    const planDefault = generateTilingPlan(geojson, { maxAreaSqMi: 25.0 });
    assert.ok(planDefault.plannedRequests < 640);
    assert.equal(planDefault.plannedRequests, 35); // 35 planned requests vs 640 fixed degree tiles
    assert.equal(planDefault.planningOnly, true);
  });
});
