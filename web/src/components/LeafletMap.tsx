"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icon paths in Next.js environment if needed
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

interface LeafletMapProps {
  activeView: "heat" | "risk";
  activePeriod: "current" | "afternoon" | "historical";
  selectedZone: string | null;
}

export default function LeafletMap({}: LeafletMapProps) {
  const [geoData, setGeoData] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadBoundary() {
      try {
        setIsLoading(true);
        const res = await fetch("/data/phoenix-city-boundary.geojson");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch boundary GeoJSON`);
        }
        const json = await res.json();
        if (isMounted) {
          setGeoData(json);
          setGeoError(null);
        }
      } catch (err) {
        console.error("Failed to load City of Phoenix boundary GeoJSON:", err);
        if (isMounted) {
          setGeoError("City boundary overlay unavailable. Rendering basemap.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBoundary();

    return () => {
      isMounted = false;
    };
  }, []);

  // Restrained municipal styling for official City of Phoenix limits
  const cityBoundaryStyle: L.PathOptions = {
    color: "#0284c7",
    weight: 2,
    opacity: 0.85,
    fillColor: "#0284c7",
    fillOpacity: 0.06,
  };

  return (
    <div className="relative w-full h-full min-h-[380px] bg-slate-950 overflow-hidden rounded">
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
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {geoData && (
          <>
            <GeoJSON data={geoData} style={cityBoundaryStyle} />
            <FitGeoJsonBounds geoData={geoData} />
          </>
        )}
      </MapContainer>

      {/* Loading overlay for GeoJSON boundary fetch */}
      {isLoading && (
        <div className="absolute top-2 right-2 z-[1000] bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded text-xs text-slate-300 shadow backdrop-blur-sm flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Loading Phoenix City Boundary...</span>
        </div>
      )}

      {/* Warning banner if GeoJSON failed to load */}
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
