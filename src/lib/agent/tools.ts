import { getZones } from "../zones/zone-service";
import { getAllZoneRisks } from "../risk/risk-service";
import { allocate } from "../allocation/allocator";
import { ToolExecutionError } from "./errors";
import { ResourceInventory } from "../../types/resource";

export const track6ToolDeclarations: Array<Record<string, unknown>> = [
  {
    functionDeclarations: [
      {
        name: "get_zone_heat_data",
        description: "Retrieve heat intensity and temperature metrics for requested Census Tract GEOIDs.",
        parameters: {
          type: "OBJECT",
          properties: {
            zoneIds: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Optional list of Census Tract GEOIDs to filter.",
            },
          },
        },
      },
      {
        name: "get_historical_heat_metrics",
        description: "Retrieve historical baseline heat deviation metrics for Census Tract GEOIDs.",
        parameters: {
          type: "OBJECT",
          properties: {
            zoneIds: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Optional list of Census Tract GEOIDs.",
            },
          },
        },
      },
      {
        name: "get_zone_vulnerability",
        description: "Retrieve demographic vulnerability metrics for Census Tract GEOIDs.",
        parameters: {
          type: "OBJECT",
          properties: {
            zoneIds: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Optional list of Census Tract GEOIDs.",
            },
          },
        },
      },
      {
        name: "get_zone_risk_scores",
        description: "Retrieve authoritative Track 7 composite riskScores and status for Census Tract GEOIDs.",
        parameters: {
          type: "OBJECT",
          properties: {
            zoneIds: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Optional list of Census Tract GEOIDs.",
            },
          },
        },
      },
      {
        name: "get_resource_inventory",
        description: "Query authoritative available municipal cooling resource inventory.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "rank_priority_zones",
        description: "Rank Census Tracts in priority order descending by Track 7 riskScore.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: {
              type: "NUMBER",
              description: "Maximum number of top zones to return.",
            },
          },
        },
      },
      {
        name: "allocate_resources",
        description: "Execute deterministic mathematical resource allocation engine against authoritative inventory.",
        parameters: {
          type: "OBJECT",
          properties: {
            mobileCoolingUnits: { type: "NUMBER" },
            waterStations: { type: "NUMBER" },
            outreachTeams: { type: "NUMBER" },
            zoneIds: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
        },
      },
    ],
  },
];

export async function executeTrack6Tool(
  toolName: string,
  args: Record<string, unknown>,
  context: { authoritativeInventory: ResourceInventory; requestedZoneIds?: string[] }
): Promise<{ output: Record<string, unknown>; record: { toolName: string; args: Record<string, unknown> } }> {
  try {
    let output: Record<string, unknown>;

    const extractZoneIds = (): string[] | undefined => {
      const raw = args.zoneIds || context.requestedZoneIds;
      if (Array.isArray(raw)) {
        return raw.filter((id): id is string => typeof id === "string" && id.trim() !== "");
      }
      return undefined;
    };

    switch (toolName) {
      case "get_zone_heat_data": {
        const targetIds = extractZoneIds();
        const allZones = await getZones();
        const filtered = targetIds
          ? allZones.filter((z) => targetIds.includes(z.geoid) || targetIds.includes(z.id) || targetIds.includes(z.code))
          : allZones;

        const metrics = filtered.map((z) => ({
          zoneId: z.geoid,
          avgTemperatureC: z.avgTemperature,
          affectedPopulation: z.affectedPopulation,
        }));
        output = { success: true, heatMetrics: metrics };
        break;
      }

      case "get_historical_heat_metrics": {
        output = {
          success: true,
          available: false,
          message: "Verified historical baseline heat metrics are not provided in current Track 7 dataset snapshot.",
        };
        break;
      }

      case "get_zone_vulnerability": {
        output = {
          success: true,
          available: false,
          message: "Detailed demographic vulnerability sub-components are not stored separately in the current Track 7 canonical dataset record.",
        };
        break;
      }

      case "get_zone_risk_scores": {
        const targetIds = extractZoneIds();
        const allRisks = await getAllZoneRisks();
        const filtered = targetIds
          ? allRisks.filter((r) => targetIds.includes(r.zoneId))
          : allRisks;
        output = { success: true, risks: filtered };
        break;
      }

      case "get_resource_inventory": {
        output = {
          success: true,
          authoritativeInventory: context.authoritativeInventory,
        };
        break;
      }

      case "rank_priority_zones": {
        const allRisks = await getAllZoneRisks();
        const limit = typeof args.limit === "number" ? Math.max(1, args.limit) : allRisks.length;
        const ranked = allRisks.slice(0, limit);
        output = { success: true, rankedZones: ranked };
        break;
      }

      case "allocate_resources": {
        const allRisks = await getAllZoneRisks();
        const targetIds = extractZoneIds();
        const allocInput = {
          inventory: context.authoritativeInventory,
          zones: allRisks,
          validZoneIds: targetIds,
        };
        const result = allocate(allocInput);
        output = { success: true, result };
        break;
      }

      default:
        throw new ToolExecutionError(`Unrecognized tool name requested by agent: '${toolName}'`);
    }

    return {
      output,
      record: { toolName, args },
    };
  } catch (err: unknown) {
    if (err instanceof ToolExecutionError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new ToolExecutionError(`Error executing tool '${toolName}': ${message}`);
  }
}
