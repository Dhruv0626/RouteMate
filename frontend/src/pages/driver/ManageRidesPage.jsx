import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Car,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Search,
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useDialog } from "../../context/DialogContext";
import { useNotifications } from "../../context/NotificationContext";
import api from "../../services/api";

const statusStyles = {
  open: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  booked: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  active: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  arrived: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  reached: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  completed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  expired: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const ManageRidesPage = () => {
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const { unreadCount } = useNotifications();
  
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active" | "history"
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all"); // "all" | "completed" | "cancelled"

  const fetchRides = async () => {
    setLoading(true);
    try {
      const res = await api.get("/published-rides/my-published");
      if (res.data.success) {
        setRides(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching published rides:", err);
      showAlert(
        err.response?.data?.message || "Could not retrieve your rides. Please try again.",
        "Error",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [unreadCount]);

  const openDeleteConfirmation = (ride) => {
    setSelectedRide(ride);
    setShowConfirmModal(true);
  };

  const handleDeleteRide = async () => {
    if (!selectedRide) return;
    const rideId = selectedRide._id;
    setDeletingId(rideId);
    setShowConfirmModal(false);
    
    try {
      const res = await api.delete(`/published-rides/${rideId}`);
      if (res.data.success) {
        showAlert(
          res.data.message || "Your ride has been successfully deleted/cancelled.",
          "Success",
          "success"
        );
        fetchRides();
      }
    } catch (err) {
      console.error("Error deleting published ride:", err);
      showAlert(
        err.response?.data?.message || "Failed to delete the ride. Please try again.",
        "Deletion Failed",
        "error"
      );
    } finally {
      setDeletingId(null);
      setSelectedRide(null);
    }
  };

  // Filter rides based on tab
  const activeRides = rides.filter(
    (r) => r.status !== "completed" && r.status !== "cancelled" && r.status !== "expired"
  );
  const historyRides = rides.filter((r) => {
    const isHistory = r.status === "completed" || r.status === "cancelled" || r.status === "expired";
    if (!isHistory) return false;
    
    if (historyStatusFilter === "all") return true;
    if (historyStatusFilter === "cancelled") return r.status === "cancelled" || r.status === "expired";
    return r.status === historyStatusFilter;
  });

  const displayRides = activeTab === "active" ? activeRides : historyRides;

  // Filter displayRides by search query and date range
  const filteredRides = displayRides.filter((ride) => {
    // Search query matches source, destination, or passenger name
    const matchesSearch =
      ride.source.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.destination.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ride.bookings || []).some((b) =>
        b.passenger?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Date range filter
    const matchesDate = (() => {
      if (dateRange === "all") return true;
      const rideDate = new Date(ride.departureTime);
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

    return matchesSearch && matchesDate;
  });

  // Calculate quick stats
  const totalPublished = rides.length;
  const activeCount = activeRides.length;
  const completedCount = rides.filter((r) => r.status === "completed").length;
  const cancelledCount = rides.filter((r) => r.status === "cancelled" || r.status === "expired").length;

  return (
    <div className="mesh-bg min-h-screen pb-16 font-sans text-(--text-main) transition-colors duration-500">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) hover:text-(--text-main) hover:border-primary/40 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">Manage Rides</h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                Cancel or delete your published rides
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRides}
              disabled={loading}
              className="p-2 rounded-lg border border-(--card-border) bg-(--card-bg) text-(--text-dim) hover:text-(--text-main) transition-all disabled:opacity-50"
              title="Refresh rides list"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4 border border-(--card-border) text-center">
            <p className="text-2xl font-black text-primary">{totalPublished}</p>
            <p className="text-[10px] font-bold text-(--text-dim) uppercase tracking-wider mt-1">Total Published</p>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-(--card-border) text-center">
            <p className="text-2xl font-black text-emerald-500">{activeCount}</p>
            <p className="text-[10px] font-bold text-(--text-dim) uppercase tracking-wider mt-1">Active / Open</p>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-(--card-border) text-center">
            <p className="text-2xl font-black text-blue-500">{completedCount}</p>
            <p className="text-[10px] font-bold text-(--text-dim) uppercase tracking-wider mt-1">Completed</p>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-(--card-border) text-center">
            <p className="text-2xl font-black text-rose-500">{cancelledCount}</p>
            <p className="text-[10px] font-bold text-(--text-dim) uppercase tracking-wider mt-1">Cancelled / Expired</p>
          </div>
        </section>

        {/* Tabs Bar */}
        <div className="flex border-b border-(--card-border)">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "active"
                ? "border-primary text-primary"
                : "border-transparent text-(--text-dim) hover:text-(--text-main)"
            }`}
          >
            Active Rides ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-(--text-dim) hover:text-(--text-main)"
            }`}
          >
            Ride History ({rides.filter(r => r.status === "completed" || r.status === "cancelled" || r.status === "expired").length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-(--text-dim)" />
            <input
              type="text"
              placeholder="Search by source, destination, or passenger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-(--card-bg) border border-(--card-border) rounded-2xl pl-12 pr-4 py-3 text-sm text-(--text-main) placeholder:text-(--text-dim) focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Sub status filters (Only shown in History Tab) */}
          {activeTab === "history" && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {[
                { id: "all", label: "All History" },
                { id: "completed", label: "Completed" },
                { id: "cancelled", label: "Cancelled / Expired" },
              ].map((subf) => (
                <button
                  key={subf.id}
                  onClick={() => setHistoryStatusFilter(subf.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold border transition-all ${
                    historyStatusFilter === subf.id
                      ? "bg-primary text-black border-primary shadow-sm"
                      : "bg-(--card-bg) text-(--text-dim) border-(--card-border) hover:border-(--text-main)"
                  }`}
                >
                  {subf.label}
                </button>
              ))}
            </div>
          )}

          {/* Date range filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
            ].map((dFilter) => (
              <button
                key={dFilter.id}
                onClick={() => setDateRange(dFilter.id)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold border transition-all ${
                  dateRange === dFilter.id
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-(--card-bg) text-(--text-dim) border-(--card-border) hover:border-(--text-main)"
                }`}
              >
                {dFilter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-sm text-(--text-dim)">Loading your rides...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredRides.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-(--text-dim) glass-card rounded-3xl border border-(--card-border) p-10">
            <Car size={48} className="opacity-20 animate-pulse text-primary" />
            <p className="font-bold text-(--text-main)">No rides found</p>
            <p className="text-xs opacity-70 text-center max-w-xs">
              {searchQuery || dateRange !== "all" || (activeTab === "history" && historyStatusFilter !== "all")
                ? "No rides match your current search or filters. Try adjusting them."
                : activeTab === "active"
                ? "You do not have any active or open rides published at the moment."
                : "Your completed and cancelled rides history will appear here."}
            </p>
            {activeTab === "active" && !searchQuery && dateRange === "all" && (
              <button
                onClick={() => navigate("/driver/go-online")}
                className="mt-4 px-6 py-2.5 bg-primary text-black font-bold rounded-xl text-sm hover:scale-105 transition-all shadow-lg shadow-primary/20"
              >
                Publish a New Ride
              </button>
            )}
          </div>
        )}

        {/* Rides List */}
        {!loading && filteredRides.length > 0 && (
          <div className="space-y-4">
            {filteredRides.map((ride) => {
              const dep = new Date(ride.departureTime);
              const bookings = ride.bookings || [];
              const activeBookings = bookings.filter(
                (b) => b.status === "confirmed" || b.status === "pending"
              );
              const isDeletable = ride.status !== "completed" && ride.status !== "cancelled";

              return (
                <div
                  key={ride._id}
                  className="glass-card rounded-2xl border border-(--card-border) overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* Ride Summary */}
                  <div className="p-5 bg-gradient-to-r from-primary/5 to-transparent border-b border-(--card-border)">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* Route Timeline */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500 to-rose-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-(--text-main) truncate">
                            {ride.source.address}
                          </p>
                          <p className="text-xs text-(--text-dim) mt-3 truncate">
                            {ride.destination.address}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`shrink-0 text-[10px] font-black tracking-wider px-3 py-1 rounded-full border uppercase ${
                          statusStyles[ride.status] || "bg-(--bg-main) border-(--card-border)"
                        }`}
                      >
                        {ride.status}
                      </span>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-(--card-border)/40 text-xs">
                      <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 bg-(--bg-main) border border-(--card-border) rounded-full px-3 py-1 font-semibold text-(--text-dim)">
                          <Clock size={11} className="text-primary" />
                          {dep.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          ·{" "}
                          {dep.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {ride.vehicleType && (
                          <span className="flex items-center gap-1 bg-(--bg-main) border border-(--card-border) rounded-full px-3 py-1 font-semibold text-(--text-dim)">
                            <Car size={11} className="text-emerald-500" />
                            {ride.vehicleType}
                          </span>
                        )}
                        <span className="flex items-center gap-1 bg-(--bg-main) border border-(--card-border) rounded-full px-3 py-1 font-semibold text-(--text-dim)">
                          <Users size={11} className="text-blue-500" />
                          {activeBookings.length} booking(s)
                        </span>
                      </div>

                      {/* Delete Button */}
                      {isDeletable && (
                        <button
                          onClick={() => openDeleteConfirmation(ride)}
                          disabled={deletingId === ride._id}
                          className="flex items-center gap-1 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 disabled:opacity-50 active:scale-95 shadow-sm"
                        >
                          {deletingId === ride._id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Delete Ride
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bookings Drawer */}
                  {bookings.length > 0 && (
                    <div className="p-4 bg-black/5 dark:bg-white/5 space-y-3">
                      <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-wider px-1">
                        Passengers Booking Status
                      </p>
                      <div className="grid gap-2">
                        {bookings.map((booking) => (
                          <div
                            key={booking._id}
                            className="flex items-center justify-between p-3 rounded-xl border border-(--card-border) bg-(--card-bg)/60 backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-black text-xs text-primary shrink-0">
                                {booking.passenger?.profileImage ? (
                                  <img
                                    src={booking.passenger.profileImage}
                                    alt=""
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  booking.passenger?.name?.[0] || "P"
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-(--text-main) truncate">
                                  {booking.passenger?.name || "Passenger"}
                                </p>

                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-primary">
                                ₹{booking.amountPaid}
                              </span>
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                  booking.status === "confirmed"
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : booking.status === "pending"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : "bg-red-500/10 text-red-500 border-red-500/20"
                                }`}
                              >
                                {booking.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedRide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md rounded-3xl border border-(--card-border) p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-display text-lg font-black text-(--text-main)">Delete published ride?</h3>
                <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">Please confirm this action</p>
              </div>
            </div>

            <div className="space-y-3 bg-(--bg-main) p-4 rounded-2xl border border-(--card-border)">
              <p className="text-xs text-(--text-dim) leading-relaxed">
                You are about to delete your published ride departing at{" "}
                <strong className="text-(--text-main)">
                  {new Date(selectedRide.departureTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>{" "}
                from <span className="text-(--text-main) font-semibold">{selectedRide.source.address.split(",")[0]}</span>.
              </p>

              {/* Warning condition based on bookings */}
              {selectedRide.bookings?.some((b) => b.status === "confirmed" || b.status === "pending") ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2 mt-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold text-red-500 leading-normal">
                    WARNING: This ride has active booking requests or confirmed passengers. Deleting this ride will cancel their bookings and notify them instantly.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-2 mt-2">
                  <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-semibold text-emerald-500 leading-normal">
                    This ride has no active bookings. It is completely safe to delete. No passengers will be affected.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedRide(null);
                }}
                className="flex-1 py-3 bg-(--card-bg) border border-(--card-border) text-(--text-main) font-bold rounded-xl text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95"
              >
                No, Keep It
              </button>
              <button
                onClick={handleDeleteRide}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl text-sm hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                Yes, Delete Ride
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRidesPage;
