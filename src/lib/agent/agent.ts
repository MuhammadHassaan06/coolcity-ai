import { AgentPlanRequest, AgentPlanOutput, AgentPlanRequestSchema, AgentPlanOutputSchema } from "./schemas";
import { getZones } from "../zones/zone-service";
import { getAllZoneRisks } from "../risk/risk-service";
import { allocate } from "../allocation/allocator";
import { track6ToolDeclarations } from "./tools";
import { AgentValidationError } from "./errors";

export async function runCoolCityPlanningAgent(
  requestInput: AgentPlanRequest
): Promise<AgentPlanOutput> {
  // 1. Validate request payload using Zod schema
  const parsedRequest = AgentPlanRequestSchema.safeParse(requestInput);
  if (!parsedRequest.success) {
    const issueMsgs = parsedRequest.error.issues.map((i) => i.message).join("; ");
    throw new AgentValidationError(`Invalid agent planning request payload: ${issueMsgs}`);
  }

  const { goal, inventory, zoneIds } = parsedRequest.data;

  // 2. Load zone risks for allocation context
  const allRisks = await getAllZoneRisks();
  const allZones = await getZones();

  // Run deterministic allocation as ground truth
  const deterministicResult = allocate({
    inventory,
    zones: allRisks,
    validZoneIds: zoneIds,
  });

  const evidenceItems: Array<{
    zoneId: string;
    type: string;
    metric: string;
    value: string | number;
    source: string;
  }> = [];

  // Populate verified evidence items from Track 7 canonical dataset
  const targetZones = zoneIds && zoneIds.length > 0
    ? allZones.filter((z) => zoneIds.includes(z.geoid) || zoneIds.includes(z.id) || zoneIds.includes(z.code))
    : allZones;

  for (const z of targetZones) {
    evidenceItems.push({
      zoneId: z.geoid,
      type: "risk",
      metric: "Track 7 Composite Risk Score",
      value: z.riskScore,
      source: "CoolCity deterministic risk model",
    });
    evidenceItems.push({
      zoneId: z.geoid,
      type: "heat",
      metric: "Average Surface Temperature (°C)",
      value: z.avgTemperature,
      source: "FortyGuard / CoolCity Thermal Engine",
    });
  }

  const priorityZoneGeoids = allRisks
    .filter((r) => !zoneIds || zoneIds.includes(r.zoneId))
    .slice(0, 5)
    .map((r) => r.zoneId);

  // 3. Check for Gemini API key and attempt agentic execution if available
  const apiKey = process.env.GEMINI_API_KEY;
  let useGemini = false;

  if (apiKey && apiKey.trim() !== "" && !apiKey.startsWith("mock-")) {
    useGemini = true;
  }

  if (useGemini) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: apiKey!.trim() });

      const prompt = `You are the CoolCity AI Heat-Relief Deployment Planner for the City of Phoenix.
Goal: ${goal}
Available Inventory: ${JSON.stringify(inventory)}
Requested Target Zones: ${zoneIds && zoneIds.length > 0 ? zoneIds.join(", ") : "All Census Tracts"}

Utilize your registered tools to query heat data, risk scores, and compute deterministic allocations.
Ensure allocations strictly comply with municipal inventory limits.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [prompt],
        config: {
          tools: track6ToolDeclarations,
        },
      });

      if (response && response.text) {
        // Return valid plan using deterministic allocation enforcement
        const finalPlan: AgentPlanOutput = {
          summary: `CoolCity Heat-Relief Deployment Plan: ${goal}. ${response.text}`,
          priorityZones: priorityZoneGeoids,
          allocations: deterministicResult.allocations,
          remainingInventory: deterministicResult.remainingInventory,
          evidence: evidenceItems,
          warnings: deterministicResult.warnings || [],
        };

        const validated = AgentPlanOutputSchema.safeParse(finalPlan);
        if (validated.success) {
          return validated.data;
        }
      }
    } catch {
      // Fall through to deterministic fallback if Gemini call fails
    }
  }

  // 4. Deterministic Fallback Execution
  const fallbackSummary = `CoolCity Heat-Relief Deployment Plan (Deterministic Mode): ${goal}. Automatically prioritized ${priorityZoneGeoids.length} Census Tracts based on Track 7 authoritative riskScores.`;

  const fallbackPlan: AgentPlanOutput = {
    summary: fallbackSummary,
    priorityZones: priorityZoneGeoids,
    allocations: deterministicResult.allocations,
    remainingInventory: deterministicResult.remainingInventory,
    evidence: evidenceItems,
    warnings: deterministicResult.warnings || [],
  };

  return AgentPlanOutputSchema.parse(fallbackPlan);
}
