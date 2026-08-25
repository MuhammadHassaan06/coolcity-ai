"use client";

export default function DeploymentPanel() {
  return (
    <div className="bg-white border border-gray-200 rounded flex flex-col h-full">
      <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">
          Deployment Plan
        </h2>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
          AWAITING AGENT INTEGRATION
        </span>
      </div>
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 bg-slate-50/40">
        <p className="text-xs text-gray-700 leading-relaxed">
          Automated deployment strategy recommendations will calculate optimal emergency resource distribution across City of Phoenix priority sectors.
        </p>

        <div className="bg-white p-3 rounded border border-gray-200 space-y-2 text-[11px]">
          <span className="font-bold text-gray-700 uppercase tracking-wider block text-[10px]">
            Planned Evaluation Inputs:
          </span>
          <ul className="space-y-1.5 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>
                <strong>Zone Risk:</strong> Microclimate heat exposure & vulnerability indicators
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>
                <strong>Available Resources:</strong> Real-time cooling center & distribution capacity
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>
                <strong>Allocation Constraints:</strong> Resource availability, service capacity & allocation constraints
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
