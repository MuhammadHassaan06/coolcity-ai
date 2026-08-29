import { ResourceInventory } from "../../types/resource";

let currentInventory: ResourceInventory = {
  mobileCoolingUnits: 5,
  waterStations: 12,
  outreachTeams: 4,
};

export async function getSystemResourceInventory(): Promise<ResourceInventory> {
  return { ...currentInventory };
}

export async function updateResourceInventory(
  partial: Partial<ResourceInventory>
): Promise<ResourceInventory> {
  currentInventory = {
    ...currentInventory,
    ...partial,
  };
  return { ...currentInventory };
}

export function resetResourceInventory(): void {
  currentInventory = {
    mobileCoolingUnits: 5,
    waterStations: 12,
    outreachTeams: 4,
  };
}
