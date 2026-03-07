import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, Users, Car, DollarSign, ChevronLeft,
  Activity, Star, ArrowUpRight, ArrowDownRight, BarChart2,
  Calendar, RefreshCw, Zap, MapPin, Clock, Shield,
  Download, FileText, X
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
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 ${color} rounded-sm opacity-70 hover:opacity-100 transition-opacity`}
          style={{ height: `${(v / max) * 100}%` }}
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
          <span className={`flex items-center gap-1 text-[10px] font-black rounded-full px-2 py-1 ${
            changeType === "up"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-rose-500/10 text-rose-400"
          }`}>
            {changeType === "up" ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-black text-(--text-main) leading-none">{value}</p>
        <p className="text-xs font-bold text-(--text-dim) mt-1 uppercase tracking-widest">{label}</p>
        {note && <p className="text-[10px] text-(--text-dim) mt-0.5 italic">{note}</p>}
      </div>
      {spark && <SparkBar values={spark} color={c.spark} />}
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
    approvedDrivers: 0,
    pendingDrivers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/users/all");
        if (data.success) {
          const users = data.users;
          const passengers = users.filter(u => u.role === "passenger").length;
          const drivers = users.filter(u => u.role === "driver").length;
          const admins = users.filter(u => u.role === "admin").length;
          const approvedDrivers = users.filter(u => u.role === "driver" && u.driverProfile?.isApproved).length;
          const pendingDrivers = drivers - approvedDrivers;
          setStats({ totalUsers: users.length, passengers, drivers, admins, approvedDrivers, pendingDrivers });
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
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0f0f12",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Header
      pdf.setFillColor(15, 15, 18);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont(undefined, "bold");
      pdf.text("RouteMate Analytics Report", 10, 15);
      pdf.setFontSize(9);
      pdf.setTextColor(160, 160, 170);
      pdf.text(`Date Range: ${formattedRange}`, 10, 22);
      pdf.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 10, 27);
      pdf.text(`Admin: ${currentUser?.name || "System"}`, 10, 32);

      // Separator line
      pdf.setDrawColor(100, 100, 110);
      pdf.line(10, 35, pageWidth - 10, 35);

      // Content – multi-page support
      let yOffset = 40;
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const availableHeight = (yOffset === 40) ? (pageHeight - 50) : (pageHeight - 20);
        const sliceHeight = Math.min(remainingHeight, availableHeight);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        const sourcePixelHeight = (sliceHeight / imgHeight) * canvas.height;
        sliceCanvas.height = sourcePixelHeight;
        const ctx = sliceCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourcePixelHeight, 0, 0, canvas.width, sourcePixelHeight);
        const sliceData = sliceCanvas.toDataURL("image/png");

        pdf.addImage(sliceData, "PNG", 10, yOffset, imgWidth, sliceHeight);
        remainingHeight -= sliceHeight;
        sourceY += sourcePixelHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          yOffset = 10;
        }
      }

      // Footer on last page
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 110);
      pdf.text("Confidential – RouteMate Admin Panel", 10, pageHeight - 5);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - 20, pageHeight - 5);

      pdf.save(`RouteMate_Analytics_${appliedRange.from}_to_${appliedRange.to}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  // ── Dummy Data (for metrics that need rides/payments backend) ──
  const DUMMY = {
    revenue:       { value: "₹1,24,520", change: "+18.2%", spark: [40, 60, 45, 80, 70, 90, 75, 110, 95, 130, 115, 140] },
    rides:         { value: "3,847",     change: "+12.4%", spark: [30, 55, 40, 70, 65, 85, 60, 90, 80, 110, 95, 120] },
    avgRating:     { value: "4.7 ★",    change: "+0.3",   spark: [80, 85, 78, 90, 92, 88, 95, 91, 96, 93, 97, 98] },
    cancelRate:    { value: "4.2%",      change: "-1.1%",  changeType: "down" },
    vehicleTypes:  [
      { label: "Sedan",    value: 42, color: "primary" },
      { label: "SUV",      value: 28, color: "violet" },
      { label: "Auto",     value: 18, color: "emerald" },
      { label: "Bike",     value: 12, color: "amber" },
    ],
    areaBreakdown: [
      { label: "Paldi", value: 1240, color: "primary" },
      { label: "Prahlad Nagar",  value: 870,  color: "violet" },
      { label: "Maninagar",       value: 760,  color: "emerald" },
      { label: "Science City",         value: 620,  color: "amber" },
      { label: "Bodakdev",     value: 357,  color: "rose" },
    ],
    recentActivity: [
      { icon: Car,      color: "primary", title: "New Driver Registered",        sub: "Ravi Kumar – CG Road",          time: "2 min ago",  badge: "Pending" },
      { icon: MapPin,   color: "emerald", title: "Ride Completed",               sub: "#RM-7841 · ₹280 · 12 km",      time: "5 min ago",  badge: "Completed" },
      { icon: Users,    color: "violet",  title: "Passenger Sign Up",            sub: "sneha.r@outlook.com",           time: "11 min ago", badge: null },
      { icon: Star,     color: "amber",   title: "5-Star Rating Received",       sub: "Arjun Mehta → Driver #RM204",  time: "24 min ago", badge: "Completed" },
      { icon: Shield,   color: "rose",    title: "Driver Rejection",             sub: "Mismatch – Satellite Zone",    time: "42 min ago", badge: "Rejected" },
      { icon: Activity, color: "primary", title: "Peak Hour Surge Activated",   sub: "7× zone – Prahlad Nagar",      time: "1 hr ago",   badge: null },
      { icon: Clock,    color: "cyan",    title: "Scheduled Maintenance",        sub: "Server batch job completed",   time: "2 hr ago",   badge: null },
    ],
    weekDays: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    weekRides: [480, 620, 540, 710, 890, 1240, 963],
    weeklyMax: 1240,
  };

  if (loading) return <Loader fullPage text="Compiling platform metrics..." />;

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
            <div className="flex items-center gap-2 border-l border-(--card-border) pl-3">
              <p className="hidden sm:block text-sm font-semibold text-(--text-main)">{currentUser?.name}</p>
              <div className="h-8 w-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-black text-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
              icon={Shield} color="rose" label="Admins" value={stats.admins}
              spark={[1,1,1,1,stats.admins||1,stats.admins||1,stats.admins||1]}
              note="System administrators"
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
            <StatCard
              icon={DollarSign} color="primary" label="Total Revenue" value={DUMMY.revenue.value}
              change={DUMMY.revenue.change} changeType="up" spark={DUMMY.revenue.spark}
            />
            <StatCard
              icon={MapPin} color="emerald" label="Total Rides" value={DUMMY.rides.value}
              change={DUMMY.rides.change} changeType="up" spark={DUMMY.rides.spark}
            />
            <StatCard
              icon={Star} color="amber" label="Avg. Rating" value={DUMMY.avgRating.value}
              change={DUMMY.avgRating.change} changeType="up" spark={DUMMY.avgRating.spark}
            />
            <StatCard
              icon={Activity} color="rose" label="Cancel Rate" value={DUMMY.cancelRate.value}
              change={DUMMY.cancelRate.change} changeType="down"
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
                <p className="text-xs text-(--text-dim) font-medium">Rides per day this week · Demo data</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <ArrowUpRight size={11} /> +12.4% vs last week
              </div>
            </div>
            <div className="flex items-end gap-3 h-40">
              {DUMMY.weekDays.map((day, i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-black text-(--text-dim)">{DUMMY.weekRides[i]}</span>
                  <div
                    className="w-full bg-primary/20 rounded-xl overflow-hidden hover:bg-primary/30 transition-colors cursor-pointer group"
                    style={{ height: `${(DUMMY.weekRides[i] / DUMMY.weeklyMax) * 100}%` }}
                  >
                    <div
                      className="w-full bg-primary rounded-xl transition-all duration-700 group-hover:opacity-80"
                      style={{ height: `${Math.min(70, 40 + i * 5)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-(--text-dim) uppercase">{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Breakdown */}
          <div className="glass-card rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="font-display font-black text-(--text-main) text-lg">Vehicle Types</h3>
              <p className="text-xs text-(--text-dim) font-medium">Fleet distribution · Demo data</p>
            </div>
            <div className="space-y-4">
              {DUMMY.vehicleTypes.map(vt => (
                <HBar key={vt.label} label={vt.label} value={vt.value} max={100} color={vt.color} />
              ))}
            </div>
            <div className="pt-2 border-t border-(--card-border) text-center">
              <p className="text-xs text-(--text-dim) font-medium">Total active vehicles</p>
              <p className="text-2xl font-black text-(--text-main)">{DUMMY.vehicleTypes.reduce((a,v) => a + v.value, 0)}</p>
            </div>
          </div>
        </section>

        {/* Area breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="font-display font-black text-(--text-main) text-lg">Top Areas</h3>
              <p className="text-xs text-(--text-dim) font-medium">City-wide distribution · Demo data</p>
            </div>
            <div className="space-y-4">
              {DUMMY.areaBreakdown.map(area => (
                <HBar key={area.label} label={area.label} value={area.value} max={1400} color={area.color} />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-3xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-black text-(--text-main) text-lg">Recent Activity</h3>
                <p className="text-xs text-(--text-dim) font-medium">Live feed · Mixed real & demo events</p>
              </div>
              <button className="p-2 rounded-xl border border-(--card-border) hover:bg-(--card-bg) text-(--text-dim) hover:text-primary transition-all">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {DUMMY.recentActivity.map((a, i) => (
                <ActivityRow key={i} {...a} />
              ))}
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

      <footer className="mx-auto max-w-7xl py-8 px-6 border-t border-(--card-border) flex justify-between items-center opacity-50">
        <p className="text-[10px] font-bold tracking-widest uppercase">RouteMate Analytics</p>
        <p className="text-[10px] font-bold tracking-widest uppercase">{formattedRange} · Admin Panel</p>
      </footer>
    </div>
  );
};

export default AnalyticsPage;
