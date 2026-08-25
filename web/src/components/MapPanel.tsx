"use client";

import { ViewMode, TimePeriod, priorityZones } from "@/lib/mockData";

interface MapPanelProps {
  viewMode: ViewMode;
  timePeriod: TimePeriod;
  selectedZoneId?: string;
}

export default function MapPanel({
  viewMode,
  timePeriod,
  selectedZoneId,
}: MapPanelProps) {
  const modeLabel = viewMode === "heat" ? "Heat Exposure" : "Risk Index";
  const selectedZone = priorityZones.find((z) => z.id === selectedZoneId);

  return (
    <div className="bg-white border border-gray-200 rounded flex flex-col h-full">
      {/* Top Header & Status Bar */}
      <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">
            Phoenix Operations Map
          </h2>
          <p className="text-[11px] text-gray-500 font-mono">
            GIS Viewport • City of Phoenix, Arizona
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-white text-gray-700 font-medium border border-gray-200">
            View: <strong className="text-gray-900">{modeLabel}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-white text-gray-700 font-medium border border-gray-200 capitalize">
            Period: <strong className="text-gray-900">{timePeriod}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium border border-slate-300">
            Target:{" "}
            <strong className="text-slate-950">
              {selectedZone ? `${selectedZone.code}` : "All Monitored Zones"}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Map Viewport Area */}
      <div className="flex-1 bg-slate-50/50 p-6 min-h-[380px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 m-3 rounded">
        <div className="max-w-md text-center space-y-3">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded bg-slate-100 text-slate-600 border border-slate-200">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Geographic Operations Viewport
          </h3>
          <div className="bg-white p-3 rounded border border-gray-200 shadow-2xs">
            <p className="text-xs font-medium text-gray-700">
              Live FortyGuard geographic heat layer integration pending
            </p>
          </div>
          <div className="pt-1 flex items-center justify-center gap-3 text-[11px] font-mono text-gray-500">
            <span>Lat: 33.4484° N</span>
            <span>•</span>
            <span>Lon: 112.0740° W</span>
            <span>•</span>
            <span>Target: {selectedZone ? selectedZone.name : "Citywide"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
