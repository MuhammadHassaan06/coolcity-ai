"use client";

import { ResourceLocation, getResourceMetrics } from "@/lib/mockData";

interface ResourcesPanelProps {
  resources: ResourceLocation[];
}

const typeLabels: Record<ResourceLocation["type"], string> = {
  cooling_center: "Cooling Center",
  water_distribution: "Water Station",
  medical: "Medical Hub",
};

export default function ResourcesPanel({ resources }: ResourcesPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="border-b border-gray-200 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">
            Available Resources & Capacity
          </h2>
          <p className="text-[11px] text-gray-500">
            Current operational status for cooling hubs, water distribution, and medical centers
          </p>
        </div>
        <span className="text-[11px] font-mono text-gray-500 uppercase">
          {resources.length} Facilities
        </span>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {resources.map((resource) => {
            const { used, available, total, utilization } =
              getResourceMetrics(resource);

            return (
              <div
                key={resource.id}
                className="bg-gray-50/80 border border-gray-200 rounded p-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <h3 className="font-medium text-gray-900 text-xs truncate">
                      {resource.name}
                    </h3>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600 flex-shrink-0">
                      {typeLabels[resource.type]}
                    </span>
                  </div>

                  {/* Utilization Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 my-2">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        utilization < 50
                          ? "bg-emerald-600"
                          : utilization < 80
                          ? "bg-amber-500"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${utilization}%` }}
                    />
                  </div>
                </div>

                {/* Explicit Capacity Model */}
                <div className="grid grid-cols-4 gap-1 text-center bg-white p-1.5 rounded border border-gray-200 text-[10px] mt-1">
                  <div>
                    <span className="text-gray-400 block font-mono text-[9px] uppercase">
                      Used
                    </span>
                    <span className="font-bold text-gray-900">{used}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-mono text-[9px] uppercase">
                      Available
                    </span>
                    <span className="font-bold text-emerald-700">{available}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-mono text-[9px] uppercase">
                      Total
                    </span>
                    <span className="font-bold text-gray-700">{total}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-mono text-[9px] uppercase">
                      Utilization
                    </span>
                    <span className="font-bold text-slate-900">{utilization}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
