"use client";

import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ViewMode, TimePeriod, SpatialLayerData, PriorityZoneModel } from "@/types/dashboard";
import { getSnapshotPriorityZones, SnapshotId } from "@/lib/snapshots/snapshot-adapter";

// Fix default Leaflet marker icon paths in Next.js environment
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PHOENIX_CENTER: [number, number] = [33.4484, -112.0740];
const DEFAULT_ZOOM = 10;

// Auto-fit map viewport to GeoJSON boundary when loaded
function FitGeoJsonBounds({ geoData }: { geoData: GeoJSON.GeoJsonObject }) {
  const map = useMap();

  useEffect(() => {
    if (!geoData) return;
    try {
      const geoJsonLayer = L.geoJSON(geoData);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      }
    } catch (err) {
      console.error("Error fitting Phoenix map bounds:", err);
    }
  }, [map, geoData]);

  return null;
}

// Ensures map canvas resizes cleanly when viewport width changes
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

interface LeafletMapProps {
  activeView: ViewMode;
  activePeriod: TimePeriod;
  selectedZone: string | null;
  onZoneSelect?: (geoid: string) => void;
  spatialData?: SpatialLayerData;
}

export default function LeafletMap({
  activeView,
  activePeriod,
  selectedZone,
  onZoneSelect,
  spatialData,
}: LeafletMapProps) {
  void spatialData;
  const [cityBoundary, setCityBoundary] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [tractGeometry, setTractGeometry] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load official Phoenix boundary and Census Tract geometry
  useEffect(() => {
    let isMounted = true;
    async function loadMapLayers() {
      try {
        setIsLoading(true);
        const [boundRes, tractRes] = await Promise.all([
          fetch("/data/phoenix-city-boundary.geojson"),
          fetch("/data/phoenix-census-tracts.geojson"),
        ]);

        if (!boundRes.ok || !tractRes.ok) {
          throw new Error("Failed to load Phoenix spatial layers");
        }

        const boundJson = await boundRes.json();
        const tractJson = await tractRes.json();

        if (isMounted) {
          setCityBoundary(boundJson);
          setTractGeometry(tractJson);
          setGeoError(null);
        }
      } catch (err) {
        console.error("Failed to load map layers:", err);
        if (isMounted) {
          setGeoError("Census tract spatial overlays unavailable. Rendering basemap.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMapLayers();

    return () => {
      isMounted = false;
    };
  }, []);

  // Retrieve active snapshot priority zones and build fast GEOID lookup map
  const priorityZones = useMemo(() => {
    return getSnapshotPriorityZones(activePeriod as SnapshotId);
  }, [activePeriod]);

  const zoneLookup = useMemo(() => {
    const map = new Map<string, PriorityZoneModel>();
    for (const z of priorityZones) {
      map.set(z.geoid, z);
      if (z.id) map.set(z.id, z);
      if (z.code) map.set(z.code, z);
    }
    return map;
  }, [priorityZones]);

  // Compute temperature range for continuous heat scale
  const { minTemp, maxTemp } = useMemo(() => {
    if (priorityZones.length === 0) return { minTemp: 35.0, maxTemp: 42.0 };
    const temps = priorityZones.map((z) => z.avgTemperature);
    return {
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
    };
  }, [priorityZones]);

  // Color functions for Heat mode and Risk mode
  const getHeatColor = (temp: number): string => {
    const range = maxTemp - minTemp || 1;
    const ratio = Math.max(0, Math.min(1, (temp - minTemp) / range));

    if (ratio <= 0.2) return "#fef0d9";
    if (ratio <= 0.4) return "#fdcc8a";
    if (ratio <= 0.6) return "#fc8d59";
    if (ratio <= 0.8) return "#e34a33";
    return "#b30000";
  };

  const getRiskColor = (status: PriorityZoneModel["status"]): string => {
    switch (status) {
      case "critical":
        return "#dc2626";
      case "high":
        return "#ea580c";
      case "moderate":
        return "#eab308";
      case "low":
        return "#16a34a";
      default:
        return "#64748b";
    }
  };

  // GeoJSON polygon styling
  const tractStyle = (feature?: GeoJSON.Feature): L.PathOptions => {
    if (!feature || !feature.properties) {
      return { color: "#475569", weight: 0.5, fillOpacity: 0.5 };
    }
    const geoid = String(feature.properties.GEOID || "").trim();
    const zone = zoneLookup.get(geoid);
    const isSelected = selectedZone && (selectedZone === geoid || selectedZone === zone?.id || selectedZone === zone?.code);

    let fillColor = "#64748b";
    if (zone) {
      fillColor = activeView === "heat" ? getHeatColor(zone.avgTemperature) : getRiskColor(zone.status);
    }

    if (isSelected) {
      return {
        color: "#00f0ff",
        weight: 3.5,
        opacity: 1,
        fillColor,
        fillOpacity: 0.9,
      };
    }

    return {
      color: "#1e293b",
      weight: 0.6,
      opacity: 0.6,
      fillColor,
      fillOpacity: 0.72,
    };
  };

  const cityBoundaryStyle: L.PathOptions = {
    color: "#0284c7",
    weight: 2.5,
    opacity: 0.9,
    fillColor: "#0284c7",
    fillOpacity: 0.0,
  };

  // Feature interactivity & Popups
  const onEachTractFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    const geoid = String(feature.properties?.GEOID || "").trim();
    const zone = zoneLookup.get(geoid);
    const name = zone?.name || feature.properties?.NAME || `Census Tract ${geoid}`;
    const temp = zone ? `${zone.avgTemperature}°C` : "N/A";
    const score = zone ? zone.riskScore : "N/A";
    const statusLabel = zone ? zone.status.toUpperCase() : "N/A";

    const popupContent = `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; padding: 4px; color: #0f172a; min-width: 180px;">
        <div style="font-size: 11px; font-weight: 700; font-family: monospace; color: #475569;">
          GEOID: ${geoid}
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">
          ${name}
        </div>
        <div style="margin-top: 8px; border-top: 1px solid #e2e8f0; pt-2; font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Avg Surface Temp:</span>
            <strong style="color: #0f172a;">${temp}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Composite Risk Score:</span>
            <strong style="color: #0f172a;">${score}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #64748b;">Risk Status:</span>
            <span style="font-weight: 700; font-size: 10px; padding: 1px 6px; border-radius: 4px; ${
              zone?.status === "critical"
                ? "background: #fee2e2; color: #991b1b;"
                : zone?.status === "high"
                ? "background: #ffedd5; color: #9a3412;"
                : zone?.status === "moderate"
                ? "background: #fef9c3; color: #854d0e;"
                : "background: #f1f5f9; color: #334155;"
            }">${statusLabel}</span>
          </div>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      click: () => {
        if (onZoneSelect && geoid) {
          onZoneSelect(geoid);
        }
      },
      mouseover: (e) => {
        const l = e.target;
        const isSelected = selectedZone && (selectedZone === geoid || selectedZone === zone?.id || selectedZone === zone?.code);
        if (!isSelected) {
          l.setStyle({
            weight: 2.0,
            color: "#ffffff",
            fillOpacity: 0.88,
          });
        }
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle(tractStyle(feature));
      },
    });
  };

  return (
    <div className="relative w-full h-full min-h-[360px] sm:min-h-[400px] bg-slate-950 overflow-hidden rounded">
      {/* Interactive Leaflet Map */}
      <MapContainer
        center={PHOENIX_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={8}
        maxZoom={18}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        aria-label="City of Phoenix Interactive Map"
      >
        <MapResizeHandler />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* 359 Census Tract Choropleth Polygons */}
        {tractGeometry && (
          <GeoJSON
            key={`tracts-${activeView}-${activePeriod}-${selectedZone || "none"}`}
            data={tractGeometry}
            style={tractStyle}
            onEachFeature={onEachTractFeature}
          />
        )}

        {/* Phoenix Municipal Boundary Outer Line */}
        {cityBoundary && (
          <>
            <GeoJSON data={cityBoundary} style={cityBoundaryStyle} />
            <FitGeoJsonBounds geoData={cityBoundary} />
          </>
        )}
      </MapContainer>

      {/* Dynamic Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-[500] bg-slate-900/90 text-slate-100 border border-slate-700 px-3 py-2 rounded shadow-lg backdrop-blur-sm max-w-[200px]">
        <div className="text-[11px] font-bold uppercase tracking-wide text-cyan-400">
          {activeView === "heat" ? "Heat Exposure" : "Composite Risk"}
        </div>
        <div className="text-[10px] text-slate-400 font-mono mb-1.5">
          {activeView === "heat" ? "Surface Temperature (°C)" : "Track 7 Census Risk Bands"}
        </div>

        {activeView === "heat" ? (
          <div className="space-y-1">
            <div className="h-2.5 w-full rounded bg-gradient-to-r from-[#fef0d9] via-[#fc8d59] to-[#b30000] border border-slate-700" />
            <div className="flex justify-between text-[10px] font-mono text-slate-300 font-semibold">
              <span>{minTemp.toFixed(1)}°C</span>
              <span>{((minTemp + maxTemp) / 2).toFixed(1)}°C</span>
              <span>{maxTemp.toFixed(1)}°C</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] shrink-0" />
              <span>Critical</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] shrink-0" />
              <span>High</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] shrink-0" />
              <span>Moderate</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] shrink-0" />
              <span>Low</span>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute top-2 left-2 z-[1000] bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded text-xs text-slate-300 shadow backdrop-blur-sm flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Loading Spatial Layers...</span>
        </div>
      )}

      {/* Error Overlay */}
      {geoError && (
        <div className="absolute top-2 left-2 right-2 z-[1000] bg-amber-950/90 border border-amber-600/50 px-3 py-1.5 rounded text-xs text-amber-200 shadow backdrop-blur-sm flex items-center justify-between">
          <span>⚠️ {geoError}</span>
          <button
            onClick={() => setGeoError(null)}
            className="text-amber-400 hover:text-amber-100 font-mono text-[10px] ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
