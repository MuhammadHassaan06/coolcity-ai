import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { runCoolCityPlanningAgent } from "../src/lib/agent/agent";
import { resetAnalyticsStore } from "../src/lib/zones/zone-service";

describe("Gemini Multi-Turn Function Calling & Safety Test Suite", () => {
  let originalApiKey: string | undefined;
  let originalCjsInternal: any;
  let originalEsmInternal: any;
  let mockGenerateContentHandler: (params: any) => Promise<any>;

  beforeEach(async () => {
    originalApiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "live-test-gemini-key"; // non-mock key to trigger useGemini = true
    resetAnalyticsStore();

    const cjsModule = require("@google/genai");
    const esmModule = await import("@google/genai");

    const dummyCjs = new cjsModule.GoogleGenAI({ apiKey: "temp-key" });
    const dummyEsm = new esmModule.GoogleGenAI({ apiKey: "temp-key" });

    const cjsProto = Object.getPrototypeOf(dummyCjs.models);
    const esmProto = Object.getPrototypeOf(dummyEsm.models);

    if (!originalCjsInternal) originalCjsInternal = cjsProto.generateContentInternal;
    if (!originalEsmInternal) originalEsmInternal = esmProto.generateContentInternal;

    mockGenerateContentHandler = async () => ({ text: "Default mock response" });

    cjsProto.generateContentInternal = (params: any) => mockGenerateContentHandler(params);
    esmProto.generateContentInternal = (params: any) => mockGenerateContentHandler(params);
  });

  afterEach(async () => {
    process.env.GEMINI_API_KEY = originalApiKey;
    const cjsModule = require("@google/genai");
    const esmModule = await import("@google/genai");

    if (originalCjsInternal) {
      const dummyCjs = new cjsModule.GoogleGenAI({ apiKey: "temp-key" });
      Object.getPrototypeOf(dummyCjs.models).generateContentInternal = originalCjsInternal;
    }
    if (originalEsmInternal) {
      const dummyEsm = new esmModule.GoogleGenAI({ apiKey: "temp-key" });
      Object.getPrototypeOf(dummyEsm.models).generateContentInternal = originalEsmInternal;
    }
  });

  it("1. Gemini immediately returns valid final response without requesting tools", async () => {
    mockGenerateContentHandler = async () => {
      return {
        candidates: [{ finishReason: "STOP" }],
        text: "Immediate final planning recommendation.",
      };
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "Emergency deployment",
      inventory: { mobileCoolingUnits: 2, waterStations: 4, outreachTeams: 1 },
    });

    assert.ok(plan.summary.includes("Immediate final planning recommendation."));
    assert.ok(plan.allocations.length > 0);
  });

  it("2. Gemini requests one valid tool → tool executes → function response returned → Gemini final response succeeds", async () => {
    let callCount = 0;
    let receivedUserParts: any[] = [];

    mockGenerateContentHandler = async (params: any) => {
      callCount++;
      if (callCount === 1) {
        return {
          candidates: [
            {
              finishReason: "STOP",
              content: {
                role: "model",
                parts: [{ functionCall: { id: "call_abc123", name: "get_zone_risk_scores", args: {} } }],
              },
            },
          ],
        };
      } else {
        receivedUserParts = params.contents[params.contents.length - 1]?.parts || [];
        return {
          candidates: [{ finishReason: "STOP" }],
          text: "Plan finalized after evaluating zone risk scores.",
        };
      }
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "Deploy based on risk scores",
      inventory: { mobileCoolingUnits: 3, waterStations: 5, outreachTeams: 2 },
    });

    assert.equal(callCount, 2);
    assert.equal(receivedUserParts.length, 1);
    assert.equal(receivedUserParts[0].functionResponse?.name, "get_zone_risk_scores");
    assert.equal(receivedUserParts[0].functionResponse?.id, "call_abc123");
    assert.ok(plan.summary.includes("Plan finalized after evaluating zone risk scores."));
  });

  it("3 & 4. Gemini requests multiple valid tools and preserves function call IDs in function responses", async () => {
    let callCount = 0;
    let receivedUserParts: any[] = [];

    mockGenerateContentHandler = async (params: any) => {
      callCount++;
      if (callCount === 1) {
        return {
          candidates: [
            {
              finishReason: "STOP",
              content: {
                role: "model",
                parts: [
                  { functionCall: { id: "id_101", name: "get_zone_risk_scores", args: {} } },
                  { functionCall: { id: "id_102", name: "get_resource_inventory", args: {} } },
                ],
              },
            },
          ],
        };
      } else {
        receivedUserParts = params.contents[params.contents.length - 1]?.parts || [];
        return {
          candidates: [{ finishReason: "STOP" }],
          text: "Multi-tool evaluation complete.",
        };
      }
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "Multi tool test",
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 1 },
    });

    assert.equal(callCount, 2);
    assert.equal(receivedUserParts.length, 2);
    assert.equal(receivedUserParts[0].functionResponse?.id, "id_101");
    assert.equal(receivedUserParts[0].functionResponse?.name, "get_zone_risk_scores");
    assert.equal(receivedUserParts[1].functionResponse?.id, "id_102");
    assert.equal(receivedUserParts[1].functionResponse?.name, "get_resource_inventory");
    assert.ok(plan.summary.includes("Multi-tool evaluation complete."));
  });

  it("5. Unknown or unapproved tool name requested by Gemini triggers safe fallback", async () => {
    mockGenerateContentHandler = async () => {
      return {
        candidates: [
          {
            finishReason: "STOP",
            content: {
              role: "model",
              parts: [{ functionCall: { id: "bad_call", name: "unauthorized_shell_exec", args: {} } }],
            },
          },
        ],
      };
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "Security check test",
      inventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 },
    });

    assert.ok(plan);
    assert.ok(plan.summary.includes("Deterministic Mode"));
  });

  it("6 & 7. Tool execution error or invalid parameters trigger safe fallback", async () => {
    mockGenerateContentHandler = async () => {
      return {
        candidates: [
          {
            finishReason: "STOP",
            content: {
              role: "model",
              parts: [{ functionCall: { id: "err_call", name: "allocate_resources", args: { mobileCoolingUnits: -50 } } }],
            },
          },
        ],
      };
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "Error boundary test",
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 1 },
    });

    assert.ok(plan);
    assert.ok(plan.summary.includes("Deterministic Mode"));
  });

  it("8. Gemini tool calling loop exceeding max-turn limit (5) triggers safe fallback", async () => {
    let callCount = 0;

    mockGenerateContentHandler = async () => {
      callCount++;
      return {
        candidates: [
          {
            finishReason: "STOP",
            content: {
              role: "model",
              parts: [{ functionCall: { id: `call_${callCount}`, name: "get_resource_inventory", args: {} } }],
            },
          },
        ],
      };
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "Infinite turn loop prevention test",
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 1 },
    });

    assert.equal(callCount, 5);
    assert.ok(plan.summary.includes("Deterministic Mode"));
  });

  it("9. Final Gemini response with empty/missing text triggers safe fallback", async () => {
    mockGenerateContentHandler = async () => {
      return {
        candidates: [{ finishReason: "STOP" }],
        text: "",
      };
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "Empty text response test",
      inventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 },
    });

    assert.ok(plan.summary.includes("Deterministic Mode"));
  });

  it("10. Gemini SDK request exception triggers safe fallback", async () => {
    mockGenerateContentHandler = async () => {
      throw new Error("API Network error or 404 Model Not Found");
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "API failure test",
      inventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 },
    });

    assert.ok(plan);
    assert.ok(plan.summary.includes("Deterministic Mode"));
  });

  it("11. Existing deterministic allocation constraints hold strictly regardless of model response", async () => {
    mockGenerateContentHandler = async () => {
      return {
        candidates: [{ finishReason: "STOP" }],
        text: "Allocated 9999 cooling units to tract 04013113900.",
      };
    };

    const inventory = { mobileCoolingUnits: 2, waterStations: 3, outreachTeams: 1 };
    const plan = await runCoolCityPlanningAgent({
      goal: "Allocation limit override attempt",
      inventory,
    });

    const allocatedMobile = plan.allocations
      .filter((a) => a.resourceType === "mobile_cooling_unit")
      .reduce((sum, a) => sum + a.quantity, 0);

    assert.ok(allocatedMobile <= inventory.mobileCoolingUnits);
    assert.equal(plan.remainingInventory.mobileCoolingUnits, inventory.mobileCoolingUnits - allocatedMobile);
  });

  it("12. Existing snapshot-specific behavior holds cleanly", async () => {
    mockGenerateContentHandler = async () => {
      return {
        candidates: [{ finishReason: "STOP" }],
        text: "Historical analysis for 2024 snapshot complete.",
      };
    };

    const plan = await runCoolCityPlanningAgent({
      goal: "Snapshot verification test",
      inventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 },
      snapshotId: "2024-07-15-1400",
    });

    assert.ok(plan.summary.includes("2024-07-15-1400"));
    assert.ok(plan.evidence.some((e) => e.source.includes("2024-07-15-1400")));
  });
});
