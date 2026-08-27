import { Zone } from "./zone";
import { HeatMetrics } from "./heat";
import { Vulnerability } from "./vulnerability";
import { ZoneRisk } from "./risk";
import { ResourceInventory } from "./resource";
import { ResourceAllocation } from "./allocation";

/**
 * Input Context Contract for AI Optimization Agent
 */
export interface AgentRecommendationInput {
  zones: Zone[];
  heatMetrics: Record<string, HeatMetrics>;
  vulnerabilities: Record<string, Vulnerability>;
  risks: Record<string, ZoneRisk>;
  inventory: ResourceInventory;
}

/**
 * Output Recommendation Contract from AI Optimization Agent
 */
export interface AgentRecommendation {
  summary: string;
  allocations: ResourceAllocation[];
  recommendedActions: string[];
  timestamp: string;
}
