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

  const { goal, inventory, zoneIds, snapshotId } = parsedRequest.data;
  const activeSnapshot = snapshotId || "2026-08-30-1400";

  // 2. Load zone risks for allocation context using selected snapshotId
  const allRisks = await getAllZoneRisks(activeSnapshot);
  const allZones = await getZones(activeSnapshot);

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
      source: `CoolCity deterministic risk model (${activeSnapshot})`,
    });
    evidenceItems.push({
      zoneId: z.geoid,
      type: "heat",
      metric: "Average Surface Temperature (°C)",
      value: z.avgTemperature,
      source: `FortyGuard / CoolCity Thermal Engine (${activeSnapshot})`,
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
  } else {
    const reason = !apiKey || apiKey.trim() === ""
      ? "GEMINI_API_KEY is not configured in environment"
      : "Mock API key in use ('mock-*')";
    console.log(`[Gemini Agent] Falling back: ${reason}`);
  }

  if (useGemini) {
    console.log(`[Gemini Agent] Gemini client initialization started`);
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: apiKey!.trim() });

      const prompt = `You are the CoolCity AI Heat-Relief Deployment Planner for the City of Phoenix.
Snapshot Context: ${activeSnapshot}
Goal: ${goal}
Available Inventory: ${JSON.stringify(inventory)}
Requested Target Zones: ${zoneIds && zoneIds.length > 0 ? zoneIds.join(", ") : "All Census Tracts"}

Utilize your registered tools to query heat data, risk scores, and compute deterministic allocations.
Ensure allocations strictly comply with municipal inventory limits.`;

      console.log(`[Gemini Agent] Request attempt started (model: gemini-3.6-flash, snapshot: ${activeSnapshot})`);

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [prompt],
        config: {
          tools: track6ToolDeclarations,
        },
      });

      console.log(`[Gemini Agent] Gemini response received`);

      // Inspect response candidates and function calls safely
      const candidate = response?.candidates?.[0];
      if (candidate?.finishReason) {
        console.log(`[Gemini Agent] Candidate finishReason: ${candidate.finishReason}`);
      }

      // Check for tool / function calls requested by model
      const candidateParts = (candidate?.content?.parts || []) as Array<Record<string, unknown>>;
      const rawFunctionCalls = (response as unknown as { functionCalls?: Array<{ name?: string }> })?.functionCalls;
      const functionCalls: Array<{ name?: string }> =
        rawFunctionCalls ||
        candidateParts
          .map((p) => p.functionCall as { name?: string } | undefined)
          .filter((fc): fc is { name?: string } => Boolean(fc));

      if (functionCalls && functionCalls.length > 0) {
        const toolNames = functionCalls
          .map((fc) => fc.name || "unnamed_tool")
          .join(", ");
        console.log(`[Gemini Agent] Tool call(s) requested by Gemini: [${toolNames}]`);
        console.log(`[Gemini Agent] Note: Multi-turn tool execution loop is not configured in current route. Direct text response required or deterministic fallback used.`);
      }

      // Safe text extraction
      let responseText: string | undefined;
      try {
        responseText = response?.text;
      } catch {
        console.log(`[Gemini Agent] Direct response.text getter threw or was unavailable for current candidate.`);
      }

      if (responseText && responseText.trim() !== "") {
        console.log(`[Gemini Agent] Text response present (length: ${responseText.length} chars)`);

        const finalPlan: AgentPlanOutput = {
          summary: `CoolCity Heat-Relief Deployment Plan (${activeSnapshot}): ${goal}. ${responseText}`,
          priorityZones: priorityZoneGeoids,
          allocations: deterministicResult.allocations,
          remainingInventory: deterministicResult.remainingInventory,
          evidence: evidenceItems,
          warnings: deterministicResult.warnings || [],
        };

        const validated = AgentPlanOutputSchema.safeParse(finalPlan);
        if (validated.success) {
          console.log(`[Gemini Agent] Response schema validation succeeded. Returning Gemini plan.`);
          return validated.data;
        } else {
          const issues = validated.error.issues.map((i) => i.message).join("; ");
          console.log(`[Gemini Agent] Falling back: Response schema validation failed: ${issues}`);
        }
      } else {
        if (functionCalls && functionCalls.length > 0) {
          console.log(`[Gemini Agent] Falling back: Gemini returned tool call(s) instead of text response, and multi-turn execution loop is not implemented.`);
        } else {
          console.log(`[Gemini Agent] Falling back: Gemini returned an empty or missing text response.`);
        }
      }
    } catch (err: unknown) {
      const errorObj = (err && typeof err === "object" ? err : {}) as Record<string, unknown>;
      const errName = typeof errorObj.name === "string" ? errorObj.name : "Error";
      const errMessage = err instanceof Error ? err.message : String(err);

      // Sanitize API key if present in error message string
      const sanitizedMessage = apiKey ? errMessage.replace(new RegExp(apiKey.trim(), "g"), "[REDACTED]") : errMessage;
      const statusCode = errorObj.status || errorObj.statusCode || errorObj.code || "N/A";
      const errorType = errorObj.constructor?.name || typeof err;

      console.error(`[Gemini Agent] Gemini SDK request error:`);
      console.error(`  - Name: ${errName}`);
      console.error(`  - Category/Type: ${errorType}`);
      console.error(`  - Status/Code: ${statusCode}`);
      console.error(`  - Safe Message: ${sanitizedMessage}`);

      console.log(`[Gemini Agent] Falling back: Gemini API request threw exception (${errName}: ${sanitizedMessage})`);
    }
  }

  // 4. Deterministic Fallback Execution
  const fallbackSummary = `CoolCity Heat-Relief Deployment Plan (Deterministic Mode - ${activeSnapshot}): ${goal}. Automatically prioritized ${priorityZoneGeoids.length} Census Tracts based on Track 7 authoritative riskScores.`;

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
