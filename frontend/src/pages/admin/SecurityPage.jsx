import { useState, useEffect } from "react";
import {
  Shield, Lock, Key, Eye, UserX, AlertTriangle, ChevronLeft,
  Activity, RefreshCw, Terminal, Globe, Smartphone, ShieldCheck,
  Search, Filter, ChevronRight, History
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Loader from "../../components/ui/Loader";

// ─── Dummy Audit Logs ──────────────────────────────────────────────────────────
const DUMMY_LOGS = [
  { id: "LOG-001", action: "Admin Login", actor: "Dhruv", target: "System Dashboard", status: "success", time: "2 mins ago", ip: "192.168.1.56", color: "emerald" },
  { id: "LOG-002", action: "User Blocked", actor: "System Agent", target: "id_7841 (Driver)", status: "enforced", time: "14 mins ago", ip: "Server-Node-01", color: "rose" },
  { id: "LOG-003", action: "Config Change", actor: "Dhruv", target: "Base Fare (₹45 → ₹50)", status: "success", time: "1 hr ago", ip: "192.168.1.56", color: "violet" },
  { id: "LOG-004", action: "Security Breach Attempt", actor: "Unknown", target: "API Endpoints", status: "blocked", time: "3 hrs ago", ip: "103.44.2.11", color: "rose" },
  { id: "LOG-005", action: "Key Rotation", actor: "Cron Job", target: "JWT RSA Bundle", status: "success", time: "5 hrs ago", ip: "Internal", color: "emerald" },
  { id: "LOG-006", action: "Password Reset", actor: "user_119", target: "Passenger Account", status: "success", time: "6 hrs ago", ip: "44.52.1.200", color: "primary" },
];

const SecurityPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const runVulnerabilityScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      alert("Platform Scan Complete: 0 Vulnerabilities Detected. Firewall integrity is nominal.");
    }, 2500);
  };

  if (loading) return <Loader fullPage text="Initializing cryptographic environment..." />;

  return (
    <div className="mesh-bg min-h-screen relative font-sans text-(--text-main)">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="p-2 hover:bg-(--card-bg) rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-display font-black tracking-tight leading-none">Security Center</h1>
              <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-widest">Audit & Threat Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
               onClick={runVulnerabilityScan}
               disabled={scanning}
               className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all disabled:opacity-50"
             >
               {scanning ? <RefreshCw className="animate-spin" size={12} /> : <Terminal size={12} />}
               {scanning ? "Scanning..." : "Run Security Scan"}
             </button>
            <ThemeToggle />
            <div className="h-8 w-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-black text-sm">
              {currentUser?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8 relative z-10">
        
        {/* ── Security Stats ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <div className="glass-card rounded-3xl p-6 border border-emerald-500/20 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                 <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400"><ShieldCheck size={24} /></div>
                 <span className="text-[9px] font-black uppercase bg-emerald-500 text-black px-2 py-0.5 rounded-full">Secure</span>
              </div>
              <div>
                 <p className="text-2xl font-black text-(--text-main)">Firewall Active</p>
                 <p className="text-xs text-(--text-dim) font-medium">Bypassed 1,240 bots today</p>
              </div>
           </div>
           <div className="glass-card rounded-3xl p-6 border border-primary/20 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                 <div className="p-3 rounded-2xl bg-primary/10 text-primary"><Key size={24} /></div>
              </div>
              <div>
                 <p className="text-2xl font-black text-(--text-main)">2FA Enforcement</p>
                 <p className="text-xs text-(--text-dim) font-medium">100% Admin Session Security</p>
              </div>
           </div>
           <div className="glass-card rounded-3xl p-6 border border-amber-500/20 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                 <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400"><Activity size={24} /></div>
              </div>
              <div>
                 <p className="text-2xl font-black text-(--text-main)">Threat Analysis</p>
                 <p className="text-xs text-(--text-dim) font-medium">3 Potential risks identified (Low)</p>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* ── Left Column: Audit Logs ── */}
           <section className="lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <History className="text-primary" size={20} />
                    <h2 className="font-display font-black text-xl">Audit Universe</h2>
                 </div>
                 <button className="text-[10px] font-black uppercase text-(--text-dim) hover:text-primary transition-all flex items-center gap-1">
                   Export Logs <ChevronRight size={12} />
                 </button>
              </div>

              <div className="glass-card rounded-4xl border border-(--card-border) overflow-hidden shadow-2xl">
                 <div className="bg-black/5 dark:bg-black/20 p-4 border-b border-(--card-border) flex gap-4">
                    <div className="relative flex-1">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim)" size={14} />
                       <input 
                         type="text" 
                         placeholder="Filter logs by actor or event..." 
                         className="w-full bg-black/5 dark:bg-black/20 border border-(--card-border) rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-primary/50"
                       />
                    </div>
                    <button className="p-2.5 rounded-2xl border border-(--card-border) text-(--text-dim) hover:bg-black/5"><Filter size={16} /></button>
                 </div>
                 <div className="divide-y divide-(--card-border)">
                    {DUMMY_LOGS.map(log => {
                       const colorMap = {
                         emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                         rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                         violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
                         primary: "bg-primary/10 text-primary border-primary/20"
                       };
                       return (
                          <div key={log.id} className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                             <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${colorMap[log.color]}`}>
                                {log.action.includes("Security") ? <AlertTriangle size={18} /> : 
                                 log.action.includes("Key") ? <Lock size={18} /> : <Terminal size={18} />}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                   <p className="text-sm font-black text-(--text-main)">{log.action}</p>
                                   <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${colorMap[log.color]}`}>{log.status}</span>
                                </div>
                                <p className="text-[10px] font-medium text-(--text-dim) truncate mt-0.5">
                                   <span className="text-secondary">{log.actor}</span> interacted with <span className="italic">{log.target}</span> from IP {log.ip}
                                </p>
                             </div>
                             <div className="text-right shrink-0">
                                <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">{log.time}</p>
                                <p className="text-[8px] font-bold text-(--text-dim) group-hover:text-primary transition-colors cursor-pointer mt-1">Details</p>
                             </div>
                          </div>
                       )
                    })}
                 </div>
                 <div className="p-4 text-center bg-black/5">
                    <button className="text-[10px] font-black uppercase text-primary tracking-[0.2em] hover:underline">Show Legacy Archive</button>
                 </div>
              </div>
           </section>

           {/* ── Right Column: Settings & Threats ── */}
           <section className="space-y-8">
              <div className="glass-card rounded-4xl p-6 border border-(--card-border) space-y-6">
                 <div>
                    <h3 className="font-display font-black text-lg">Quick Shields</h3>
                    <p className="text-xs text-(--text-dim) font-medium">Instant security enforcement</p>
                 </div>
                 <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all group">
                       <div className="flex items-center gap-3 text-left">
                          <UserX size={20} />
                          <div>
                             <p className="text-xs font-black uppercase">Purge Sessions</p>
                             <p className="text-[9px] font-medium">Force logout all users</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-black/5 border border-(--card-border) text-(--text-main) hover:border-primary transition-all group">
                       <div className="flex items-center gap-3 text-left">
                          <Eye size={20} className="text-primary" />
                          <div>
                             <p className="text-xs font-black uppercase">IP Blacklist</p>
                             <p className="text-[9px] font-medium text-(--text-dim)">Manage restricted origins</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-black/5 border border-(--card-border) text-(--text-main) hover:border-violet-400 transition-all group">
                       <div className="flex items-center gap-3 text-left">
                          <Terminal size={20} className="text-violet-400" />
                          <div>
                             <p className="text-xs font-black uppercase">API Keys</p>
                             <p className="text-[9px] font-medium text-(--text-dim)">Manage service credentials</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </div>

              <div className="glass-card rounded-4xl p-6 border border-(--card-border) space-y-4">
                 <div className="flex items-center gap-2">
                    <Globe className="text-cyan-400" size={18} />
                    <h3 className="font-display font-black text-lg">Inbound Traffic</h3>
                 </div>
                 <div className="p-4 bg-black/5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-(--text-dim) uppercase">
                       <span>Trusted Origins</span>
                       <span className="text-emerald-500">92%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-(--text-dim) uppercase pt-1">
                       <span>Blocked Threats</span>
                       <span className="text-rose-500">8%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                       <div className="h-full bg-rose-500 rounded-full" style={{ width: '8%' }} />
                    </div>
                 </div>
                 <p className="text-[10px] text-(--text-dim) font-medium text-center">Auto-shielding enabled for 3 distributed nodes.</p>
              </div>
           </section>
        </div>

      </main>

      <footer className="mx-auto max-w-6xl py-10 px-6 border-t border-(--card-border) flex justify-between items-center opacity-50">
        <p className="text-[10px] font-bold tracking-widest uppercase">Kernel Entropy Source: /dev/urandom</p>
        <p className="text-[10px] font-bold tracking-widest uppercase">Admin: {currentUser?.name} · Authenticated</p>
      </footer>
    </div>
  );
};

export default SecurityPage;
