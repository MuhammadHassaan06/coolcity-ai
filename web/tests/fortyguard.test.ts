import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
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

  it("3. performs full-city dry-run spatial tiling without network calls", () => {
    const plan = generateTilingPlan(mockSampleAoIPolygon, { maxChunkSpanDegrees: 0.005 });
    assert.ok(plan.totalSubPolygons > 0);
    assert.equal(typeof plan.estimatedRequests, "number");
    assert.equal(plan.subPolygons[0].type, "Feature");
  });
});
