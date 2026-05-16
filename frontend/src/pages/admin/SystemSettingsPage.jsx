import { useState, useEffect } from "react";
import {
  Settings, Save, ChevronLeft, Zap, IndianRupee, Bell,
  Shield, Globe, Smartphone, Database, RefreshCw, AlertTriangle,
  Info, CheckCircle2, Sliders, Server, LogOut, Trash2, Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import ThemeToggle from "../../components/ui/ThemeToggle";
import api from "../../services/api";
import { useNotifications } from "../../context/NotificationContext";

const SettingGroup = ({ title, desc, children }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-display font-black text-(--text-main)">{title}</h3>
      <p className="text-xs text-(--text-dim) font-medium">{desc}</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
    <div className="pt-8 border-b border-(--card-border)" />
  </div>
);

const ConfigInput = ({ label, desc, type = "text", value, onChange, icon: Icon, prefix, suffix, centerValue = false, disabled = false }) => (
  <div className={`space-y-2 flex flex-col items-center sm:items-start ${disabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>
    <label className={`text-[10px] font-black text-(--text-dim) uppercase tracking-[0.15em] flex items-center gap-1.5 ${centerValue ? 'w-full justify-center' : ''}`}>
      {Icon && <Icon size={12} className="text-primary" />} {label}
    </label>
    <div className="relative group w-full">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-primary">
          {prefix}
        </span>
      )}
      <input
        type={type}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-black/5 dark:bg-black/20 border border-(--card-border) rounded-2xl py-3 outline-none focus:border-primary/50 text-sm font-bold transition-all transition-colors duration-300 ${
          centerValue ? "text-center" : "text-left"
        } ${
          prefix ? "pl-8 pr-4" : "px-4"
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-(--text-dim) uppercase pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
    <p className={`text-[9px] text-(--text-dim) font-black uppercase tracking-wider leading-tight ${centerValue ? 'w-full text-center' : ''}`}>{desc}</p>
  </div>
);

const ToggleInput = ({ label, desc, active, onToggle, disabled = false }) => (
  <div className={`flex items-start justify-between gap-4 p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-(--card-border) ${disabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>
    <div className="space-y-1">
      <p className="text-sm font-black text-(--text-main)">{label}</p>
      <p className="text-[10px] text-(--text-dim) font-medium leading-relaxed max-w-xs">{desc}</p>
    </div>
    <button
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        active ? "bg-primary" : "bg-slate-700"
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

const CAT_LIST = [
    { key: "MOTO", label: "MOTO (Petrol Bike)", icon: "🏍️", color: "primary" },
    { key: "EVMOTO", label: "EVMOTO (Electric Bike)", icon: "⚡🏍️", color: "emerald-500" },
    { key: "AUTO", label: "AUTO (Petrol Auto)", icon: "🛺", color: "emerald-500" },
    { key: "EVAUTO", label: "EVAUTO (Electric Auto)", icon: "⚡🛺", color: "emerald-500" },
    { key: "GO", label: "GO (Hatchback)", icon: "🚕", color: "amber-500" },
    { key: "EVGO", label: "EVGO (Electric Hatch)", icon: "⚡🚕", color: "emerald-500" },
    { key: "PRIME", label: "PRIME (Sedan)", icon: "🚗", color: "blue-500" },
    { key: "XL", label: "XL (SUV)", icon: "🚙", color: "violet-500" },
];

const SystemSettingsPage = () => {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const isSuper = currentUser?.role === "superadmin";
  const { showNativeNotification } = useNotifications();
  const { showAlert, showConfirm } = useDialog();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [loading, setLoading] = useState(true);

  // Configuration State
  const [config, setConfig] = useState({
    commission: "",
    taxPercentage: "",
    maxRadius: "",
    surgeMultiplier: "",
    pricing: {
       MOTO: { baseFare: "", costPerKm: "", perMinRate: "", minFare: "", nightCharge: "", surgeCap: "" },
       EVMOTO: { baseFare: "", costPerKm: "", perMinRate: "", minFare: "", nightCharge: "", surgeCap: "" },
       AUTO: { baseFare: "", costPerKm: "", perMinRate: "", minFare: "", nightCharge: "", surgeCap: "" },
       EVAUTO: { baseFare: "", costPerKm: "", perMinRate: "", minFare: "", nightCharge: "", surgeCap: "" },
       GO: { baseFare: "", costPerKm: "", perMinRate: "", minFare: "", nightCharge: "", surgeCap: "" },
       EVGO: { baseFare: "", costPerKm: "", perMinRate: "", minFare: "", nightCharge: "", surgeCap: "" },
       PRIME: { baseFare: "", costPerKm: "", perMinRate: "", minFare: "", nightCharge: "", surgeCap: "" },
       XL: { baseFare: "", costPerKm: "", perMinRate: "", minFare: "", nightCharge: "", surgeCap: "" }
    },
    platformAccountUserId: "",
    commissionWalletMinThreshold: -150,
    commissionWalletWarningLevel: -50,
    withdrawalMinAmount: 100,
    withdrawalReserveBalance: 50,
    withdrawalDailyMax: 50000,
    referralBonusAmount: 0,
    referralBonusExpiryDays: 0
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to strip symbols for editing
  const strip = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/[₹%xkm\s]/g, "");
  };

  // Fetch initial settings from DB
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/admin/system-settings");
        if (data.success && data.settings) {
          const s = data.settings;
          const mergedPricing = {};
          CAT_LIST.forEach(cat => {
              mergedPricing[cat.key] = s.pricing?.[cat.key] || { baseFare: "0", costPerKm: "0", perMinRate: "0", minFare: "0", nightCharge: "0", surgeCap: "1.8" };
          });

          setConfig({
            ...s,
            pricing: mergedPricing
          });
        }
      } catch (err) {
        console.error("Failed to fetch settings", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading || !config) return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center gap-4">
      <RefreshCw className="animate-spin text-primary" size={40} />
      <p className="text-sm font-black text-primary uppercase tracking-[0.2em] animate-pulse">Establishing Secure Database Link...</p>
    </div>
  );

  const handleSave = async (section = null, fields = null) => {
    setSaving(true);
    try {
      let payload = config;
      if (fields) {
        payload = {};
        fields.forEach(f => payload[f] = config[f]);
      }

      // Use the specific system-config endpoint for financial updates if fields are provided
      const endpoint = fields ? "/admin/system-config" : "/admin/system-settings";
      const method = fields ? "put" : "patch";
      
      const { data } = await api[method](endpoint, payload);
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings", err.message);
      showAlert(err.response?.data?.message || "Cloud sync failed. Check connection.", "Sync Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const updatePriceField = (cat, field, val) => {
      setConfig({
          ...config,
          pricing: {
              ...config.pricing,
              [cat]: {
                  ...config.pricing[cat],
                  [field]: val
              }
          }
      });
  };

  return (
    <div className="mesh-bg min-h-screen relative font-sans text-(--text-main)">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/${currentUser?.role}/dashboard`)}
              className="p-2 hover:bg-(--card-bg) rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-display font-black tracking-tight leading-none">System Settings</h1>
              <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-widest">Platform Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {isSuper && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-black text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={14} /> : (success ? <CheckCircle2 size={14} /> : <Save size={14} />)}
                  {saving ? "Saving..." : (success ? "Saved!" : "Save Changes")}
                </button>
             )}
            <ThemeToggle />
            <div className="flex items-center gap-3 pl-2 border-l border-(--card-border)">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-(--text-main)">{currentUser?.name}</span>
                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${isSuper ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                  {isSuper ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-black text-sm border border-violet-500/20">
                {currentUser?.name?.charAt(0)?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-12 relative z-10">
        
        <SettingGroup title="Vehicle Specific Pricing" desc="Set base fare, per KM, per Min rates and surge limits for all RouteMate categories.">
            {CAT_LIST.map((cat) => (
                <div key={cat.key} className={`col-span-full space-y-4 p-5 rounded-3xl bg-${cat.color}/5 border border-${cat.color}/20 hover:scale-[1.01] transition-all duration-300`}>
                  <h4 className={`text-[10px] font-black text-${cat.color} uppercase tracking-[0.2em] flex items-center gap-2`}>
                    {cat.icon} {cat.label}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <ConfigInput
                      label="Base Fare" desc="Start price" centerValue={true}
                      disabled={!isSuper}
                      value={strip(config.pricing[cat.key]?.baseFare)}
                      onChange={(v) => updatePriceField(cat.key, "baseFare", v)}
                    />
                    <ConfigInput
                      label="Rate/KM" desc="Per KM cost" centerValue={true}
                      disabled={!isSuper}
                      value={strip(config.pricing[cat.key]?.costPerKm)}
                      onChange={(v) => updatePriceField(cat.key, "costPerKm", v)}
                    />
                    <ConfigInput
                      label="Rate/Min" desc="Per Min cost" centerValue={true}
                      disabled={!isSuper}
                      value={strip(config.pricing[cat.key]?.perMinRate)}
                      onChange={(v) => updatePriceField(cat.key, "perMinRate", v)}
                    />
                    <ConfigInput
                      label="Min Fare" desc="Min charge" centerValue={true}
                      disabled={!isSuper}
                      value={strip(config.pricing[cat.key]?.minFare)}
                      onChange={(v) => updatePriceField(cat.key, "minFare", v)}
                    />
                    <ConfigInput
                      label="Night Fix" desc="Flat charge" centerValue={true}
                      disabled={!isSuper}
                      value={strip(config.pricing[cat.key]?.nightCharge)}
                      onChange={(v) => updatePriceField(cat.key, "nightCharge", v)}
                    />
                    <ConfigInput
                      label="Surge Cap" desc="Max surge" centerValue={true}
                      disabled={!isSuper}
                      value={strip(config.pricing[cat.key]?.surgeCap)}
                      onChange={(v) => updatePriceField(cat.key, "surgeCap", v)}
                    />
                  </div>
                </div>
            ))}
        </SettingGroup>

        <SettingGroup title="Global Multipliers" desc="Platform-wide adjustments and fees.">
           <ConfigInput
             label="Demand Ratio Multiplier" desc="Global sensitivity"
             disabled={!isSuper}
             value={config.surgeMultiplier} icon={Sliders} suffix="x"
             onChange={(v) => setConfig({...config, surgeMultiplier: v})}
           />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-full">
               <ConfigInput
                 label="Platform Commission" desc="RouteMate's cut per trip"
                 disabled={!isSuper}
                 value={strip(config.commission)} icon={Smartphone} suffix="%"
                 onChange={(v) => setConfig({...config, commission: v + "%"})}
               />
               <ConfigInput
                 label="Driver Share" desc="Estimated driver earnings"
                 disabled={true}
                 value={100 - (parseFloat(strip(config.commission)) || 0)} icon={Users} suffix="%"
                 onChange={() => {}}
               />
           </div>
        </SettingGroup>

        <div className="glass-card rounded-3xl border border-(--card-border) p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Globe className="text-primary" size={20} />
                    <h4 className="text-sm font-black uppercase tracking-widest">Operational Logic</h4>
                </div>
                <button 
                    onClick={() => handleSave("Operational", ["maxRadius", "realTimeTracking", "autoApproveDrivers"])}
                    className="px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase hover:scale-105 transition-all"
                >
                    Save Operational
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ConfigInput
                  label="Max Search Radius" desc="Distance to scan"
                  value={config.maxRadius} icon={Globe} suffix="km"
                  onChange={(v) => setConfig({...config, maxRadius: v})}
                />
                <div className="flex flex-col gap-4">
                  <ToggleInput
                    label="Real-time Tracking"
                    active={config.realTimeTracking}
                    onToggle={() => setConfig({...config, realTimeTracking: !config.realTimeTracking})}
                  />
                  <ToggleInput
                    label="Auto-Approve Drivers"
                    active={config.autoApproveDrivers}
                    onToggle={() => setConfig({...config, autoApproveDrivers: !config.autoApproveDrivers})}
                  />
                </div>
            </div>
        </div>

        {/* ── Financial & Wallet Logic ────────────────────────────────────────── */}
        <div className="space-y-12 pt-6 border-t border-(--card-border)">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-display font-black text-(--text-main)">Financial Controls</h3>
                    <p className="text-xs text-(--text-dim) font-medium">Manage platform wallets, withdrawal rules, and referral systems.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                    <IndianRupee size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Secure Ledger</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Section 1: Platform Config */}
                <div className="glass-card rounded-3xl border border-(--card-border) p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="text-primary" size={20} />
                            <h4 className="text-sm font-black uppercase tracking-widest">Platform Wallet Config</h4>
                        </div>
                        {isSuper && (
                            <button 
                                onClick={() => handleSave("Platform", ["platformAccountUserId"])}
                                className="px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase hover:scale-105 transition-all"
                            >
                                Save Platform
                            </button>
                        )}
                    </div>
                    <ConfigInput 
                        label="Platform Account User ID" desc={`The central account where all ${config.commission || "15%"} commissions are credited.`}
                        disabled={!isSuper}
                        value={config.platformAccountUserId}
                        onChange={(v) => setConfig({...config, platformAccountUserId: v})}
                    />
                </div>

                {/* Section 2: Driver Wallet Rules */}
                <div className="glass-card rounded-3xl border border-(--card-border) p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Smartphone className="text-primary" size={20} />
                            <h4 className="text-sm font-black uppercase tracking-widest">Driver Wallet & Withdrawal Rules</h4>
                        </div>
                        {isSuper && (
                            <button 
                                onClick={() => handleSave("Driver", ["commissionWalletMinThreshold", "commissionWalletWarningLevel", "withdrawalMinAmount", "withdrawalReserveBalance", "withdrawalDailyMax"])}
                                className="px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase hover:scale-105 transition-all"
                            >
                                Save Driver Rules
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigInput 
                            label="Commission Block Threshold" desc="Trips block when balance falls below this."
                            disabled={!isSuper}
                            value={config.commissionWalletMinThreshold} prefix="₹" type="number"
                            onChange={(v) => setConfig({...config, commissionWalletMinThreshold: v})}
                        />
                        <ConfigInput 
                            label="Commission Warning Level" desc="Sends warning notification before block."
                            disabled={!isSuper}
                            value={config.commissionWalletWarningLevel} prefix="₹" type="number"
                            onChange={(v) => setConfig({...config, commissionWalletWarningLevel: v})}
                        />
                        <ConfigInput 
                            label="Min Withdrawal Amount" desc="Minimum per request."
                            disabled={!isSuper}
                            value={config.withdrawalMinAmount} prefix="₹" type="number"
                            onChange={(v) => setConfig({...config, withdrawalMinAmount: v})}
                        />
                        <ConfigInput 
                            label="Withdrawal Reserve" desc="Mandatory balance kept in wallet."
                            disabled={!isSuper}
                            value={config.withdrawalReserveBalance} prefix="₹" type="number"
                            onChange={(v) => setConfig({...config, withdrawalReserveBalance: v})}
                        />
                        <ConfigInput 
                            label="Daily Withdrawal Max" desc="Max total per day across requests."
                            disabled={!isSuper}
                            value={config.withdrawalDailyMax} prefix="₹" type="number"
                            onChange={(v) => setConfig({...config, withdrawalDailyMax: v})}
                        />
                    </div>
                </div>

                {/* Section 3: Passenger Wallet Rules */}
                <div className="glass-card rounded-3xl border border-(--card-border) p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="text-primary" size={20} />
                            <h4 className="text-sm font-black uppercase tracking-widest">Passenger Wallet Rules</h4>
                        </div>
                        {isSuper && (
                            <button 
                                onClick={() => handleSave("Passenger", ["referralBonusAmount", "referralBonusExpiryDays"])}
                                className="px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase hover:scale-105 transition-all"
                            >
                                Save Passenger Rules
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigInput 
                            label="Referral Bonus Amount" desc="Credited when referred friend completes first trip. 0 = OFF."
                            disabled={!isSuper}
                            value={config.referralBonusAmount} prefix="₹" type="number"
                            onChange={(v) => setConfig({...config, referralBonusAmount: v})}
                        />
                        <ConfigInput 
                            label="Referral Bonus Expiry (Days)" desc="Days before bonus is debited from wallet (0 = no expiry)."
                            disabled={!isSuper}
                            value={config.referralBonusExpiryDays} suffix="Days" type="number"
                            onChange={(v) => setConfig({...config, referralBonusExpiryDays: v})}
                        />
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-4">
                        <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-500/80 font-medium leading-relaxed">
                            <strong>Note:</strong> Passenger wallets are automatically blocked from booking new rides if the balance reaches <strong>₹0</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <section className="glass-card rounded-4xl p-8 border border-(--card-border) flex flex-col md:flex-row items-center gap-10">
           <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <Server className="text-primary" size={20} />
                <h3 className="font-display font-black text-xl">Core Database Sync</h3>
              </div>
              <p className="text-sm text-(--text-dim) leading-relaxed">
                Platform configuration is cached on distributed edge nodes. Saving changes will propagate 
                updates to all users within 30 seconds.
              </p>
           </div>
            {isSuper && (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3.5 rounded-2xl border border-primary text-primary hover:bg-primary hover:text-black font-black text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                Push to Production
              </button>
            )}
        </section>

        {/* ── Personal Account Section ── */}
        <section className="pt-10 border-t border-(--card-border) space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={async () => {
                  try {
                    await logout();
                    navigate("/signin");
                  } catch (err) {
                    console.error("Logout failed", err);
                  }
                }}
                className="group flex items-center justify-between p-5 rounded-3xl bg-black/5 dark:bg-white/5 border border-(--card-border) hover:border-primary/40 transition-all hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary text-black rounded-2xl group-hover:scale-110 transition-all">
                    <LogOut size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-widest text-(--text-main)">Secure Sign Out</p>
                    <p className="text-[10px] text-(--text-dim) font-bold">Terminate current session</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={async () => {
                  const confirmed = await showConfirm(
                    "FATAL ACTION: Are you sure you want to PERMANENTLY delete your Admin account?\nThis action is irreversible.",
                    "Purge Account",
                    "error",
                    "Yes, Purge"
                  );
                  if (confirmed) {
                    setIsDeleting(true);
                    try {
                      await api.delete("/users/delete-account");
                      await logout();
                      navigate("/signin");
                    } catch (err) {
                      showAlert("Deletion failed: " + (err.response?.data?.message || "Server Error"), "Error", "error");
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                disabled={isDeleting}
                className="group flex items-center justify-between p-5 rounded-3xl bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 transition-all hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500 text-white rounded-2xl group-hover:scale-110 transition-all shadow-lg shadow-rose-500/20">
                    <Trash2 size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-widest text-rose-500">{isDeleting ? "Processing..." : "Purge Account"}</p>
                    <p className="text-[10px] text-rose-500/60 font-bold">Permanent destructive deletion</p>
                  </div>
                </div>
              </button>
           </div>
        </section>

      </main>

      <footer className="mx-auto max-w-5xl py-10 px-6 border-t border-(--card-border) flex justify-between items-center opacity-50">
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
           <p className="text-[10px] font-black tracking-widest uppercase">Global Cloud Nodes Live</p>
        </div>
      </footer>
    </div>
  );
};

export default SystemSettingsPage;
