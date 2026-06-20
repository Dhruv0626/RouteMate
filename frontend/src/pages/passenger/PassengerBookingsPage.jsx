import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Users, IndianRupee, Car, Navigation, RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useNotifications } from "../../context/NotificationContext";
import api from "../../services/api";
import  Loader from "../../components/ui/Loader";

const PassengerBookingsPage = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [rides, setRides] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const res = await api.get("/published-rides/my-booked");
      if (res.data.success) {
        setRides(res.data.data || []);
      } else {
        setRides([]);
      }
    } catch (err) {
      console.error(err);
      if (rides === null) setRides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRides(); }, [unreadCount]);

  // Removed full-page loader to enable instant skeleton rendering

  return (
    <div className="mesh-bg min-h-screen pb-16 font-sans text-(--text-main) transition-colors duration-500">
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/passenger/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) hover:text-(--text-main) transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">My Upcomming Rides</h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">Track your bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRides} disabled={loading}
              className="p-2 rounded-lg border border-(--card-border) bg-(--card-bg) text-(--text-dim) hover:text-(--text-main) transition-all">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-5">

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-5">
            {[1, 2, 3].map((key) => (
              <div key={key} className="rounded-2xl border border-(--card-border) bg-(--card-bg) overflow-hidden p-5 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-2 w-12 bg-(--card-border) rounded" />
                    <div className="h-5 w-32 bg-(--card-border) rounded" />
                  </div>
                  <div className="h-6 w-20 bg-(--card-border) rounded-full" />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-(--card-border)" />
                    <div className="h-3 w-3/4 bg-(--card-border) rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-(--card-border)" />
                    <div className="h-3 w-1/2 bg-(--card-border) rounded" />
                  </div>
                </div>
                <div className="flex gap-4 mb-4">
                  <div className="h-4 w-28 bg-(--card-border) rounded" />
                  <div className="h-4 w-16 bg-(--card-border) rounded" />
                </div>
                <div className="h-10 w-full bg-(--card-border) rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!loading && rides !== null && rides.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-(--text-dim)">
            <Car size={48} className="opacity-20" />
            <p className="font-bold text-(--text-main)">No booked rides yet</p>
            <button onClick={() => navigate("/passenger/dashboard/ride")}
              className="mt-2 px-5 py-2.5 bg-primary text-black font-bold rounded-xl text-sm hover:scale-105 transition-all">
              Find a Ride
            </button>
          </div>
        )}

        {(() => {
          if (loading || rides === null) return null;
          
          // Flatten all passenger bookings with their associated rides
          const bookingsList = [];
          rides.forEach(ride => {
            if (ride.myBookings) {
              ride.myBookings.forEach(booking => {
                bookingsList.push({ ride, booking });
              });
            }
          });

          // Sort: Active (confirmed/pending) first, then by booking time descending
          bookingsList.sort((a, b) => {
            const aActive = a.booking.status === "confirmed" || a.booking.status === "pending";
            const bActive = b.booking.status === "confirmed" || b.booking.status === "pending";
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            return new Date(b.booking.bookedAt || b.ride.createdAt) - new Date(a.booking.bookedAt || a.ride.createdAt);
          });

          if (bookingsList.length === 0) {
            return (
              <div className="flex flex-col items-center gap-3 py-20 text-(--text-dim)">
                <Car size={48} className="opacity-20" />
                <p className="font-bold text-(--text-main)">No booked rides yet</p>
                <button onClick={() => navigate("/passenger/dashboard/ride")}
                  className="mt-2 px-5 py-2.5 bg-primary text-black font-bold rounded-xl text-sm hover:scale-105 transition-all">
                  Find a Ride
                </button>
              </div>
            );
          }

          return bookingsList.map(({ ride, booking: myBooking }) => {
            const isConfirmed = myBooking.status === "confirmed";

            return (
              <div key={myBooking._id} className="rounded-2xl border border-(--card-border) bg-(--card-bg) overflow-hidden p-5">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">Driver</p>
                     <p className="font-bold text-(--text-main) text-lg">{ride.driver?.name}</p>
                   </div>
                   <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                     ride.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20'
                     : ride.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                     : isConfirmed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                     : myBooking.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                     : 'bg-red-500/10 text-red-500 border-red-500/20'
                   }`}>
                     {ride.status === 'cancelled' ? 'CANCELLED' 
                      : ride.status === 'completed' ? 'COMPLETED' 
                      : myBooking.status.toUpperCase()}
                   </span>
                 </div>

                 <div className="space-y-2 mb-4 min-w-0">
                    <div className="flex items-start gap-2 text-sm min-w-0">
                      <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="truncate block">{myBooking.passengerSource?.address || ride.source.address}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm min-w-0">
                      <MapPin size={16} className="text-rose-500 shrink-0 mt-0.5" />
                      <span className="truncate block">{myBooking.passengerDestination?.address || ride.destination.address}</span>
                    </div>
                 </div>

                 <div className="flex flex-wrap gap-4 mb-4 text-xs">
                   <span className="flex items-center gap-1 font-bold text-(--text-dim)">
                     <Clock size={14} className="shrink-0" /> <span className="truncate">Booked: {new Date(myBooking.bookedAt || ride.createdAt).toLocaleString("en-IN", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}</span>
                   </span>
                   <span className="flex items-center font-bold text-var(-text) shrink-0">
                     <IndianRupee size={14} /> {myBooking.amountPaid}
                   </span>
                 </div>

                 {/* ── Ride Status Action ── */}
                 {isConfirmed && (
                   <div className="mt-2 flex flex-col gap-2">
                     {/* Status-aware banner */}
                     <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                       ride.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                       : ride.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                       : ride.status === 'arrived' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                       : ride.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                       : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                     }`}>
                       {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                           <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                             ride.status === 'arrived' ? 'bg-violet-500'
                             : ride.status === 'active' ? 'bg-emerald-500'
                             : 'bg-amber-500'
                           }`} />
                       )}
                       {ride.status === 'completed' ? '✅ Ride completed'
                        : ride.status === 'cancelled' ? '❌ Ride cancelled'
                        : ride.status === 'arrived' ? '🎯 Driver has arrived — share your OTP to start'
                        : ride.status === 'active' ? '🚀 Ride in progress'
                        : '🚗 Driver is heading to your pickup'}
                     </div>

                     {/* Action buttons */}
                     {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                         <div className="flex gap-2">
                           <button
                             onClick={() => navigate(`/passenger/live-tracking/${ride._id}`)}
                             className="flex-1 py-3 bg-primary text-black font-black rounded-xl hover:scale-105 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                           >
                             <Navigation size={16} /> Track Driver Live
                           </button>
                           {ride.driver?.Mobile_no && (
                             <a href={`tel:${ride.driver.Mobile_no}`}
                               className="py-3 px-4 bg-emerald-500 text-white font-black rounded-xl hover:scale-105 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                             >
                               <Car size={16} />
                             </a>
                           )}
                         </div>
                     )}
                   </div>
                 )}
              </div>
            );
          });
        })()}
      </main>
    </div>
  );
};

export default PassengerBookingsPage;
