import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle2,
  Clock, MapPin, User, RefreshCw, FileText, Loader2,
  Phone, Mail, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { getActiveSOSList, getSOSHistory, resolveSOSIncident } from "../../services/sosService";

const TRIGGER_LABELS = {
  manual_button:  { label: "Manual SOS", color: "#ef4444",  bg: "rgba(239,68,68,0.1)",  icon: "🆘" },
  shake_gesture:  { label: "Shake Detected", color: "#f97316", bg: "rgba(249,115,22,0.1)", icon: "📳" },
  auto_timeout:   { label: "Driver Stopped", color: "#eab308", bg: "rgba(234,179,8,0.1)",  icon: "⏱️" },
  route_deviation:{ label: "Route Deviation", color: "#a855f7", bg: "rgba(168,85,247,0.1)", icon: "🗺️" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SOSCard({ incident, onResolve, resolving }) {
  const [expanded,     setExpanded]     = useState(false);
  const [notes,        setNotes]        = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  const trigger = TRIGGER_LABELS[incident.triggerMethod] || { label: incident.triggerMethod, color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: "❓" };
  const emergencyLink = incident.emergencyToken
    ? `${window.location.origin}/emergency/${incident.emergencyToken}`
    : null;

  return (
    <div className="rounded-2xl border border-red-500/20 bg-[#0f172a] overflow-hidden">
      {/* Pulsing top bar for active */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${trigger.color}, ${trigger.color}80)`, animation: "pulse 2s infinite" }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: trigger.bg }}>
              {trigger.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-white text-sm">{incident.passenger?.name || "Unknown"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: trigger.bg, color: trigger.color }}>
                  {trigger.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Clock size={10} /> {timeAgo(incident.triggeredAt)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <div className="bg-gray-900/60 rounded-xl p-3">
            <p className="text-gray-500 mb-1">Passenger</p>
            <p className="font-bold text-white truncate">{incident.passenger?.name || "—"}</p>
            {incident.passenger?.Mobile_no && (
              <a href={`tel:${incident.passenger.Mobile_no}`} className="text-blue-400 flex items-center gap-1 mt-1 hover:underline">
                <Phone size={10} /> {incident.passenger.Mobile_no}
              </a>
            )}
          </div>
          <div className="bg-gray-900/60 rounded-xl p-3">
            <p className="text-gray-500 mb-1">Driver</p>
            <p className="font-bold text-white truncate">{incident.driver?.name || "—"}</p>
            {incident.driver?.Mobile_no && (
              <a href={`tel:${incident.driver.Mobile_no}`} className="text-blue-400 flex items-center gap-1 mt-1 hover:underline">
                <Phone size={10} /> {incident.driver.Mobile_no}
              </a>
            )}
          </div>
        </div>

        {/* Trip route */}
        {(incident.trip?.source || incident.trip?.destination) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <MapPin size={11} className="text-green-500 shrink-0" />
            <span className="truncate">{incident.trip?.source?.address}</span>
            <span className="shrink-0">→</span>
            <MapPin size={11} className="text-red-500 shrink-0" />
            <span className="truncate">{incident.trip?.destination?.address}</span>
          </div>
        )}

        {/* Live location link */}
        {emergencyLink && (
          <a
            href={emergencyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-all mb-4"
          >
            <MapPin size={13} /> View Live Location <ExternalLink size={11} />
          </a>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-3 mb-4 animate-fade-in">
            <div className="bg-gray-900/40 rounded-xl p-3 text-xs space-y-1.5 text-gray-400">
              <div className="flex justify-between">
                <span>SOS ID</span>
                <span className="font-mono text-gray-300 text-[10px]">{incident._id}</span>
              </div>
              <div className="flex justify-between">
                <span>Trigger Method</span>
                <span className="font-bold" style={{ color: trigger.color }}>{trigger.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Triggered At</span>
                <span>{new Date(incident.triggeredAt).toLocaleString("en-IN")}</span>
              </div>
              {incident.passenger?.email && (
                <div className="flex justify-between">
                  <span>Passenger Email</span>
                  <span className="text-gray-300">{incident.passenger.email}</span>
                </div>
              )}
            </div>

            {/* Admin notes */}
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add resolution notes (optional)..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs focus:border-red-500/50 focus:outline-none resize-none"
            />
          </div>
        )}

        {/* Resolve button */}
        {!confirmClose ? (
          <button
            onClick={() => setConfirmClose(true)}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-sm transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Mark as Resolved
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-center text-gray-400">Confirm resolution of this SOS incident?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm font-bold hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => onResolve(incident._id, notes)}
                disabled={resolving === incident._id}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {resolving === incident._id
                  ? <Loader2 size={14} className="animate-spin" />
                  : <CheckCircle2 size={14} />}
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResolvedCard({ incident }) {
  const trigger = TRIGGER_LABELS[incident.triggerMethod] || { label: incident.triggerMethod, color: "#6b7280", icon: "❓" };
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-900/40 border border-gray-800">
      <span className="text-lg">{trigger.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{incident.passenger?.name}</p>
        <p className="text-xs text-gray-500">{trigger.label} · {timeAgo(incident.resolvedAt)}</p>
      </div>
      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
    </div>
  );
}

export default function AdminSOSPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]   = useState("active");
  const [active,    setActive]      = useState([]);
  const [history,   setHistory]     = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [resolving, setResolving]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [activeRes, histRes] = await Promise.all([
        getActiveSOSList(),
        getSOSHistory(1, 30),
      ]);
      setActive(activeRes.data.data || []);
      setHistory(histRes.data.data || []);
    } catch (err) {
      console.error("Failed to load SOS data:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleResolve = async (sosId, notes) => {
    try {
      setResolving(sosId);
      await resolveSOSIncident(sosId, notes);
      await loadData(true);
    } catch (err) {
      console.error("Failed to resolve SOS:", err.message);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="mesh-bg min-h-screen font-sans" style={{ color: "var(--text-main)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="rounded-xl border border-(--card-border) p-2 text-(--text-dim) hover:bg-(--card-bg) transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Shield size={16} className="text-red-400" />
              </div>
              <h1 className="font-display text-lg font-black">SOS Management</h1>
            </div>
            {active.length > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                {active.length} ACTIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-(--card-border) hover:bg-(--card-bg) transition-all text-(--text-dim)"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Alerts",  value: active.length,   color: "#ef4444", icon: "🆘" },
            { label: "Resolved Today", value: history.filter(h => new Date(h.resolvedAt) > new Date(Date.now() - 86400000)).length, color: "#22c55e", icon: "✅" },
            { label: "Total Cases",    value: history.length,  color: "#6366f1", icon: "📋" },
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-2xl p-4 border-(--card-border)">
              <p className="text-2xl mb-1">{stat.icon}</p>
              <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-(--text-dim) font-bold">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-(--card-bg) border border-(--card-border) w-fit">
          {[
            { id: "active",  label: `Active (${active.length})` },
            { id: "history", label: `History (${history.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "text-(--text-dim) hover:text-(--text-main)"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-red-400" />
          </div>
        ) : activeTab === "active" ? (
          <div className="space-y-4">
            {active.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <div>
                  <p className="font-bold text-(--text-main)">All Clear</p>
                  <p className="text-sm text-(--text-dim)">No active SOS incidents right now</p>
                </div>
              </div>
            ) : (
              active.map(incident => (
                <SOSCard
                  key={incident._id}
                  incident={incident}
                  onResolve={handleResolve}
                  resolving={resolving}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 text-(--text-dim)">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No resolved incidents yet</p>
              </div>
            ) : (
              history.map(incident => (
                <ResolvedCard key={incident._id} incident={incident} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
