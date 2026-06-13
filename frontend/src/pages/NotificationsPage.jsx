import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, Zap, AlertCircle, CheckCircle,
  Clock, Settings, X, Info, Navigation,
  UserCheck, ShieldAlert, CheckCheck, Sparkles, Inbox,
  ChevronDown, ChevronUp
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import ThemeToggle from "../components/ui/ThemeToggle";

// ─── Type Config ─────────
// ─────────────────────────────────────────────────────
const TYPE_CONFIG = {
  ride_request: {
    icon: Zap,
    label: "Ride Request",
    gradient: "from-yellow-400 to-orange-400",
    border: "border-l-yellow-400",
    badge: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
    glow: "shadow-yellow-500/10",
    dot: "bg-yellow-400",
  },
  ride_update: {
    icon: Navigation,
    label: "Ride Update",
    gradient: "from-emerald-400 to-cyan-400",
    border: "border-l-emerald-400",
    badge: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
    glow: "shadow-emerald-500/10",
    dot: "bg-emerald-400",
  },
  account_update: {
    icon: UserCheck,
    label: "Account",
    gradient: "from-blue-400 to-indigo-400",
    border: "border-l-blue-400",
    badge: "bg-blue-400/15 text-blue-400 border-blue-400/30",
    glow: "shadow-blue-500/10",
    dot: "bg-blue-400",
  },
  success: {
    icon: CheckCircle,
    label: "Success",
    gradient: "from-green-400 to-emerald-400",
    border: "border-l-green-400",
    badge: "bg-green-400/15 text-green-400 border-green-400/30",
    glow: "shadow-green-500/10",
    dot: "bg-green-400",
  },
  warning: {
    icon: AlertCircle,
    label: "Alert",
    gradient: "from-amber-400 to-orange-400",
    border: "border-l-amber-400",
    badge: "bg-amber-400/15 text-amber-400 border-amber-400/30",
    glow: "shadow-amber-500/10",
    dot: "bg-amber-400",
  },
  error: {
    icon: ShieldAlert,
    label: "Error",
    gradient: "from-red-400 to-rose-400",
    border: "border-l-red-400",
    badge: "bg-red-400/15 text-red-400 border-red-400/30",
    glow: "shadow-red-500/10",
    dot: "bg-red-400",
  },
  system: {
    icon: Settings,
    label: "System",
    gradient: "from-violet-400 to-purple-400",
    border: "border-l-violet-400",
    badge: "bg-violet-400/15 text-violet-400 border-violet-400/30",
    glow: "shadow-violet-500/10",
    dot: "bg-violet-400",
  },
  info: {
    icon: Info,
    label: "Info",
    gradient: "from-sky-400 to-blue-400",
    border: "border-l-sky-400",
    badge: "bg-sky-400/15 text-sky-400 border-sky-400/30",
    glow: "shadow-sky-500/10",
    dot: "bg-sky-400",
  },
  notification: {
    icon: Bell,
    label: "Notification",
    gradient: "from-primary to-yellow-300",
    border: "border-l-yellow-400",
    badge: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
    glow: "shadow-yellow-500/10",
    dot: "bg-yellow-400",
  },
};

const DEFAULT_CONFIG = {
  icon: Bell,
  label: "Notification",
  gradient: "from-slate-400 to-slate-500",
  border: "border-l-slate-400",
  badge: "bg-slate-400/15 text-slate-400 border-slate-400/30",
  glow: "shadow-slate-500/10",
  dot: "bg-slate-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function groupByDate(notifications) {
  const groups = {};
  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key;
    if (d.toDateString() === today.toDateString()) key = "Today";
    else if (d.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else key = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ value, label, colorClass, gradient }) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm flex flex-col gap-1 group hover:scale-[1.02] transition-all duration-300">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />
    <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-widest text-(--text-dim)">{label}</p>
  </div>
);

// ─── Notification Card ────────────────────────────────────────────────────────
const NotifCard = ({ notification, onAction, onDelete }) => {
  const cfg = TYPE_CONFIG[notification.type] || DEFAULT_CONFIG;
  const Icon = cfg.icon;
  const isUnread = !notification.isRead;
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = notification.message && notification.message.length > 120;

  return (
    <div
      onClick={() => onAction(notification)}
      className={`group relative flex items-start gap-4 rounded-2xl border-l-4 ${cfg.border} p-4 cursor-pointer transition-all duration-300
        hover:shadow-xl hover:${cfg.glow} hover:-translate-y-0.5
        ${isUnread
          ? "bg-white/6 border border-white/10 dark:border-white/8"
          : "bg-white/2 border border-white/5 dark:border-white/4 opacity-75 hover:opacity-100"
        }`}
    >
      {/* Unread Glow Strip */}
      {isUnread && (
        <div className={`absolute left-0 top-0 h-full w-0.5 rounded-l-full bg-gradient-to-b ${cfg.gradient} opacity-70`} />
      )}

      {/* Icon Badge */}
      <div className={`relative flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.gradient} shadow-lg`}>
        <Icon size={18} className="text-white drop-shadow-sm" />
        {isUnread && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white border-2 border-current animate-pulse" style={{ borderColor: "var(--color-primary)" }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className={`font-display text-sm font-bold leading-snug group-hover:text-primary transition-colors truncate ${isUnread ? "text-(--text-main)" : "text-(--text-dim)"}`}>
              {notification.title}
            </h3>
            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-(--text-dim) font-semibold whitespace-nowrap flex items-center gap-1">
              <Clock size={10} className="inline" />
              {formatRelativeTime(notification.createdAt)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notification._id); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-(--text-dim) hover:bg-red-500/20 hover:text-red-400 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        <p className={`text-xs leading-relaxed font-medium break-words ${isUnread ? "text-(--text-dim)" : "text-(--text-dim)/60"}`}>
          {isLong && !isExpanded ? `${notification.message.slice(0, 120)}...` : notification.message}
        </p>

        {isLong && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary-dark transition-colors focus:outline-none"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp size={11} className="stroke-[2.5]" />
              </>
            ) : (
              <>
                Read More <ChevronDown size={11} className="stroke-[2.5]" />
              </>
            )}
          </button>
        )}

        {notification.link && (
          <p className="mt-1.5 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
            Tap to view →
          </p>
        )}
      </div>
    </div>
  );
};




// ─── Main Page ────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [activeFilter, setActiveFilter] = useState("all");

  const filters = [
    { id: "all", label: "All", icon: Bell },
    { id: "unread", label: "Unread", icon: Sparkles },
    { id: "ride_request", label: "Rides", icon: Zap },
    { id: "warning", label: "Alerts", icon: AlertCircle },
    { id: "success", label: "Success", icon: CheckCircle },
    { id: "system", label: "System", icon: Settings },
  ];

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "unread") return !n.isRead;
      return n.type === activeFilter;
    });
  }, [notifications, activeFilter]);

  const grouped = useMemo(() => groupByDate(filteredNotifications), [filteredNotifications]);

  const handleAction = (notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    
    // Explicit redirect for passenger booking confirmation notification to upcoming rides page
    if (notification.type === "booking_confirmed" || notification.title?.includes("Booking Confirmed")) {
      navigate("/passenger/dashboard/my-rides");
    } else if (notification.link) {
      navigate(notification.link);
    }
  };

  const readCount = notifications.filter((n) => n.isRead).length;
  const alertCount = notifications.filter((n) => n.type === "warning" || n.type === "error").length;

  return (
    <div className="mesh-bg relative min-h-screen pb-16 font-sans text-(--text-main) transition-colors duration-500">

      {/* ── Background Orbs ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute top-1/2 -right-40 h-80 w-80 rounded-full bg-violet-500/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-blue-500/6 blur-[80px]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-(--bg-main)/75 backdrop-blur-xl transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-white/8 rounded-xl p-2 transition-all border border-transparent hover:border-white/10"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-display text-lg font-black tracking-tight leading-none text-(--text-main)">
                Notifications
              </h1>
              {unreadCount > 0 ? (
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">
                  {unreadCount} new {unreadCount === 1 ? "message" : "messages"}
                </p>
              ) : (
                <p className="text-[10px] font-bold text-(--text-dim) uppercase tracking-widest mt-0.5">
                  All caught up
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-black hover:scale-105 transition-all shadow-md shadow-primary/10"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 pt-6 space-y-6">

        {/* ── Stats Bar ── */}
        {notifications.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard value={notifications.length} label="Total" colorClass="text-(--text-main)" gradient="from-slate-400 to-slate-500" />
            <StatCard value={unreadCount} label="Unread" colorClass="text-primary" gradient="from-yellow-400 to-orange-400" />
            <StatCard value={readCount} label="Read" colorClass="text-emerald-400" gradient="from-emerald-400 to-cyan-400" />
            <StatCard value={alertCount} label="Alerts" colorClass="text-red-400" gradient="from-red-400 to-rose-400" />
          </div>
        )}

        {/* ── Filter Pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map(({ id, label, icon: Icon }) => {
            const isActive = activeFilter === id;
            const count = id === "all" ? notifications.length
              : id === "unread" ? unreadCount
              : notifications.filter((n) => n.type === id).length;
            return (
              <button
                key={id}
                onClick={() => setActiveFilter(id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-black shadow-lg shadow-primary/25 scale-105"
                    : "border border-white/10 bg-white/5 text-(--text-dim) hover:border-primary/40 hover:text-(--text-main) hover:bg-white/8"
                }`}
              >
                <Icon size={12} />
                {label}
                {count > 0 && (
                  <span className={`ml-0.5 rounded-full px-1.5 py-0 text-[9px] font-black ${isActive ? "bg-black/20 text-black" : "bg-white/10 text-(--text-dim)"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Notifications ── */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-(--text-dim)">{date}</span>
                  <div className="flex-1 h-px bg-white/6" />
                  <span className="text-[9px] font-black text-(--text-dim)/60 uppercase tracking-wider">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {items.map((notification) => (
                    <NotifCard
                      key={notification._id}
                      notification={notification}
                      onAction={handleAction}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-yellow-400/10 border border-primary/20 shadow-2xl shadow-primary/10">
                <Inbox size={40} className="text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Sparkles size={12} className="text-primary" />
              </div>
            </div>
            <h3 className="font-display text-xl font-black text-(--text-main) mb-2">
              {activeFilter === "all" ? "You're all clear!" : `No ${activeFilter} notifications`}
            </h3>
            <p className="text-sm text-(--text-dim) max-w-xs leading-relaxed">
              {activeFilter === "all"
                ? "When new notifications arrive, they'll show up here instantly."
                : "Switch to a different filter or check back later."}
            </p>
            {activeFilter !== "all" && (
              <button
                onClick={() => setActiveFilter("all")}
                className="mt-5 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider text-black hover:scale-105 transition-all shadow-md shadow-primary/10"
              >
                Show all notifications
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
