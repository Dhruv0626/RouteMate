import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Navigation, Play, Square, Loader2, User as UserIcon } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import socket from "../services/socket";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

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
  
  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);

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
        // Just determine if current user is the driver
        const res = await api.get("/published-rides/available"); // or a dedicated single ride endpoint if available. Wait, driver can get it from my-published. Passenger from my-booked.
        // Actually, we can just fetch my-published and my-booked to find the ride.
        
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
        
        // Initial driver location if available in ride object
        // if (foundRide && foundRide.source.location.coordinates) {
        //   setDriverLocation({ lat: foundRide.source.location.coordinates[1], lng: foundRide.source.location.coordinates[0] });
        // }
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
      alert("Please enable Location Tracking in Settings to share live location.");
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
    try {
      await api.patch(`/published-rides/${rideId}/status`, { status });
      setRide(prev => ({ ...prev, status }));
      if (status === "completed") {
        alert("Ride Completed!");
        navigate("/driver/dashboard");
      }
    } catch (e) {
      alert("Failed to update status");
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

  return (
    <div className="relative flex flex-col h-screen text-white bg-black">
      {/* Header */}
      <div className="absolute top-0 w-full z-50 p-4 shrink-0 flex items-center justify-between pointer-events-none">
        <button onClick={() => navigate(-1)} className="pointer-events-auto bg-black/50 backdrop-blur border border-white/10 p-3 rounded-full hover:bg-white/10 transition">
          <ArrowLeft size={20} />
        </button>
        <div className="bg-black/50 backdrop-blur border border-white/10 px-4 py-2 rounded-full pointer-events-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider">{ride.status === "active" ? "Live Tracking" : "Not Started"}</span>
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

          {/* Passenger Pickups */}
          {(ride.bookings || []).filter(b => b.status === "confirmed").map((b, i) => (
             b.passengerSource?.location?.coordinates && b.passengerSource.location.coordinates[1] !== 0 && (
              <Marker key={`p-${i}`} position={[b.passengerSource.location.coordinates[1], b.passengerSource.location.coordinates[0]]} icon={greenIcon}>
                 <Popup><b className="text-emerald-700">Passenger Pickup</b><br/>{b.passengerSource.address}</Popup>
              </Marker>
             )
          ))}

          {/* Main Route Dropoff */}
           {ride.destination?.location?.coordinates && (
            <Marker position={[ride.destination.location.coordinates[1], ride.destination.location.coordinates[0]]} icon={redIcon}>
              <Popup><b className="text-red-700">Driver End</b><br/>{ride.destination.address}</Popup>
            </Marker>
          )}

          {/* Driver Live Marker */}
          {driverLocation && (
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
              <Popup><b>Driver's Current Location</b></Popup>
            </Marker>
          )}

          {/* Route line (straight line approximations for now) */}
          {ride.source?.location?.coordinates && ride.destination?.location?.coordinates && (
            <Polyline 
              positions={[
                [ride.source.location.coordinates[1], ride.source.location.coordinates[0]], 
                [ride.destination.location.coordinates[1], ride.destination.location.coordinates[0]]
              ]} 
              pathOptions={{ color: "#6366f1", weight: 5, opacity: 0.7 }} 
            />
          )}
        </MapContainer>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-4 left-4 right-4 z-50 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 pointer-events-auto">
          {isDriver ? (
            <div className="flex gap-3">
              {ride.status !== "active" && (
                <button onClick={() => handleUpdateStatus("active")} className="flex-1 bg-primary text-black font-black py-4 rounded-xl flex justify-center items-center gap-2">
                  <Play size={20} /> Start Ride
                </button>
              )}
              {ride.status === "active" && (
                <button onClick={() => handleUpdateStatus("completed")} className="flex-1 bg-red-500 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2">
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
                <p className="font-bold text-sm truncate">{ride.driver?.name || "Your Driver"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 border rounded-full text-[10px] uppercase font-bold border-emerald-500/30 text-emerald-500">Live</span>
                  <span className="text-xs text-white/50 truncate">{ride.vehicleType || "Vehicle"} • En route</span>
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
