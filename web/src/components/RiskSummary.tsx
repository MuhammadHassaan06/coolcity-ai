"use client";

import { DashboardStats } from "@/lib/mockData";

interface RiskSummaryProps {
  stats: DashboardStats;
}

export default function RiskSummary({ stats }: RiskSummaryProps) {
  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">City Risk Summary</h2>
        <span className="text-[11px] font-mono text-gray-500 uppercase">
          Status Overview
        </span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-gray-50/80 border border-gray-200 rounded p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Critical Zones
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-red-700">
                {stats.criticalZones}
              </span>
              <span className="text-[11px] text-gray-600">
                / {stats.totalZonesMonitored} total
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">High urgency response</p>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900">
              Overall Risk Level
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-lg font-bold text-amber-900 tracking-tight">
                {stats.overallRiskLevel.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] font-medium text-amber-800 mt-0.5">
              Demo risk band
            </p>
          </div>

          <div className="bg-gray-50/80 border border-gray-200 rounded p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Avg City Temp
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-gray-900">
                {stats.averageCityTemp}
              </span>
              <span className="text-xs font-semibold text-gray-600">°C</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Across monitored zones</p>
          </div>

          <div className="bg-gray-50/80 border border-gray-200 rounded p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Active Resources
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-800">
                {stats.deployedResources.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Units & personnel</p>
          </div>
        </div>
      </div>
    </div>
  );
}
