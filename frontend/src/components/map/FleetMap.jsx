import React, { useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Marker, Popup, useMap, Circle,
} from "react-leaflet";
import L from "leaflet";
import { makeFleetVehicleIcon } from "../../utils/mapIcons";

// ─── Color Marker Factory ─────────────────────────────────────────────────────

// ─── FitAllMarkers ────────────────────────────────────────────────────────────
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
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [map, vehicles]);

  return null;
}

const FleetMap = ({ vehicles = [] }) => {
  const DEFAULT_CENTER = [23.0225, 72.5714]; // Ahmedabad center

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-(--card-border) shadow-2xl">
      <style>{`
        .fleet-custom-popup { pointer-events: none !important; margin-bottom: 25px; }
        .fleet-custom-popup .leaflet-popup-content-wrapper { 
          background: #0f172a !important; 
          border: 1px solid rgba(255,255,255,0.2) !important;
          border-radius: 8px !important;
          padding: 0 !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5) !important;
          pointer-events: none !important;
        }
        .fleet-custom-popup .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .fleet-custom-popup .leaflet-popup-tip { background: #0f172a !important; }
        .telematics-card { padding: 6px 8px; color: white; width: 125px; line-height: 1; }
        .telematics-card p { margin: 0 !important; padding: 0 !important; }
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
                icon={makeFleetVehicleIcon(v.type || "hatchback", v.status, v.status === 'active' ? 52 : 44)}
                eventHandlers={{
                  mouseover: (e) => e.target.openPopup(),
                  mouseout: (e) => e.target.closePopup()
                }}
              >
                <Popup className="fleet-custom-popup" closeButton={false} autoPan={true}>
                  <div className="telematics-card">
                    <div className="border-b border-white/10 pb-1 mb-1">
                      <p className="font-black text-[9px] text-white truncate">{v.driver}</p>
                      <p className="text-[7px] font-bold text-white/40 uppercase truncate">
                        {v.type} · {v.plate}
                      </p>
                    </div>

                    {v.activeRide && (
                      <div className="space-y-0.5 mb-1">
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                          <p className="text-[9px] text-white/90 font-bold truncate">
                            {v.activeRide.source?.address?.split(',')[0]}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                          <p className="text-[9px] text-white/90 font-bold truncate">
                            {v.activeRide.destination?.address?.split(',')[0]}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                        <p className={`text-[8px] font-black uppercase tracking-tight ${v.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {v.area}
                        </p>
                        <p className="text-[8px] font-black text-white/90">
                           {v.activeRide?.bookings?.[0]?.passenger?.name?.split(' ')[0] || "—"}
                        </p>
                    </div>
                  </div>
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
