"use client";

import React, { useState } from "react";
import {
  DEPLOYABLE_RESOURCE_CATEGORIES,
  DEFAULT_DEPLOYABLE_INVENTORY,
} from "@/lib/mockData";

export default function DeploymentPanel() {
  const [inventory, setInventory] = useState<Record<string, number>>(
    DEFAULT_DEPLOYABLE_INVENTORY
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPreviewPrepared, setIsPreviewPrepared] = useState<boolean>(false);
  const [preparedTimestamp, setPreparedTimestamp] = useState<string | null>(null);

  // Compute live total deployable resources
  const totalResources = Object.values(inventory).reduce(
    (sum, count) => sum + (Number.isFinite(count) ? count : 0),
    0
  );

  // Handle numeric input updates with strict validation & demo safety bounds
  const handleQuantityChange = (
    id: string,
    rawValue: string,
    maxSafetyBound: number
  ) => {
    // Clear previous validation alert & preview when inputs change
    setValidationError(null);
    setIsPreviewPrepared(false);

    if (rawValue.trim() === "") {
      setInventory((prev) => ({ ...prev, [id]: 0 }));
      return;
    }

    const parsed = parseInt(rawValue, 10);

    if (isNaN(parsed)) {
      setInventory((prev) => ({ ...prev, [id]: 0 }));
      return;
    }

    // Normalize: integer, min 0, max prototype safety bound
    const sanitized = Math.min(maxSafetyBound, Math.max(0, Math.floor(parsed)));
    setInventory((prev) => ({ ...prev, [id]: sanitized }));
  };

  // Prepare deployment request preview (local-only)
  const handlePrepareRequest = () => {
    if (totalResources === 0) {
      setValidationError(
        "Cannot prepare deployment request: At least one deployable resource unit must be allocated (Total: 0)."
      );
      setIsPreviewPrepared(false);
      return;
    }

    setValidationError(null);
    setPreparedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setIsPreviewPrepared(true);
  };

  // Reset to demo defaults
  const handleReset = () => {
    setInventory(DEFAULT_DEPLOYABLE_INVENTORY);
    setValidationError(null);
    setIsPreviewPrepared(false);
    setPreparedTimestamp(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded flex flex-col h-full shadow-2xs">
      {/* Header Bar */}
      <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">
            Deployment Resource Planner
          </h2>
          <p className="text-[11px] text-gray-500 font-mono">
            Track 6 Input Module • City of Phoenix, Arizona
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 uppercase tracking-wide">
            AGENT STATUS: AWAITING TRACK 6 INTEGRATION
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-4 bg-slate-50/30">
        {/* Future Track 6 Integration Context Notice */}
        <div className="bg-slate-100/80 border border-slate-200 rounded p-3 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] font-mono">
              Future Agent Execution Inputs
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Input Staging Only</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Configure mobile resource inventory to submit to the future allocation agent.
            The upcoming Track 6 agent will consume: <strong>(1) priority-zone microclimate risk</strong>,{" "}
            <strong>(2) available deployable inventory</strong>, and <strong>(3) service allocation constraints</strong> to compute emergency deployment recommendations.
          </p>
        </div>

        {/* Interactive Resource Quantity Inputs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Prototype Deployable Inventory
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              Demo UI safety bounds enforced
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEPLOYABLE_RESOURCE_CATEGORIES.map((cat) => {
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
                        aria-describedby={`${inputId}-hint`}
                      />
                      <span className="text-[11px] text-gray-600 font-medium">
                        {cat.unitLabel}
                      </span>
                    </div>
                    <span id={`${inputId}-hint`} className="text-[9px] text-gray-400 font-mono">
                      Max {cat.maxSafetyBound}
                    </span>
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
              Total: {totalResources} Units
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-gray-700 text-center">
            {DEPLOYABLE_RESOURCE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="bg-gray-50 p-1.5 rounded border border-gray-150">
                <span className="block text-[9px] text-gray-400 uppercase truncate">
                  {cat.name}
                </span>
                <span className="font-bold text-slate-900">{inventory[cat.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Textual ARIA Validation Banner */}
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

        {/* Local Deployment Request Preview Panel (Inline) */}
        {isPreviewPrepared && (
          <div
            aria-live="polite"
            className="bg-slate-900 text-slate-100 border border-slate-700 rounded p-3.5 space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-100">
                  Preview Only — No Agent Request Sent
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Staged at {preparedTimestamp}
              </span>
            </div>

            <div className="text-[11px] text-slate-300 space-y-1.5">
              <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                <span>Target Study Area: City of Phoenix, Arizona</span>
                <span>Mode: Local Staging Preview</span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded border border-slate-800 font-mono text-center">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase truncate">Cooling Units</span>
                  <strong className="text-emerald-400 text-xs">{inventory.mobile_cooling_units ?? 0}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase truncate">Water Stations</span>
                  <strong className="text-cyan-400 text-xs">{inventory.water_stations ?? 0}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase truncate">Outreach Teams</span>
                  <strong className="text-amber-400 text-xs">{inventory.outreach_teams ?? 0}</strong>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                Note: This is a local UI preparation preview. No external API request or agent optimization has been executed.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsPreviewPrepared(false)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Dismiss Preview
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrepareRequest}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded border border-slate-950 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
          >
            Prepare Deployment Request
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-medium text-xs rounded border border-gray-300 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            Reset Demo Inputs
          </button>
        </div>
      </div>
    </div>
  );
}
