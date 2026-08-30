import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getSnapshotPriorityZones,
  getSnapshotDashboardSummary,
  getSnapshotMetadata,
  isValidSnapshotId,
  DEFAULT_SNAPSHOT_ID,
} from "../src/lib/snapshots/snapshot-adapter";
import { runCoolCityPlanningAgent } from "../src/lib/agent/agent";
import { AgentPlanRequestSchema } from "../src/lib/agent/schemas";
import { resetAnalyticsStore } from "../src/lib/zones/zone-service";

describe("Track 7 Multi-Snapshot Data Layer & Agent Integration Suite", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY; // Ensure 100% offline deterministic execution during tests
    resetAnalyticsStore();
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    resetAnalyticsStore();
  });

  it("1. default snapshot is 2026-08-30-1400", () => {
    assert.equal(DEFAULT_SNAPSHOT_ID, "2026-08-30-1400");
    const meta = getSnapshotMetadata();
    assert.equal(meta.id, "2026-08-30-1400");
    assert.equal(meta.label, "Latest Snapshot");
    assert.equal(meta.timestampDisplay, "Aug 30, 2026 • 14:00");
  });

  it("2. 2026 snapshot returns 359 tracts, 2 critical tracts, top tract 04013113900", () => {
    const zones = getSnapshotPriorityZones("2026-08-30-1400");
    const summary = getSnapshotDashboardSummary("2026-08-30-1400");

    assert.equal(zones.length, 359);
    assert.equal(summary.criticalZones, 2);
    assert.equal(zones[0].geoid, "04013113900");
    assert.equal(zones[0].riskScore, 77.02);
    assert.equal(zones[0].status, "critical");
    assert.ok(summary.averageCityTemp >= 39.50 && summary.averageCityTemp <= 40.50);
  });

  it("3. switching to 2024-07-15-1400 returns 359 tracts, 0 critical tracts, top tract 04013114900", () => {
    const zones = getSnapshotPriorityZones("2024-07-15-1400");
    const summary = getSnapshotDashboardSummary("2024-07-15-1400");

    assert.equal(zones.length, 359);
    assert.equal(summary.criticalZones, 0);
    assert.equal(zones[0].geoid, "04013114900");
    assert.equal(zones[0].riskScore, 73.15);
    assert.equal(zones[0].status, "high");
    assert.ok(summary.averageCityTemp >= 39.00 && summary.averageCityTemp <= 39.80);
  });

  it("4. switching 2024 -> 2026 updates values cleanly back to 2026 dataset", () => {
    const zones2024 = getSnapshotPriorityZones("2024-07-15-1400");
    assert.equal(zones2024[0].geoid, "04013114900");

    const zones2026 = getSnapshotPriorityZones("2026-08-30-1400");
    assert.equal(zones2026[0].geoid, "04013113900");
    assert.equal(zones2026[0].riskScore, 77.02);
  });

  it("5. GEOID selection is preserved when GEOID exists in both snapshots", () => {
    const targetGeoid = "04013113900";
    const zones2026 = getSnapshotPriorityZones("2026-08-30-1400");
    const zones2024 = getSnapshotPriorityZones("2024-07-15-1400");

    const tract2026 = zones2026.find((z) => z.geoid === targetGeoid);
    const tract2024 = zones2024.find((z) => z.geoid === targetGeoid);

    assert.ok(tract2026);
    assert.ok(tract2024);
    assert.equal(tract2026.riskScore, 77.02);
    assert.equal(tract2024.riskScore, 72.45); // Recomputed score in 2024 historical
  });

  it("6. validates snapshotId schema input and rejects invalid snapshotId values", () => {
    assert.equal(isValidSnapshotId("2026-08-30-1400"), true);
    assert.equal(isValidSnapshotId("2024-07-15-1400"), true);
    assert.equal(isValidSnapshotId("invalid-snapshot-id"), false);

    const validReq = AgentPlanRequestSchema.safeParse({
      goal: "Deploy cooling units",
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 1 },
      snapshotId: "2024-07-15-1400",
    });
    assert.equal(validReq.success, true);

    const invalidReq = AgentPlanRequestSchema.safeParse({
      goal: "Deploy cooling units",
      inventory: { mobileCoolingUnits: 2, waterStations: 2, outreachTeams: 1 },
      snapshotId: "2025-01-01-1200",
    });
    assert.equal(invalidReq.success, false);
  });

  it("7. agent planner uses 2026 Track 7 risk scores and top tract when snapshotId is 2026-08-30-1400", async () => {
    const plan = await runCoolCityPlanningAgent({
      goal: "Emergency deployment 2026",
      inventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 },
      snapshotId: "2026-08-30-1400",
    });

    assert.ok(plan);
    assert.equal(plan.priorityZones[0], "04013113900"); // Top tract in 2026
    assert.ok(plan.summary.includes("2026-08-30-1400"));
    assert.ok(plan.evidence.some((e) => e.source.includes("2026-08-30-1400")));
  });

  it("8. agent planner uses 2024 Track 7 risk scores and top tract when snapshotId is 2024-07-15-1400", async () => {
    const plan = await runCoolCityPlanningAgent({
      goal: "Historical analysis deployment 2024",
      inventory: { mobileCoolingUnits: 1, waterStations: 1, outreachTeams: 1 },
      snapshotId: "2024-07-15-1400",
    });

    assert.ok(plan);
    assert.equal(plan.priorityZones[0], "04013114900"); // Top tract in 2024
    assert.ok(plan.summary.includes("2024-07-15-1400"));
    assert.ok(plan.evidence.some((e) => e.source.includes("2024-07-15-1400")));
  });
});
