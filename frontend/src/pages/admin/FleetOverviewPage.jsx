import { useState, useEffect } from "react";
import {
  Car, MapPin, Search, Filter, RefreshCw, ChevronLeft,
  Navigation, Zap, Shield, AlertCircle, Circle, MoreVertical,
  ArrowRightLeft, Gauge, Battery, Map, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Loader from "../../components/ui/Loader";
import FleetMap from "../../components/map/FleetMap";
import api from "../../services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_STATUSES = {
  active:   { label: "On Trip",  color: "text-emerald-500", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
  idle:     { label: "Idle",     color: "text-primary",     bg: "bg-primary/10",     dot: "bg-primary" },
  offline:  { label: "Offline",  color: "text-(--text-dim)", bg: "bg-black/5",        dot: "bg-slate-500" },
  maint:    { label: "Warning",  color: "text-rose-500",    bg: "bg-rose-500/10",    dot: "bg-rose-500" }
};

const FleetOverviewPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // "list" or "map"

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/driver-profiles/admin/all-drivers");
      if (data.success && data.data) {
        // Map backend driverProfile to the format expected by the fleet UI
        const mapped = data.data.map(d => ({
          id: d._id,
          driver: d.user?.name || "Unknown",
          type: d.vehicle?.type || "Sedan",
          plate: d.vehicle?.number || "—",
          status: d.isOnline ? "active" : "offline", // Simplified mapping for now
          fuel: d.isOnline ? "High" : "N/A",
          area: d.isOnline ? "Live Area" : "Offline",
          trips: d.stats?.totalRides || 0,
          lat: d.currentLocation?.coordinates?.[1] || 23.0338,
          lng: d.currentLocation?.coordinates?.[0] || 72.5850,
        }));
        setVehicles(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch fleet", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filtered = vehicles.filter(v => {
    const matchSearch = v.driver.toLowerCase().includes(search.toLowerCase()) || 
                       v.id.toLowerCase().includes(search.toLowerCase()) ||
                       v.plate.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || v.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    total:   vehicles.length,
    active:  vehicles.filter(v => v.status === "active").length,
    idle:    vehicles.filter(v => v.status === "idle").length,
    warning: vehicles.filter(v => v.status === "maint").length,
  };

  if (loading) return <Loader fullPage text="Scanning fleet transponders..." />;

  return (
    <div className="mesh-bg min-h-screen relative font-sans text-(--text-main)">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="p-2 hover:bg-(--card-bg) rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-display font-black tracking-tight leading-none">Fleet Overview</h1>
              <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-widest">Real-time Vehicle Status</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
               className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
                 viewMode === "map" 
                 ? "bg-rose-500 text-white shadow-rose-500/20" 
                 : "bg-primary text-black shadow-primary/20"
               } hover:scale-105`}
             >
               {viewMode === "map" ? <ArrowRightLeft size={14} /> : <Map size={14} />} 
               {viewMode === "map" ? "Show List" : "Live View"}
             </button>
            <ThemeToggle />
            <div className="h-8 w-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-black text-sm">
              {currentUser?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8 relative z-10">
        
        {/* ── Summary Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
           <div className="glass-card p-5 rounded-3xl border border-(--card-border) flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Car size={24} /></div>
              <div>
                <p className="text-3xl font-black">{counts.total}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-(--text-dim)">Total Fleet</p>
              </div>
           </div>
           <div className="glass-card p-5 rounded-3xl border border-emerald-500/20 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Navigation size={24} className="animate-pulse" /></div>
              <div>
                <p className="text-3xl font-black text-emerald-400">{counts.active}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-(--text-dim)">In Service</p>
              </div>
           </div>
           <div className="glass-card p-5 rounded-3xl border border-violet-500/20 flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400"><Clock size={24} /></div>
              <div>
                <p className="text-3xl font-black text-violet-400">{counts.idle}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-(--text-dim)">Available</p>
              </div>
           </div>
           <div className="glass-card p-5 rounded-3xl border border-rose-500/20 flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500"><AlertCircle size={24} /></div>
              <div>
                <p className="text-3xl font-black text-rose-400">{counts.warning}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-(--text-dim)">Attention</p>
              </div>
           </div>
        </section>

        {/* ── Toolbar ── */}
        <section className="glass-card rounded-3xl p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim) group-focus-within:text-primary transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by ID, Driver or Plate..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/20 border border-(--card-border) rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-primary/50 text-sm font-medium transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-(--text-dim)" />
            <div className="flex rounded-2xl border border-(--card-border) overflow-hidden">
              {["all","active","idle","maint"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === f
                      ? "bg-primary text-black"
                      : "text-(--text-dim) hover:text-(--text-main) hover:bg-(--card-bg)"
                  }`}
                >
                  {f === "active" ? "On Trip" : f === "maint" ? "Health" : f}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Vehicle Table / Map ── */}
        <section className="glass-card rounded-4xl overflow-hidden shadow-xl border border-(--card-border)">
          {viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/5 dark:bg-black/20 border-b border-(--card-border)">
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-(--text-dim) uppercase">Vehicle & Driver</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-(--text-dim) uppercase">Type</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-(--text-dim) uppercase">Current Zone</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-(--text-dim) uppercase">Fuel/Charge</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-(--text-dim) uppercase">Status</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black tracking-widest text-(--text-dim) uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--card-border)">
                  {filtered.map(v => {
                    const s = VEHICLE_STATUSES[v.status];
                    return (
                      <tr key={v.id} className="group hover:bg-white/5 transition-all duration-300">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center font-black text-xs`}>
                              {v.type.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-(--text-main)">{v.driver}</p>
                              <p className="text-[10px] font-bold text-(--text-dim) uppercase tracking-tighter">{v.id} · {v.plate}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-0.5 rounded-full bg-black/10 border border-(--card-border) text-[9px] font-black text-(--text-dim) uppercase tracking-widest">
                             {v.type}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-1.5 text-xs font-bold text-(--text-main)">
                              <MapPin size={12} className="text-primary" /> {v.area}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="w-32 flex items-center gap-3">
                             <div className="flex-1 h-1.5 bg-(--card-border) rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${parseInt(v.fuel) < 20 ? 'bg-rose-500' : 'bg-primary'}`} style={{ width: v.fuel }} />
                             </div>
                             <span className="text-[10px] font-black text-(--text-main)">{v.fuel}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${s.color}`}>
                             <Circle size={6} fill="currentColor" /> {s.label}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button className="p-2.5 rounded-xl border border-(--card-border) hover:bg-primary hover:text-black transition-all">
                             <ArrowRightLeft size={16} />
                           </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[600px] w-full p-4">
               <FleetMap vehicles={filtered} />
            </div>
          )}
        </section>


      </main>

      <footer className="mx-auto max-w-7xl py-10 px-6 border-t border-(--card-border) flex justify-between items-center opacity-50">
        <p className="text-[10px] font-bold tracking-widest uppercase">RouteMate Telemetry System</p>
        <p className="text-[10px] font-bold tracking-widest uppercase">Encryption Active · TLS 1.3</p>
      </footer>
    </div>
  );
};

export default FleetOverviewPage;
