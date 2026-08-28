"use client";

import { ViewMode, TimePeriod } from "@/lib/mockData";

interface ControlBarProps {
  studyArea: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
}

export default function ControlBar({
  studyArea,
  viewMode,
  onViewModeChange,
  timePeriod,
  onTimePeriodChange,
}: ControlBarProps) {
  return (
    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 sm:px-6" role="region" aria-label="Dashboard controls">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 shrink-0">
            Study Area:
          </span>
          <span className="text-xs font-semibold text-gray-900 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-gray-200 truncate">
            {studyArea}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 shrink-0">
              View Mode
            </span>
            <div className="flex gap-1 bg-gray-200/80 p-0.5 rounded border border-gray-300">
              {(["heat", "risk"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  aria-pressed={viewMode === mode}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                    viewMode === mode
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-gray-700 hover:text-gray-900 hover:bg-white/60"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="time-period"
              className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 shrink-0"
            >
              Time Period
            </label>
            <select
              id="time-period"
              value={timePeriod}
              onChange={(e) =>
                onTimePeriodChange(e.target.value as TimePeriod)
              }
              className="px-2 sm:px-2.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="current">Current</option>
              <option value="afternoon">Afternoon</option>
              <option value="historical">Historical</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
