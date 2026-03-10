import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  ChevronLeft, Clock, Calendar, ArrowRight, Search, Filter, 
  MapPin, User, Car, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  DollarSign, Star, MoreVertical
} from "lucide-react";
import ThemeToggle from "../components/ui/ThemeToggle";
import Loader from "../components/ui/Loader";

// ─── Dummy Data Generators ─────────────────────────────────────────────────────

const PASSENGER_HISTORY = [
  { id: "RM-7841", from: "Maninagar Cross Roads", to: "Iskon Temple", date: "Today, 3:14 PM", amount: "₹185", status: "completed", driver: "Ravi Kumar", rating: 5 },
  { id: "RM-7839", from: "Bopal Square", to: "SP Stadium", date: "Yesterday, 1:02 PM", amount: "₹140", status: "completed", driver: "Arjun Mehta", rating: 4 },
  { id: "RM-7822", from: "Science City Road", to: "Railway Station", date: "7 Mar, 11:30 AM", amount: "₹260", status: "cancelled", driver: "Suresh P.", rating: null },
  { id: "RM-7815", from: "Satellite", to: "Prahlad Nagar", date: "6 Mar, 6:44 PM", amount: "₹110", status: "completed", driver: "Kiran R.", rating: 5 },
  { id: "RM-7801", from: "CEPT Uni", to: "Bodakdev", date: "5 Mar, 4:20 PM", amount: "₹95", status: "completed", driver: "Deepak S.", rating: 5 },
];

const DRIVER_HISTORY = [
  { id: "RM-7841", from: "Maninagar Cross Roads", to: "Iskon Temple", date: "Today, 3:14 PM", earned: "+₹185", status: "completed", passenger: "Riya Shah", rating: 5 },
  { id: "RM-7839", from: "Bopal Square", to: "SP Stadium", date: "Today, 1:02 PM", earned: "+₹140", status: "completed", passenger: "Arjun Mehta", rating: 4 },
  { id: "RM-7822", from: "Science City Road", to: "Railway Station", date: "Yesterday, 11:30 AM", earned: "₹0", status: "cancelled", passenger: "Kavita Patel", rating: null },
  { id: "RM-7815", from: "Satellite", to: "Prahlad Nagar", date: "Yesterday, 6:44 PM", earned: "+₹110", status: "completed", passenger: "Sneha Trivedi", rating: 5 },
  { id: "RM-7810", from: "CG Road", to: "Ellisbridge", date: "7 Mar, 2:10 PM", earned: "+₹125", status: "completed", passenger: "Harshil Joshi", rating: 5 },
];

const ADMIN_AUDIT_LOGS = [
  { id: "AUD-101", action: "System Config Update", actor: "Dhruv (Admin)", target: "Base Fare: ₹45 → ₹50", date: "Today, 4:20 PM", status: "success", urgent: false },
  { id: "AUD-100", action: "User Blocked", actor: "Security-Sentry", target: "user_7841 (Driver)", date: "Today, 2:11 PM", status: "enforced", urgent: true },
  { id: "AUD-099", action: "New Driver Verified", actor: "Dhruv (Admin)", target: "Karan Singh (#V-881)", date: "Yesterday, 11:45 AM", status: "success", urgent: false },
  { id: "AUD-098", action: "Database Optimization", actor: "Cron Job", target: "Index migration", date: "Yesterday, 3:00 AM", status: "success", urgent: false },
  { id: "AUD-097", action: "Security Breach Attempt", actor: "103.44.2.11", target: "API Endpoints", date: "6 Mar, 10:22 PM", status: "blocked", urgent: true },
];

// ─── Components ───────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const map = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    enforced: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blocked: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${map[status] || "bg-black/10 text-(--text-dim)"}`}>
      {status}
    </span>
  );
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader fullPage text="Retrieving history from encrypted logs..." />;

  const isPassenger = user?.role === "passenger";
  const isDriver = user?.role === "driver";
  const isAdmin = user?.role === "admin";

  const historyData = isPassenger ? PASSENGER_HISTORY : isDriver ? DRIVER_HISTORY : ADMIN_AUDIT_LOGS;

  const filteredData = historyData.filter(item => {
    const query = search.toLowerCase();
    if (isAdmin) {
      return item.action.toLowerCase().includes(query) || item.actor.toLowerCase().includes(query) || item.target.toLowerCase().includes(query);
    }
    return item.from?.toLowerCase().includes(query) || item.to?.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
  });

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main)">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/${user?.role}/dashboard`)} 
              className="rounded-xl border border-(--card-border) p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-lg font-black text-(--text-main) leading-none">
                {isAdmin ? "Audit Universe" : "Activity History"}
              </h1>
              <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-widest mt-1">
                {isAdmin ? "System Log Explorer" : "Complete Trip Record"}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        
        {/* ── Toolbar ── */}
        <section className="glass-card flex flex-col sm:flex-row gap-4 rounded-3xl p-4 shadow-xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim) group-focus-within:text-primary transition-colors" size={16} />
            <input
              type="text"
              placeholder={isAdmin ? "Search logs, actors or targets..." : "Search by location or trip ID..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/20 border border-(--card-border) rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-primary/50 text-sm font-semibold transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-(--text-dim)" />
            <select 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-black/5 dark:bg-transparent border border-(--card-border) rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-widest outline-none focus:border-primary/50 transition-all"
            >
              <option value="all">All Events</option>
              <option value="recent">Recent</option>
              <option value="important">Important</option>
            </select>
          </div>
        </section>

        {/* ── History List ── */}
        <section className="space-y-4">
          {filteredData.length > 0 ? (
            filteredData.map((item, i) => (
              <div 
                key={item.id} 
                className="glass-card group rounded-3xl border border-(--card-border) p-6 hover:border-primary/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      isAdmin ? "bg-violet-500/10 text-violet-400" :
                      item.status === "cancelled" ? "bg-rose-500/10 text-rose-400" :
                      "bg-primary/10 text-primary"
                    }`}>
                      {isAdmin ? <Clock size={24} /> : <MapPin size={24} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {isAdmin ? (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-(--text-main) text-sm">{item.action}</h3>
                            <StatusBadge status={item.status} />
                            {item.urgent && <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={8} /> Urgent</span>}
                          </div>
                          <p className="text-xs text-(--text-dim) mt-1">
                            <span className="text-primary font-bold">{item.actor}</span> → {item.target}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-(--text-main) text-sm">{item.from}</h3>
                            <ArrowRight size={14} className="text-(--text-dim)" />
                            <h3 className="font-black text-(--text-main) text-sm">{item.to}</h3>
                          </div>
                          <div className="mt-1 flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">{item.date}</span>
                            <span className="text-[10px] font-bold text-primary">ID: {item.id}</span>
                            <StatusBadge status={item.status} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-4 sm:pt-0 border-(--card-border) mt-2 sm:mt-0">
                    <p className="text-lg font-black text-(--text-main)">
                      {isPassenger ? item.amount : isDriver ? item.earned : ""}
                    </p>
                    {item.rating && (
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-black">{item.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {isAdmin && (
                       <button className="p-2 rounded-xl border border-(--card-border) hover:bg-white/5 text-(--text-dim) hover:text-(--text-main) transition-all">
                         <MoreVertical size={16} />
                       </button>
                    )}
                  </div>
                </div>

                {!isAdmin && (
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-(--card-border) opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex items-center justify-center gap-2 rounded-xl bg-black/5 hover:bg-black/10 py-2.5 text-[10px] font-black uppercase tracking-widest text-(--text-dim) hover:text-(--text-main) transition-all">
                      View Receipt
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-xl bg-black/5 hover:bg-black/10 py-2.5 text-[10px] font-black uppercase tracking-widest text-(--text-dim) hover:text-(--text-main) transition-all">
                      Support
                    </button>
                    {isPassenger && (
                      <button className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all">
                        Book Again
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="glass-card rounded-3xl p-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-(--card-bg) border border-(--card-border) flex items-center justify-center text-slate-500 mb-4">
                <Clock size={32} />
              </div>
              <p className="text-lg font-bold text-(--text-main)">No history items found</p>
              <p className="text-sm text-(--text-dim) max-w-xs mx-auto mt-2">Try adjusting your search query or filter.</p>
            </div>
          )}
        </section>

        {/* ── Footer Info ── */}
        <section className="bg-primary/5 border border-primary/20 rounded-3xl p-5 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm text-(--text-main)">Log Archive Protocol</h4>
            <p className="text-xs text-(--text-dim) leading-relaxed">
              Records are stored on a secure, encrypted ledger. Trip data is retained for 24 months 
              for safety and compliance. All transactions are digitally signed.
            </p>
          </div>
        </section>

      </main>

      <footer className="mx-auto max-w-4xl py-10 px-6 border-t border-(--card-border) flex justify-between items-center opacity-50 font-sans">
        <p className="text-[10px] font-black tracking-widest uppercase">RouteMate Unified History</p>
        <p className="text-[10px] font-black tracking-widest uppercase">Secured by TLS 1.3</p>
      </footer>
    </div>
  );
};

export default HistoryPage;
