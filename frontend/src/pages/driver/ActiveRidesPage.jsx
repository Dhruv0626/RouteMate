import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "../../context/DialogContext";
import api from "../../services/api";
import {
  ArrowLeft, MapPin, Navigation, Clock, Phone, Star, 
  AlertCircle, CheckCircle, ChevronRight, Map, Zap, 
  MessageCircle, Eye, MoreVertical, TrendingUp, IndianRupee, 
  Fuel, Activity, AlertTriangle, Loader2
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const ActiveRidesPage = () => {
  const navigate = useNavigate();
  const { showConfirm, showAlert } = useDialog();
  const [activeRides, setActiveRides] = useState([]);
  const [driverOnline, setDriverOnline] = useState(false);
  const [rideStats, setRideStats] = useState({
    activeRides: 0,
    totalEarningsToday: 0,
    completedRides: 0,
    averageRating: 0,
    onlineHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedRide, setExpandedRide] = useState(null);
  const [showNavigation, setShowNavigation] = useState(false);

  const handleCancel = async (rideId) => {
    const confirmed = await showConfirm("Are you sure you want to cancel this ride?", "Cancel Ride", "warning", "Yes, Cancel");
    if (!confirmed) return;
    try {
      await api.patch(`/published-rides/${rideId}/status`, { status: "cancelled" });
      window.location.reload();
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed to cancel ride", "Action Failed", "error");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ridesRes, profileRes] = await Promise.all([
            api.get("/rides/active-trips"),
            api.get("/driver-profiles/my-profile")
        ]);

        if (ridesRes.data.success) {
            setActiveRides(ridesRes.data.data || []);
            setRideStats(prev => ({
                ...prev,
                activeRides: ridesRes.data.stats.activeCount || 0,
                completedRides: ridesRes.data.stats.todayRides || 0,
                totalEarningsToday: ridesRes.data.stats.todayEarnings || 0,
                averageRating: ridesRes.data.stats.averageRating?.toFixed(1) || "0.0",
                onlineHours: ridesRes.data.stats.onlineHours || 0
            }));
        }

        if (profileRes.data.success) {
            setDriverOnline(profileRes.data.data.isOnline);
        }
      } catch (err) {
        console.error("Fetch Active Rides/Profile Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "ongoing":
        return "bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300";
      case "matched":
        return "bg-amber-100/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300";
      case "arrived":
        return "bg-violet-100/50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300";
      case "completed":
        return "bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300";
      default:
        return "bg-black/5 dark:bg-white/5 border-(--card-border) text-(--text-dim)";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "ongoing":
        return <Activity className="w-4 h-4" />;
      case "matched":
        return <Clock className="w-4 h-4" />;
      case "arrived":
        return <MapPin className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "ongoing":
        return "Ride Ongoing";
      case "matched":
        return "Heading to Pickup";
      case "arrived":
        return "At Pickup Point";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const calculateProgress = (elapsed, total) => {
    return (elapsed / total) * 100;
  };

  return (
    <div className="min-h-screen bg-(--bg-main) pb-20 transition-colors duration-500">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-(--card-bg) border-b border-(--card-border) backdrop-blur-md transition-all duration-500">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-(--text-main)">
                Active Rides
              </h1>
              <p className="text-sm text-(--text-dim)">
                Real-time trip details & navigation
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-(--text-main)">
                {rideStats.activeRides}
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              Active Rides
            </p>
          </div>

          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold text-(--text-main)">
                {rideStats.completedRides}
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              Completed Today
            </p>
          </div>

          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <IndianRupee className="w-5 h-5 text-violet-500" />
              <span className="text-2xl font-bold text-(--text-main)">
                ₹{rideStats.totalEarningsToday}
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              Today's Earnings
            </p>
          </div>

          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-(--text-main)">
                {rideStats.averageRating}
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              Avg Rating
            </p>
          </div>

          <div className="bg-(--card-bg) rounded-xl p-6 border border-(--card-border) transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-(--text-main)">
                {rideStats.onlineHours}h
              </span>
            </div>
            <p className="text-sm text-(--text-dim)">
              Online Hours
            </p>
          </div>
        </div>
        {/* Active Rides List or Empty State */}
        {loading ? (
             <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
                 <Loader2 className="w-12 h-12 text-primary animate-spin opacity-40" />
                 <p className="text-sm font-bold text-(--text-dim) animate-pulse">Scanning Rides......</p>
             </div>
        ) : activeRides.length > 0 ? (
          <div className="space-y-6">
            {activeRides.map((ride) => (
              <div
                key={ride._id}
                className="bg-(--card-bg) rounded-xl border border-(--card-border) overflow-hidden shadow-sm hover:shadow-md transition-all duration-500"
              >
                {/* Ride Summary */}
                <div
                  onClick={() =>
                    setExpandedRide(expandedRide === ride._id ? null : ride._id)
                  }
                  className="p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            ride.phase
                          )}`}
                        >
                          {getStatusIcon(ride.phase)}
                          {getStatusLabel(ride.phase)}
                        </span>
                        <span className="text-[10px] px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-semibold uppercase">
                          {(ride.vehicleTypeRequested || ride.publishedRide?.vehicleType || "PRIME").toUpperCase()}
                        </span>
                      </div>

                      {/* Passenger Info */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                           {ride.passenger?.profileImage ? <img src={ride.passenger.profileImage} alt="" className="w-full h-full object-cover" /> : (ride.passenger?.name?.[0] || 'P')}
                        </div>
                        <div>
                          <p className="font-semibold text-(--text-main)">
                            {ride.passenger?.name || "Passenger"}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-xs text-(--text-dim)">
                              {ride.passenger?.passengerStats?.averageRating?.toFixed(1) || "5.0"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Route Info */}
                      <div className="flex gap-4 mb-6 relative">
                        <div className="flex flex-col items-center flex-shrink-0 py-1">
                          <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <div className="flex-1 w-[1px] border-l-2 border-dashed border-gray-300 dark:border-gray-600 my-1"></div>
                          <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
                        </div>
                        <div className="flex flex-col justify-between py-1 flex-1 min-h-[5rem]">
                          <div>
                            <p className="text-sm font-bold text-(--text-main) line-clamp-2 leading-tight">
                              {ride.source?.address}
                            </p>
                            <p className="text-[10px] text-(--text-dim) font-black tracking-tighter uppercase mt-0.5">Pickup Location</p>
                          </div>
                          <div className="mt-4">
                            <p className="text-sm font-bold text-(--text-main) line-clamp-2 leading-tight">
                              {ride.destination?.address}
                            </p>
                            <p className="text-[10px] text-(--text-dim) font-black tracking-tighter uppercase mt-0.5">Dropoff Destination</p>
                          </div>
                        </div>
                      </div>

                      {/* Progress & Stats (Simplified for real data) */}
                      <div className="grid grid-cols-2 gap-4 border-t border-(--card-border) pt-4">
                        <div>
                          <p className="text-[10px] uppercase font-black text-(--text-dim) tracking-tighter">Distance Estimate</p>
                          <p className="font-black text-sm text-(--text-main)">{ride.distanceEstimate || "?"} km</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-black text-(--text-dim) tracking-tighter">Trip Fare</p>
                          <p className="font-black text-lg text-emerald-500">₹{ride.fare?.total}</p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-6 h-6 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedRide === ride._id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRide === ride._id && (
                  <div className="border-t border-(--card-border) p-6 bg-black/5 dark:bg-white/5 space-y-6">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => navigate(`/pickup-map/${ride.publishedRide?._id || ride.publishedRide || ride._id}`)}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-400 hover:bg-amber-500 text-black rounded-lg font-bold transition"
                      >
                        <Navigation className="w-5 h-5" />
                        Pickup Point
                      </button>
                      <a 
                        href={`tel:${ride.passenger?.Mobile_no}`}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition"
                      >
                        <Phone className="w-5 h-5" />
                        Call
                      </a>
                    </div>

                    {/* Control Buttons based on Phase */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {(ride.phase === "matched" || ride.phase === "arrived") && (
                        <>
                          <button 
                            onClick={() => navigate(`/start-ride/${ride.publishedRide?._id || ride.publishedRide || ride._id}`)}
                            className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition"
                          >
                            {ride.phase === "arrived" ? "Enter OTP & Start" : "Start Ride"}
                          </button>
                          <button 
                            onClick={() => handleCancel(ride._id)}
                            className="flex-1 py-3 px-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg font-bold transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {ride.phase === "ongoing" && (
                        <>
                          <button 
                            onClick={() => navigate(`/start-ride/${ride.publishedRide || ride._id}`)}
                            className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition flex justify-center items-center gap-2"
                          >
                            <Navigation size={18} /> Live Map
                          </button>
                          <button className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition">
                            Emergency
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-(--card-bg) rounded-2xl p-16 text-center border border-(--card-border) shadow-xl shadow-black/10 transition-all duration-500">
            <div className={`w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center transition-all duration-1000 ${driverOnline ? 'bg-emerald-500/10' : 'bg-gray-500/10'}`}>
               <Activity className={`w-12 h-12 ${driverOnline ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
            </div>
            <h3 className="text-2xl font-black text-(--text-main) mb-3">
              {driverOnline ? "Waiting for Rides" : "No Active Rides"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-sm leading-relaxed mb-10 font-bold">
              {driverOnline 
                ? "The system is actively searching for requests along your routes. Keep the app open to receive instant alerts."
                : "You don't have any active rides at the moment. Go online to start accepting ride requests."
              }
            </p>
            {!driverOnline && (
              <button 
                onClick={() => navigate("/driver/dashboard/go-online")}
                className="px-10 py-4 bg-primary text-black font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 mx-auto"
              >
                <Zap size={20} fill="currentColor" /> Go Online
              </button>
            )}
            {driverOnline && (
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-xs font-black uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Live on Network
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveRidesPage;