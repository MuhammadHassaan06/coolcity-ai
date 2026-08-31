import { AgentPlanRequest, AgentPlanOutput, AgentPlanRequestSchema, AgentPlanOutputSchema } from "./schemas";
import { getZones } from "../zones/zone-service";
import { getAllZoneRisks } from "../risk/risk-service";
import { allocate } from "../allocation/allocator";
import { track6ToolDeclarations, executeTrack6Tool } from "./tools";
import { AgentValidationError } from "./errors";

const APPROVED_TOOL_NAMES = new Set([
  "get_zone_heat_data",
  "get_historical_heat_metrics",
  "get_zone_vulnerability",
  "get_zone_risk_scores",
  "get_resource_inventory",
  "rank_priority_zones",
  "allocate_resources",
]);

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

      const MAX_TURNS = 5;
      const contents: unknown[] = [prompt];

      for (let turn = 1; turn <= MAX_TURNS; turn++) {
        console.log(`[Gemini Agent] Turn ${turn} request attempt started (model: gemini-3.6-flash, snapshot: ${activeSnapshot})`);

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: contents as unknown as Array<string | Record<string, unknown>>,
          config: {
            tools: track6ToolDeclarations,
          },
        });

        console.log(`[Gemini Agent] Turn ${turn} Gemini response received`);

        const candidate = response?.candidates?.[0];
        if (candidate?.finishReason) {
          console.log(`[Gemini Agent] Candidate finishReason: ${candidate.finishReason}`);
        }

        // Check for tool / function calls requested by model
        const candidateParts = (candidate?.content?.parts || []) as Array<Record<string, unknown>>;
        const rawFunctionCalls = (response as unknown as { functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> })?.functionCalls;

        const functionCalls: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> =
          rawFunctionCalls ||
          candidateParts
            .map((p) => (p.functionCall ? (p.functionCall as { id?: string; name?: string; args?: Record<string, unknown> }) : undefined))
            .filter((fc): fc is { id?: string; name?: string; args?: Record<string, unknown> } => Boolean(fc));

        if (functionCalls && functionCalls.length > 0) {
          const toolNames = functionCalls.map((fc) => fc.name || "unnamed_tool").join(", ");
          console.log(`[Gemini Agent] Turn ${turn} tool call(s) requested: [${toolNames}]`);

          // Validate all requested tool names against allowlist
          let unapprovedFound = false;
          for (const fc of functionCalls) {
            if (!fc.name || !APPROVED_TOOL_NAMES.has(fc.name)) {
              console.log(`[Gemini Agent] Falling back: Model requested unapproved or invalid tool name '${fc.name}'`);
              unapprovedFound = true;
              break;
            }
          }
          if (unapprovedFound) {
            break;
          }

          // Append model turn to conversation history
          if (candidate?.content) {
            contents.push(candidate.content);
          } else {
            contents.push({ role: "model", parts: candidateParts });
          }

          // Execute tools locally and format function responses
          const functionResponseParts: Array<{ functionResponse: { id?: string; name: string; response: Record<string, unknown> } }> = [];
          let toolExecFailed = false;

          for (const fc of functionCalls) {
            const toolName = fc.name!;
            const toolArgs = fc.args || {};

            try {
              console.log(`[Gemini Agent] Turn ${turn} executing tool: ${toolName}`);
              const { output } = await executeTrack6Tool(toolName, toolArgs, {
                authoritativeInventory: inventory,
                requestedZoneIds: zoneIds,
              });

              console.log(`[Gemini Agent] Turn ${turn} tool executed successfully: ${toolName}`);

              functionResponseParts.push({
                functionResponse: {
                  id: fc.id, // Preserve exact function call ID returned by Gemini when present
                  name: toolName,
                  response: output,
                },
              });
            } catch (toolErr: unknown) {
              const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
              console.log(`[Gemini Agent] Falling back: Tool execution failed for '${toolName}': ${msg}`);
              toolExecFailed = true;
              break;
            }
          }

          if (toolExecFailed) {
            break;
          }

          // Append user function response turn to conversation history
          contents.push({
            role: "user",
            parts: functionResponseParts,
          });

          console.log(`[Gemini Agent] Turn ${turn} function response(s) appended to conversation history`);

          if (turn === MAX_TURNS) {
            console.log(`[Gemini Agent] Falling back: Reached max turn limit (${MAX_TURNS}) while model is still requesting tool calls.`);
            break;
          }

          continue;
        }

        // No tool calls requested: final model text response
        let responseText: string | undefined;
        try {
          responseText = response?.text;
        } catch {
          console.log(`[Gemini Agent] Direct response.text getter threw or was unavailable.`);
        }

        if (responseText && responseText.trim() !== "") {
          console.log(`[Gemini Agent] Final Gemini text response received (length: ${responseText.length} chars)`);

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
            console.log(`[Gemini Agent] Response schema validation succeeded. Returning Gemini-assisted plan.`);
            return validated.data;
          } else {
            const issues = validated.error.issues.map((i) => i.message).join("; ");
            console.log(`[Gemini Agent] Falling back: Response schema validation failed: ${issues}`);
            break;
          }
        } else {
          console.log(`[Gemini Agent] Falling back: Gemini returned an empty or missing text response.`);
          break;
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
