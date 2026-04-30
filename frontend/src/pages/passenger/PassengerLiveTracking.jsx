import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, User as UserIcon, IndianRupee, Phone, RefreshCw, Navigation, ChevronDown, ChevronUp, MapPin
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl } from "react-leaflet";
import L from "leaflet";
import socket from "../../services/socket";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import { makeVehicleIcon, makePin } from "../../utils/mapIcons";
import SOSButton from "../../components/passenger/SOSButton";
import { loadRazorpay } from "../../services/paymentService";

const distanceMetres = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const bluePin  = makePin("#3b82f6", "PICKUP");
const redPin   = makePin("#ef4444", "DROP");

const PassengerLiveTracking = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert } = useDialog();

  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);

  const [displayRoute, setDisplayRoute] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPerspectiveMode, setIsPerspectiveMode] = useState(true);

  // SOS Warning
  const [sosWarningActive, setSosWarningActive] = useState(false);
  const [sosWarningReason, setSosWarningReason] = useState("");

  const [heading, setHeading] = useState(0);
  const [liveEtaMins, setLiveEtaMins] = useState(null);
  const [destEtaMins, setDestEtaMins] = useState(null);

  const vehicleIcon = useMemo(() => {
    if (!ride) return null;
    return makeVehicleIcon(ride.vehicleType || "PRIME", heading);
  }, [ride?.vehicleType, heading]);

  useEffect(() => {
    if (user.role !== "passenger") {
      navigate("/driver/dashboard");
    }
  }, [user, navigate]);

  const fetchRide = async () => {
    try {
      const res = await api.get(`/published-rides/${rideId}`);
      if (res.data.success) {
        setRide(res.data.data);
        if (res.data.data.driverLocation) {
          setDriverLocation({ 
            lat: res.data.data.driverLocation[1], 
            lng: res.data.data.driverLocation[0],
            heading: res.data.data.driverLocationHeading || 0
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch ride", err);
      showAlert("Failed to load ride details", "Error", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
  }, [rideId]);

  useEffect(() => {
    if (!ride) return;
    socket.emit("join_ride", ride._id);

    const onStatusUpdate = (data) => {
      if (data.rideId === ride._id) {
        setRide(prev => ({ ...prev, status: data.status }));
        if (data.status === "reached" || data.status === "completed") {
          setIsMinimized(false);
        }
      }
    };

    const onLocationUpdate = (data) => {
      // Sometimes backend sends data.lat/data.lng directly, sometimes it wraps it
      setDriverLocation({ 
        lat: data.lat || data.location?.lat, 
        lng: data.lng || data.location?.lng,
        heading: data.heading || 0
      });
    };

    const onPaymentCompleted = (data) => {
      const methodLabel = data.method === "wallet" ? "Wallet" : data.method === "cash" ? "Cash" : "UPI";
      showAlert(`Payment successful via ${methodLabel}! Redirecting…`, "Trip Finished", "success");
      setTimeout(() => {
        navigate("/passenger/dashboard");
      }, 2500);
    };

    const onSosWarning = (data) => {
      if (data.tripId === rideId && user.role !== "driver") {
        setSosWarningReason(data.reason || "A safety concern has been detected on your trip.");
        setSosWarningActive(true);
      }
    };

    socket.on("ride_status_update", onStatusUpdate);
    socket.on("location_update", onLocationUpdate);
    socket.on("payment_completed", onPaymentCompleted);
    socket.on("sos_warning", onSosWarning);

    return () => {
      socket.off("ride_status_update", onStatusUpdate);
      socket.off("location_update", onLocationUpdate);
      socket.off("payment_completed", onPaymentCompleted);
      socket.off("sos_warning", onSosWarning);
    };
  }, [ride, rideId, user.role]);

  useEffect(() => {
    if (ride?.status === "reached" || ride?.status === "completed") {
      setIsMinimized(false);
    }
  }, [ride?.status]);

  const effectiveDriverLocation = driverLocation || (ride?.source?.location?.coordinates ? {
    lat: ride.source.location.coordinates[1],
    lng: ride.source.location.coordinates[0],
    heading: 0
  } : null);

  // ─── Perspective Mode Tracking ───
  const prevPerspectiveRef = useRef(isPerspectiveMode);

  useEffect(() => {
    if (isPerspectiveMode && map && effectiveDriverLocation) {
      // If just toggled into perspective mode, snap to 18. Otherwise, respect user's manual zoom.
      const targetZoom = prevPerspectiveRef.current !== isPerspectiveMode ? 18 : map.getZoom();
      map.setView([effectiveDriverLocation.lat, effectiveDriverLocation.lng], targetZoom, { animate: true, duration: 1.0 });
    }
    prevPerspectiveRef.current = isPerspectiveMode;
  }, [isPerspectiveMode, effectiveDriverLocation, map]);

  // Map centering logic (Overview mode)
  useEffect(() => {
    if (!map || !ride || !effectiveDriverLocation || isPerspectiveMode) return;
    const isHeadingToPickup = !["in_progress", "reached", "completed"].includes(ride.status);
    
    let targetCoords = null;
    if (isHeadingToPickup && ride.source?.location?.coordinates) {
      targetCoords = [ride.source.location.coordinates[1], ride.source.location.coordinates[0]];
    } else if (ride.destination?.location?.coordinates) {
      targetCoords = [ride.destination.location.coordinates[1], ride.destination.location.coordinates[0]];
    }

    if (targetCoords) {
      const bounds = L.latLngBounds([[effectiveDriverLocation.lat, effectiveDriverLocation.lng], targetCoords]);
      map.fitBounds(bounds, { padding: [100, 100], animate: true });
    } else {
      map.setView([effectiveDriverLocation.lat, effectiveDriverLocation.lng], 15, { animate: true });
    }
  }, [effectiveDriverLocation?.lat, effectiveDriverLocation?.lng, map, ride?.status, isPerspectiveMode]);

  const firstPassenger = useMemo(() => {
    if (!ride) return null;
    return ride.bookings
      ? ride.bookings.find(b => b.passenger === user?.id) || ride.bookings.find(b => b.status === "confirmed" || b.status === "pending")
      : null;
  }, [ride, user?.id]);

  const pickupCoords = useMemo(() => {
    const raw = firstPassenger?.passengerSource?.location?.coordinates;
    return raw ? [raw[1], raw[0]] : null; // [lat, lng]
  }, [firstPassenger]);

  const destCoords = useMemo(() => {
    const raw = firstPassenger?.passengerDestination?.location?.coordinates;
    return raw ? [raw[1], raw[0]] : null; // [lat, lng]
  }, [firstPassenger]);

  useEffect(() => {
    if (!effectiveDriverLocation || displayRoute.length <= 1) return;
    let minStep = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < displayRoute.length; i++) {
      const d = distanceMetres(effectiveDriverLocation.lat, effectiveDriverLocation.lng, displayRoute[i][0], displayRoute[i][1]);
      if (d < minStep) {
        minStep = d;
        closestIdx = i;
      }
    }
    if (displayRoute[closestIdx + 1]) {
      const p1 = displayRoute[closestIdx];
      const p2 = displayRoute[closestIdx + 1];
      setHeading((Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI);
    } else if (effectiveDriverLocation.heading) {
      setHeading(effectiveDriverLocation.heading);
    }
  }, [effectiveDriverLocation?.lat, effectiveDriverLocation?.lng, displayRoute]);

  const visibleRoute = useMemo(() => {
    if (displayRoute.length <= 1 || !effectiveDriverLocation) return displayRoute;
    let minStep = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < displayRoute.length; i++) {
      const d = distanceMetres(effectiveDriverLocation.lat, effectiveDriverLocation.lng, displayRoute[i][0], displayRoute[i][1]);
      if (d < minStep) {
        minStep = d;
        closestIdx = i;
      }
    }
    return minStep < 200 ? displayRoute.slice(closestIdx) : displayRoute;
  }, [displayRoute, effectiveDriverLocation?.lat, effectiveDriverLocation?.lng]);

  const lastFetchedRouteKeyRef = useRef("");

  // Fetch Route and ETA based on status
  useEffect(() => {
    const fetchRouteData = async () => {
      if (!ride || !pickupCoords) return;
      
      const isPickup = !["in_progress", "reached", "completed"].includes(ride.status);
      
      // 1. Determine Full Route Coordinates (for drawing)
      let routeStartLat, routeStartLng;
      if (isPickup) {
        if (effectiveDriverLocation) {
          routeStartLat = effectiveDriverLocation.lat;
          routeStartLng = effectiveDriverLocation.lng;
        } else if (ride.source?.location?.coordinates) {
          routeStartLat = ride.source.location.coordinates[1];
          routeStartLng = ride.source.location.coordinates[0];
        }
      } else {
        if (pickupCoords) {
          routeStartLat = pickupCoords[0];
          routeStartLng = pickupCoords[1];
        }
      }
      const routeStart = (routeStartLat && routeStartLng) ? [routeStartLat, routeStartLng] : null;
      const routeEnd = isPickup ? pickupCoords : destCoords;
      
      if (routeStart && routeEnd) {
        // Check if driver is far from existing route to recalculate if needed
        let minStep = Infinity;
        if (displayRoute.length > 0 && effectiveDriverLocation) {
          for (let i = 0; i < displayRoute.length; i++) {
            const d = distanceMetres(effectiveDriverLocation.lat, effectiveDriverLocation.lng, displayRoute[i][0], displayRoute[i][1]);
            if (d < minStep) minStep = d;
          }
        }

        const routeKey = isPickup ? "pickup" : "destination";
        const isFar = isPickup && (minStep > 200); // Only recalculate for pickup phase

        if (lastFetchedRouteKeyRef.current !== routeKey || isFar) {
          try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${routeStart[1]},${routeStart[0]};${routeEnd[1]},${routeEnd[0]}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
               setDisplayRoute(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
               lastFetchedRouteKeyRef.current = routeKey;
               if (isPickup) {
                 setLiveEtaMins(Math.round((data.routes[0].duration * 1.4) / 60));
               }
            }
          } catch (err) {
            console.error("Failed to fetch drawing route", err);
          }
        }
      }

      // 2. Determine Live ETA (when in progress)
      if (!isPickup && effectiveDriverLocation && destCoords) {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${effectiveDriverLocation.lng},${effectiveDriverLocation.lat};${destCoords[1]},${destCoords[0]}?overview=false`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
             setDestEtaMins(Math.round((data.routes[0].duration * 1.4) / 60));
          }
        } catch (err) {
          console.error("Failed to fetch live ETA", err);
        }
      } else if (isPickup && effectiveDriverLocation && routeEnd && lastFetchedRouteKeyRef.current === "pickup") {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${effectiveDriverLocation.lng},${effectiveDriverLocation.lat};${routeEnd[1]},${routeEnd[0]}?overview=false`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
             setLiveEtaMins(Math.round((data.routes[0].duration * 1.4) / 60));
          }
        } catch (err) {
          console.error("Failed to fetch live ETA", err);
        }
      }
    };

    const timeoutId = setTimeout(fetchRouteData, 2000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.status, ride?.source, pickupCoords, destCoords, effectiveDriverLocation?.lat, effectiveDriverLocation?.lng]);

  if (loading || !ride) return <Loader2 className="animate-spin text-white m-auto" size={48} />;
  
  const amountPaid = firstPassenger?.amountPaid || ride.fare?.totalWithTax || ride.fare?.total || 0;

  return (
    <div className="relative flex flex-col h-screen bg-[#121212] font-sans overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => navigate(-1)} 
          className="pointer-events-auto bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-2xl active:scale-95 transition-all text-white"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="bg-[#2a2a2a]/90 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" />
           <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
             {ride.status === "in_progress" ? "Trip Ongoing" : ride.status === "reached" ? "Reached Destination" : "Heading to Pickup"}
           </span>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 w-full relative z-0 nav-tilt-wrapper">
        <div 
          className="w-full h-full transform-gpu"
          style={isPerspectiveMode ? { 
            transform: `scale(2.5) rotateZ(${-heading}deg)`,
            transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
          } : {
            transform: `scale(1) rotateZ(0deg)`,
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <MapContainer 
            center={effectiveDriverLocation || pickupCoords || [23.0225, 72.5714]} 
            zoom={14} 
            className="w-full h-full" 
            zoomControl={false}
            zoomAnimation={true}
            ref={setMap}
          >
            <ZoomControl position="bottomright" />
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
              maxZoom={19} 
            />
            
            {pickupCoords && ride.status !== "in_progress" && ride.status !== "reached" && ride.status !== "completed" && (
              <Marker position={pickupCoords} icon={bluePin}>
                <Popup><b style={{ color: "#3b82f6" }}>Pickup Point</b></Popup>
              </Marker>
            )}

            {destCoords && (ride.status === "in_progress" || ride.status === "reached" || ride.status === "completed") && (
              <Marker position={destCoords} icon={redPin}>
                <Popup><b style={{ color: "#ef4444" }}>Destination</b></Popup>
              </Marker>
            )}

            {effectiveDriverLocation && vehicleIcon && (
              <Marker 
                position={[effectiveDriverLocation.lat, effectiveDriverLocation.lng]} 
                icon={vehicleIcon}
              >
                <Popup><b>Driver</b></Popup>
              </Marker>
            )}

            {/* Premium Blue Route */}
            {visibleRoute.length > 1 && (
              <>
                <Polyline
                  positions={visibleRoute}
                  pathOptions={{ color: "#1e3a8a", weight: 9, opacity: 0.15, lineCap: "round", lineJoin: "round" }}
                />
                <Polyline
                  positions={visibleRoute}
                  pathOptions={{ 
                    color: ride.status === "in_progress" ? "#6366f1" : "#3b82f6", 
                    weight: 5, 
                    opacity: 1, 
                    lineCap: "round", 
                    lineJoin: "round" 
                  }}
                />
                {visibleRoute.length < 500 && (
                  <Polyline
                    positions={visibleRoute}
                    pathOptions={{ color: "white", weight: 1.5, opacity: 0.4, dashArray: "10 20", lineCap: "round", lineJoin: "round" }}
                  />
                )}
              </>
            )}
          </MapContainer>
        </div>
      </div>

      <style>{`
        .perspective-map {
          perspective: 1200px;
        }
        .perspective-map .leaflet-container {
          transform: rotateX(45deg);
          transform-origin: center bottom;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* ── Bottom HUD ── */}
      <div className="absolute bottom-4 left-4 right-4 z-[2000] pointer-events-none flex flex-col gap-3">
        {/* Recenter & Perspective Buttons */}
        <div className="flex flex-col items-end gap-3">
             <button
                onClick={() => {
                  setIsPerspectiveMode(!isPerspectiveMode);
                  if (!isPerspectiveMode && map && effectiveDriverLocation) {
                    map.setView([effectiveDriverLocation.lat, effectiveDriverLocation.lng], 16, { animate: true });
                  } else if (isPerspectiveMode && map && effectiveDriverLocation) {
                    const target = ride.status === "in_progress" ? destCoords : pickupCoords;
                    if (target) map.fitBounds(
                      L.latLngBounds([[effectiveDriverLocation.lat, effectiveDriverLocation.lng], [target[1], target[0]]]),
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
                onClick={() => fetchRide()}
                className="pointer-events-auto bg-black/60 backdrop-blur border border-white/15 text-white p-3 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all disabled:opacity-50"
                title="Refresh Route"
             >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
             </button>
        </div>
        
        <div className={`bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 pointer-events-auto shadow-2xl relative overflow-hidden transition-all duration-500 ease-in-out ${isMinimized ? "max-h-[85px]" : "max-h-[800px]"}`}>
          {/* Minimize toggle for passengers */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all z-50 active:scale-90"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}
          </button>

          {/* ─── PASSENGER HUD ─── */}
          <div className="flex flex-col gap-3">
            {/* Status banner */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
              ride.status === "reached" || ride.status === "completed"
                ? "bg-violet-500/10 border-violet-500/30"
                : ride.status === "in_progress"
                ? "bg-emerald-500/10 border-emerald-500/30"
                : ride.status === "arrived"
                ? "bg-primary/10 border-primary/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                ride.status === "reached" || ride.status === "completed" ? "bg-violet-500"
                : ride.status === "in_progress" ? "bg-emerald-500"
                : ride.status === "arrived" ? "bg-primary"
                : "bg-amber-500"
              }`} />
              <span className={`text-xs font-black uppercase tracking-widest ${
                ride.status === "reached" || ride.status === "completed" ? "text-violet-400"
                : ride.status === "in_progress" ? "text-emerald-400"
                : ride.status === "arrived" ? "text-primary"
                : "text-amber-400"
              }`}>
                {ride.status === "reached" || ride.status === "completed" ? "📍 Destination Reached"
                 : ride.status === "in_progress" ? "🚀 Trip in Progress"
                 : ride.status === "arrived" ? "🎯 Driver at Pickup"
                 : "🚗 Driver is on the way"}
              </span>
            </div>

            {/* Main content - hidden when minimized */}
            {!isMinimized && (
              <>
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
                        {effectiveDriverLocation && (
                          <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Live</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                          <IndianRupee size={9} className="text-emerald-400" />
                          <span className="text-xs font-black text-emerald-400">{amountPaid}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ETA / OTP / Info Section */}
                {ride.status === "reached" || ride.status === "completed" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Arrived at Destination</p>
                    <p className="text-[11px] text-white/50 mt-1">Please pay the driver ₹{amountPaid} to complete the trip.</p>
                  </div>
                ) : ride.status === "in_progress" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-sm font-black text-emerald-400 text-center">
                      {destEtaMins !== null
                        ? destEtaMins <= 1 ? "🏁 Arriving at destination soon!"
                        : `~${destEtaMins} min to destination`
                        : "Trip is ongoing!"}
                    </p>
                    <p className="text-[11px] text-white/50 mt-1 text-center">Live ETA · Updates as driver moves</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* OTP Display - Critical for starting the ride */}
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest">Your Ride OTP</p>
                      <p className="text-2xl font-black text-white mt-1 tracking-[10px] uppercase">
                        {ride.otp || "----"}
                      </p>
                      <p className="text-[10px] text-white/40 mt-1">Give this to the driver to start the ride</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-white">
                            {liveEtaMins !== null
                              ? liveEtaMins === 0 ? "Driver is arriving now!"
                              : `~${liveEtaMins} min away (live)`
                              : effectiveDriverLocation ? "Calculating ETA…"
                              : "Waiting for driver GPS signal"}
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {effectiveDriverLocation
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
                  </div>
                )}

                {/* SOS Button — only when trip is ongoing */}
                {ride.status === "in_progress" && (
                  <div className="mt-1">
                    <SOSButton
                      tripId={rideId}
                      warningActive={sosWarningActive}
                      warningReason={sosWarningReason}
                      onWarningClose={() => setSosWarningActive(false)}
                    />
                  </div>
                )}

                {/* PAYMENT SECTION — only when reached */}
                {(ride.status === "reached" || ride.status === "completed") && (
                  <div className="space-y-3 pt-2 border-t border-white/10 mt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={async () => {
                          try {
                            const res = await api.post("/payments/wallet-pay", { rideId: ride._id });
                            if (res.data.success) showAlert("Wallet payment successful!", "Done", "success");
                          } catch (err) {
                            showAlert(err.response?.data?.message || "Wallet payment failed", "Error", "error");
                          }
                        }}
                        className="bg-primary text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/20"
                      >
                        Pay via Wallet
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const res = await api.post("/payments/create-order", { 
                              amount: amountPaid || 0,
                              purpose: "upi_trip",
                              rideId: ride._id
                            });
                            if (res.data.success) {
                              const loaded = await loadRazorpay();
                              if (!loaded) throw new Error("Razorpay SDK failed to load");
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
                        }}
                        className="bg-white/10 border border-white/10 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                      >
                        Pay By Razorpay
                      </button>
                    </div>
                    <button 
                      onClick={() => showAlert("Please pay the driver in cash.", "Cash Selected", "info")}
                      className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                    >
                      I will pay Cash
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassengerLiveTracking;
