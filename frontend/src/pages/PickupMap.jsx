import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Navigation, Play, Square, Loader2, User as UserIcon, Lock, MapPin, IndianRupee, Phone } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import socket from "../services/socket";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";

// Icons setup
const carIcon = L.divIcon({
  html: `<div style="font-size:24px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">🚗</div>`,
  className: "",
  iconSize: [24,24],
});
const greenIcon = L.divIcon({
  html: `<div style="color:#10b981; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
         </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const redIcon = L.divIcon({
  html: `<div style="color:#ef4444; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
         </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const PickupMap = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  
  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otpSlots, setOtpSlots] = useState(["", "", "", ""]);
  const [isStartingRequest, setIsStartingRequest] = useState(false);
  const [isNavigatingInternal, setIsNavigatingInternal] = useState(false);
  const [driverToPickupRoute, setDriverToPickupRoute] = useState([]);
  const [liveEtaMins, setLiveEtaMins] = useState(null);       // ETA to pickup
  const [destEtaMins, setDestEtaMins] = useState(null);       // ETA to destination when active

  // Detect if it's a PublishedRide (has bookings) or a Trip (has single passenger)
  const firstPassenger = ride?.bookings 
    ? ride.bookings.find(b => b.status === "confirmed" || b.status === "pending")
    : (ride?.passenger ? { 
        passenger: ride.passenger, 
        passengerSource: ride.source, 
        passengerDestination: ride.destination,
        amountPaid: ride.fare?.total 
      } : null);
  // On this specific PickupMap page, we always want to show the path to the pickup source
  const isHeadingToPickup = ride && !!firstPassenger;

  // Initialize and connect socket
  useEffect(() => {
    socket.connect();
    socket.emit("join_ride", rideId);
    return () => socket.disconnect();
  }, [rideId]);

  // Listen for incoming location updates from driver
  useEffect(() => {
    socket.on("location_update", (data) => {
      setDriverLocation({ lat: data.lat, lng: data.lng });
    });
    return () => { socket.off("location_update"); };
  }, []);

  // ─── Real-time ETA: recalculate from driver's live position ──────
  useEffect(() => {
    if (!driverLocation || isDriver) return;

    const isActive = ride?.status === 'active';
    // When active: calc to destination. Otherwise: calc to pickup.
    const targetCoords = isActive
      ? firstPassenger?.passengerDestination?.location?.coordinates
      : firstPassenger?.passengerSource?.location?.coordinates;

    if (!targetCoords) return;
    let cancelled = false;

    const calcEta = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${targetCoords[0]},${targetCoords[1]}?overview=false`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled && data.code === "Ok" && data.routes?.[0]) {
          const mins = Math.round(data.routes[0].duration / 60);
          if (isActive) setDestEtaMins(mins);
          else setLiveEtaMins(mins);
        }
      } catch (_) {}
    };
    calcEta();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation?.lat, driverLocation?.lng, isDriver, ride?.status]);

  // AUTO-FIT MAP BOUNDS
  const [map, setMap] = useState(null);
  useEffect(() => {
    if (!map || !driverLocation || !firstPassenger?.passengerSource?.location?.coordinates) return;
    
    const passCoords = firstPassenger.passengerSource.location.coordinates;
    const bounds = L.latLngBounds([
      [driverLocation.lat, driverLocation.lng],
      [passCoords[1], passCoords[0]]
    ]);
    
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true });
  }, [map, driverLocation?.lat, driverLocation?.lng, firstPassenger?.passengerSource?.address]);

  // ─── Block browser back navigation until driver clicks Pickup ────────────
  useEffect(() => {
    if (!isDriver) return;

    const blockBack = (e) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", blockBack);

    return () => window.removeEventListener("popstate", blockBack);
  }, [isDriver]);

  // Fetch ride details
  useEffect(() => {
    const fetchRide = async () => {
      try {
        // Driver can get it from my-published. Passenger from my-booked.
        let foundRide = null;
        if (user.role === "driver") {
          const res1 = await api.get("/published-rides/my-published");
          foundRide = res1.data.data.find(r => r._id === rideId);
          
          if (!foundRide) {
            const resTrips = await api.get("/rides/active-trips");
            const trip = resTrips.data.data.find(t => t._id === rideId || t.publishedRide === rideId || t.publishedRide?._id === rideId);
            if (trip) {
               if (trip.publishedRide && typeof trip.publishedRide === 'object') {
                   foundRide = trip.publishedRide;
               } else if (trip.publishedRide) {
                   const prRes = await api.get("/published-rides/my-published");
                   foundRide = prRes.data.data.find(r => r._id === trip.publishedRide);
               }
            }
          }
          if(foundRide) setIsDriver(true);
        } else {
          const res2 = await api.get("/published-rides/my-booked");
          foundRide = res2.data.data.find(r => r._id === rideId);
          setIsDriver(false);
        }
        
        setRide(foundRide);
      } catch (err) {
        console.error("Failed to load ride", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [rideId, user.role]);

  // If driver, watch position and emit
  useEffect(() => {
    if (!isDriver) return;
    
    // Request permission if needed
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    if (!appSettings.locationTracking) {
      showAlert("Please enable Location Tracking in Settings to share live location.", "Location Required", "warning");
      return;
    }

    if (!navigator.geolocation) return;

    const wid = navigator.geolocation.watchPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setDriverLocation(coords);
        socket.emit("driver_location_update", { rideId, lat: coords.lat, lng: coords.lng });
      },
      (e) => console.warn("GPS error:", e.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(wid);
  }, [isDriver, rideId]);

  const handleUpdateStatus = async (status) => {
    const fullOtp = otpSlots.join("");
    if (status === "active" && fullOtp.length !== 4) {
        showAlert("Please enter the complete 4-digit passenger OTP.", "OTP Required", "warning");
        return;
    }

    setIsStartingRequest(true);
    try {
      const payload = { status };
      if (status === "active") payload.otp = fullOtp;

      await api.patch(`/published-rides/${rideId}/status`, payload);
      setRide(prev => ({ ...prev, status }));
      if (status === "completed") {
        showAlert("Ride Completed successfully!", "Trip Finished", "success");
        navigate("/driver/dashboard");
      }
      if (status === "active") {
        setShowOtpBox(false);
      }
    } catch (e) {
      showAlert(e.response?.data?.message || "Failed to update status", "Failed", "error");
    } finally {
      setIsStartingRequest(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const val = value.replace(/[^0-9]/g, "");
    if (!val && value !== "") return;
    
    const newSlots = [...otpSlots];
    newSlots[index] = val;
    setOtpSlots(newSlots);

    // Auto focus next
    if (val && index < 3) {
      const nextId = `otp-${index + 1}`;
      document.getElementById(nextId)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpSlots[index] && index > 0) {
      const prevId = `otp-${index - 1}`;
      document.getElementById(prevId)?.focus();
    }
  };



  // Fetch true OSRM route for Driver -> Pickup (Road-wise Navigation)
  useEffect(() => {
    const passCoords = firstPassenger?.passengerSource?.location?.coordinates;
    const isReady = isHeadingToPickup && driverLocation && passCoords && passCoords[0] !== 0;

    if (!isReady) {
      if (driverToPickupRoute.length > 0) setDriverToPickupRoute([]);
      return;
    }

    const fetchPickupRoute = async () => {
      // Abort previous request using a ref-like approach
      if (window.pickupAbortController) window.pickupAbortController.abort();
      window.pickupAbortController = new AbortController();

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${passCoords[0]},${passCoords[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: window.pickupAbortController.signal });
        const data = await res.json();
        
        if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
          const roadPath = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setDriverToPickupRoute(roadPath);
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error("OSRM fetch error:", e);
      }
    };
    
    fetchPickupRoute();
    return () => { if (window.pickupAbortController) window.pickupAbortController.abort(); };
  }, [driverLocation?.lat, driverLocation?.lng, isHeadingToPickup, firstPassenger?.passengerSource?.address]);

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f] text-white">
        Ride not found
      </div>
    );
  }

  const mapCenter = driverLocation || 
    (ride.source && ride.source.location.coordinates ? [ride.source.location.coordinates[1], ride.source.location.coordinates[0]] : [23.0225, 72.5714]);

  return (
    <div className="relative flex flex-col h-screen text-white bg-black">
      {/* Header */}
      <div className="absolute top-0 w-full z-50 p-4 shrink-0 flex items-center justify-between pointer-events-none">
        <button onClick={() => navigate(-1)} className="pointer-events-auto bg-black/50 backdrop-blur border border-white/10 p-3 rounded-full hover:bg-white/10 transition">
          <ArrowLeft size={20} />
        </button>
        <div className="bg-black/50 backdrop-blur border border-white/10 px-4 py-2 rounded-full pointer-events-auto flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${ride.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
          <span className="text-xs font-bold uppercase tracking-wider">
            {ride.status === "active" ? "Pickup Ongoing" : ride.status === "arrived" ? "Wait for OTP" : ride.status === "full" || ride.status === "open" ? "Heading to Pickup" : "Ride Tracker"}
          </span>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          className="w-full h-full" 
          zoomControl={false}
          ref={setMap}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' maxZoom={19} />
          
          {/* Main Driver Start marker removed to focus on Passenger Pickup */}

          {/* Passenger Pickup "Sign" - ALWAYS SHOW IF TARGET EXISTS */}
          {firstPassenger?.passengerSource?.location?.coordinates && (
             <Marker 
               position={[firstPassenger.passengerSource.location.coordinates[1], firstPassenger.passengerSource.location.coordinates[0]]} 
               icon={redIcon}
             >
                <Popup>
                  <b style={{ color: '#ef4444' }}>Passenger Pickup</b><br/>
                  {firstPassenger.passengerSource.address}
                </Popup>
             </Marker>
          )}

          {/* Driver Live Marker */}
          {driverLocation && (
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
              <Popup><b>Your Location</b></Popup>
            </Marker>
          )}

          {/* Route line: ALWAYS Driver -> Passenger Pickup on this page */}
          {driverLocation && firstPassenger?.passengerSource?.location?.coordinates && (
            <>
                <Polyline 
                    positions={driverToPickupRoute.length > 0 ? driverToPickupRoute : [[driverLocation.lat, driverLocation.lng], [firstPassenger.passengerSource.location.coordinates[1], firstPassenger.passengerSource.location.coordinates[0]]]}
                    pathOptions={{ color: "#1e3a8a", weight: 9, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
                />
                <Polyline 
                    positions={driverToPickupRoute.length > 0 ? driverToPickupRoute : [[driverLocation.lat, driverLocation.lng], [firstPassenger.passengerSource.location.coordinates[1], firstPassenger.passengerSource.location.coordinates[0]]]}
                    pathOptions={{ color: "#3b82f6", weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
                />
            </>
          )}
        </MapContainer>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-4 left-4 right-4 z-50 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 pointer-events-auto shadow-2xl">
          {isDriver ? (
            <div className="flex flex-col gap-3">
              {/* Quick Actions Group - ONLY FOR PICKUP PHASE */}
              {ride.status !== "active" && (
                <div className="flex gap-3">
                    <button 
                      onClick={() => setIsNavigatingInternal(!isNavigatingInternal)} 
                      className={`flex-1 ${isNavigatingInternal ? 'bg-primary text-black' : 'bg-amber-400 text-black'} font-black py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg transition-all text-sm pointer-events-auto`}
                    >
                      <Navigation size={18} className={isNavigatingInternal ? "animate-pulse" : ""} />
                      {isNavigatingInternal ? "Exit Nav" : "Navigation"}
                    </button>
                    <a 
                      href={`tel:${firstPassenger?.passenger?.Mobile_no || ""}`}
                      className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm pointer-events-auto"
                    >
                      <Phone size={18} />
                      Call
                    </a>
                </div>
              )}

                   <button 
                      onClick={() => navigate('/driver/dashboard/active-rides')} 
                      className="flex-1 bg-amber-500 text-black font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      <MapPin size={20} />
                      Pickup
                    </button>
            </div>
          ) : (
            /* ─── PASSENGER LIVE TRACKING ───────────────────────────── */
            <div className="flex flex-col gap-3">

              {/* Status Banner */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                ride.status === "arrived" 
                  ? "bg-violet-500/10 border-violet-500/30" 
                  : ride.status === "active"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${
                  ride.status === "arrived" ? "bg-violet-500" 
                  : ride.status === "active" ? "bg-emerald-500" 
                  : "bg-amber-500"
                }`} />
                <span className={`text-xs font-black uppercase tracking-widest ${
                  ride.status === "arrived" ? "text-violet-400" 
                  : ride.status === "active" ? "text-emerald-400" 
                  : "text-amber-400"
                }`}>
                  {ride.status === "arrived" ? "🎯 Driver has arrived at pickup!" 
                   : ride.status === "active" ? "🚀 Ride in progress" 
                   : "🚗 Driver is on the way"}
                </span>
              </div>

              {/* Driver Info Card */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                  {ride.driver?.profileImage 
                    ? <img src={ride.driver.profileImage} alt="" className="w-full h-full object-cover" />
                    : <UserIcon size={22} className="text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm">{ride.driver?.name || "Your Driver"}</p>
                      <p className="text-[10px] text-white/40 font-medium">{(ride.vehicleType || "Vehicle").toUpperCase()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Live ping if driver location exists */}
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

              {/* Status Specific Info */}
              {ride.status === "arrived" ? (
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-center">
                  <p className="text-sm font-black text-violet-300">Share your OTP with the driver</p>
                  <p className="text-[11px] text-white/50 mt-1">Your OTP was sent in your booking confirmation notification.</p>
                </div>
              ) : ride.status === "active" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-sm font-black text-emerald-400 text-center">
                    {destEtaMins !== null
                      ? destEtaMins <= 1 ? "🏁 Arriving at destination soon!"
                      : `~${destEtaMins} min to destination`
                      : "Trip is ongoing — relax!"}
                  </p>
                  <p className="text-[11px] text-white/50 mt-1 text-center">
                    {destEtaMins !== null
                      ? "Live ETA · Updates as driver moves"
                      : "The driver is taking you to your destination."}
                  </p>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-white">
                          {liveEtaMins !== null
                            ? liveEtaMins === 0 ? "Driver is arriving now!"
                            : `~${liveEtaMins} min away (live)`
                            : driverLocation ? "Calculating ETA..."
                            : "Waiting for driver GPS signal"
                          }
                        </p>
                        {liveEtaMins !== null && (
                          <span className="text-[8px] text-white/40 italic">(est.)</span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {driverLocation
                          ? "Driver is visible on map above ↑ · Updates as driver moves"
                          : "Driver location will appear on map once GPS connects"}
                      </p>
                    </div>
                    {ride.driver?.Mobile_no && (
                      <a href={`tel:${ride.driver.Mobile_no}`}
                        className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex-shrink-0 ml-3"
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
