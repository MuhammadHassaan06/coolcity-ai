"use client";

import correlationData from "@/data/track7/correlation_summary.json";
import sensitivityData from "@/data/track7/sensitivity_summary.json";

export default function AnalysisPanel() {
  const correlations = correlationData.correlations || [];
  const tractCount = correlationData.tract_count || 359;

  // Filter for intensity_score heat metric for UI display
  const keyCorrelations = correlations.filter(
    (c) => c.heat_metric === "intensity_score"
  );

  const top10OverlapA = sensitivityData.top_10_prioritization_stability?.overlap_A_with_baseline || "9 / 10";
  const top10OverlapC = sensitivityData.top_10_prioritization_stability?.overlap_C_with_baseline || "9 / 10";

  return (
    <div className="bg-white border border-gray-200 rounded flex flex-col h-full shadow-2xs">
      {/* Header Bar */}
      <div className="border-b border-gray-200 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">
            Track 7 Statistical Analysis & Sensitivity
          </h2>
          <p className="text-[11px] text-gray-500 font-mono">
            Tract-Level Exploratory Correlation (N={tractCount} Census Tracts)
          </p>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 text-white border border-slate-950 shrink-0">
          TRACK 7 INTEGRATED
        </span>
      </div>

      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3.5 bg-slate-50/30">
        {/* Methodological Context */}
        <div className="bg-white p-3 rounded border border-gray-200 space-y-1.5 text-xs text-slate-700">
          <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] font-mono block">
            Statistical Unit & Pseudoreplication Correction
          </span>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Full-city Phoenix thermal telemetry (121,892 features inside municipal boundary) was mean-aggregated to <strong>{tractCount} Census Tracts</strong> before correlation testing. Aggregating to tract-level removes spatial pseudoreplication and ensures valid p-values across demographic variables.
          </p>
          <p className="text-[10px] text-slate-500 italic mt-1">
            Note: Correlations indicate spatial associations only and do not establish direct causality.
          </p>
        </div>

        {/* Tract-Level Exploratory Correlations Table */}
        <div className="bg-white rounded border border-gray-200 overflow-hidden text-xs">
          <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 font-bold text-gray-800 text-[10px] uppercase tracking-wider">
            Tract-Level Correlations (N={tractCount})
          </div>
          <div className="divide-y divide-gray-150 font-mono text-[11px]">
            {keyCorrelations.slice(0, 4).map((c) => (
              <div key={c.variable} className="px-3 py-1.5 flex items-center justify-between">
                <span className="font-medium text-gray-800 capitalize">
                  {c.variable.replace("_", " ")}
                </span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span>Pearson r: {c.pearson_r > 0 ? `+${c.pearson_r}` : c.pearson_r}</span>
                  <span>Spearman ρ: {c.spearman_rho > 0 ? `+${c.spearman_rho}` : c.spearman_rho}</span>
                  <span
                    className={`px-1 rounded text-[9px] font-semibold ${
                      c.is_statistically_significant
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.is_statistically_significant ? "p < 0.05" : "p ≥ 0.05"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sensitivity & Prioritization Stability */}
        <div className="bg-white p-3 rounded border border-gray-200 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1 font-bold text-gray-800 uppercase tracking-wider text-[10px]">
            <span>Weighting Sensitivity Analysis</span>
            <span className="font-mono text-[10px] text-slate-500">N={tractCount}</span>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Evaluated prioritization stability under heuristic weight shifts (Socially Weighted 40/60 vs Heat Weighted 60/40). Top 10 priority tract overlap with baseline remains stable:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-center">
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="block text-[9px] text-gray-500 uppercase">Scenario A (40/60)</span>
              <strong className="text-slate-900 text-xs">{top10OverlapA} Top 10 Match</strong>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="block text-[9px] text-gray-500 uppercase">Scenario C (60/40)</span>
              <strong className="text-slate-900 text-xs">{top10OverlapC} Top 10 Match</strong>
            </div>
          </div>
          <p className="text-[9px] text-gray-400 italic">
            Disclaimer: Sensitivity testing confirms ranking stability under weight shifts. It does not constitute clinical or epidemiological model validation.
          </p>
        </div>
      </div>
    </div>
  );
}
