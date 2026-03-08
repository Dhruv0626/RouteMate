import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ChevronLeft, ArrowUp, ArrowDown, CreditCard, Building2, CheckCircle, AlertCircle } from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const PAYOUT_HISTORY = [
  { id: 1, date: "7 Mar 2026", amount: "₹3,640", mode: "UPI — gpay@dhruv", status: "success" },
  { id: 2, date: "28 Feb 2026", amount: "₹4,120", mode: "Bank — SBI ••••4521", status: "success" },
  { id: 3, date: "21 Feb 2026", amount: "₹2,875", mode: "UPI — gpay@dhruv", status: "success" },
  { id: 4, date: "14 Feb 2026", amount: "₹1,230", mode: "Bank — SBI ••••4521", status: "failed" },
];

const PayoutsPage = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState("upi");
  const [upiId, setUpiId] = useState("gpay@dhruv");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [loading, setLoading] = useState(false);

  const availableBalance = 3640;
  const lifetimeEarnings = 58420;

  const handleWithdraw = () => {
    const amt = Number(amount);
    if (!amount || amt < 100 || amt > availableBalance) {
      setStatus("error");
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStatus("success");
      setAmount("");
      setTimeout(() => setStatus(null), 3000);
    }, 1500);
  };

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main)">
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/driver/dashboard")} className="rounded-xl p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all">
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">Payouts</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="from-primary to-primary-dark relative overflow-hidden rounded-3xl bg-linear-to-br p-6 shadow-xl">
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-1">Available</p>
            <p className="text-3xl font-black text-black">₹{availableBalance.toLocaleString()}</p>
          </div>
          <div className="glass-card rounded-3xl p-6">
            <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest mb-1">Lifetime</p>
            <p className="text-3xl font-black text-(--text-main)">₹{(lifetimeEarnings / 1000).toFixed(0)}K</p>
          </div>
        </div>

        {/* Withdraw Form */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <h2 className="font-display font-black text-(--text-main)">Withdraw Funds</h2>

          {/* Method Toggle */}
          <div className="flex rounded-xl border border-(--card-border) bg-(--card-bg) p-1">
            <button onClick={() => setMethod("upi")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-black transition-all ${method === "upi" ? "bg-primary text-black" : "text-(--text-dim)"}`}>
              <CreditCard size={14} /> UPI
            </button>
            <button onClick={() => setMethod("bank")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-black transition-all ${method === "bank" ? "bg-primary text-black" : "text-(--text-dim)"}`}>
              <Building2 size={14} /> Bank
            </button>
          </div>

          {/* Input */}
          <div className="space-y-3">
            {method === "upi" ? (
              <div>
                <label className="mb-1.5 block text-[10px] font-black text-(--text-dim) uppercase tracking-widest">UPI ID</label>
                <input value={upiId} onChange={e => setUpiId(e.target.value)}
                  className="w-full rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-3 text-sm font-bold text-(--text-main) focus:border-primary focus:outline-none transition-all"
                  placeholder="yourname@upi" />
              </div>
            ) : (
              <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-4 text-sm font-bold text-(--text-dim)">
                Bank: State Bank of India •••• 4521
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[10px] font-black text-(--text-dim) uppercase tracking-widest">Amount (₹)</label>
              <div className="relative">
                <span className="absolute top-1/2 left-4 -translate-y-1/2 font-black text-(--text-dim)">₹</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="100" max={availableBalance}
                  className="w-full rounded-xl border border-(--card-border) bg-(--card-bg) py-3 pr-4 pl-8 text-sm font-bold text-(--text-main) focus:border-primary focus:outline-none transition-all"
                  placeholder="Min ₹100" />
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="flex gap-2">
              {[500, 1000, 2000, availableBalance].map(a => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className="flex-1 rounded-xl border border-(--card-border) bg-(--card-bg) py-1.5 text-xs font-black text-(--text-dim) hover:border-primary hover:text-primary transition-all">
                  ₹{a >= 1000 ? `${a / 1000}K` : a}
                </button>
              ))}
            </div>
          </div>

          {/* Status Messages */}
          {status === "success" && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm font-bold text-emerald-400">
              <CheckCircle size={16} /> Withdrawal initiated successfully!
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm font-bold text-red-400">
              <AlertCircle size={16} /> Enter a valid amount (₹100 – ₹{availableBalance.toLocaleString()})
            </div>
          )}

          <button onClick={handleWithdraw} disabled={loading}
            className="w-full rounded-2xl bg-primary py-4 text-sm font-black text-black tracking-widest uppercase hover:opacity-90 disabled:opacity-60 transition-all">
            {loading ? "Processing..." : "Withdraw Now"}
          </button>
        </div>

        {/* Payout History */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="font-display font-black text-(--text-main) mb-4">Payout History</h2>
          <div className="space-y-3">
            {PAYOUT_HISTORY.map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-(--card-border) bg-(--card-bg) p-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${p.status === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {p.status === "success" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-(--text-main)">{p.mode}</p>
                  <p className="text-[10px] text-(--text-dim)">{p.date}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${p.status === "success" ? "text-emerald-400" : "text-red-400"}`}>{p.amount}</p>
                  <p className={`text-[10px] font-bold capitalize ${p.status === "success" ? "text-emerald-400" : "text-red-400"}`}>{p.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PayoutsPage;
