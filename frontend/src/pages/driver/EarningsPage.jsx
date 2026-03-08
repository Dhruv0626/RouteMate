import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, ChevronLeft, IndianRupee, BarChart2, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const WEEKLY = [
  { day: "Mon", trips: 8, earned: 1240 },
  { day: "Tue", trips: 12, earned: 1980 },
  { day: "Wed", trips: 6, earned: 890 },
  { day: "Thu", trips: 14, earned: 2310 },
  { day: "Fri", trips: 18, earned: 3050 },
  { day: "Sat", trips: 21, earned: 3640 },
  { day: "Sun", trips: 9, earned: 1520 },
];

const TRANSACTIONS = [
  { id: 1, desc: "Ride — Maninagar to SG Highway", date: "Today, 3:14 PM", amount: "+₹185", positive: true },
  { id: 2, desc: "Ride — Bopal to Navrangpura", date: "Today, 1:02 PM", amount: "+₹140", positive: true },
  { id: 3, desc: "Ride — Science City to Railway Station", date: "Today, 11:30 AM", amount: "+₹260", positive: true },
  { id: 4, desc: "Platform Fee (5%)", date: "Today", amount: "-₹29", positive: false },
  { id: 5, desc: "Ride — Satellite to Prahlad Nagar", date: "Yesterday, 6:44 PM", amount: "+₹110", positive: true },
  { id: 6, desc: "Ride — CEPT to Bodakdev", date: "Yesterday, 4:20 PM", amount: "+₹95", positive: true },
];

const maxEarned = Math.max(...WEEKLY.map(d => d.earned));

const EarningsPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("week");

  const totalWeek = WEEKLY.reduce((a, b) => a + b.earned, 0);
  const totalTrips = WEEKLY.reduce((a, b) => a + b.trips, 0);

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main)">
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/driver/dashboard")} className="rounded-xl p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all">
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">My Earnings</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Hero Card */}
        <div className="from-primary to-primary-dark relative overflow-hidden rounded-3xl bg-linear-to-br p-8 shadow-xl">
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <p className="mb-2 text-[10px] font-black tracking-[0.3em] text-black/60 uppercase">This Week's Earnings</p>
          <p className="text-5xl font-black text-black">₹{totalWeek.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2">
            <ArrowUp size={14} className="text-black" />
            <span className="text-sm font-bold text-black/80">12.4% vs last week</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-black/10 p-3">
              <p className="text-[10px] font-black text-black/60 uppercase tracking-widest">Total Trips</p>
              <p className="text-2xl font-black text-black">{totalTrips}</p>
            </div>
            <div className="rounded-xl bg-black/10 p-3">
              <p className="text-[10px] font-black text-black/60 uppercase tracking-widest">Avg Per Trip</p>
              <p className="text-2xl font-black text-black">₹{Math.round(totalWeek / totalTrips)}</p>
            </div>
          </div>
        </div>

        {/* Period Toggle */}
        <div className="flex rounded-xl border border-(--card-border) bg-(--card-bg) p-1">
          {["week", "month", "year"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 rounded-lg py-2 text-[10px] font-black tracking-widest uppercase transition-all ${period === p ? "bg-primary text-black" : "text-(--text-dim)"}`}>
              {p}
            </button>
          ))}
        </div>

        {/* Bar Chart */}
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-black text-(--text-main)">Daily Breakdown</h2>
            <BarChart2 size={18} className="text-(--text-dim)" />
          </div>
          <div className="flex items-end justify-between gap-2 h-36">
            {WEEKLY.map(d => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[9px] font-black text-(--text-dim)">₹{(d.earned / 1000).toFixed(1)}k</span>
                <div className="relative w-full rounded-t-lg overflow-hidden" style={{ height: `${(d.earned / maxEarned) * 100}%` }}>
                  <div className="absolute inset-0 bg-primary/20 rounded-t-lg" />
                  <div className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all duration-700" style={{ height: "100%" }} />
                </div>
                <span className="text-[9px] font-black text-(--text-dim) uppercase">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="font-display font-black text-(--text-main) mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {TRANSACTIONS.map(tx => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border border-(--card-border) bg-(--card-bg) p-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tx.positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {tx.positive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-(--text-main)">{tx.desc}</p>
                    <p className="text-[10px] text-(--text-dim)">{tx.date}</p>
                  </div>
                </div>
                <span className={`text-sm font-black ${tx.positive ? "text-emerald-400" : "text-red-400"}`}>{tx.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EarningsPage;
