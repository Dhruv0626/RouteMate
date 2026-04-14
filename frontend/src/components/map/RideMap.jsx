import React, { useEffect, useRef } from "react";
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, useMap, Circle, ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import { makeVehicleIcon, makeLiveIcon, makeRouteLabelIcon, makePin } from "../../utils/mapIcons";

const greenIcon = makePin("#22c55e", "START");
const redIcon   = makePin("#ef4444", "DEST");
const blueIcon  = makePin("#3b82f6", "PICKUP");
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
      position: "absolute", bottom: 12, left: 12, zIndex: 900,
      background: arrived ? "rgba(16,85,16,0.85)" : "rgba(10,16,30,0.65)",
      backdropFilter: "blur(20px)",
      border: `1px solid ${arrived ? "rgba(32, 34, 33, 0.3)" : (route?.color ? route.color + "40" : "rgba(150,150,255,0.2)")}`,
      borderRadius: 14, padding: "10px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      color: "#f1f5f9", fontFamily: "'Inter',sans-serif",
      minWidth: 148, pointerEvents: "all", transition: "all 0.35s ease",
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
  isDark          = false,       // dark/light tile switching

  // Navigation
  isNavigating    = false,
  currentPos      = null,
  heading         = 0,
  travelledCoords = [],
  remainingCoords = [],
  remainingDist   = null,
  remainingMin    = null,
  arrived         = false,
  vehicleType     = "GO",
  driverVehicleType = null,
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
        style={{ width: "100%", height: "100%" }} zoomControl={false} scrollWheelZoom>
        <ZoomControl position="bottomright" />
 
        {/* Dark/Light aware tiles */}
        <TileLayer
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
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
        {(!isNavigating || !showSplit) && (() => {
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

        {/* Live position (pulsing dot for user OR 3D vehicle for driver) */}
        {livePos?.lat != null && livePos?.lng != null && (
          <>
            <Circle
              center={[livePos.lat, livePos.lng]} radius={30}
              pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.15, weight: 1 }}
            />
            <Marker 
              position={[livePos.lat, livePos.lng]} 
              icon={driverVehicleType ? makeVehicleIcon(driverVehicleType, heading) : liveIcon}
            >
              <Popup>
                <p style={{ fontWeight: 700, color: "#4f46e5", fontSize: 12, margin: 0 }}>
                    📍 {driverVehicleType ? "Your Vehicle" : "Your Location"}
                </p>
              </Popup>
            </Marker>
          </>
        )}

        {/* Selected Driver (3D Vehicle) */}
        {isNavigating && currentPos && (
           <Marker 
              position={[currentPos.lat, currentPos.lng]} 
              icon={makeVehicleIcon(vehicleType, heading)}
            >
              <Popup>
                <p style={{ fontWeight: 700, color: "#4f46e5", fontSize: 12, margin: 0 }}>📍 Driver Position</p>
              </Popup>
            </Marker>
        )}

        {/* Pickup marker */}
        {pickup?.lat != null && pickup?.lng != null && !arrived && (
          <Marker position={[pickup.lat, pickup.lng]} icon={greenIcon}>
            <Popup>
              <p style={{ fontWeight: 700, color: "#166534", fontSize: 13, marginBottom: 4 }}>📍 Pickup</p>
              <p style={{ margin: 0, fontSize: 12 }}>{pickup.name || "Pickup Location"}</p>
            </Popup>
          </Marker>
        )}

        {/* Dropoff marker */}
        {dropoff?.lat != null && dropoff?.lng != null && (
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
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={makeVehicleIcon(driverLocation.vehicleType)}>
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
            <Marker key={ride._id} position={[ride.source.location.coordinates[1], ride.source.location.coordinates[0]]} icon={makeVehicleIcon(ride.vehicleType)}>
              <Popup>
                <div style={{ padding: '2px' }}>
                  <p style={{ fontWeight: 800, color: "var(--text-main)", fontSize: 13, marginBottom: 4 }}>
                    {ride.vehicleType}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-dim)' }}>
                    {ride.driver?.name} is heading to {ride.destination.address.split(',')[0]}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}

      </MapContainer>
    </div>
  );
};

export default RideMap;
