"use client";

interface HeaderProps {
  dataMode: "live" | "demo";
}

export default function Header({ dataMode }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-gray-900 tracking-tight border-r border-gray-300 pr-3">
              CoolCity AI
            </h1>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
              Phoenix Heat Response Operations
            </p>
          </div>
          <div>
            <span
              className={`inline-flex items-center text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded border ${
                dataMode === "demo"
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-emerald-50 text-emerald-900 border-emerald-300"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  dataMode === "demo" ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              {dataMode === "demo" ? "DEMO DATA MODE" : "LIVE DATA MODE"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
