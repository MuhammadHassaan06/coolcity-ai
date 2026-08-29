import { CanonicalTractRecord } from "./zone";
import { ResourceInventory } from "./resource";
import { ResourceAllocation } from "./allocation";

/**
 * Input Context Contract for AI Optimization Agent
 */
export interface AgentRecommendationInput {
  zones: CanonicalTractRecord[];
  inventory: ResourceInventory;
  zoneIds?: string[];
}

/**
 * Output Recommendation Contract from AI Optimization Agent
 */
export interface AgentRecommendation {
  summary: string;
  priorityZones: string[];
  allocations: ResourceAllocation[];
  remainingInventory: ResourceInventory;
  evidence: Array<{
    zoneId: string;
    type: string;
    metric: string;
    value: string | number;
    source: string;
  }>;
  warnings: string[];
}

export type AgentPlanResponse = AgentRecommendation & {
  metadata?: {
    mode?: "agent" | "deterministic-fallback";
    timestamp?: string;
  };
};
