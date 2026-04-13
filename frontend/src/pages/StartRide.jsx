import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Navigation, Play, Square, Loader2,
  User as UserIcon, Lock, MapPin, IndianRupee, Phone, RefreshCw,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import socket from "../services/socket";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

// ─── Map Icons ────────────────────────────────────────────────────────────────
const carIcon = L.divIcon({
  html: `<div style="font-size:28px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));transform:translateY(-4px);">🚗</div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const makePin = (color, label) => L.divIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4))">
    <div style="background:${color};color:white;font-size:10px;font-weight:900;padding:2px 6px;border-radius:6px;white-space:nowrap;margin-bottom:2px">${label}</div>
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
  </div>`,
  className: "",
  iconSize: [80, 50],
  iconAnchor: [40, 50],
});

const greenPin = makePin("#10b981", "PICKUP");
const redPin   = makePin("#ef4444", "DROP");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const distanceMetres = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const distanceToPolyline = (lat, lng, polyline) => {
  if (!polyline || polyline.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const [aLat, aLng] = polyline[i];
    const [bLat, bLng] = polyline[i + 1];
    const seg = distanceMetres(aLat, aLng, bLat, bLng);
    if (seg === 0) { min = Math.min(min, distanceMetres(lat, lng, aLat, aLng)); continue; }
    const t = Math.max(0, Math.min(1,
      ((lat - aLat) * (bLat - aLat) + (lng - aLng) * (bLng - aLng)) / (seg * seg)
    ));
    const proj = [aLat + t * (bLat - aLat), aLng + t * (bLng - aLng)];
    min = Math.min(min, distanceMetres(lat, lng, proj[0], proj[1]));
  }
  return min;
};

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

const fetchOSRM = async (fromLat, fromLng, toLat, toLng, signal) => {
  const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res  = await fetch(url, signal ? { signal } : undefined);
  const data = await res.json();
  if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
    const path    = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    // Multiply OSRM duration by 1.4 for more realistic city traffic estimates
    const etaMins = Math.round((data.routes[0].duration * 1.4) / 60);
    return { path, etaMins };
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────
const StartRide = () => {
  const { rideId }    = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const { showAlert } = useDialog();

  const [ride, setRide]                   = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDriver, setIsDriver]           = useState(false);
  const [loading, setLoading]             = useState(true);
  const [showOtpBox, setShowOtpBox]       = useState(true);
  const [otpSlots, setOtpSlots]           = useState(["", "", "", ""]);
  const [isStartingRequest, setIsStartingRequest] = useState(false);
  const [route, setRoute]                 = useState([]);   // [[lat,lng],...] road path
  const [etaMins, setEtaMins]             = useState(null);
  const [routeLoading, setRouteLoading]   = useState(false);
  const [gpsReady, setGpsReady]           = useState(false);
  const [map, setMap]                     = useState(null);

  const abortRef   = useRef(null);
  const prevLocRef = useRef(null);
  const REROUTE_THRESHOLD_M = 80;

  // ─── Derived ──────────────────────────────────────────────────────────────
  const firstPassenger = ride?.bookings
    ? ride.bookings.find(b => b.status === "confirmed" || b.status === "pending")
    : ride?.passenger
      ? { passenger: ride.passenger, passengerSource: ride.source, passengerDestination: ride.destination, amountPaid: ride.fare?.totalWithTax || ride.fare?.total }
      : null;

  const isHeadingToPickup = ride && (ride.status === "open" || ride.status === "full" || ride.status === "arrived") && !!firstPassenger;
  const pickupCoords = firstPassenger?.passengerSource?.location?.coordinates;
  const destCoords   = firstPassenger?.passengerDestination?.location?.coordinates || ride?.destination?.location?.coordinates;

  // Whether driver arrived within 2 km of destination
  let isNearDestination = false;
  if (driverLocation && destCoords && ride?.status === "in_progress") {
    isNearDestination = distanceMetres(driverLocation.lat, driverLocation.lng, destCoords[1], destCoords[0]) <= 2000;
  }

  // ─── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();
    socket.emit("join_ride", rideId);
    socket.on("location_update", (data) => setDriverLocation({ lat: data.lat, lng: data.lng }));
    
    // Listen for ride status updates
    socket.on("ride_status_update", (data) => {
      setRide(prev => {
        if (!prev) return null;
        return { ...prev, status: data.status };
      });
      
      if (data.status === "completed" && user.role !== "driver") {
        showAlert("Your ride has been completed successfully! Thank you for choosing RouteMate.", "Ride Completed", "success");
        setTimeout(() => navigate("/passenger/dashboard"), 3500);
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

  // ─── Block back button ────────────────────────────────────────────────────
  useEffect(() => {
    if (!ride || !isDriver || ride.status === "completed") return;
    const block = (e) => { e.preventDefault(); window.history.pushState(null, "", window.location.href); };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, [ride?.status, isDriver]);

  // ─── Auto-mark arrived when OTP box opens ─────────────────────────────────
  useEffect(() => {
    if (!ride || !isDriver || !rideId) return;
    if (!showOtpBox) return;
    if (["arrived", "in_progress", "completed"].includes(ride.status)) return;
    api.patch(`/published-rides/${rideId}/status`, { status: "arrived" })
      .then(() => setRide(prev => ({ ...prev, status: "arrived" })))
      .catch(err => console.error("Auto-arrived error:", err));
  }, [showOtpBox, ride?.status, isDriver, rideId]);

  // ─── Driver GPS: immediate fix + continuous watch ─────────────────────────
  useEffect(() => {
    if (!isDriver) return;
    const settings = JSON.parse(localStorage.getItem("appSettings") || "{}");
    if (!settings.locationTracking) {
      showAlert("Please enable Location Tracking in Settings to share live location.", "Location Required", "warning");
      return;
    }
    if (!navigator.geolocation) return;

    // Immediate first fix
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setDriverLocation(coords);
        setGpsReady(true);
        socket.emit("driver_location_update", { rideId, lat: coords.lat, lng: coords.lng });
      },
      (e) => console.warn("GPS initial fix failed:", e.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Continuous watch
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
  const fetchRoute = useCallback(async (dLat, dLng, toLat, toLng) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setRouteLoading(true);
    try {
      const result = await fetchOSRM(dLat, dLng, toLat, toLng, abortRef.current.signal);
      if (result) {
        setRoute(result.path);
        setEtaMins(result.etaMins);
        prevLocRef.current = { lat: dLat, lng: dLng };
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("OSRM error:", e);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!driverLocation || !isDriver) return;
    const { lat, lng } = driverLocation;

    const targetCoords = isHeadingToPickup ? pickupCoords : destCoords;
    if (!targetCoords || targetCoords[0] === 0) return;

    // First fetch
    if (route.length === 0) {
      fetchRoute(lat, lng, targetCoords[1], targetCoords[0]);
      return;
    }

    const deviance = distanceToPolyline(lat, lng, route);
    if (deviance > REROUTE_THRESHOLD_M) {
      console.log(`Rerouting: ${Math.round(deviance)}m off route`);
      fetchRoute(lat, lng, targetCoords[1], targetCoords[0]);
    } else {
      // On-route ETA refresh (cheap, no polyline update)
      const prev = prevLocRef.current;
      if (prev && distanceMetres(prev.lat, prev.lng, lat, lng) < 20) return;
      (async () => {
        try {
          const url = `${OSRM_BASE}/${lng},${lat};${targetCoords[0]},${targetCoords[1]}?overview=false`;
          const res  = await fetch(url);
          const data = await res.json();
          if (data.code === "Ok" && data.routes?.[0]) setEtaMins(Math.round((data.routes[0].duration * 1.4) / 60));
        } catch (_) {}
      })();
      prevLocRef.current = { lat, lng };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation?.lat, driverLocation?.lng, isHeadingToPickup]);

  // Reset route on phase transition (pickup → active)
  const prevIsHeadingRef = useRef(null);
  useEffect(() => {
    if (prevIsHeadingRef.current !== null && prevIsHeadingRef.current !== isHeadingToPickup) {
      setRoute([]);
      setEtaMins(null);
    }
    prevIsHeadingRef.current = isHeadingToPickup;
  }, [isHeadingToPickup]);

  // ─── Auto-fit bounds ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !driverLocation) return;
    const targetCoords = isHeadingToPickup ? pickupCoords : destCoords;
    if (!targetCoords) return;
    map.fitBounds(
      L.latLngBounds([[driverLocation.lat, driverLocation.lng], [targetCoords[1], targetCoords[0]]]),
      { padding: [70, 70], maxZoom: 16, animate: true }
    );
  }, [map, driverLocation?.lat, driverLocation?.lng, isHeadingToPickup]);

  // ─── OTP handlers ─────────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const val = value.replace(/[^0-9]/g, "");
    if (!val && value !== "") return;
    const slots = [...otpSlots]; slots[index] = val; setOtpSlots(slots);
    if (val && index < 3) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpSlots[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus();
  };

  // ─── Status update ────────────────────────────────────────────────────────
  const handleUpdateStatus = async (status) => {
    const fullOtp = otpSlots.join("");
    if (status === "in_progress" && fullOtp.length !== 4) {
      showAlert("Please enter the complete 4-digit passenger OTP.", "OTP Required", "warning");
      return;
    }
    setIsStartingRequest(true);
    try {
      const payload = { status };
      if (status === "in_progress") payload.otp = fullOtp;
      await api.patch(`/published-rides/${rideId}/status`, payload);
      setRide(prev => ({ ...prev, status }));
      if (status === "completed") {
        showAlert("Ride Completed successfully!", "Trip Finished", "success");
        navigate("/driver/dashboard");
      }
      if (status === "in_progress") setShowOtpBox(false);
    } catch (e) {
      showAlert(e.response?.data?.message || "Failed to update status", "Failed", "error");
    } finally {
      setIsStartingRequest(false);
    }
  };

  // ─── Manual reroute ───────────────────────────────────────────────────────
  const handleManualReroute = () => {
    if (!driverLocation) return;
    const targetCoords = isHeadingToPickup ? pickupCoords : destCoords;
    if (!targetCoords) return;
    setRoute([]);
    fetchRoute(driverLocation.lat, driverLocation.lng, targetCoords[1], targetCoords[0]);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#05080f] gap-3">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
      <p className="text-white/40 text-sm">Loading ride…</p>
    </div>
  );

  if (!ride) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05080f] text-white">Ride not found</div>
  );

  const mapCenter = driverLocation ||
    (ride.source?.location?.coordinates
      ? [ride.source.location.coordinates[1], ride.source.location.coordinates[0]]
      : [23.0225, 72.5714]);

  const pickupMarkerCoords = pickupCoords ? [pickupCoords[1], pickupCoords[0]] : null;
  const destMarkerCoords   = destCoords   ? [destCoords[1],   destCoords[0]  ] : null;

  // Fallback straight line endpoints for loading state
  const fallbackFrom = driverLocation ? [driverLocation.lat, driverLocation.lng] : null;
  const fallbackTo   = isHeadingToPickup ? pickupMarkerCoords : destMarkerCoords;

  return (
    <div className="relative flex flex-col h-screen text-white bg-black">

      {/* ── Header ── */}
      <div className="absolute top-0 w-full z-50 p-4 flex items-center justify-between pointer-events-none">
        <button onClick={() => navigate(-1)} className="pointer-events-auto bg-black/60 backdrop-blur border border-white/10 p-3 rounded-full hover:bg-white/10 transition">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-black/60 backdrop-blur border border-white/10 px-4 py-2 rounded-full pointer-events-auto flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${ride.status === "in_progress" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
            <span className="text-xs font-black uppercase tracking-wider">
              {ride.status === "in_progress" ? "Mission Ongoing"
               : ride.status === "arrived" ? "Wait for OTP"
               : "Heading to Pickup"}
            </span>
          </div>
          {routeLoading && (
            <div className="bg-blue-500/20 backdrop-blur border border-blue-500/30 p-2 rounded-full pointer-events-auto">
              <RefreshCw size={14} className="text-blue-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* ── GPS not ready banner ── */}
      {isDriver && !gpsReady && (
        <div className="absolute top-20 left-4 right-4 z-50 bg-amber-500/90 backdrop-blur text-black text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 animate-pulse">
          📡 Acquiring GPS signal… Please stay on this screen.
        </div>
      )}

      {/* ── Map ── */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer center={mapCenter} zoom={14} className="w-full h-full" zoomControl={false} ref={setMap}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" maxZoom={19} />

          {/* Pickup marker – show before active */}
          {ride.status !== "in_progress" && pickupMarkerCoords && (
            <Marker position={pickupMarkerCoords} icon={greenPin}>
              <Popup><b style={{ color: "#10b981" }}>Passenger Pickup</b><br />{firstPassenger?.passengerSource?.address}</Popup>
            </Marker>
          )}

          {/* Destination marker – show when active */}
          {ride.status === "in_progress" && destMarkerCoords && (
            <Marker position={destMarkerCoords} icon={redPin}>
              <Popup><b style={{ color: "#ef4444" }}>Passenger Destination</b><br />{firstPassenger?.passengerDestination?.address || ride.destination?.address}</Popup>
            </Marker>
          )}

          {/* Driver marker */}
          {driverLocation && (
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
              <Popup><b>Your Location</b></Popup>
            </Marker>
          )}

          {/* Road polyline */}
          {route.length > 1 && (() => {
            // Path Cutting: Only show the part of the route ahead of the driver
            let displayRoute = route;
            if (driverLocation) {
              let minStep = Infinity;
              let closestIdx = 0;
              for (let i = 0; i < route.length; i++) {
                const d = distanceMetres(driverLocation.lat, driverLocation.lng, route[i][0], route[i][1]);
                if (d < minStep) { minStep = d; closestIdx = i; }
              }
              if (minStep < 200) displayRoute = route.slice(closestIdx);
            }

            return (
              <>
                <Polyline positions={displayRoute} pathOptions={{ color: "#1e3a8a", weight: 12, opacity: 0.2, lineCap: "round", lineJoin: "round" }} />
                <Polyline positions={displayRoute} pathOptions={{ color: ride.status === "in_progress" ? "#6366f1" : "#3b82f6", weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }} />
                <Polyline positions={displayRoute} pathOptions={{ color: "white", weight: 2, opacity: 0.4, dashArray: "8 16", lineCap: "round", lineJoin: "round" }} />
              </>
            );
          })()}

          {/* Dashed placeholder while loading route */}
          {route.length === 0 && fallbackFrom && fallbackTo && (
            <Polyline
              positions={[fallbackFrom, fallbackTo]}
              pathOptions={{ color: "#6b7280", weight: 3, opacity: 0.5, dashArray: "6 10" }}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Bottom HUD ── */}
      <div className="absolute bottom-4 left-4 right-4 z-50 pointer-events-none">
        <div className="bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 pointer-events-auto shadow-2xl">
          {isDriver ? (
            <div className="flex flex-col gap-3">
              {/* ETA + Reroute row – only show when navigating */}
              {(isHeadingToPickup || ride.status === "in_progress") && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                      {isHeadingToPickup ? "ETA to Pickup" : "ETA to Destination"}
                    </p>
                    <p className="text-lg font-black text-white">
                      {etaMins !== null ? `~${etaMins} min`
                       : routeLoading ? "Calculating…"
                       : gpsReady ? "Route loading…"
                       : "Acquiring GPS…"}
                    </p>
                  </div>
                </div>
              )}

              {/* Pickup phase actions */}
              {ride.status !== "in_progress" && (
                <>
                  <div className="flex gap-3">
                    <a
                      href={`tel:${firstPassenger?.passenger?.Mobile_no || ""}`}
                      className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm"
                    >
                      <Phone size={18} /> Call
                    </a>
                    <button
                      onClick={handleManualReroute}
                      disabled={!driverLocation || routeLoading}
                      className="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl flex justify-center items-center gap-2 text-sm disabled:opacity-50 transition active:scale-95"
                    >
                      <Navigation size={18} className={routeLoading ? "animate-spin" : ""} />
                      {routeLoading ? "Routing…" : "Update Route"}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowOtpBox(true)}
                    disabled={isStartingRequest}
                    className="flex-1 bg-amber-500 text-black font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <Play size={20} className={isStartingRequest ? "animate-spin" : ""} /> Start Ride
                  </button>
                </>
              )}

              {/* Active trip status */}
              {ride.status === "in_progress" && (
                <>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Trip Ongoing</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                      <span className="text-[9px] font-black text-emerald-500/60 uppercase">Final Fare</span>
                      <span className="text-sm font-black text-emerald-500 flex items-center gap-0.5">
                        <IndianRupee size={12} /> {firstPassenger?.amountPaid || 0}
                      </span>
                    </div>
                  </div>
                  {isNearDestination ? (
                    <button
                      onClick={() => handleUpdateStatus("completed")}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-red-500/20 transition-all animate-pulse active:scale-95"
                    >
                      <Square size={20} /> Complete Ride
                    </button>
                  ) : (
                    <div className="flex-1 bg-white/5 border border-white/10 text-white/50 font-black py-4 rounded-xl flex justify-center items-center gap-2">
                      <Navigation size={18} /> Heading To Destination…
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ─── PASSENGER HUD ─── */
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                <UserIcon size={24} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm truncate">{ride.driver?.name || "Your Driver"}</p>
                  <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    <span className="text-[8px] font-black text-emerald-500/60 uppercase leading-none">Final Fare</span>
                    <span className="text-xs font-black text-emerald-500 flex items-center gap-0.5 leading-none">
                      <IndianRupee size={10} /> {firstPassenger?.amountPaid || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {ride.status !== "in_progress" ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                        {ride.status === "arrived" ? "Driver has arrived!" : "Driver is heading to your pickup"}
                      </span>
                      <p className="text-[10px] text-white/50">
                        {ride.status === "arrived"
                          ? "Please share your OTP with the driver to start the trip."
                          : "Your OTP is waiting in your notifications."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="px-2 border rounded-full text-[10px] uppercase font-bold border-emerald-500/30 text-emerald-500">Live</span>
                      <span className="text-xs text-white/50 truncate">{(ride.vehicleType || "PRIME").toUpperCase()} • En route</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── OTP Overlay ── */}
      {showOtpBox && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1219] w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl">
            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30">
                <Lock size={32} className="text-primary" />
              </div>
              <h3 className="text-xl font-black text-white">Start the Mission</h3>
              <p className="text-sm text-white/50 mt-1">Enter the OTP from your passenger</p>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center">
                <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  OTP sent to passenger at booking
                </p>
                <div className="flex justify-center gap-3">
                  {otpSlots.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-14 h-16 bg-black/50 border border-white/20 rounded-xl text-center text-2xl font-black text-white focus:border-primary focus:bg-primary/5 transition-all outline-none"
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleUpdateStatus("in_progress")}
                disabled={otpSlots.join("").length !== 4 || isStartingRequest}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2"
              >
                {isStartingRequest ? <Loader2 size={24} className="animate-spin" /> : <Play size={24} />}
                Verify & Start Ride
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartRide;
