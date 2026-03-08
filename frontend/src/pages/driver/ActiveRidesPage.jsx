import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Car, MapPin, Clock, Navigation, User, Star, Phone, ChevronLeft, Circle, AlertCircle } from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const DUMMY_RIDES = [
  {
    id: 1,
    passenger: "Riya Shah",
    pickup: "Maninagar Cross Roads",
    drop: "Iskon Temple, SG Highway",
    distance: "12.4 km",
    fare: "₹185",
    duration: "28 min",
    rating: 4.8,
    status: "ongoing",
  },
  {
    id: 2,
    passenger: "Arjun Mehta",
    pickup: "Bopal Square",
    drop: "Sardar Patel Stadium, Navrangpura",
    distance: "9.1 km",
    fare: "₹140",
    duration: "21 min",
    rating: 4.5,
    status: "requested",
  },
  {
    id: 3,
    passenger: "Kavita Patel",
    pickup: "Science City Road",
    drop: "Ahmedabad Railway Station",
    distance: "18.7 km",
    fare: "₹260",
    duration: "42 min",
    rating: 4.9,
    status: "requested",
  },
];

const ActiveRidesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rides, setRides] = useState(DUMMY_RIDES);
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = activeFilter === "all" ? rides : rides.filter(r => r.status === activeFilter);

  const handleAccept = (id) => {
    setRides(prev => prev.map(r => r.id === id ? { ...r, status: "ongoing" } : r));
  };

  const handleComplete = (id) => {
    setRides(prev => prev.filter(r => r.id !== id));
  };

  const statusColor = {
    ongoing: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    requested: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main)">
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/driver/dashboard")} className="rounded-xl p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all">
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">Active Rides</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Status Bar */}
        <div className="glass-card flex items-center justify-between rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Car size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-(--text-dim) uppercase tracking-widest">Driver Status</p>
              <p className="font-bold text-(--text-main)">Available</p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
            <Circle size={5} fill="currentColor" className="animate-pulse" /> Online
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {["all", "ongoing", "requested"].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`rounded-xl px-4 py-2 text-xs font-black tracking-widest uppercase transition-all ${activeFilter === f ? "bg-primary text-black" : "glass-card text-(--text-dim) hover:text-(--text-main)"}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Rides */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <AlertCircle size={40} className="mx-auto mb-4 text-(--text-dim) opacity-40" />
            <p className="font-black text-(--text-main)">No rides in this category</p>
            <p className="text-sm text-(--text-dim) mt-1">Ride requests will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(ride => (
              <div key={ride.id} className="glass-card rounded-3xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="from-primary to-primary-dark flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br font-black text-black text-sm">
                      {ride.passenger[0]}
                    </div>
                    <div>
                      <p className="font-black text-(--text-main)">{ride.passenger}</p>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={11} fill="currentColor" />
                        <span className="text-xs font-bold">{ride.rating}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase ${statusColor[ride.status]}`}>
                    {ride.status}
                  </span>
                </div>

                <div className="space-y-2 rounded-xl bg-black/5 p-3 dark:bg-black/20">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">Pickup</p>
                      <p className="text-sm font-bold text-(--text-main)">{ride.pickup}</p>
                    </div>
                  </div>
                  <div className="ml-1 border-l border-dashed border-(--card-border) h-3" />
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">Drop</p>
                      <p className="text-sm font-bold text-(--text-main)">{ride.drop}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[["Distance", ride.distance], ["Fare", ride.fare], ["ETA", ride.duration]].map(([label, val]) => (
                    <div key={label} className="rounded-xl border border-(--card-border) bg-(--card-bg) p-3 text-center">
                      <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">{label}</p>
                      <p className="font-black text-(--text-main)">{val}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  {ride.status === "requested" && (
                    <button onClick={() => handleAccept(ride.id)}
                      className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-xs font-black text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all">
                      Accept Ride
                    </button>
                  )}
                  {ride.status === "ongoing" && (
                    <button onClick={() => handleComplete(ride.id)}
                      className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-black text-black hover:opacity-90 transition-all">
                      Complete Ride
                    </button>
                  )}
                  <button className="rounded-xl border border-(--card-border) bg-(--card-bg) p-2.5 text-(--text-dim) hover:text-(--text-main) transition-all">
                    <Phone size={16} />
                  </button>
                  <button className="rounded-xl border border-(--card-border) bg-(--card-bg) p-2.5 text-(--text-dim) hover:text-(--text-main) transition-all">
                    <Navigation size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ActiveRidesPage;
