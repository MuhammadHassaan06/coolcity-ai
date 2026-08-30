"use client";

import React, { useState } from "react";
import { DeployableResourceCategory, DeployableInventory, SnapshotId } from "@/types/dashboard";
import { AgentPlanResponse } from "@/types/agent";
import { ResourceAllocation } from "@/types/allocation";
import {
  getDeployableCategories,
  getDefaultDeployableInventory,
} from "@/lib/dataAdapter";

interface DeploymentPanelProps {
  categories?: DeployableResourceCategory[];
  defaultInventory?: DeployableInventory;
  selectedZoneId?: string;
  snapshotId?: SnapshotId;
}

export default function DeploymentPanel({
  categories = getDeployableCategories(),
  defaultInventory = getDefaultDeployableInventory(),
  selectedZoneId,
  snapshotId = "2026-08-30-1400",
}: DeploymentPanelProps = {}) {
  const [inventory, setInventory] = useState<DeployableInventory>(defaultInventory);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [planResult, setPlanResult] = useState<AgentPlanResponse | null>(null);
  const [planningMode, setPlanningMode] = useState<"agent" | "deterministic-fallback">("agent");
  const [preparedTimestamp, setPreparedTimestamp] = useState<string | null>(null);

  // Compute live total deployable resources
  const totalResources = Object.values(inventory).reduce(
    (sum, count) => sum + (Number.isFinite(count) ? count : 0),
    0
  );

  // Handle numeric input updates
  const handleQuantityChange = (
    id: string,
    rawValue: string,
    maxSafetyBound: number
  ) => {
    setValidationError(null);

    if (rawValue.trim() === "") {
      setInventory((prev) => ({ ...prev, [id]: 0 }));
      return;
    }

    const parsed = parseInt(rawValue, 10);
    if (isNaN(parsed)) {
      setInventory((prev) => ({ ...prev, [id]: 0 }));
      return;
    }

    const sanitized = Math.min(maxSafetyBound, Math.max(0, Math.floor(parsed)));
    setInventory((prev) => ({ ...prev, [id]: sanitized }));
  };

  // Submit allocation request to POST /api/agent/plan
  const handleGeneratePlan = async () => {
    if (totalResources === 0) {
      setValidationError(
        "Cannot generate deployment plan: At least one deployable resource unit must be available in inventory."
      );
      return;
    }

    setValidationError(null);
    setIsPlanning(true);

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
      snapshotId: snapshotId || "2026-08-30-1400",
    };

    try {
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate deployment plan from backend");
      }

      const plan: AgentPlanResponse = data.plan;
      setPlanResult(plan);
      setPlanningMode(plan.metadata?.mode === "agent" ? "agent" : "deterministic-fallback");
      setPreparedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred while communicating with agent service";
      setValidationError(errMsg);
    } finally {
      setIsPlanning(false);
    }
  };

  // Reset to demo defaults
  const handleReset = () => {
    setInventory(defaultInventory);
    setValidationError(null);
    setPlanResult(null);
    setPreparedTimestamp(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded flex flex-col h-full shadow-2xs">
      {/* Header Bar */}
      <div className="border-b border-gray-200 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">
            Deployment Resource Planner
          </h2>
          <p className="text-[11px] text-gray-500 font-mono">
            Track 6 Agentic Optimizer • City of Phoenix, Arizona
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-300 uppercase tracking-wide">
            TRACK 6 ACTIVE
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3.5 sm:space-y-4 bg-slate-50/30">
        {/* Track 6 Agent Execution Context Notice */}
        <div className="bg-slate-100/80 border border-slate-200 rounded p-2.5 sm:p-3 text-xs text-slate-700 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] font-mono">
              Agentic Resource Allocation
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Snapshot: {snapshotId === "2024-07-15-1400" ? "2024-07-15" : "2026-08-30"}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Submits municipal resource inventory to the Track 6 agent. The backend optimizes allocations across <strong>Track 7 Census Tract risk scores ({snapshotId})</strong> while enforcing strict inventory caps via the <strong>deterministic allocator engine</strong>.
          </p>
        </div>

        {/* Interactive Resource Quantity Inputs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Staging Inventory
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              {selectedZoneId ? `Focused on GEOID: ${selectedZoneId}` : "All Monitored Tracts"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const currentVal = inventory[cat.id] ?? 0;
              const inputId = `resource-input-${cat.id}`;

              return (
                <div
                  key={cat.id}
                  className="bg-white border border-gray-200 rounded p-3 flex flex-col justify-between space-y-2 shadow-2xs hover:border-gray-300 transition-colors"
                >
                  <div>
                    <label
                      htmlFor={inputId}
                      className="block text-xs font-semibold text-gray-900 cursor-pointer"
                    >
                      {cat.name}
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                      {cat.description}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <input
                        id={inputId}
                        type="number"
                        min={0}
                        max={cat.maxSafetyBound}
                        step={1}
                        value={currentVal}
                        onChange={(e) =>
                          handleQuantityChange(cat.id, e.target.value, cat.maxSafetyBound)
                        }
                        className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-right"
                      />
                      <span className="text-[11px] text-gray-600 font-medium">
                        {cat.unitLabel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Planning Inventory Summary */}
        <div className="bg-white border border-gray-200 rounded p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
            <span className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
              Deployable Inventory Summary
            </span>
            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Total Available: {totalResources} Units
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-gray-700 text-center">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-gray-50 p-1.5 rounded border border-gray-150">
                <span className="block text-[9px] text-gray-400 uppercase truncate">
                  {cat.name}
                </span>
                <span className="font-bold text-slate-900">{inventory[cat.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div
            role="alert"
            aria-live="polite"
            className="p-2.5 bg-red-50 border border-red-300 rounded text-xs text-red-800 flex items-start justify-between gap-2"
          >
            <span>⚠️ {validationError}</span>
            <button
              onClick={() => setValidationError(null)}
              className="text-red-600 hover:text-red-950 font-mono text-[10px] underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Live Agent Plan Results Display */}
        {planResult && (
          <div
            aria-live="polite"
            className="bg-slate-900 text-slate-100 border border-slate-700 rounded p-3.5 space-y-3 shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-100">
                  Recommended Deployment Plan
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {planningMode === "agent" ? "AI-assisted plan" : "Deterministic fallback plan"}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {preparedTimestamp}
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <p className="text-[11px] text-slate-200 leading-relaxed font-sans bg-slate-950 p-2.5 rounded border border-slate-800">
              {planResult.summary}
            </p>

            {/* Resource Allocation Table */}
            <div className="space-y-1.5">
              <h5 className="text-[10px] font-mono uppercase font-bold text-slate-400">
                Tract-Level Resource Allocations
              </h5>
              <div className="bg-slate-950 rounded border border-slate-800 overflow-hidden text-[11px] font-mono">
                <table className="w-full text-left divide-y divide-slate-800">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="p-2">Census Tract</th>
                      <th className="p-2">Resource Type</th>
                      <th className="p-2 text-center">Quantity Allocated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {planResult.allocations.map((alloc: ResourceAllocation, idx: number) => (
                      <tr key={`${alloc.zoneId}-${alloc.resourceType}-${idx}`}>
                        <td className="p-2 text-slate-100 font-bold">{alloc.zoneId}</td>
                        <td className="p-2 text-slate-300 font-mono capitalize">
                          {alloc.resourceType.replace(/_/g, " ")}
                        </td>
                        <td className="p-2 text-center text-emerald-400 font-bold">
                          {alloc.allocatedQuantity ?? alloc.quantity ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remaining Inventory Summary */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
              <span>Remaining Inventory:</span>
              <span>
                Cooling: {planResult.remainingInventory.mobileCoolingUnits} • Water: {planResult.remainingInventory.waterStations} • Teams: {planResult.remainingInventory.outreachTeams}
              </span>
            </div>

            {/* Evidence & Warnings */}
            {planResult.warnings && planResult.warnings.length > 0 && (
              <div className="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-800/60 space-y-1">
                {planResult.warnings.map((w: string, idx: number) => (
                  <p key={idx}>⚠️ {w}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setPlanResult(null)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Dismiss Plan
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200">
          <button
            type="button"
            disabled={isPlanning}
            onClick={handleGeneratePlan}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-medium text-xs rounded border border-slate-950 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 flex items-center gap-2"
          >
            {isPlanning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Agent Plan...</span>
              </>
            ) : (
              <span>Generate Agent Allocation Plan</span>
            )}
          </button>

          <button
            type="button"
            disabled={isPlanning}
            onClick={handleReset}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-medium text-xs rounded border border-gray-300 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            Reset Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
