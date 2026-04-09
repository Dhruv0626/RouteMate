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
const greenIcon = new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41] });
const redIcon = new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41] });

const LiveTrackingPage = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  
  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState("");
  const [isStartingRequest, setIsStartingRequest] = useState(false);
  const [isNavigatingInternal, setIsNavigatingInternal] = useState(false);

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

  // Fetch ride details
  useEffect(() => {
    const fetchRide = async () => {
      try {
        // Driver can get it from my-published. Passenger from my-booked.
        let foundRide = null;
        if (user.role === "driver") {
          const res1 = await api.get("/published-rides/my-published");
          foundRide = res1.data.data.find(r => r._id === rideId);
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
    if (status === "active" && !otp) {
        showAlert("Please enter the passenger's OTP to start the trip.", "OTP Required", "warning");
        return;
    }

    setIsStartingRequest(true);
    try {
      const payload = { status };
      if (status === "active") payload.otp = otp;

      await api.patch(`/published-rides/${rideId}/status`, payload);
      setRide(prev => ({ ...prev, status }));
      if (status === "completed") {
        showAlert("Ride Completed successfully!", "Trip Finished", "success");
        navigate("/driver/dashboard");
      }
    } catch (e) {
      showAlert(e.response?.data?.message || "Failed to update status", "Failed", "error");
    } finally {
      setIsStartingRequest(false);
    }
  };

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

  // Determine route: Driver location to first pickup if not active, else full route
  const firstPassenger = (ride.bookings || []).find(b => b.status === "confirmed" || b.status === "pending");
  const isHeadingToPickup = (ride.status === "open" || ride.status === "full" || ride.status === "arrived") && firstPassenger;

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
        <MapContainer center={mapCenter} zoom={14} className="w-full h-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' maxZoom={19} />
          
          {/* Main Route Pickup */}
          {ride.source?.location?.coordinates && (
            <Marker position={[ride.source.location.coordinates[1], ride.source.location.coordinates[0]]} icon={greenIcon}>
              <Popup><b className="text-emerald-700">Driver Start</b><br/>{ride.source.address}</Popup>
            </Marker>
          )}

          {/* Passenger Pickups - ONLY SHOW IF NOT STARTED */}
          {ride.status !== "active" && (ride.bookings || []).filter(b => b.status === "confirmed" || b.status === "pending").map((b, i) => (
             b.passengerSource?.location?.coordinates && b.passengerSource.location.coordinates[1] !== 0 && (
              <Marker key={`p-${i}`} position={[b.passengerSource.location.coordinates[1], b.passengerSource.location.coordinates[0]]} icon={greenIcon}>
                 <Popup><b className="text-emerald-700">Passenger Pickup</b><br/>{b.passengerSource.address}</Popup>
              </Marker>
             )
          ))}

          {/* Main Route Dropoff - ONLY SHOW IF STARTED */}
           {ride.status === "active" && ride.destination?.location?.coordinates && (
            <Marker position={[ride.destination.location.coordinates[1], ride.destination.location.coordinates[0]]} icon={redIcon}>
              <Popup><b className="text-red-700">Passenger Destination</b><br/>{ride.destination.address}</Popup>
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
                positions={[
                  [driverLocation.lat, driverLocation.lng],
                  [firstPassenger.passengerSource.location.coordinates[1], firstPassenger.passengerSource.location.coordinates[0]]
                ]}
                pathOptions={{ color: "#fbbf24", weight: 5, opacity: 0.8, dashArray: "10 10", lineCap: "round" }}
              />
            )
          ) : (
            /* Active Trip: actual road path if available */
            (ride.routeCoords?.length > 0 || (ride.source?.location?.coordinates && ride.destination?.location?.coordinates)) && (
              <Polyline 
                positions={ride.routeCoords?.length > 0 
                  ? ride.routeCoords.map(c => [c[1], c[0]]) 
                  : [
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
                  {ride.status !== "arrived" ? (
                    <button 
                      onClick={() => handleUpdateStatus("arrived")} 
                      disabled={isStartingRequest}
                      className="flex-1 bg-amber-500 text-black font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      {isStartingRequest ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
                      I Have Arrived
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 bg-white/5 border border-white/10 p-3 rounded-xl">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                        <Lock size={10} /> Secure Trip Start
                      </p>
                      <div className="flex items-center gap-2">
                         <input 
                           type="text" 
                           maxLength={4}
                           placeholder="Enter OTP"
                           value={otp}
                           onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                           className="flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-lg text-lg font-black tracking-[0.4em] text-center focus:border-primary outline-none"
                         />
                         <button 
                           onClick={() => handleUpdateStatus("active")} 
                           disabled={otp.length !== 4 || isStartingRequest}
                           className="h-[54px] px-6 bg-primary text-black font-black rounded-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0"
                         >
                           {isStartingRequest ? <Loader2 size={18} className="animate-spin" /> : <Play size={20} />}
                           Start
                         </button>
                      </div>
                      <p className="text-[9px] text-white/40 italic text-center">Ask the passenger for their 4-digit code</p>
                    </div>
                  )}
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
              {ride.status === "active" && (
                <button onClick={() => handleUpdateStatus("completed")} className="flex-1 bg-red-500 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-red-500/20">
                  <Square size={20} /> Complete Ride
                </button>
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
                      <span className="text-xs text-white/50 truncate">{ride.vehicleType || "Vehicle"} • En route</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingPage;
