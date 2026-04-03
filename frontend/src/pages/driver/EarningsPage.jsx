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
} from "lucide-react";
import { useState, useEffect } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Button from "../../components/ui/Button";
import { exportEarningsToCSV } from "../../utils/exportUtils";
import { getDriverHistory } from "../../services/rideService";

const EarningsPage = () => {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("week");
  const [expandedRide, setExpandedRide] = useState(null);
  const [showNotification, setShowNotification] = useState(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
    averageRating: 5.0,
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
            totalEarnings: s.totalEarnings,
            todayEarnings: s.todayEarnings,
            todayRides: s.todayRides,
            weekEarnings: s.weekEarnings,
            weekRides: s.weekRides,
            thisMonthEarnings: s.monthEarnings,
            monthRides: s.monthRides,
            completedRides: s.totalRides,
            cancelledRides: 0, // Should be fetched if available
            averageRating: s.avgRating,
          });

          setRideBreakdown(s.rideTypeBreakdown || []);

          setRecentTransactions(rides.map(r => ({
            id: r._id,
            type: "ride",
            from: r.source.address,
            to: r.destination.address,
            amount: r.fare.total,
            date: new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            distance: `${r.distanceActual || 0} km`,
            rating: 5.0 // Review integration needed
          })));

          // Hardcoded daily distribution for UI since we don't have separate time-series yet
          setDailyEarnings([
            { day: "Mon", amount: Math.floor(s.weekEarnings * 0.1), trips: 2 },
            { day: "Tue", amount: Math.floor(s.weekEarnings * 0.15), trips: 3 },
            { day: "Wed", amount: Math.floor(s.weekEarnings * 0.2), trips: 4 },
            { day: "Thu", amount: Math.floor(s.weekEarnings * 0.12), trips: 2 },
            { day: "Fri", amount: Math.floor(s.weekEarnings * 0.25), trips: 5 },
            { day: "Sat", amount: Math.floor(s.weekEarnings * 0.1), trips: 2 },
            { day: "Sun", amount: Math.floor(s.weekEarnings * 0.08), trips: 1 },
          ]);
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

  const maxDailyEarning = dailyEarnings.length > 0 ? Math.max(...dailyEarnings.map((d) => d.amount)) : 100;

  const handleExport = () => {
    const today = new Date().toLocaleDateString("en-IN").replace(/\//g, "-");
    exportEarningsToCSV(earningsStats, `earnings_report_${today}.csv`);
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
                  ₹{earningsStats.totalEarnings.toLocaleString()}
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
                  ₹{earningsStats.todayEarnings.toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-amber-500">
                  {earningsStats.todayRides} trips completed
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
                  ₹{earningsStats.weekEarnings.toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-cyan-500">
                  {earningsStats.weekRides} trips so far
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
                  ₹{earningsStats.thisMonthEarnings.toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-lime-500">
                  {earningsStats.monthRides} trips completed
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
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div className="glass-card rounded-3xl border border-(--card-border) p-8 shadow-sm">
            <div className="mb-8 space-y-4">
              <p className="text-sm font-medium text-(--text-dim)">
                Daily earnings breakdown
              </p>
            </div>

            {/* Bar Chart */}
            <div className="space-y-6">
              <div className="flex items-end justify-between gap-3 h-64">
                {dailyEarnings.map((day, idx) => (
                  <div
                    key={idx}
                    className="group relative flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="relative h-full w-full flex items-end justify-center">
                      <div
                        className="from-primary to-primary-dark group-hover:shadow-primary/30 w-3/5 rounded-t-xl bg-linear-to-t shadow-lg transition-all duration-300 group-hover:shadow-xl"
                        style={{
                          height: `${(day.amount / maxDailyEarning) * 100}%`,
                        }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 dark:bg-white/80 text-white dark:text-black px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-opacity z-20">
                          ₹{day.amount}
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-(--text-main)">
                        {day.day}
                      </p>
                      <p className="text-[10px] text-(--text-dim)">
                        {day.trips} trips
                      </p>
                    </div>
                  </div>
                ))}
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
            {rideBreakdown.map((ride, idx) => (
              <div
                key={idx}
                className="glass-card group relative overflow-hidden rounded-3xl border border-(--card-border) p-6 shadow-sm transition-all hover:border-primary/40 cursor-pointer"
                onClick={() =>
                  setExpandedRide(expandedRide === idx ? null : idx)
                }
              >
                <div
                  className={`absolute right-0 top-0 h-20 w-20 rounded-full blur-3xl opacity-20 ${ride.color}`}
                />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ride.icon}</span>
                      <div>
                        <p className="text-sm font-black text-(--text-main)">
                          {ride.type}
                        </p>
                        <p className="text-xs text-(--text-dim)">
                          {ride.rides} trips
                        </p>
                      </div>
                    </div>
                    <div className="rounded-full bg-(--card-bg) p-2 text-primary">
                      <ChevronRight
                        size={16}
                        className={`transition-transform ${
                          expandedRide === idx ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-black text-(--text-main)">
                        ₹{ride.earnings.toLocaleString()}
                      </p>
                    </div>
                    <div className="relative h-2 rounded-full bg-(--card-border) overflow-hidden">
                      <div
                        className={`h-full bg-linear-to-r ${ride.color} transition-all`}
                        style={{ width: `${ride.percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-(--text-dim) font-semibold">
                      {ride.percentage}% of total
                    </p>
                  </div>

                  {expandedRide === idx && (
                    <div className="mt-4 space-y-2 border-t border-(--card-border) pt-4">
                      <div className="flex justify-between">
                        <span className="text-xs text-(--text-dim)">
                          Avg per trip:
                        </span>
                        <span className="text-xs font-bold text-(--text-main)">
                          ₹{Math.round(ride.earnings / ride.rides)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-(--text-dim)">
                          Total trips:
                        </span>
                        <span className="text-xs font-bold text-(--text-main)">
                          {ride.rides}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent Transactions ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Recent Activity <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
            <button className="text-primary hover:text-primary-dark text-sm font-bold transition-colors">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="glass-card group flex items-center justify-between rounded-2xl border border-(--card-border) p-4 transition-all hover:border-primary/40 shadow-sm lg:p-6"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="hidden rounded-xl bg-(--card-bg) p-3 text-lg sm:flex h-14 w-14 items-center justify-center flex-shrink-0">
                    {tx.type === "ride" ? "🚗" : "🎁"}
                  </div>

                  <div className="min-w-0 flex-1">
                    {tx.type === "ride" ? (
                      <>
                        <p className="mb-1 flex items-center gap-2 text-sm font-bold text-(--text-main)">
                          <MapPin size={14} className="text-primary" />
                          {tx.from.split(" ")[0]} → {tx.to.split(" ")[0]}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-(--text-dim) font-medium">
                          <span>{tx.distance}</span>
                          <span>•</span>
                          <span>{tx.date}</span>
                          {tx.rating && (
                            <>
                              <span>•</span>
                              <span className="text-amber-500 font-bold">
                                ⭐ {tx.rating}
                              </span>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mb-1 text-sm font-bold text-(--text-main)">
                          {tx.description}
                        </p>
                        <p className="text-xs text-(--text-dim) font-medium">
                          {tx.date}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-lg font-black text-emerald-500">
                    +₹{tx.amount}
                  </p>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    Earned
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Payout Section ── */}
        <section>
          <div className="mb-4 px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Account & Payouts <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Balance Info */}
            <div className="glass-card relative overflow-hidden rounded-3xl border border-(--card-border) p-8 shadow-sm">
              <div className="from-primary/20 to-primary/5 absolute right-0 top-0 h-32 w-32 rounded-full blur-3xl" />
              <div className="relative space-y-6">
                <div>
                  <p className="mb-2 text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                    Available Balance
                  </p>
                  <p className="text-4xl font-black text-(--text-main)">
                    ₹{(earningsStats.totalEarnings * 0.7).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-3 border-t border-(--card-border) pt-6">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-(--text-dim)">
                      Total Earnings
                    </span>
                    <span className="font-bold text-(--text-main)">
                      ₹{earningsStats.totalEarnings.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-(--text-dim)">
                      Paid Out
                    </span>
                    <span className="font-bold text-(--text-main)">
                      ₹{(earningsStats.totalEarnings * 0.3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-(--text-dim)">
                      Pending
                    </span>
                    <span className="font-bold text-amber-500">
                      ₹{(earningsStats.totalEarnings * 0.05).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleRequestPayout}
                  variant="primary"
                  fullWidth
                  icon={Send}
                  className="mt-2"
                >
                  Request Payout
                </Button>
              </div>
            </div>

            {/* Payout Method */}
            <div className="glass-card rounded-3xl border border-(--card-border) p-8 shadow-sm space-y-6">
              <div>
                <p className="mb-2 text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                  Preferred Payout Method
                </p>
                <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <IndianRupee size={24} className="text-primary" />
                    <div>
                      <p className="text-sm font-bold text-(--text-main)">
                        Bank Account
                      </p>
                      <p className="text-xs text-(--text-dim)">
                        HDFC • ***4567
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleChangePaymentMethod}
                className="w-full rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-3 text-sm font-black text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5"
              >
                Change Payment Method
              </button>

              <div className="space-y-2 border-t border-(--card-border) pt-6">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Next Payout
                  </span>
                  <span className="font-bold text-(--text-main)">
                    Mar 10, 2026
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Processing Time
                  </span>
                  <span className="font-bold text-(--text-main)">
                    1-2 business days
                  </span>
                </div>
              </div>
            </div>
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
                98.5%
              </p>
              <div className="h-1 w-full rounded-full bg-(--card-border) overflow-hidden">
                <div className="h-full bg-linear-to-r from-primary to-primary-dark w-[98.5%]" />
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-(--card-border) p-4 shadow-sm text-center">
              <p className="mb-2 text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                Cancellation Rate
              </p>
              <p className="mb-1 text-2xl font-black text-(--text-main)">
                0.0%
              </p>
              <div className="h-1 w-full rounded-full bg-(--card-border) overflow-hidden">
                <div className="h-full bg-linear-to-r from-rose-500 to-rose-600 w-[0%]" />
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-(--card-border) p-4 shadow-sm text-center">
              <p className="mb-2 text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                Average Rating
              </p>
              <p className="mb-1 text-2xl font-black text-(--text-main)">
                {earningsStats.averageRating}
              </p>
              <p className="text-xs text-amber-500 font-bold">
                ⭐ Excellent
              </p>
            </div>

            <div className="glass-card rounded-2xl border border-(--card-border) p-4 shadow-sm text-center">
              <p className="mb-2 text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                Total Trips
              </p>
              <p className="mb-1 text-2xl font-black text-(--text-main)">
                {earningsStats.completedRides}
              </p>
              <p className="text-xs text-emerald-500 font-bold">
                {earningsStats.completedRides} completed
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