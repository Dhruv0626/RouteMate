import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "../../context/DialogContext";
import api from "../../services/api";
import {
  ArrowLeft, MapPin, Navigation, Clock, Phone, Star, 
  AlertCircle, CheckCircle, ChevronRight, Map, Zap, 
  MessageCircle, Eye, MoreVertical, TrendingUp, IndianRupee, 
  Fuel, Activity, AlertTriangle, Loader2, X, Send
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import socket from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/ui/Loader";

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
  const { user } = useAuth();

  // Late departure state
  const [lateRide, setLateRide] = useState(null); // The ride object that is late
  const [lateAlert, setLateAlert] = useState(null); // { zone, lateMinutes }
  const [showLateModal, setShowLateModal] = useState(false);
  const [submittingReason, setSubmittingReason] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [customNewTime, setCustomNewTime] = useState("");

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
            const rides = ridesRes.data.data || [];
            setActiveRides(rides);
            
            // Check if any ride is currently in a late zone needing action
            const lateOne = rides.find(r => r.publishedRide?.lateZone >= 2 && !r.publishedRide?.lateReason);
            if (lateOne) {
              setLateRide(lateOne);
              setLateAlert({ zone: lateOne.publishedRide.lateZone, lateMinutes: lateOne.publishedRide.lateMinutes });
              setShowLateModal(true);
            }

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

    // Socket Listeners
    socket.connect();
    if (user?.id) socket.emit("join", user.id);

    socket.on("ride_late_update", (data) => {
      console.log("DRIVER LATE UPDATE:", data);
      // data: { rideId, zone, lateMinutes, canCancel, urgent }
      setLateAlert(data);
      if (data.zone >= 2) {
        // Find the ride in our list
        const rideObj = activeRides.find(r => (r.publishedRide?._id || r.publishedRide || r._id) === data.rideId);
        if (rideObj) setLateRide(rideObj);
        setShowLateModal(true);
      } else {
        showAlert(`You are ${data.lateMinutes} min late for a ride. Please depart soon!`, "Late Departure", "warning");
      }
    });

    socket.on("ride_auto_cancelled", (data) => {
      showAlert("Ride automatically cancelled due to 30+ minute delay.", "Ride Cancelled", "error");
      setTimeout(() => window.location.reload(), 2000);
    });

    return () => {
      socket.off("ride_late_update");
      socket.off("ride_auto_cancelled");
    };
  }, [user?.id, activeRides.length]);

  const handleSubmitLateReason = async () => {
    if (!lateReason) return showAlert("Please select a reason", "Required", "warning");
    const rideId = lateRide.publishedRide?._id || lateRide.publishedRide || lateRide._id;
    
    setSubmittingReason(true);
    try {
      await api.post(`/published-rides/${rideId}/late-reason`, {
        reason: lateReason,
        newDepartureTime: customNewTime || undefined
      });
      setShowLateModal(false);
      showAlert("Reason submitted. Passengers have been notified.", "Success", "success");
      setLateReason("");
      setCustomNewTime("");
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed to submit reason", "Error", "error");
    } finally {
      setSubmittingReason(false);
    }
  };

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

  // Removed full-page loader to enable instant skeleton rendering

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
        </div>
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((key) => (
              <div key={key} className="bg-(--card-bg) rounded-xl border border-(--card-border) p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-24 h-6 bg-(--card-border) rounded-full" />
                  <div className="w-16 h-6 bg-(--card-border) rounded-full" />
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-full bg-(--card-border)" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-(--card-border) rounded" />
                    <div className="h-3 w-16 bg-(--card-border) rounded" />
                  </div>
                </div>
                <div className="flex gap-4 mb-6">
                  <div className="flex flex-col items-center flex-shrink-0 py-1">
                    <div className="w-5 h-5 rounded-full bg-(--card-border)" />
                    <div className="h-8 w-[2px] bg-(--card-border) my-1" />
                    <div className="w-5 h-5 rounded-full bg-(--card-border)" />
                  </div>
                  <div className="flex-1 space-y-8 py-1">
                    <div className="h-4 w-3/4 bg-(--card-border) rounded" />
                    <div className="h-4 w-3/4 bg-(--card-border) rounded" />
                  </div>
                </div>
                <div className="h-20 bg-(--card-border) rounded-xl" />
              </div>
            ))}
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

                      {/* Progress & Stats */}
                      <div className="space-y-4 border-t border-(--card-border) pt-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-black text-(--text-dim) tracking-tighter">Distance Estimate</p>
                            <p className="font-black text-sm text-(--text-main)">{ride.distanceEstimate || "?"} km</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-black text-(--text-dim) tracking-tighter">Trip Fare</p>
                            <p className="font-black text-lg text-emerald-500">₹{ride.fare?.total}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-(--card-border)">
                          <div>
                            <p className="text-[10px] uppercase font-black text-(--text-dim) tracking-tighter flex items-center gap-1">
                              <Clock size={10} /> Scheduled
                            </p>
                            <p className="font-bold text-sm text-(--text-main)">
                               {new Date(ride.publishedRide?.departureTime || ride.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-black text-(--text-dim) tracking-tighter">Lateness</p>
                            <p className={`font-black text-sm flex items-center justify-end gap-1 ${ride.publishedRide?.lateMinutes > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                              {ride.publishedRide?.lateMinutes > 0 ? (
                                <><AlertTriangle size={12} /> +{ride.publishedRide.lateMinutes} min</>
                              ) : (
                                <><CheckCircle size={12} /> On Time</>
                              )}
                            </p>
                          </div>
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
                        onClick={() => {
                          const id = ride.publishedRide?._id || ride.publishedRide || ride._id;
                          const idStr = typeof id === 'object' ? id._id : id;
                          navigate(`/pickup-map/${idStr}`);
                        }}
                        disabled={ride.phase === "ongoing"}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed text-black rounded-lg font-bold transition"
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
                            onClick={() => {
                              const id = ride.publishedRide?._id || ride.publishedRide || ride._id;
                              const idStr = typeof id === 'object' ? id._id : id;
                              navigate(`/start-ride/${idStr}`);
                            }}
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
                            onClick={() => {
                              const id = ride.publishedRide?._id || ride.publishedRide || ride._id;
                              const idStr = typeof id === 'object' ? id._id : id;
                              navigate(`/start-ride/${idStr}`);
                            }}
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

      {/* ── Late Departure Modal (Zone 2+) ── */}
      {showLateModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-(--card-bg) border border-red-500/30 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto no-scrollbar">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-(--text-main)">Action Required: Late Departure</h3>
              <p className="text-sm text-(--text-dim) mt-2 leading-relaxed">
                You are <span className="text-red-500 font-bold">{lateAlert?.lateMinutes || "??"} minutes</span> late. 
                Per policy, you must provide a reason to keep the ride active.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-[10px] font-black uppercase text-(--text-dim) tracking-widest px-1">Select Reason</p>
              {[
                { id: "traffic", label: "🚗 Heavy Traffic", color: "hover:border-blue-500/50" },
                { id: "vehicle_issue", label: "🔧 Vehicle Issue", color: "hover:border-amber-500/50" },
                { id: "personal", label: "👤 Personal Reason", color: "hover:border-purple-500/50" },
                { id: "other", label: "🕐 New Departure Time", color: "hover:border-emerald-500/50" }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setLateReason(opt.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    lateReason === opt.id 
                      ? "bg-primary/10 border-primary text-primary" 
                      : `bg-black/5 dark:bg-white/5 border-(--card-border) text-(--text-main) ${opt.color}`
                  }`}
                >
                  <span className="font-bold text-sm">{opt.label}</span>
                  {lateReason === opt.id && <CheckCircle size={18} />}
                </button>
              ))}
            </div>

            {lateReason === "other" && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-black uppercase text-(--text-dim) tracking-widest mb-2 px-1">Estimate New Departure</p>
                <input 
                  type="time"
                  value={customNewTime}
                  onChange={(e) => setCustomNewTime(e.target.value)}
                  className="w-full p-4 rounded-xl border border-(--card-border) bg-black/5 dark:bg-white/5 text-(--text-main) font-bold focus:outline-none focus:border-primary/50"
                />
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-[10px] text-amber-500 font-bold leading-relaxed">
                ⚠️ {lateAlert?.zone === 3 ? "FINAL WARNING: Auto-cancel in 5 min. Trust Score -1 applied." : "Passengers are being notified. Frequent delays may affect your rating."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSubmitLateReason}
                disabled={submittingReason || !lateReason}
                className="w-full py-4 bg-primary text-black font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingReason ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                Submit Reason
              </button>
              
              <button
                onClick={() => {
                  const id = lateRide.publishedRide?._id || lateRide.publishedRide || lateRide._id;
                  handleCancel(id);
                  setShowLateModal(false);
                }}
                className="w-full py-3 text-red-500 font-bold hover:bg-red-500/5 rounded-xl transition-all text-sm"
              >
                Unable to Pickup? Cancel Ride
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveRidesPage;