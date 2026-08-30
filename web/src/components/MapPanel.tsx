"use client";

import dynamic from "next/dynamic";
import {
  ViewMode,
  TimePeriod,
  PriorityZoneModel,
  SpatialLayerData,
} from "@/types/dashboard";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[380px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 rounded">
      <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
      <span className="font-mono text-[11px] text-slate-300">Initializing GIS Engine...</span>
    </div>
  ),
});

interface MapPanelProps {
  viewMode: ViewMode;
  timePeriod: TimePeriod;
  selectedZone?: PriorityZoneModel;
  selectedZoneId?: string;
  spatialData?: SpatialLayerData;
  onZoneSelect?: (geoid: string) => void;
}

export default function MapPanel({
  viewMode,
  timePeriod,
  selectedZone,
  selectedZoneId,
  spatialData,
  onZoneSelect,
}: MapPanelProps) {
  const modeLabel = viewMode === "heat" ? "Heat Exposure" : "Composite Risk";

  return (
    <div className="bg-white border border-gray-200 rounded flex flex-col h-full">
      {/* Top Header & Status Bar */}
      <div className="border-b border-gray-200 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">
            Phoenix Operations Map ({modeLabel})
          </h2>
          <p className="text-[11px] text-gray-500 font-mono">
            GIS Viewport • 359 Phoenix Census Tracts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
          <span className="px-2 py-0.5 rounded bg-white text-gray-700 font-medium border border-gray-200">
            View Mode: <strong className="text-gray-900">{modeLabel}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-white text-gray-700 font-medium border border-gray-200 capitalize">
            Period: <strong className="text-gray-900">{timePeriod}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium border border-slate-300 truncate max-w-[160px] sm:max-w-none">
            Target:{" "}
            <strong className="text-slate-950">
              {selectedZone ? `${selectedZone.code}` : "All Monitored Zones"}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Map Viewport Area */}
      <div className="relative flex-1 m-2 min-h-[360px] sm:min-h-[400px] rounded overflow-hidden border border-gray-200 bg-slate-950">
        <LeafletMap
          activeView={viewMode}
          activePeriod={timePeriod}
          selectedZone={selectedZoneId ?? selectedZone?.geoid ?? selectedZone?.id ?? null}
          onZoneSelect={onZoneSelect}
          spatialData={spatialData}
        />

        {/* Floating Non-Intrusive Integration Badge */}
        <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:bottom-3 sm:left-3 z-[500] pointer-events-none max-w-[calc(100%-16px)] sm:max-w-md">
          <div className="bg-slate-900/90 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded text-[10px] sm:text-[11px] shadow-md backdrop-blur-sm flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="font-medium leading-tight">
              Official Phoenix boundary • 359 Census Tract spatial choropleth
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
