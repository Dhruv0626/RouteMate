import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Navigation, Play, Square, Loader2,
  User as UserIcon, Lock, IndianRupee, Phone, RefreshCw,
  ArrowUp, CornerUpLeft, CornerUpRight, Volume2, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import socket from "../services/socket";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { makeVehicleIcon, makePin } from "../utils/mapIcons";
import SOSButton from "../components/passenger/SOSButton";
import { fetchRoute as routingFetch } from "../utils/routing";


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

/** Format metres into "250 m" or "1.4 km" */
const fmtDist = (m) => {
  if (!m && m !== 0) return "";
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

/** Map OSRM maneuver to Lucide icon + label */
const TurnArrow = ({ step }) => {
  const mod  = step?.maneuver?.modifier || "";
  const type = step?.maneuver?.type     || "";

  if (type === "arrive")
    return <div className="text-2xl">🏁</div>;
  if (mod.includes("left"))
    return <CornerUpLeft size={28} className="text-white" strokeWidth={3} />;
  if (mod.includes("right"))
    return <CornerUpRight size={28} className="text-white" strokeWidth={3} />;
  return <ArrowUp size={28} className="text-white" strokeWidth={3} />;
};

const fetchOSRM = async (fromLat, fromLng, toLat, toLng, signal) => {
  const result = await routingFetch(fromLat, fromLng, toLat, toLng, { signal, steps: true });
  if (result) {
    return {
      path: result.path,
      etaMins: Math.round(result.durationSecs * 1.4 / 60),
      distKm: parseFloat(result.distanceKm.toFixed(1)),
      steps: result.steps || [],
    };
  }
  return null;
};


// ─── Component ────────────────────────────────────────────────────────────────
const StartRide = () => {
  const { rideId }    = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const { showAlert, showConfirm } = useDialog();

  const [ride, setRide]                     = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDriver, setIsDriver]             = useState(false);
  const [loading, setLoading]               = useState(true);
  const [showOtpBox, setShowOtpBox]         = useState(true); // Default to true so it shows during pickup phase
  const [otpSlots, setOtpSlots]             = useState(["", "", "", ""]);
  const [isStartingRequest, setIsStartingRequest] = useState(false);
  const [route, setRoute]                   = useState([]);
  const [etaMins, setEtaMins]               = useState(null);
  const [routeDistKm, setRouteDistKm]       = useState(null);
  const [routeSteps, setRouteSteps]         = useState([]);
  const [nextStep, setNextStep]             = useState(null);
  const [routeLoading, setRouteLoading]     = useState(false);
  const [heading, setHeading]               = useState(0);
  const [isMinimized, setIsMinimized]       = useState(false);
  const [gpsReady, setGpsReady]             = useState(false);
  const [isPerspectiveMode, setIsPerspectiveMode] = useState(true); // Default to on for drivers
  const [map, setMap]                       = useState(null);

  const abortRef    = useRef(null);
  const prevLocRef  = useRef(null);
  const stepIdxRef  = useRef(0);
  const REROUTE_THRESHOLD_M = 80;
  const isActive = ride?.status === "in_progress";

  // ─── SOS State (Passenger) ────────────────────────────────────────────────
  const [sosWarningActive, setSosWarningActive] = useState(false);
  const [sosWarningReason, setSosWarningReason] = useState("");

  // ─── Derived ──────────────────────────────────────────────────────────────
  const firstPassenger = ride?.bookings
    ? ride.bookings.find(b => b.status === "confirmed" || b.status === "pending")
    : ride?.passenger
      ? { passenger: ride.passenger, passengerSource: ride.source, passengerDestination: ride.destination, amountPaid: ride.fare?.totalWithTax || ride.fare?.total }
      : null;

  const isHeadingToPickup = ride && (ride.status === "open" || ride.status === "full" || ride.status === "arrived") && !!firstPassenger;
  const pickupCoords = firstPassenger?.passengerSource?.location?.coordinates;
  const destCoords   = firstPassenger?.passengerDestination?.location?.coordinates || ride?.destination?.location?.coordinates;

  let isNearDestination = false;
  if (driverLocation && destCoords && isActive) {
    isNearDestination = distanceMetres(driverLocation.lat, driverLocation.lng, destCoords[1], destCoords[0]) <= 2000;
  }

  // ─── Auto-expand HUD when reached destination (for payment visibility) ───
  useEffect(() => {
    if (!isDriver && (ride?.status === "reached" || ride?.status === "completed")) {
      setIsMinimized(false);
    }
  }, [ride?.status, isDriver]);

  useEffect(() => {
    socket.connect();
    
    const joinRooms = () => {
      if (!rideId) return;
      socket.emit("join_ride", rideId.toString());
      if (user?._id || user?.id) {
        socket.emit("join_user", (user._id || user.id).toString());
      }
      console.log("Driver joined rooms:", { rideId, userId: user?._id || user?.id });
    };

    socket.on("connect", joinRooms);
    if (socket.connected) joinRooms();

    socket.on("location_update", (data) => setDriverLocation({ lat: data.lat, lng: data.lng }));
    socket.on("ride_status_update", (data) => {
      setRide(prev => { if (!prev) return null; return { ...prev, status: data.status }; });
      if (data.status === "cancelled" && user.role !== "driver") {
        showAlert("The driver has cancelled this ride.", "Ride Cancelled", "error");
        setTimeout(() => navigate("/passenger/dashboard"), 3000);
      }
    });

    // Auto-SOS warning from backend cron
    socket.on("sos_warning", (data) => {
      if (data.tripId === rideId && user.role !== "driver") {
        setSosWarningReason(data.reason || "A safety concern has been detected on your trip.");
        setSosWarningActive(true);
      }
    });
    
    // Payment Completion Event — Automatically exits map for both parties
    socket.on("payment_completed", async (data) => {
      console.log("Payment completion event received:", data);
      const methodLabel = data.method === "wallet" ? "Wallet" : data.method === "cash" ? "Cash" : "UPI";
      
      const idToUse = data.tripId || rideId;
      const direction = user.role === "driver" ? "to_passenger" : "to_driver";

      await showAlert(`Payment successful via ${methodLabel}! Redirecting to review…`, "Trip Finished", "success");
      
      navigate(`/review/${idToUse}?direction=${direction}`);
    });

    // ── CRITICAL: Prevent Accidental Page Reload/Leave ──
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "You have an active ride mission. Are you sure you want to leave?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      socket.off("location_update");
      socket.off("ride_status_update");
      socket.off("sos_warning");
      socket.off("payment_completed");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.disconnect();
    };
  }, [rideId]);

  // ─── Fetch ride ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRide = async () => {
      if (rideId === "[object Object]" || !rideId) {
        navigate("/driver/dashboard");
        return;
      }
      try {
        const res = await api.get(`/published-rides/${rideId}`);
        if (res.data.success) {
          const found = res.data.data;
          
          // Redirect passenger to dedicated live tracking page
          if (user.role === "passenger") {
             navigate(`/passenger/live-tracking/${rideId}`, { replace: true });
             return;
          }

          setRide(found);
          setIsDriver(user.role === "driver" || found.driver?._id === user.id);
          
          // CRITICAL FIX: Hide OTP box if ride is beyond the initial state
          if (["in_progress", "reached", "completed"].includes(found.status)) {
            setShowOtpBox(false);
          }
        }
      } catch (err) {
        console.error("Failed to load ride", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [rideId, user.role]);


  // ─── Auto-mark arrived when OTP box opens ─────────────────────────────────
  useEffect(() => {
    if (!ride || !isDriver || !rideId) return;
    if (!showOtpBox) return;
    if (["arrived", "in_progress", "reached", "completed"].includes(ride.status)) return;
    api.patch(`/published-rides/${rideId}/status`, { status: "arrived" })
      .then(() => setRide(prev => ({ ...prev, status: "arrived" })))
      .catch(err => console.error("Auto-arrived error:", err));
  }, [showOtpBox, ride?.status, isDriver, rideId]);

  // ─── Driver GPS ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDriver) return;
    const settings = JSON.parse(localStorage.getItem("appSettings") || "{}");
    if (!settings.locationTracking) {
      showAlert("Please enable Location Tracking in Settings to share live location.", "Location Required", "warning");
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setDriverLocation(coords);
        setGpsReady(true);
        socket.emit("driver_location_update", {
          rideId,
          lat: coords.lat,
          lng: coords.lng,
          speed: p.coords.speed != null ? p.coords.speed * 3.6 : undefined, // m/s → km/h
          heading: p.coords.heading ?? 0
        });
      },
      (e) => console.warn("GPS initial fix failed:", e.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    const wid = navigator.geolocation.watchPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setDriverLocation(coords);
        setGpsReady(true);
        socket.emit("driver_location_update", {
          rideId,
          lat: coords.lat,
          lng: coords.lng,
          speed: p.coords.speed != null ? p.coords.speed * 3.6 : undefined, // m/s → km/h
          heading: p.coords.heading ?? 0
        });
      },
      (e) => console.warn("GPS watch error:", e.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(wid);
  }, [isDriver, rideId]);

  // ─── Route fetching ────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (dLat, dLng, toLat, toLng) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setRouteLoading(true);
    try {
      const result = await fetchOSRM(dLat, dLng, toLat, toLng, abortRef.current.signal);
      if (result) {
        setRoute(result.path);
        setEtaMins(result.etaMins);
        setRouteDistKm(result.distKm);
        setRouteSteps(result.steps);
        stepIdxRef.current = 0;
        // Skip "depart" step for the instruction banner
        const firstMeaningful = result.steps.find(s => s.maneuver?.type !== "depart") || result.steps[1] || result.steps[0];
        setNextStep(firstMeaningful || null);
        prevLocRef.current = { lat: dLat, lng: dLng };
        if (result.path.length > 2) {
          const p1 = result.path[0];
          const p2 = result.path[1];
          const angle = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
          setHeading(angle);
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("OSRM error:", e);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  // ─── Smart rerouting + step advancement ───────────────────────────────────
  useEffect(() => {
    if (!driverLocation || !isDriver) return;
    const { lat, lng } = driverLocation;
    const targetCoords = isHeadingToPickup ? pickupCoords : destCoords;
    if (!targetCoords || targetCoords[0] === 0) return;

    if (route.length === 0) {
      fetchRoute(lat, lng, targetCoords[1], targetCoords[0]);
      return;
    }

    const deviance = distanceToPolyline(lat, lng, route);
    if (deviance > REROUTE_THRESHOLD_M) {
      fetchRoute(lat, lng, targetCoords[1], targetCoords[0]);
    } else {
      const prev = prevLocRef.current;
      if (prev && distanceMetres(prev.lat, prev.lng, lat, lng) < 20) return;

      // Update heading
      let closestIdx = 0, minD = Infinity;
      for (let i = 0; i < route.length - 1; i++) {
        const d = distanceMetres(lat, lng, route[i][0], route[i][1]);
        if (d < minD) { minD = d; closestIdx = i; }
      }
      if (route[closestIdx + 1]) {
        const p1 = route[closestIdx];
        const p2 = route[closestIdx + 1];
        setHeading((Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI);
      }

      // Advance turn step: check if driver passed the current step's waypoint
      if (routeSteps.length > 0) {
        const curStepIdx = stepIdxRef.current;
        const curStep = routeSteps[curStepIdx];
        if (curStep?.maneuver?.location) {
          const [sLng, sLat] = curStep.maneuver.location;
          const distToStep = distanceMetres(lat, lng, sLat, sLng);
          if (distToStep < 60 && curStepIdx + 1 < routeSteps.length) {
            const newIdx = curStepIdx + 1;
            stepIdxRef.current = newIdx;
            // Find next non-trivial step
            const nextMeaningful = routeSteps.slice(newIdx).find(s => s.maneuver?.type !== "depart") || routeSteps[newIdx];
            setNextStep(nextMeaningful || null);
          }
        }
      }

      // Cheap ETA refresh
      (async () => {
        try {
          const url = `${OSRM_BASE}/${lng},${lat};${targetCoords[0]},${targetCoords[1]}?overview=false`;
          const res  = await fetch(url);
          const data = await res.json();
          if (data.code === "Ok" && data.routes?.[0]) {
            setEtaMins(Math.round((data.routes[0].duration * 1.4) / 60));
            setRouteDistKm(Math.round(data.routes[0].distance / 100) / 10);
          }
        } catch (_) {}
      })();
      prevLocRef.current = { lat, lng };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation?.lat, driverLocation?.lng, isHeadingToPickup]);

  // ─── Memoized display route (Path Cutting) ───────────────────────────────
  const displayRoute = useMemo(() => {
    if (route.length <= 1) return route;
    if (!driverLocation) return route;

    let minStep = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < route.length; i++) {
      const d = distanceMetres(driverLocation.lat, driverLocation.lng, route[i][0], route[i][1]);
      if (d < minStep) {
        minStep = d;
        closestIdx = i;
      }
    }
    return minStep < 200 ? route.slice(closestIdx) : route;
  }, [route, driverLocation?.lat, driverLocation?.lng]);

  const vehicleIcon = useMemo(() => {
    if (!ride) return null;
    return makeVehicleIcon(ride.vehicleType, heading);
  }, [ride?.vehicleType, heading]);

  // Reset route on phase transition
  const prevIsHeadingRef = useRef(null);
  useEffect(() => {
    if (prevIsHeadingRef.current !== null && prevIsHeadingRef.current !== isHeadingToPickup) {
      setRoute([]); setEtaMins(null); setRouteDistKm(null);
      setRouteSteps([]); setNextStep(null); stepIdxRef.current = 0;
    }
    prevIsHeadingRef.current = isHeadingToPickup;
  }, [isHeadingToPickup]);

  // Auto-fit bounds
  useEffect(() => {
    if (!map || !driverLocation || isPerspectiveMode) return;
    const targetCoords = isHeadingToPickup ? pickupCoords : destCoords;
    if (!targetCoords) return;
    map.fitBounds(
      L.latLngBounds([[driverLocation.lat, driverLocation.lng], [targetCoords[1], targetCoords[0]]]),
      { padding: [70, 70], maxZoom: 16, animate: true }
    );
  }, [map, driverLocation?.lat, driverLocation?.lng, isHeadingToPickup, isPerspectiveMode]);

  // ─── OTP handlers ─────────────────────────────────────────────────────────
  
  // Auto-track vehicle in Perspective Mode
  useEffect(() => {
    if (isPerspectiveMode && map && driverLocation) {
      map.setView([driverLocation.lat, driverLocation.lng], 16, { animate: true, duration: 1.0 });
    }
  }, [isPerspectiveMode, driverLocation, map]);

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

  const handleCancelRide = async () => {
    const confirmed = await showConfirm(
      "Are you sure you want to cancel this ride? This action cannot be undone.",
      "Cancel Ride?",
      "error",
      "Yes, Cancel",
      "No, Keep it"
    );
    if (!confirmed) return;
    try {
      const res = await api.patch(`/published-rides/${rideId}/status`, { status: "cancelled" });
      if (res.data.success) {
        navigate("/driver/dashboard/active-rides");
      }
    } catch (err) {
      console.error("Failed to cancel ride", err);
      showAlert("Failed to cancel the ride. Please try again.", "Error", "error");
    }
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
        showAlert("Ride marked as completed. Please collect payment.", "Trip Finished", "success");
      }
      if (status === "in_progress") setShowOtpBox(false);
    } catch (e) {
      showAlert(e.response?.data?.message || "Failed to update status", "Failed", "error");
    } finally {
      setIsStartingRequest(false);
    }
  };

  const handleManualReroute = () => {
    if (!driverLocation) return;
    const targetCoords = isHeadingToPickup ? pickupCoords : destCoords;
    if (!targetCoords) return;
    setRoute([]); setNextStep(null); stepIdxRef.current = 0;
    fetchRoute(driverLocation.lat, driverLocation.lng, targetCoords[1], targetCoords[0]);
  };

  // ─── Computed ─────────────────────────────────────────────────────────────
  const arrivalTime = etaMins !== null
    ? new Date(Date.now() + etaMins * 60000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  const isNavMode = isDriver && (isHeadingToPickup || ride?.status === "in_progress") && !showOtpBox;

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
  const fallbackFrom = driverLocation ? [driverLocation.lat, driverLocation.lng] : null;
  const fallbackTo   = isHeadingToPickup ? pickupMarkerCoords : destMarkerCoords;

  return (
    <div className="relative flex flex-col h-screen text-white bg-black overflow-hidden">
      {/* ══ Header ══ */}
      <div className="absolute top-0 w-full z-50 p-4 flex items-center justify-between pointer-events-none"
           style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
        <button onClick={() => navigate(-1)} className="pointer-events-auto bg-black/60 backdrop-blur border border-white/10 p-3 rounded-full hover:bg-white/10 transition">
            <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-black/60 backdrop-blur border border-white/10 px-4 py-2 rounded-full pointer-events-auto flex items-center gap-2 shadow-2xl">
            <span className={`w-2 h-2 rounded-full ${ride.status === "in_progress" ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
            <span className="text-xs font-black uppercase tracking-wider">
              {ride.status === "in_progress" ? "Trip Ongoing"
               : ride.status === "arrived" ? "Wait for OTP"
               : "Heading to Pickup"}
            </span>
          </div>
        </div>
      </div>

      {/* ══ Floating Map Controls ══ */}
      <div className="absolute z-40 flex flex-col gap-3 right-4" 
           style={{ top: "calc(env(safe-area-inset-top, 0px) + 80px)" }}>
        <button
          onClick={() => {
            setIsPerspectiveMode(!isPerspectiveMode);
            if (!isPerspectiveMode && map && driverLocation) {
              map.setView([driverLocation.lat, driverLocation.lng], 16, { animate: true });
            } else if (isPerspectiveMode && map && driverLocation) {
              const target = isHeadingToPickup ? pickupCoords : destCoords;
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
        >
          <Navigation size={20} className={isPerspectiveMode ? "fill-black" : ""} />
        </button>
        <button
          onClick={handleManualReroute}
          disabled={routeLoading || !driverLocation}
          className="pointer-events-auto w-12 h-12 bg-black/60 backdrop-blur border border-white/15 rounded-full flex items-center justify-center shadow-2xl hover:bg-white/10 active:scale-90 transition-all disabled:opacity-40"
        >
          <RefreshCw size={20} className={routeLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ══ GPS not ready banner ══ */}
      {isDriver && !gpsReady && (
        <div className="absolute left-4 right-4 z-50 bg-amber-500/90 backdrop-blur text-black text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 animate-pulse"
          style={{ top: "100px" }}>
          📡 Acquiring GPS signal… Please stay on this screen.
        </div>
      )}

      {/* ══ Map ══ */}
      <div className="flex-1 w-full relative z-0 nav-tilt-wrapper">
        <div 
          className={`w-full h-full transform-gpu`}
          style={isPerspectiveMode ? { 
            transform: `scale(2.5) rotateZ(${-heading}deg)`,
            transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
          } : {
            transform: `scale(1) rotateZ(0deg)`,
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <MapContainer center={mapCenter} zoom={14} className="w-full h-full" zoomControl={false} ref={setMap}>
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
            maxZoom={19} 
          />

          {ride.status !== "in_progress" && pickupMarkerCoords && (
            <Marker position={pickupMarkerCoords} icon={greenPin}>
              <Popup><b style={{ color: "#10b981" }}>Passenger Pickup</b><br />{firstPassenger?.passengerSource?.address}</Popup>
            </Marker>
          )}
          {ride.status === "in_progress" && destMarkerCoords && (
            <Marker position={destMarkerCoords} icon={redPin}>
              <Popup><b style={{ color: "#ef4444" }}>Passenger Destination</b><br />{firstPassenger?.passengerDestination?.address || ride.destination?.address}</Popup>
            </Marker>
          )}
          {driverLocation && vehicleIcon && (
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={vehicleIcon}>
              <Popup><b>Your Location</b></Popup>
            </Marker>
          )}

          {displayRoute.length > 1 && (
            <>
              {/* Simplified route rendering for performance */}
              <Polyline
                positions={displayRoute}
                pathOptions={{ color: "#1e3a8a", weight: 9, opacity: 0.15, lineCap: "round", lineJoin: "round" }}
              />
              <Polyline
                positions={displayRoute}
                pathOptions={{ color: ride.status === "in_progress" ? "#6366f1" : "#3b82f6", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" }}
              />
              {displayRoute.length < 500 && (
                <Polyline
                  positions={displayRoute}
                  pathOptions={{ color: "white", weight: 1.5, opacity: 0.4, dashArray: "10 20", lineCap: "round", lineJoin: "round" }}
                />
              )}
            </>
          )}

          {route.length === 0 && fallbackFrom && fallbackTo && (
            <Polyline positions={[fallbackFrom, fallbackTo]} pathOptions={{ color: "#6b7280", weight: 3, opacity: 0.5, dashArray: "6 10" }} />
          )}
        </MapContainer>
        </div>
      </div>

      {/* ══ NAVIGATION MODE: Google Maps Bottom Strip ══ */}
      {isNavMode && (
        <div className="absolute bottom-0 left-0 right-0 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {/* Current street name pill */}
          {nextStep?.name && nextStep.maneuver?.type !== "arrive" && (
            <div className="flex justify-center mb-2">
              <div className="bg-[#1565C0] text-white text-xs font-black px-5 py-1.5 rounded-full shadow-lg">
                {nextStep.name}
              </div>
            </div>
          )}

          {/* Main dark strip */}
          <div className="bg-[#0f1219]/95 backdrop-blur-md border-t border-white/10 px-5 py-4">
            <div className="flex items-center justify-between gap-4">

              {/* Left: X to dismiss / call */}
              <div className="flex flex-col gap-2 items-center">
                {ride.status !== "in_progress" ? (
                  <a href={`tel:${firstPassenger?.passenger?.Mobile_no || ""}`}
                    className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition">
                    <Phone size={20} className="text-black" />
                  </a>
                ) : (
                  <button onClick={() => navigate(-1)}
                    className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition">
                    <X size={20} className="text-white" />
                  </button>
                )}
              </div>

              {/* Center: Big ETA */}
              <div className="flex-1 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-white leading-none">
                    {etaMins !== null ? etaMins : "--"}
                  </span>
                  <span className="text-xl font-bold text-white/60">min</span>
                </div>
                <p className="text-white/50 text-xs mt-1 font-semibold">
                  {routeDistKm ? `${routeDistKm} km` : ""}
                  {routeDistKm && arrivalTime ? " · " : ""}
                  {arrivalTime || ""}
                </p>
                {/* Phase label */}
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isHeadingToPickup ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isHeadingToPickup ? "text-amber-400" : "text-emerald-400"}`}>
                    {isHeadingToPickup ? "Heading to Pickup" : "En Route to Destination"}
                  </span>
                </div>
              </div>

              {/* Right: Action button */}
              <div className="flex flex-col gap-2 items-center">
                {ride.status !== "in_progress" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelRide}
                      className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
                      title="Cancel Ride"
                    >
                      <X size={20} />
                    </button>
                    <button onClick={() => setShowOtpBox(true)} disabled={isStartingRequest}
                      className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition disabled:opacity-60">
                      <Play size={20} className="text-black" />
                    </button>
                  </div>
                ) : isNearDestination ? (
                  <div className="flex justify-end w-full">
                    <button 
                      onClick={() => handleUpdateStatus("reached")}
                      disabled={isStartingRequest}
                      className="px-6 py-2.5 bg-primary text-black rounded-2xl font-black text-sm active:scale-95 transition shadow-lg shadow-primary/30 flex items-center gap-2"
                    >
                      {isStartingRequest ? <Loader2 size={16} className="animate-spin" /> : "Reached"}
                    </button>
                  </div>
                ) : ride.status === "reached" ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black uppercase text-amber-400 animate-pulse">Waiting for Payment</span>
                    <button onClick={() => {
                        showAlert("Please ask the passenger to pay via UPI or Wallet. If they pay in cash, use the 'Collect Cash' button in the menu.", "Payment Pending", "info");
                    }} className="px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-2xl font-black text-xs">
                      Verify
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelRide}
                      className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
                      title="Cancel Ride"
                    >
                      <X size={20} />
                    </button>
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
                      <IndianRupee size={16} className="text-emerald-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ STANDARD Bottom HUD (non-nav) ══ */}
      {!isNavMode && !showOtpBox && (
        <div className="absolute bottom-4 left-4 right-4 z-50 pointer-events-none">
        <div className={`bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 pointer-events-auto shadow-2xl relative overflow-hidden transition-all duration-500 ease-in-out ${isMinimized && !isDriver ? "max-h-[85px]" : "max-h-[600px]"}`}>
            {/* Minimize toggle for passengers */}
            {!isDriver && ride.status !== "reached" && ride.status !== "completed" && (
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all z-50 active:scale-90"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}
              </button>
            )}
            {isDriver ? (
              <div className="flex flex-col gap-3">
                {(isHeadingToPickup || ride.status === "in_progress") && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                        {isHeadingToPickup ? "ETA to Pickup" : "ETA to Destination"}
                      </p>
                      <p className="text-lg font-black text-white">
                        {etaMins !== null ? `~${etaMins} min` : routeLoading ? "Calculating…" : gpsReady ? "Route loading…" : "Acquiring GPS…"}
                      </p>
                    </div>
                  </div>
                )}
                {isHeadingToPickup && (
                  <>
                    <div className="flex gap-2">
                      <button onClick={handleCancelRide}
                        className="w-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex justify-center items-center shadow-lg active:scale-95 transition-all">
                        <X size={20} />
                      </button>
                      <a href={`tel:${firstPassenger?.passenger?.Mobile_no || ""}`}
                        className="flex-1 bg-primary text-black font-black py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm">
                        <Phone size={18} /> Call
                      </a>
                    </div>
                    <button onClick={() => setShowOtpBox(true)} disabled={isStartingRequest}
                      className="flex-1 bg-primary text-black font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
                      <Play size={20} className={isStartingRequest ? "animate-spin" : ""} /> Start Mission
                    </button>
                  </>
                )}
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
                    <div className="flex gap-2">
                      <button onClick={handleCancelRide}
                        className="w-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex justify-center items-center shadow-lg active:scale-95 transition-all">
                        <X size={20} />
                      </button>
                      {isNearDestination ? (
                        <button onClick={() => handleUpdateStatus("reached")}
                          className="flex-1 bg-primary text-black font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 transition-all animate-pulse active:scale-95">
                          <Square size={20} /> Reached
                        </button>
                      ) : (
                        <div className="flex-1 bg-white/5 border border-white/10 text-white/50 font-black py-4 rounded-xl flex justify-center items-center gap-2">
                          <Navigation size={18} /> Heading To Destination…
                        </div>
                      )}
                    </div>
                  </>
                )}
                {ride.status === "reached" && (
                  <>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Waiting for Payment</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <span className="text-[9px] font-black text-emerald-500/60 uppercase">Final Fare</span>
                        <span className="text-sm font-black text-emerald-500 flex items-center gap-0.5">
                          <IndianRupee size={12} /> {firstPassenger?.amountPaid || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button onClick={async () => {
                        const confirmed = await showConfirm("Did you receive cash from the passenger?", "Confirm Cash", "success", "Yes, Received");
                        if (!confirmed) return;
                        try {
                          const res = await api.post("/payments/cash-received", { rideId: ride._id });
                          if (res.data.success) {
                            showAlert("Cash payment recorded! Redirecting to review...", "Success", "success");
                            const idToReview = res.data.tripId || ride.tripId || ride._id;
                            setTimeout(() => navigate(`/review/${idToReview}?direction=to_passenger`), 2000);
                          }
                        } catch (err) {
                          showAlert(err.response?.data?.message || "Failed to process cash payment", "Error", "error");
                        }
                      }}
                        className="w-full bg-emerald-500 text-black font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all">
                        <IndianRupee size={20} /> Collect Cash
                      </button>

                      <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                        <button 
                          onClick={() => {
                            const idToReview = ride.tripId || ride._id;
                            navigate(`/review/${idToReview}?direction=to_passenger`);
                          }}
                          className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-all text-sm"
                        >
                          Proceed to Review →
                        </button>
                        <p className="text-[9px] text-center text-white/40 font-medium">
                          Click only if passenger paid via <span className="text-white/60">UPI or Wallet</span> to navigate.
                        </p>
                      </div>
                    </div>
                  </>
                )}
                {ride.status === "completed" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Payment Successful</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <span className="text-sm font-black text-emerald-500 flex items-center gap-0.5">
                          <IndianRupee size={12} /> {firstPassenger?.amountPaid || 0}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        const idToReview = ride.tripId || ride._id;
                        navigate(`/review/${idToReview}?direction=to_passenger`);
                      }}
                      className="w-full bg-primary text-black font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                      Proceed to Review →
                    </button>
                    <p className="text-[10px] text-center text-white/50 font-medium">Trip is completed. Thank you for riding!</p>
                  </div>
                )}
              </div>
            ) : (
              // Passenger HUD
              <div className="flex flex-col w-full">
                <div className="flex items-center gap-3">
                  {!isMinimized && (
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                      <UserIcon size={24} className="text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {!isMinimized && (
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm truncate">{ride.driver?.name || "Your Driver"}</p>
                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                          <span className="text-[8px] font-black text-emerald-500/60 uppercase leading-none">Final Fare</span>
                          <span className="text-xs font-black text-emerald-500 flex items-center gap-0.5 leading-none">
                            <IndianRupee size={10} /> {firstPassenger?.amountPaid || 0}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className={`flex items-center gap-2 ${!isMinimized ? "mt-1" : ""}`}>
                      {ride.status !== "in_progress" && ride.status !== "reached" && ride.status !== "completed" ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                            {ride.status === "arrived" ? "Driver has arrived!" : "Driver is heading to your pickup"}
                          </span>
                          {!isMinimized && (
                            <p className="text-[10px] text-white/50">
                              {ride.status === "arrived"
                                ? "Please share your OTP with the driver to start the trip."
                                : "Your OTP is waiting in your notifications."}
                            </p>
                          )}
                        </div>
                      ) : ride.status === "in_progress" || ride.status === "reached" ? (
                        <>
                          <span className="px-2 border rounded-full text-[10px] uppercase font-bold border-emerald-500/30 text-emerald-500">Live</span>
                          <span className="text-xs text-white/50 truncate">
                            {(ride.vehicleType || "PRIME").toUpperCase()} • {ride.status === "reached" ? "Reached Destination" : "En route"}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Ride Completed. Payment Successful.</span>
                      )}
                    </div>
                  </div>
                  {/* SOS Button — only when trip is ongoing */}
                  {ride.status === "in_progress" && (
                    <SOSButton
                      tripId={rideId}
                      warningActive={sosWarningActive}
                      warningReason={sosWarningReason}
                      onWarningClose={() => setSosWarningActive(false)}
                    />
                  )}
                </div>
                
                {/* Passenger Payment UI */}
                {(ride.status === "completed" || ride.status === "reached") && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <p className="text-xs font-bold text-white/80">
                      {ride.status === "reached" ? "📍 Destination Reached! Complete Payment:" : "Select Payment Method:"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={async () => {
                        try {
                          const res = await api.post("/payments/wallet-pay", { rideId: ride._id });
                          if (res.data.success) {
                            showAlert("Wallet payment initiated!", "Success", "success");
                            // Navigation will be handled by socket event
                          }
                        } catch (err) {
                          showAlert(err.response?.data?.message || "Wallet payment failed", "Error", "error");
                        }
                      }} className="bg-primary/20 border border-primary/30 text-primary py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
                        Pay via Wallet
                      </button>
                      <button onClick={async () => {
                        try {
                          const res = await api.post("/payments/create-order", { 
                            amount: firstPassenger?.amountPaid || 0,
                            purpose: "upi_trip",
                            rideId: ride._id
                          });
                          if (res.data.success) {
                            const options = {
                              key: res.data.key,
                              amount: res.data.order.amount,
                              currency: "INR",
                              order_id: res.data.order.id,
                              name: "RouteMate",
                              description: "Trip Payment",
                              handler: function (response) {
                                showAlert("Payment successful! Synchronizing with server...", "Success", "success");
                                // Navigation will be handled by socket event
                              },
                            };
                            const rzp = new window.Razorpay(options);
                            rzp.open();
                          }
                        } catch (err) {
                          showAlert(err.response?.data?.message || "Razorpay initiation failed", "Error", "error");
                        }
                      }} className="bg-blue-500/20 border border-blue-500/30 text-blue-500 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
                        Pay via UPI
                      </button>
                    </div>
                    <button onClick={() => {
                        showAlert("Please pay the driver in cash. Once the driver confirms, your ride will be closed.", "Cash Selected", "info");
                    }} className="w-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
                      I will pay Cash
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
                    <input key={idx} id={`otp-${idx}`} type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-14 h-16 bg-black/50 border border-white/20 rounded-xl text-center text-2xl font-black text-white focus:border-primary focus:bg-primary/5 transition-all outline-none"
                    />
                  ))}
                </div>
              </div>
              <button onClick={() => handleUpdateStatus("in_progress")}
                disabled={otpSlots.join("").length !== 4 || isStartingRequest}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2">
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
