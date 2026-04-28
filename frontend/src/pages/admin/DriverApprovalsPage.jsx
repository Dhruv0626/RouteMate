import { useState, useEffect } from "react";
import {
  ChevronLeft, RefreshCw, Car, CheckCircle2, XCircle,
  Clock, ShieldCheck, ShieldAlert, IdCard, Phone, Mail,
  Star, AlertTriangle, Filter, Search, Shield, User,
  FileText, BadgeCheck, ChevronDown, ChevronUp, Image as ImageIcon, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Loader from "../../components/ui/Loader";
import api from "../../services/api";

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ isApproved }) =>
  isApproved ? (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
      <ShieldCheck size={11} /> Approved
    </span>
  ) : (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400">
      <Clock size={11} /> Pending
    </span>
  );

// ─── Vehicle Type Badge ────────────────────────────────────────────────────────
const VehicleBadge = ({ type }) => {
  const map = {
    Sedan:  "bg-primary/10 text-primary border-primary/20",
    SUV:    "bg-violet-500/10 text-violet-400 border-violet-500/20",
    Auto:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Bike:   "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[type] || "bg-(--card-bg) text-(--text-dim) border-(--card-border)"}`}>
      {type || "N/A"}
    </span>
  );
};

// ─── Driver Card ───────────────────────────────────────────────────────────────
const DriverCard = ({ driver, onApprove, onReject, loading }) => {
  const [expanded, setExpanded] = useState(false);
  const u = driver.user || {};
  const name = u.name || "Unknown Driver";
  const email = u.email || "—";
  const mobile = u.Mobile_no || "—";

  return (
    <div className="glass-card rounded-3xl overflow-hidden border border-(--card-border) hover:border-primary/30 transition-all duration-300">
      {/* Card Header */}
      <div className="p-5 flex items-center gap-4">
        {/* Avatar */}
        <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-primary/20 to-primary/40 border border-primary/30 flex items-center justify-center font-black text-primary text-lg flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-(--text-main) text-sm">{name}</p>
            <StatusBadge isApproved={driver.isApproved} />
            {driver.isOnline && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                Online
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-(--text-dim) font-medium">
              <Mail size={10} /> {email}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-(--text-dim) font-medium">
              <Phone size={10} /> {mobile}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!driver.isApproved ? (
            <>
              <button
                onClick={() => onApprove(driver._id)}
                disabled={loading === driver._id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black text-xs font-black transition-all active:scale-95 disabled:opacity-50"
              >
                {loading === driver._id ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                <span className="hidden sm:inline">Approve</span>
              </button>
              <button
                onClick={() => onReject(driver._id)}
                disabled={loading === driver._id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-black transition-all active:scale-95 disabled:opacity-50"
              >
                <XCircle size={13} />
                <span className="hidden sm:inline">Reject</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onReject(driver._id)}
              disabled={loading === driver._id}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-black transition-all active:scale-95 disabled:opacity-50"
            >
              <ShieldAlert size={13} />
              <span className="hidden sm:inline">Revoke</span>
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) hover:bg-(--card-bg) transition-all"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-(--card-border) bg-black/5 dark:bg-black/20 px-5 pb-5 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest flex items-center gap-1"><Car size={9} /> Vehicle</p>
            <p className="text-sm font-bold text-(--text-main)">{driver.vehicle?.name || "Not provided"}</p>
            <VehicleBadge type={driver.vehicle?.type} />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest flex items-center gap-1"><FileText size={9} /> Reg. No.</p>
            <p className="text-sm font-bold font-mono text-(--text-main)">{driver.vehicle?.number || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest flex items-center gap-1"><IdCard size={9} /> License</p>
            <p className="text-sm font-bold font-mono text-(--text-main)">{driver.license?.number || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest flex items-center gap-1"><Star size={9} /> Stats</p>
            <p className="text-sm font-bold text-(--text-main)">{driver.stats?.totalRides || 0} Rides</p>
            <p className="text-[10px] text-(--text-dim)">Rating: {driver.averageRating?.toFixed(1) || "N/A"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">Submitted</p>
            <p className="text-sm font-bold text-(--text-main)">{new Date(driver.createdAt).toLocaleDateString()}</p>
            <p className="text-[10px] text-(--text-dim)">{new Date(driver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">Aadhar</p>
            <p className="text-sm font-bold font-mono text-(--text-main)">
              {driver.aadhar?.number ? `XXXX-XXXX-${driver.aadhar?.number.slice(-4)}` : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">Completed</p>
            <p className="text-sm font-bold text-(--text-main)">{driver.stats?.completedRides || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">Cancelled</p>
            <p className="text-sm font-bold text-(--text-main)">{driver.stats?.cancelledRides || 0}</p>
          </div>

          {/* Document Images Section */}
          <div className="col-span-2 sm:col-span-4 mt-4 pt-4 border-t border-(--card-border)/50">
            <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ImageIcon size={12} className="text-primary" /> Document Verification Images
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: "License Document", img: driver.license?.image, icon: IdCard },
                { label: "Aadhar Document", img: driver.aadhar?.image, icon: FileText },
                { label: "Vehicle Photos", img: driver.vehicle?.vehicleImage, icon: Car },
                { label: "RC Book", img: driver.vehicle?.rcBookImage, icon: FileText },
                { label: "Insurance", img: driver.vehicle?.insuranceImage, icon: ShieldCheck }
              ].map((doc, idx) => (
                <div key={idx} className="space-y-2 group/img">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[9px] font-bold text-(--text-dim) uppercase flex items-center gap-1.5">
                      <doc.icon size={10} /> {doc.label}
                    </p>
                    {doc.img && (
                      <a 
                        href={doc.img} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-white transition-colors"
                        title="View Full Image"
                      >
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-(--card-border) bg-black/20 group-hover/img:border-primary/40 transition-all duration-300 shadow-lg">
                    {doc.img ? (
                      <>
                        <img 
                          src={doc.img} 
                          alt={doc.label} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                          onClick={() => window.open(doc.img, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                           <p className="text-[10px] font-black uppercase text-white tracking-widest bg-primary/80 px-3 py-1.5 rounded-full shadow-2xl">Click to Enlarge</p>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-(--text-dim) bg-black/10">
                        <AlertTriangle size={20} className="mb-2 opacity-30" />
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image Uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DriverApprovalsPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showConfirm } = useDialog();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "pending" | "approved"
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/driver-profiles/admin/all-drivers");
      if (data.success && data.data) {
        setDrivers(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch drivers", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleApprove = async (profileId) => {
    try {
      setActionLoading(profileId);
      await api.patch(`/driver-profiles/admin/approve/${profileId}`, { isApproved: true });
      setDrivers(prev => prev.map(d => d._id === profileId ? { ...d, isApproved: true } : d));
      showToast("Driver approved successfully!", "success");
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to approve driver", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (profileId) => {
    const confirmed = await showConfirm(
      "Are you sure you want to revoke/reject this driver?",
      "Revoke / Reject",
      "warning",
      "Yes, Revoke"
    );
    if (!confirmed) return;
    try {
      setActionLoading(profileId);
      await api.patch(`/driver-profiles/admin/approve/${profileId}`, { isApproved: false });
      setDrivers(prev => prev.map(d => d._id === profileId ? { ...d, isApproved: false } : d));
      showToast("Driver access revoked.", "error");
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to reject driver", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = drivers.filter(d => {
    const name  = d.user?.name?.toLowerCase() || "";
    const email = d.user?.email?.toLowerCase() || "";
    const matchSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "pending" ? !d.isApproved :
      d.isApproved;
    return matchSearch && matchFilter;
  });

  const pending  = drivers.filter(d => !d.isApproved).length;
  const approved = drivers.filter(d =>  d.isApproved).length;

  if (loading) return <Loader fullPage text="Loading driver applications..." />;

  return (
    <div className="mesh-bg min-h-screen relative font-sans text-(--text-main)">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-sm animate-in fade-in slide-in-from-top-3 duration-300 ${
          toast.type === "success"
            ? "bg-emerald-500 text-black"
            : "bg-rose-500 text-white"
        }`}>
          {toast.type === "success" ? <BadgeCheck size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/${currentUser?.role}/dashboard`)}
              className="p-2 hover:bg-(--card-bg) rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-display font-black tracking-tight leading-none">Driver Approvals</h1>
              <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-widest">Review & Verify Applications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={fetchDrivers}
              className="p-2 rounded-xl border border-(--card-border) text-(--text-dim) hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex items-center gap-2 border-l border-(--card-border) pl-3">
              <div className="h-8 w-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-black text-sm">
                {currentUser?.name?.charAt(0)?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8 relative z-10">

        {/* ── Summary Stats ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="glass-card rounded-3xl p-5 border border-(--card-border) flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10"><Car size={22} className="text-primary" /></div>
            <div>
              <p className="text-3xl font-black text-(--text-main)">{drivers.length}</p>
              <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">Total Applications</p>
            </div>
          </div>
          <div className="glass-card rounded-3xl p-5 border border-amber-500/20 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10"><Clock size={22} className="text-amber-400" /></div>
            <div>
              <p className="text-3xl font-black text-amber-400">{pending}</p>
              <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">Awaiting Review</p>
            </div>
          </div>
          <div className="glass-card rounded-3xl p-5 border border-emerald-500/20 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10"><ShieldCheck size={22} className="text-emerald-400" /></div>
            <div>
              <p className="text-3xl font-black text-emerald-400">{approved}</p>
              <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">Approved Drivers</p>
            </div>
          </div>
        </section>

        {/* ── Toolbar ── */}
        <section className="glass-card rounded-3xl p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim) group-focus-within:text-primary transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/20 border border-(--card-border) rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-primary/50 text-sm font-medium transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-(--text-dim)" />
            <div className="flex rounded-2xl border border-(--card-border) overflow-hidden">
              {["all","pending","approved"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                    filter === f
                      ? "bg-primary text-black"
                      : "text-(--text-dim) hover:text-(--text-main) hover:bg-(--card-bg)"
                  }`}
                >
                  {f === "all" ? `All (${drivers.length})` :
                   f === "pending" ? `Pending (${pending})` :
                   `Approved (${approved})`}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Drivers List ── */}
        <section className="space-y-4">
          {filtered.length > 0 ? (
            <>
              <p className="text-xs text-(--text-dim) font-bold px-1">
                Showing {filtered.length} of {drivers.length} drivers
              </p>
              {filtered.map(driver => (
                <DriverCard
                  key={driver._id}
                  driver={driver}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  loading={actionLoading}
                />
              ))}
            </>
          ) : (
            <div className="glass-card rounded-3xl p-16 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-(--card-bg) border border-(--card-border) flex items-center justify-center text-slate-500">
                {filter === "pending" ? <Clock size={32} /> : <ShieldCheck size={32} />}
              </div>
              <p className="text-lg font-bold text-(--text-main)">
                {search ? "No results found" : filter === "pending" ? "No pending applications!" : "No approved drivers yet"}
              </p>
              <p className="text-sm text-(--text-dim) max-w-xs mx-auto">
                {search ? "Try adjusting your search query." : "New driver applications will appear here for your review."}
              </p>
            </div>
          )}
        </section>

        {/* Info Banner */}
        <section className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex gap-4">
          <div className="p-3 rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/20 h-fit">
            <Shield className="text-black" size={18} />
          </div>
          <div>
            <h4 className="text-amber-500 font-bold text-sm mb-1">Verification Guidelines</h4>
            <p className="text-xs text-amber-500/80 leading-relaxed max-w-2xl">
              Approve only drivers with valid license, registered vehicle numbers and verified Aadhar.
              Approved drivers gain immediate access to accept rides. Rejection can be reversed anytime.
              All actions are logged for audit.
            </p>
          </div>
        </section>

      </main>

      <footer className="mx-auto max-w-6xl py-8 px-6 border-t border-(--card-border) flex justify-between items-center opacity-50">
        <p className="text-[10px] font-bold tracking-widest uppercase">Driver Verification System</p>
        <p className="text-[10px] font-bold tracking-widest uppercase">RouteMate Admin Panel</p>
      </footer>
    </div>
  );
};

export default DriverApprovalsPage;
