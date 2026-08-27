/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock 'server-only' module in require cache before importing server-only modules
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {
  // Ignore if server-only cannot be resolved
}

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CoolCityHeatmapRequestSchema } from "../src/lib/validation/fortyguard";
import { normalizeFortyGuardResponse } from "../src/lib/fortyguard/normalize";
import { getApiKey, fortyguardFetch } from "../src/lib/fortyguard/client";
import {
  FortyGuardConfigError,
  FortyGuardApiError,
  FortyGuardTimeoutError,
  FortyGuardMalformedResponseError,
  toCoolCityErrorResponse,
} from "../src/lib/fortyguard/errors";
import { FortyGuardStatusResponse } from "../src/lib/fortyguard/types";

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
    filterType: 1 as const,
    startTime: "14:00",
  },
  granularity: 100 as const,
  analyticType: "tcm" as const,
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
          mean: 39.722425,
          standard_deviation: 0.01507502,
        },
        overall_temperature_distribution: [39.6957, 39.709175, 39.7204, 39.733725, 39.7523],
        normal_temperature_distribution: {
          x_axis: [39.7, 39.72, 39.74],
          y_axis: [0.1, 0.8, 0.1],
        },
        temperature_frequency: {
          x_axis: [40],
          y_axis: [1],
        },
      },
    },
  },
};

describe("FortyGuard Backend Adapter Test Suite", () => {
  let originalEnvApiKey: string | undefined;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalEnvApiKey = process.env.FORTYGUARD_API_KEY;
    originalFetch = globalThis.fetch;
    process.env.FORTYGUARD_API_KEY = "test-mock-api-key";
  });

  afterEach(() => {
    process.env.FORTYGUARD_API_KEY = originalEnvApiKey;
    globalThis.fetch = originalFetch;
  });

  // Test 1: Valid request validation
  it("1. validates a valid CoolCity heatmap request payload", () => {
    const result = CoolCityHeatmapRequestSchema.safeParse(mockValidRequest);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.granularity, 100);
      assert.equal(result.data.analyticType, "tcm");
      assert.equal(result.data.dateTime.startDate, "2024-07-15");
    }
  });

  // Test 2: Invalid date
  it("2. rejects invalid date formats", () => {
    const invalidDateReq = {
      ...mockValidRequest,
      dateTime: {
        ...mockValidRequest.dateTime,
        startDate: "2024/07/15", // Should be YYYY-MM-DD
      },
    };
    const result = CoolCityHeatmapRequestSchema.safeParse(invalidDateReq);
    assert.equal(result.success, false);
  });

  // Test 3: Invalid granularity
  it("3. rejects invalid granularity values", () => {
    const invalidGranularityReq = {
      ...mockValidRequest,
      granularity: 50, // Only 60, 80, 100 supported
    };
    const result = CoolCityHeatmapRequestSchema.safeParse(invalidGranularityReq);
    assert.equal(result.success, false);
  });

  // Test 4: Missing AOI
  it("4. rejects payload when AOI is missing", () => {
    const { aoi: _ignored, ...missingAoiReq } = mockValidRequest as any;
    const result = CoolCityHeatmapRequestSchema.safeParse(missingAoiReq);
    assert.equal(result.success, false);
  });

  // Test 5: Missing API key
  it("5. throws FortyGuardConfigError when API key is missing", () => {
    delete process.env.FORTYGUARD_API_KEY;
    assert.throws(
      () => getApiKey(),
      (err: any) => err instanceof FortyGuardConfigError && err.code === "CONFIG_ERROR"
    );
  });

  // Test 6: Successful normalization
  it("6. correctly normalizes real FortyGuard status response shape", () => {
    const normalized = normalizeFortyGuardResponse(mockRealFortyGuardResponse);

    assert.equal(normalized.metadata.source, "FortyGuard");
    assert.ok(normalized.metadata.timestamp);

    // Map Data Checks
    assert.equal(normalized.mapData.type, "FeatureCollection");
    assert.equal(normalized.mapData.features.length, 1);
    const tile = normalized.mapData.features[0];
    assert.equal(tile.properties.tileId, 0);
    assert.equal(tile.properties.averageTemperature, 39.7388);
    assert.equal(tile.properties.minTemperature, 39.7388);
    assert.equal(tile.properties.maxTemperature, 39.7388);

    // Stats Data Checks
    assert.equal(normalized.stats.unit, "C");
    assert.equal(normalized.stats.minTemperature, 39.6957);
    assert.equal(normalized.stats.maxTemperature, 39.7523);
    assert.equal(normalized.stats.meanTemperature, 39.722425);
    assert.equal(normalized.stats.standardDeviation, 0.01507502);
    assert.deepEqual(normalized.stats.overallDistribution, [
      39.6957, 39.709175, 39.7204, 39.733725, 39.7523,
    ]);
    assert.deepEqual(normalized.stats.normalDistribution, {
      xAxis: [39.7, 39.72, 39.74],
      yAxis: [0.1, 0.8, 0.1],
    });
    assert.deepEqual(normalized.stats.temperatureFrequency, {
      xAxis: [40],
      yAxis: [1],
    });
  });

  // Test 7: Malformed upstream response
  it("7. throws FortyGuardMalformedResponseError on malformed upstream structure", () => {
    const malformedPayloads = [
      null,
      {},
      { data: null },
      { data: { result: {} } },
      { data: { result: { map_data: { features: "not-an-array" } } } },
    ];

    for (const badPayload of malformedPayloads) {
      assert.throws(
        () => normalizeFortyGuardResponse(badPayload as any),
        (err: any) =>
          err instanceof FortyGuardMalformedResponseError && err.code === "MALFORMED_RESPONSE"
      );
    }
  });

  // Test 8: Upstream failure
  it("8. handles upstream API failure response correctly without exposing secrets", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Internal FortyGuard error" }), {
        status: 500,
        statusText: "Internal Server Error",
      });

    try {
      await fortyguardFetch("/v1/heatmap");
      assert.fail("Expected fortyguardFetch to throw");
    } catch (err: any) {
      assert.ok(err instanceof FortyGuardApiError);
      assert.equal(err.code, "UPSTREAM_ERROR");

      const { response, httpStatus } = toCoolCityErrorResponse(err);
      assert.equal(response.success, false);
      assert.equal(response.error.code, "UPSTREAM_ERROR");
      assert.equal(httpStatus, 500);
      // Verify no API key in response error message
      assert.equal(response.error.message.includes("test-mock-api-key"), false);
    }
  });

  // Test 9: Timeout
  it("9. handles network request timeout", async () => {
    globalThis.fetch = async (_url, options) => {
      const signal = options?.signal;
      return new Promise((_, reject) => {
        if (signal) {
          signal.addEventListener("abort", () => {
            const err = new DOMException("The operation was aborted", "AbortError");
            reject(err);
          });
        }
      });
    };

    try {
      await fortyguardFetch("/v1/heatmap", { timeoutMs: 50 });
      assert.fail("Expected fetch to time out");
    } catch (err: any) {
      assert.ok(err instanceof FortyGuardTimeoutError);
      assert.equal(err.code, "TIMEOUT_ERROR");

      const { response, httpStatus } = toCoolCityErrorResponse(err);
      assert.equal(response.success, false);
      assert.equal(response.error.code, "TIMEOUT_ERROR");
      assert.equal(httpStatus, 504);
    }
  });
});
