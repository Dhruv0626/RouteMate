import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Navigation, Loader2, User as UserIcon, MapPin, IndianRupee, Phone, RefreshCw } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import socket from "../services/socket";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

import { makeVehicleIcon, makeDestPin } from "../utils/mapIcons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Haversine distance in metres between two [lat,lng] points */
const distanceMetres = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Minimum distance (metres) from a point to any segment on a polyline */
const distanceToPolyline = (lat, lng, polyline) => {
  if (!polyline || polyline.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const [aLat, aLng] = polyline[i];
    const [bLat, bLng] = polyline[i + 1];
    const seg = distanceMetres(aLat, aLng, bLat, bLng);
    if (seg === 0) {
      min = Math.min(min, distanceMetres(lat, lng, aLat, aLng));
      continue;
    }
    const t = Math.max(0, Math.min(1,
      ((lat - aLat) * (bLat - aLat) + (lng - aLng) * (bLng - aLng)) / (seg * seg)
    ));
    const proj = [aLat + t * (bLat - aLat), aLng + t * (bLng - aLng)];
    min = Math.min(min, distanceMetres(lat, lng, proj[0], proj[1]));
  }
  return min;
};

// ─── OSRM fetch with retry ─────────────────────────────────────────────────────
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

const fetchOSRM = async (fromLat, fromLng, toLat, toLng, signal) => {
  const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res = await fetch(url, signal ? { signal } : undefined);
  const data = await res.json();
  if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
    const path   = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    // Multiply OSRM duration by 1.4 for more realistic city traffic estimates
    const etaMins = Math.round((data.routes[0].duration * 1.4) / 60);
    return { path, etaMins };
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────
const PickupMap = () => {
  const { rideId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { showAlert } = useDialog();

  const [ride, setRide]                 = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDriver, setIsDriver]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [route, setRoute]               = useState([]);        // [[lat,lng], ...]
  const [liveEtaMins, setLiveEtaMins]   = useState(null);
  const [destEtaMins, setDestEtaMins]   = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [gpsReady, setGpsReady]         = useState(false);     // first GPS fix received
  const [isPerspectiveMode, setIsPerspectiveMode] = useState(true);
  const [map, setMap]                   = useState(null);
  const [heading, setHeading]           = useState(0);         // car rotation

  const abortRef   = useRef(null);
  const prevLocRef = useRef(null);   // last location that triggered a route fetch
  const REROUTE_THRESHOLD_M = 60;    // metres off-route before rerouting

  // ─── Derived ──────────────────────────────────────────────────────────────
  const firstPassenger = ride?.bookings
    ? ride.bookings.find(b => b.status === "confirmed" || b.status === "pending")
    : ride?.passenger
      ? { passenger: ride.passenger, passengerSource: ride.source, passengerDestination: ride.destination, amountPaid: ride.fare?.totalWithTax || ride.fare?.total }
      : null;

  const pickupCoords    = firstPassenger?.passengerSource?.location?.coordinates;      // [lng, lat]
  const destCoords      = firstPassenger?.passengerDestination?.location?.coordinates; // [lng, lat]
  const isActive        = ride?.status === "in_progress";

  // ─── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();
    socket.emit("join_ride", rideId);
    socket.on("location_update", (data) => setDriverLocation({ lat: data.lat, lng: data.lng }));
    
    // Listen for ride status updates (arrived, in_progress, completed)
    socket.on("ride_status_update", (data) => {
      setRide(prev => {
        if (!prev) return null;
        return { ...prev, status: data.status };
      });
      
      if (data.status === "completed") {
        showAlert("Your ride has been completed successfully! Thank you for choosing RouteMate.", "Ride Completed", "success");
        setTimeout(() => navigate("/passenger/dashboard"), 3500);
      }
      if (data.status === "in_progress") {
         showAlert("Your trip has started! Relax and enjoy the ride.", "Trip Started", "success");
      }
    });

    return () => { 
      socket.off("location_update"); 
      socket.off("ride_status_update");
      socket.disconnect(); 
    };
  }, [rideId]);

  // ─── Fetch ride ───────────────────────────────────────────────────────────
  useEffect(() => {
    const go = async () => {
      try {
        const res = await api.get(`/published-rides/${rideId}`);
        if (res.data.success) {
          const found = res.data.data;
          setRide(found);
          setIsDriver(user.role === "driver" || found.driver?._id === user.id);
        }
      } catch (err) {
        console.error("Failed to load ride", err);
      } finally {
        setLoading(false);
      }
    };
    go();
  }, [rideId, user.role]);

  // ─── Driver GPS: immediate fix + continuous watch ─────────────────────────
  useEffect(() => {
    if (!isDriver) return;

    const settings = JSON.parse(localStorage.getItem("appSettings") || "{}");
    if (!settings.locationTracking) {
      showAlert("Please enable Location Tracking in Settings to share live location.", "Location Required", "warning");
      return;
    }
    if (!navigator.geolocation) return;

    // 1. Immediate one-shot to get a fast first fix
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setDriverLocation(coords);
        setGpsReady(true);
        socket.emit("driver_location_update", { rideId, lat: coords.lat, lng: coords.lng });
      },
      (e) => console.warn("GPS initial fix error:", e.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // 2. Continuous watch
    const wid = navigator.geolocation.watchPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setDriverLocation(coords);
        setGpsReady(true);
        socket.emit("driver_location_update", { rideId, lat: coords.lat, lng: coords.lng });
      },
      (e) => console.warn("GPS watch error:", e.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(wid);
  }, [isDriver, rideId]);

  // ─── Route fetching with smart rerouting ──────────────────────────────────
  const fetchRoute = useCallback(async (dLat, dLng, targetLng, targetLat, isActive) => {
    if (!targetLng || !targetLat) return;

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setRouteLoading(true);
    try {
      // OSRM: [lng,lat] format
      const result = await fetchOSRM(dLat, dLng, targetLat, targetLng, abortRef.current.signal);
      if (result) {
        setRoute(result.path);
        if (isActive) setDestEtaMins(result.etaMins);
        else setLiveEtaMins(result.etaMins);
        prevLocRef.current = { lat: dLat, lng: dLng };

        // Update heading towards first point of route
        if (result.path.length > 1) {
          const p1 = result.path[0];
          const angle = Math.atan2(p1[1] - dLng, p1[0] - dLat) * (180 / Math.PI);
          setHeading(angle);
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("OSRM error:", e);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!driverLocation) return;
    const { lat, lng } = driverLocation;

    const targetCoords = isActive ? destCoords : pickupCoords; // [lng, lat]
    if (!targetCoords || targetCoords[0] === 0) return;

    // First fetch: no route yet
    if (route.length === 0) {
      fetchRoute(lat, lng, targetCoords[0], targetCoords[1], isActive);
      return;
    }

    // Reroute if driver deviated > threshold from current route
    const deviance = distanceToPolyline(lat, lng, route);
    if (deviance > REROUTE_THRESHOLD_M) {
      console.log(`Rerouting: deviance ${Math.round(deviance)}m > ${REROUTE_THRESHOLD_M}m`);
      fetchRoute(lat, lng, targetCoords[0], targetCoords[1], isActive);
    } else {
      // Still on route — just refresh ETA cheaply (no polyline re-draw)
      const prev = prevLocRef.current;
      if (prev && distanceMetres(prev.lat, prev.lng, lat, lng) < 20) return; // too close, skip
      (async () => {
        try {
          const url = `${OSRM_BASE}/${lng},${lat};${targetCoords[0]},${targetCoords[1]}?overview=false`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.code === "Ok" && data.routes?.[0]) {
            const mins = Math.round((data.routes[0].duration * 1.4) / 60);
            if (isActive) setDestEtaMins(mins);
            else setLiveEtaMins(mins);
          }
        } catch (_) {}
      })();
      prevLocRef.current = { lat, lng };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation?.lat, driverLocation?.lng, ride?.status, pickupCoords?.[0], destCoords?.[0]]);

  const vehicleIcon = useMemo(() => {
    if (!ride) return null;
    return makeVehicleIcon(ride.vehicleType, heading);
  }, [ride?.vehicleType, heading]);

  const targetIcon = useMemo(() => {
    return makeDestPin(isActive);
  }, [isActive]);

  // ─── Memoized display route (Path Cutting) ───────────────────────────────
  const displayRoute = useMemo(() => {
    if (route.length <= 1) return route;
    if (!driverLocation) return route;

    let minStep = Infinity;
    let closestIdx = 0;
    // Fast O(N) scan to find closest point on route
    for (let i = 0; i < route.length; i++) {
      const d = distanceMetres(driverLocation.lat, driverLocation.lng, route[i][0], route[i][1]);
      if (d < minStep) {
        minStep = d;
        closestIdx = i;
      }
    }
    // Only slice if we are reasonably close to the path
    return minStep < 200 ? route.slice(closestIdx) : route;
  }, [route, driverLocation?.lat, driverLocation?.lng]);

  // Reset route when ride transitions from pickup → active
  const prevStatus = useRef(null);
  useEffect(() => {
    if (!ride) return;
    if (prevStatus.current && prevStatus.current !== ride.status) {
      setRoute([]);
      setLiveEtaMins(null);
      setDestEtaMins(null);
    }
    prevStatus.current = ride.status;
  }, [ride?.status]);

  // ─── Passenger fallback: show route immediately from ride's stored source ──
  // Fires once ride data is loaded; replaced by live-location route when socket arrives
  const fallbackFetchedRef = useRef(false);
  useEffect(() => {
    if (!ride || isDriver || fallbackFetchedRef.current || driverLocation) return;
    const isActive = ride.status === "in_progress";
    const targetCoords = isActive ? destCoords : pickupCoords;
    if (!targetCoords) return;

    // Use the driver's published source as a rough starting point
    const srcCoords = ride.source?.location?.coordinates; // [lng, lat]
    if (!srcCoords) return;

    fallbackFetchedRef.current = true;
    fetchRoute(srcCoords[1], srcCoords[0], targetCoords[0], targetCoords[1], isActive);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride, isDriver, driverLocation, pickupCoords?.[0], destCoords?.[0]]);

  // ─── Perspective Mode Tracking ─────────────────────────────────────────────
  useEffect(() => {
    if (isPerspectiveMode && map && driverLocation) {
      map.setView([driverLocation.lat, driverLocation.lng], 18, { animate: true, duration: 1.0 });
    }
  }, [isPerspectiveMode, driverLocation, map]);

  // ─── Auto-fit map bounds ───────────────────────────────────────────────────
  const hasFittedBounds = useRef(null);
  useEffect(() => {
    if (!map || isPerspectiveMode) return;
    const phaseKey = ride?.status || "unknown";
    if (hasFittedBounds.current === phaseKey) return;
    
    const target   = isActive ? destCoords : pickupCoords;
    if (!target) return;

    // Use live driver location if available, else fall back to ride source
    const srcCoords = ride?.source?.location?.coordinates; // [lng, lat]
    const from = driverLocation
      ? [driverLocation.lat, driverLocation.lng]
      : srcCoords ? [srcCoords[1], srcCoords[0]] : null;
    if (!from) return;

    const bounds = L.latLngBounds([from, [target[1], target[0]]]);
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true });
    
    hasFittedBounds.current = phaseKey;
  }, [map, driverLocation?.lat, driverLocation?.lng, ride?.status, isPerspectiveMode]);
  
  const handleRecenter = () => {
    if (!map) return;
    const target = isActive ? destCoords : pickupCoords;
    if (!target || !driverLocation) return;
    const bounds = L.latLngBounds([[driverLocation.lat, driverLocation.lng], [target[1], target[0]]]);
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true });
  };


  // ─── Manual reroute button ────────────────────────────────────────────────
  const handleManualReroute = () => {
    if (!driverLocation) return;
    const targetCoords = isActive ? destCoords : pickupCoords;
    setRoute([]);
    fetchRoute(driverLocation.lat, driverLocation.lng, targetCoords[0], targetCoords[1], isActive);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#05080f] gap-3">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
      <p className="text-white/40 text-sm">Loading ride data…</p>
    </div>
  );

  if (!ride) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05080f] text-white">
      Ride not found
    </div>
  );

  const mapCenter = driverLocation ||
    (ride.source?.location?.coordinates
      ? [ride.source.location.coordinates[1], ride.source.location.coordinates[0]]
      : [23.0225, 72.5714]);

  const targetForMarker = isActive ? destCoords : pickupCoords;
  const targetAddress   = isActive
    ? (firstPassenger?.passengerDestination?.address || ride.destination?.address)
    : (firstPassenger?.passengerSource?.address || ride.source?.address);

  return (
    <div className="relative flex flex-col h-screen text-white bg-black overflow-hidden">
      {/* ── Header ── */}
      <div className="absolute top-0 w-full z-50 p-4 shrink-0 flex items-center justify-between pointer-events-none">
        <button
            onClick={() => navigate(-1)}
            className="pointer-events-auto bg-black/60 backdrop-blur border border-white/10 p-3 rounded-full hover:bg-white/10 transition"
          >
            <ArrowLeft size={20} />
          </button>

        <div className="flex items-center gap-2">
          {/* Status pill */}
          <div className="bg-black/60 backdrop-blur border border-white/10 px-4 py-2 rounded-full pointer-events-auto flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
            <span className="text-xs font-black uppercase tracking-wider">
              {isActive ? "Trip Ongoing" : ride.status === "arrived" ? "Arrived – Wait OTP" : "Heading to Pickup"}
            </span>
          </div>

          {/* Route loading indicator */}
          {routeLoading && (
            <div className="bg-blue-500/20 backdrop-blur border border-blue-500/30 p-2 rounded-full pointer-events-auto">
              <RefreshCw size={14} className="text-blue-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* ── No GPS Banner (driver only) ── */}
      {isDriver && !gpsReady && (
        <div className="absolute top-20 left-4 right-4 z-50 bg-amber-500/90 backdrop-blur text-black text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 animate-pulse">
          <span>📡 Acquiring GPS signal… Please stay on this screen.</span>
        </div>
      )}

      {/* ── Map ── */}
      <div className="flex-1 w-full relative z-0 nav-tilt-wrapper">
        <div 
          className={`w-full h-full transform-gpu`}
          style={isPerspectiveMode ? { 
            transform: `scale(1.5) rotateZ(${-heading}deg)`,
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
          } : {
            transform: `scale(1) rotateZ(0deg)`,
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <MapContainer center={mapCenter} zoom={14} className="w-full h-full" zoomControl={false} ref={setMap}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
            maxZoom={19}
          />

          {/* Target pin (pickup or destination) */}
          {targetForMarker && (
            <Marker position={[targetForMarker[1], targetForMarker[0]]} icon={targetIcon}>
              <Popup><b style={{ color: "#ef4444" }}>{isActive ? "Destination" : "Passenger Pickup"}</b><br />{targetAddress}</Popup>
            </Marker>
          )}

          {/* Driver marker (using 3D vehicle icon) */}
          {driverLocation && vehicleIcon && (
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={vehicleIcon}>
              <Popup><b>{isDriver ? "You" : "Driver"}</b></Popup>
            </Marker>
          )}

          {/* Route polyline – memoized displayRoute used for performance */}
          {displayRoute.length > 1 && (
            <>
              {/* Glow / shadow layer (Simplified) */}
              <Polyline
                positions={displayRoute}
                pathOptions={{ color: "#1e3a8a", weight: 9, opacity: 0.15, lineCap: "round", lineJoin: "round" }}
              />
              {/* Main line */}
              <Polyline
                positions={displayRoute}
                pathOptions={{ color: isActive ? "#6366f1" : "#3b82f6", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" }}
              />
              {/* Animated dashes (Only if route isn't excessively long to avoid lag) */}
              {displayRoute.length < 500 && (
                <Polyline
                  positions={displayRoute}
                  pathOptions={{ color: "white", weight: 1.5, opacity: 0.4, lineCap: "round", lineJoin: "round", dashArray: "10 20" }}
                />
              )}
            </>
          )}

          {/* Loading placeholder – straight dashed line while OSRM loads */}
          {route.length === 0 && targetForMarker && (() => {
            const srcCoords = ride?.source?.location?.coordinates;
            const fromLat = driverLocation?.lat ?? (srcCoords ? srcCoords[1] : null);
            const fromLng = driverLocation?.lng ?? (srcCoords ? srcCoords[0] : null);
            if (fromLat == null || fromLng == null) return null;
            return (
              <Polyline
                positions={[
                  [fromLat, fromLng],
                  [targetForMarker[1], targetForMarker[0]],
                ]}
                pathOptions={{ color: "#6b7280", weight: 3, opacity: 0.5, dashArray: "6 10" }}
              />
            );
          })()}
        </MapContainer>
        </div>
      </div>

      {/* ── Bottom HUD ── */}
      <div className="absolute bottom-4 left-4 right-4 z-50 pointer-events-none flex flex-col gap-3">
        {/* Recenter & Perspective Buttons */}
        <div className="flex flex-col items-end gap-3">
             <button
                onClick={() => {
                  setIsPerspectiveMode(!isPerspectiveMode);
                  if (!isPerspectiveMode && map && driverLocation) {
                    map.setView([driverLocation.lat, driverLocation.lng], 18, { animate: true });
                  } else if (isPerspectiveMode && map && driverLocation) {
                    const target = isActive ? destCoords : pickupCoords;
                    if (target) map.fitBounds(
                      L.latLngBounds([[driverLocation.lat, driverLocation.lng], [target[1], target[0]]]),
                      { padding: [80, 80], animate: true }
                    );
                  }
                }}
                className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
                  isPerspectiveMode 
                  ? "bg-primary text-black border-none" 
                  : "bg-black/60 backdrop-blur border border-white/15 text-white"
                }`}
                title="Toggle Navigation View"
             >
                <Navigation size={20} className={isPerspectiveMode ? "fill-black" : ""} />
             </button>
             <button
                onClick={handleManualReroute}
                disabled={routeLoading}
                className="pointer-events-auto bg-black/60 backdrop-blur border border-white/15 text-white p-3 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all disabled:opacity-50"
                title="Refresh Route"
             >
                <RefreshCw size={20} className={routeLoading ? "animate-spin" : ""} />
             </button>
        </div>
        
        <div className="bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 pointer-events-auto shadow-2xl">

          {isDriver ? (
            /* ─── DRIVER HUD ─── */
            <div className="flex flex-col gap-3">
              {/* ETA row */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                    {isActive ? "ETA to Destination" : "ETA to Pickup"}
                  </p>
                  <p className="text-lg font-black text-white">
                    {(isActive ? destEtaMins : liveEtaMins) !== null
                      ? `~${isActive ? destEtaMins : liveEtaMins} min`
                      : routeLoading ? "Calculating…" : gpsReady ? "Route loading…" : "Acquiring GPS…"}
                  </p>
                </div>
              </div>

              {/* Destination info */}
              <div className="flex items-start gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                <MapPin size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-white/70 leading-snug">{targetAddress || "Loading address…"}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/start-ride/${rideId}`)}
                  className="flex-1 bg-primary text-black font-black py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm"
                >
                  <Navigation size={18} />
                  Pickup Done
                </button>
                {firstPassenger?.passenger?.Mobile_no && (
                  <a
                    href={`tel:${firstPassenger.passenger.Mobile_no}`}
                    className="flex-1 bg-primary text-black font-black py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm"
                  >
                    <Phone size={18} />
                    Call
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* ─── PASSENGER HUD ─── */
            <div className="flex flex-col gap-3">
              {/* Status banner */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                ride.status === "arrived"
                  ? "bg-violet-500/10 border-violet-500/30"
                  : ride.status === "in_progress"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              }`}>
                <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                  ride.status === "arrived" ? "bg-violet-500"
                  : ride.status === "in_progress" ? "bg-emerald-500"
                  : "bg-amber-500"
                }`} />
                <span className={`text-xs font-black uppercase tracking-widest ${
                  ride.status === "arrived" ? "text-violet-400"
                  : ride.status === "in_progress" ? "text-emerald-400"
                  : "text-amber-400"
                }`}>
                  {ride.status === "arrived" ? "🎯 Driver has arrived at pickup!"
                   : ride.status === "in_progress" ? "🚀 Ride in progress"
                   : "🚗 Driver is on the way"}
                </span>
              </div>

              {/* Driver info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                  {ride.driver?.profileImage
                    ? <img src={ride.driver.profileImage} alt="" className="w-full h-full object-cover" />
                    : <UserIcon size={22} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm">{ride.driver?.name || "Your Driver"}</p>
                      <p className="text-[10px] text-white/40 font-medium">{(ride.vehicleType || "Vehicle").toUpperCase()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {driverLocation && (
                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-[9px] font-black text-emerald-400 uppercase">Live</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                        <IndianRupee size={9} className="text-emerald-400" />
                        <span className="text-xs font-black text-emerald-400">{firstPassenger?.amountPaid || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ETA / OTP info */}
              {ride.status === "arrived" ? (
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-center">
                  <p className="text-sm font-black text-violet-300">Share your OTP with the driver</p>
                  <p className="text-[11px] text-white/50 mt-1">Your OTP was sent in your booking confirmation notification.</p>
                </div>
              ) : ride.status === "in_progress" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-sm font-black text-emerald-400 text-center">
                    {destEtaMins !== null
                      ? destEtaMins <= 1 ? "🏁 Arriving at destination soon!"
                      : `~${destEtaMins} min to destination`
                      : "Trip is ongoing — relax!"}
                  </p>
                  <p className="text-[11px] text-white/50 mt-1 text-center">Live ETA · Updates as driver moves</p>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white">
                        {liveEtaMins !== null
                          ? liveEtaMins === 0 ? "Driver is arriving now!"
                          : `~${liveEtaMins} min away (live)`
                          : driverLocation ? "Calculating ETA…"
                          : "Waiting for driver GPS signal"}
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {driverLocation
                          ? "Updates live as driver moves"
                          : "Driver location will appear once GPS connects"}
                      </p>
                    </div>
                    {ride.driver?.Mobile_no && (
                      <a
                        href={`tel:${ride.driver.Mobile_no}`}
                        className="bg-primary text-black p-2.5 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex-shrink-0 ml-3"
                      >
                        <Phone size={16} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PickupMap;
