import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
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
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../components/ui/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { exportRideHistoryToCSV } from "../utils/exportUtils";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || "passenger";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedRide, setExpandedRide] = useState(null);
  const [dateRange, setDateRange] = useState("all");

  // Mock ride history data (Combined for both roles)
  const rideHistory = role === "driver" ? [
    {
      id: 1,
      name: "Sarah M.",
      photo: "👩",
      rating: 5,
      review: "Amazing driver, very professional!",
      pickup: "Downtown Station, Main St",
      dropoff: "International Airport Terminal 2",
      distance: 28.5,
      duration: 45,
      amount: 420,
      baseFare: 25,
      distanceFare: 280,
      timeFare: 115,
      surge: 0,
      status: "completed",
      date: "Today, 2:30 PM",
      rideType: "Premium",
      paymentMethod: "Online",
      notes: "Customer was very friendly",
    },
    {
      id: 2,
      name: "John D.",
      photo: "👨",
      rating: 4,
      review: "Good ride, took a different route",
      pickup: "Shopping Mall, 5th Ave",
      dropoff: "Central Park",
      distance: 12.5,
      duration: 22,
      amount: 230,
      baseFare: 15,
      distanceFare: 119,
      timeFare: 96,
      surge: 0,
      status: "completed",
      date: "Today, 12:15 PM",
      rideType: "Standard",
      paymentMethod: "Card",
      notes: "Passenger had luggage",
    },
    {
      id: 5,
      name: "Alex K.",
      photo: "👨",
      rating: null,
      review: null,
      pickup: "Business District",
      dropoff: "Conference Hall",
      distance: 15.3,
      duration: 28,
      amount: 0,
      baseFare: 0,
      distanceFare: 0,
      timeFare: 0,
      surge: 0,
      status: "cancelled",
      date: "2 days ago, 3:45 PM",
      rideType: "Standard",
      paymentMethod: "Online",
      notes: "Customer cancelled after 5 minutes",
      cancelReason: "Passenger cancelled",
    }
  ] : [
    {
      id: 1,
      name: "Ravi Kumar",
      photo: "🧔",
      rating: 4.9,
      pickup: "Maninagar Cross Roads",
      dropoff: "Iskon Temple",
      distance: 11.2,
      duration: 22,
      amount: 185,
      baseFare: 30,
      distanceFare: 112,
      timeFare: 43,
      status: "completed",
      date: "Today, 3:14 PM",
      rideType: "Standard",
      paymentMethod: "Online",
      myRating: 5,
      myReview: "Very smooth ride, driver was polite.",
    },
    {
      id: 3,
      name: "Suresh P.",
      photo: "👨‍🦱",
      rating: 4.5,
      pickup: "Science City Road",
      dropoff: "Railway Station",
      distance: 14.6,
      duration: 30,
      amount: 260,
      baseFare: 30,
      distanceFare: 146,
      timeFare: 84,
      status: "cancelled",
      date: "7 Mar, 11:30 AM",
      rideType: "Premium",
      paymentMethod: "Online",
      myRating: null,
      myReview: null,
      cancelReason: "Driver cancelled the ride",
      refundStatus: "Refund Processed",
    }
  ];

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

  const filteredRides = rideHistory.filter((ride) => {
    const matchesStatus = activeFilter === "all" || ride.status === activeFilter;
    const matchesSearch =
      ride.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.pickup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropoff.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Simple date filter logic for mock data
    const matchesDate = dateRange === "all" || ride.date.toLowerCase().includes(dateRange);
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  const stats = {
    totalRides: rideHistory.filter((r) => r.status === "completed").length,
    totalAmount: rideHistory
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.amount, 0),
    averageRating: (
      rideHistory
        .filter((r) => (role === "driver" ? r.rating : r.myRating) !== null)
        .reduce((sum, r) => sum + (role === "driver" ? r.rating : r.myRating), 0) /
      rideHistory.filter((r) => (role === "driver" ? r.rating : r.myRating) !== null).length || 0
    ).toFixed(1),
    cancelledRides: rideHistory.filter((r) => r.status === "cancelled").length,
  };

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

  const handleExport = () => {
    const filename = `${role}_ride_history_${new Date().toISOString().split("T")[0]}.csv`;
    exportRideHistoryToCSV(filteredRides, filename);
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
            <button
              onClick={handleExport}
              className="rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-2 text-sm font-semibold text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5 flex items-center gap-2"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
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
              <DollarSign size={18} className={role === "driver" ? "text-emerald-500" : "text-violet-500"} />
            </div>
            <p className={`text-2xl font-black ${role === "driver" ? "text-emerald-500" : "text-violet-500"}`}>
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
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
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
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
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
          {filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <button
                key={ride.id}
                onClick={() => setExpandedRide(expandedRide === ride.id ? null : ride.id)}
                className="glass-card group w-full rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg border border-(--card-border) overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-4xl flex-shrink-0">{ride.photo}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-(--text-main)">{ride.name}</h3>
                        {(role === "driver" ? ride.rating : ride.rating) && (
                          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">
                              {role === "driver" ? ride.rating : ride.rating}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 mb-2">
                        <div className="flex items-start gap-2 text-sm text-(--text-dim)">
                          <MapPin size={14} className={`flex-shrink-0 mt-0.5 ${role === "passenger" ? "text-emerald-500" : ""}`} />
                          <span>{ride.pickup}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-(--text-dim)">
                          <ArrowLeft size={14} className={`flex-shrink-0 mt-0.5 rotate-90 ${role === "passenger" ? "text-red-500" : ""}`} />
                          <span>{ride.dropoff}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="flex items-center gap-1 text-(--text-dim)">
                          <Clock size={12} />{ride.date}
                        </span>
                        <span className={`flex items-center gap-1 font-semibold ${role === "driver" ? "text-emerald-500" : "text-violet-500"}`}>
                          <DollarSign size={12} />₹{ride.amount}
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

                    {ride.status === "completed" && (
                      <div className="bg-(--card-bg) rounded-xl p-4 space-y-2">
                        <h4 className="font-semibold text-(--text-main) mb-3 flex items-center gap-2">
                          <DollarSign size={16} className={role === "driver" ? "text-emerald-500" : "text-violet-500"} />
                          {role === "driver" ? "Earnings Breakdown" : "Fare Breakdown"}
                        </h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-(--text-dim)">Base Fare</span>
                          <span className="font-semibold text-(--text-main)">₹{ride.baseFare}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-(--text-dim)">Distance ({ride.distance} km)</span>
                          <span className="font-semibold text-(--text-main)">₹{ride.distanceFare}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-(--text-dim)">Time ({ride.duration} min)</span>
                          <span className="font-semibold text-(--text-main)">₹{ride.timeFare}</span>
                        </div>
                        {role === "driver" && ride.surge > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-(--text-dim)">Surge</span>
                            <span className="font-semibold text-red-500">+₹{ride.surge}</span>
                          </div>
                        )}
                        <div className="border-t border-(--card-border) pt-2 flex justify-between">
                          <span className="font-bold text-(--text-main)">Total</span>
                          <span className={`font-black text-lg ${role === "driver" ? "text-emerald-500" : "text-violet-500"}`}>
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

                    {role === "passenger" && ride.status === "completed" && (
                      <div className="flex gap-3 flex-wrap">
                        <button className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-black transition-all">
                          <RefreshCw size={14} />
                          Book Again
                        </button>
                        <button className="flex items-center gap-2 rounded-xl bg-(--card-bg) border border-(--card-border) px-4 py-2 text-xs font-bold text-(--text-dim) hover:text-(--text-main) transition-all">
                          <Headphones size={14} />
                          Support
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))
          ) : (
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
          )}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;
