"use client";

import { useState } from "react";
import Header from "@/components/Header";
import ControlBar from "@/components/ControlBar";
import MapPanel from "@/components/MapPanel";
import RiskSummary from "@/components/RiskSummary";
import PriorityZones from "@/components/PriorityZones";
import ResourcesPanel from "@/components/ResourcesPanel";
import DeploymentPanel from "@/components/DeploymentPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import {
  priorityZones,
  resources,
  dashboardStats,
  type ViewMode,
  type TimePeriod,
} from "@/lib/mockData";

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("heat");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("current");
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>();

  const selectedZone = priorityZones.find((z) => z.id === selectedZoneId);

  return (
    <div className="flex flex-col min-h-screen bg-slate-100/50">
      {/* Header */}
      <Header dataMode="demo" />

      {/* Control Bar */}
      <ControlBar
        studyArea="City of Phoenix, Arizona"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />

      {/* Main Dashboard Content */}
      <main className="flex-1 px-2.5 py-3 sm:px-6 sm:py-4 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-3.5 sm:space-y-4">
          {/* Selected Zone Operational Filter Status */}
          {selectedZone && (
            <div className="px-3 py-2 bg-slate-900 text-white rounded flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-mono bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                  {selectedZone.code}
                </span>
                <span className="truncate">
                  <strong>Active Filter:</strong> {selectedZone.name} (Risk Score:{" "}
                  {selectedZone.riskScore}, Pop:{" "}
                  {selectedZone.affectedPopulation.toLocaleString()})
                </span>
              </div>
              <button
                onClick={() => setSelectedZoneId(undefined)}
                className="text-slate-300 hover:text-white underline text-[11px] focus:outline-none focus:ring-2 focus:ring-slate-400 rounded px-1 shrink-0"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Map Area */}
            <div className="lg:col-span-2">
              <MapPanel
                viewMode={viewMode}
                timePeriod={timePeriod}
                selectedZoneId={selectedZoneId}
              />
            </div>

            {/* Right Column - Risk Summary and Priority Zones */}
            <div className="space-y-4">
              <RiskSummary stats={dashboardStats} />

              <PriorityZones
                zones={priorityZones}
                selectedZoneId={selectedZoneId}
                onZoneSelect={(id) =>
                  setSelectedZoneId((prev) => (prev === id ? undefined : id))
                }
              />
            </div>
          </div>

          {/* Bottom - Resources */}
          <div>
            <ResourcesPanel resources={resources} />
          </div>

          {/* Additional Panels Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <DeploymentPanel />
            <AnalysisPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
