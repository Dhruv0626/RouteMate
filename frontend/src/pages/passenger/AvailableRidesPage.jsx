import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Search, Calendar, Users, IndianRupee,
  Car, Clock, Lock, Share2, CheckCircle, AlertCircle,
  Navigation, X, Loader2, Filter,
} from "lucide-react";
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { makePin } from "../../utils/mapIcons";
import ThemeToggle from "../../components/ui/ThemeToggle";
import LocationSearch from "../../components/map/LocationSearch";
import api from "../../services/api";
import { reverseGeocode } from "../../utils/geocode";

// ── Leaflet icons ─────────────────────────────────────────────────────────────
const greenIcon = makePin("#22c55e", "PICKUP");
const redIcon   = makePin("#ef4444", "DEST");

// ── Haversine ─────────────────────────────────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};


// ── Map click picker ──────────────────────────────────────────────────────────
const MapPicker = ({ mode, onPick }) => {
  useMapEvents({ click(e) { if (mode) onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

// ── Booking Modal ─────────────────────────────────────────────────────────────
const BookingModal = ({ ride, onClose, onBooked }) => {
  const [pickMode, setPickMode] = useState(null); // "source" | "dest"
  const [srcPin, setSrcPin]     = useState(null);
  const [dstPin, setDstPin]     = useState(null);
  const [bookingType, setBookingType] = useState("private");
  const [fareData, setFareData] = useState(null);
  const [fetchingFare, setFetchingFare] = useState(false);
  const [booking, setBooking]   = useState(false);
  const [error, setError]       = useState("");
  const [pRouteCoords, setPRouteCoords] = useState([]);
  const [realDuration, setRealDuration] = useState(null);

  const mapCenter = srcPin ? [srcPin.lat, srcPin.lng]
    : dstPin ? [dstPin.lat, dstPin.lng]
    : ride?.source?.location?.coordinates?.length === 2
      ? [ride.source.location.coordinates[1], ride.source.location.coordinates[0]]
      : [23.0225, 72.5714];

  const handleMapPick = async (lat, lng) => {
    const address = await reverseGeocode(lat, lng);
    if (pickMode === "source") setSrcPin({ lat, lng, address });
    else setDstPin({ lat, lng, address });
    setPickMode(null);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const address = await reverseGeocode(latitude, longitude);
      if (pickMode === "source") setSrcPin({ lat: latitude, lng: longitude, address });
      else if (pickMode === "dest") setDstPin({ lat: latitude, lng: longitude, address });
      else setSrcPin({ lat: latitude, lng: longitude, address }); // Default to source if no mode picked
      setPickMode(null);
    }, () => alert("Could not fetch location"));
  };

  // Live fare estimate + Road routing
  useEffect(() => {
    if (!srcPin || !dstPin) { 
        setFareData(null); 
        setPRouteCoords([]);
        return; 
    }
    const fetch = async () => {
      setFetchingFare(true);
      try {
        // 1. Fetch road path for visualization
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${srcPin.lng},${srcPin.lat};${dstPin.lng},${dstPin.lat}?overview=full&geometries=geojson`;
        const osrmRes = await fetch(osrmUrl);
        const osrmData = await osrmRes.json();
        
        let durationMin = null;
        if (osrmData.code === "Ok" && osrmData.routes?.length > 0) {
           const route = osrmData.routes[0];
           setPRouteCoords(route.geometry.coordinates.map(c => [c[1], c[0]]));
           durationMin = Math.round(route.duration / 60);
           setRealDuration(durationMin);
        }

        // 2. Fetch fare from backend
        const res = await api.get("/published-rides/fare-estimate", {
          params: {
            rideId: ride._id,
            passengerLat: srcPin.lat, passengerLng: srcPin.lng,
            destLat: dstPin.lat, destLng: dstPin.lng,
            durationMin
          }
        });
        if (res.data.success) setFareData(res.data.data);
      } catch { /* silent */ }
      setFetchingFare(false);
    };
    fetch();
  }, [srcPin, dstPin]);

  const handleBook = async () => {
    setError("");
    if (!srcPin) return setError("Please select your pickup point on the map.");
    if (!dstPin) return setError("Please select your drop-off point on the map.");

    setBooking(true);
    try {
      const res = await api.post(`/published-rides/book/${ride._id}`, {
        passengerSource: {
          address: srcPin.address,
          location: { type: "Point", coordinates: [srcPin.lng, srcPin.lat] },
        },
        passengerDestination: {
          address: dstPin.address,
          location: { type: "Point", coordinates: [dstPin.lng, dstPin.lat] },
        },
        durationMin: realDuration
      });
      if (res.data.success) {
        onBooked(res.data.message);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-xl rounded-3xl border border-(--card-border) shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-(--card-border) shrink-0">
          <div>
            <h2 className="font-display text-lg font-black text-(--text-main)">Book This Ride</h2>
            <p className="text-xs text-(--text-dim)">
              {ride.source.address} → {ride.destination.address}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X size={20} className="text-(--text-dim)" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Map to pick passenger's own route */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">Your Pickup & Drop-off</p>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setPickMode(pickMode === "source" ? null : "source")}
                className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${pickMode === "source" ? "bg-emerald-500 text-white border-emerald-500 animate-pulse" : srcPin ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-(--bg-main) border-(--card-border) text-(--text-dim)"}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                {pickMode === "source" ? "Click map..." : srcPin ? "Pickup ✓" : "Set My Pickup"}
              </button>
              <button type="button"
                onClick={() => setPickMode(pickMode === "dest" ? null : "dest")}
                className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${pickMode === "dest" ? "bg-rose-500 text-white border-rose-500 animate-pulse" : dstPin ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : "bg-(--bg-main) border-(--card-border) text-(--text-dim)"}`}>
                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                {pickMode === "dest" ? "Click map..." : dstPin ? "Drop-off ✓" : "Set My Drop-off"}
              </button>
            </div>
            
            <button type="button" onClick={handleUseLocation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all">
              <Navigation size={14} /> Use Current Live Location
            </button>

            <div className={`rounded-2xl overflow-hidden border-2 transition-all ${pickMode ? "border-primary cursor-crosshair" : "border-(--card-border)"}`} style={{ height: 260 }}>
              <MapContainer center={mapCenter} zoom={13} style={{ width:"100%", height:"100%" }} scrollWheelZoom>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                <MapPicker mode={pickMode} onPick={handleMapPick} />
                {srcPin && <Marker position={[srcPin.lat, srcPin.lng]} icon={greenIcon}><Popup><p className="font-bold text-xs text-emerald-700">📍 Your Pickup</p><p className="text-[11px] mt-1">{srcPin.address}</p></Popup></Marker>}
                {dstPin && <Marker position={[dstPin.lat, dstPin.lng]} icon={redIcon}><Popup><p className="font-bold text-xs text-red-700">🏁 Your Drop-off</p><p className="text-[11px] mt-1">{dstPin.address}</p></Popup></Marker>}
                
                {/* Driver's full planned route */}
                {ride.routeCoords?.length > 0 && (
                  <Polyline 
                    positions={ride.routeCoords.map(c => [c[1], c[0]])} 
                    pathOptions={{ color: "#6366f1", weight: 4, opacity: 0.6 }} 
                  />
                )}

                {/* Passenger's road-based route segment */}
                {pRouteCoords.length > 0 && (
                  <Polyline 
                    positions={pRouteCoords} 
                    pathOptions={{ color:"#ffcc00", weight:5, dashArray:"10 6", lineCap:"round" }} 
                  />
                )}
              </MapContainer>
            </div>
            {pickMode && <p className="text-center text-xs font-semibold text-primary animate-pulse">🗺️ Click the map to set your {pickMode === "source" ? "pickup" : "drop-off"}</p>}
          </div>

          {/* Fare preview */}
          {fetchingFare && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <Loader2 size={16} className="text-primary animate-spin" />
              <p className="text-xs text-(--text-dim)">Calculating fare from your route...</p>
            </div>
          )}
          {fareData && !fetchingFare && (
            <div className="rounded-2xl border border-(--card-border) overflow-hidden">
              <div className="p-4 bg-primary/5 border-b border-(--card-border)">
                <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider mb-1">Fare Estimate</p>
                <p className="text-3xl font-black text-primary">
                  ₹{fareData.totalWithTax || fareData.final_price || 0}
                </p>
                <p className="text-xs text-(--text-dim)">
                  Full vehicle · {fareData.distanceKm} km
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-(--card-border) text-center text-[10px] text-(--text-dim)">
                <div className="p-2"><p className="font-bold text-(--text-main)">₹{fareData.fareBreakdown.baseFare}</p><p>Base Fare</p></div>
                <div className="p-2"><p className="font-bold text-(--text-main)">₹{fareData.fareBreakdown.perKmRate}/km</p><p>Rate</p></div>
                <div className="p-2"><p className="font-bold text-(--text-main)">{fareData.fareBreakdown.surgeMultiplier}×</p><p>Surge</p></div>
              </div>
            </div>
          )}

          {srcPin && dstPin && !fareData && !fetchingFare && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-500">⚠️ Could not estimate fare. You can still proceed and pay the calculated amount on ride.</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          <p className="text-center text-[10px] text-(--text-dim)">💵 Payment collected in <strong>cash by the driver</strong> after the ride.</p>
        </div>

        {/* CTA */}
        <div className="p-5 border-t border-(--card-border) shrink-0">
          <button onClick={handleBook} disabled={booking}
            className="w-full py-4 bg-primary text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {booking
              ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Requesting...</>
              : <><Navigation size={18} /> Send Booking Request</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AvailableRidesPage = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRide, setSelectedRide] = useState(null);

  const [filters, setFilters] = useState({ sourceCity: "", destinationCity: "", date: "" });

  const fetchRides = async (e) => {
    if (e) e.preventDefault();
    setLoading(true); setError(""); setSuccess(""); setSearched(true);
    
    // Prepare params including coordinates if available
    const params = { ...filters };
    if (filters.src) { 
      params.srcLat = filters.src.lat; 
      params.srcLng = filters.src.lng; 
    }
    if (filters.dst) { 
      params.dstLat = filters.dst.lat; 
      params.dstLng = filters.dst.lng; 
    }

    try {
      const res = await api.get("/published-rides/available", { params });
      if (res.data.success) setRides(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch rides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRides(); }, []);

  return (
    <div className="mesh-bg min-h-screen pb-16 font-sans text-(--text-main) transition-colors duration-500">
      {selectedRide && (
        <BookingModal
          ride={selectedRide}
          onClose={() => setSelectedRide(null)}
          onBooked={(msg) => { setSuccess(msg); fetchRides(); }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/passenger/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) hover:text-(--text-main) hover:border-primary/40 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">Find a Ride</h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">Browse published rides</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">

        {/* Search filters */}
        <form onSubmit={fetchRides} className="rounded-2xl border border-(--card-border) bg-(--card-bg) p-5 space-y-4">
          <h2 className="font-bold text-(--text-main) flex items-center gap-2 text-sm">
            <Filter size={16} className="text-primary" /> Filter Rides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <LocationSearch 
                placeholder="From address / area" 
                showCurrentLocation={true}
                onSelect={(loc) => setFilters(prev => ({ ...prev, sourceCity: loc?.name || "", src: loc }))}
              />
            </div>
            <div className="relative">
              <LocationSearch 
                placeholder="To address / area" 
                onSelect={(loc) => setFilters(prev => ({ ...prev, destinationCity: loc?.name || "", dst: loc }))}
              />
            </div>
            <div className="relative">
              <input type="date" value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="w-full h-[41px] px-4 py-3 bg-(--bg-main) border border-(--card-border) rounded-xl text-sm outline-none focus:border-primary/60 transition-all font-medium"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-[41px] bg-primary text-black font-black rounded-xl hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? "..." : "Find"}
            </button>
          </div>
        </form>

        {/* Success */}
        {success && (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 animate-in fade-in">
            <CheckCircle size={18} className="text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-500 font-semibold">{success}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-sm text-(--text-dim)">Looking for available rides...</p>
          </div>
        )}

        {/* Rides list */}
        {!loading && searched && rides.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-(--text-dim)">
            <Car size={48} className="opacity-20" />
            <p className="font-bold text-(--text-main)">No rides found</p>
            <p className="text-xs opacity-70">Try different locations or dates</p>
          </div>
        )}

        {!loading && rides.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-(--text-dim)">{rides.length} ride{rides.length !== 1 ? "s" : ""} available</p>
            {rides.map((ride) => {
              const depDate = new Date(ride.departureTime);
              return (
                <div key={ride._id}
                  className="rounded-2xl border border-(--card-border) bg-(--card-bg) overflow-hidden hover:border-primary/40 transition-all group">
                  {/* Route strip */}
                  <div className="p-5 border-b border-(--card-border)">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-500 to-rose-500" />
                        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-(--text-main) truncate">{ride.source.address}</p>
                        <p className="text-[10px] text-(--text-dim) mt-6 truncate">{ride.destination.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      {/* Driver */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-black text-xs text-black shrink-0">
                          {ride.driver?.profileImage
                            ? <img src={ride.driver.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                            : (ride.driver?.name?.[0] || "D")}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-(--text-main)">{ride.driver?.name || "Driver"}</p>
                          <p className="text-[10px] text-(--text-dim)">{ride.vehicleType || "Vehicle"}</p>
                        </div>
                      </div>

                      <div className="ml-auto flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 bg-(--bg-main) border border-(--card-border) rounded-full px-3 py-1 text-xs font-semibold">
                          <Clock size={10} /> {depDate.toLocaleDateString("en-IN", { day:"numeric", month:"short" })} · {depDate.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                        </span>
                        {ride.vehicle?.number && (
                          <span className="flex items-center gap-1 bg-(--bg-main) border border-(--card-border) rounded-full px-3 py-1 text-xs font-semibold">
                            <Car size={10} /> {ride.vehicle.number}
                          </span>
                        )}
                      </div>
                    </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                        <div className="flex items-center gap-2">
                          <IndianRupee size={14} className="text-primary shrink-0" />
                          <p className="text-xs text-(--text-dim)">
                            Estimated Fare
                          </p>
                        </div>
                        <p className="text-lg font-black text-primary">₹{Math.round(ride.price || 0)}</p>
                      </div>

                    <button
                      onClick={() => setSelectedRide(ride)}
                      className="w-full py-3 bg-primary text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2">
                       <Navigation size={16} /> Book This Ride
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AvailableRidesPage;
