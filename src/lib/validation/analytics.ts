import { z } from "zod";

export const ZoneSchema = z.object({
  id: z.string().min(1, "Zone ID must be non-empty"),
  name: z.string().min(1),
  geoid: z.string().optional(),
  geometry: z.record(z.unknown()).optional(),
});

export const HeatMetricsSchema = z.object({
  zoneId: z.string().min(1),
  meanTemp: z.number().nullable(),
  maxTemp: z.number().nullable(),
  temperatureUnit: z.enum(["C", "F"]),
  persistenceScore: z.number().nullable(),
  exceedanceScore: z.number().nullable(),
  historicalDeviation: z.number().nullable(),
  dataTimestamp: z.string(),
});

export const VulnerabilitySchema = z.object({
  zoneId: z.string().min(1),
  povertyRate: z.number().nullable(),
  age65PlusRate: z.number().nullable(),
  noVehicleRate: z.number().nullable(),
  compositeScore: z.number().nullable(),
  sourceYear: z.number().nullable(),
});

export const ZoneRiskSchema = z.object({
  zoneId: z.string().min(1),
  totalScore: z.number(),
  band: z.enum(["low", "moderate", "high", "critical"]),
  components: z
    .object({
      heatExposure: z.number(),
      persistence: z.number().optional(),
      vulnerability: z.number(),
      coolingAccessGap: z.number().optional(),
    })
    .optional(),
});

export const ResourceInventorySchema = z.object({
  mobileCoolingUnits: z
    .number()
    .int("Inventory quantities must be integers")
    .min(0, "Inventory quantities cannot be negative"),
  waterStations: z
    .number()
    .int("Inventory quantities must be integers")
    .min(0, "Inventory quantities cannot be negative"),
  outreachTeams: z
    .number()
    .int("Inventory quantities must be integers")
    .min(0, "Inventory quantities cannot be negative"),
});

export const ResourceAllocationSchema = z.object({
  resourceType: z.enum([
    "mobile_cooling_unit",
    "water_station",
    "outreach_team",
  ]),
  quantity: z.number().int().min(0),
  zoneId: z.string().min(1),
  reasons: z.array(z.string()),
});
