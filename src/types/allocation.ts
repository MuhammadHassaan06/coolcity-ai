import { ResourceInventory } from "./resource";

/**
 * Resource Allocation Decision Contract
 */
export type ResourceType =
  | "mobile_cooling_unit"
  | "water_station"
  | "outreach_team";

export interface RequestedAllocation {
  zoneId: string;
  resourceType: ResourceType;
  requestedQuantity: number;
  reason?: string;
}

export interface ResourceAllocationRequest {
  requestedAllocations: RequestedAllocation[];
}

export interface AllocatedResourceItem {
  zoneId: string;
  resourceType: ResourceType;
  requestedQuantity: number;
  allocatedQuantity: number;
  wasCapped: boolean;
  wasRejected: boolean;
}

export interface AllocationResult {
  success: boolean;
  allocations: AllocatedResourceItem[];
  reasons: string[];
  remainingInventory: ResourceInventory;
}

export interface ResourceAllocation {
  resourceType: ResourceType;
  quantity: number;
  zoneId: string;
  reasons: string[];
}
