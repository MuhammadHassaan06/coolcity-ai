import { z } from "zod";
import { ResourceInventorySchema, ResourceAllocationSchema } from "../validation/analytics";

export const AgentPlanRequestSchema = z.object({
  goal: z.string().min(1, "Goal description must not be empty"),
  inventory: ResourceInventorySchema,
  zoneIds: z.array(z.string().min(1)).optional(),
  snapshotId: z.enum(["2026-08-30-1400", "2024-07-15-1400"]).optional().default("2026-08-30-1400"),
});

export const AgentPlanOutputSchema = z.object({
  summary: z.string(),
  priorityZones: z.array(z.string()),
  allocations: z.array(ResourceAllocationSchema),
  remainingInventory: ResourceInventorySchema,
  evidence: z.array(
    z.object({
      zoneId: z.string(),
      type: z.string(),
      metric: z.string(),
      value: z.union([z.string(), z.number()]),
      source: z.string(),
    })
  ),
  warnings: z.array(z.string()),
});

export type AgentPlanRequest = z.input<typeof AgentPlanRequestSchema>;
export type AgentPlanOutput = z.infer<typeof AgentPlanOutputSchema>;
