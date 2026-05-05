import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  Download,
  ChevronRight,
  Filter,
  User,
  Car,
  Settings,
  Database,
  MoreVertical,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import api from "../../services/api";
import { exportAuditLogsToCSV } from "../../utils/exportUtils";
import Loader from "../../components/ui/Loader";

const AdminHistoryPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedLog, setExpandedLog] = useState(null);
  const [dateRange, setDateRange] = useState("all");

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [dateRange]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/audit-logs");
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (days === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const filters = [
    { id: "all", label: "All Events", icon: Database },
    { id: "success", label: "Success", icon: CheckCircle },
    { id: "enforced", label: "Enforced", icon: Shield },
    { id: "blocked", label: "Blocked", icon: XCircle },
  ];

  const dateFilters = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
  ];

  const categoryIcons = {
    system: Settings,
    user: User,
    driver: Car,
    security: Shield,
    finance: TrendingUp,
    support: AlertCircle,
  };

  const categoryColors = {
    system: "bg-blue-500/10 text-blue-400",
    user: "bg-violet-500/10 text-violet-400",
    driver: "bg-emerald-500/10 text-emerald-400",
    security: "bg-red-500/10 text-red-400",
    finance: "bg-amber-500/10 text-amber-400",
    support: "bg-orange-500/10 text-orange-400",
  };

  const statusColors = {
    success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
    enforced: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
    blocked: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
  };

  const statusIcons = {
    success: <CheckCircle size={14} />,
    enforced: <Shield size={14} />,
    blocked: <XCircle size={14} />,
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesStatus = activeFilter === "all" || log.status === activeFilter;
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: auditLogs.length,
    success: auditLogs.filter((l) => l.status === "success").length,
    urgent: auditLogs.filter((l) => l.urgent).length,
    blocked: auditLogs.filter((l) => l.status === "blocked").length,
  };

  const handleExport = () => {
    const filename = `audit_logs_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.csv`;
    exportAuditLogsToCSV(filteredLogs, filename);
  };

  if (loading && auditLogs.length === 0) return <Loader fullPage text="Retrieving Platform Audit Records..." />;

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main) hover:border-primary/40"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">
                Audit Logs
              </h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                System event history
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

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">Total Events</h3>
              <Database size={18} className="text-primary" />
            </div>
            <p className="text-2xl font-black text-(--text-main)">{stats.total}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">Successful</h3>
              <CheckCircle size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-500">{stats.success}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">Urgent Flags</h3>
              <AlertCircle size={18} className="text-orange-500" />
            </div>
            <p className="text-2xl font-black text-orange-500">{stats.urgent}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 border border-(--card-border)">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">Blocked</h3>
              <XCircle size={18} className="text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-500">{stats.blocked}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-(--text-dim)" />
            <input
              type="text"
              placeholder="Search by action, actor, target, or log ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-(--card-bg) border border-(--card-border) rounded-2xl pl-12 pr-4 py-3 text-(--text-main) placeholder:text-(--text-dim) focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
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
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {dateFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setDateRange(filter.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  dateRange === filter.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-(--card-bg) text-(--text-dim) border border-(--card-border) hover:border-(--text-main)"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log List */}
        <div className="space-y-3">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const CategoryIcon = categoryIcons[log.category] || Database;
              return (
                <button
                  key={log.id}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="glass-card group w-full rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg border border-(--card-border) overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Category Icon */}
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${categoryColors[log.category]}`}>
                        <CategoryIcon size={22} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-display font-bold text-(--text-main)">{log.action}</h3>
                          {log.urgent && (
                            <span className="flex items-center gap-1 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                              <AlertCircle size={9} /> Urgent
                            </span>
                          )}
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[log.status]}`}>
                            {statusIcons[log.status]}
                            {log.status}
                          </span>
                        </div>

                        <p className="text-sm text-(--text-dim) mb-2">
                          <span className="text-primary font-semibold">{log.actor}</span>
                          <ArrowRight size={12} className="inline mx-1" />
                          {log.target}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-(--text-dim)">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />{formatDate(log.date)}
                          </span>
                          <span className="font-mono text-[10px] bg-(--card-bg) border border-(--card-border) px-2 py-0.5 rounded-full">
                            {log.id}
                          </span>
                          <span className="capitalize text-[10px] font-semibold opacity-70">{log.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      <ChevronRight
                        size={20}
                        className={`text-(--text-dim) transition-transform duration-300 ${expandedLog === log.id ? "rotate-90" : ""}`}
                      />
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div className="border-t border-(--card-border) pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider mb-1">Actor Role</p>
                          <p className="font-black text-(--text-main) text-sm">{log.actorRole}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider mb-1">IP Address</p>
                          <p className="font-mono font-bold text-(--text-main) text-sm">{log.ip}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-(--text-dim) uppercase tracking-wider mb-1">Affected Users</p>
                          <p className="font-black text-(--text-main) text-sm">{log.affectedUsers}</p>
                        </div>
                      </div>

                      <div className="bg-(--card-bg) rounded-xl p-4 border border-(--card-border)">
                        <h4 className="font-semibold text-(--text-main) mb-2 text-sm flex items-center gap-2">
                          <Database size={14} className="text-primary" />
                          Event Details
                        </h4>
                        <p className="text-sm text-(--text-dim) leading-relaxed">{log.details}</p>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <button className="flex items-center gap-2 rounded-xl bg-(--card-bg) border border-(--card-border) px-4 py-2 text-xs font-bold text-(--text-dim) hover:text-(--text-main) transition-all">
                          <MoreVertical size={14} />
                          View Full Log
                        </button>
                        {log.urgent && (
                          <button className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all">
                            <AlertCircle size={14} />
                            Escalate
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center border border-(--card-border)">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Database size={32} className="text-primary" />
                </div>
              </div>
              <h3 className="font-display mb-2 text-lg font-bold text-(--text-main)">No logs found</h3>
              <p className="text-(--text-dim) text-sm">
                {searchQuery ? "Try adjusting your search terms" : "No events in this category"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminHistoryPage;
