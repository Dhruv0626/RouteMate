import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Navigation, User as UserIcon, Loader2,
  Play, Square, AlertCircle, CheckCircle2, Shuffle, MapPinOff, ChevronRight,
} from "lucide-react";
import { useAuth }          from "../context/AuthContext";
import { useNavigate }      from "react-router-dom";
import ThemeToggle          from "../components/ui/ThemeToggle";
import LocationSearch       from "../components/map/LocationSearch";
import { getMultipleRoutes, getTrafficCondition } from "../utils/geocode";
import { useGeoNavigation } from "../hooks/useGeoNavigation";
import api from "../services/api";

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
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: isSelected ? route.color : "var(--text-main)" }}>
          {route.durationMin} min
        </p>
        <p style={{ margin: 0, fontSize: "11px", color: "var(--text-dim)", marginTop: "1px" }}>{route.distanceStr}</p>
      </div>
    </button>
  );
}

// ─── Published Ride Card ──────────────────────────────────────────────────────
function PublishedRideCard({ ride, isSelected, onClick }) {
  const dep = new Date(ride.departureTime);
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      width: "100%", padding: "10px 12px", borderRadius: "12px",
      border: `2px solid ${isSelected ? "rgba(99,102,241,0.65)" : "var(--card-border)"}`,
      background: isSelected ? "rgba(99,102,241,0.10)" : "transparent",
      cursor: "pointer", textAlign: "left",
      transition: "all 0.18s ease", fontFamily: "'Inter',sans-serif",
      boxShadow: isSelected ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", background: "var(--primary-color, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold",
          color: "#fff"
        }}>
          {ride.driver?.profileImage ? <img src={ride.driver.profileImage} alt="" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : (ride.driver?.name?.[0] || 'D')}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: isSelected ? "#a5b4fc" : "var(--text-main)" }}>
            {ride.driver?.name || "Driver"} · {ride.vehicleType || "Car"}
          </p>
          <p style={{ margin: 0, fontSize: "10px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "6px" }}>
            {ride.status === 'active' ? (
                <span style={{ color: "#4ade80", fontWeight: 700 }}>● LIVE</span>
            ) : ride.status === 'full' ? (
                <span style={{ color: "#ef4444", fontWeight: 700 }}>● FULL</span>
            ) : (
                <span>{ride.availableSeats} seats</span>
            )}
            • <span>{dep.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}</span>
          </p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: isSelected ? "#a5b4fc" : "var(--text-main)" }}>
          {ride.distanceKm ? `~${ride.distanceKm}km` : "Live"}
        </p>
        <p style={{ margin: 0, fontSize: "10px", color: "var(--text-dim)" }}>distance</p>
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
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [pickup,  setPickup]  = useState(null);
  const [dropoff, setDropoff] = useState(null);

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

  // Fetch system config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get("/users/system-settings");
        if (data.success) setSystemConfig(data.settings);
      } catch (err) {
        console.error("Failed to fetch system config:", err.message);
      }
    };
    fetchConfig();
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
        
        // Fetch ALL currently active rides to ensure we show them on the map
        const [fetchedRides, fetchedRoutes] = await Promise.all([
          api.get("/published-rides/available").catch(() => ({ data: { success: true, data: [] } })),
          getMultipleRoutes(from, to, systemConfig)
        ]);
        
        if (fetchedRides.data?.success) {
            setAvailableRides(fetchedRides.data.data || []);
        }
        setRoutes(fetchedRoutes);
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

  // ─── Arrived toast ────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedPublishedRide && pickup && dropoff) {
      const fetchFare = async () => {
        try {
          const { data } = await api.get("/published-rides/fare-estimate", {
            params: {
              rideId: selectedPublishedRide._id,
              passengerLat: pickup.lat,
              passengerLng: pickup.lng,
              destLat: dropoff.lat,
              destLng: dropoff.lng,
              bookingType: "shared",
              seats: 1,
              distanceKm: selectedRoute?.distanceKm
            }
          });
          if (data.success) setFareEstimate(data.data);
        } catch (err) {
          console.error("Fare estimate error:", err.message);
        }
      };
      fetchFare();
    } else {
      setFareEstimate(null);
    }
  }, [selectedPublishedRide, pickup, dropoff]);

  const handleProceed = async () => {
    if (!selectedPublishedRide || !pickup || !dropoff) return;
    setBookingLoading(true);
    try {
      const res = await api.post(`/published-rides/book/${selectedPublishedRide._id}`, {
        bookingType: "shared",
        requestedSeats: 1,
        distanceKm: selectedRoute?.distanceKm,
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
      alert(err.response?.data?.message || "Booking failed.");
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
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
            onClick={() => navigate("/passenger/dashboard")} title="Dashboard">
            <UserIcon size={16} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex flex-1 flex-col lg:flex-row overflow-hidden" style={{ minHeight: "calc(100vh - 73px)" }}>

        {/* ── Sidebar ── */}
        <aside className="flex flex-col gap-4 p-4 sm:p-5 md:w-[390px] md:min-w-[350px] overflow-y-auto"
          style={{ borderRight: "1px solid var(--card-border)" }}>

          {/* Greeting */}
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight" style={{ color: "var(--text-main)" }}>
              Where to, <span style={{ color: "#6366f1" }}>{user?.name?.split(" ")[0] || "there"}?</span>
            </h1>
            <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
              The driver picks the route — you pick the vehicle and fare tier. 🚀
            </p>
          </div>

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

              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
                🧾 Available Drivers
              </p>

              {availableRides.length === 0 ? (
                <div style={{ textAlign: "center", padding: "10px 0", color: "var(--text-dim)", fontSize: "13px" }}>
                  No published rides match your route right now.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {availableRides.map((ride, idx) => (
                    <PublishedRideCard
                      key={ride._id}
                      ride={ride}
                      isSelected={idx === selectedRideIdx}
                      onClick={() => setSelectedRideIdx(idx)}
                    />
                  ))}
                </div>
              )}

              {/* Summary strip */}
              {selectedPublishedRide && (
                <div style={{
                  borderRadius: "12px", padding: "11px 14px",
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)",
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
                    {fareEstimate && (
                        <div>
                            <p style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#a5b4fc", lineHeight: 1 }}>
                                ₹{fareEstimate.sharedTotal}
                            </p>
                            <p style={{ margin: 0, fontSize: "9px", color: "var(--text-dim)", marginTop: "2px" }}>approx fare</p>
                        </div>
                    )}
                    <button
                        onClick={handleProceed}
                        disabled={bookingLoading || !!bookingSuccess}
                        style={{
                        background: "var(--primary-color, #6366f1)", color: "#000", border: "none",
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

          {/* ── Navigation Controls ── */}
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>

            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
              Navigation
            </p>

            {/* Sim toggle */}
            <button onClick={() => setSimulateMode((v) => !v)} disabled={nav.isNavigating} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 12px", borderRadius: "10px", border: "1px solid var(--card-border)",
              background: simulateMode ? "rgba(99,102,241,0.10)" : "transparent",
              cursor: nav.isNavigating ? "not-allowed" : "pointer",
              opacity: nav.isNavigating ? 0.5 : 1, transition: "all 0.2s",
            }}>
              <div className="flex items-center gap-2">
                <Shuffle size={13} style={{ color: simulateMode ? "#6366f1" : "var(--text-dim)" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: simulateMode ? "#6366f1" : "var(--text-dim)" }}>Demo / Simulation mode</span>
              </div>
              <div style={{ width: 34, height: 18, borderRadius: 9, background: simulateMode ? "#6366f1" : "var(--card-border)", position: "relative", transition: "background 0.25s" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: simulateMode ? 18 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
            </button>

            {simulateMode && (
              <p style={{ fontSize: "11px", color: "var(--text-dim)", margin: 0 }}>
                🛵 Auto-moves marker along the selected route — great for testing.
              </p>
            )}

            <button onClick={handleToggleNavigation} disabled={!canNavigate && !nav.isNavigating} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", padding: "12px", borderRadius: "12px", border: "none",
              fontSize: "13px", fontWeight: 700,
              cursor: (!canNavigate && !nav.isNavigating) ? "not-allowed" : "pointer",
              opacity: (!canNavigate && !nav.isNavigating) ? 0.45 : 1,
              background: nav.isNavigating
                ? "linear-gradient(135deg,#ef4444,#dc2626)"
                : "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "#fff",
              boxShadow: nav.isNavigating ? "0 4px 16px rgba(239,68,68,0.35)" : "0 4px 16px rgba(99,102,241,0.35)",
              transition: "all 0.25s ease", fontFamily: "'Inter',sans-serif",
            }}>
              {nav.isNavigating
                ? <><Square size={15} fill="#fff" /> Stop Navigation</>
                : <><Play  size={15} fill="#fff" /> Start Navigation</>
              }
            </button>
          </div>

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
