import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { useLanguage } from "../context/LanguageContext";
import { useDialog } from "../context/DialogContext";

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");
  const normalizedPath = url.replace(/\\/g, "/");
  const path = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  return `${baseUrl}${path}`;
};
import api from "../services/api";
import socket from "../services/socket";
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
  IndianRupee,
  Activity,
  ShieldAlert,
} from "lucide-react";
import ThemeToggle from "../components/ui/ThemeToggle";
import Loader from "../components/ui/Loader";

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
      color: "indigo",
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
      title: "Manage Rides",
      desc: "View and delete/cancel published rides",
      color: "cyan",
      href: "/driver/dashboard/manage-rides",
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
      title: "Driver Wallet",
      desc: "Manage earnings & commission",
      color: "cyan",
      href: "/driver/dashboard/wallet",
    },
    {
      icon: FileCheck,
      title: "My Profile",
      desc: "Manage your driver credentials",
      color: "rose",
      href: "/driver/dashboard/profile",
    },
    {
      icon: IndianRupee,
      title: "Rate Card",
      desc: "View platform fare structure",
      color: "emerald",
      href: "/driver/dashboard/rate-card",
    },
  ],
  admin: [
    {
      icon: Users,
      title: "User Management",
      desc: "Manage passengers and drivers",
      color: "primary",
      href: "/:role/dashboard/manage-users",
    },
    {
      icon: BarChart2,
      title: "Analytics",
      desc: "Platform metrics and reports",
      color: "violet",
      href: "/:role/dashboard/analytics",
    },
    {
      icon: Car,
      title: "Fleet Overview",
      desc: "Monitor all active vehicles",
      color: "emerald",
      href: "/:role/dashboard/fleet",
    },
    /* {
      icon: Shield,
      title: "Security",
      desc: "Audit logs and access control",
      color: "rose",
      href: "/:role/dashboard/security",
    }, */
    {
      icon: UserCheck,
      title: "Driver Approvals",
      desc: "Review pending applications",
      color: "amber",
      href: "/:role/dashboard/driver-approvals",
    },
    {
      icon: ShieldAlert,
      title: "SOS Management",
      desc: "Emergency alerts and safety",
      color: "rose",
      href: "/:role/dashboard/sos",
    },
    {
      icon: IndianRupee,
      title: "Revenue Entries",
      desc: "Trip and date wise income",
      color: "emerald",
      href: "/:role/dashboard/revenue",
    },
    {
      icon: Settings,
      title: "System Settings",
      desc: "Configure platform options",
      color: "cyan",
      href: "/:role/dashboard/settings",
    },
    {
      icon: Wallet,
      title: "Owner Wallet",
      desc: "Manage platform funds & txns",
      color: "rose",
      href: "/passenger/dashboard/payments", // Re-using passenger wallet UI for superadmin
    },
  ],
};

// Real history fetched from backend in useEffect
const ACTIVITIES_INITIAL = [];

const COLOR_MAP = {
  primary: {
    bg: "bg-blue-500/10",
    icon: "text-blue-500",
    border: "border-blue-500/20",
    hover: "hover:border-blue-500/40 hover:bg-blue-500/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    icon: "text-violet-500",
    border: "border-violet-500/20",
    hover: "hover:border-violet-500/40 hover:bg-violet-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-500",
    border: "border-emerald-500/20",
    hover: "hover:border-emerald-500/40 hover:bg-emerald-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    icon: "text-amber-500",
    border: "border-amber-500/20",
    hover: "hover:border-amber-500/40 hover:bg-amber-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    icon: "text-rose-500",
    border: "border-rose-500/20",
    hover: "hover:border-rose-500/40 hover:bg-rose-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    icon: "text-cyan-500",
    border: "border-cyan-500/20",
    hover: "hover:border-cyan-500/40 hover:bg-cyan-500/20",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    icon: "text-indigo-500",
    border: "border-indigo-500/20",
    hover: "hover:border-indigo-500/40 hover:bg-indigo-500/20",
  },
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
  superadmin: {
    label: "Super Admin",
    badge: "bg-amber-500/20 text-amber-500 border border-amber-500/30",
  },
};

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const role = user?.role || "passenger";
  const configRole = (role === "superadmin") ? "admin" : role;
  const isSuper = role === "superadmin";
  const pathRole = role;

  const [stats, setStats] = useState(defaultStats[configRole] || defaultStats.passenger);
  const [activities, setActivities] = useState(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const { showAlert } = useDialog();
  const [hasLocationPermission, setHasLocationPermission] = useState(true);

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
    } else {
      const appSettings = JSON.parse(stored);
      if (appSettings.locationTracking === false) {
        setHasLocationPermission(false);
        // Add a slight delay to ensure the UI is mounted before firing the toast
        setTimeout(() => showAlert("You need to enable location for live tracking", "Location Disabled", "error"), 500);
      }
    }
  }, [showAlert]);

  const saveModalSettings = () => {
    const freshSettings = { ...modalSettings, hasConfigured: true };
    localStorage.setItem("appSettings", JSON.stringify(freshSettings));
    setShowSettingsModal(false);
  };



  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        if (user?.role === "admin" || user?.role === "superadmin") {
          const statsRes = await api.get("/admin/dashboard-stats");
          const walletRes = (user.role === "superadmin") ? await api.get("/payments/my-wallet").catch(() => null) : null;
          
          if (statsRes.data.success && statsRes.data.stats) {
            const adminStats = statsRes.data.stats;
            const isSuper = user.role === "superadmin";
            const liveWalletBalance = walletRes?.data?.success ? walletRes.data.wallet.walletBalance : (user.walletBalance || 0);

            const newStats = [
              { label: "Users", value: adminStats.counts.total.toLocaleString() },
              { label: "Active", value: adminStats.counts.activeUsers.toLocaleString() },
              { label: "Revenue", value: `₹${adminStats.business.revenue.toLocaleString()}` },
            ];
            
            setStats(newStats);
          }

          // Fetch Recent Activity for Admin
          const logsRes = await api.get("/admin/audit-logs?limit=5");
          if (logsRes.data.success && logsRes.data.logs) {
            setActivities(logsRes.data.logs.map(log => ({
                id: log.id,
                action: log.action,
                user: log.actor,
                role: log.actorRole,
                date: new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                status: "Success",
                icon: log.category === 'driver' ? FileCheck : (log.category === 'security' ? Shield : Settings)
            })));
          }
        } else {
          // Fetch Real Stats and Activity for Passenger/Driver
          const fetchFn = user.role === "driver" ? getDriverHistory : getPassengerHistory;
          const liveEndpoint = user.role === "driver" ? "/published-rides/my-published" : "/published-rides/my-booked";
          
          const profilePromise = user.role === "driver" ? api.get("/driver-profiles/my-profile").catch(() => null) : Promise.resolve(null);

          const [historyRes, liveRes, profileRes] = await Promise.all([
            fetchFn({ limit: 10 }),
            api.get(liveEndpoint).catch(() => ({ data: { data: [] } })),
            profilePromise
          ]);
          
          if (historyRes.data.success) {
            const { stats: s, rides } = historyRes.data.data;
            const liveRides = liveRes.data?.data || [];
            const driverProfile = profileRes?.data?.data;
            
            // Adjust stats to include live rides if needed
            if (user.role === "driver") {
              const publishedCount = liveRides.filter(r => r.status !== "completed" && r.status !== "cancelled" && r.status !== "expired").length;
              setStats([
                { label: "Completed", value: s.completedRides.toString() || "0" },
                { label: "Published", value: publishedCount.toString() },
                { label: "Rating", value: `${driverProfile?.averageRating?.toFixed(1) || "0.0"}` },
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
                .filter(r => r.status !== "completed" && r.status !== "cancelled" && r.status !== "expired")
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
                  from: ride.source?.address?.split(',').slice(0, 2).join(',') || "Unknown",
                  to: ride.destination?.address?.split(',').slice(0, 2).join(',') || "Unknown",
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
                subType: ride.phase === 'completed' ? 'Completed' : ride.phase === 'cancelled' ? 'Cancelled' : ride.phase.charAt(0).toUpperCase() + ride.phase.slice(1),
                from: ride.source?.address?.split(',').slice(0, 2).join(',') || "Unknown",
                to: ride.destination?.address?.split(',').slice(0, 2).join(',') || "Unknown",
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
                .filter(r => r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'expired')
                .map(ride => {
                  const myBooking = ride.myBookings?.[0];
                  const displayStatus = myBooking?.status === 'cancelled' ? 'REJECTED' : ride.status.toUpperCase();
                  // Use passenger's own pickup/dropoff — NOT the driver's published route endpoints
                  const from = myBooking?.passengerSource?.address?.split(',').slice(0, 2).join(',')
                    || ride.source?.address?.split(',').slice(0, 2).join(',') || 'Unknown';
                  const to = myBooking?.passengerDestination?.address?.split(',').slice(0, 2).join(',')
                    || ride.destination?.address?.split(',').slice(0, 2).join(',') || 'Unknown';
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
                    isLive: ride.status !== 'cancelled' && ride.status !== 'expired' && myBooking?.status !== 'cancelled', // Exclude if ride OR booking is cancelled
                    bookingStatus: myBooking?.status
                  };
                });

              const activityHistory = rides.map(ride => ({
                id: ride._id,
                publishedRideId: ride.publishedRide?._id || ride.publishedRide, // Link back to the original ride
                type: "Trip",
                from: ride.source?.address?.split(',').slice(0, 2).join(',') || "Unknown",
                to: ride.destination?.address?.split(',').slice(0, 2).join(',') || "Unknown",
                date: new Date(ride.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                rawDate: new Date(ride.createdAt),
                status: ride.phase.charAt(0).toUpperCase() + ride.phase.slice(1),
                amount: `₹${ride.fare?.total || 0}`,
                icon: Navigation,
                isLive: false
              }));

              // Deduplicate: If a ride is in both active and history, keep the active (live) one
              const seenRideIds = new Set();
              const merged = [...activeActivities, ...activityHistory]
                .filter(a => {
                  const rid = a.publishedRideId || a.id;
                  if (seenRideIds.has(rid)) return false;
                  seenRideIds.add(rid);
                  return true;
                })
                .slice(0, 10);

              setActivities(merged);
            }
          }
        }
      } catch (err) {
        console.error("Dashboard Data Fetch Error:", err);
        setStats(defaultStats[configRole]);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardStats();
  }, [user, unreadCount]);

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  // Listen for background ride status updates
  useEffect(() => {
    if (role === "passenger") {
      const handleStatusUpdate = (data) => {
        if (data.status === "reached") {
           // Redirect passenger immediately to payment UI
           navigate(`/passenger/live-tracking/${data.rideId}`);
        }
      };
      socket.on("ride_status_update", handleStatusUpdate);
      return () => {
        socket.off("ride_status_update", handleStatusUpdate);
      };
    }
  }, [role, navigate]);

  let cards = ROLE_CARDS[configRole] || ROLE_CARDS.passenger;

  // Filter sensitive links for regular admins
  if (role === "admin" && !isSuper) {
    cards = cards.filter(card => card.title !== "Analytics" && card.title !== "Revenue Entries");
  }

  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.passenger;
  const firstName = user?.name?.split(" ")[0] || "there";

  if (loading) return <Loader fullPage text="Navigate to your Dashboard..." />;

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div 
              onClick={() => navigate("/home")}
              className="group flex cursor-pointer items-center gap-2 transition-transform duration-300 hover:scale-105"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 p-1.5 transition-all group-hover:bg-primary/20">
                <img src="/images/logo/logo.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <span className="font-display text-xl font-bold tracking-tighter hidden sm:block">
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
                to={pathRole === "driver" ? "/driver/dashboard/manage-rides" : `/${pathRole}/dashboard/history`}
                className="text-xs font-medium text-(--text-dim) transition-colors hover:text-(--text-main)"
              >
                {pathRole === "driver" ? "Manage Rides" : "History"}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => navigate(`/${pathRole}/dashboard/notifications`)}
                className="relative rounded-xl border border-(--card-border) bg-(--card-bg) p-2.5 text-(--text-dim) transition-all duration-300 hover:text-(--text-main) hover:bg-(--total-border)"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 flex h-2 w-2 items-center justify-center rounded-full bg-primary animate-pulse">
                  </span>
                )}
              </button>
            </div>

            <div 
              onClick={() => navigate(`/${pathRole}/dashboard/profile`)}
              className="group flex cursor-pointer items-center gap-3 border-l border-(--card-border) pl-4 hover:opacity-80 transition-all"
            >
              <div className="hidden text-right sm:block">
                <p className={`mb-0.5 text-[9px] font-bold tracking-[0.2em] uppercase opacity-80 ${user?.role === 'superadmin' ? 'text-amber-500' : 'text-primary'}`}>
                  {user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : user?.role === 'driver' ? 'Driver' : 'Passenger'}
                </p>
                <p className="group-hover:text-primary text-sm leading-none font-semibold text-(--text-main) transition-all">
                  {user?.name || "User"}
                </p>
              </div>
              <div className="relative">
                <div className="from-primary via-primary-dark to-primary shadow-primary/10 group-hover:shadow-primary/30 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br font-bold text-black shadow-lg transition-all duration-500">
                  {user?.profileImage ? (
                    <img src={getImageUrl(user.profileImage)} alt="U" className="h-full w-full object-cover" />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/${pathRole}/dashboard/settings`)}
              className="ml-1 rounded-xl border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main) hover:bg-(--total-border)"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Missing Location Warning Banner */}
        {!hasLocationPermission && (
          <div className="glass-card border-primary bg-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-(--text-main)">Location Tracking Disabled</p>
                <p className="text-[11px] text-(--text-dim)">You need to enable location for live tracking.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/${pathRole}/dashboard/settings`)}
              className="px-6 py-2 bg-primary text-black text-xs font-black rounded-xl hover:bg-primary transition-all active:scale-95 shadow-lg shadow-amber-500/20 uppercase tracking-widest whitespace-nowrap"
            >
              Go to Settings
            </button>
          </div>
        )}

        {/* Pending Payment Alert */}
        {user?.accountStatus === "payment_due" && (
          <div className="glass-card border-red-500/30 bg-red-500/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-(--text-main)">Payment Due: ₹{user.dueBalance}</p>
                <p className="text-[11px] text-(--text-dim)">You have a pending cancellation penalty. Please clear it to book new rides.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate("/passenger/dashboard/ride")}
              className="px-6 py-2 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20 uppercase tracking-widest"
            >
              Pay Now
            </button>
          </div>
        )}

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
                  onClick={() => navigate(`/${pathRole}/dashboard/notifications`)}
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
                {loading ? "Fetching latest platform updates..." : `${t("welcomeBack")}! Ready for your next journey today?`}
              </p>
            </div>

            {/* Quick Stats */}
 <div className={`grid grid-cols-3 gap-4 rounded-3xl border border-(--card-border) bg-black/5 p-6 shadow-sm backdrop-blur-md md:gap-8 dark:bg-black/20 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
              {stats.map((s, i) => (
                <div key={i} className="min-w-17.5 text-center">
                  <p className="mb-0.5 text-xl font-black text-(--text-main) md:text-2xl transition-all">
                    {typeof s.value === 'string' && s.value.startsWith('₹') ? `₹${Math.round(parseFloat(s.value.replace(/[^0-9.]/g, ''))).toLocaleString()}` : s.value}
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
                  onClick={() => card.href !== "#" && navigate(card.href.replace(":role", pathRole))}
                  className={`group glass-card relative cursor-pointer rounded-3xl p-6 text-left transition-all duration-300 hover:-translate-y-1 ${c.hover} border-(--card-border) shadow-sm`}
                >
                  <div
                    className={`h-12 w-12 ${c.bg} ${c.icon} mb-6 flex items-center justify-center rounded-xl transition-all duration-500`}
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--card-bg) text-slate-600 transition-all duration-300">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Live Bookings Section (FOR PASSENGERS) */}
        {role === "passenger" && activities?.filter(a => a.isLive).length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
                My Current Bookings <span className="bg-amber-500 h-1.5 w-1.5 rounded-full animate-pulse"></span>
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
               {activities?.filter(a => a.isLive).map((item) => (
                 <div 
                   key={item.id} 
                   onClick={() => {
                      const isOngoing = ["IN_PROGRESS", "REACHED", "COMPLETED"].includes(item.status?.toUpperCase());
                      const targetPath = role === "passenger"
                        ? `/passenger/live-tracking/${item.id}`
                        : (isOngoing ? `/start-ride/${item.id}` : `/pickup-map/${item.id}`);
                      navigate(targetPath);
                    }}
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
              {t("recentActivity")} <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
            <Link 
              to={user?.role === "driver" ? "/driver/dashboard/manage-rides" : `/${user?.role}/dashboard/history`} 
              className="text-primary text-xs font-bold hover:underline cursor-pointer"
            >
              View All History
            </Link>
          </div>

          <div className="glass-card overflow-hidden rounded-3xl">
            <div className="divide-y divide-(--card-border)">
              {/* Passengers: only show trip history (not live bookings, already shown above) */}
              {role === "passenger" && (
                !loading && activities !== null && activities?.filter(a => !a.isLive).length > 0
                  ? (
                    <>
                    {activities?.filter(a => !a.isLive).slice(0, isHistoryExpanded ? undefined : 3).map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start justify-between p-5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-6 bg-white/10" />
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                             <p className="text-[17px] leading-none font-bold text-(--text-main) truncate">
                               {item.from}
                             </p>
                          </div>
                          <div className="flex items-center gap-2">
                             <MapPin size={14} className="text-red-500 flex-shrink-0" />
                             <p className="text-sm font-medium text-(--text-dim) truncate">{item.to}</p>
                          </div>
                          <p className="text-[11px] font-bold text-(--text-dim) uppercase tracking-wider pl-6 pt-1 truncate">
                            {item.date} • {item.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-between h-full min-h-[60px] pl-4 flex-shrink-0">
                        <p className="text-lg leading-none font-black text-(--text-main)">{item.amount || item.status}</p>
                        <span className={`inline-flex items-center justify-end gap-1.5 text-[11px] font-bold pt-2 ${
                          (item.status === 'Completed' || item.status === 'COMPLETED') ? 'text-emerald-500' : 
                          (item.status === 'REJECTED' || item.status === 'CANCELLED') ? 'text-red-500' : 'text-red-500'
                        }`}>
                          <Circle size={5} fill="currentColor" /> {item.status || "Completed"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activities.filter(a => !a.isLive).length > 3 && (
                    <button 
                      onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                      className="w-full p-4 flex items-center justify-center gap-2 text-black rounded-b-3xl font-black text-xs uppercase tracking-widest bg-primary hover:bg-primary-dark transition-colors shadow-lg shadow-primary/10"
                    >
                      {isHistoryExpanded ? "Hide Past Trips" : "View More Past Trips"}
                      <ChevronRight size={14} className={`transition-transform duration-300 ${isHistoryExpanded ? "-rotate-90" : "rotate-90"}`} />
                    </button>
                  )}
                  </>
                  )
                  : !loading && activities !== null ? (
                    <div className="p-10 text-center opacity-50">
                      <p className="text-xs font-bold uppercase tracking-widest">No Past Trips Found</p>
                    </div>
                  ) : (
                    <div className="p-10 flex flex-col items-center gap-2 opacity-30">
                       <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Trips...</p>
                    </div>
                  )
              )}

              {/* Drivers & Admins: show full unified activity list */}
              {role !== "passenger" && (
                !loading && activities !== null && activities.length > 0
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
                        <div className={`w-1 h-1 rounded-full flex-shrink-0 mt-6 ${
                          item.isLive ? "bg-emerald-500 animate-pulse" : "bg-white/20"
                        }`} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-sm md:text-base font-bold text-(--text-main) truncate w-full min-w-0">
                            {configRole === "admin" ? (
                              <p className="truncate leading-none">{item.action}</p>
                            ) : (
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <span className="truncate">{item.from}</span>
                                <ChevronRight size={12} className="opacity-40 flex-shrink-0" />
                                <span className="truncate text-(--text-dim) font-medium">{item.to}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">
                              {item.date} • {configRole === "admin" ? item.user : item.type}
                              {item.subType && item.subType !== "Completed" && item.subType !== "Cancelled" && (
                                <span className="ml-1 opacity-60">• {item.subType}</span>
                              )}
                            </p>
                            {configRole === "admin" && item.role === "superadmin" && (
                              <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md w-fit">
                                <UserCheck size={10} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">Super Admin</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-between h-full min-h-[50px] flex-shrink-0">
                        <div className="text-sm font-black text-(--text-main) ml-auto">{item.amount || "—"}</div>
                        <span className={`inline-flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest pt-2 ${
                          (item.status === "Completed" || item.status === "COMPLETED") ? "text-emerald-500" :
                          (item.status === "Cancelled" || item.status === "CANCELLED" || item.status === "Rejected" || item.status === "REJECTED") ? "text-red-500" :
                          "text-primary"
                        }`}>
                          <Circle size={4} fill="currentColor" className="opacity-50" /> {item.status || "Success"}
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
                  : !loading && activities !== null ? (
                    <div className="p-10 text-center opacity-50">
                      <p className="text-xs font-bold uppercase tracking-widest">No Recent Activity Found</p>
                    </div>
                  ) : (
                    <div className="p-10 flex flex-col items-center gap-2 opacity-30">
                       <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Retrieving Timeline...</p>
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
                  <Navigation className="text-primary mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-sm text-(--text-main)">Location Tracking</p>
                    <p className="text-[10px] text-(--text-dim) mt-0.5">Shows drivers your exact pickup spot</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModalSettings(prev => ({...prev, locationTracking: !prev.locationTracking}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${modalSettings.locationTracking ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
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

