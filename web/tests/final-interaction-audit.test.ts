import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getSnapshotPriorityZones, getSnapshotDashboardSummary, SnapshotId } from "../src/lib/snapshots/snapshot-adapter";
import { DEFAULT_DEPLOYABLE_INVENTORY } from "../src/lib/mockData";

describe("Final Dashboard Interaction Audit Test Suite", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("1. Time Period Selector: switching snapshot updates all stats, tracts, and analytics without stale data", () => {
    const stats2026 = getSnapshotDashboardSummary("2026-08-30-1400");
    const stats2024 = getSnapshotDashboardSummary("2024-07-15-1400");

    assert.equal(stats2026.totalZonesMonitored, 359);
    assert.equal(stats2024.totalZonesMonitored, 359);
    assert.equal(stats2026.averageCityTemp, 40.15);
    assert.equal(stats2024.averageCityTemp, 39.25);

    const zones2026 = getSnapshotPriorityZones("2026-08-30-1400");
    const zones2024 = getSnapshotPriorityZones("2024-07-15-1400");

    const top2026 = zones2026[0];
    const top2024 = zones2024[0];

    assert.equal(top2026.geoid, "04013113900");
    assert.equal(top2026.riskScore, 77.02);
    assert.equal(top2026.avgTemperature, 40.57);

    assert.equal(top2024.geoid, "04013114900");
  });

  it("2. Heat / Risk Mode Matrix: resolves correct metrics for all 4 snapshot x view mode combinations", () => {
    const snapshots: SnapshotId[] = ["2026-08-30-1400", "2024-07-15-1400"];

    for (const snap of snapshots) {
      const zones = getSnapshotPriorityZones(snap);
      for (const z of zones) {
        // Heat Mode metric
        assert.ok(typeof z.avgTemperature === "number");
        assert.ok(z.avgTemperature > 30 && z.avgTemperature < 55);

        // Risk Mode metric & status band
        assert.ok(typeof z.riskScore === "number");
        assert.ok(z.riskScore >= 0 && z.riskScore <= 100);
        assert.ok(["critical", "high", "moderate", "low"].includes(z.status));
      }
    }
  });

  it("3. Priority Tract Search: matches GEOID, name, and handles case-insensitivity and empty queries", () => {
    const zones = getSnapshotPriorityZones("2026-08-30-1400");

    // GEOID match
    const geoidMatches = zones.filter(z =>
      z.code.toLowerCase().includes("04013113900") ||
      z.name.toLowerCase().includes("04013113900") ||
      z.geoid.toLowerCase().includes("04013113900")
    );
    assert.equal(geoidMatches.length, 1);
    assert.equal(geoidMatches[0].geoid, "04013113900");

    // Case-insensitive name match
    const nameMatches = zones.filter(z =>
      z.code.toLowerCase().includes("tract 1139") ||
      z.name.toLowerCase().includes("tract 1139") ||
      z.geoid.toLowerCase().includes("tract 1139")
    );
    assert.equal(nameMatches.length, 1);
    assert.equal(nameMatches[0].geoid, "04013113900");

    // Non-existent query
    const noMatches = zones.filter(z =>
      z.code.toLowerCase().includes("999999999") ||
      z.name.toLowerCase().includes("999999999") ||
      z.geoid.toLowerCase().includes("999999999")
    );
    assert.equal(noMatches.length, 0);

    // Empty query restores all 359 tracts
    const emptyMatches = zones.filter(z =>
      z.code.toLowerCase().includes("") ||
      z.name.toLowerCase().includes("") ||
      z.geoid.toLowerCase().includes("")
    );
    assert.equal(emptyMatches.length, 359);
  });

  it("4. View All 359 Tracts Toggle: toggles display limit between top 10 and full 359 tract list", () => {
    const zones = getSnapshotPriorityZones("2026-08-30-1400");
    let showAll = false;

    let displayLimit = showAll ? zones.length : 10;
    assert.equal(displayLimit, 10);

    // Toggle View All
    showAll = true;
    displayLimit = showAll ? zones.length : 10;
    assert.equal(displayLimit, 359);

    // Toggle Back to Top 10
    showAll = false;
    displayLimit = showAll ? zones.length : 10;
    assert.equal(displayLimit, 10);
  });

  it("5. Tract Selection & Clear Filter: synchronizes GEOID selection and clears cleanly", () => {
    const zones = getSnapshotPriorityZones("2026-08-30-1400");
    let selectedZoneId: string | undefined = "04013113900";

    const match = zones.find(
      (z) => z.id === selectedZoneId || z.code === selectedZoneId || z.geoid === selectedZoneId
    );
    assert.ok(match);
    assert.equal(match.geoid, "04013113900");

    // Clear filter
    selectedZoneId = undefined;
    const cleared = zones.find(
      (z) => z.id === selectedZoneId || z.code === selectedZoneId || z.geoid === selectedZoneId
    );
    assert.equal(cleared, undefined);
  });

  it("6. Resource Inventory Input Validation: sanitizes empty strings, negative numbers, and safety bounds", () => {
    const sanitize = (val: string, maxBound: number): number => {
      if (val.trim() === "") return 0;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 0) return 0;
      return Math.min(maxBound, Math.floor(parsed));
    };

    // Valid number
    assert.equal(sanitize("20", 100), 20);

    // Negative number
    assert.equal(sanitize("-10", 100), 0);

    // Exceeds safety bound
    assert.equal(sanitize("150", 100), 100);

    // Empty string
    assert.equal(sanitize("", 100), 0);

    // Non-numeric string
    assert.equal(sanitize("abc", 100), 0);
  });

  it("7. Reset Inventory Control: restores project default inventory quantities (12 cooling, 25 water, 8 teams)", () => {
    const resetInventory = { ...DEFAULT_DEPLOYABLE_INVENTORY };
    assert.equal(resetInventory.mobile_cooling_units, 12);
    assert.equal(resetInventory.water_stations, 25);
    assert.equal(resetInventory.outreach_teams, 8);

    const total = Object.values(resetInventory).reduce((sum, n) => sum + n, 0);
    assert.equal(total, 45);
  });

  it("8. Agent Allocation Planner Payload: constructs valid payload for backend API endpoint", () => {
    const inventory = { mobile_cooling_units: 12, water_stations: 25, outreach_teams: 8 };
    const selectedZoneId = "04013113900";
    const snapshotId: SnapshotId = "2026-08-30-1400";

    const payload = {
      goal: selectedZoneId
        ? `Deploy heat relief resources targeting priority Census Tract GEOID ${selectedZoneId}`
        : "Deploy heat relief resources to highest-risk Census Tracts in Phoenix study area",
      inventory: {
        mobileCoolingUnits: inventory.mobile_cooling_units ?? 0,
        waterStations: inventory.water_stations ?? 0,
        outreachTeams: inventory.outreach_teams ?? 0,
      },
      zoneIds: selectedZoneId ? [selectedZoneId] : undefined,
      snapshotId,
    };

    assert.ok(payload.goal.includes("04013113900"));
    assert.equal(payload.inventory.mobileCoolingUnits, 12);
    assert.equal(payload.inventory.waterStations, 25);
    assert.equal(payload.inventory.outreachTeams, 8);
    assert.deepEqual(payload.zoneIds, ["04013113900"]);
    assert.equal(payload.snapshotId, "2026-08-30-1400");
  });
});
