/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allocate } from "../src/lib/allocation/allocator";
import { AllocationValidationError } from "../src/lib/allocation/errors";
import { ZoneRiskItem, ResourceInventory } from "../src/lib/allocation/types";

const mockZoneHighRisk: ZoneRiskItem = {
  zoneId: "PHX-Z01",
  totalScore: 85.0,
  band: "critical",
  components: {
    heatExposure: 88.0,
    persistence: 82.0,
    vulnerability: 85.0,
    coolingAccessGap: 75.0,
  },
};

const mockZoneModerateRisk: ZoneRiskItem = {
  zoneId: "PHX-Z02",
  totalScore: 55.0,
  band: "moderate",
  components: {
    heatExposure: 58.0,
    persistence: 52.0,
    vulnerability: 50.0,
  },
};

describe("Deterministic Resource Allocation Engine - Comprehensive Test Suite", () => {
  // TEST 1: 2 mobile units available. Expected total mobile allocation <= 2.
  it("TEST 1: respects mobile cooling units capacity bound (<= 2)", () => {
    const input = {
      inventory: { mobileCoolingUnits: 2, waterStations: 0, outreachTeams: 0 },
      zones: [mockZoneHighRisk, mockZoneModerateRisk],
    };

    const output = allocate(input);

    const totalMobileAllocated = output.allocations
      .filter((a) => a.resourceType === "mobile_cooling_unit")
      .reduce((sum, a) => sum + a.quantity, 0);

    assert.ok(
      totalMobileAllocated <= 2,
      `Total mobile cooling units allocated (${totalMobileAllocated}) must be <= 2`
    );
    assert.equal(output.remainingInventory.mobileCoolingUnits, 2 - totalMobileAllocated);
  });

  // TEST 2: 3 water stations available. Expected total water allocation <= 3.
  it("TEST 2: respects water stations capacity bound (<= 3)", () => {
    const input = {
      inventory: { mobileCoolingUnits: 0, waterStations: 3, outreachTeams: 0 },
      zones: [mockZoneHighRisk, mockZoneModerateRisk],
    };

    const output = allocate(input);

    const totalWaterAllocated = output.allocations
      .filter((a) => a.resourceType === "water_station")
      .reduce((sum, a) => sum + a.quantity, 0);

    assert.ok(
      totalWaterAllocated <= 3,
      `Total water stations allocated (${totalWaterAllocated}) must be <= 3`
    );
    assert.equal(output.remainingInventory.waterStations, 3 - totalWaterAllocated);
  });

  // TEST 3: 1 outreach team. Expected total outreach allocation <= 1.
  it("TEST 3: respects outreach teams capacity bound (<= 1)", () => {
    const input = {
      inventory: { mobileCoolingUnits: 0, waterStations: 0, outreachTeams: 1 },
      zones: [mockZoneHighRisk, mockZoneModerateRisk],
    };

    const output = allocate(input);

    const totalOutreachAllocated = output.allocations
      .filter((a) => a.resourceType === "outreach_team")
      .reduce((sum, a) => sum + a.quantity, 0);

    assert.ok(
      totalOutreachAllocated <= 1,
      `Total outreach teams allocated (${totalOutreachAllocated}) must be <= 1`
    );
    assert.equal(output.remainingInventory.outreachTeams, 1 - totalOutreachAllocated);
  });

  // TEST 4: All inventory zero. Expected zero allocations.
  it("TEST 4: returns zero allocations when all inventory is zero", () => {
    const input = {
      inventory: { mobileCoolingUnits: 0, waterStations: 0, outreachTeams: 0 },
      zones: [mockZoneHighRisk, mockZoneModerateRisk],
    };

    const output = allocate(input);

    assert.equal(output.allocations.length, 0);
    assert.equal(output.remainingInventory.mobileCoolingUnits, 0);
    assert.equal(output.remainingInventory.waterStations, 0);
    assert.equal(output.remainingInventory.outreachTeams, 0);
  });

  // TEST 5: Invalid zone. Expected validation failure or no allocation to invalid zone.
  it("TEST 5: handles invalid zone IDs by throwing validation error or ignoring invalid zone", () => {
    // 5a. Invalid empty string zoneId -> validation error
    const invalidInput = {
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 2 },
      zones: [
        {
          zoneId: "",
          totalScore: 50,
          band: "moderate" as const,
          components: { heatExposure: 50, persistence: 50, vulnerability: 50 },
        },
      ],
    };

    assert.throws(
      () => allocate(invalidInput),
      (err: any) => err instanceof AllocationValidationError
    );

    // 5b. validZoneIds filter rejecting unlisted zone ID
    const inputWithFilter = {
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 2 },
      zones: [mockZoneHighRisk],
      validZoneIds: ["OTHER-ZONE-ONLY"],
    };

    const output = allocate(inputWithFilter);
    assert.equal(output.allocations.length, 0);
  });

  // TEST 6: Negative inventory. Expected validation error.
  it("TEST 6: throws AllocationValidationError when inventory is negative", () => {
    const input = {
      inventory: { mobileCoolingUnits: -1, waterStations: 5, outreachTeams: 2 },
      zones: [mockZoneHighRisk],
    };

    assert.throws(
      () => allocate(input),
      (err: any) => err instanceof AllocationValidationError
    );
  });

  // TEST 7: Fractional inventory such as 1.5. Expected validation error.
  it("TEST 7: throws AllocationValidationError when inventory contains fractional values (e.g. 1.5)", () => {
    const input = {
      inventory: { mobileCoolingUnits: 1.5, waterStations: 3, outreachTeams: 1 },
      zones: [mockZoneHighRisk],
    };

    assert.throws(
      () => allocate(input as any),
      (err: any) => err instanceof AllocationValidationError
    );
  });

  // TEST 8: Two zones with same risk score. Expected deterministic zoneId tie-break.
  it("TEST 8: breaks ties deterministically using zoneId ascending when risk scores are identical", () => {
    const zoneB: ZoneRiskItem = {
      zoneId: "PHX-Z-B",
      totalScore: 80.0,
      band: "high",
      components: { heatExposure: 80, persistence: 80, vulnerability: 80 },
    };
    const zoneA: ZoneRiskItem = {
      zoneId: "PHX-Z-A",
      totalScore: 80.0,
      band: "high",
      components: { heatExposure: 80, persistence: 80, vulnerability: 80 },
    };

    const input = {
      inventory: { mobileCoolingUnits: 1, waterStations: 0, outreachTeams: 0 },
      zones: [zoneB, zoneA], // Array passed in reverse order [B, A]
    };

    const output = allocate(input);

    assert.equal(output.allocations.length, 1);
    assert.equal(
      output.allocations[0].zoneId,
      "PHX-Z-A",
      "PHX-Z-A should win tie-break over PHX-Z-B alphabetically"
    );
  });

  // TEST 9: Empty zone list. Expected no allocations.
  it("TEST 9: returns empty allocations array when zone list is empty", () => {
    const input = {
      inventory: { mobileCoolingUnits: 5, waterStations: 10, outreachTeams: 3 },
      zones: [],
    };

    const output = allocate(input);

    assert.equal(output.allocations.length, 0);
    assert.equal(output.remainingInventory.mobileCoolingUnits, 5);
    assert.equal(output.remainingInventory.waterStations, 10);
    assert.equal(output.remainingInventory.outreachTeams, 3);
  });

  // TEST 10: More requested resources than inventory. Expected inventory constraint to win.
  it("TEST 10: enforces municipal inventory constraints when requested resources exceed available stock", () => {
    const requestedResources: ResourceInventory = {
      mobileCoolingUnits: 100, // Wants 100
      waterStations: 50,
      outreachTeams: 20,
    };

    const input = {
      inventory: { mobileCoolingUnits: 2, waterStations: 3, outreachTeams: 1 }, // Only has 2, 3, 1
      zones: [mockZoneHighRisk, mockZoneModerateRisk],
      requestedResources,
    };

    const output = allocate(input);

    const allocatedMobile = output.allocations
      .filter((a) => a.resourceType === "mobile_cooling_unit")
      .reduce((sum, a) => sum + a.quantity, 0);

    const allocatedWater = output.allocations
      .filter((a) => a.resourceType === "water_station")
      .reduce((sum, a) => sum + a.quantity, 0);

    const allocatedOutreach = output.allocations
      .filter((a) => a.resourceType === "outreach_team")
      .reduce((sum, a) => sum + a.quantity, 0);

    assert.equal(allocatedMobile, 2, "Mobile allocation must be constrained to available stock (2)");
    assert.equal(allocatedWater, 3, "Water allocation must be constrained to available stock (3)");
    assert.equal(allocatedOutreach, 1, "Outreach allocation must be constrained to available stock (1)");
    assert.ok(output.warnings.length > 0, "Warnings should report requested over-allocation");
  });

  // TEST 11: Repeat identical input multiple times. Expected identical output.
  it("TEST 11: produces 100% deterministic, identical output when run repeatedly on identical input", () => {
    const input = {
      inventory: { mobileCoolingUnits: 3, waterStations: 5, outreachTeams: 2 },
      zones: [mockZoneModerateRisk, mockZoneHighRisk],
    };

    const run1 = allocate(input);
    const run2 = allocate(input);
    const run3 = allocate(input);

    assert.deepEqual(run1, run2, "Run 1 and Run 2 outputs must be strictly deep equal");
    assert.deepEqual(run2, run3, "Run 2 and Run 3 outputs must be strictly deep equal");
  });
});
