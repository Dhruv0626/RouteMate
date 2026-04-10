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

const StartRide = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  
  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOtpBox, setShowOtpBox] = useState(true);
  const [otpSlots, setOtpSlots] = useState(["", "", "", ""]);
  const [isStartingRequest, setIsStartingRequest] = useState(false);
  const [isNavigatingInternal, setIsNavigatingInternal] = useState(false);
  const [driverToPickupRoute, setDriverToPickupRoute] = useState([]);
  
  // Detect if it's a PublishedRide (has bookings) or a Trip (has single passenger)
  const firstPassenger = ride?.bookings 
    ? ride.bookings.find(b => b.status === "confirmed" || b.status === "pending")
    : (ride?.passenger ? { 
        passenger: ride.passenger, 
        passengerSource: ride.source, 
        passengerDestination: ride.destination,
        amountPaid: ride.fare?.total 
      } : null);
  const isHeadingToPickup = ride && (ride.status === "open" || ride.status === "full" || ride.status === "arrived") && !!firstPassenger;

  // Initialize and connect socket
  useEffect(() => {
    socket.connect();
    socket.emit("join_ride", rideId);

    // Listen for incoming location updates from driver
    socket.on("location_update", (data) => {
      setDriverLocation({ lat: data.lat, lng: data.lng });
    });

    return () => {
      socket.off("location_update");
      socket.disconnect();
    };
  }, [rideId]);

  // AUTO-FIT MAP BOUNDS
  const [map, setMap] = useState(null);
  useEffect(() => {
    if (!map || !driverLocation || !firstPassenger?.passengerSource?.location?.coordinates) return;
    
    const passTarget = (ride?.status === "active") 
      ? (firstPassenger?.passengerDestination?.location?.coordinates || ride?.destination?.location?.coordinates)
      : firstPassenger?.passengerSource?.location?.coordinates;

    if (!passTarget) return;

    const bounds = L.latLngBounds([
      [driverLocation.lat, driverLocation.lng],
      [passTarget[1], passTarget[0]]
    ]);
    
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true });
  }, [map, driverLocation?.lat, driverLocation?.lng, firstPassenger, ride?.status]);

  // Fetch ride details
  useEffect(() => {
    const fetchRide = async () => {
      try {
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

  // ─── Block browser back navigation until ride is completed ───────────────
  useEffect(() => {
    if (!ride || !isDriver) return;
    
    // Only block if the ride is not yet completed
    if (ride.status === "completed") return;

    const blockBack = (e) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };
    
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", blockBack);
    
    return () => window.removeEventListener("popstate", blockBack);
  }, [ride?.status, isDriver]);

  // ─── Auto-mark 'arrived' when OTP box opens (no button needed) ───────────
  useEffect(() => {
    if (!ride || !isDriver || !rideId) return;
    if (!showOtpBox) return;
    if (ride.status === "arrived" || ride.status === "active" || ride.status === "completed") return;

    api.patch(`/published-rides/${rideId}/status`, { status: "arrived" })
      .then(() => setRide(prev => ({ ...prev, status: "arrived" })))
      .catch(err => console.error("Auto-arrived error:", err));
  }, [showOtpBox, ride?.status, isDriver, rideId]);

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



  // Haversine distance calculator
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // Determine if driver arrived at destination (within 2 km radius for easy testing)
  let isNearDestination = false;
  const targetDropoff = firstPassenger?.passengerDestination?.location?.coordinates || ride?.destination?.location?.coordinates;
  if (driverLocation && targetDropoff && ride?.status === "active") {
    const dist = getDistanceKm(driverLocation.lat, driverLocation.lng, targetDropoff[1], targetDropoff[0]);
    if (dist <= 2.0) isNearDestination = true;
  }

  // Fetch true OSRM route for Driver -> Pickup (Road-wise Navigation)
  useEffect(() => {
    const passCoords = firstPassenger?.passengerSource?.location?.coordinates;
    const isReady = isHeadingToPickup && driverLocation && passCoords && passCoords[0] !== 0;

    if (!isReady) {
      if (driverToPickupRoute.length > 0) setDriverToPickupRoute([]);
      return;
    }

    const fetchPickupRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${passCoords[0]},${passCoords[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
          const roadPath = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setDriverToPickupRoute(roadPath);
        } else {
          console.warn("OSRM returned no route, falling back to straight line.");
          setDriverToPickupRoute([]);
        }
      } catch (e) {
        console.error("OSRM fetch error:", e);
        setDriverToPickupRoute([]);
      }
    };
    
    fetchPickupRoute();
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
            {ride.status === "active" ? "Mission Ongoing" : ride.status === "arrived" ? "Wait for OTP" : ride.status === "full" || ride.status === "open" ? "Heading to Pickup" : "Ride Tracker"}
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
          
          {/* Main Route Pickup */}
          {ride.source?.location?.coordinates && (
            <Marker position={[ride.source.location.coordinates[1], ride.source.location.coordinates[0]]} icon={greenIcon}>
              <Popup><b className="text-emerald-700">Driver Start</b><br/>{ride.source.address}</Popup>
            </Marker>
          )}

          {/* Passenger Pickup "Sign" - SHOW IF NOT STARTED */}
          {ride.status !== "active" && firstPassenger?.passengerSource?.location?.coordinates && (
             <Marker 
               position={[firstPassenger.passengerSource.location.coordinates[1], firstPassenger.passengerSource.location.coordinates[0]]} 
               icon={redIcon}
             >
                <Popup>
                  <b className="text-red-700">Passenger Pickup</b><br/>
                  {firstPassenger.passengerSource.address}
                </Popup>
             </Marker>
          )}

          {/* Route Dropoff - ONLY SHOW IF STARTED */}
           {ride.status === "active" && (firstPassenger?.passengerDestination?.location?.coordinates || ride.destination?.location?.coordinates) && (
            <Marker position={firstPassenger?.passengerDestination?.location?.coordinates ? [firstPassenger.passengerDestination.location.coordinates[1], firstPassenger.passengerDestination.location.coordinates[0]] : [ride.destination.location.coordinates[1], ride.destination.location.coordinates[0]]} icon={redIcon}>
              <Popup><b className="text-red-700">Passenger Destination</b><br/>{firstPassenger?.passengerDestination?.address || ride.destination?.address}</Popup>
            </Marker>
          )}

          {/* Driver Live Marker */}
          {driverLocation && (
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
              <Popup><b>Your Location</b></Popup>
            </Marker>
          )}

          {/* Route line */}
          {isHeadingToPickup ? (
            /* Heading to Pickup: Driver -> Passenger Source */
            driverLocation && (
              <Polyline 
                positions={driverToPickupRoute.length > 0 
                  ? driverToPickupRoute 
                  : [
                    [driverLocation.lat, driverLocation.lng],
                    [firstPassenger.passengerSource.location.coordinates[1], firstPassenger.passengerSource.location.coordinates[0]]
                  ]
                }
                pathOptions={{ color: "#3b82f6", weight: 6, opacity: 0.9 }}
              />
            )
          ) : (
            /* Active Trip: actual road path if available */
            (ride.routeCoords?.length > 0 || (ride.source?.location?.coordinates && ride.destination?.location?.coordinates)) && (
              <Polyline 
                positions={ride.routeCoords?.length > 0 
                  ? ride.routeCoords.map(c => [c[1], c[0]]) 
                  : (firstPassenger?.passengerDestination?.location?.coordinates) ? [
                    [firstPassenger.passengerSource.location.coordinates[1], firstPassenger.passengerSource.location.coordinates[0]], 
                    [firstPassenger.passengerDestination.location.coordinates[1], firstPassenger.passengerDestination.location.coordinates[0]]
                  ] : [
                    [ride.source.location.coordinates[1], ride.source.location.coordinates[0]], 
                    [ride.destination.location.coordinates[1], ride.destination.location.coordinates[0]]
                  ]
                } 
                pathOptions={{ color: "#6366f1", weight: 5, opacity: 0.7 }} 
              />
            )
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

              {ride.status !== "active" && (
                <>
                   <button 
                      onClick={() => setShowOtpBox(true)} 
                      disabled={isStartingRequest}
                      className="flex-1 bg-amber-500 text-black font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      <Play size={20} className={isStartingRequest ? "animate-spin" : ""} />
                      Start Ride
                    </button>
                </>
              )}
              {ride.status === "active" && (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                     <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Trip Ongoing</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    <span className="text-[9px] font-black text-emerald-500/60 uppercase">Final Fare</span>
                    <span className="text-sm font-black text-emerald-500 flex items-center gap-0.5">
                      <IndianRupee size={12} /> {firstPassenger?.amountPaid || 0}
                    </span>
                  </div>
                </div>
              )}
              {ride.status === "active" && isNearDestination && (
                <button onClick={() => handleUpdateStatus("completed")} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-red-500/20 transition-all animate-pulse">
                  <Square size={20} /> Complete Ride
                </button>
              )}
              {ride.status === "active" && !isNearDestination && (
                <div className="flex-1 bg-white/5 border border-white/10 text-white/50 font-black py-4 rounded-xl flex justify-center items-center gap-2">
                  <Navigation size={18} /> Heading To Destination...
                </div>
              )}
            </div>
          ) : (
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
                  {ride.status !== "active" ? (
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
      {/* OTP Overlay - Always shows 4-box input directly, marks arrived automatically */}
      {showOtpBox && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1219] w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl relative">
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
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
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
                onClick={() => handleUpdateStatus("active")}
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
