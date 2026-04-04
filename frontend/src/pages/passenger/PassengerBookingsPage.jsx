import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Users, IndianRupee, Car, Navigation, RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import api from "../../services/api";

const PassengerBookingsPage = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const res = await api.get("/published-rides/my-booked");
      if (res.data.success) {
        setRides(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRides(); }, []);

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
        {loading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 size={36} className="text-primary animate-spin" />
          </div>
        )}

        {!loading && rides.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-(--text-dim)">
            <Car size={48} className="opacity-20" />
            <p className="font-bold text-(--text-main)">No booked rides yet</p>
            <button onClick={() => navigate("/passenger/dashboard/find-rides")}
              className="mt-2 px-5 py-2.5 bg-primary text-black font-bold rounded-xl text-sm hover:scale-105 transition-all">
              Find a Ride
            </button>
          </div>
        )}

        {!loading && rides.map((ride) => {
          const myBooking = ride.myBookings?.[0]; // Assume first one for simplicity
          if (!myBooking) return null;

          const dep = new Date(ride.departureTime);
          const isConfirmed = myBooking.status === "confirmed";

          return (
            <div key={myBooking._id} className="rounded-2xl border border-(--card-border) bg-(--card-bg) overflow-hidden p-5">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">Driver</p>
                   <p className="font-bold text-(--text-main) text-lg">{ride.driver?.name}</p>
                 </div>
                 <span className={`px-3 py-1 text-xs font-bold rounded-full border ${isConfirmed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : myBooking.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                   {myBooking.status.toUpperCase()}
                 </span>
               </div>

               <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-emerald-500" />
                    <span>{myBooking.passengerSource?.address || ride.source.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-rose-500" />
                    <span>{myBooking.passengerDestination?.address || ride.destination.address}</span>
                  </div>
               </div>

               <div className="flex gap-4 mb-4 text-xs">
                 <span className="flex items-center gap-1 font-semibold text-(--text-dim)">
                   <Clock size={14} /> {dep.toLocaleString("en-IN", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                 </span>
                 <span className="flex items-center gap-1 font-semibold text-primary">
                   <IndianRupee size={14} /> ₹{myBooking.amountPaid}
                 </span>
               </div>

               {(isConfirmed || ride.status === 'active') && (
                 <button onClick={() => navigate(`/live-tracking/${ride._id}`)} 
                   className="w-full py-3 bg-primary text-black font-black rounded-xl hover:scale-105 transition-all text-sm flex items-center justify-center gap-2">
                   <Navigation size={18} /> Live Track Ride
                 </button>
               )}
            </div>
          )
        })}
      </main>
    </div>
  );
};

export default PassengerBookingsPage;
