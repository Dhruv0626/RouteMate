import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Navigation, User as UserIcon, Loader2,
  Play, Square, AlertCircle, CheckCircle2, Shuffle, MapPinOff, ChevronRight,
  Gift, Ticket, Lock, IndianRupee
} from "lucide-react";
import { useAuth }          from "../context/AuthContext";
import { useDialog }        from "../context/DialogContext";
import { useNavigate, useLocation }      from "react-router-dom";
import ThemeToggle          from "../components/ui/ThemeToggle";
import LocationSearch       from "../components/map/LocationSearch";
import { getMultipleRoutes, getTrafficCondition } from "../utils/geocode";
import { useGeoNavigation } from "../hooks/useGeoNavigation";
import api from "../services/api";
import { openRazorpayCheckout } from "../services/paymentService";

const VEHICLE_METADATA = {
  MOTO: { name: "Bike", desc: "Affordable bike rides", image: "/images/Moto.png", tag: "" },
  EVMOTO: { name: "Electric Bike", desc: "Eco-friendly",image: "/images/EVmoto.png" , tag: "Eco" },
  AUTO: { name: "Auto", desc: "Quick city transport", image: "/images/Auto.png", tag: "" },
  EVAUTO: { name: "Electric Auto", desc: "Green city transport", image: "/images/EVauto.png", tag: "Eco" },
  GO: { name: "GO", desc: "Affordable Hatchback", image: "/images/Go.png", tag: "" },
  EVGO: { name: "Electric GO", desc: "Sustainable Hatchback",image: "/images/EVgo.png", tag: "Eco" },
  PRIME: { name: "Prime Sedan", desc: "Top-rated comfort sedans", image: "/images/Prime.png", tag: "Premium" },
  XL: { name: "SUV XL", desc: "Spacious SUVs for clans", image: "/images/XL.png", tag: "Spacious" }
};

const RideMap = lazy(() => import("../components/map/RideMap"));

// ─── Map Skeleton ─────────────────────────────────────────────────────────────
function MapSkeleton() {
  return (
    <div className="w-full h-full rounded-2xl flex items-center justify-center"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex flex-col items-center gap-3 opacity-50">
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--text-dim)" }} />
        <p style={{ color: "var(--text-dim)", fontSize: "13px", fontWeight: 500 }}>Loading map…</p>
      </div>
    </div>
  );
}

// ─── Traffic Badge ────────────────────────────────────────────────────────────
function TrafficBadge({ traffic }) {
  if (!traffic) return null;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
      background: `${traffic.color}18`, border: `1px solid ${traffic.color}40`,
      color: traffic.color, whiteSpace: "nowrap",
    }}>
      {traffic.icon} {traffic.label}
    </div>
  );
}

// ─── Route Selector Card ──────────────────────────────────────────────────────
function RouteCard({ route, isSelected, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      width: "100%", padding: "10px 12px", borderRadius: "12px",
      border: `2px solid ${isSelected ? route.color : "var(--card-border)"}`,
      background: isSelected ? `${route.color}14` : "transparent",
      cursor: "pointer", textAlign: "left",
      transition: "all 0.18s ease", fontFamily: "'Inter',sans-serif",
      boxShadow: isSelected ? `0 0 0 3px ${route.color}22` : "none",
    }}>
      {/* Color stripe */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: 4, height: 36, borderRadius: 4,
          background: route.color, flexShrink: 0,
          opacity: isSelected ? 1 : 0.45,
        }} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: isSelected ? route.color : "var(--text-main)" }}>
              {route.label}
            </span>
            {route.id === 0 && (
              <span style={{
                fontSize: "9px", fontWeight: 700, padding: "1px 6px",
                borderRadius: "6px", background: `${route.color}25`, color: route.color,
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>Best</span>
            )}
          </div>
          <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>{route.tag}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ textAlign: "right" }}>
        <div style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: isSelected ? route.color : "var(--text-main)" }}>
          {route.durationMin} min
        </div>
        <div style={{ margin: 0, fontSize: "11px", color: "var(--text-dim)", marginTop: "1px" }}>{route.distanceStr}</div>
      </div>
    </button>
  );
}

// ─── Published Ride Card ──────────────────────────────────────────────────────
function PublishedRideCard({ ride, isSelected, onClick, durationMin = 0, passengerPickup }) {
  const meta = VEHICLE_METADATA[ride.vehicleType?.toUpperCase()] || { name: ride.vehicleType, capacity: 4, desc: "Safe city ride", icon: "🚗" };
  const [travelToPickupMins, setTravelToPickupMins] = useState(null);

  // ── Real Timing from departure time + OSRM route ──
  useEffect(() => {
    // Prefer driver's live GPS coordinates (if active) over static published source
    const driverSrc = ride.driverLocation || ride.source?.location?.coordinates; // [lng, lat]
    const passPickup = passengerPickup; // { lat, lng } passenger's pickup

    if (!driverSrc || !passPickup || !ride.departureTime) return;

    let cancelled = false;
    const fetchEta = async () => {
      try {
        // Fetch driver source → Passenger pickup travel time
        const { fetchRouteInfo } = await import("../utils/routing");
        const info = await fetchRouteInfo(driverSrc[1], driverSrc[0], passPickup.lat, passPickup.lng);
        if (!cancelled && info) {
          setTravelToPickupMins(info.durationMin);
        }
      } catch (e) {
        // silently fail
      }
    };
    fetchEta();
    return () => { cancelled = true; };
  }, [ride._id, passengerPickup?.lat, passengerPickup?.lng, ride.departureTime]);

  // ── Derived timing values based entirely on live driver position to pickup ──
  const { pickupEstText, dropEstText, minsUntilPickup, delayMins } = (() => {
    const now = Date.now();
    const fmtTime = (d) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    if (travelToPickupMins === null) {
      return { pickupEstText: null, dropEstText: null, minsUntilPickup: null, delayMins: 0 };
    }

    // Dynamic pickup time = current timestamp + live driving duration to pickup
    const pickupArrival = new Date(now + travelToPickupMins * 60000);

    // Dynamic drop time = pickup time + duration of the ride category path itself
    const dropArrival = new Date(pickupArrival.getTime() + durationMin * 60000);

    return {
      pickupEstText: fmtTime(pickupArrival),
      dropEstText: fmtTime(dropArrival),
      minsUntilPickup: travelToPickupMins,
      delayMins: 0
    };
  })();

  // ── Arrival chip text (handles live tracking duration) ──
  const arrivalText = travelToPickupMins === null
    ? "Calculating…"
    : minsUntilPickup <= 0
      ? "Arriving now"
      : `~${minsUntilPickup} min${minsUntilPickup > 1 ? "s" : ""} away`;

  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      width: "100%", padding: "14px 16px", borderRadius: "20px",
      border: `2px solid ${isSelected ? "black" : "grey"}`,
      background: isSelected ? "rgba(37,99,235,0.04)" : "var(--card-bg)",
      cursor: "pointer", textAlign: "left",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      fontFamily: "'Inter', sans-serif",
      boxShadow: isSelected ? "0 8px 24px -12px rgba(37,99,235,0.3)" : "none",
      position: 'relative',
      marginBottom: '8px'
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
        {/* Left: Icon/Badge */}
        <div style={{ 
          width: "56px", height: "56px", 
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isSelected ? "rgba(37,99,235,0.1)" : "var(--bg-main)",
          borderRadius: "16px", flexShrink: 0,
          overflow: 'hidden'
        }}>
          {meta.image ? (
            <img src={meta.image} alt={meta.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '100%', textAlign: 'center', fontSize: '28px' }}>
              {meta.icon}
            </div>
          )}
        </div>

        {/* Middle: Data */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-main)" }}>
                {meta.name}
            </span>

            {meta.tag && (
                 <span style={{ 
                    fontSize: "9px", fontWeight: 900, px: "6px", py: "2px", 
                    background: "#4ade8020", color: "#4ade80", borderRadius: "4px",
                    textTransform: 'uppercase', letterSpacing: '0.04em', padding: '1px 5px'
                  }}>{meta.tag}</span>
            )}
          </div>
          
          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-dim)", fontWeight: 500, marginBottom: "4px" }}>
            {meta.desc}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, flexWrap: 'wrap' }}>
             {/* Mins away chip */}
             <span style={{ 
               color: delayMins > 0 ? "#f59e0b"
                 : minsUntilPickup !== null && minsUntilPickup <= 5 ? "#4ade80" 
                 : "var(--text-dim)" 
             }}>
               {arrivalText}
             </span>
             {pickupEstText && (
               <>
                 <span style={{ color: "var(--text-dim)", opacity: 0.3 }}>•</span>
                 <span style={{ color: delayMins > 0 ? "#f59e0b80" : "var(--text-dim)" }}>
                   Pickup ~{pickupEstText}
                   {delayMins > 0 && <span style={{ fontSize: "9px", marginLeft: "2px", opacity: 0.7 }}>⚠️</span>}
                 </span>
               </>
             )}
             {dropEstText && (
               <>
                 <span style={{ color: "var(--text-dim)", opacity: 0.3 }}>•</span>
                 <span style={{ color: "var(--text-dim)" }}>Drop ~{dropEstText}</span>
               </>
             )}
             <span style={{ fontSize: "9px", color: "var(--text-dim)", opacity: 0.5, fontStyle: "italic" }}>(est.)</span>
          </div>
        </div>
      </div>

      {/* Right: Price */}
      <div style={{ textAlign: "right", marginLeft: '12px' }}>
        <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--text-main)" }}>
          {ride.price > 0 ? `₹${Math.round(ride.price)}` : (
            <div className="w-12 h-6 bg-white/5 rounded-md animate-pulse ml-auto" />
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Dot ─────────────────────────────────────────────────────────────────────
function Dot({ color }) {
  return (
    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%",
      background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}80` }} />
  );
}

// ─── RideMapPage ──────────────────────────────────────────────────────────────
const RideMapPage = () => {
  const { user, setUser } = useAuth();
  const { showAlert } = useDialog();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [pickup,  setPickup]  = useState(null);
  const [dropoff, setDropoff] = useState(null);

  // Initialize dropoff from navigation state (like Saved Places)
  useEffect(() => {
    if (location.state?.destination && location.state?.location?.coordinates) {
      const { destination, location: dstLocation } = location.state;
      setDropoff({
        name: destination,
        lng: dstLocation.coordinates[0],
        lat: dstLocation.coordinates[1]
      });
      // Clear the state so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-fetch routes if user gets dropped into the page with a prefilled dropoff and GPS finally acquires pickup
  useEffect(() => {
    if (pickup && dropoff && routes.length === 0 && !isLoadingRoutes) {
      fetchRoutes(pickup, dropoff);
    }
  }, [pickup, dropoff]);

  // Multi-route state
  const [routes,           setRoutes]           = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [isLoadingRoutes,  setIsLoadingRoutes]  = useState(false);
  const [traffic,          setTraffic]          = useState(null);

  const [availableRides, setAvailableRides] = useState([]);
  const [selectedRideIdx, setSelectedRideIdx] = useState(0);

  // Simulation mode
  const [simulateMode, setSimulateMode] = useState(false);

  // Always-on GPS dot
  const [userLocation, setUserLocation] = useState(null);
  const [systemConfig, setSystemConfig] = useState(null);
  const [fareEstimate, setFareEstimate] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  const [payingPenalty, setPayingPenalty] = useState(false);
  const handlePayPenalty = async () => {
    if (!user?.dueBalance || user.dueBalance <= 0) return;
    setPayingPenalty(true);
    try {
      const response = await openRazorpayCheckout({
        amount: user.dueBalance,
        purpose: "penalty_payment",
        name: user.name || "",
        email: user.email || "",
        description: `Clear cancellation penalty of ₹${user.dueBalance}`,
      });
      if (response && response.success) {
        showAlert("Payment successful! Your account is now active.", "Success", "success");
        setUser({ 
          ...user, 
          dueBalance: response.newDueBalance, 
          accountStatus: response.accountStatus 
        });
      }
    } catch (err) {
      showAlert(err.message || "Payment failed", "Error", "error");
    } finally {
      setPayingPenalty(false);
    }
  };

  const [referralInput, setReferralInput] = useState("");
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [referralStatus, setReferralStatus] = useState(null);

  const handleApplyReferral = async () => {
    if (!referralInput.trim()) return;
    setApplyingReferral(true);
    setReferralStatus(null);
    try {
      const res = await api.post("/users/apply-referral", { code: referralInput });
      if (res.data.success) {
        setReferralStatus({ type: "success", msg: res.data.message });
        setReferralInput("");
      }
    } catch (err) {
      setReferralStatus({ type: "error", msg: err.response?.data?.message || "Failed to apply code" });
    } finally {
      setApplyingReferral(false);
    }
  };

  // Fetch system config and check for active rides
  useEffect(() => {
    const fetchConfigAndActiveRide = async () => {
      try {
        const { data } = await api.get("/users/system-settings");
        if (data.success) setSystemConfig(data.settings);

         // Check for active rides to redirect
         const liveRes = await api.get("/published-rides/my-booked");
         if (liveRes.data.success && liveRes.data.data.length > 0) {
            const activeRide = liveRes.data.data.find(r => {
              if (r.status === 'completed' || r.status === 'cancelled') return false;
              const pId = user?.id || user?._id;
              const myBookings = r.myBookings || r.bookings?.filter(b => (b.passenger?._id || b.passenger || b.passenger?.id)?.toString() === pId?.toString()) || [];
              return myBookings.some(b => b.status === 'confirmed' || b.status === 'pending');
            });
           if (activeRide) {
             // Redirect passengers to their dedicated live tracking page
             if (activeRide.status === "in_progress" || activeRide.status === "reached") {
                navigate(`/passenger/live-tracking/${activeRide._id}`, { replace: true });
             } else {
                // For pickup phase as well, use the new live tracking page
                navigate(`/passenger/live-tracking/${activeRide._id}`, { replace: true });
             }
           }
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err.message);
      }
    };
    fetchConfigAndActiveRide();
  }, []);

  // ─── GPS watch (respects locationTracking setting) ────────────────────────
  const [locationBlocked, setLocationBlocked] = useState(false);
  useEffect(() => {
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    if (!appSettings.locationTracking) {
      setLocationBlocked(true);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => console.warn("[RideMapPage] GPS:", e.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    const wid = navigator.geolocation.watchPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => console.warn("[RideMapPage] watch:", e.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // ─── Derived selected route ───────────────────────────────────────────────
  const selectedRoute = routes[selectedRouteIdx] ?? null;
  const routeCoords   = selectedRoute?.coords ?? [];
  const routeInfo     = selectedRoute
    ? { distance: selectedRoute.distanceStr, duration: selectedRoute.durationMin }
    : { distance: "", duration: null };
  const selectedPublishedRide = availableRides?.[selectedRideIdx] ?? null;

  // ─── Navigation hook ──────────────────────────────────────────────────────
  const nav = useGeoNavigation({ routeCoords, pickup, dropoff, simulate: simulateMode });

  // ─── Fetch routes ─────────────────────────────────────────────────────────
  const fetchRoutes = async (from, to) => {
    if (!from || !to) return;
    setIsLoadingRoutes(true);
    setRoutes([]);
    setSelectedRouteIdx(0);
      try {
        setTraffic(getTrafficCondition());
        
        // 1. Fetch routes first and keep ONLY the single shortest/fastest one
        const fetchedRoutes = await getMultipleRoutes(from, to, systemConfig);
        setRoutes(fetchedRoutes.length > 0 ? [fetchedRoutes[0]] : []);

        // 2. Fetch rides with the precise road distance from the best route
        const bestRouteDist = fetchedRoutes[0]?.distanceKm;
        
        const fetchedRides = await api.get("/published-rides/available", {
            params: {
              srcLat: from.lat, srcLng: from.lng,
              dstLat: to.lat,   dstLng: to.lng,
              distanceKm: bestRouteDist
            }
        }).catch(() => ({ data: { success: true, data: [] } }));
        
        if (fetchedRides.data?.success) {
            setAvailableRides(fetchedRides.data.data || []);
        }
      } catch (e) {
      console.error("[RideMapPage] fetch data error:", e.message);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const [showLocationPopup, setShowLocationPopup] = useState(false);

  const handlePickupSelect  = async (loc) => {
    // Check location when user tries to set pickup
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    if (!appSettings.locationTracking) {
      setShowLocationPopup(true);
      return;
    }
    setPickup(loc);
    if (loc && dropoff) await fetchRoutes(loc, dropoff);
    else { setRoutes([]); setTraffic(null); }
  };
  const handleDropoffSelect = async (loc) => {
    setDropoff(loc);
    if (pickup && loc) await fetchRoutes(pickup, loc);
    else { setRoutes([]); setTraffic(null); }
  };

  // ─── Navigation controls ──────────────────────────────────────────────────
  const canNavigate = pickup && dropoff && routeCoords.length > 0;
  const handleToggleNavigation = () => nav.isNavigating ? nav.stopNavigation() : nav.startNavigation();

  // Update fare estimate whenever ride or route changes — USE ACTUAL ROAD DISTANCE
  useEffect(() => {
    const fetchFare = async () => {
      if (!selectedPublishedRide || !selectedRoute) {
        setFareEstimate(null);
        return;
      }
      
      setIsCalculatingFare(true);
      try {
        const res = await api.get("/published-rides/fare-estimate", {
          params: {
            rideId: selectedPublishedRide._id,
            distanceKm: selectedRoute.distanceKm, // PURE ROAD DISTANCE
            durationMin: selectedRoute.durationMin // PURE ROAD DURATION
          }
        });
        if (res.data.success) {
          setFareEstimate(res.data.data);
        }
      } catch (err) {
        console.error("Fare estimate failed:", err);
      } finally {
        setTimeout(() => setIsCalculatingFare(false), 300); // Tiny delay for smooth transition
      }
    };

    fetchFare();
  }, [selectedPublishedRide, selectedRoute]);

  const handleProceed = async () => {
    if (!selectedPublishedRide || !pickup || !dropoff) return;
    setBookingLoading(true);
    try {
      const res = await api.post(`/published-rides/book/${selectedPublishedRide._id}`, {
        bookingType: "private",
        requestedSeats: 1,
        distanceKm: selectedRoute?.distanceKm,
        durationMin: selectedRoute?.durationMin,
        passengerSource: {
          address: pickup.name,
          location: { type: "Point", coordinates: [pickup.lng, pickup.lat] }
        },
        passengerDestination: {
          address: dropoff.name,
          location: { type: "Point", coordinates: [dropoff.lng, dropoff.lat] }
        }
      });
      if (res.data.success) {
        setBookingSuccess("Booking request sent! Driver will be notified.");
        setTimeout(() => navigate("/passenger/dashboard"), 2500);
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Booking failed.", "Booking Error", "error");
    } finally {
      setBookingLoading(false);
    }
  };
  const [showArrival, setShowArrival] = useState(false);
  useEffect(() => {
    if (!nav.arrived) return;
    setShowArrival(true);
    const t = setTimeout(() => setShowArrival(false), 5000);
    return () => clearTimeout(t);
  }, [nav.arrived]);

  // ─── Auto-refresh traffic every 5 min ────────────────────────────────────
  useEffect(() => {
    if (!pickup || !dropoff) return;
    const id = setInterval(() => fetchRoutes(pickup, dropoff), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [pickup, dropoff]);

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden"
      style={{ background: "var(--bg-main)", color: "var(--text-main)" }}>

      {/* Location Required Popup */}
      {showLocationPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden border border-(--card-border)">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
            <div className="mb-6 flex justify-center">
              <div className="bg-red-500/20 p-4 rounded-full text-red-500">
                <MapPinOff size={36} />
              </div>
            </div>
            <h2 className="font-display text-xl font-black text-center text-(--text-main) mb-2">Location Required</h2>
            <p className="text-sm font-medium text-center text-(--text-dim) mb-6">
              You need to enable <strong>Location Tracking</strong> in your Settings to book rides and share your pickup location with drivers.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowLocationPopup(false); navigate('/passenger/dashboard/settings'); }}
                className="w-full bg-primary text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-primary/20"
              >
                Open Settings <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setShowLocationPopup(false)}
                className="w-full py-3 rounded-xl text-sm font-bold text-(--text-dim) hover:text-(--text-main) transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arrival toast */}
      {showArrival && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "rgba(16,85,16,0.95)", border: "1px solid #22c55e",
          borderRadius: "16px", padding: "14px 24px",
          display: "flex", alignItems: "center", gap: "10px",
          boxShadow: "0 8px 32px rgba(34,197,94,0.3)", animation: "fadeIn 0.3s ease",
        }}>
          <CheckCircle2 size={20} color="#4ade80" />
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#f0fdf4" }}>
            You have arrived at your destination! 🎉
          </span>
        </div>
      )}

      {/* Header */}
      <header className="relative z-50 flex w-full items-center justify-between px-4 py-4 sm:px-6"
        style={{ borderBottom: "1px solid var(--card-border)" }}>
        <div className="cursor-pointer rounded-2xl px-4 py-2 transition-transform duration-300 hover:scale-105"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", backdropFilter: "blur(12px)" }}
          onClick={() => navigate("/passenger/dashboard")}>
          <span className="font-display text-xl font-bold tracking-tighter">
            <span style={{ background: "linear-gradient(135deg, var(--text-main), var(--text-dim))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic" }}>Route</span>
            <span style={{ color: "var(--color-primary)" }}>Mate</span>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-3 py-2"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", backdropFilter: "blur(12px)" }}>
          <ThemeToggle />
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-primary/10 text-primary"
            onClick={() => navigate("/passenger/dashboard")} title="Dashboard">
            <UserIcon size={16} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex flex-1 flex-col lg:flex-row overflow-hidden" style={{ minHeight: "calc(100vh - 73px)" }}>

        {/* ── Sidebar ── */}
        {user?.accountStatus === "payment_due" ? (
          <aside className="flex flex-col gap-4 p-4 sm:p-5 md:w-[390px] md:min-w-[350px] overflow-y-auto"
            style={{ borderRight: "1px solid var(--card-border)" }}>
            <div className="flex flex-col items-center justify-start pt-10 px-4 text-center h-full animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-black text-(--text-main) mb-2">Booking Restricted</h2>
              <p className="text-sm text-(--text-dim) mb-6">
                You have a pending cancellation penalty of <span className="text-red-500 font-bold">₹{user.dueBalance}</span>. 
                Please clear this balance to resume booking rides.
              </p>
              
              <div className="space-y-3 w-full">
                <button 
                  onClick={handlePayPenalty}
                  disabled={payingPenalty}
                  className="w-full py-4 bg-primary text-black font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Pay ₹{user.dueBalance} Now
                </button>
                <button 
                  onClick={() => navigate("/passenger/dashboard")}
                  className="w-full py-3 bg-white/5 text-(--text-dim) font-bold rounded-2xl hover:bg-white/10 transition-all text-xs uppercase tracking-widest"
                >
                  Return to Dashboard
                </button>
              </div>
              
              <p className="mt-8 text-[10px] text-(--text-dim) uppercase tracking-tighter opacity-50">
                Secured by RouteMate Payment Engine
              </p>
            </div>
          </aside>
        ) : (
          <aside className="flex flex-col gap-4 p-4 sm:p-5 md:w-[390px] md:min-w-[350px] overflow-y-auto"
            style={{ borderRight: "1px solid var(--card-border)" }}>

          {/* Greeting */}
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight" style={{ color: "var(--text-main)" }}>
              Where to, <span style={{ color: "#ffcc00" }}>{user?.name?.split(" ")[0] || "there"}?</span>
            </h1>
            <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
              The driver picks the route — you pick the vehicle and fare tier. 
            </p>
          </div>

          {/* ── Referral Box (Only for first ride) ── */}
          {user?.role === "passenger" && (user?.passengerStats?.totalTrips || 0) === 0  && !user?.referredBy && (
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 relative overflow-hidden group"
                 style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
              <div className="absolute -right-2 -top-2 opacity-5 group-hover:rotate-12 transition-transform duration-500">
                 <Gift size={80} className="text-primary" />
              </div>
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Ticket size={16} className="text-primary mb-0.1" />
                  <span style={{ fontSize: "13px", fontWeight: 900, color: "var(--text-main)" }}>Referral Code?</span>
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                    placeholder="CODE123"
                    className="flex-1 px-3 py-2 bg-(--bg-main) border border-(--card-border) rounded-xl text-xs font-black focus:border-indigo-500/60 outline-none uppercase"
                    style={{ background: "var(--bg-main)", border: "1px solid var(--card-border)", color: "var(--text-main)" }}
                  />
                  <button 
                    onClick={handleApplyReferral}
                    disabled={applyingReferral || !referralInput}
                    className="px-4 py-2 bg-primary text-black font-black rounded-xl text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {applyingReferral ? "..." : "Apply"}
                  </button>
                </div>
              </div>
              {referralStatus && (
                <p className={`text-[10px] font-bold mt-2 px-2 py-1 rounded-lg border inline-block ${
                  referralStatus.type === 'error' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}>
                  {referralStatus.msg}
                </p>
              )}
            </div>
          )}

          {/* ── Location Inputs ── */}
          <div className="rounded-2xl p-4 flex flex-col gap-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <div className="relative">
              <div style={{ position: "absolute", left: "5px", top: "40px", bottom: "20px", width: "3px", background: "linear-gradient(to bottom, #22c55e, #ef4444)", borderRadius: "2px", opacity: 0.4, zIndex: 0 }} />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e80", border: "2px solid #fff", marginTop: 32, flexShrink: 0, position: "relative", zIndex: 2 }} />
                  <div className="flex-1">
                    <LocationSearch
                      label="Pickup"
                      placeholder="Where are you now?"
                      onSelect={handlePickupSelect}
                      showCurrentLocation={true}
                      currentLocation={userLocation}
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 10px #ef444480", border: "2px solid #fff", marginTop: 32, flexShrink: 0, position: "relative", zIndex: 2 }} />
                  <div className="flex-1">
                    <LocationSearch
                      label="Destination"
                      placeholder="Where are you going?"
                      onSelect={handleDropoffSelect}
                      value={dropoff?.name || ""}
                    />
                  </div>
                </div>
              </div>
            </div>

            {isLoadingRoutes && (
              <div className="flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
                <Loader2 size={13} className="animate-spin" />
                <span style={{ fontSize: "12px" }}>Finding best routes with live traffic…</span>
              </div>
            )}
            {nav.error && (
              <div className="rounded-xl p-3 flex items-center gap-2"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertCircle size={14} color="#ef4444" />
                <span style={{ fontSize: "12px", color: "#ef4444" }}>{nav.error}</span>
              </div>
            )}
          </div>

          {/* ── Driver Selector ── */}
          {selectedRoute && !nav.isNavigating && (
            <div className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>

              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginLeft: "2.5%" }}>
                 Available Rides              </p>

              {availableRides.length === 0 ? (
                <div style={{ textAlign: "center", padding: "10px 0", color: "var(--text-dim)", fontSize: "13px" }}>
                  No published rides match your route right now.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {availableRides.map((ride, idx) => {
                    const isSelected = idx === selectedRideIdx;
                    // Hide price while calculating to avoid "jumping" numbers
                    const displayPrice = (isSelected && isCalculatingFare) ? null : ((isSelected && fareEstimate) ? fareEstimate.totalFare : ride.price);
                    
                    return (
                      <PublishedRideCard
                        key={ride._id}
                        ride={{ ...ride, price: displayPrice }}
                        isSelected={isSelected}
                        durationMin={selectedRoute.durationMin}
                        passengerPickup={pickup}
                        onClick={() => setSelectedRideIdx(idx)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Summary strip */}
              {selectedPublishedRide && (
                <div style={{
                  borderRadius: "12px", padding: "11px 14px",
                  background: "", border: "1px solid rgba(99,102,241,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "var(--text-dim)" }}>
                      Driving {selectedPublishedRide.vehicleType} {selectedPublishedRide.status === 'active' ? '● LIVE' : ''}
                    </p>
                    <p style={{ margin: 0, fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                       {selectedPublishedRide.driver?.name} is on this route
                    </p>
                    {bookingSuccess && (
                        <p style={{ margin: 0, fontSize: "11px", color: "#4ade80", fontWeight: 700, marginTop: "4px" }}>
                          {bookingSuccess}
                        </p>
                    )}
                  </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div className="flex flex-col items-end">
                        {isCalculatingFare ? (
                          <div className="w-16 h-8 bg-white/10 rounded-lg animate-pulse" />
                        ) : (
                          <>
                            <p style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
                                ₹{Math.round(fareEstimate?.totalFare || 0)}
                            </p>
                            <p style={{ margin: 0, fontSize: "9px", color: "var(--text-dim)", marginTop: "2px" }}>final fare</p>
                          </>
                        )}
                      </div>
                    <button
                        onClick={handleProceed}
                        disabled={bookingLoading || !!bookingSuccess}
                        style={{
                        background: "#ffcc00", color: "#000", border: "none",
                        padding: "10px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 800,
                        cursor: (bookingLoading || bookingSuccess) ? "not-allowed" : "pointer", 
                        transition: "all 0.15s ease",
                        opacity: (bookingLoading || bookingSuccess) ? 0.6 : 1,
                        display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                        {bookingLoading ? <Loader2 size={14} className="animate-spin" /> : 'Proceed'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Live HUD ── */}
          {nav.isNavigating && (
            <div className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.25)", animation: "fadeIn 0.3s ease" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Live Navigation</p>
              <div className="flex items-start gap-2">
                <Navigation size={15} style={{ color: "#6366f1", marginTop: 1, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text-main)", lineHeight: 1.5 }}>{nav.nextInstruction}</p>
              </div>
              <div className="flex gap-3">
                {[["REMAINING", nav.remainingDist != null ? `${(nav.remainingDist / 1000).toFixed(1)} km` : "—"],
                  ["ETA",       nav.remainingMin  != null ? `${nav.remainingMin} min` : "—"]].map(([label, val]) => (
                  <div key={label} className="flex-1 rounded-xl p-3" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                    <p style={{ margin: 0, fontSize: "10px", color: "var(--text-dim)", fontWeight: 600, marginBottom: 3 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#a5b4fc" }}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 pt-1">
                {[["#475569","Travelled"],["#6366f1","Remaining"],["#6366f1","You"]].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1.5"><Dot color={c} /><span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{l}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* ── Arrived ── */}
          {nav.arrived && (
            <div className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ background: "rgba(16,85,16,0.15)", border: "1px solid rgba(34,197,94,0.35)" }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} color="#4ade80" />
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#4ade80" }}>Arrived at destination!</p>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-dim)" }}>{dropoff?.name}</p>
              {selectedPublishedRide && (
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#4ade80", marginTop: "4px" }}>
                  Completed Ride with {selectedPublishedRide.driver?.name}
                </p>
              )}
            </div>
          )}
        </aside>
        )}

        {/* ── Map area ── */}
        <section className="relative flex-1 order-first lg:order-none" style={{ minHeight: "450px" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-[#05080f]"><Loader2 className="animate-spin text-indigo-500" /></div>}>
            <RideMap
              pickup={pickup}
              dropoff={dropoff}
              driverLocation={null}
              userLocation={userLocation}
              allRoutes={routes}
              availableRides={availableRides}
              selectedRouteIdx={selectedRouteIdx}
              onRouteSelect={null}   // Route is locked by driver
              isNavigating={nav.isNavigating}
              currentPos={nav.currentPos}
              heading={nav.heading}
              travelledCoords={nav.travelledCoords}
              remainingCoords={nav.remainingCoords}
              remainingDist={nav.remainingDist}
              remainingMin={nav.remainingMin}
              arrived={nav.arrived}
              routeCoords={routeCoords}
              routeInfo={routeInfo}
              vehicleType={selectedPublishedRide?.vehicleType}
            />
          </Suspense>
          </div>
        </section>
      </main>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default RideMapPage;
