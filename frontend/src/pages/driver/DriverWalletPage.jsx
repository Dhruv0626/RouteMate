import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ArrowUpRight, ArrowDownLeft, RefreshCw,
  Wallet, TrendingUp, AlertTriangle, CheckCircle2, AlertCircle,
  Loader2, IndianRupee, Zap, ShieldCheck, BanknoteIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { getMyWallet, openRazorpayCheckout, driverWithdrawal } from "../../services/paymentService";

const COMMISSION_TOPUP_AMOUNTS = [50, 100, 200, 500];
const WITHDRAWAL_AMOUNTS       = [100, 500, 1000, 2000];

const fmt   = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;
const dtFmt = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const refColor = {
  trip:       "bg-violet-500/10 text-violet-400 border-violet-500/20",
  topup:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  refund:     "bg-sky-500/10 text-sky-400 border-sky-500/20",
  promo:      "bg-amber-500/10 text-amber-400 border-amber-500/20",
  withdrawal: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

// ─── Sub-component: Modal ─────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-md glass-card rounded-[2rem] border border-(--card-border) p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-black text-(--text-main)">{title}</h3>
        <button onClick={onClose} className="text-(--text-dim) hover:text-(--text-main) transition-colors text-xl font-black">✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const DriverWalletPage = () => {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [wallet, setWallet]     = useState(null);
  const [txns, setTxns]         = useState([]);
  const [config, setConfig]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showTopup, setShowTopup]       = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedTopupAmt, setSelectedTopupAmt]   = useState(null);
  const [customTopupAmt, setCustomTopupAmt]         = useState("");
  const [selectedWithdrawAmt, setSelectedWithdrawAmt] = useState(null);
  const [customWithdrawAmt, setCustomWithdrawAmt]     = useState("");
  const [busy, setBusy]         = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchWallet = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await getMyWallet();
      if (data.success) {
        setWallet(data.wallet);
        setTxns(data.transactions || []);
        setConfig(data.config || {});
      }
    } catch {
      showToast("Failed to load wallet", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  // Commission wallet topup via Razorpay
  const handleCommissionTopup = async () => {
    const amount = selectedTopupAmt || parseFloat(customTopupAmt);
    if (!amount || amount < 10) return showToast("Minimum topup is ₹10", "error");
    setBusy(true);
    try {
      const response = await openRazorpayCheckout({
        amount,
        purpose: "commission_topup",
        name: user?.name || "",
        email: user?.email || "",
        description: `Commission wallet topup ₹${amount}`,
      });
      if (response) {
        showToast(`₹${amount} commission topup initiated [TEST]`);
        setShowTopup(false);
        setSelectedTopupAmt(null);
        setCustomTopupAmt("");
        setTimeout(() => fetchWallet(true), 3000);
      }
    } catch (err) {
      showToast(err.message || "Payment failed", "error");
    } finally {
      setBusy(false);
    }
  };

  // Earnings withdrawal (simulated in TEST)
  const handleWithdrawal = async () => {
    const amount = selectedWithdrawAmt || parseFloat(customWithdrawAmt);
    if (!amount) return showToast("Enter withdrawal amount", "error");
    setBusy(true);
    try {
      const { data } = await driverWithdrawal(amount);
      if (data.success) {
        showToast(`₹${amount} withdrawal processed [TEST — simulated]`);
        setShowWithdraw(false);
        setSelectedWithdrawAmt(null);
        setCustomWithdrawAmt("");
        await fetchWallet(true);
      } else {
        showToast(data.message, "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Withdrawal failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  const earningsBalance  = wallet?.walletBalance    ?? 0;
  const commissionBal    = wallet?.commissionWallet  ?? 0;
  const tripsBlocked     = wallet?.tripsBlocked      ?? false;
  const commissionWarn   = wallet?.commissionWarning ?? false;
  const minWithdraw      = config?.withdrawalMinAmount      ?? 100;
  const reserveBal       = config?.withdrawalReserveBalance ?? 50;
  const maxWithdrawable  = Math.max(0, earningsBalance - reserveBal);

  return (
    <div className="mesh-bg min-h-screen font-sans text-(--text-main)">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-black ${
          toast.type === "error" ? "bg-rose-500 text-white" : "bg-emerald-500 text-black"
        }`}>
          {toast.type === "error" ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)}
              className="rounded-xl border border-(--card-border) p-2 text-(--text-dim) hover:bg-(--card-bg) transition-all">
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">Driver Wallet</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchWallet(true)} disabled={refreshing}
              className="rounded-xl border border-(--card-border) p-2 text-(--text-dim) hover:bg-(--card-bg) transition-all">
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">


        {/* ── Trips Blocked Alert ── */}
        {tripsBlocked && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4">
            <AlertTriangle size={20} className="text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-rose-400">New Trips Blocked</p>
              <p className="text-xs text-rose-400/70 mt-0.5">
                Commission wallet at ₹{commissionBal.toFixed(2)}. Topup to resume accepting rides.
              </p>
            </div>
            <button onClick={() => setShowTopup(true)}
              className="ml-auto shrink-0 bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-rose-400 transition-all">
              Topup Now
            </button>
          </div>
        )}

        {/* ── Commission Warning ── */}
        {commissionWarn && !tripsBlocked && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            <p className="text-xs font-bold text-amber-400">
              Commission wallet low: ₹{commissionBal.toFixed(2)}. Consider topping up.
            </p>
            <button onClick={() => setShowTopup(true)}
              className="ml-auto shrink-0 bg-amber-500 text-black text-xs font-black px-4 py-2 rounded-xl hover:bg-amber-400 transition-all">
              Topup
            </button>
          </div>
        )}

        {/* ── Two Wallet Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Earnings Wallet */}
          <div className="from-primary to-primary-dark rounded-[2rem] bg-linear-to-br p-7 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 h-40 w-40 bg-white/10 blur-2xl rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-black/20 p-2 rounded-xl"><TrendingUp size={18} className="text-black" /></div>
                <span className="text-[10px] font-black text-black/60 uppercase tracking-[0.2em]">Earnings Wallet</span>
              </div>
              <p className="text-4xl font-black text-black">{fmt(earningsBalance)}</p>
              <p className="text-xs text-black/50 mt-2">UPI / Wallet trip earnings accumulate here</p>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setShowWithdraw(true)}
                  className="flex-1 bg-black/20 text-black text-[10px] font-black uppercase tracking-widest py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-black/30 transition-all border border-black/10">
                  <BanknoteIcon size={14}/> Withdraw
                </button>
              </div>
            </div>
          </div>

          {/* Commission Wallet */}
          <div className={`rounded-[2rem] p-7 shadow-2xl relative overflow-hidden ${
            tripsBlocked ? "bg-rose-950/50 border border-rose-500/30" : commissionWarn ? "bg-amber-950/30 border border-amber-500/20" : "glass-card border border-(--card-border)"
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-xl ${tripsBlocked ? "bg-rose-500/20" : "bg-primary/10"}`}>
                <ShieldCheck size={18} className={tripsBlocked ? "text-rose-400" : "text-primary"} />
              </div>
              <span className="text-[10px] font-black text-(--text-dim) uppercase tracking-[0.2em]">Commission Wallet</span>
            </div>
            <p className={`text-4xl font-black ${
              tripsBlocked ? "text-rose-400" : commissionWarn ? "text-amber-400" : "text-(--text-main)"
            }`}>{fmt(commissionBal)}</p>
            <p className="text-xs text-(--text-dim) mt-2">Covers {config.commission || "15"} platform fee on cash trips</p>
            <button onClick={() => setShowTopup(true)}
              className="mt-5 w-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-all border border-primary/20">
              <IndianRupee size={14}/> Topup Commission Wallet
            </button>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Earned", value: fmt(txns.filter(t => t.type === "credit" && t.reference === "trip").reduce((s, t) => s + t.amount, 0)) },
            { label: "Withdrawn",    value: fmt(txns.filter(t => t.reference === "withdrawal").reduce((s, t) => s + t.amount, 0)) },
            { label: "Commission Paid", value: fmt(txns.filter(t => t.type === "debit" && t.reference === "trip").reduce((s, t) => s + t.amount, 0)) },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-2xl border border-(--card-border) p-4 text-center">
              <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">{s.label}</p>
              <p className="text-lg font-black text-(--text-main) mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Transaction History ── */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-black text-(--text-main) flex items-center gap-2 px-1">
            Transactions <span className="bg-primary h-1.5 w-1.5 rounded-full"/>
          </h2>
          {txns.length === 0 ? (
            <div className="glass-card rounded-3xl border border-(--card-border) p-12 text-center">
              <Wallet size={40} className="mx-auto text-(--text-dim) mb-3 opacity-40"/>
              <p className="text-sm font-black text-(--text-dim)">No transactions yet</p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden rounded-3xl border border-(--card-border)">
              <div className="divide-y divide-(--card-border)">
                {txns.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                        tx.type === "debit" ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {tx.type === "debit" ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}
                      </div>
                      <div>
                        <p className="text-sm font-black text-(--text-main)">{tx.description || tx.reference}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${refColor[tx.reference] || "bg-white/5 text-(--text-dim) border-white/10"}`}>
                            {tx.reference}
                          </span>
                          <span className="text-[10px] text-(--text-dim)">{dtFmt(tx.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className={`text-base font-black ${tx.type === "debit" ? "text-rose-400" : "text-emerald-400"}`}>
                        {tx.type === "debit" ? "-" : "+"}{fmt(tx.amount)}
                      </p>
                      <p className="text-[10px] text-(--text-dim)">Bal: {fmt(tx.balanceAfter)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── Commission Topup Modal ── */}
      {showTopup && (
        <Modal title="Topup Commission Wallet" onClose={() => { setShowTopup(false); setSelectedTopupAmt(null); setCustomTopupAmt(""); }}>
          <div className="grid grid-cols-4 gap-3">
            {COMMISSION_TOPUP_AMOUNTS.map(a => (
              <button key={a} onClick={() => { setSelectedTopupAmt(a); setCustomTopupAmt(""); }}
                className={`py-3 rounded-2xl text-sm font-black border transition-all ${
                  selectedTopupAmt === a
                    ? "bg-primary text-black border-primary"
                    : "border-(--card-border) text-(--text-main) hover:border-primary/40"
                }`}>₹{a}</button>
            ))}
          </div>
          <div className="relative">
            <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim)"/>
            <input type="number" min={10} value={customTopupAmt}
              onChange={e => { setCustomTopupAmt(e.target.value); setSelectedTopupAmt(null); }}
              placeholder="Custom amount"
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-(--card-border) bg-(--bg-main) text-(--text-main) font-black text-sm focus:outline-none focus:border-primary/60 transition-all"
            />
          </div>
          <p className="text-xs text-(--text-dim) text-center">[TEST] UPI: <strong>success@razorpay</strong> · No real debit</p>
          <button onClick={handleCommissionTopup} disabled={busy || (!selectedTopupAmt && !customTopupAmt)}
            className="w-full bg-primary text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {busy ? <Loader2 size={20} className="animate-spin"/> : <IndianRupee size={20}/>}
            {busy ? "Processing…" : "Topup Commission Wallet"}
          </button>
        </Modal>
      )}

      {/* ── Withdrawal Modal ── */}
      {showWithdraw && (
        <Modal title="Withdraw Earnings" onClose={() => { setShowWithdraw(false); setSelectedWithdrawAmt(null); setCustomWithdrawAmt(""); }}>
          <div className="glass-card rounded-2xl border border-(--card-border) p-4 flex justify-between">
            <div>
              <p className="text-[10px] font-black text-(--text-dim) uppercase">Available</p>
              <p className="text-2xl font-black text-(--text-main)">{fmt(maxWithdrawable)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-(--text-dim) uppercase">Reserve Kept</p>
              <p className="text-sm font-black text-(--text-dim)">{fmt(reserveBal)}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {WITHDRAWAL_AMOUNTS.map(a => (
              <button key={a} onClick={() => { setSelectedWithdrawAmt(a); setCustomWithdrawAmt(""); }}
                disabled={a > maxWithdrawable}
                className={`py-3 rounded-2xl text-sm font-black border transition-all disabled:opacity-30 ${
                  selectedWithdrawAmt === a
                    ? "bg-primary text-black border-primary"
                    : "border-(--card-border) text-(--text-main) hover:border-primary/40"
                }`}>₹{a}</button>
            ))}
          </div>
          <div className="relative">
            <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim)"/>
            <input type="number" min={minWithdraw} max={maxWithdrawable} value={customWithdrawAmt}
              onChange={e => { setCustomWithdrawAmt(e.target.value); setSelectedWithdrawAmt(null); }}
              placeholder={`Min ₹${minWithdraw}`}
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-(--card-border) bg-(--bg-main) text-(--text-main) font-black text-sm focus:outline-none focus:border-primary/60 transition-all"
            />
          </div>
          <p className="text-xs text-(--text-dim) text-center">[TEST] Simulated — No real bank transfer</p>
          <button onClick={handleWithdrawal} disabled={busy || (!selectedWithdrawAmt && !customWithdrawAmt)}
            className="w-full bg-primary text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {busy ? <Loader2 size={20} className="animate-spin"/> : <BanknoteIcon size={20}/>}
            {busy ? "Processing…" : "Withdraw to Bank [TEST]"}
          </button>
        </Modal>
      )}
    </div>
  );
};

export default DriverWalletPage;
