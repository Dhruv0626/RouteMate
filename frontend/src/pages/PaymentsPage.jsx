import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet, ChevronLeft, Plus, ArrowUpRight, ArrowDownLeft,
  Clock, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  IndianRupee, ShieldCheck, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { getMyWallet, openRazorpayCheckout } from "../services/paymentService";

// ─── Amount Quick-Pick ────────────────────────────────────────────────────────
const TOPUP_AMOUNTS = [50, 100, 200, 500];

// ─── Reference badge colour ───────────────────────────────────────────────────
const refColor = {
  trip:       "bg-violet-500/10 text-violet-400 border-violet-500/20",
  topup:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  refund:     "bg-sky-500/10 text-sky-400 border-sky-500/20",
  promo:      "bg-amber-500/10 text-amber-400 border-amber-500/20",
  withdrawal: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const fmt = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;
const dtFmt = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// ─── Component ────────────────────────────────────────────────────────────────
const PaymentsPage = () => {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [wallet, setWallet]         = useState(null);
  const [txns, setTxns]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopup, setShowTopup]   = useState(false);
  const [customAmt, setCustomAmt]   = useState("");
  const [selectedAmt, setSelectedAmt] = useState(null);
  const [paying, setPaying]         = useState(false);
  const [toast, setToast]           = useState(null);

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
      }
    } catch {
      showToast("Failed to load wallet data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const handleTopup = async () => {
    const amount = selectedAmt || parseFloat(customAmt);
    if (!amount || amount < 10)
      return showToast("Minimum topup is ₹10", "error");

    setPaying(true);
    try {
      const response = await openRazorpayCheckout({
        amount,
        purpose: "wallet_topup",
        name:    user?.name || "",
        email:   user?.email || "",
        description: `Wallet topup ₹${amount}`,
      });
      if (response) {
        showToast(`₹${amount} topup initiated! Balance will update shortly. [TEST]`);
        setShowTopup(false);
        setSelectedAmt(null);
        setCustomAmt("");
        setTimeout(() => fetchWallet(true), 3000);
      }
    } catch (err) {
      showToast(err.message || "Payment failed", "error");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  const balance = wallet?.walletBalance ?? 0;

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
              className="rounded-xl border border-(--card-border) p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all">
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">Payments &amp; Wallet</h1>
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

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">

        {/* ── Wallet Hero ── */}
        <section className="from-primary to-primary-dark rounded-[2.5rem] bg-linear-to-br p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 h-80 w-80 bg-white/10 blur-3xl rounded-full transition-transform group-hover:scale-110" />
          <div className="relative flex flex-col md:flex-row justify-between gap-8 md:items-center">
            <div>
              <p className="text-[10px] font-black text-black/60 uppercase tracking-[0.3em] mb-2">
                <Wallet size={12} className="inline mr-1" />Available Balance
              </p>
              <h2 className="text-5xl font-black text-black">{fmt(balance)}</h2>
              <p className="mt-3 text-xs font-bold text-black/60 flex items-center gap-2">
                <ShieldCheck size={13}/> Secure &amp; encrypted wallet
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowTopup(true)}
                className="bg-black/20 text-black px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 hover:bg-black/30 transition-all shadow-xl flex items-center gap-2 border border-black/20">
                <Plus size={16}/> Add Money
              </button>
            </div>
          </div>
        </section>

        {/* ── Test Mode Banner ── */}
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
          <Zap size={16} className="text-amber-400 shrink-0" />
          <p className="text-xs font-bold text-amber-400">
            <span className="font-black">TEST MODE</span> — Razorpay test environment active.
            Use UPI: <code className="bg-amber-500/10 px-1 rounded">success@razorpay</code> or Card:
            <code className="bg-amber-500/10 px-1 rounded ml-1">4111 1111 1111 1111</code>
          </p>
        </div>

        {/* ── Quick Stats ── */}
        <section className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Total Credited",
              value: fmt(txns.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0)),
              icon: <ArrowDownLeft size={20} className="text-emerald-400"/>,
              color: "bg-emerald-500/10",
            },
            {
              label: "Total Debited",
              value: fmt(txns.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0)),
              icon: <ArrowUpRight size={20} className="text-rose-400"/>,
              color: "bg-rose-500/10",
            },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-3xl border border-(--card-border) p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-black text-(--text-main)">{s.value}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Transaction History ── */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-black text-(--text-main) flex items-center gap-2 px-1">
            Transactions <span className="bg-primary h-1.5 w-1.5 rounded-full"/>
          </h2>

          {txns.length === 0 ? (
            <div className="glass-card rounded-3xl border border-(--card-border) p-12 text-center">
              <Clock size={40} className="mx-auto text-(--text-dim) mb-3 opacity-40"/>
              <p className="text-sm font-black text-(--text-dim)">No transactions yet</p>
              <p className="text-xs text-(--text-dim) mt-1">Add money to get started</p>
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

      {/* ── Topup Modal ── */}
      {showTopup && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-[2rem] border border-(--card-border) p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-black text-(--text-main)">Add Money</h3>
              <button onClick={() => { setShowTopup(false); setSelectedAmt(null); setCustomAmt(""); }}
                className="text-(--text-dim) hover:text-(--text-main) transition-colors text-xl font-black">✕</button>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-3">
              {TOPUP_AMOUNTS.map(a => (
                <button key={a} onClick={() => { setSelectedAmt(a); setCustomAmt(""); }}
                  className={`py-3 rounded-2xl text-sm font-black border transition-all ${
                    selectedAmt === a
                      ? "bg-primary text-black border-primary"
                      : "border-(--card-border) text-(--text-main) hover:border-primary/40"
                  }`}>
                  ₹{a}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="relative">
              <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim)"/>
              <input
                type="number"
                min={10}
                value={customAmt}
                onChange={e => { setCustomAmt(e.target.value); setSelectedAmt(null); }}
                placeholder="Custom amount"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-(--card-border) bg-(--bg-main) text-(--text-main) font-black text-sm focus:outline-none focus:border-primary/60 transition-all"
              />
            </div>

            {/* Test note */}
            <p className="text-xs text-(--text-dim) text-center">
              [TEST] Use UPI: <strong>success@razorpay</strong> · No real bank debit
            </p>

            <button onClick={handleTopup} disabled={paying || (!selectedAmt && !customAmt)}
              className="w-full bg-primary text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20">
              {paying ? <Loader2 size={20} className="animate-spin"/> : <Plus size={20}/>}
              {paying ? "Processing…" : `Add ${selectedAmt ? `₹${selectedAmt}` : customAmt ? `₹${customAmt}` : "Money"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
