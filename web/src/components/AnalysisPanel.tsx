"use client";

export default function AnalysisPanel() {
  return (
    <div className="bg-white border border-gray-200 rounded flex flex-col h-full">
      <div className="border-b border-gray-200 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">
            Heat & Vulnerability Analysis
          </h2>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 self-start sm:self-auto shrink-0">
          AWAITING TRACK 7 ANALYTICS INTEGRATION
        </span>
      </div>
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 bg-slate-50/40">
        <p className="text-xs text-gray-700 leading-relaxed">
          Operational analytics will fuse FortyGuard microclimate surface temperature measurements with municipal heat vulnerability indicators.
        </p>

        <div className="bg-white p-3 rounded border border-gray-200 space-y-2 text-[11px]">
          <span className="font-bold text-gray-700 uppercase tracking-wider block text-[10px]">
            Planned Analytic Framework:
          </span>
          <ul className="space-y-1.5 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>
                <strong>Thermal Exposure:</strong> Land surface temp anomalies & microclimate variance
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>
                <strong>Social Vulnerability:</strong> Demographic vulnerability indicators
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>
                <strong>Risk Correlation:</strong> Multi-factor composite heat vulnerability scoring
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
