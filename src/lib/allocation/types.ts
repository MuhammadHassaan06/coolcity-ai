import { ResourceInventory } from "../../types/resource";
import { RiskBand, RiskComponents } from "../../types/risk";

export type { ResourceInventory };

export interface ZoneRiskItem {
  zoneId: string;
  totalScore: number;
  band: RiskBand;
  components?: RiskComponents;
}

export interface AllocationInput {
  inventory: ResourceInventory;
  zones: ZoneRiskItem[];
  validZoneIds?: string[];
  requestedResources?: Partial<ResourceInventory>;
}
