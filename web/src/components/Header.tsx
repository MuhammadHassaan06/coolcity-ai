"use client";

import { DataMode, SnapshotId } from "@/types/dashboard";

interface HeaderProps {
  dataMode: DataMode;
  snapshotId?: SnapshotId;
}

export default function Header({ dataMode, snapshotId = "2026-08-30-1400" }: HeaderProps) {
  const isHistorical = snapshotId === "2024-07-15-1400";
  const timestampText = isHistorical ? "Jul 15, 2024 • 14:00" : "Aug 30, 2026 • 14:00";
  const badgeText = dataMode === "demo"
    ? "DEMO DATA MODE"
    : isHistorical
    ? "HISTORICAL SNAPSHOT"
    : "FULL-CITY SNAPSHOT";

  return (
    <header className="border-b border-gray-200 bg-white" aria-label="Phoenix Heat Response Operations Console Header">
      <div className="px-3 py-2.5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight whitespace-nowrap sm:border-r sm:border-gray-300 sm:pr-3">
              CoolCity AI
            </h1>
            <p className="text-[11px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap sm:whitespace-normal">
              Phoenix Heat Response Operations
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-[10px] sm:text-[11px] font-mono text-gray-500 hidden sm:inline">
              {timestampText}
            </span>
            <span
              className={`inline-flex items-center text-[10px] sm:text-[11px] font-mono font-semibold px-2 py-0.5 sm:px-2.5 rounded border ${
                dataMode === "demo"
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : isHistorical
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-slate-100 text-slate-800 border-slate-300"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${
                  dataMode === "demo"
                    ? "bg-amber-500"
                    : isHistorical
                    ? "bg-amber-600"
                    : "bg-slate-600"
                }`}
              />
              {badgeText}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
