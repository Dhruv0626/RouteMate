import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Wallet,
  Clock,
  IndianRupee,
  Download,
  ChevronRight,
  MapPin,
  CheckCircle,
  AlertCircle,
  Send,
  Loader2,
  Star,
} from "lucide-react";
import { useState, useEffect } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Button from "../../components/ui/Button";
import { exportEarningsToCSV, exportEarningsToPDF } from "../../utils/exportUtils";
import { getDriverHistory } from "../../services/rideService";
import Loader from "../../components/ui/Loader";

const EarningsPage = () => {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("week");
  const [expandedRide, setExpandedRide] = useState(null);
  const [showNotification, setShowNotification] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [earningsStats, setEarningsStats] = useState({
    totalEarnings: 0,
    todayEarnings: 0,
    todayRides: 0,
    weekEarnings: 0,
    weekRides: 0,
    thisMonthEarnings: 0,
    monthRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    averageRating: 0.0,
    acceptanceRate: 100,
    cancellationRate: 0,
  });
  const [rideBreakdown, setRideBreakdown] = useState([]);
  const [dailyEarnings, setDailyEarnings] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getDriverHistory({ limit: 10 });
        if (res.data.success) {
          const { stats: s, rides } = res.data.data;
          setEarningsStats({
            totalEarnings: s.totalEarnings || 0,
            todayEarnings: s.todayEarnings || 0,
            todayRides: s.todayRides || 0,
            weekEarnings: s.weekEarnings || 0,
            weekRides: s.weekRides || 0,
            thisMonthEarnings: s.monthEarnings || 0,
            monthRides: s.monthRides || 0,
            completedRides: s.completedRides || 0,
            cancelledRides: s.cancelledRides || 0,
            totalRides: (s.completedRides || 0) + (s.cancelledRides || 0),
            averageRating: s.avgRating || 0,
            acceptanceRate: s.acceptanceRate || 0,
            cancellationRate: s.cancellationRate || 0,
          });

          setRideBreakdown(s.rideTypeBreakdown || []);

          setRecentTransactions(rides.map(r => ({
            id: r._id,
            type: "ride",
            vehicleType: r.vehicleTypeRequested || "PRIME",
            from: r.source.address.split(',').slice(0, 2).join(','),
            to: r.destination.address.split(',').slice(0, 2).join(','),
            amount: r.fare.totalWithTax || r.fare.total || 0,
            status: r.phase,
            date: new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            distance: `${r.distanceActual || r.distanceEstimate || 0} km`,
            rating: 0.0 // Default to 0.0 before review
          })));

          // Group by day for the chart
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return {
              day: days[d.getDay()],
              dateStr: d.toDateString(),
              amount: 0,
              trips: 0
            };
          });

          rides.forEach(r => {
            const rDate = new Date(r.createdAt).toDateString();
            const daySlot = last7Days.find(d => d.dateStr === rDate);
            if (daySlot) {
              if (r.phase === 'completed') {
                daySlot.amount += parseFloat(r.fare.totalWithTax || r.fare.total || 0);
              }
              daySlot.trips += 1; // Count all status trips
            }
          });

          setDailyEarnings(last7Days);
        }
      } catch (err) {
        console.error("Earnings fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const maxTrips = Math.max(...dailyEarnings.map((d) => d.trips), 1);
  const maxDailyEarning = Math.max(...dailyEarnings.map((d) => d.amount), 1);

  const handleExport = (format) => {
    const today = new Date().toLocaleDateString("en-IN").replace(/\//g, "-");
    const filename = `earnings_report_${today}.${format}`;
    if (format === 'csv') {
      exportEarningsToCSV(earningsStats, filename);
    } else {
      exportEarningsToPDF(earningsStats, filename);
    }
  };

  const handleRequestPayout = () => {
    navigate("/driver/dashboard/payout-request");
  };

  const handleChangePaymentMethod = () => {
    setShowNotification({
      type: "info",
      message: "Navigating to Profile - Update your bank details there",
    });
    setTimeout(() => {
      navigate("/driver/dashboard/profile");
      setShowNotification(null);
    }, 1500);
  };

  // Helper for Payout Day (Next Sunday)
  const getNextPayoutDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (error) {
    return (
      <div className="mesh-bg flex min-h-screen items-center justify-center p-6 text-center">
        <div className="glass-card max-w-md space-y-6 rounded-3xl p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-(--text-main)">Oops! Something went wrong</h2>
            <p className="text-sm font-medium text-(--text-dim)">
              We couldn't load your earnings data at this moment. Please try again.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} variant="primary" fullWidth>
            Retry Connection
          </Button>
          <button onClick={() => navigate("/driver/dashboard")} className="text-xs font-bold text-(--text-dim) hover:text-primary transition-all">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <Loader fullPage text="Fetching your earnings..." />;

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main) hover:border-primary/40"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">
                My Earnings
              </h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                Track your income
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(prev => !prev)}
                className="rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-2 text-sm font-semibold text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5 flex items-center gap-2"
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

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Notification Toast */}
        {showNotification && (
          <div
            className={`rounded-2xl border p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              showNotification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : showNotification.type === "danger"
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
            }`}
          >
            {showNotification.type === "success" && <CheckCircle size={20} />}
            {showNotification.type === "danger" && <AlertCircle size={20} />}
            {showNotification.type === "info" && <AlertCircle size={20} />}
            <span className="font-semibold">{showNotification.message}</span>
          </div>
        )}

        {/* ── Summary Cards ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Income Overview <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Earnings */}
            <div className="glass-card group relative overflow-hidden rounded-3xl border border-(--card-border) p-6 shadow-sm transition-all hover:border-primary/40">
              <div className="from-primary/20 to-primary/5 absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                    Total Earnings
                  </span>
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Wallet size={16} />
                  </div>
                </div>
                <p className="text-3xl font-black text-(--text-main)">
                  ₹{(earningsStats.totalEarnings || 0).toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-emerald-500">
                  Lifetime performance data
                </p>
              </div>
            </div>

            {/* Today's Earnings */}
            <div className="glass-card group relative overflow-hidden rounded-3xl border border-(--card-border) p-6 shadow-sm transition-all hover:border-violet-500/40">
              <div className="from-violet-500/20 to-violet-500/5 absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                    Today's Earnings
                  </span>
                  <div className="rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400">
                    <Clock size={16} />
                  </div>
                </div>
                <p className="text-3xl font-black text-(--text-main)">
                  ₹{(earningsStats.todayEarnings || 0).toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-amber-500">
                  {earningsStats.todayRides || 0} trips completed
                </p>
              </div>
            </div>

            {/* Week Earnings */}
            <div className="glass-card group relative overflow-hidden rounded-3xl border border-(--card-border) p-6 shadow-sm transition-all hover:border-emerald-500/40">
              <div className="from-emerald-500/20 to-emerald-500/5 absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                    This Week
                  </span>
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <Calendar size={16} />
                  </div>
                </div>
                <p className="text-3xl font-black text-(--text-main)">
                  ₹{(earningsStats.weekEarnings || 0).toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-cyan-500">
                  {earningsStats.weekRides || 0} trips so far
                </p>
              </div>
            </div>

            {/* Month Earnings */}
            <div className="glass-card group relative overflow-hidden rounded-3xl border border-(--card-border) p-6 shadow-sm transition-all hover:border-rose-500/40">
              <div className="from-rose-500/20 to-rose-500/5 absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                    This Month
                  </span>
                  <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <p className="text-3xl font-black text-(--text-main)">
                  ₹{(earningsStats.thisMonthEarnings || 0).toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-lime-500">
                  {earningsStats.monthRides || 0} trips completed
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Chart Section ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Weekly Performance <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) px-3 py-1.5 text-sm font-semibold text-(--text-main) transition-all focus:border-primary/40 focus:outline-none"
            >
              <option value="week">Past 7 Days</option>
            </select>
          </div>

          <div className="glass-card rounded-3xl border border-(--card-border) p-8 shadow-sm">
            <div className="mb-8 space-y-4">
              <p className="text-sm font-medium text-(--text-dim)">
                Daily activity breakdown
              </p>
            </div>

            {/* Bar Chart */}
            <div className="space-y-6">
              <div className="flex items-end justify-between gap-3 h-64">
                {dailyEarnings.map((day, idx) => {
                   const pct = maxDailyEarning > 0 ? (day.amount / maxDailyEarning) * 100 : 0;
                   return (
                  <div
                    key={idx}
                    className="group relative flex flex-1 flex-col items-center gap-3"
                  >
                    {day.trips > 0 ? (
                      <span className="text-xs font-black text-primary transition-transform group-hover:scale-110 h-4 flex items-center justify-center">
                        {day.trips}
                      </span>
                    ) : (
                      <div className="h-4" />
                    )}
                    <div className="w-3 md:w-4 bg-primary/5 rounded-full h-40 relative group/pillar overflow-hidden border border-(--card-border)/20">
                       <div
                          className="absolute bottom-0 left-0 w-full bg-primary rounded-full transition-all duration-700 ease-out group-hover/pillar:brightness-110 shadow-[0_0_15px_rgba(255,204,0,0.3)]"
                          style={{
                            height: `${day.trips > 0 ? Math.max((day.trips / maxTrips) * 100, 15) : 0}%`,
                            minHeight: day.trips > 0 ? '12px' : '0'
                          }}
                        >
                          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-full blur-[2px]" />
                        </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-(--text-main) uppercase tracking-tighter">
                        {day.day}
                      </p>
                      <p className="text-[8px] font-bold text-(--text-dim) uppercase tracking-widest">
                        {day.trips} trips
                      </p>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </section>

        {/* ── Earnings Breakdown ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              By Ride Type <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {rideBreakdown.length > 0 ? (
              rideBreakdown.map((ride, idx) => (
                <div
                  key={idx}
                  className="glass-card group relative overflow-hidden rounded-3xl border border-(--card-border) p-6 shadow-sm transition-all hover:border-primary/40 cursor-pointer"
                  onClick={() =>
                    setExpandedRide(expandedRide === idx ? null : idx)
                  }
                >
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`/images/${(ride.type || "Prime").charAt(0).toUpperCase() + (ride.type || "Prime").slice(1).toLowerCase()}.png`} 
                          alt={ride.type}
                          className="w-12 h-12 object-contain"
                          onError={(e) => { e.target.src = "/images/Prime.png"; }}
                        />
                        <div>
                          <p className="text-sm font-black text-(--text-main)">
                            {ride.type}
                          </p>
                          <p className="text-xs text-(--text-dim)">
                            {ride.rides} trips
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-2xl font-black text-(--text-main)">
                          ₹{ride.earnings.toLocaleString()}
                        </p>
                      <div className="relative h-2 rounded-full bg-(--card-border) overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${ride.percentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-(--text-dim) font-semibold">
                        {ride.percentage}% of total
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
                <div className="glass-card rounded-2xl border border-(--card-border) p-8 text-center shadow-sm lg:col-span-3">
                  <p className="text-(--text-dim) font-medium text-sm">No completed ride data available yet.</p>
                </div>
            )}
          </div>
        </section>

        {/* ── Recent Transactions ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Recent Activity <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="glass-card group flex items-center justify-between rounded-2xl border border-(--card-border) p-4 transition-all hover:border-primary/40 shadow-sm lg:p-6"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="hidden rounded-xl bg-(--card-bg) p-1 sm:flex h-14 w-14 items-center justify-center flex-shrink-0 overflow-hidden">
                       <img 
                          src={`/images/${(tx.vehicleType || "Prime").charAt(0).toUpperCase() + (tx.vehicleType || "Prime").slice(1).toLowerCase()}.png`} 
                          alt="Ride" 
                          className="w-full h-full object-contain" 
                          onError={(e) => { e.target.src = "/images/Prime.png"; }}
                       />
                    </div>

                  <div className="min-w-0 flex-1">
                    <p className="mb-1 flex items-center gap-2 text-[11px] font-bold text-(--text-main) leading-tight">
                      <MapPin size={12} className="text-primary flex-shrink-0" />
                      <span className="line-clamp-2">{tx.from} → {tx.to}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-(--text-dim) font-black uppercase tracking-wider">
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{tx.distance}</span>
                      <span className="opacity-30">•</span>
                      <span>{tx.date}</span>
                    </div>
                  </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className={`text-lg font-black ${tx.status === 'completed' ? 'text-emerald-500' : 'text-(--text-dim)'}`}>
                      {tx.status === 'completed' ? `+₹${tx.amount}` : `₹${tx.amount}`}
                    </p>
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {tx.status === 'completed' ? 'Earned' : 'Cancelled'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
                <div className="glass-card rounded-2xl border border-(--card-border) p-8 text-center shadow-sm">
                  <p className="text-(--text-dim) font-medium text-sm">No recent ride activity found.</p>
                </div>
            )}
          </div>
        </section>

        {/* ── Quick Stats ── */}
        <section>
          <div className="mb-4 px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Performance Metrics <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-card rounded-2xl border border-(--card-border) p-4 shadow-sm text-center">
              <p className="mb-2 text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                Acceptance Rate
              </p>
              <p className="mb-1 text-2xl font-black text-(--text-main)">
                {earningsStats.acceptanceRate || 0}%
              </p>
              <div className="h-1 w-full rounded-full bg-(--card-border) overflow-hidden">
                <div className="h-full bg-linear-to-r from-primary to-primary-dark" style={{ width: `${earningsStats.acceptanceRate || 0}%` }} />
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-(--card-border) p-4 shadow-sm text-center">
              <p className="mb-2 text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                Cancellation Rate
              </p>
              <p className="mb-1 text-2xl font-black text-(--text-main)">
                {earningsStats.cancellationRate || 0}%
              </p>
              <div className="h-1 w-full rounded-full bg-(--card-border) overflow-hidden">
                <div className="h-full bg-linear-to-r from-rose-500 to-rose-600" style={{ width: `${earningsStats.cancellationRate || 0}%` }} />
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-(--card-border) p-4 shadow-sm text-center">
              <p className="mb-2 text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                Average Rating
              </p>
              <p className="mb-1 text-2xl font-black text-(--text-main)">
                {Number(earningsStats.averageRating || 0).toFixed(1)}
              </p>
              <div className="flex items-center justify-center gap-1 text-[10px] text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={8} fill="currentColor" />
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-(--card-border) p-4 shadow-sm text-center">
              <p className="mb-2 text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                Total Trips
              </p>
              <p className="mb-1 text-2xl font-black text-(--text-main)">
                {earningsStats.totalRides || 0}
              </p>
              <p className="text-xs text-emerald-500 font-bold">
                Lifetime trips
              </p>
            </div>
          </div>
        </section>
        
        {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="glass-card p-6 flex items-center gap-3 rounded-2xl">
                    <Loader2 size={24} className="text-primary animate-spin" />
                    <span className="font-bold">Updating earnings data...</span>
                </div>
            </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl border-t border-(--card-border) px-6 py-10 text-center">
        <p className="text-[9px] font-black tracking-[0.3em] text-(--text-dim) uppercase">
          RouteMate • © 2026
        </p>
      </footer>
    </div>
  );
};

export default EarningsPage;