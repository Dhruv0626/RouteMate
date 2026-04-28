import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, Users, Car, IndianRupee, ChevronLeft,
  Activity, Star, ArrowUpRight, ArrowDownRight, BarChart2,
  Calendar, RefreshCw, Zap, MapPin, Clock, Shield,
  Download, FileText, X, UserCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Loader from "../../components/ui/Loader";
import api from "../../services/api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─── Sparkline Bar component ───────────────────────────────────────────────────
const SparkBar = ({ values, color = "bg-primary" }) => {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-12 w-full pt-4">
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 ${color} rounded-md opacity-40 hover:opacity-100 transition-all duration-500`}
          style={{ height: `${(v / max) * 100}%`, minHeight: '2px' }}
        />
      ))}
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, change, changeType = "up", color, spark, note }) => {
  const colorMap = {
    primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", spark: "bg-primary" },
    violet:  { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", spark: "bg-violet-400" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", spark: "bg-emerald-400" },
    rose:    { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", spark: "bg-rose-400" },
    amber:   { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", spark: "bg-amber-400" },
    cyan:    { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", spark: "bg-cyan-400" },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <div className={`glass-card rounded-3xl p-6 border ${c.border} flex flex-col gap-4 hover:-translate-y-1 transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl ${c.bg}`}>
          <Icon size={22} className={c.text} />
        </div>
        {change && (
          <span className={`flex items-center gap-1 text-[10px] font-black rounded-xl px-2.5 py-1.5 border shadow-sm ${
            changeType === "up" || change === "+live"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}>
            {changeType === "up" || change === "+live" ? (
              <ArrowUpRight size={12} className="text-emerald-400" />
            ) : (
              <ArrowDownRight size={12} className="text-rose-400" />
            )}
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-black text-(--text-main) leading-none">{value}</p>
        <p className="text-xs font-bold text-(--text-dim) mt-1 uppercase tracking-widest">{label}</p>
        {note && <p className="text-[10px] text-(--text-dim) mt-0.5 italic">{note}</p>}
      </div>
    </div>
  );
};

// ─── Activity Row ──────────────────────────────────────────────────────────────
const ActivityRow = ({ icon: Icon, color, title, sub, time, badge }) => {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-400",
    violet: "bg-violet-500/10 text-violet-400",
    rose: "bg-rose-500/10 text-rose-400",
    amber: "bg-amber-500/10 text-amber-400",
  };
  return (
    <div className="flex items-center gap-4 py-3 border-b border-(--card-border) last:border-0 hover:bg-white/5 transition-colors px-2 rounded-xl -mx-2">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-(--text-main) truncate">{title}</p>
        <p className="text-[10px] font-medium text-(--text-dim) truncate">{sub}</p>
        {badge === "Admin" && color === "amber" && (
          <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md w-fit mt-1">
            <UserCheck size={10} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Super Admin</span>
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-1 block ${
            badge === "Completed" ? "bg-emerald-500/10 text-emerald-400" :
            badge === "Pending" ? "bg-amber-500/10 text-amber-400" :
            "bg-rose-500/10 text-rose-400"
          }`}>{badge}</span>
        )}
        <p className="text-[10px] text-(--text-dim)">{time}</p>
      </div>
    </div>
  );
};

// ─── Horizontal Bar ────────────────────────────────────────────────────────────
const HBar = ({ label, value, max, color }) => {
  const pct = Math.round((value / max) * 100);
  const colorMap = { primary: "bg-primary", emerald: "bg-emerald-400", violet: "bg-violet-400", amber: "bg-amber-400", rose: "bg-rose-400" };
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-(--text-main)">{label}</span>
        <span className="text-xs font-black text-(--text-dim)">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-(--card-border) overflow-hidden">
        <div className={`h-full ${colorMap[color] || "bg-primary"} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ─── Date Range Helpers ────────────────────────────────────────────────────────
const formatDate = (d) => d.toISOString().split("T")[0];
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

// ─── Main Page ─────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const reportRef = useRef(null);

  // Date range state
  const [dateFrom, setDateFrom] = useState(formatDate(thirtyDaysAgo));
  const [dateTo, setDateTo] = useState(formatDate(today));
  const [appliedRange, setAppliedRange] = useState({ from: formatDate(thirtyDaysAgo), to: formatDate(today) });
  const [showDatePanel, setShowDatePanel] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    passengers: 0,
    drivers: 0,
    admins: 0,
    superAdmins: 0,
    approvedDrivers: 0,
    pendingDrivers: 0,
    revenue: 0,
    totalRides: 0,
    activeUsers: 0,
  });
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const fetchActivities = async () => {
    try {
      setActivityLoading(true);
      const logsRes = await api.get("/admin/audit-logs?limit=8");
      if (logsRes.data.success && logsRes.data.logs) {
        setActivities(logsRes.data.logs.map(log => ({
          icon: log.category === "security" ? Shield : (log.category === "driver" ? Car : Activity),
          color: log.category === "security" ? "rose" : (log.actorRole === "superadmin" ? "amber" : (log.category === "driver" ? "emerald" : "primary")),
          title: log.action,
          sub: `${log.actor} · ${log.details}`,
          time: new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: log.actorRole === "superadmin" ? "Admin" : (log.category.charAt(0).toUpperCase() + log.category.slice(1))
        })));
      }
    } catch (err) {
      console.error("Failed to fetch activities", err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // 1. Fetch Users List for detailed counts
        const usersRes = await api.get("/users/all");
        if (usersRes.data.success && usersRes.data.users) {
          const users = usersRes.data.users;
          const passengers = users.filter(u => u.role === "passenger").length;
          const drivers = users.filter(u => u.role === "driver").length;
          const admins = users.filter(u => u.role === "admin").length;
          const superAdmins = users.filter(u => u.role === "superadmin").length;
          const approvedDrivers = users.filter(u => u.role === "driver" && u.driverProfile?.isApproved).length;
          const pendingDrivers = drivers - approvedDrivers;
          
          // 2. Fetch Dashboard Stats for Business Metrics
          const statsRes = await api.get("/admin/dashboard-stats");
          let businessStats = {
            activeUsers: 0,
            revenue: 0,
            totalRides: 0,
            avgRating: "0.0 ★",
            cancellationRate: "0.0%",
            vehicleBreakdown: [],
            geographic: [],
            weeklyRides: [0, 0, 0, 0, 0, 0, 0]
          };
          
          if (statsRes.data.success && statsRes.data.stats) {
            const s = statsRes.data.stats;
            businessStats = {
                activeUsers: s.counts.activeUsers,
                revenue: s.business.revenue,
                totalRides: s.business.totalRides,
                avgRating: s.business.avgRating,
                cancellationRate: s.business.cancellationRate,
                vehicleBreakdown: s.drivers.vehicleBreakdown,
                geographic: s.geographic,
                weeklyRides: s.business.weeklyRides || [0, 0, 0, 0, 0, 0, 0]
            };
          }

          // 3. Fetch Recent Activity
          await fetchActivities();

          setStats({ 
            totalUsers: users.length, 
            passengers, 
            drivers, 
            admins, 
            superAdmins, 
            approvedDrivers, 
            pendingDrivers,
            revenue: businessStats.revenue,
            totalRides: businessStats.totalRides,
            activeUsers: businessStats.activeUsers,
            avgRating: businessStats.avgRating,
            cancellationRate: businessStats.cancellationRate,
            vehicleBreakdown: businessStats.vehicleBreakdown,
            areaBreakdown: businessStats.geographic,
            weeklyRides: businessStats.weeklyRides
          });
        }
      } catch (e) {
        console.error("Failed to load analytics stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleApplyDate = () => {
    if (new Date(dateFrom) > new Date(dateTo)) {
      alert("'From' date must be before 'To' date.");
      return;
    }
    setAppliedRange({ from: dateFrom, to: dateTo });
    setShowDatePanel(false);
  };

  const handleResetDate = () => {
    setDateFrom(formatDate(thirtyDaysAgo));
    setDateTo(formatDate(today));
    setAppliedRange({ from: formatDate(thirtyDaysAgo), to: formatDate(today) });
    setShowDatePanel(false);
  };

  const formattedRange = `${new Date(appliedRange.from).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${new Date(appliedRange.to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;

  // ── PDF Export ──
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setPdfGenerating(true);
    try {
      // Capture the high-fidelity hidden template
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        // No complex onclone needed for the simple template
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.7);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Ensure clean start
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // Single or multi-page based on content
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        pdf.addPage();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.addImage(imgData, "JPEG", margin, heightLeft - imgHeight + margin, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      pdf.save(`RouteMate_Analytics_Report.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Export Failed: " + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  // ── Stats Summary for UI ──
  const UI_STATS = {
    revenue:       { value: `₹${stats.revenue?.toLocaleString()}`, change: "+live", changeType: "up" },
    rides:         { value: stats.totalRides?.toLocaleString(),     change: "+live", changeType: "up" },
    avgRating:     { value: stats.avgRating || "0.0 ★",             change: "0",    changeType: "up" },
    cancelRate:    { value: stats.cancellationRate || "0.0%",      change: stats.cancellationRate || "0.0%", changeType: "up" },
    isSuper:       currentUser?.role === "superadmin",
    totalUsers:    { value: stats.totalUsers?.toLocaleString(),     change: `+${stats.activeUsers || 0} live`, changeType: "up" },
    drivers:       { value: stats.drivers?.toLocaleString(),        change: "+1 live", changeType: "up" },
    vehicleTypes:  stats.vehicleBreakdown || [],
    areaBreakdown: stats.areaBreakdown || [],
    weekDays: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    weekRides: stats.weeklyRides || [0, 0, 0, 0, 0, 0, 0],
    weeklyMax: Math.max(...(stats.weeklyRides || [5])) || 5,
  };

  if (loading) return <Loader fullPage text="Compiling platform metrics..." />;

  return (
    <div className="mesh-bg min-h-screen relative font-sans text-(--text-main)">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/${currentUser?.role}/dashboard`)}
              className="p-2 hover:bg-(--card-bg) rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-display font-black tracking-tight leading-none">Analytics</h1>
              <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-widest">Platform Overview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range Trigger */}
            <button
              onClick={() => setShowDatePanel(!showDatePanel)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-(--card-border) bg-(--card-bg) text-[10px] font-bold text-(--text-dim) uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all"
            >
              <Calendar size={11} /> {formattedRange}
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              disabled={pdfGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-black text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
            >
              {pdfGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
              {pdfGenerating ? "Generating..." : "Export PDF"}
            </button>

            <ThemeToggle />
            <div className="flex items-center gap-3 border-l border-(--card-border) pl-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-(--text-main)">{currentUser?.name}</span>
                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${UI_STATS.isSuper ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                  {UI_STATS.isSuper ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-black text-sm border border-violet-500/20">
                {currentUser?.name?.charAt(0)?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Date Range Panel ── */}
      {showDatePanel && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20" onClick={() => setShowDatePanel(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative glass-card rounded-3xl border border-(--card-border) shadow-2xl p-8 w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Calendar className="text-primary" size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-(--text-main) text-lg">Date Range</h3>
                  <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-widest">Filter analytics by time period</p>
                </div>
              </div>
              <button
                onClick={() => setShowDatePanel(false)}
                className="p-2 rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo}
                  className="w-full bg-black/10 dark:bg-black/30 border border-(--card-border) rounded-2xl py-3 px-4 outline-none focus:border-primary/50 text-sm font-semibold text-(--text-main) transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom}
                  max={formatDate(today)}
                  className="w-full bg-black/10 dark:bg-black/30 border border-(--card-border) rounded-2xl py-3 px-4 outline-none focus:border-primary/50 text-sm font-semibold text-(--text-main) transition-all"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { label: "Last 7 Days", days: 7 },
                { label: "Last 30 Days", days: 30 },
                { label: "Last 90 Days", days: 90 },
                { label: "This Year", days: 365 },
              ].map(preset => {
                const from = new Date(today);
                from.setDate(today.getDate() - preset.days);
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setDateFrom(formatDate(from));
                      setDateTo(formatDate(today));
                    }}
                    className="px-3 py-1.5 rounded-xl border border-(--card-border) text-[10px] font-black uppercase tracking-widest text-(--text-dim) hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApplyDate}
                className="flex-1 py-3 rounded-2xl bg-primary text-black text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                Apply Filter
              </button>
              <button
                onClick={handleResetDate}
                className="px-4 py-3 rounded-2xl border border-(--card-border) text-(--text-dim) text-xs font-black uppercase tracking-widest hover:text-(--text-main) transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Content (captured for PDF) ── */}
      <main ref={reportRef} className="mx-auto max-w-7xl px-6 py-8 space-y-8 relative z-10">

        {/* ── Active Date Range Banner ── */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <FileText className="text-primary" size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-(--text-main)">Analytics Report</p>
              <p className="text-[10px] text-(--text-dim) font-bold">
                {formattedRange} · Ahmedabad Region
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
              <Zap size={9} /> Live Data Active
            </span>
            <button
              onClick={() => setShowDatePanel(true)}
              className="sm:hidden px-3 py-1 rounded-full border border-(--card-border) text-[9px] font-black text-(--text-dim) uppercase tracking-widest flex items-center gap-1"
            >
              <Calendar size={9} /> Change Dates
            </button>
          </div>
        </section>

        {/* ── Section: Live Platform KPIs ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase border border-primary/20 flex items-center gap-1.5">
              <Zap size={11} /> Live Metrics
            </span>
            <span className="text-xs text-(--text-dim) font-medium">Real data · Updated now</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            <StatCard
              icon={Users} color="primary" label="Total Users" value={stats.totalUsers}
              change="+live" changeType="up"
              spark={[1,2,2,3,3,3,stats.passengers||4,stats.drivers||2,stats.admins||1,stats.totalUsers||6]}
              note="Admins included"
            />
            <StatCard
              icon={Car} color="emerald" label="Total Drivers" value={stats.drivers}
              note={`${stats.approvedDrivers} approved · ${stats.pendingDrivers} pending`}
              spark={[1,1,2,2,2,stats.approvedDrivers||1,stats.pendingDrivers||1,stats.drivers||2]}
            />
            <StatCard
              icon={Users} color="violet" label="Passengers" value={stats.passengers}
              spark={[2,3,3,4,4,5,5,stats.passengers||5]}
            />
            <StatCard
              icon={Shield} color="amber" label="Super Admins" value={stats.superAdmins}
              spark={[1,1,1,stats.superAdmins||1]}
              note="Platform owners"
            />
            <StatCard
              icon={Shield} color="rose" label="Admins" value={stats.admins}
              spark={[1,1,1,1,stats.admins||1,stats.admins||1,stats.admins||1]}
              note="System staff"
            />
          </div>
        </section>

        {/* ── Section: Revenue & Ride Metrics (Dummy) ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-bold tracking-widest uppercase border border-amber-500/20 flex items-center gap-1.5">
              <BarChart2 size={11} /> Business Metrics
            </span>
            <span className="text-xs text-(--text-dim) font-medium italic">Demo data · Connect rides API for live figures</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {UI_STATS.isSuper && (
                <StatCard
                  icon={IndianRupee} color="primary" label="Total Revenue" value={UI_STATS.revenue.value}
                  change={UI_STATS.revenue.change} changeType="up" spark={UI_STATS.revenue.spark}
                />
            )}
            <StatCard
              icon={MapPin} color="emerald" label="Total Rides" value={UI_STATS.rides.value}
              change={UI_STATS.rides.change} changeType="up" spark={UI_STATS.rides.spark}
            />
            <StatCard
              icon={Star} color="amber" label="Avg. Rating" value={UI_STATS.avgRating.value}
              change={UI_STATS.avgRating.change} changeType="up" spark={UI_STATS.avgRating.spark}
            />
            <StatCard
              icon={Activity} color="rose" label="Cancel Rate" value={UI_STATS.cancelRate.value}
              change={UI_STATS.cancelRate.change} changeType="down"
            />
          </div>
        </section>

        {/* ── Section: Weekly Rides + Breakdown ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Ride Chart */}
          <div className="glass-card rounded-3xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display font-black text-(--text-main) text-lg">Weekly Ride Volume</h3>
                <p className="text-xs text-(--text-dim) font-medium">Rides per day this week · Live data</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <ArrowUpRight size={11} /> Active
              </div>
            </div>
            <div className="flex items-end gap-3 h-48 px-2">
              {UI_STATS.weekDays.map((day, i) => {
                const val = UI_STATS.weekRides[i] || 0;
                const pct = UI_STATS.weeklyMax > 0 ? (val / UI_STATS.weeklyMax) * 100 : 0;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-3">
                    <span className="text-[10px] font-black text-primary">{val > 0 ? val : ""}</span>
                    <div className="w-full bg-primary/10 rounded-2xl h-full relative group">
                      <div
                        className="absolute bottom-0 left-0 w-full bg-primary rounded-xl transition-all duration-1000 group-hover:bg-primary-dark"
                        style={{ height: `${val > 0 ? Math.max(pct, 12) : 0}%`, minHeight: val > 0 ? '8px' : '0' }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle Breakdown */}
          <div className="glass-card rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="font-display font-black text-(--text-main) text-lg">Vehicle Types</h3>
              <p className="text-xs text-(--text-dim) font-medium">Fleet distribution · Live data</p>
            </div>
            <div className="space-y-4">
              {UI_STATS.vehicleTypes.map(vt => (
                <HBar key={vt.label} label={vt.label} value={vt.value} max={stats.drivers || 1} color={vt.color} />
              ))}
            </div>
            <div className="pt-2 border-t border-(--card-border) text-center">
              <p className="text-xs text-(--text-dim) font-medium">Total active vehicles</p>
              <p className="text-2xl font-black text-(--text-main)">{UI_STATS.vehicleTypes.reduce((a,v) => a + v.value, 0)}</p>
            </div>
          </div>
        </section>

        {/* Area breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="font-display font-black text-(--text-main) text-lg">Top Areas</h3>
              <p className="text-xs text-(--text-dim) font-medium">City-wide distribution · Live areas</p>
            </div>
            <div className="space-y-4">
               {UI_STATS.areaBreakdown.map(area => {
                 // Extract area name (usually second part after comma) if available
                 const rawLabel = area.label || "Ahmedabad";
                 const parts = rawLabel.split(',');
                 const areaPart = parts.length > 1 ? parts[1].trim() : parts[0].trim();
                 
                 const isPincode = /^\d+$/.test(areaPart.replace(/\s/g, ''));
                 const finalLabel = isPincode ? `Area ${areaPart}` : areaPart;
                
                return (
                  <HBar 
                    key={area.label} 
                    label={finalLabel} 
                    value={area.value} 
                    max={stats.totalRides || 1} 
                    color={area.color} 
                  />
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-3xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-black text-(--text-main) text-lg">Recent Activity</h3>
                <p className="text-xs text-(--text-dim) font-medium">Live feed · Mixed real & demo events</p>
              </div>
              <button 
                onClick={fetchActivities}
                disabled={activityLoading}
                className="p-2 rounded-xl border border-(--card-border) hover:bg-(--card-bg) text-(--text-dim) hover:text-primary transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={activityLoading ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="space-y-1">
              {activities.length > 0 ? activities.map((a, i) => (
                <ActivityRow key={i} {...a} />
              )) : (
                <div className="py-10 text-center opacity-30 text-xs font-bold uppercase tracking-widest">
                   No recent events recorded
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer Note */}
        <section className="bg-primary/5 border border-primary/20 rounded-3xl p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10">
            <TrendingUp size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-(--text-main)">Analytics Enhancement</p>
            <p className="text-xs text-(--text-dim) font-medium">
              Live user counts are pulled from the database. Revenue, rides, ratings and area data are representative samples.
              Connect a rides & payments API to replace all demo figures with real-time data.
            </p>
          </div>
        </section>

      </main>

      {/* ── Hidden PDF Template ── */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
        <div ref={reportRef} style={{ width: '800px', padding: '40px', backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ borderBottom: '2px solid #ffcc00', paddingBottom: '20px', marginBottom: '30px' }}>
             <h1 style={{ fontSize: '28px', margin: '0', color: '#000' }}>RouteMate Analytics</h1>
             <p style={{ fontSize: '14px', color: '#666', margin: '5px 0' }}>Professional Platform Report · {formattedRange}</p>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>Business Metrics</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Total Revenue</strong></td>
                  <td style={{ padding: '12px', border: '1px solid #eee' }}>₹{stats.revenue?.toLocaleString()}</td>
                  <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Total Rides</strong></td>
                  <td style={{ padding: '12px', border: '1px solid #eee' }}>{stats.totalRides?.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Avg. Rating</strong></td>
                  <td style={{ padding: '12px', border: '1px solid #eee' }}>{stats.avgRating}</td>
                  <td style={{ padding: '12px', border: '1px solid #eee' }}><strong>Cancel Rate</strong></td>
                  <td style={{ padding: '12px', border: '1px solid #eee' }}>{stats.cancellationRate}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>User Demographics</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '10px', border: '1px solid #eee', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '10px', border: '1px solid #eee', textAlign: 'right' }}>Count</th>
                  <th style={{ padding: '10px', border: '1px solid #eee', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #eee' }}>Passengers</td>
                  <td style={{ padding: '10px', border: '1px solid #eee', textAlign: 'right' }}>{stats.passengers?.toLocaleString()}</td>
                  <td style={{ padding: '10px', border: '1px solid #eee' }}>Active</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #eee' }}>Drivers</td>
                  <td style={{ padding: '10px', border: '1px solid #eee', textAlign: 'right' }}>{stats.drivers?.toLocaleString()}</td>
                  <td style={{ padding: '10px', border: '1px solid #eee' }}>{stats.approvedDrivers} Approved</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #eee' }}>Administrators</td>
                  <td style={{ padding: '10px', border: '1px solid #eee', textAlign: 'right' }}>{(stats.admins + stats.superAdmins)?.toLocaleString()}</td>
                  <td style={{ padding: '10px', border: '1px solid #eee' }}>System Staff</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>Vehicle Fleet Breakdown</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '10px', border: '1px solid #eee', textAlign: 'left' }}>Vehicle Type</th>
                  <th style={{ padding: '10px', border: '1px solid #eee', textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.vehicleBreakdown?.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px', border: '1px solid #eee' }}>{item.label}</td>
                    <td style={{ padding: '10px', border: '1px solid #eee', textAlign: 'right' }}>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>Geographic Distribution</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '10px', border: '1px solid #eee', textAlign: 'left' }}>Region / Area</th>
                  <th style={{ padding: '10px', border: '1px solid #eee', textAlign: 'right' }}>Ride Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.areaBreakdown?.map((area, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px', border: '1px solid #eee' }}>{area.label}</td>
                    <td style={{ padding: '10px', border: '1px solid #eee', textAlign: 'right' }}>{area.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: '#999', margin: '0' }}>RouteMate Urban Mobility System · Internal Administrator Report</p>
            <p style={{ fontSize: '10px', color: '#999', margin: '5px 0' }}>Generated on {new Date().toLocaleString()} by {currentUser?.name}</p>
          </div>
        </div>
      </div>

      <footer className="mx-auto max-w-7xl py-8 px-6 border-t border-(--card-border) flex justify-between items-center opacity-50">
        <p className="text-[10px] font-bold tracking-widest uppercase">RouteMate Analytics</p>
        <p className="text-[10px] font-bold tracking-widest uppercase">{formattedRange} · Admin Panel</p>
      </footer>
    </div>
  );
};

export default AnalyticsPage;
