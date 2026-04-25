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
  const [isOnline, setIsOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState("");
  const [publishError, setPublishError] = useState("");
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);

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
          
          // Override stats with actual live history data for consistency (same as dashboard)
          if (historyRes.data.success) {
            const historyStats = historyRes.data.data.stats;
            const liveRides = liveRes.data?.data || [];
            
            const activePublished = liveRides.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length;
            const completedRides = historyStats.completedRides || 0;
            const realTotal = completedRides + activePublished;
            
            setProfile(prev => ({
              ...prev,
              stats: {
                ...prev.stats,
                totalRides: realTotal,
                completedRides: completedRides
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
    if (navigator.geolocation) {
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
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${sourcePin.lng},${sourcePin.lat};${destPin.lng},${destPin.lat}?overview=full&geometries=geojson`;
          const osrmRes = await fetch(osrmUrl);
          const osrmData = await osrmRes.json();
          
          if (osrmData.code === "Ok" && osrmData.routes?.length > 0) {
            const route = osrmData.routes[0];
            // [lng, lat] from OSRM -> [lat, lng] for Leaflet
            setRouteCoords(route.geometry.coordinates.map(c => [c[1], c[0]]));
            setDistanceKm(Math.round((route.distance / 1000) * 10) / 10);
          } else {
            // Fallback to haversine if OSRM fails
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

  // ── Map pick handler ─────────────────────────────────────────────────────────
  const handleMapPick = async (lat, lng) => {
    const address = await reverseGeocode(lat, lng);
    if (pickingMode === "source") {
      setSourcePin({ lat, lng, address });
    } else if (pickingMode === "destination") {
      setDestPin({ lat, lng, address });
    }
    setPickingMode(null); // done picking
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const address = await reverseGeocode(latitude, longitude);
      if (pickingMode === "source") setSourcePin({ lat: latitude, lng: longitude, address });
      else if (pickingMode === "destination") setDestPin({ lat: latitude, lng: longitude, address });
      else setSourcePin({ lat: latitude, lng: longitude, address }); // Default to source
      setPickingMode(null);
    }, () => alert("Could not fetch location"));
  };

  // ── Online toggle ────────────────────────────────────────────────────────────
  const handleOnlineToggle = async () => {
    if (!isOnline) {
      const appSettings = JSON.parse(localStorage.getItem("appSettings") || "{}");
      if (!appSettings.locationTracking) { setShowLocationPopup(true); return; }
      if (profile && !profile.isApproved) {
        // No red error here - user wants it removed. The amber message already shows the status.
        return;
      }
    }
    try {
      const res = await updateDriverStatus(!isOnline);
      if (res.data.success) { setIsOnline(!isOnline); setError(""); }
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
    if (!rideForm.departureTime) return setPublishError("Please select a departure date & time.");

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
        departureTime: new Date(rideForm.departureTime).toISOString(),
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="mesh-bg relative min-h-screen pb-16 font-sans text-(--text-main) transition-colors duration-500">

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
                    <div className="flex items-center gap-2">
                       <span className="hidden sm:inline text-(--text-dim) text-[10px] font-bold">Pick on map:</span>
                       <div className="flex gap-2">
                        <button type="button"
                          onClick={() => setPickingMode(pickingMode === "source" ? null : "source")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${pickingMode === "source" ? "bg-primary text-black border-primary animate-pulse" : sourcePin ? "bg-primary/10 text-primary border-primary/30" : "bg-(--bg-main) border-(--card-border) text-(--text-dim)"}`}>
                          <div className={`w-2 h-2 rounded-full ${pickingMode === "source" ? "bg-black" : "bg-emerald-500"}`} />
                          {pickingMode === "source" ? "Click map..." : sourcePin ? "Set Pickup ✓" : "Set Pickup"}
                        </button>
                        <button type="button"
                          onClick={() => setPickingMode(pickingMode === "destination" ? null : "destination")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${pickingMode === "destination" ? "bg-primary text-black border-primary animate-pulse" : destPin ? "bg-primary/10 text-primary border-primary/30" : "bg-(--bg-main) border-(--card-border) text-(--text-dim)"}`}>
                          <div className={`w-2 h-2 rounded-full ${pickingMode === "destination" ? "bg-black" : "bg-rose-500"}`} />
                          {pickingMode === "destination" ? "Click map..." : destPin ? "Set Drop-off ✓" : "Set Drop-off"}
                        </button>
                      </div>
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
                      <Marker position={[userLocation.lat, userLocation.lng]} icon={makeVehicleIcon(profile?.vehicleType || "hatchback", 0, 40)}>
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
                        pathOptions={{ color: "#ffcc00", weight: 5, opacity: 0.9, dashArray: "10 6", lineCap: "round" }}
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

              {/* Address summary + distance */}
              {(sourcePin || destPin) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
                    <div className="text-xs font-bold text-emerald-500 mb-1 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Pickup</div>
                    <p className="text-xs text-(--text-main) leading-tight">{sourcePin ? sourcePin.address : <span className="text-(--text-dim) italic">Not set</span>}</p>
                    {sourcePin && (
                      <button type="button" onClick={() => { setSourcePin(null); setPickingMode("source"); }}
                        className="mt-1.5 text-[10px] text-red-400 hover:underline">Clear & re-pick</button>
                    )}
                  </div>
                  <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-3">
                    <div className="text-xs font-bold text-rose-500 mb-1 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Drop-off</div>
                    <p className="text-xs text-(--text-main) leading-tight">{destPin ? destPin.address : <span className="text-(--text-dim) italic">Not set</span>}</p>
                    {destPin && (
                      <button type="button" onClick={() => { setDestPin(null); setPickingMode("destination"); }}
                        className="mt-1.5 text-[10px] text-red-400 hover:underline">Clear & re-pick</button>
                    )}
                  </div>
                </div>
              )}

              {/* Distance badge */}
              {distanceKm !== null && (
                <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <Navigation size={20} className="text-primary" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-primary">
                      {fetchingRoute ? "..." : `${distanceKm} km`}
                    </p>
                    <p className="text-xs text-(--text-dim)">Confirmed road distance</p>
                  </div>
                  <Info size={16} className="text-(--text-dim)" title="Route calculated via real road paths" />
                </div>
              )}

              {/* Departure Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-(--text-dim) uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} /> Departure Date & Time
                </label>
                <input type="datetime-local" min={nowIso} value={rideForm.departureTime}
                  onChange={(e) => setRideForm({ ...rideForm, departureTime: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-(--bg-main) border border-(--card-border) rounded-xl text-sm focus:border-primary/60 outline-none transition-all"
                />
              </div>

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
                <div className="rounded-lg bg-orange-500/10 p-2"><BatteryCharging size={18} className="text-orange-500" /></div>
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
                <div className="rounded-lg bg-blue-500/10 p-2"><Wifi size={18} className="text-blue-500" /></div>
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
                <div className={`rounded-lg p-2 ${isOnlineNet ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <Zap size={18} className={isOnlineNet ? "text-emerald-500" : "text-red-500"} />
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
              <div className="rounded-xl bg-(--bg-main) p-4"><p className="text-xs text-(--text-dim) mb-1">Completed</p><p className="text-2xl font-black text-emerald-500">{profile?.stats?.completedRides || 0}</p></div>
              <div className="rounded-xl bg-(--bg-main) p-4"><p className="text-xs text-(--text-dim) mb-1">Rating</p><p className="text-2xl font-black text-amber-500">{profile?.averageRating?.toFixed(1) || "0.0"}</p></div>
              <div className="rounded-xl bg-(--bg-main) p-4"><p className="text-xs text-(--text-dim) mb-1">Trust Score</p><p className="text-2xl font-black text-primary">{profile?.trustScore || 0}</p></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GoOnlinePage;