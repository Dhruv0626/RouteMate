import React, { useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Marker, Popup, useMap,
} from "react-leaflet";
import L from "leaflet";
import { makeFleetVehicleIcon } from "../../utils/mapIcons";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:      { label: "IN TRIP",      color: "#10b981", glow: "rgba(16,185,129,0.35)" },
  idle:        { label: "PUBLISHED",    color: "#f59e0b", glow: "rgba(245,158,11,0.35)"  },
  online_only: { label: "ONLINE ONLY",  color: "#FFCC00", glow: "rgba(255,204,0,0.35)"   },
  offline:     { label: "OFFLINE",      color: "#64748b", glow: "rgba(100,116,139,0.2)"  },
  maint:       { label: "ATTENTION",    color: "#ef4444", glow: "rgba(239,68,68,0.35)"   },
};

// ── Auto-fit all markers on first load ───────────────────────────────────────
function FitAllMarkers({ vehicles }) {
  const map = useMap();
  const prev = useRef(null);

  useEffect(() => {
    if (!vehicles?.length) return;
    const key = vehicles.map(v => v.id).join(",");
    if (prev.current === key) return;
    prev.current = key;

    const points = vehicles.filter(v => v.lat && v.lng).map(v => [v.lat, v.lng]);
    if (!points.length) return;

    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [map, vehicles]);

  return null;
}

// ── Popup HTML builder (matches the reference image exactly) ─────────────────
const buildPopupHtml = (v) => {
  const sc = STATUS_CONFIG[v.status] || STATUS_CONFIG.online_only;

  // Trip route lines (only when on a trip)
  const tripLines = v.activeRide
    ? `<div style="padding:6px 10px 4px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
          <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0;"></div>
          <span style="font-size:9px;color:rgba(255,255,255,0.75);font-weight:700;font-family:sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">
            ${(v.activeRide.source?.address || "").split(",")[0]}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0;"></div>
          <span style="font-size:9px;color:rgba(255,255,255,0.75);font-weight:700;font-family:sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">
            ${(v.activeRide.destination?.address || "").split(",")[0]}
          </span>
        </div>
      </div>`
    : "";

  return `
    <div style="
      background:#0f172a;
      border:1px solid rgba(255,255,255,0.12);
      border-radius:10px;
      overflow:hidden;
      width:175px;
      box-shadow:0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      pointer-events:none;
    ">
      <!-- Driver name + vehicle info -->
      <div style="padding:9px 11px 6px;">
        <p style="
          margin:0;
          font-size:13px;
          font-weight:900;
          color:#ffffff;
          letter-spacing:-0.3px;
          line-height:1.2;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        ">${v.driver}</p>
        <p style="
          margin:3px 0 0;
          font-size:10px;
          font-weight:700;
          color:rgba(255,255,255,0.45);
          letter-spacing:0.3px;
          text-transform:uppercase;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        ">${v.type} · ${v.plate}</p>
      </div>

      <!-- Trip route (only in-trip drivers) -->
      ${tripLines}

      <!-- Status bar — matches the image exactly -->
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:6px 11px 7px;
        border-top:1px solid rgba(255,255,255,0.06);
        background:rgba(255,255,255,0.02);
      ">
        <span style="
          font-size:10px;
          font-weight:900;
          color:${sc.color};
          letter-spacing:0.8px;
          text-transform:uppercase;
          text-shadow:0 0 8px ${sc.glow};
        ">${sc.label}</span>
        <span style="
          width:18px;
          height:2px;
          background:${sc.color};
          border-radius:2px;
          opacity:0.7;
        "></span>
      </div>
    </div>
  `;
};

// ── Main FleetMap Component ───────────────────────────────────────────────────
const FleetMap = ({ vehicles = [] }) => {
  const DEFAULT_CENTER = [23.0225, 72.5714]; // Ahmedabad

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-(--card-border) shadow-2xl">
      {/* Override leaflet popup chrome globally */}
      <style>{`
        .fleet-popup-clean .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .fleet-popup-clean .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
          line-height: 1 !important;
        }
        .fleet-popup-clean .leaflet-popup-tip-container {
          display: none !important;
        }
        .fleet-popup-clean .leaflet-popup-close-button {
          display: none !important;
        }
      `}</style>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        style={{ width: "100%", height: "100%" }}
        zoomControl
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <FitAllMarkers vehicles={vehicles} />

        {vehicles.map((v) => {
          if (!v.lat || !v.lng) return null;

          return (
            <React.Fragment key={v.id}>
              <Marker
                position={[v.lat, v.lng]}
                icon={makeFleetVehicleIcon(v.type || "GO", v.status, v.status === "active" ? 52 : 44)}
                eventHandlers={{
                  mouseover: (e) => e.target.openPopup(),
                  mouseout:  (e) => e.target.closePopup(),
                }}
              >
                <Popup
                  className="fleet-popup-clean"
                  closeButton={false}
                  autoPan={false}
                  offset={[0, -28]}
                >
                  <div dangerouslySetInnerHTML={{ __html: buildPopupHtml(v) }} />
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default FleetMap;
