import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";
import { getPassengerHistory, getDriverHistory } from "../services/rideService";
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
  Mail,
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
      title: "My Rides",
      desc: "Live track upcoming bookings",
      color: "amber",
      href: "/passenger/dashboard/my-rides",
    },
    {
      icon: Clock,
      title: "History",
      desc: "View your past trips",
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

// Real history fetched from backend in useEffect
const ACTIVITIES_INITIAL = [];

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
  const [activities, setActivities] = useState([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const role = user?.role || "passenger";

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [modalSettings, setModalSettings] = useState({
    pushNotifs: false,
    emailNotifs: false,
    locationTracking: false,
  });

  useEffect(() => {
    // Check if user has configured settings on first visit
    const stored = localStorage.getItem("appSettings");
    if (!stored) {
      setShowSettingsModal(true);
    }
  }, []);

  const saveModalSettings = () => {
    const freshSettings = { ...modalSettings, hasConfigured: true };
    localStorage.setItem("appSettings", JSON.stringify(freshSettings));
    setShowSettingsModal(false);
  };

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
          const statsRes = await api.get("/admin/dashboard-stats");
          if (statsRes.data.success && statsRes.data.stats) {
            const adminStats = statsRes.data.stats;
            setStats([
              { label: "Users", value: adminStats.counts.total.toLocaleString() },
              { label: "Active", value: adminStats.counts.activeUsers.toLocaleString() },
              { label: "Revenue", value: `₹${(adminStats.business.revenue / 1000).toFixed(1)}K` },
            ]);
          }

          // Fetch Recent Activity for Admin
          const logsRes = await api.get("/admin/audit-logs?limit=5");
          if (logsRes.data.success && logsRes.data.logs) {
            setActivities(logsRes.data.logs.map(log => ({
                id: log.id,
                action: log.action,
                user: log.actor,
                date: new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                status: "Success",
                icon: log.category === 'driver' ? FileCheck : (log.category === 'security' ? Shield : Settings)
            })));
          }
        } else {
          // Fetch Real Stats and Activity for Passenger/Driver
          const fetchFn = user.role === "driver" ? getDriverHistory : getPassengerHistory;
          const liveEndpoint = user.role === "driver" ? "/published-rides/my-published" : "/published-rides/my-booked";
          
          const [historyRes, liveRes] = await Promise.all([
            fetchFn({ limit: 10 }),
            api.get(liveEndpoint).catch(() => ({ data: { data: [] } }))
          ]);
          
          if (historyRes.data.success) {
            const { stats: s, rides } = historyRes.data.data;
            const liveRides = liveRes.data?.data || [];
            
            // Adjust stats to include live rides if needed
            if (user.role === "driver") {
              setStats([
                { label: "Total Rides", value: (s.totalRides + liveRides.filter(r => r.status === 'completed').length).toString() },
                { label: "Earnings", value: `₹${s.totalEarnings.toLocaleString()}` },
                { label: "Published", value: liveRides.filter(r => r.status === 'open' || r.status === 'active').length.toString() },
              ]);
            } else {
              setStats([
                { label: "Total Trips", value: s.totalRides.toString() },
                { label: "Active", value: liveRides.filter(r => r.status === 'active').length.toString() }, 
                { label: "Total Spent", value: `₹${s.totalSpent.toLocaleString()}` },
              ]);
            }

            if (user.role === "driver") {
              // ── DRIVER: Merge published rides + trip history into one unified timeline ──

              // Published rides → simplified for single fixed-price booking
              const publishedActivities = liveRides
                .filter(r => r.status !== "completed" && r.status !== "cancelled")
                .map(ride => {
                const confirmedBooking = (ride.bookings || []).find(b => b.status === "confirmed");
                const passengerName = confirmedBooking?.passenger?.name || null;
                const dep = new Date(ride.departureTime);
                const isToday = dep.toDateString() === new Date().toDateString();
                const statusLabel = ride.status === "active" ? "Active"
                  : ride.status === "arrived" ? "At Pickup"
                  : ride.status === "completed" ? "Completed"
                  : ride.status === "open" ? "Open"
                  : ride.status.charAt(0).toUpperCase() + ride.status.slice(1);

                return {
                  id: ride._id,
                  type: ride.vehicleType?.toUpperCase() || "RIDE",
                  subType: passengerName ? `Passenger: ${passengerName}` : confirmedBooking ? "1 booking" : "No booking yet",
                  from: ride.source?.address?.split(',')[0] || "Unknown",
                  to: ride.destination?.address?.split(',')[0] || "Unknown",
                  date: isToday
                    ? dep.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : dep.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                  rawDate: dep,
                  status: statusLabel,
                  amount: ride.price ? `₹${ride.price}` : "—",
                  icon: Car,
                  isLive: true,
                  rideId: ride._id,
                };
              });

              // Trip history → completed trips with fare
              const tripActivities = rides.map(ride => ({
                id: ride._id,
                type: "Trip",
                subType: "Completed",
                from: ride.source?.address?.split(',')[0] || "Unknown",
                to: ride.destination?.address?.split(',')[0] || "Unknown",
                date: new Date(ride.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                rawDate: new Date(ride.createdAt),
                status: ride.phase.charAt(0).toUpperCase() + ride.phase.slice(1),
                amount: `₹${ride.fare?.total || 0}`,
                icon: Navigation,
                isLive: false,
              }));

              // Merge and sort newest first — deduplicate by id
              const seenIds = new Set();
              const merged = [...publishedActivities, ...tripActivities]
                .filter(a => { if (seenIds.has(a.id)) return false; seenIds.add(a.id); return true; })
                .sort((a, b) => b.rawDate - a.rawDate)
                .slice(0, 10);

              setActivities(merged);
            } else {
              // ── PASSENGER: live bookings shown above, history below ──
              const activeActivities = liveRides
                .filter(r => r.status !== 'completed')
                .map(ride => {
                  const myBooking = ride.myBookings?.[0];
                  const displayStatus = myBooking?.status === 'cancelled' ? 'REJECTED' : ride.status.toUpperCase();
                  // Use passenger's own pickup/dropoff — NOT the driver's published route endpoints
                  const from = myBooking?.passengerSource?.address?.split(',')[0]
                    || ride.source?.address?.split(',')[0] || 'Unknown';
                  const to = myBooking?.passengerDestination?.address?.split(',')[0]
                    || ride.destination?.address?.split(',')[0] || 'Unknown';
                  return {
                    id: ride._id,
                    type: (ride.vehicleType || 'RIDE').toUpperCase(),
                    from,
                    to,
                    date: new Date(ride.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    rawDate: new Date(ride.departureTime),
                    status: displayStatus,
                    amount: myBooking?.amountPaid ? `₹${myBooking.amountPaid}` : (ride.vehicleType || 'PRIME').toUpperCase(),
                    icon: Car,
                    isLive: true,
                    bookingStatus: myBooking?.status
                  };
                });

              const activityHistory = rides.map(ride => ({
                id: ride._id,
                type: "Trip",
                from: ride.source?.address?.split(',')[0] || "Unknown",
                to: ride.destination?.address?.split(',')[0] || "Unknown",
                date: new Date(ride.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                rawDate: new Date(ride.createdAt),
                status: ride.phase.charAt(0).toUpperCase() + ride.phase.slice(1),
                amount: `₹${ride.fare?.total || 0}`,
                icon: Navigation
              }));

              setActivities([...activeActivities, ...activityHistory].slice(0, 8));
            }
          }
        }
      } catch (err) {
        console.error("Dashboard Data Fetch Error:", err);
        setStats(defaultStats[role]);
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
              onClick={() => navigate(`/${role}/dashboard/settings`)}
              className="ml-1 rounded-xl bg-primary/10 p-2 text-primary transition-all hover:bg-primary hover:text-black"
            >
              <Settings size={18} />
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

        {/* Live Bookings Section (FOR PASSENGERS) */}
        {role === "passenger" && activities.filter(a => a.isLive).length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
                My Current Bookings <span className="bg-amber-500 h-1.5 w-1.5 rounded-full animate-pulse"></span>
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
               {activities.filter(a => a.isLive).map((item) => (
                 <div 
                   key={item.id} 
                 onClick={() => navigate(`/pickup-map/${item.id}`)}
                   className={`glass-card group relative overflow-hidden rounded-3xl p-5 border cursor-pointer hover:scale-[1.01] transition-all ${item.bookingStatus === 'cancelled' ? 'border-red-500/30 bg-red-500/5' : 'border-primary/30 bg-primary/5'}`}
                 >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${item.bookingStatus === 'cancelled' ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                          <Car size={20} />
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-start gap-3">
                            <MapPin size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-black text-(--text-main) line-clamp-1">{item.from}</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] font-bold text-(--text-dim) line-clamp-1">{item.to}</p>
                          </div>
                          <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest leading-none mt-1 ml-6">{item.amount}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest uppercase ${item.bookingStatus === 'cancelled' ? 'bg-red-500/20 text-red-500 border-red-500/30' : item.bookingStatus === 'confirmed' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'}`}>
                        {item.status}
                      </div>
                    </div>
                    {item.bookingStatus === 'cancelled' ? (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-500/10">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                         <p className="text-[10px] font-bold text-red-500/80 italic">This request was declined by the driver. Please try a different ride.</p>
                      </div>
                    ) : item.bookingStatus === 'confirmed' ? (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-500/10">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                         <p className="text-[10px] font-bold text-emerald-500/80 italic">Booking confirmed! Tap to track driver live.</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-500/10">
                         <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                         <p className="text-[10px] font-bold text-amber-500/80 italic">Waiting for driver to confirm your seat...</p>
                      </div>
                    )}
                 </div>
               ))}
            </div>
          </section>
        )}

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
              {/* Passengers: only show trip history (not live bookings, already shown above) */}
              {role === "passenger" && (
                activities.filter(a => !a.isLive).length > 0
                  ? (
                    <>
                    {activities.filter(a => !a.isLive).slice(0, isHistoryExpanded ? undefined : 3).map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start justify-between p-5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-6 bg-white/10" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                             <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                             <p className="text-[17px] leading-none font-bold text-(--text-main) line-clamp-1">{item.from}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <MapPin size={14} className="text-red-500 flex-shrink-0" />
                             <p className="text-sm font-medium text-(--text-dim) line-clamp-1">{item.to}</p>
                          </div>
                          <p className="text-[11px] font-bold text-(--text-dim) uppercase tracking-wider pl-6 pt-1">
                            {item.date} • {item.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-between h-full min-h-[60px] pl-4">
                        <p className="text-lg leading-none font-black text-(--text-main)">{item.amount || item.status}</p>
                        <span className="inline-flex items-center justify-end gap-1.5 text-[11px] font-bold text-emerald-500 pt-2">
                          <Circle size={5} fill="currentColor" /> {item.status || "Completed"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activities.filter(a => !a.isLive).length > 3 && (
                    <button 
                      onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                      className="w-full p-4 flex items-center justify-center gap-2 text-(--text-main) rounded-b-3xl font-bold text-xs uppercase tracking-widest bg-(--card-bg) hover:bg-primary/5 transition-colors border-t border-(--card-border)"
                    >
                      {isHistoryExpanded ? "Hide Past Trips" : "View More Past Trips"}
                      <ChevronRight size={14} className={`transition-transform duration-300 ${isHistoryExpanded ? "-rotate-90" : "rotate-90"}`} />
                    </button>
                  )}
                  </>
                  )
                  : (
                    <div className="p-10 text-center opacity-50">
                      <p className="text-xs font-bold uppercase tracking-widest">No Past Trips Found</p>
                    </div>
                  )
              )}

              {/* Drivers & Admins: show full unified activity list */}
              {role !== "passenger" && (
                activities.length > 0
                  ? (
                    <>
                    {activities.slice(0, isHistoryExpanded ? undefined : 3).map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start justify-between p-5 transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      onClick={() => {
                        if (item.rideId && role === "driver") navigate(`/driver/dashboard/active-rides`);
                      }}
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Live indicator dot */}
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-6 ${
                          item.isLive ? "bg-emerald-500 animate-pulse" : "bg-white/10 dark:bg-white/20"
                        }`} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                             <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                             <p className="text-[17px] leading-none font-bold text-(--text-main) line-clamp-1">
                               {role === "admin" ? item.action : item.from}
                             </p>
                          </div>
                          {role !== "admin" && (
                             <div className="flex items-center gap-2">
                               <MapPin size={14} className="text-red-500 flex-shrink-0" />
                               <p className="text-sm font-medium text-(--text-dim) line-clamp-1">{item.to}</p>
                             </div>
                          )}
                          <p className="text-[11px] font-bold text-(--text-dim) uppercase tracking-wider pl-6 pt-1">
                            {item.date} • {role === "admin" ? item.user : item.type}
                            {item.subType && <span className="ml-1 uppercase">• {item.subType}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-between h-full min-h-[60px] flex-shrink-0 pl-4">
                        <p className="text-lg leading-none font-black text-(--text-main)">{item.amount || "—"}</p>
                        <span className={`inline-flex items-center justify-end gap-1.5 text-[11px] font-bold pt-2 ${
                          item.isLive ? "text-emerald-500" 
                          : (item.status === "Completed" || item.status === "COMPLETED") ? "text-emerald-500"
                          : "text-white/40"
                        }`}>
                          <Circle size={5} fill="currentColor" /> {item.status || "Completed"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activities.length > 3 && (
                    <button 
                      onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                      className="w-full p-4 flex items-center rounded-b-3xl justify-center gap-2 text-(--text-main) font-bold text-xs uppercase tracking-widest bg-(--card-bg) hover:bg-primary/5 transition-colors border-t border-(--card-border)"
                    >
                      {isHistoryExpanded ? "Hide Past Activity" : "View More Past Activity"}
                      <ChevronRight size={14} className={`transition-transform duration-300 ${isHistoryExpanded ? "-rotate-90" : "rotate-90"}`} />
                    </button>
                  )}
                  </>
                  )
                  : (
                    <div className="p-10 text-center opacity-50">
                      <p className="text-xs font-bold uppercase tracking-widest">No Recent Activity Found</p>
                    </div>
                  )
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Settings Permission Modal Workflow */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden border-(--card-border)">
            <div className="absolute top-0 left-0 w-full h-2 from-primary to-primary-dark bg-linear-to-r" />
            <div className="mb-6 flex justify-center">
               <div className="bg-primary/20 p-4 rounded-full text-primary">
                 <Settings size={36} />
               </div>
            </div>
            <h2 className="font-display text-2xl font-black text-center text-(--text-main) mb-2">Enhance Your Experience</h2>
            <p className="text-sm font-medium text-center text-(--text-dim) mb-8">
              Enable the following settings manually to get real-time ride updates and the best driver matching.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <div className="mr-4 flex items-start gap-3">
                  <Bell className="text-primary mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-sm text-(--text-main)">Push Notifications</p>
                    <p className="text-[10px] text-(--text-dim) mt-0.5">Alerts you about your ride status</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModalSettings(prev => ({...prev, pushNotifs: !prev.pushNotifs}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${modalSettings.pushNotifs ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${modalSettings.pushNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <div className="mr-4 flex items-start gap-3">
                  <Mail className="text-amber-500 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-sm text-(--text-main)">Email Alerts</p>
                    <p className="text-[10px] text-(--text-dim) mt-0.5">OTP verification and crucial updates</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModalSettings(prev => ({...prev, emailNotifs: !prev.emailNotifs}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${modalSettings.emailNotifs ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${modalSettings.emailNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                <div className="mr-4 flex items-start gap-3">
                  <Navigation className="text-emerald-500 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-sm text-(--text-main)">Location Tracking</p>
                    <p className="text-[10px] text-(--text-dim) mt-0.5">Shows drivers your exact pickup spot</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModalSettings(prev => ({...prev, locationTracking: !prev.locationTracking}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${modalSettings.locationTracking ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${modalSettings.locationTracking ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <button 
              onClick={saveModalSettings}
              className="w-full bg-primary text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-primary/20"
            >
              Continue to Dashboard <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <footer className="mx-auto max-w-6xl border-t border-(--card-border) px-6 py-10 text-center">
        <p className="text-[9px] font-black tracking-[0.3em] text-(--text-dim) uppercase">
          RouteMate • © 2026
        </p>
      </footer>
    </div>
  );
};

export default DashboardPage;

