import React, { useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, useMap, Circle,
} from "react-leaflet";
import L from "leaflet";

// ─── Color Marker Factory ─────────────────────────────────────────────────────
function makeColorIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  });
}

// ─── Pulsing "You Are Here" icon ──────────────────────────────────────────────
function makeLiveIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:#6366f1;border:3px solid #fff;
      border-radius:50%;animation:pulse-rm 1.5s ease-out infinite;">
      <style>@keyframes pulse-rm{0%{box-shadow:0 0 0 0 rgba(99,102,241,.7);}
      70%{box-shadow:0 0 0 12px rgba(99,102,241,0);}
      100%{box-shadow:0 0 0 0 rgba(99,102,241,0);}}</style></div>`,
    className: "", iconSize: [18, 18], iconAnchor: [9, 9],
  });
}

// ─── Route label icon (pill badge at midpoint) ────────────────────────────────
function makeRouteLabelIcon(route, isSelected) {
  return L.divIcon({
    html: `<div style="
      background:${route.color};color:#fff;
      font-size:10px;font-weight:700;font-family:'Inter',sans-serif;
      padding:4px 9px;border-radius:20px;white-space:nowrap;
      box-shadow:0 2px 10px rgba(0,0,0,0.4);
      border:${isSelected ? "2px solid #fff" : "1.5px solid rgba(255,255,255,0.55)"};
      opacity:${isSelected ? 1 : 0.82};
      pointer-events:none;
    ">${route.label} · ${route.durationMin} min</div>`,
    className: "",
    iconAnchor: [0, 0],
  });
}

const greenIcon = makeColorIcon("green");
const redIcon   = makeColorIcon("red");
const blueIcon  = makeColorIcon("blue");
const liveIcon  = makeLiveIcon();

// ─── FitAllRoutes: fit map to cover all route geometries ──────────────────────
function FitAllRoutes({ routes, active }) {
  const map = useMap();
  const prev = useRef(null);

  useEffect(() => {
    if (active) return;
    if (!routes?.length) return;
    // Only re-fit if routes actually changed
    const key = routes.map((r) => r.id).join(",");
    if (prev.current === key) return;
    prev.current = key;

    const all = routes.flatMap((r) => r.coords ?? []);
    if (!all.length) return;
    const bounds = L.latLngBounds(all);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [55, 55], maxZoom: 14 });
  }, [map, routes, active]);

  return null;
}

// ─── InitialCenter: pan to user location on first load ───────────────────────
function InitialCenter({ userLocation, skip }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || skip || !userLocation) return;
    map.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    done.current = true;
  }, [map, userLocation, skip]);
  return null;
}

// ─── NavigationFollower: keep map on live position ────────────────────────────
function NavigationFollower({ currentPos }) {
  const map = useMap();
  useEffect(() => {
    if (!currentPos) return;
    map.setView([currentPos.lat, currentPos.lng], Math.max(map.getZoom(), 16), {
      animate: true, duration: 0.8,
    });
  }, [map, currentPos]);
  return null;
}

// ─── Floating route info badge (top-right of map) ────────────────────────────
function RouteInfoBadge({ route, isNavigating, remainingDist, remainingMin, arrived }) {
  const show = route || (isNavigating && remainingDist != null);
  if (!show) return null;

  const distText = isNavigating && remainingDist != null
    ? `${(remainingDist / 1000).toFixed(1)} km`
    : route?.distanceStr;
  const minText = isNavigating && remainingMin != null
    ? remainingMin
    : route?.durationMin;

  return (
    <div style={{
      position: "absolute", top: 12, right: 12, zIndex: 1000,
      background: arrived ? "rgba(16,85,16,0.93)" : "rgba(10,16,30,0.90)",
      backdropFilter: "blur(14px)",
      border: `1px solid ${arrived ? "rgba(34,197,94,0.5)" : (route?.color ? route.color + "70" : "rgba(99,102,241,0.45)")}`,
      borderRadius: 14, padding: "10px 16px",
      boxShadow: `0 4px 24px ${arrived ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.15)"}`,
      color: "#f1f5f9", fontFamily: "'Inter',sans-serif",
      minWidth: 148, pointerEvents: "none", transition: "all 0.35s ease",
    }}>
      {arrived ? (
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#4ade80" }}>🎉 Arrived!</p>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#94a3b8",
            textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
            {isNavigating ? "Remaining" : route?.label ?? "Selected Route"}
          </p>
          {distText && (
            <span style={{ display: "block", fontSize: 20, fontWeight: 800,
              color: isNavigating ? "#a5b4fc" : (route?.color ?? "#6366f1"), marginBottom: 2 }}>
              {distText}
            </span>
          )}
          {minText != null && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>~{minText} min</span>
          )}
        </>
      )}
    </div>
  );
}

// ─── RideMap ──────────────────────────────────────────────────────────────────
const RideMap = ({
  pickup, dropoff, driverLocation,
  userLocation    = null,
  allRoutes       = [],          // all fetched route objects
  availableRides  = [],          // array of rides featuring coordinate drops
  selectedRouteIdx = 0,          // which is highlighted
  onRouteSelect   = null,        // (idx) => void — called when polyline clicked

  // Navigation
  isNavigating    = false,
  currentPos      = null,
  heading         = 0,
  travelledCoords = [],
  remainingCoords = [],
  remainingDist   = null,
  remainingMin    = null,
  arrived         = false,
}) => {
  const DEFAULT_CENTER = [23.0225, 72.5714];
  const allPoints      = [pickup, dropoff, driverLocation].filter(Boolean);
  const livePos        = isNavigating ? currentPos : userLocation;
  const selectedRoute  = allRoutes[selectedRouteIdx] ?? null;
  const showSplit      = isNavigating && (travelledCoords.length > 0 || remainingCoords.length > 0);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%",
      borderRadius: 16, overflow: "hidden" }}>

      {/* Floating badge */}
      <RouteInfoBadge
        route={selectedRoute}
        isNavigating={isNavigating}
        remainingDist={remainingDist}
        remainingMin={remainingMin}
        arrived={arrived}
      />

      <MapContainer center={DEFAULT_CENTER} zoom={12}
        style={{ width: "100%", height: "100%" }} zoomControl scrollWheelZoom>

        {/* OSM tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* Center on user if no routes loaded yet */}
        <InitialCenter userLocation={userLocation} skip={allRoutes.length > 0 || allPoints.length > 0} />

        {/* Auto-fit map to show all routes */}
        {!isNavigating && allRoutes.length > 0 && (
          <FitAllRoutes routes={allRoutes} active={isNavigating} />
        )}

        {/* Navigation follower */}
        {isNavigating && currentPos && <NavigationFollower currentPos={currentPos} />}

        {/* ── All route polylines — rendered pre-navigation ─────────────────
            RENDER ORDER: non-selected first (underneath), selected last (on top)
            KEY includes selection state to force react-leaflet to remount and
            correctly apply new pathOptions whenever selection changes.          */}
        {!isNavigating && (() => {
          // Split: draw unselected below, selected on top
          const unselected = allRoutes.filter((_, i) => i !== selectedRouteIdx);
          const selected   = allRoutes.filter((_, i) => i === selectedRouteIdx);
          return (
            <>
              {/* Unselected routes — visible but thinner */}
              {unselected.map((route) => (
                <Polyline
                  key={`unsel-${route.id}`}
                  positions={route.coords}
                  pathOptions={{
                    color:     route.color,
                    weight:    5,
                    opacity:   0.70,
                    dashArray: "12 8",
                    lineCap:   "round",
                    lineJoin:  "round",
                  }}
                  eventHandlers={{
                    click:     () => onRouteSelect?.(route.id),
                    mouseover: (e) => e.target.setStyle({ weight: 7, opacity: 0.90, dashArray: null }),
                    mouseout:  (e) => e.target.setStyle({ weight: 5, opacity: 0.70, dashArray: "12 8" }),
                  }}
                />
              ))}

              {/* Selected route — solid, thick, on top */}
              {selected.map((route) => (
                <Polyline
                  key={`sel-${route.id}`}
                  positions={route.coords}
                  pathOptions={{
                    color:   route.color,
                    weight:  8,
                    opacity: 0.95,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              ))}
            </>
          );
        })()}

        {/* Route label badge at midpoint of each route */}
        {!isNavigating && allRoutes.map((route, idx) => {
          const isSelected = idx === selectedRouteIdx;
          const mid = route.coords?.[Math.floor((route.coords.length ?? 0) / 2)];
          if (!mid) return null;
          return (
            <Marker
              key={`lbl-${route.id}-${isSelected}`}    // key change forces icon refresh
              position={mid}
              icon={makeRouteLabelIcon(route, isSelected)}
              zIndexOffset={isSelected ? 500 : 100}
              eventHandlers={{ click: () => onRouteSelect?.(idx) }}
            />
          );
        })}

        {/* Navigation: travelled segment (grey dashed) */}
        {showSplit && travelledCoords.length > 1 && (
          <Polyline
            positions={travelledCoords}
            pathOptions={{ color: "#475569", weight: 4, opacity: 0.55, dashArray: "6 4" }}
          />
        )}

        {/* Navigation: remaining segment (selected route color) */}
        {showSplit && remainingCoords.length > 1 && (
          <Polyline
            positions={remainingCoords}
            pathOptions={{ color: selectedRoute?.color ?? "#6366f1", weight: 7, opacity: 0.92 }}
          />
        )}

        {/* Live position (pulsing dot) */}
        {livePos && (
          <>
            <Circle
              center={[livePos.lat, livePos.lng]} radius={30}
              pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.15, weight: 1 }}
            />
            <Marker position={[livePos.lat, livePos.lng]} icon={liveIcon}>
              <Popup>
                <p style={{ fontWeight: 700, color: "#4f46e5", fontSize: 12, margin: 0 }}>📍 Your Location</p>
              </Popup>
            </Marker>
          </>
        )}

        {/* Pickup marker */}
        {pickup && !arrived && (
          <Marker position={[pickup.lat, pickup.lng]} icon={greenIcon}>
            <Popup>
              <p style={{ fontWeight: 700, color: "#166534", fontSize: 13, marginBottom: 4 }}>📍 Pickup</p>
              <p style={{ margin: 0, fontSize: 12 }}>{pickup.name || "Pickup Location"}</p>
            </Popup>
          </Marker>
        )}

        {/* Dropoff marker */}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={arrived ? greenIcon : redIcon}>
            <Popup>
              <p style={{ fontWeight: 700, color: arrived ? "#166534" : "#991b1b", fontSize: 13, marginBottom: 4 }}>
                {arrived ? "✅ Arrived!" : "🏁 Dropoff"}
              </p>
              <p style={{ margin: 0, fontSize: 12 }}>{dropoff.name || "Dropoff Location"}</p>
            </Popup>
          </Marker>
        )}

        {/* External driver (if only one) */}
        {driverLocation && !isNavigating && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={blueIcon}>
            <Popup>
              <p style={{ fontWeight: 700, color: "#1e40af", fontSize: 13, marginBottom: 4 }}>🚗 Driver</p>
              <p style={{ margin: 0, fontSize: 12 }}>{driverLocation.name || "Driver Location"}</p>
            </Popup>
          </Marker>
        )}

        {/* Available Published Rides */ }
        {!isNavigating && availableRides.map((ride) => {
          if (!ride.source?.location?.coordinates) return null;
          return (
            <Marker key={ride._id} position={[ride.source.location.coordinates[1], ride.source.location.coordinates[0]]} icon={blueIcon}>
              <Popup>
                <p style={{ fontWeight: 700, color: "#1e40af", fontSize: 13, marginBottom: 4 }}>🚗 {ride.driver?.name || "Driver"}</p>
                <p style={{ margin: 0, fontSize: 12 }}>Heading to {ride.destination.address}</p>
              </Popup>
            </Marker>
          )
        })}

      </MapContainer>
    </div>
  );
};

export default RideMap;
