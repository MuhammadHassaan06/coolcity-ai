/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock 'server-only' for Node standalone CLI runner context
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
import { executeTrack6Tool, track6ToolDeclarations } from "../src/lib/agent/tools";
import { GeminiConfigError } from "../src/lib/agent/errors";
import { resetAnalyticsStore } from "../src/lib/zones/zone-service";
import { resetResourceInventory } from "../src/lib/resources/inventory";

describe("Gemini Agentic Workflow & Tool Calling Architecture Test Suite", () => {
  let originalEnvApiKey: string | undefined;

  const mockContext = {
    authoritativeInventory: {
      mobileCoolingUnits: 5,
      waterStations: 12,
      outreachTeams: 4,
    },
  };

  beforeEach(() => {
    originalEnvApiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "mock-gemini-api-key";
    resetAnalyticsStore();
    resetResourceInventory();
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnvApiKey;
  });

  // TEST 1: Tool declarations structure
  it("1. verifies tool declarations schema for Gemini Function Calling", () => {
    assert.equal(track6ToolDeclarations.length, 1);
    const decls = (track6ToolDeclarations[0] as { functionDeclarations: Array<Record<string, unknown>> }).functionDeclarations;
    assert.equal(decls.length, 7);

    const names = decls.map((d: Record<string, unknown>) => d.name);
    assert.ok(names.includes("get_zone_heat_data"));
    assert.ok(names.includes("get_historical_heat_metrics"));
    assert.ok(names.includes("get_zone_vulnerability"));
    assert.ok(names.includes("get_zone_risk_scores"));
    assert.ok(names.includes("get_resource_inventory"));
    assert.ok(names.includes("rank_priority_zones"));
    assert.ok(names.includes("allocate_resources"));
  });

  // TEST 2: get_zone_risk_scores tool execution
  it("2. executes 'get_zone_risk_scores' tool handler deterministically", async () => {
    const { output, record } = await executeTrack6Tool("get_zone_risk_scores", {}, mockContext);

    assert.equal(record.toolName, "get_zone_risk_scores");
    assert.equal((output as any).success, true);
    assert.ok(Array.isArray((output as any).risks));
    assert.ok((output as any).risks.length > 0);
  });

  // TEST 3: get_resource_inventory tool execution
  it("3. executes 'get_resource_inventory' tool handler deterministically", async () => {
    const { output, record } = await executeTrack6Tool("get_resource_inventory", {}, mockContext);

    assert.equal(record.toolName, "get_resource_inventory");
    assert.equal((output as any).success, true);
    assert.equal((output as any).authoritativeInventory.mobileCoolingUnits, 5);
    assert.equal((output as any).authoritativeInventory.waterStations, 12);
    assert.equal((output as any).authoritativeInventory.outreachTeams, 4);
  });

  // TEST 4: allocate_resources tool execution
  it("4. executes 'allocate_resources' tool handler deterministically", async () => {
    const args = {
      mobileCoolingUnits: 2,
      waterStations: 2,
      outreachTeams: 1,
    };

    const { output, record } = await executeTrack6Tool("allocate_resources", args, mockContext);

    assert.equal(record.toolName, "allocate_resources");
    assert.equal((output as any).success, true);

    const result = (output as any).result;
    assert.ok(result);
    assert.ok(result.allocations.length > 0);
  });

  // TEST 5: Unknown tool error handling
  it("5. throws error on unknown tool name execution request", async () => {
    await assert.rejects(
      async () => await executeTrack6Tool("unknown_invalid_tool", {}, mockContext),
      (err: any) => err.message.includes("Unrecognized tool name")
    );
  });
});
