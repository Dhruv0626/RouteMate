import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
      href: "#",
    },
    {
      icon: MapPin,
      title: "Saved Places",
      desc: "Home, work and favourite spots",
      color: "emerald",
      href: "#",
    },
    {
      icon: Star,
      title: "Rate & Review",
      desc: "Share your experience",
      color: "amber",
      href: "#",
    },
    {
      icon: Wallet,
      title: "Payments",
      desc: "Manage cards and wallet balance",
      color: "rose",
      href: "#",
    },
    {
      icon: Users,
      title: "Refer a Friend",
      desc: "Earn credits for every referral",
      color: "cyan",
      href: "#",
    },
  ],
  driver: [
    {
      icon: Car,
      title: "Go Online",
      desc: "Start accepting ride requests",
      color: "emerald",
      href: "#",
    },
    {
      icon: TrendingUp,
      title: "My Earnings",
      desc: "Track daily and weekly income",
      color: "primary",
      href: "#",
    },
    {
      icon: Calendar,
      title: "My Schedule",
      desc: "Plan your driving hours",
      color: "violet",
      href: "#",
    },
    {
      icon: MapPin,
      title: "Active Rides",
      desc: "View ongoing trip details",
      color: "amber",
      href: "#",
    },
    {
      icon: Star,
      title: "My Rating",
      desc: "See passenger feedback",
      color: "rose",
      href: "#",
    },
    {
      icon: Wallet,
      title: "Payouts",
      desc: "Withdraw your earnings",
      color: "cyan",
      href: "#",
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

const ROLE_STATS = (user) =>
  ({
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
  })[user?.role || "passenger"];

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  const role = user?.role || "passenger";
  const cards = ROLE_CARDS[role] || ROLE_CARDS.passenger;
  const stats = ROLE_STATS(user);
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
              <a
                href="#"
                className="text-primary after:bg-primary relative text-xs font-bold after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:rounded-full after:content-['']"
              >
                Dashboard
              </a>
              <a
                href="#"
                className="text-xs font-medium text-(--text-dim) transition-colors hover:text-(--text-main)"
              >
                History
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button className="hover:border-primary/30 relative rounded-xl border border-(--card-border) bg-(--card-bg) p-2.5 text-(--text-dim) transition-all hover:text-(--text-main)">
              <Bell size={18} />
              <span className="bg-primary absolute top-2.5 right-2.5 h-2 w-2 rounded-full border-2 border-(--bg-main)"></span>
            </button>

            <div className="group flex cursor-pointer items-center gap-3 border-l border-(--card-border) pl-4">
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
              </div>
              <h1 className="font-display text-3xl leading-tight font-bold tracking-tighter text-(--text-main) lg:text-4xl">
                Hello,{" "}
                <span className="from-primary to-primary-dark bg-linear-to-r bg-clip-text px-1 text-transparent">
                  {firstName}!
                </span>
              </h1>
              <p className="md:text-md max-w-md text-base leading-relaxed font-medium text-(--text-dim)">
                Welcome back! Ready for your next journey today?
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 rounded-3xl border border-(--card-border) bg-black/5 p-6 shadow-sm backdrop-blur-md md:gap-8 dark:bg-black/20">
              {stats.map((s, i) => (
                <div key={i} className="min-w-17.5 text-center">
                  <p className="mb-0.5 text-xl font-black text-(--text-main) md:text-2xl">
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
              Management{" "}
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
                  className={`group glass-card relative rounded-3xl p-6 text-left transition-all duration-300 hover:-translate-y-1 ${c.hover} border-(--card-border) shadow-sm`}
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

