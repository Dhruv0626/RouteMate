import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  IndianRupee,
  Star,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Navigation,
  Download,
  RefreshCw,
  Headphones,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../components/ui/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { exportRideHistoryToCSV, exportRideHistoryToPDF } from "../utils/exportUtils";
import { getPassengerHistory, getDriverHistory } from "../services/rideService";
import { useEffect } from "react";
import { categoryLabels } from "../utils/vehicles";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || "passenger";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedRide, setExpandedRide] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [rideHistory, setRideHistory] = useState(null);
  const [stats, setStats] = useState({
    totalRides: 0,
    totalAmount: 0,
    averageRating: "0.0",
    cancelledRides: 0
  });
  const [loading, setLoading] = useState(true);

  // ─── Fetch Real History from Database ───────────────────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const fetchFn = role === "driver" ? getDriverHistory : getPassengerHistory;
        const response = await fetchFn({ limit: 50, phase: activeFilter });
        
        if (response.data.success) {
          const { rides, stats: serverStats } = response.data.data;
          
          // Map backend Trip schema to frontend UI expectations
          const formattedRides = rides.map((ride) => {
            const distance = ride.distanceActual || ride.distanceEstimate || 0;
            let duration = ride.durationActual || ride.durationEstimate || 0;
            if (duration === 0 && distance > 0) {
               duration = Math.round(distance * 2.5);
            }
            
            const totalAmount = ride.fare?.totalWithTax || ride.fare?.total || 0;
            let baseFare = Math.round(ride.fare?.baseFare || 0);
            let distanceFare = Math.round(ride.fare?.distanceFare || 0);
            let timeFare = Math.round(ride.fare?.timeFare || 0);
            let nightFare = Math.round(ride.fare?.nightFare || 0);
            
            if (totalAmount > 0 && baseFare === 0 && distanceFare === 0) {
                // If breakdown is missing (old rides), use a better heuristic based on current rates
                const ratePerKm = ride.vehicleTypeRequested?.includes("GO") ? 12 : 10;
                const ratePerMin = ride.vehicleTypeRequested?.includes("GO") ? 1.2 : 0.8;
                baseFare = ride.vehicleTypeRequested?.includes("GO") ? 32 : 25;
                
                distanceFare = Math.round(distance * ratePerKm * 10) / 10;
                timeFare = Math.round(duration * ratePerMin * 10) / 10;
                
                // If the sum exceeds total, scale it down, otherwise the rest is surge
                const currentSum = baseFare + distanceFare + timeFare;
                if (currentSum > totalAmount) {
                    const ratio = totalAmount / currentSum;
                    baseFare = Math.floor(baseFare * ratio);
                    distanceFare = Math.round(distanceFare * ratio * 10) / 10;
                    timeFare = Math.round(timeFare * ratio * 10) / 10;
                }
            }

            return {
              id: ride._id,
              name: role === "driver" ? (ride.passenger?.name || "Passenger") : (ride.driver?.name || "Searching..."),
              photo: role === "driver" 
                ? (ride.passenger?.profileImage || "👤") 
                : (ride.driver?.profileImage || "🚕"),
              vehicleIcon: categoryLabels[ride.vehicleTypeRequested]?.image || "/images/cars/go.png",
              rating: role === "driver" ? (ride.rating?.passengerToDriver || 0.0) : (ride.rating?.driverToPassenger || 0.0), 
              pickup: ride.source?.address || "Unknown Location",
              dropoff: ride.destination?.address || "Unknown Location",
              publishedPickup: ride.publishedRide?.source?.address || null,
              publishedDropoff: ride.publishedRide?.destination?.address || null,
              distance: distance,
              duration: duration,
              amount: totalAmount,
              baseFare: baseFare,
              distanceFare: distanceFare,
              timeFare: timeFare,
              nightFare: nightFare,
              surge: ride.fare?.surgeFare || 0,
              status: ride.phase, // 'searching', 'matched', 'ongoing', 'completed', 'cancelled'
              date: new Date(ride.createdAt).toLocaleString('en-IN', { 
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
              }),
              rideType: ride.vehicleTypeRequested || "",
              co2Saved: ride.fare?.co2Saved || 0,
              paymentMethod: ride.paymentMethod?.toUpperCase() || "CASH",
              cancelReason: ride.cancellationReason,
              timestamp: new Date(ride.createdAt).getTime(),
              surgeMultiplier: ride.surgeMultiplier || 1.0,
              surgeAmount: Math.max(0, totalAmount - (baseFare + distanceFare + timeFare + nightFare))
            };
          });

          setRideHistory(formattedRides);
          
          setStats({
            totalRides: serverStats.totalRides,
            totalAmount: role === "driver" ? serverStats.totalEarnings : serverStats.totalSpent,
            averageRating: serverStats.averageRating || serverStats.avgRating || "0.0",
            cancelledRides: serverStats.cancelledRides || formattedRides.filter(r => r.status === 'cancelled').length
          });
        }
      } catch (err) {
        console.error("Failed to load ride history:", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchHistory();
  }, [user, role, activeFilter]);

  const filters = [
    { id: "all", label: "All Rides", icon: Navigation },
    { id: "completed", label: "Completed", icon: CheckCircle },
    { id: "cancelled", label: "Cancelled", icon: XCircle },
  ];

  const dateFilters = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
  ];

  const filteredRides = (rideHistory || []).filter((ride) => {
    const matchesStatus = activeFilter === "all" || ride.status === activeFilter;
    const matchesSearch =
      ride.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropoff.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = (() => {
      if (dateRange === "all") return true;
      const rideDate = new Date(ride.timestamp);
      const now = new Date();
      if (dateRange === "today") {
        return rideDate.toDateString() === now.toDateString();
      }
      if (dateRange === "week") {
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        return rideDate >= lastWeek;
      }
      if (dateRange === "month") {
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        return rideDate >= lastMonth;
      }
      return true;
    })();
    
    return matchesStatus && matchesSearch && matchesDate;
  });

    // Stats were previously derived from mock data here, now provided by API/State
  ;

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
      case "cancelled":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} />;
      case "cancelled":
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const handleExport = (format) => {
    const filename = `${role}_ride_history_${new Date().toISOString().split("T")[0]}.${format}`;
    if (format === 'csv') {
      exportRideHistoryToCSV(filteredRides, filename);
    } else {
      exportRideHistoryToPDF(filteredRides, filename);
    }
  };

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main) hover:border-primary/40"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">
                {role === "driver" ? "Ride History" : "My Trips"}
              </h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                {role === "driver" ? "Your past rides" : "Your ride history"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(prev => !prev)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-black transition-all hover:scale-105 shadow-md shadow-primary/10 flex items-center gap-2"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
              
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-40 origin-top-right rounded-xl border border-(--card-border) bg-(--bg-main) p-1.5 shadow-xl z-50 animate-in zoom-in-95 duration-150">
                    <button
                      onClick={() => { handleExport('pdf'); setShowExportMenu(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-(--text-dim) hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={() => { handleExport('csv'); setShowExportMenu(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-(--text-dim) hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                    >
                      Download CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                {role === "driver" ? "Total Rides" : "Total Trips"}
              </h3>
              <Navigation size={18} className="text-primary" />
            </div>
            <p className="text-2xl font-black text-(--text-main)">{stats.totalRides}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                {role === "driver" ? "Total Earnings" : "Total Spent"}
              </h3>
              <IndianRupee size={18} className={role === "driver" || role === "passenger" ? "text-emerald-500" : "text-violet-500"} />
            </div>
            <p className={`text-2xl font-black ${role === "driver" || role === "passenger" ? "text-emerald-500" : "text-violet-500"}`}>
              ₹{stats.totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                {role === "driver" ? "Avg Rating" : "Avg Rating Given"}
              </h3>
              <Star size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-500">{stats.averageRating}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">Cancelled</h3>
              <AlertCircle size={18} className="text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-500">{stats.cancelledRides}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-(--text-dim)" />
            <input
              type="text"
              placeholder={`Search by ${role === "driver" ? "passenger" : "driver"} name, pickup, or dropoff...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-(--card-bg) border border-(--card-border) rounded-2xl pl-12 pr-4 py-3 text-(--text-main) placeholder:text-(--text-dim) focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-2 pb-2">
            {filters.map((filter) => {
              const FilterIcon = filter.icon;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    activeFilter === filter.id
                      ? "bg-primary text-black shadow-lg shadow-primary/30"
                      : "bg-(--card-bg) text-(--text-dim) border border-(--card-border) hover:border-primary"
                  }`}
                >
                  <FilterIcon size={16} />
                  {filter.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 pb-2">
            {dateFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setDateRange(filter.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  dateRange === filter.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-(--card-bg) text-(--text-dim) border border-(--card-border) hover:border-(--text-main)"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rides List */}
        <div className="space-y-3">
          {loading && rideHistory === null ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <RefreshCw size={36} className="text-primary animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-(--text-dim) animate-pulse">Loading History...</p>
            </div>
          ) : filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <button
                key={ride.id}
                onClick={() => setExpandedRide(expandedRide === ride.id ? null : ride.id)}
                className="glass-card group w-full rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg border border-(--card-border) overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0">
                      {ride.photo && (ride.photo.startsWith('http') || ride.photo.startsWith('/') || ride.photo.startsWith('data:image')) ? (
                         <img src={ride.photo} alt={ride.name} className="w-12 h-12 rounded-xl object-cover border border-(--card-border)" />
                      ) : (role === "passenger" && ride.photo === "🚕") ? (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                          <img src={ride.vehicleIcon} alt={ride.rideType} className="w-8 h-8 object-contain" />
                        </div>
                      ) : (
                        <div className="text-4xl">{ride.photo}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1 mb-1">
                          <h3 className="font-display font-bold text-(--text-main)">{ride.name}</h3>
                          <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest flex items-center gap-1">
                             <ChevronRight size={10} className="opacity-40" />
                          </p>
                        </div>
                      <div className="flex gap-4 mb-4 relative">
                        <div className="flex flex-col items-center flex-shrink-0 py-1">
                          <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                          <div className="flex-1 w-[1px] border-l-2 border-dashed border-gray-300 dark:border-gray-600 my-1"></div>
                          <MapPin size={16} className="text-red-500 flex-shrink-0" />
                        </div>
                        <div className="flex flex-col justify-between py-1 flex-1 min-h-[4.5rem]">
                          <div>
                            <p className="text-sm font-bold text-(--text-main) line-clamp-2 leading-tight">
                              {ride.pickup}
                            </p>
                          </div>
                          <div className="mt-4">
                            <p className="text-sm font-bold text-(--text-main) line-clamp-2 leading-tight">
                              {ride.dropoff}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="flex items-center gap-1 text-(--text-dim)">
                          <Clock size={12} />{ride.date}
                        </span>
                        <span className={`flex items-center gap-1 font-semibold ${role === "driver" || role === "passenger" ? "text-emerald-500" : "text-violet-500"}`}>
                          <IndianRupee size={12} />₹{Math.round(ride.amount)}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full font-semibold ${getStatusColor(ride.status)}`}>
                          {getStatusIcon(ride.status)}
                          {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <ChevronRight
                      size={20}
                      className={`text-(--text-dim) transition-transform duration-300 ${expandedRide === ride.id ? "rotate-90" : ""}`}
                    />
                  </div>
                </div>

                {expandedRide === ride.id && (
                  <div className="border-t border-(--card-border) pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider mb-1">Distance</p>
                        <p className="font-black text-(--text-main)">{ride.distance} km</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider mb-1">Duration</p>
                        <p className="font-black text-(--text-main)">{ride.duration} min</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider mb-1">Ride Type</p>
                        <p className="font-black text-(--text-main)">{ride.rideType}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider mb-1">Payment</p>
                        <p className="font-black text-(--text-main)">{ride.paymentMethod}</p>
                      </div>
                    </div>

                    {role !== "passenger" && (ride.publishedPickup || ride.publishedDropoff) && (
                      <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4 border border-(--card-border) mt-4">
                        <h4 className="font-bold text-[11px] uppercase tracking-wider text-(--text-dim) mb-3 flex items-center gap-2">
                           <Navigation size={14} className="text-primary" />
                           {role === "driver" ? "Your Published Route" : "Driver's Published Route"}
                        </h4>
                        <div className="flex flex-col gap-3">
                           <div className="flex items-start gap-3">
                              <MapPin size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm font-semibold text-(--text-main) line-clamp-2 leading-tight">
                                <span className="block text-[10px] font-black text-(--text-dim) tracking-wider uppercase mb-0.5">Published Source</span>
                                {ride.publishedPickup || "—"}
                              </p>
                           </div>
                           <div className="flex items-start gap-3">
                              <MapPin size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm font-semibold text-(--text-main) line-clamp-2 leading-tight">
                                <span className="block text-[10px] font-black text-(--text-dim) tracking-wider uppercase mb-0.5">Published Destination</span>
                                {ride.publishedDropoff || "—"}
                              </p>
                           </div>
                        </div>
                      </div>
                    )}

                    {ride.status === "completed" && (
                      <div className="bg-(--card-bg) rounded-xl p-4 space-y-2">
                        <h4 className="font-semibold text-(--text-main) mb-3 flex items-center gap-2">
                          <IndianRupee size={16} className={role === "driver" || role === "passenger" ? "text-emerald-500" : "text-violet-500"} />
                          {role === "driver" ? "Final Earnings Breakdown" : "Final Fare Breakdown"}
                        </h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-(--text-dim)">Base Fare</span>
                          <span className="font-semibold text-(--text-main)">₹{ride.baseFare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-(--text-dim)">Distance ({ride.distance} km)</span>
                          <span className="font-semibold text-(--text-main)">₹{ride.distanceFare.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-(--text-dim)">Time ({ride.duration} min)</span>
                          <span className="font-semibold text-(--text-main)">₹{ride.timeFare.toFixed(2)}</span>
                        </div>
                        
                        {ride.nightFare > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-indigo-400 font-medium">Night Charge (10AM - 6PM)</span>
                            <span className="font-semibold text-indigo-400">₹{ride.nightFare.toFixed(2)}</span>
                          </div>
                        )}
                        
                        {ride.surgeAmount > 0 && (
                          <div className="flex justify-between items-center py-2 px-3 bg-amber-500/10 rounded-xl border border-amber-500/20 my-3">
                             <div className="flex flex-col">
                                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                                    <TrendingUp size={14} className="text-amber-500" /> Surge Charge
                                </span>
                                <span className="text-[10px] text-amber-500/70 font-black uppercase tracking-[0.1em] pl-5">Demand Multiplier: x{ride.surgeMultiplier.toFixed(2)}</span>
                             </div>
                             <span className="font-black text-lg text-amber-600 dark:text-amber-400">₹{ride.surgeAmount.toFixed(2)}</span>
                          </div>
                        )}

                        {ride.co2Saved > 0 && (
                          <div className="flex justify-between text-sm py-2 px-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 my-2">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                                <Zap size={12} className="fill-emerald-500" /> Environment Benefit
                            </span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">{ride.co2Saved}kg CO2 Saved</span>
                          </div>
                        )}
                        <div className="border-t border-(--card-border) pt-2 flex justify-between">
                          <span className="font-bold text-(--text-main)">Total</span>
                          <span className={`font-black text-lg ${role === "driver" || role === "passenger" ? "text-emerald-500" : "text-violet-500"}`}>
                            ₹{ride.amount}
                          </span>
                        </div>
                      </div>
                    )}

                    {(role === "driver" ? ride.review : ride.myReview) && (
                      <div className="bg-(--card-bg) rounded-xl p-4">
                        <h4 className="font-semibold text-(--text-main) mb-3 flex items-center gap-2">
                          <Star size={16} className="text-amber-500" />
                          {role === "driver" ? "Passenger Review" : "Your Review"}
                        </h4>
                        {role === "passenger" && ride.myRating && (
                          <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={16}
                                className={s <= ride.myRating ? "text-amber-400 fill-amber-400" : "text-(--text-dim)"}
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-(--text-dim) leading-relaxed">
                          "{role === "driver" ? ride.review : ride.myReview}"
                        </p>
                      </div>
                    )}

                    {ride.status === "cancelled" && ride.cancelReason && (
                      <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800">
                        <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-2">
                          <AlertCircle size={16} />
                          Cancellation Reason
                        </h4>
                        <p className="text-sm text-red-600 dark:text-red-400">{ride.cancelReason}</p>
                        {role === "passenger" && ride.refundStatus && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-semibold">
                            ✓ {ride.refundStatus}
                          </p>
                        )}
                      </div>
                    )}

                    {role === "driver" && ride.notes && (
                      <div className="bg-(--card-bg) rounded-xl p-4 border border-(--card-border)">
                        <h4 className="font-semibold text-(--text-main) mb-2 text-sm">Notes</h4>
                        <p className="text-xs text-(--text-dim)">{ride.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))
          ) : !loading && rideHistory !== null ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-(--card-border)">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Navigation size={32} className="text-primary" />
                </div>
              </div>
              <h3 className="font-display mb-2 text-lg font-bold text-(--text-main)">No rides found</h3>
              <p className="text-(--text-dim) text-sm">
                {searchQuery ? "Try adjusting your search terms" : "No rides in this category yet"}
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;
