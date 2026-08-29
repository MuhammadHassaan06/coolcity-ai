import { AllocationInput, ZoneRiskItem } from "./types";
import { AllocationResult, ResourceAllocation, ResourceType } from "../../types/allocation";
import { AllocationValidationError } from "./errors";

export function allocate(input: AllocationInput): AllocationResult {
  const { inventory, zones, validZoneIds, requestedResources } = input;

  // 1. Validate inventory inputs
  if (!inventory) {
    throw new AllocationValidationError("Resource inventory is required");
  }

  const { mobileCoolingUnits, waterStations, outreachTeams } = inventory;

  const validateCount = (name: string, val: number) => {
    if (typeof val !== "number" || isNaN(val)) {
      throw new AllocationValidationError(`${name} must be a number`);
    }
    if (!Number.isInteger(val)) {
      throw new AllocationValidationError(`${name} must be an integer, received: ${val}`);
    }
    if (val < 0) {
      throw new AllocationValidationError(`${name} cannot be negative, received: ${val}`);
    }
  };

  validateCount("mobileCoolingUnits", mobileCoolingUnits);
  validateCount("waterStations", waterStations);
  validateCount("outreachTeams", outreachTeams);

  // 2. Validate zone records & filter valid IDs
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (!Array.isArray(zones)) {
    throw new AllocationValidationError("Zones must be an array");
  }

  const seenZoneIds = new Set<string>();
  const validZones: ZoneRiskItem[] = [];

  for (const z of zones) {
    if (!z || typeof z.zoneId !== "string" || z.zoneId.trim() === "") {
      throw new AllocationValidationError("Zone record must contain a non-empty string zoneId");
    }
    const cleanId = z.zoneId.trim();

    if (seenZoneIds.has(cleanId)) {
      continue; // Skip duplicate GEOIDs
    }
    seenZoneIds.add(cleanId);

    if (validZoneIds && validZoneIds.length > 0 && !validZoneIds.includes(cleanId)) {
      continue; // Filtered out by requested validZoneIds
    }

    validZones.push({ ...z, zoneId: cleanId });
  }

  // 3. Zero inventory handling
  if (mobileCoolingUnits === 0 && waterStations === 0 && outreachTeams === 0) {
    warnings.push("Zero municipal resource inventory available for deployment.");
    return {
      success: true,
      allocations: [],
      reasons: ["Zero resource inventory available"],
      remainingInventory: { mobileCoolingUnits: 0, waterStations: 0, outreachTeams: 0 },
      warnings,
    };
  }

  // 4. Handle requested over-allocation warnings
  if (requestedResources) {
    if (
      (requestedResources.mobileCoolingUnits ?? 0) > mobileCoolingUnits ||
      (requestedResources.waterStations ?? 0) > waterStations ||
      (requestedResources.outreachTeams ?? 0) > outreachTeams
    ) {
      warnings.push("Requested resources exceeded available stock; constrained to municipal inventory limits.");
    }
  }

  // 5. Sort zones by Track 7 riskScore descending; tie-break by zoneId ascending
  validZones.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.zoneId.localeCompare(b.zoneId);
  });

  // 6. Perform deterministic allocation engine loop
  let availMobile = mobileCoolingUnits;
  let availWater = waterStations;
  let availOutreach = outreachTeams;

  const allocations: ResourceAllocation[] = [];

  // Helper to add allocation
  const addAlloc = (zoneId: string, resourceType: ResourceType, qty: number, reason: string) => {
    allocations.push({
      zoneId,
      resourceType,
      quantity: qty,
      reasons: [reason],
    });
  };

  for (const zone of validZones) {
    const isCriticalOrHigh = zone.band === "critical" || zone.band === "high" || zone.totalScore >= 50;

    // Allocate mobile cooling unit to highest risk zones first
    if (availMobile > 0 && isCriticalOrHigh) {
      addAlloc(zone.zoneId, "mobile_cooling_unit", 1, `Assigned mobile cooling unit to high-risk zone (riskScore: ${zone.totalScore})`);
      availMobile--;
    }

    // Allocate water stations
    if (availWater > 0) {
      addAlloc(zone.zoneId, "water_station", 1, `Assigned water station for heat mitigation (riskScore: ${zone.totalScore})`);
      availWater--;
    }

    // Allocate outreach teams
    if (availOutreach > 0 && isCriticalOrHigh) {
      addAlloc(zone.zoneId, "outreach_team", 1, `Assigned emergency outreach team to vulnerable population (riskScore: ${zone.totalScore})`);
      availOutreach--;
    }
  }

  // If resources still remain, distribute remaining water/mobile to other priority zones
  if (availMobile > 0 || availWater > 0 || availOutreach > 0) {
    for (const zone of validZones) {
      if (availMobile > 0) {
        addAlloc(zone.zoneId, "mobile_cooling_unit", 1, `Assigned remaining mobile cooling unit to zone ${zone.zoneId}`);
        availMobile--;
      }
      if (availWater > 0) {
        addAlloc(zone.zoneId, "water_station", 1, `Assigned remaining water station to zone ${zone.zoneId}`);
        availWater--;
      }
      if (availOutreach > 0) {
        addAlloc(zone.zoneId, "outreach_team", 1, `Assigned remaining outreach team to zone ${zone.zoneId}`);
        availOutreach--;
      }
    }
  }

  reasons.push(`Allocated resources across ${validZones.length} Census Tracts based on Track 7 risk scores.`);

  return {
    success: true,
    allocations,
    reasons,
    remainingInventory: {
      mobileCoolingUnits: availMobile,
      waterStations: availWater,
      outreachTeams: availOutreach,
    },
    warnings,
  };
}
