import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";
import {
  MapPin,
  Car,
  Clock,
  Star,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  Navigation,
  Wallet,
  Calendar,
  BarChart2,
  Shield,
  UserCheck,
  Plus,
  Circle,
  FileCheck,
  User,
} from "lucide-react";
import ThemeToggle from "../components/ui/ThemeToggle";

// ─── Role-specific configs ───────────────────────────────────────────────────
const ROLE_CARDS = {
  passenger: [
    {
      icon: Navigation,
      title: "Book a Ride",
      desc: "Find a driver near you instantly",
      color: "primary",
      href: "/passenger/dashboard/ride",
    },
    {
      icon: Clock,
      title: "My Trips",
      desc: "View your ride history",
      color: "violet",
      href: "/passenger/dashboard/history",
    },
    {
      icon: MapPin,
      title: "Saved Places",
      desc: "Home, work and favourite spots",
      color: "emerald",
      href: "/passenger/dashboard/places",
    },
    {
      icon: Star,
      title: "Rate & Review",
      desc: "Share your experience",
      color: "amber",
      href: "/passenger/dashboard/reviews",
    },
    {
      icon: Wallet,
      title: "Payments",
      desc: "Manage cards and wallet balance",
      color: "rose",
      href: "/passenger/dashboard/payments",
    },
    {
      icon: Users,
      title: "Refer a Friend",
      desc: "Earn credits for every referral",
      color: "cyan",
      href: "/passenger/dashboard/referral",
    },
    {
      icon: User,
      title: "My Profile",
      desc: "Manage your personal information",
      color: "violet",
      href: "/passenger/dashboard/profile",
    },
  ],
  driver: [
    {
      icon: Car,
      title: "Go Online",
      desc: "Start accepting ride requests",
      color: "emerald",
      href: "/driver/dashboard/go-online",
    },
    {
      icon: TrendingUp,
      title: "My Earnings",
      desc: "Track daily and weekly income",
      color: "primary",
      href: "/driver/dashboard/earnings",
    },
    {
      icon: Calendar,
      title: "My Schedule",
      desc: "Plan your driving hours",
      color: "violet",
      href: "/driver/dashboard/schedule",
    },
    {
      icon: MapPin,
      title: "Active Rides",
      desc: "View ongoing trip details",
      color: "amber",
      href: "/driver/dashboard/active-rides",
    },
    {
      icon: Star,
      title: "My Rating",
      desc: "See passenger feedback",
      color: "rose",
      href: "/driver/dashboard/rating",
    },
    {
      icon: Wallet,
      title: "Payouts",
      desc: "Withdraw your earnings",
      color: "cyan",
      href: "/driver/dashboard/payouts",
    },
    {
      icon: Clock,
      title: "My Rides",
      desc: "View your completed rides",
      color: "violet",
      href: "/driver/dashboard/history",
    },
    {
      icon: FileCheck,
      title: "My Profile",
      desc: "Manage your driver credentials",
      color: "violet",
      href: "/driver/dashboard/profile",
    },
  ],
  admin: [
    {
      icon: Users,
      title: "User Management",
      desc: "Manage passengers and drivers",
      color: "primary",
      href: "/admin/dashboard/manage-users",
    },
    {
      icon: BarChart2,
      title: "Analytics",
      desc: "Platform metrics and reports",
      color: "violet",
      href: "/admin/dashboard/analytics",
    },
    {
      icon: Car,
      title: "Fleet Overview",
      desc: "Monitor all active vehicles",
      color: "emerald",
      href: "/admin/dashboard/fleet",
    },
    {
      icon: Shield,
      title: "Security",
      desc: "Audit logs and access control",
      color: "rose",
      href: "/admin/dashboard/security",
    },
    {
      icon: UserCheck,
      title: "Driver Approvals",
      desc: "Review pending applications",
      color: "amber",
      href: "/admin/dashboard/driver-approvals",
    },
    {
      icon: Settings,
      title: "System Settings",
      desc: "Configure platform options",
      color: "cyan",
      href: "/admin/dashboard/settings",
    },
  ],
};

const MOCK_HISTORY = {
  passenger: [
    {
      id: 1,
      type: "Ride",
      from: "Central Park",
      to: "Times Square",
      date: "Oct 12, 2023",
      status: "Completed",
      amount: "₹150",
      icon: Navigation,
    },
    {
      id: 2,
      type: "Ride",
      from: "JFK Airport",
      to: "Brooklyn",
      date: "Oct 10, 2023",
      status: "Completed",
      amount: "₹450",
      icon: MapPin,
    },
  ],
  driver: [
    {
      id: 1,
      type: "Income",
      from: "City Center",
      to: "Green Valley",
      date: "Oct 12, 2023",
      status: "Completed",
      amount: "+₹320",
      icon: Wallet,
    },
    {
      id: 2,
      type: "Income",
      from: "West End",
      to: "North Gate",
      date: "Oct 11, 2023",
      status: "Completed",
      amount: "+₹280",
      icon: Car,
    },
  ],
  admin: [
    {
      id: 1,
      type: "Audit",
      user: "John Doe",
      action: "Account Verified",
      date: "Oct 12, 2023",
      status: "Success",
      icon: UserCheck,
    },
    {
      id: 2,
      type: "Fleet",
      user: "Cab #123",
      action: "Maintenance Logged",
      date: "Oct 12, 2023",
      status: "Success",
      icon: Shield,
    },
  ],
};

const COLOR_MAP = {
  primary: {
    bg: "bg-primary/10",
    icon: "text-primary",
    border: "border-primary/20",
    hover: "hover:border-primary/40 hover:bg-primary/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    icon: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
    hover: "hover:border-violet-500/40 hover:bg-violet-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    hover: "hover:border-emerald-500/40 hover:bg-emerald-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    hover: "hover:border-amber-500/40 hover:bg-amber-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    icon: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
    hover: "hover:border-rose-500/40 hover:bg-rose-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    icon: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20",
    hover: "hover:border-cyan-500/40 hover:bg-cyan-500/20",
  },
};

const ROLE_LABELS = {
  passenger: {
    label: "Passenger",
    badge: "bg-primary/20 text-primary border border-primary/30",
  },
  driver: {
    label: "Driver",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  },
  admin: {
    label: "Admin",
    badge: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
  },
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const role = user?.role || "passenger";

  // Default fallback stats (demo)
  const defaultStats = {
    passenger: [
      { label: "Total Trips", value: "0" },
      { label: "Saved Places", value: "0" },
      { label: "Wallet", value: "₹0" },
    ],
    driver: [
      { label: "Today's Trips", value: "0" },
      { label: "Earnings", value: "₹0" },
      { label: "Rating", value: "0.0" },
    ],
    admin: [
      { label: "Users", value: "0" },
      { label: "Active", value: "0" },
      { label: "Revenue", value: "₹0" },
    ],
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        if (user?.role === "admin") {
          const { data } = await api.get("/admin/dashboard-stats");
          if (data.success) {
            setStats([
              { label: "Users", value: data.stats.counts.total.toLocaleString() },
              { label: "Active", value: data.stats.drivers.online.toLocaleString() },
              { label: "Revenue", value: `₹${(data.stats.business.revenue / 1000).toFixed(1)}K` },
            ]);
          }
        } else {
          setStats(defaultStats[user?.role || "passenger"]);
        }
      } catch (err) {
        console.error("Dashboard Stats Fetch Error:", err);
        setStats(defaultStats[user?.role || "passenger"]);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardStats();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  const cards = ROLE_CARDS[role] || ROLE_CARDS.passenger;
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.passenger;
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="group cursor-pointer transition-transform duration-300 hover:scale-105">
              <span className="font-display text-2xl font-bold tracking-tighter">
                <span className="bg-linear-to-br from-(--text-main) to-(--text-dim) bg-clip-text text-transparent italic">
                  Route
                </span>
                <span className="text-primary">Mate</span>
              </span>
            </div>

            <nav className="hidden items-center gap-6 lg:flex">
              <span className="text-primary after:bg-primary relative text-xs font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:rounded-full after:content-[''] cursor-default">
                Dashboard
              </span>
              <Link
                to={`/${user?.role}/dashboard/history`}
                className="text-xs font-medium text-(--text-dim) transition-colors hover:text-(--text-main)"
              >
                History
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="relative">
              <button 
                onClick={() => navigate(`/${role}/dashboard/notifications`)}
                className="relative rounded-xl border border-(--card-border) bg-(--card-bg) p-2.5 text-(--text-dim) shadow-lg backdrop-blur-md transition-all duration-300 hover:text-primary"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 flex h-2 w-2 items-center justify-center rounded-full bg-amber-500 border-2 border-(--bg-main)">
                  </span>
                )}
              </button>
            </div>

            <div 
              onClick={() => navigate(`/${user?.role}/dashboard/profile`)}
              className="group flex cursor-pointer items-center gap-3 border-l border-(--card-border) pl-4 hover:opacity-80 transition-all"
            >
              <div className="hidden text-right sm:block">
                <p className="text-primary mb-0.5 text-[9px] font-bold tracking-[0.2em] uppercase opacity-80">
                  {role}
                </p>
                <p className="group-hover:text-primary text-sm leading-none font-semibold text-(--text-main) transition-all">
                  {user?.name || "User"}
                </p>
              </div>
              <div className="relative">
                <div className="from-primary via-primary-dark to-primary shadow-primary/10 group-hover:shadow-primary/30 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br font-bold text-black shadow-lg transition-all duration-500">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="ml-1 rounded-xl bg-red-500/10 p-2 text-red-500 transition-all hover:bg-red-500 hover:text-white"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Hero Section */}
        <section className="glass-card group relative overflow-hidden rounded-4xl p-8 lg:p-10">
          <div className="bg-primary/5 group-hover:bg-primary/10 pointer-events-none absolute top-0 right-0 h-full w-[50%] rounded-full blur-3xl transition-all duration-700" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[9px] font-bold tracking-widest uppercase ${roleInfo.badge}`}
                >
                  {roleInfo.label}
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-bold tracking-widest text-emerald-400 uppercase">
                  <Circle
                    size={5}
                    fill="currentColor"
                    className="animate-pulse"
                  />{" "}
                  Active
                </span>
                <button 
                  onClick={() => navigate(`/${role}/dashboard/notifications`)}
                  className="group/notify flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-bold tracking-widest text-primary uppercase cursor-pointer hover:bg-primary hover:text-black transition-all duration-300"
                >
                  <Bell size={10} className="group-hover/notify:animate-bounce" /> 
                  <span className="relative">
                    {unreadCount > 0 ? `${unreadCount} New Notifications` : "View Notifications"}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                      </span>
                    )}
                  </span>
                </button>
              </div>
              <h1 className="font-display text-3xl leading-tight font-bold tracking-tighter text-(--text-main) lg:text-4xl">
                Hello,{" "}
                <span className="from-primary to-primary-dark bg-linear-to-r bg-clip-text px-1 text-transparent">
                  {firstName}!
                </span>
              </h1>
              <p className="md:text-md max-w-md text-base leading-relaxed font-medium text-(--text-dim)">
                {loading ? "Fetching latest platform updates..." : "Welcome back! Ready for your next journey today?"}
              </p>
            </div>

            {/* Quick Stats */}
            <div className={`grid grid-cols-3 gap-4 rounded-3xl border border-(--card-border) bg-black/5 p-6 shadow-sm backdrop-blur-md md:gap-8 dark:bg-black/20 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
              {stats.map((s, i) => (
                <div key={i} className="min-w-17.5 text-center">
                  <p className="mb-0.5 text-xl font-black text-(--text-main) md:text-2xl transition-all">
                    {s.value}
                  </p>
                  <p className="text-[8px] leading-none font-black tracking-widest text-(--text-dim) uppercase">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Action Grid */}
        <section>
          <div className="mb-6 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              {role === "admin" ? "Platform Control" : "Your Travel Panel"}{" "}
              <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, i) => {
              const c = COLOR_MAP[card.color];
              const Icon = card.icon;
              return (
                <button
                  key={i}
                  onClick={() => card.href !== "#" && navigate(card.href)}
                  className={`group glass-card relative cursor-pointer rounded-3xl p-6 text-left transition-all duration-300 hover:-translate-y-1 ${c.hover} border-(--card-border) shadow-sm`}
                >
                  <div
                    className={`h-12 w-12 ${c.bg} ${c.icon} group-hover:bg-primary mb-6 flex items-center justify-center rounded-xl transition-all duration-500 group-hover:text-black`}
                  >
                    <Icon size={24} />
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display mb-1 text-base font-black text-(--text-main)">
                        {card.title}
                      </h3>
                      <p className="text-xs leading-relaxed font-medium text-(--text-dim)">
                        {card.desc}
                      </p>
                    </div>
                    <div className="group-hover:bg-primary flex h-8 w-8 items-center justify-center rounded-full bg-(--card-bg) text-slate-600 transition-all duration-300 group-hover:text-black">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recent History Section */}
        <section id="history" className="space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Recent Activity <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
            <Link to={`/${user?.role}/dashboard/history`} className="text-primary text-xs font-bold hover:underline cursor-pointer">
              View All History
            </Link>
          </div>

          <div className="glass-card overflow-hidden rounded-3xl">
            <div className="divide-y divide-(--card-border)">
              {(MOCK_HISTORY[role] || []).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/${user?.role}/dashboard/history`)}
                  className="group flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl transition-all group-hover:bg-primary group-hover:text-black">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-(--text-main)">
                        {role === "admin" ? item.action : `${item.from} → ${item.to}`}
                      </p>
                      <p className="text-[10px] font-medium text-(--text-dim) uppercase tracking-wider">
                        {item.date} • {role === "admin" ? item.user : item.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-(--text-main)">
                      {item.amount || item.status}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                      <Circle size={4} fill="currentColor" /> {item.status || "Completed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Promotion */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="from-primary to-primary-dark group border-primary/20 relative overflow-hidden rounded-3xl border bg-linear-to-r p-8 shadow-lg lg:col-span-2">
            <div className="translate-y--10 absolute top-0 right-0 h-64 w-64 translate-x-10 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-110 dark:bg-white/5" />
            <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h3 className="font-display mb-2 text-2xl font-black text-black">
                  Upgrade to Plus
                </h3>
                <p className="mb-5 max-w-70 text-sm font-bold text-black/80">
                  Get priority pickups and zero surge pricing.
                </p>
                <button className="rounded-xl bg-black px-6 py-2.5 text-xs font-black text-white transition-all hover:-translate-y-px">
                  Explore Now
                </button>
              </div>
              <div className="hidden h-20 w-20 items-center justify-center rounded-full border-4 border-black/10 bg-black/10 md:flex">
                <Shield size={36} className="text-black" />
              </div>
            </div>
          </div>

          <div className="glass-card border-primary/20 flex flex-col justify-between rounded-3xl p-8 shadow-sm">
            <div className="space-y-3">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <Star size={20} fill="currentColor" />
              </div>
              <h3 className="font-display text-base font-black text-(--text-main)">
                Referral
              </h3>
              <p className="text-xs font-medium text-(--text-dim)">
                Earn credit for every friend who joins.
              </p>
            </div>
            <button className="text-primary hover:bg-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-3 text-xs font-black transition-all hover:text-black">
              Share Link <Plus size={14} />
            </button>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl border-t border-(--card-border) px-6 py-10 text-center">
        <p className="text-[9px] font-black tracking-[0.3em] text-(--text-dim) uppercase">
          RouteMate • © 2026
        </p>
      </footer>
    </div>
  );
};

export default DashboardPage;

