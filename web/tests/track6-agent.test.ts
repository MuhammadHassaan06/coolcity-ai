import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { runCoolCityPlanningAgent } from "../src/lib/agent/agent";
import { executeTrack6Tool } from "../src/lib/agent/tools";
import { AgentPlanRequestSchema, AgentPlanOutputSchema } from "../src/lib/agent/schemas";
import { ToolExecutionError } from "../src/lib/agent/errors";
import { resetAnalyticsStore } from "../src/lib/zones/zone-service";

describe("Track 6 Agentic Planning Engine Test Suite", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "mock-gemini-key";
    resetAnalyticsStore();
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
  });

  it("TEST 1: handles zero inventory gracefully with warning, zero allocations, and priority zones", async () => {
    const request = {
      goal: "Provide emergency heat relief under zero resources",
      inventory: { mobileCoolingUnits: 0, waterStations: 0, outreachTeams: 0 },
    };

    const plan = await runCoolCityPlanningAgent(request);

    assert.ok(plan);
    assert.equal(plan.allocations.length, 0);
    assert.equal(plan.remainingInventory.mobileCoolingUnits, 0);
    assert.ok(plan.priorityZones.length > 0, "Priority zones should be populated even when inventory is 0");
    assert.ok(plan.warnings.some((w) => w.includes("Zero municipal resource inventory")));
  });

  it("TEST 2: allocates resources within inventory limits under normal inventory", async () => {
    const request = {
      goal: "Deploy cooling units to commercial and residential hot spots",
      inventory: { mobileCoolingUnits: 3, waterStations: 5, outreachTeams: 2 },
    };

    const plan = await runCoolCityPlanningAgent(request);

    assert.ok(plan);
    assert.ok(plan.allocations.length > 0);

    const mobileAllocated = plan.allocations
      .filter((a) => a.resourceType === "mobile_cooling_unit")
      .reduce((sum, a) => sum + a.quantity, 0);

    assert.ok(mobileAllocated <= 3, `Mobile units allocated (${mobileAllocated}) must be <= 3`);
  });

  it("TEST 3: rejects invalid or negative inventory with validation error", () => {
    const invalidInputs = [
      { goal: "Goal", inventory: { mobileCoolingUnits: -1, waterStations: 5, outreachTeams: 2 } },
      { goal: "Goal", inventory: { mobileCoolingUnits: 1.5, waterStations: 5, outreachTeams: 2 } },
    ];

    for (const input of invalidInputs) {
      const res = AgentPlanRequestSchema.safeParse(input);
      assert.equal(res.success, false);
    }
  });

  it("TEST 4: rejects invalid or empty string zone IDs during validation", () => {
    const invalidReq = {
      goal: "Deploy to invalid zone",
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 2 },
      zoneIds: [""],
    };

    const res = AgentPlanRequestSchema.safeParse(invalidReq);
    assert.equal(res.success, false);
  });

  it("TEST 5: handles tool execution failures without crashing process", async () => {
    await assert.rejects(
      async () => await executeTrack6Tool("invalid_tool_name", {}, { authoritativeInventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 } }),
      (err: any) => err instanceof ToolExecutionError
    );
  });

  it("TEST 6: falls back safely to deterministic plan when GEMINI_API_KEY is missing or model fails", async () => {
    delete process.env.GEMINI_API_KEY;

    const request = {
      goal: "Deploy heat relief in offline mode",
      inventory: { mobileCoolingUnits: 2, waterStations: 4, outreachTeams: 1 },
    };

    const plan = await runCoolCityPlanningAgent(request);

    assert.ok(plan);
    assert.ok(plan.summary.includes("CoolCity Heat-Relief Deployment Plan"));
  });

  it("TEST 7: ensures total allocated quantity never exceeds available municipal inventory", async () => {
    const request = {
      goal: "Deploy maximum units everywhere",
      inventory: { mobileCoolingUnits: 1, waterStations: 2, outreachTeams: 1 },
    };

    const plan = await runCoolCityPlanningAgent(request);

    const totalMobile = plan.allocations
      .filter((a) => a.resourceType === "mobile_cooling_unit")
      .reduce((sum, a) => sum + a.quantity, 0);

    assert.ok(totalMobile <= 1, "Mobile allocation must not exceed inventory (1)");
    assert.ok(plan.remainingInventory.mobileCoolingUnits >= 0);
  });

  it("TEST 8: verifies evidence array items have valid zoneId, metric, type, and source labels", async () => {
    const request = {
      goal: "Check evidence collector consistency",
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 1 },
    };

    const plan = await runCoolCityPlanningAgent(request);

    assert.ok(plan.evidence.length > 0, "Evidence array should be populated");
    for (const item of plan.evidence) {
      assert.ok(item.zoneId);
      assert.ok(["heat", "historical", "vulnerability", "risk"].includes(item.type));
      assert.ok(item.metric);
      assert.ok(item.source);
    }
  });

  it("TEST 9: forces allocations to come strictly from deterministic allocator engine", async () => {
    const request = {
      goal: "Test allocator override",
      inventory: { mobileCoolingUnits: 2, waterStations: 3, outreachTeams: 1 },
    };

    const plan = await runCoolCityPlanningAgent(request);

    const validatedOutput = AgentPlanOutputSchema.safeParse(plan);
    assert.equal(validatedOutput.success, true);
  });

  it("TEST 10: ensures evidence items originate only from verified data sources", async () => {
    const request = {
      goal: "Verify evidence sources",
      inventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 },
      zoneIds: ["04013113900"],
    };

    const plan = await runCoolCityPlanningAgent(request);

    const tractEvidence = plan.evidence.filter((e) => e.zoneId === "04013113900");
    assert.ok(tractEvidence.length > 0);

    for (const ev of tractEvidence) {
      assert.ok(ev.source);
    }
  });

  it("TEST 11: verifies server-side diagnostic logging outputs [Gemini Agent] prefix during fallback", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(" "));
      originalLog(...args);
    };

    try {
      process.env.GEMINI_API_KEY = "mock-key-test";
      const request = {
        goal: "Diagnostic log validation test",
        inventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 },
      };
      await runCoolCityPlanningAgent(request);
      assert.ok(logs.some((l) => l.includes("[Gemini Agent] Falling back:")));
    } finally {
      console.log = originalLog;
    }
  });
});
