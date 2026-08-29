"use client";

import { useState } from "react";
import { PriorityZoneModel } from "@/types/dashboard";

interface PriorityZonesProps {
  zones: PriorityZoneModel[];
  selectedZoneId?: string;
  onZoneSelect: (zoneId: string) => void;
}

const statusBadge: Record<
  PriorityZoneModel["status"],
  { label: string; style: string }
> = {
  critical: {
    label: "CRITICAL",
    style: "bg-red-50 text-red-800 border-red-200",
  },
  high: {
    label: "HIGH",
    style: "bg-amber-50 text-amber-900 border-amber-200",
  },
  moderate: {
    label: "MODERATE",
    style: "bg-yellow-50 text-yellow-900 border-yellow-200",
  },
  low: {
    label: "LOW",
    style: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

export default function PriorityZones({
  zones,
  selectedZoneId,
  onZoneSelect,
}: PriorityZonesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Filter zones by search query if user types
  const filtered = zones.filter(
    (z) =>
      z.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Display top 10 by default unless showing all or searching
  const displayLimit = showAll || searchQuery.trim() !== "" ? filtered.length : 10;
  const displayZones = filtered.slice(0, displayLimit);

  return (
    <div className="bg-white border border-gray-200 rounded flex flex-col h-full shadow-2xs">
      {/* Header Bar */}
      <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">
            Priority Census Tracts
          </h2>
          <p className="text-[11px] text-gray-500">
            Track 7 composite risk score ranking
          </p>
        </div>
        <span className="text-[11px] font-mono text-gray-500 uppercase shrink-0">
          {zones.length} Tracts
        </span>
      </div>

      {/* Filter / Search Bar */}
      <div className="px-3 py-2 border-b border-gray-200 bg-slate-50/50 flex items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Filter by GEOID or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2.5 py-1 text-xs font-mono bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-800"
        />
      </div>

      {/* List Container */}
      <div className="divide-y divide-gray-200 overflow-y-auto max-h-[420px] flex-1">
        {displayZones.map((zone) => {
          const isSelected = selectedZoneId === zone.id;
          const status = statusBadge[zone.status];

          return (
            <button
              key={zone.id}
              onClick={() => onZoneSelect(zone.id)}
              aria-pressed={isSelected}
              className={`w-full text-left px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-800 ${
                isSelected
                  ? "bg-slate-100 border-l-4 border-slate-900"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      {zone.code}
                    </span>
                    <h3 className="font-medium text-gray-900 text-xs truncate">
                      {zone.name}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1">
                    Tract Pop: {zone.affectedPopulation.toLocaleString()} • Temp:{" "}
                    {zone.avgTemperature}°C
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border ${status.style}`}
                  >
                    {status.label}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    Score: {zone.riskScore}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Controls */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-[11px]">
        <span className="text-gray-500 font-mono text-[10px]">
          Showing {displayZones.length} of {filtered.length} Census Tracts
        </span>
        {filtered.length > 10 && searchQuery.trim() === "" && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-slate-700 hover:text-slate-950 font-medium underline text-[11px]"
          >
            {showAll ? "Show Top 10 Only" : `View All ${filtered.length} Tracts`}
          </button>
        )}
      </div>
    </div>
  );
}
