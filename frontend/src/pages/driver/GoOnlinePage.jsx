import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Zap,
  Clock,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  Power,
  MapPinOff,
  BatteryCharging,
  Wifi,
  ChevronRight,
  Users,
  Calendar,
  Send,
  Car,
  Plus,
  X,
  Navigation,
  Info,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useDialog } from "../../context/DialogContext";
import LocationSearch from "../../components/map/LocationSearch";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { makeVehicleIcon, makePin, makeSimplePin } from "../../utils/mapIcons";
import { getMyDriverProfile, updateDriverStatus } from "../../services/driverProfileService";
import api from "../../services/api";
import { reverseGeocode } from "../../utils/geocode";
import Loader from "../../components/ui/Loader";

// ── Leaflet icons ────────────────────────────────────────────────────────────
const greenIcon = makeSimplePin("#22c55e");
const redIcon   = makeSimplePin("#ef4444");

// ── Haversine distance ────────────────────────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


// ── MapClickPicker: inner component that handles click events ─────────────────
const MapClickPicker = ({ pickingMode, onPick }) => {
  useMapEvents({
    click(e) {
      if (pickingMode) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// ── Main component ────────────────────────────────────────────────────────────
const GoOnlinePage = () => {
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState("");
  const [publishError, setPublishError] = useState("");
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [showMapGuide, setShowMapGuide] = useState(false);

  // Map picking state
  const [pickingMode, setPickingMode] = useState(null); // "source" | "destination" | null
  const [sourcePin, setSourcePin] = useState(null);     // { lat, lng, address }
  const [destPin, setDestPin]     = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [fetchingRoute, setFetchingRoute] = useState(false);

  // Device stats
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);
  const [signalStrength, setSignalStrength] = useState(null);
  const [connectionType, setConnectionType] = useState("Unknown");
  const [isOnlineNet, setIsOnlineNet] = useState(navigator.onLine);
  const [userLocation, setUserLocation] = useState({ lat: 23.0225, lng: 72.5714 });

  // Form state (no baseFare — system-calculated)
  const nowIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [rideForm, setRideForm] = useState({
    departureTime: nowIso,
  });

  // ── Lifecycle ----------------------------------------------------------------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, historyRes, liveRes] = await Promise.all([
          getMyDriverProfile(),
          api.get("/rides/driver-history"),
          api.get("/published-rides/my-published").catch(() => ({ data: { data: [] } }))
        ]);

        if (profileRes.data.success) {
          setProfile(profileRes.data.data);
          setIsOnline(profileRes.data.data.isOnline);
          localStorage.setItem("driverIsOnline", profileRes.data.data.isOnline?.toString() || "false");
          
          // Override stats with actual live history data for consistency (same as dashboard)
          if (historyRes.data.success) {
            const historyStats = historyRes.data.data.stats;
            const liveRides = liveRes.data?.data || [];
            
            setProfile(prev => ({
              ...prev,
              stats: {
                ...prev.stats,
                totalRides: liveRides.length || historyStats.totalRides || 0,
                completedRides: historyStats.completedRides || 0
              }
            }));
          }
        }
      } catch (err) {
        console.error("Fetch profile/stats error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();

    // Real geolocation
    const appSettings = JSON.parse(localStorage.getItem("appSettings") || "{}");
    if (appSettings.locationTracking !== false && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }

    // Battery
    if ("getBattery" in navigator) {
      navigator.getBattery().then((battery) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);
        battery.addEventListener("levelchange", () => setBatteryLevel(Math.round(battery.level * 100)));
        battery.addEventListener("chargingchange", () => setIsCharging(battery.charging));
      }).catch(() => setBatteryLevel(null));
    }

    // Network
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      const calculateNetInfo = () => {
        const dl = conn.downlink || 0;
        let signal = 1;
        let type = conn.effectiveType?.toUpperCase() || "LTE";
        
        // Signal Mapping based on speed (MBPS)
        if (dl >= 8) signal = 5;
        else if (dl >= 4) signal = 4;
        else if (dl >= 1.5) signal = 3;
        else if (dl >= 0.5) signal = 2;
        else signal = 1;

        // Enhanced type detection
        if (dl >= 15) type = "FIBER / 5G+";
        else if (dl >= 5) type = "4G / LTE";
        else if (dl >= 1) type = "3G / HSPA";
        else type = "2G / EDGE";

        return { signal, type };
      };

      const { signal, type } = calculateNetInfo();
      setSignalStrength(signal);
      setConnectionType(type);

      conn.addEventListener("change", () => {
        const updated = calculateNetInfo();
        setSignalStrength(updated.signal);
        setConnectionType(updated.type);
      });
    } else {
      setSignalStrength(navigator.onLine ? 4 : 0);
    }

    // Online/offline
    const up = () => setIsOnlineNet(true);
    const down = () => setIsOnlineNet(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Recompute road distance and route when both pins set
  useEffect(() => {
    if (sourcePin && destPin) {
      const fetchRoute = async () => {
        setFetchingRoute(true);
        try {
          const { fetchRoute: routingFetch } = await import("../../utils/routing");
          const result = await routingFetch(sourcePin.lat, sourcePin.lng, destPin.lat, destPin.lng);
          if (result) {
            setRouteCoords(result.path); // already [[lat,lng]]
            setDistanceKm(parseFloat(result.distanceKm.toFixed(1)));
          } else {
            // Fallback to haversine if routing fails
            const d = haversineKm(sourcePin.lat, sourcePin.lng, destPin.lat, destPin.lng);
            setDistanceKm(Math.round(d * 10) / 10);
            setRouteCoords([[sourcePin.lat, sourcePin.lng], [destPin.lat, destPin.lng]]);
          }
        } catch (err) {
          console.error("Route fetch error:", err);
        } finally {
          setFetchingRoute(false);
        }
      };
      fetchRoute();
    } else {
      setDistanceKm(null);
      setRouteCoords([]);
    }
  }, [sourcePin, destPin]);

  // ── Guide visibility ─────────────────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (showPublishForm) {
      setShowMapGuide(true);
      timer = setTimeout(() => setShowMapGuide(false), 12000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [showPublishForm]);

  // ── Map pick handler ─────────────────────────────────────────────────────────
  const handleMapPick = async (lat, lng) => {
    const result = await reverseGeocode(lat, lng);
    const address = result?.name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (pickingMode === "source") {
      setSourcePin({ lat, lng, address });
    } else if (pickingMode === "destination") {
      setDestPin({ lat, lng, address });
    }
    setPickingMode(null); // done picking
  };

  const handleUseLocation = () => {
    const appSettings = JSON.parse(localStorage.getItem("appSettings") || "{}");
    if (appSettings.locationTracking === false) {
      return showAlert("You need to enable the location in settings page", "Permission Required", "error");
    }
    
    if (!navigator.geolocation) return showAlert("Geolocation is not supported by your browser.", "Location Error", "error");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const result = await reverseGeocode(latitude, longitude);
      const address = result?.name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      if (pickingMode === "source") setSourcePin({ lat: latitude, lng: longitude, address });
      else if (pickingMode === "destination") setDestPin({ lat: latitude, lng: longitude, address });
      else setSourcePin({ lat: latitude, lng: longitude, address }); // Default to source
      setPickingMode(null);
    }, () => showAlert("Could not fetch your live location. Please check your GPS settings.", "Location Error", "error"));
  };

  // ── Online toggle ────────────────────────────────────────────────────────────
  const handleOnlineToggle = async () => {
    if (!isOnline) {
      const appSettings = JSON.parse(localStorage.getItem("appSettings") || "{}");
      if (appSettings.locationTracking === false) {
        showAlert("You need to enable the location in settings page", "Permission Required", "error");
        return;
      }
      if (profile && !profile.isApproved) {
        // No red error here - user wants it removed. The amber message already shows the status.
        return;
      }
    }
    try {
      // When going ONLINE: get GPS first, then send status + location together
      let locationPayload = null;
      if (!isOnline && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false, maximumAge: 10000, timeout: 5000
            });
          });
          locationPayload = {
            type: "Point",
            coordinates: [pos.coords.longitude, pos.coords.latitude]
          };
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch (gpsErr) {
          // GPS failed — still toggle online, background tracker will catch up
          console.warn("Quick GPS for online toggle failed:", gpsErr.message);
        }
      }

      const res = await updateDriverStatus(!isOnline, locationPayload);
      if (res.data.success) { 
        setIsOnline(!isOnline); 
        localStorage.setItem("driverIsOnline", (!isOnline).toString());
        setError(""); 
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  // ── Publish handler ──────────────────────────────────────────────────────────
  const handlePublishRide = async (e) => {
    e.preventDefault();
    setPublishError(""); setPublishSuccess("");
    if (!sourcePin) return setPublishError("Please pick a pickup point on the map.");
    if (!destPin) return setPublishError("Please pick a drop-off point on the map.");

    setPublishing(true);
    try {
      // routeCoords is already in state from the useEffect live preview
      const finalCoords = routeCoords.map(c => [c[1], c[0]]); // convert back to [lng, lat] for backend

      // 2. Publish to backend
      const res = await api.post("/published-rides/publish", {
        source: {
          address: sourcePin.address,
          location: { type: "Point", coordinates: [sourcePin.lng, sourcePin.lat] },
        },
        destination: {
          address: destPin.address,
          location: { type: "Point", coordinates: [destPin.lng, destPin.lat] },
        },
        departureTime: new Date().toISOString(),
        routeCoords: finalCoords, // Save full path for proximity matching
      });

      if (res.data.success) {
        setPublishSuccess("🎉 Ride published! Path-based matching enabled.");
        setSourcePin(null); setDestPin(null); setDistanceKm(null);
        setRideForm({ departureTime: nowIso });
        setShowPublishForm(false);
      }
    } catch (err) {
      setPublishError(err.response?.data?.message || "Failed to publish ride. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const mapCenter = sourcePin ? [sourcePin.lat, sourcePin.lng]
    : destPin ? [destPin.lat, destPin.lng]
    : [userLocation.lat, userLocation.lng];

  // Removed full-page loader to enable instant skeleton rendering

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="mesh-bg relative min-h-screen pb-16 font-sans text-(--text-main) transition-colors duration-500">
      {/* Loading Skeleton */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-(--bg-main)/90 backdrop-blur-sm flex flex-col pt-16 px-6">
           <div className="mx-auto w-full max-w-4xl space-y-6 mt-8">
              <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) h-64 w-full animate-pulse flex flex-col items-center justify-center gap-4">
                 <div className="h-28 w-28 rounded-full bg-(--card-border)" />
                 <div className="h-6 w-32 bg-(--card-border) rounded-full" />
                 <div className="h-4 w-48 bg-(--card-border) rounded" />
              </div>
              <div className="rounded-2xl border border-(--card-border) bg-(--card-bg) h-24 w-full animate-pulse" />
              <div className="grid gap-4 md:grid-cols-3">
                 <div className="rounded-xl border border-(--card-border) bg-(--card-bg) h-32 animate-pulse" />
                 <div className="rounded-xl border border-(--card-border) bg-(--card-bg) h-32 animate-pulse" />
                 <div className="rounded-xl border border-(--card-border) bg-(--card-bg) h-32 animate-pulse" />
              </div>
           </div>
        </div>
      )}

      {/* Location popup */}
      {showLocationPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-(--card-border)">
            <div className="mb-6 flex justify-center">
              <div className="bg-red-500/20 p-4 rounded-full text-red-500"><MapPinOff size={36} /></div>
            </div>
            <h2 className="font-display text-xl font-black text-center mb-2">Location Required</h2>
            <p className="text-sm text-center text-(--text-dim) mb-6">Enable <strong>Location Tracking</strong> in Settings before going online.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowLocationPopup(false); navigate("/driver/dashboard/settings"); }}
                className="w-full bg-primary text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/20">
                Open Settings <ChevronRight size={16} />
              </button>
              <button onClick={() => setShowLocationPopup(false)} className="w-full py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-black hover:bg-primary/20 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/driver/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) hover:text-(--text-main) hover:border-primary/40 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">Go Online</h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">Publish & manage rides</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
        {profile && !profile.isApproved && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
            <Clock className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-500">Pending Approval</p>
              <p className="text-xs text-amber-500 opacity-90">Our team is reviewing your profile. Once approved you can publish rides.</p>
            </div>
          </div>
        )}

        {/* Online / Offline Toggle */}
        <div className="overflow-hidden rounded-2xl border border-(--card-border) bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className={`relative h-28 w-28 rounded-full transition-all duration-500 ${isOnline ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/50" : "bg-gradient-to-r from-gray-400 to-gray-500 shadow-lg shadow-gray-500/30"}`}>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/10">
                <Power size={50} className="text-white" style={{ animation: isOnline ? "pulse 2s infinite" : "none" }} />
              </div>
              {isOnline && <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-emerald-300 animate-pulse border-2 border-white" />}
            </div>
            <div>
              <h2 className={`mb-1 text-2xl font-bold transition-colors duration-500 ${isOnline ? "bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent" : "text-(--text-main)"}`}>
                {isOnline ? "You're Online" : "You're Offline"}
              </h2>
              <p className="text-sm text-(--text-dim)">{isOnline ? "Visible to passengers." : "You are not visible to passengers."}</p>
            </div>
            <button onClick={handleOnlineToggle} disabled={loading}
              className="px-10 py-3.5 font-black text-black bg-primary rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-primary/40">
              <span className="flex items-center gap-2">
                {isOnline ? <><MapPinOff size={18} /> Go Offline</> : <><MapPin size={18} /> Go Online</>}
              </span>
            </button>
          </div>
        </div>

        {/* Publish Ride Section */}
        <div className={`rounded-2xl border ${isOnline ? 'border-(--card-border)' : 'border-dashed border-(--card-border)/50 opacity-60'} bg-(--card-bg) overflow-hidden transition-all`}>
          {/* Header row */}
          <div className="flex items-center justify-between p-6 border-b border-(--card-border)">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Send size={20} className="text-primary" /></div>
              <div>
                <h3 className="text-lg font-bold text-(--text-main)">Publish a Ride</h3>
                <p className="text-xs text-(--text-dim)">Click on the map to set pickup & drop-off. Fare is auto-calculated.</p>
              </div>
            </div>
            {isOnline ? (
              <button onClick={() => { setShowPublishForm(!showPublishForm); setSourcePin(null); setDestPin(null); setPickingMode(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm bg-primary text-black transition-all hover:scale-105">
                {showPublishForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Ride</>}
              </button>
            ) : (
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                Offline
              </span>
            )}
          </div>
          
          {!isOnline && (
            <div className="p-8 text-center text-(--text-dim)">
               <p className="font-semibold">You must go online to publish a new ride.</p>
            </div>
          )}

          {publishSuccess && isOnline && (
            <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <CheckCircle className="text-emerald-500 shrink-0" size={20} />
              <p className="text-sm text-emerald-500">{publishSuccess}</p>
            </div>
          )}
          {publishError && isOnline && (
            <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-sm text-red-500">{publishError}</p>
            </div>
          )}

          {showPublishForm && isOnline && (
            <form onSubmit={handlePublishRide} className="p-6 space-y-5">

              {/* ── Interactive Map ── */}
              <div className="space-y-2">
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider flex items-center gap-1.5">
                      <Navigation size={12} /> Search or Pick Route
                    </p>
                    <div className="flex items-center gap-2 relative">
                       <span className="hidden sm:inline text-(--text-dim) text-[10px] font-bold">Pick on map:</span>
                       <div className="flex gap-2">
                        <div className="relative group">
                          <button type="button"
                            onClick={() => setPickingMode(pickingMode === "source" ? null : "source")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${pickingMode === "source" ? "bg-primary text-black border-primary animate-pulse" : sourcePin ? "bg-primary/10 text-primary border-primary/30" : "bg-(--bg-main) border-(--card-border) text-(--text-dim)"}`}>
                            <div className={`w-2 h-2 rounded-full ${pickingMode === "source" ? "bg-black" : "bg-emerald-500"}`} />
                            {pickingMode === "source" ? "Click map..." : sourcePin ? "Set Pickup ✓" : "Set Pickup"}
                          </button>
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 p-2 bg-(--text-main) text-(--bg-main) text-[10px] leading-tight rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 hidden sm:block text-center shadow-xl">
                            Click here, then tap anywhere on the map to set your pickup location.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-(--text-main)"></div>
                          </div>
                        </div>

                        <div className="relative group">
                          <button type="button"
                            onClick={() => setPickingMode(pickingMode === "destination" ? null : "destination")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${pickingMode === "destination" ? "bg-primary text-black border-primary animate-pulse" : destPin ? "bg-primary/10 text-primary border-primary/30" : "bg-(--bg-main) border-(--card-border) text-(--text-dim)"}`}>
                            <div className={`w-2 h-2 rounded-full ${pickingMode === "destination" ? "bg-black" : "bg-rose-500"}`} />
                            {pickingMode === "destination" ? "Click map..." : destPin ? "Set Drop-off ✓" : "Set Drop-off"}
                          </button>
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 p-2 bg-(--text-main) text-(--bg-main) text-[10px] leading-tight rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 hidden sm:block text-center shadow-xl">
                            Click here, then tap anywhere on the map to set your drop-off location.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-(--text-main)"></div>
                          </div>
                        </div>
                      </div>

                      {showMapGuide && (
                        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-primary/10 backdrop-blur-md border border-primary/30 text-(--text-main) rounded-xl shadow-2xl z-20 flex items-start gap-2">
                          <Info size={16} className="text-primary shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-bold mb-1">Fast Map Picking</p>
                            <p className="text-[10px] text-(--text-dim) leading-relaxed">Click <strong>Set Pickup</strong> or <strong>Set Drop-off</strong> buttons, then tap anywhere on the map to quickly set your locations without typing.</p>
                          </div>
                          <button type="button" onClick={() => setShowMapGuide(false)} className="text-(--text-dim) hover:text-primary transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Manual Search Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LocationSearch 
                      label="Pickup Source" 
                      placeholder="Search pickup point..." 
                      showCurrentLocation={true}
                      currentLocation={userLocation}
                      value={sourcePin?.address || ""}
                      onSelect={(loc) => {
                        if (loc) setSourcePin({ lat: loc.lat, lng: loc.lng, address: loc.name });
                        else setSourcePin(null);
                      }}
                    />
                    <LocationSearch 
                      label="Destination Point" 
                      placeholder="Search destination..." 
                      value={destPin?.address || ""}
                      onSelect={(loc) => {
                        if (loc) setDestPin({ lat: loc.lat, lng: loc.lng, address: loc.name });
                        else setDestPin(null);
                      }}
                    />
                  </div>
                </div>

                {/* Map */}
                <div className={`rounded-2xl overflow-hidden border-2 transition-all ${pickingMode ? "border-primary shadow-lg shadow-primary/20 cursor-crosshair" : "border-(--card-border)"}`} style={{ height: 320 }}>
                  <MapContainer center={mapCenter} zoom={13} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      maxZoom={19}
                    />
                    <MapClickPicker pickingMode={pickingMode} onPick={handleMapPick} />

                    {/* Driver's current location */}
                    {userLocation && (
                      <Marker position={[userLocation.lat, userLocation.lng]} icon={makeVehicleIcon(profile?.vehicle?.type || profile?.vehicleType || "hatchback", 0, 40)}>
                        <Popup><p className="font-bold text-xs">You are here</p></Popup>
                      </Marker>
                    )}


                    {/* Dest marker */}
                    {destPin && (
                      <Marker position={[destPin.lat, destPin.lng]} icon={redIcon}>
                        <Popup>
                          <p style={{ fontWeight: 700, color: "#991b1b", fontSize: 12, margin: 0 }}>🏁 Drop-off</p>
                          <p style={{ margin: "4px 0 0", fontSize: 11, maxWidth: 200 }}>{destPin.address}</p>
                        </Popup>
                      </Marker>
                    )}

                    {/* Road-based route between pins */}
                    {routeCoords.length > 0 && (
                      <Polyline
                        positions={routeCoords}
                        pathOptions={{ color: "blue", weight: 5, opacity: 1, dashArray: "10 3", lineCap: "round" }}
                      />
                    )}
                  </MapContainer>
                </div>

                <button onClick={handleUseLocation}
                   className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-black font-black hover:scale-[1.02] transition-all text-sm shadow-lg shadow-primary/10">
                   <Navigation size={18} /> Use Current Live Location
                </button>

                {/* Picking hint */}
                {pickingMode && (
                  <p className="text-center text-xs font-semibold text-primary animate-pulse">
                    🗺️ Click anywhere on the map to set the {pickingMode === "source" ? "pickup" : "drop-off"} point
                  </p>
                )}
              </div>

              {/* Distance badge */}
              {distanceKm !== null && (
                <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <Navigation size={20} className="text-primary mb-4" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-primary">
                      {fetchingRoute ? "..." : `${distanceKm} km`}
                    </p>
                    <p className="text-xs text-(--text-dim)">Confirmed road distance</p>
                  </div>
                </div>
              )}

              {/* Fare info */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <IndianRupee size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-(--text-main)">Fare is Auto-Calculated</p>
                  <p className="text-xs text-(--text-dim) mt-0.5">
                    System computes: <strong>Base Fare + (Per Km × Distance) × Surge Multiplier</strong>.
                  </p>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={publishing || (profile && !profile.isApproved)}
                className="w-full py-4 bg-primary text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {publishing ? (
                  <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Publishing...</>
                ) : (
                  <><Send size={18} /> Publish Ride</>
                )}
              </button>
              {profile && !profile.isApproved && (
                <p className="text-center text-xs text-amber-500">⚠️ Admin approval required before publishing.</p>
              )}
            </form>
          )}

          {!showPublishForm && !publishSuccess && (
            <div className="flex flex-col items-center gap-3 py-10 text-(--text-dim)">
              <Car size={36} className="opacity-30" />
              <p className="text-sm font-semibold">No active ride published</p>
              <p className="text-xs opacity-70">Click <strong>New Ride</strong> to publish your first ride</p>
            </div>
          )}
        </div>

        {/* Device Status */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-5 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2"><BatteryCharging size={18} className="text-primary" /></div>
                <h4 className="font-semibold text-(--text-main) text-sm">Battery</h4>
              </div>
              <span className="text-lg font-bold">{batteryLevel !== null ? `${batteryLevel}%` : "N/A"}</span>
            </div>
            {batteryLevel !== null ? (
              <><div className="h-2 w-full rounded-full bg-(--bg-main) overflow-hidden"><div className={`h-full ${batteryLevel > 50 ? "bg-emerald-500" : batteryLevel > 20 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${batteryLevel}%` }} /></div>
              {isCharging && <p className="mt-1.5 text-xs text-emerald-500">⚡ Charging</p>}
              {batteryLevel < 20 && !isCharging && <p className="mt-1.5 text-xs text-red-500">⚠️ Low battery</p>}</>
            ) : <p className="text-xs text-(--text-dim)">Not available on this browser</p>}
          </div>

          <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-5 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2"><Wifi size={18} className="text-primary" /></div>
                <h4 className="font-semibold text-(--text-main) text-sm">Signal</h4>
              </div>
              <span className="text-lg font-bold">{signalStrength !== null ? `${signalStrength}/5` : "N/A"}</span>
            </div>
            <div className="flex gap-1 items-end h-8">
              {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < signalStrength;
                // Color codes: 1=Red, 2=Orange, 3=Amber, 4=Emerald, 5=Primary
                const getPollColor = () => {
                    if (!filled) return "bg-(--bg-main)";
                    if (signalStrength >= 5) return "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]";
                    if (signalStrength >= 4) return "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]";
                    if (signalStrength >= 3) return "bg-amber-500";
                    if (signalStrength >= 2) return "bg-orange-500";
                    return "bg-red-500 animate-pulse";
                };

                return (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-full transition-all duration-500 ${getPollColor()}`} 
                    style={{ height: `${(i + 1) * 20}%` }} 
                  />
                );
              })}
            </div>
            {signalStrength !== null && signalStrength < 2 && <p className="mt-1.5 text-xs text-red-500">⚠️ Weak signal</p>}
          </div>

          <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-5 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`rounded-lg p-2 ${isOnlineNet ? "bg-primary/10" : "bg-red-500/10"}`}>
                  <Zap size={18} className={isOnlineNet ? "text-primary" : "text-red-500"} />
                </div>
                <h4 className="font-semibold text-(--text-main) text-sm">Internet</h4>
              </div>
              <span className={`text-lg font-bold ${isOnlineNet ? "text-emerald-500" : "text-red-500"}`}>{isOnlineNet ? "Active" : "Offline"}</span>
            </div>
            <p className="text-xs text-(--text-dim)">{isOnlineNet ? `Connected via ${connectionType}` : "No internet connection"}</p>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${isOnlineNet ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
              {isOnlineNet ? "✓ Stable" : "✗ Disconnected"}
            </span>
          </div>
        </div>

        {/* Stats */}
        {profile && (
          <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Navigation size={16} className="text-primary" /> Driver Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-(--bg-main) p-4"><p className="text-xs text-(--text-dim) mb-1">Total Rides</p><p className="text-2xl font-black">{profile?.stats?.totalRides || 0}</p></div>
              <div className="rounded-xl bg-(--bg-main) p-4"><p className="text-xs text-(--text-dim) mb-1">Completed</p><p className="text-2xl font-black text-primary">{profile?.stats?.completedRides || 0}</p></div>
              <div className="rounded-xl bg-(--bg-main) p-4"><p className="text-xs text-(--text-dim) mb-1">Rating</p><p className="text-2xl font-black text-primary">{profile?.averageRating?.toFixed(1) || "0.0"}</p></div>
              <div className="rounded-xl bg-(--bg-main) p-4"><p className="text-xs text-(--text-dim) mb-1">Trust Score</p><p className="text-2xl font-black text-primary">{profile?.trustScore || 0}</p></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GoOnlinePage;