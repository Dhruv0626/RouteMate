import { useState, useEffect, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, MapPin,
  Users, IndianRupee, Car, Navigation, AlertCircle,
  Loader2, Phone, MessageSquare, Shield,
} from "lucide-react";
import api from "../../services/api";
import ThemeToggle from "../../components/ui/ThemeToggle";

const RideMap = lazy(() => import("../../components/map/RideMap"));

const RideRequestDetailsPage = () => {
  const { rideId, bookingId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError("");
    try {
      // We'll reuse the my-published endpoint and find the specific ride/booking
      const res = await api.get("/published-rides/my-published");
      if (res.data.success) {
        const ride = res.data.data.find(r => r._id === rideId);
        if (!ride) {
          setError("Ride not found or no longer available.");
          return;
        }
        const booking = ride.bookings.find(b => b._id === bookingId);
        if (!booking) {
          setError("Booking request not found.");
          return;
        }
        setData({ ride, booking });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load request details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [rideId, bookingId]);

  const handleRespond = async (action) => {
    setResponding(true);
    try {
      await api.patch(`/published-rides/${rideId}/bookings/${bookingId}/respond`, { action });
      if (action === "confirm") {
        // Stay on page to show confirmed state or navigate to active rides?
        // Let's navigate to active rides or back to dashboard
        navigate("/driver/dashboard/active-rides");
      } else {
        navigate("/driver/dashboard/bookings");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="mesh-bg min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Loader2 size={48} className="text-primary animate-spin mb-4" />
        <h2 className="text-xl font-black">Analyzing Request...</h2>
        <p className="text-sm text-(--text-dim)">Fetching route and passenger data</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mesh-bg min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 p-4 rounded-full mb-6">
          <AlertCircle size={48} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black mb-2">Request Unavailable</h2>
        <p className="text-sm text-(--text-dim) mb-8 max-w-xs">{error || "The link might have expired or the ride was cancelled."}</p>
        <button onClick={() => navigate("/driver/dashboard")} className="px-8 py-3 bg-primary text-black font-bold rounded-xl active:scale-95 transition-all">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { ride, booking } = data;
  const isPending = booking.status === "pending";

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-(--bg-main) text-(--text-main)">
      
      {/* Heavy-duty Header (Mobile Optimized) */}
      <header className="absolute top-0 left-0 right-0 z-[1001] p-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="w-12 h-12 rounded-2xl bg-black border border-white/20 text-white flex items-center justify-center hover:scale-105 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="hidden sm:flex bg-black px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl">
            <h1 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Incoming Request</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-black/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl transition-all hover:bg-black">
                <ThemeToggle />
            </div>
            <div className={`px-4 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-widest shadow-2xl backdrop-blur-xl ${booking.status === 'pending' ? 'bg-amber-500 text-white border-amber-400' : 'bg-emerald-500 text-white border-emerald-400'}`}>
                {booking.status}
            </div>
        </div>
      </header>

      {/* Map View - Dominant Area */}
      <div className="h-[42vh] w-full relative">
        <Suspense fallback={<div className="h-full w-full bg-slate-900 border-indigo-500 animate-pulse" />}>
            <RideMap 
              pickup={{ 
                lat: booking.passengerSource?.location?.coordinates[1], 
                lng: booking.passengerSource?.location?.coordinates[0], 
                name: booking.passengerSource?.address 
              }}
              dropoff={{ 
                lat: booking.passengerDestination?.location?.coordinates[1], 
                lng: booking.passengerDestination?.location?.coordinates[0], 
                name: booking.passengerDestination?.address 
              }}
              userLocation={{ lat: 23.0225, lng: 72.5714 }} // Simulated driver start point
              driverVehicleType={ride.vehicleType} // SHOW DRIVER AS VEHICLE PHOTO
              allRoutes={ride.routeCoords?.length ? [{
                id: ride._id,
                coords: ride.routeCoords.map(c => [c[1], c[0]]),
                color: "#6366f1",
                label: "Planned Route"
              }] : []}
              availableRides={[]}
              selectedRouteIdx={0}
              isNavigating={false} 
           />
        </Suspense>
        
        {/* Earnings overlay pinned to map bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
            <div className="glass-card rounded-2xl p-3 flex items-center justify-between border-(--card-border) shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-(--text-dim) uppercase">Distance</span>
                    <span className="text-sm font-black text-primary">{booking.distanceKm} km</span>
                </div>
                <div className="h-6 w-[1px] bg-(--card-border)" />
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-(--text-dim) uppercase">Final Fare</span>
                    <span className="text-sm font-black text-emerald-500">₹{booking.amountPaid}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Action Drawer - Now Scrollable and Non-Overlapping */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="glass-card rounded-[2rem] p-6 border-(--card-border) shadow-2xl backdrop-blur-2xl">
        
        {/* Passenger Info */}
        <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                {booking.passenger?.profileImage 
                    ? <img src={booking.passenger.profileImage} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }} />
                    : <div className="text-xl font-black text-primary drop-shadow-sm">{booking.passenger?.name?.[0]?.toUpperCase() || 'P'}</div>
                }
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black leading-tight truncate">{booking.passenger?.name || "Passenger"}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-[9px] font-bold py-0.5 px-2 rounded-md bg-(--bg-main) text-(--text-dim) border border-(--card-border) whitespace-nowrap">
                        <Clock size={10} /> {booking.passenger?.passengerStats?.averageRating?.toFixed(1) || "0.0"} Rating
                    </span>
                </div>
            </div>
            
            <div className="flex gap-2 flex-shrink-0">
                <button className="p-3 rounded-xl bg-(--bg-main) border border-(--card-border) text-(--text-dim) hover:text-primary transition-colors active:scale-90">
                    <MessageSquare size={18} />
                </button>
                <a 
                  href={`tel:${booking.passenger?.Mobile_no}`}
                  className="p-3 rounded-xl bg-(--bg-main) border border-(--card-border) text-(--text-dim) hover:text-emerald-500 transition-colors active:scale-90"
                >
                    <Phone size={18} />
                </a>
            </div>
        </div>

        {/* Route Details */}
        <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
                <div className="mt-1 flex flex-col items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <div className="w-[1px] h-6 bg-gradient-to-b from-emerald-500 to-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </div>
                <div className="flex-1 space-y-4">
                    <div>
                        <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-tighter mb-0.5">Pickup Location</p>
                        <p className="text-sm font-bold leading-tight">{booking.passengerSource?.address || "Source"}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-tighter mb-0.5">Drop-off Location</p>
                        <p className="text-sm font-bold leading-tight">{booking.passengerDestination?.address || "Destination"}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        {isPending ? (
          <div className="flex gap-4">
            <button 
              onClick={() => handleRespond("reject")}
              disabled={responding}
              className="flex-1 py-4 px-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-sm hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              Decline Request
            </button>
            <button 
              onClick={() => handleRespond("confirm")}
              disabled={responding}
              className="flex-1 py-4 px-6 rounded-2xl bg-primary text-black font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {responding ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Accept Ride</>}
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate("/driver/dashboard/active-rides")}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Navigation size={18} /> Go to Active Rides
          </button>
        )}
      </div>
    </div>
  </div>
);
};

export default RideRequestDetailsPage;
