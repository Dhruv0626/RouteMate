import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Clock,
  DollarSign,
  Heart,
  Shield,
  Settings,
  X,
  Eye,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import ThemeToggle from "../components/ui/ThemeToggle";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [activeFilter, setActiveFilter] = useState("all");

  const filters = [
    { id: "all", label: "All", icon: Bell },
    { id: "ride-request", label: "Rides", icon: Zap },
    { id: "earnings", label: "Earnings", icon: TrendingUp },
    { id: "alert", label: "Alerts", icon: AlertCircle },
    { id: "message", label: "Messages", icon: MessageCircle },
  ];

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    return n.type === activeFilter;
  });

  const handleAction = (notification) => {
    // Mark as read when clicked
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case "ride-request":
        navigate("/driver/dashboard/go-online");
        break;
      case "earnings":
        navigate("/driver/dashboard/earnings");
        break;
      case "rating":
        navigate("/driver/dashboard/rating");
        break;
      case "alert":
        // Navigate to maintenance/alerts section (can be custom page)
        alert(`Alert: ${notification.message}`);
        break;
      case "approval":
        // Navigate to documents/profile section
        navigate("/driver/dashboard/profile");
        break;
      case "message":
        // Navigate to support/messages section
        alert(`Support Ticket: ${notification.metadata?.ticketId}\n${notification.message}`);
        break;
      case "system":
        // Navigate to settings or show update prompt
        alert(`System Update: ${notification.message}`);
        break;
      case "security":
        // Navigate to security settings
        alert(`Security Alert: ${notification.message}\nDevice: ${notification.metadata?.device}`);
        break;
      default:
        // Already marked as read at top of function
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/20";
      case "medium":
        return "border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/20";
      case "low":
        return "border-l-4 border-gray-400 bg-gray-50/50 dark:bg-gray-800/50";
      default:
        return "border-l-4 border-gray-300 bg-gray-50/50 dark:bg-gray-800/50";
    }
  };

  const getTypeColor = (type, isUnread) => {
    const baseColor = isUnread ? "bg-primary/10" : "bg-(--card-bg)";
    switch (type) {
      case "ride-request":
        return `${baseColor} text-emerald-600 dark:text-emerald-400`;
      case "earnings":
        return `${baseColor} text-green-600 dark:text-green-400`;
      case "rating":
        return `${baseColor} text-pink-600 dark:text-pink-400`;
      case "alert":
        return `${baseColor} text-amber-600 dark:text-amber-400`;
      case "approval":
        return `${baseColor} text-blue-600 dark:text-blue-400`;
      case "message":
        return `${baseColor} text-purple-600 dark:text-purple-400`;
      case "system":
        return `${baseColor} text-indigo-600 dark:text-indigo-400`;
      case "security":
        return `${baseColor} text-red-600 dark:text-red-400`;
      default:
        return baseColor;
    }
  };

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-primary/10 rounded-lg p-2 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-xs text-primary font-semibold">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-primary hover:text-primary-dark text-xs font-semibold transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {filters.map((filter) => {
            const FilterIcon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  activeFilter === filter.id
                    ? "bg-primary text-black shadow-lg shadow-primary/30"
                    : "bg-(--card-bg) text-(--text-dim) border border-(--card-border) hover:border-primary"
                }`}
              >
                <FilterIcon size={16} />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => {
              const NotifIcon = notification.icon;
              return (
                <button
                  key={notification.id}
                  onClick={() => handleAction(notification)}
                  className={`glass-card group relative w-full overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer text-left ${getPriorityColor(
                    notification.priority
                  )} ${
                    !notification.read ? "bg-primary/5 dark:bg-primary/10" : ""
                  }`}
                >
                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="bg-primary absolute top-4 right-4 h-2 w-2 rounded-full animate-pulse"></div>
                  )}

                  <div className="flex gap-4">
                    {/* Icon */}
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all ${getTypeColor(
                        notification.type,
                        !notification.read
                      )}`}
                    >
                      <NotifIcon size={22} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-display text-sm font-bold text-(--text-main) group-hover:text-primary transition-colors">
                          {notification.title}
                        </h3>
                        {notification.action && (
                          <span className="px-3 py-1 rounded-lg bg-primary text-black text-xs font-semibold whitespace-nowrap flex-shrink-0 group-hover:bg-primary-dark transition-all">
                            {notification.action}
                          </span>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed font-medium text-(--text-dim) mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-(--text-dim) uppercase tracking-wider">
                          <Clock size={12} className="inline mr-1" />
                          {notification.timestamp}
                        </span>

                        {!notification.read && (
                          <span className="text-primary text-xs font-semibold flex items-center gap-1">
                            <Eye size={12} />
                            Click to read
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="group/btn flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-(--card-bg) text-(--text-dim) hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Bell size={32} className="text-primary" />
                </div>
              </div>
              <h3 className="font-display mb-2 text-lg font-bold text-(--text-main)">
                No {activeFilter !== "all" ? "matching" : ""} notifications
              </h3>
              <p className="text-(--text-dim) text-sm">
                You're all caught up! Check back later for updates.
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        {notifications.length > 0 && (
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <h3 className="font-display mb-4 text-sm font-bold text-(--text-main) uppercase tracking-wide">
              Activity Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="mb-1 text-2xl font-black text-primary">
                  {notifications.length}
                </p>
                <p className="text-xs font-semibold text-(--text-dim) uppercase tracking-wider">
                  Total
                </p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-2xl font-black text-emerald-500">
                  {unreadCount}
                </p>
                <p className="text-xs font-semibold text-(--text-dim) uppercase tracking-wider">
                  Unread
                </p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-2xl font-black text-amber-500">
                  {notifications.filter((n) => n.priority === "high").length}
                </p>
                <p className="text-xs font-semibold text-(--text-dim) uppercase tracking-wider">
                  High Priority
                </p>
              </div>
              <div className="text-center">
                <p className="mb-1 text-2xl font-black text-blue-500">
                  {notifications.filter((n) => n.read).length}
                </p>
                <p className="text-xs font-semibold text-(--text-dim) uppercase tracking-wider">
                  Read
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
