import React, { useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Marker, Popup, useMap, Circle,
} from "react-leaflet";
import L from "leaflet";

// ─── Color Marker Factory ─────────────────────────────────────────────────────
function makeVehicleIcon(status) {
  const colors = {
    active: "emerald",
    idle: "blue",
    maint: "red",
    offline: "grey"
  };
  const color = colors[status] || "blue";
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  });
}

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
              {v.status === "active" && (
                 <Circle
                   center={[v.lat, v.lng]} 
                   radius={100}
                   pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.1, weight: 1 }}
                 />
              )}
              <Marker 
                position={[v.lat, v.lng]} 
                icon={makeVehicleIcon(v.status)}
              >
                <Popup className="custom-popup">
                  <div className="p-1">
                    <p className="font-black text-xs text-(--text-main) mb-1">{v.driver}</p>
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`h-1.5 w-1.5 rounded-full ${
                        v.status === 'active' ? 'bg-emerald-500' : 'bg-primary'
                       }`}></span>
                       <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                         {v.id} · {v.status}
                       </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-(--card-border) pt-2">
                       <div>
                         <p className="text-[8px] uppercase text-(--text-dim)">Fuel</p>
                         <p className="text-xs font-black">{v.fuel || "N/A"}</p>
                       </div>
                       <div>
                         <p className="text-[8px] uppercase text-(--text-dim)">Type</p>
                         <p className="text-xs font-black">{v.type}</p>
                       </div>
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
