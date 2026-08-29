import { ResourceInventory } from "./resource";

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
  quantity: number;
  allocatedQuantity?: number;
  requestedQuantity?: number;
  wasCapped?: boolean;
  wasRejected?: boolean;
  reasons: string[];
}

export type ResourceAllocation = AllocatedResourceItem;

export interface AllocationResult {
  success: boolean;
  allocations: AllocatedResourceItem[];
  reasons: string[];
  remainingInventory: ResourceInventory;
  warnings: string[];
}
