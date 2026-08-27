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
import { executeAgentTool, geminiToolDeclarations } from "../src/lib/agent/tools";
import { getGeminiApiKey, GeminiConfigError } from "../src/lib/agent/gemini";
import { resetAnalyticsStore } from "../src/lib/zones/zone-service";
import { resetResourceInventory } from "../src/lib/resources/inventory";

describe("Gemini Agentic Workflow & Tool Calling Architecture Test Suite", () => {
  let originalEnvApiKey: string | undefined;

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
    assert.equal(geminiToolDeclarations.length, 1);
    const decls = geminiToolDeclarations[0].functionDeclarations;
    assert.equal(decls.length, 3);

    const names = decls.map((d) => d.name);
    assert.ok(names.includes("get_zone_risk_scores"));
    assert.ok(names.includes("get_resource_inventory"));
    assert.ok(names.includes("allocate_resources"));
  });

  // TEST 2: get_zone_risk_scores tool execution
  it("2. executes 'get_zone_risk_scores' tool handler deterministically", async () => {
    const { output, record } = await executeAgentTool("get_zone_risk_scores");

    assert.equal(record.toolName, "get_zone_risk_scores");
    assert.equal((output as any).success, true);
    assert.ok(Array.isArray((output as any).risks));
    assert.ok((output as any).risks.length > 0);
  });

  // TEST 3: get_resource_inventory tool execution
  it("3. executes 'get_resource_inventory' tool handler deterministically", async () => {
    const { output, record } = await executeAgentTool("get_resource_inventory");

    assert.equal(record.toolName, "get_resource_inventory");
    assert.equal((output as any).success, true);
    assert.equal((output as any).inventory.mobileCoolingUnits, 5);
    assert.equal((output as any).inventory.waterStations, 12);
    assert.equal((output as any).inventory.outreachTeams, 4);
  });

  // TEST 4: allocate_resources tool execution
  it("4. executes 'allocate_resources' tool handler deterministically", async () => {
    const args = {
      requestedAllocations: [
        {
          zoneId: "MOCK-Z01",
          resourceType: "mobile_cooling_unit",
          requestedQuantity: 2,
          reason: "High thermal risk in commercial district",
        },
      ],
    };

    const { output, record } = await executeAgentTool("allocate_resources", args);

    assert.equal(record.toolName, "allocate_resources");
    assert.equal((output as any).success, true);

    const result = (output as any).result;
    assert.ok(result);
    assert.equal(result.allocations.length, 2);
    assert.equal(result.allocations[0].zoneId, "MOCK-Z01");
    assert.equal(result.allocations[0].quantity, 1);
  });

  // TEST 5: Missing GEMINI_API_KEY configuration check
  it("5. throws GeminiConfigError when GEMINI_API_KEY is missing", () => {
    delete process.env.GEMINI_API_KEY;
    assert.throws(
      () => getGeminiApiKey(),
      (err: any) => err instanceof GeminiConfigError
    );
  });

  // TEST 6: Unknown tool error handling
  it("6. throws error on unknown tool name execution request", async () => {
    await assert.rejects(
      async () => await executeAgentTool("unknown_invalid_tool"),
      (err: any) => err.message.includes("Unknown tool execution request")
    );
  });
});
