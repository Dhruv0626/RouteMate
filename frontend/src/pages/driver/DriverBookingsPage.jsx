import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, MapPin,
  Users, IndianRupee, Car, Navigation, AlertCircle,
  RefreshCw, Lock, Share2, Loader2, Trash2,
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useDialog } from "../../context/DialogContext";
import api from "../../services/api";

const statusColors = {
  pending:   "bg-amber-500/10 text-amber-500 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

const DriverBookingsPage = () => {
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState({}); // { bookingId: true }

  const fetchRides = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/published-rides/my-published");
      if (res.data.success) setRides(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load your rides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRides(); }, []);

  const handleRespond = async (rideId, bookingId, action) => {
    setResponding((prev) => ({ ...prev, [bookingId]: true }));
    try {
      await api.patch(`/published-rides/${rideId}/bookings/${bookingId}/respond`, { action });
      fetchRides(); // refresh
    } catch (err) {
      showAlert(err.response?.data?.message || "Action failed. Please try again.", "Request Error", "error");
    } finally {
      setResponding((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  // All bookings flattened for a summary count
  const allBookings = rides.flatMap((r) => r.bookings || []);
  const pendingCount = allBookings.filter((b) => b.status === "pending").length;

  return (
    <div className="mesh-bg min-h-screen pb-16 font-sans text-(--text-main) transition-colors duration-500">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/driver/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) hover:text-(--text-main) hover:border-primary/40 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">Booking Requests</h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                Manage your published rides
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-black text-xs font-black px-2.5 py-1 rounded-full">
                {pendingCount} pending
              </span>
            )}
            <button onClick={() => navigate("/driver/dashboard/manage-rides")}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 shadow-sm">
              <Trash2 size={13} /> Manage/Cancel Ride
            </button>
            <button onClick={fetchRides} disabled={loading}
              className="p-2 rounded-lg border border-(--card-border) bg-(--card-bg) text-(--text-dim) hover:text-(--text-main) transition-all disabled:opacity-50">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-5">

        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-sm text-(--text-dim)">Loading your rides...</p>
          </div>
        )}

        {!loading && rides.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-(--text-dim)">
            <Car size={48} className="opacity-20" />
            <p className="font-bold text-(--text-main)">No published rides</p>
            <p className="text-xs opacity-70">Go to "Go Online" to publish a ride first</p>
            <button onClick={() => navigate("/driver/go-online")}
              className="mt-2 px-5 py-2.5 bg-primary text-black font-bold rounded-xl text-sm hover:scale-105 transition-all">
              Publish a Ride
            </button>
          </div>
        )}

        {!loading && rides.map((ride) => {
          const dep = new Date(ride.departureTime);
          const pendingBookings   = (ride.bookings || []).filter(b => b.status === "pending");
          const confirmedBookings = (ride.bookings || []).filter(b => b.status === "confirmed");
          const cancelledBookings = (ride.bookings || []).filter(b => b.status === "cancelled");

          return (
            <div key={ride._id} className="rounded-2xl border border-(--card-border) bg-(--card-bg) overflow-hidden">
              {/* Ride header */}
              <div className="p-5 bg-gradient-to-r from-primary/5 to-transparent border-b border-(--card-border)">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500 to-rose-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-(--text-main) truncate">{ride.source.address}</p>
                      <p className="text-xs text-(--text-dim) mt-3 truncate">{ride.destination.address}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${ride.status === "open" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ride.status === "full" ? "bg-primary/10 text-primary border-primary/20" : "bg-(--bg-main) text-(--text-dim) border-(--card-border)"}`}>
                    {ride.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 bg-(--bg-main) border border-(--card-border) rounded-full px-3 py-1 font-semibold">
                    <Clock size={10} /> {dep.toLocaleDateString("en-IN", { day:"numeric", month:"short" })} · {dep.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                  </span>
                  {ride.vehicleType && (
                    <span className="flex items-center gap-1 bg-(--bg-main) border border-(--card-border) rounded-full px-3 py-1 font-semibold">
                      <Car size={10} /> {ride.vehicleType}
                    </span>
                  )}
                </div>

                {ride.status !== "completed" && ride.status !== "cancelled" && (
                  <div className="mt-3">
                    <button onClick={() => navigate(`/start-ride/${ride._id}`)} className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 font-bold rounded-xl text-xs hover:bg-primary/30 transition-all flex items-center gap-2">
                      <Navigation size={14} /> View Live Map & Controls
                    </button>
                  </div>
                )}
              </div>

              {/* Bookings */}
              {(ride.bookings || []).length === 0 ? (
                <div className="p-5 text-center text-(--text-dim)">
                  <p className="text-sm">No booking requests yet</p>
                  <p className="text-xs opacity-60 mt-1">Passengers will appear here once they book</p>
                </div>
              ) : (
                <div className="divide-y divide-(--card-border)">
                  {(ride.bookings || []).map((booking) => {
                    const isResponding = responding[booking._id];
                    const isPending = booking.status === "pending";
                    const distText = booking.distanceKm > 0 ? `${booking.distanceKm} km` : "—";

                    return (
                      <div key={booking._id} className="p-5 space-y-3">
                        {/* Passenger info row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-black text-sm text-primary shrink-0">
                              {booking.passenger?.profileImage
                                ? <img src={booking.passenger.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                                : (booking.passenger?.name?.[0] || "P")}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-(--text-main)">{booking.passenger?.name || "Passenger"}</p>
                              <p className="text-xs text-(--text-dim)">{booking.passenger?.Mobile_no || booking.passenger?.email || "—"}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColors[booking.status] || ""}`}>
                            {booking.status === "pending" ? "⏳ Pending" : booking.status === "confirmed" ? "✅ Confirmed" : "❌ Cancelled"}
                          </span>
                        </div>

                        {/* Booking details */}
                        <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
                          <div className="rounded-lg bg-(--bg-main) p-2.5">
                            <p className="text-[10px] text-(--text-dim) mb-0.5">Distance</p>
                            <p className="text-xs font-bold text-(--text-main)">{distText}</p>
                          </div>
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
                            <p className="text-[10px] text-(--text-dim) mb-0.5">Collect Cash</p>
                            <p className="text-sm font-black text-primary">₹{booking.amountPaid}</p>
                          </div>
                        </div>

                        {/* Passenger route */}
                        {(booking.passengerSource?.address || booking.passengerDestination?.address) && (
                          <div className="rounded-lg bg-(--bg-main) p-3 space-y-1.5">
                            <p className="text-[10px] font-bold text-(--text-dim) uppercase tracking-wider">Passenger Route</p>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                              <p className="text-xs text-(--text-main) leading-tight">{booking.passengerSource?.address || "—"}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                              <p className="text-xs text-(--text-main) leading-tight">{booking.passengerDestination?.address || "—"}</p>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        {isPending && (
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button
                                onClick={() => handleRespond(ride._id, booking._id, "confirm")}
                                disabled={isResponding}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50">
                                {isResponding ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Confirm
                                </button>
                                <button
                                onClick={() => handleRespond(ride._id, booking._id, "reject")}
                                disabled={isResponding}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl text-sm hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50">
                                {isResponding ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                Reject
                                </button>
                            </div>
                            <button
                                onClick={() => navigate(`/driver/dashboard/ride-request/${ride._id}/${booking._id}`)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary border border-primary/20 font-bold rounded-xl text-xs hover:bg-primary/20 transition-all">
                                <Navigation size={12} /> View Detailed Map & Request
                            </button>
                          </div>
                        )}

                        {booking.status === "confirmed" && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                            <p className="text-xs text-emerald-500 font-semibold">Confirmed — collect ₹{booking.amountPaid} in cash after the ride.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default DriverBookingsPage;
