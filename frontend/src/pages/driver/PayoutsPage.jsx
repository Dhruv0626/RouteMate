import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Smartphone,
  IndianRupee,
  Download,
  Check,
  AlertCircle,
  ChevronRight,
  Lock,
  CheckCircle,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useEffect } from "react";
import { getMyWallet } from "../../services/paymentService";
import { exportWalletStatementToPDF } from "../../utils/exportUtils";

const PayoutsPage = () => {
  const navigate = useNavigate();
  const [showCardNumbers, setShowCardNumbers] = useState({});
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [activeTab, setActiveTab] = useState("methods");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showNotification, setShowNotification] = useState(null);

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [sysConfig, setSysConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const [walletStats, setWalletStats] = useState({
    totalWithdrawn: 0,
    pendingWithdrawal: 0,
    availableBalance: 0,
    nextPayoutDate: "Every Friday",
  });

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        setLoading(true);
        const res = await getMyWallet();
        if (res.data.success) {
          setWalletStats({
            availableBalance: res.data.wallet.walletBalance || res.data.wallet.balance || 0,
            totalWithdrawn: res.data.stats.totalWithdrawn || 0,
            pendingWithdrawal: res.data.wallet.pendingWithdrawals || 0,
            nextPayoutDate: "Every Friday",
          });
          setPaymentHistory(res.data.transactions || []);
          setSysConfig(res.data.config);
        }
      } catch (err) {
        console.error("Failed to fetch wallet data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  const withdrawalStats = paymentHistory
    .filter(tx => tx.type === 'withdrawal')
    .slice(0, 6)
    .map(tx => ({ month: new Date(tx.date).toLocaleDateString('en-IN', { month: 'short' }), amount: tx.amount }));

  const maxWithdrawal = Math.max(...withdrawalStats.map((s) => s.amount));

  const feeStructure = [
    {
      type: "Bank Transfer",
      method: "NEFT/RTGS",
      fee: "Free",
      processingTime: "1-2 hours",
      icon: "🏦",
    },
    {
      type: "Digital Wallet",
      method: "Google Pay, PhonePe",
      fee: "Free",
      processingTime: "Instant",
      icon: "📱",
    },
    {
      type: "Card Transfer",
      method: "Debit Card",
      fee: "₹10 + GST",
      processingTime: "2-3 hours",
      icon: "💳",
    },
  ];

  const toggleCardVisibility = (methodId) => {
    setShowCardNumbers((prev) => ({
      ...prev,
      [methodId]: !prev[methodId],
    }));
  };

  const handleSetDefault = (methodId) => {
    setPaymentMethods((prev) =>
      prev.map((method) => ({
        ...method,
        isDefault: method.id === methodId,
      }))
    );
    setShowNotification({
      type: "success",
      message: "Payment method set as default",
    });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handleEditMethod = (methodId) => {
    setShowNotification({
      type: "info",
      message: "Edit functionality - Navigate to payment method editor",
    });
    // In a real app, this would open a modal or navigate to edit page
    // navigate(`/driver/payment/edit/${methodId}`);
  };

  const handleRemoveMethod = (methodId) => {
    setPaymentMethods((prev) => prev.filter((method) => method.id !== methodId));
    setShowNotification({
      type: "danger",
      message: "Payment method removed",
    });
    setExpandedMethod(null);
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handleAddMethod = () => {
    setShowNotification({
      type: "info",
      message: "Add new payment method - Opening payment method form",
    });
    // In a real app, this would open a modal or navigate to add page
    // navigate("/driver/payment/add");
  };

  const handleWithdraw = () => {
    setShowNotification({
      type: "success",
      message: "Withdrawal initiated - Processing your request",
    });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const handleDownloadStatement = () => {
    if (paymentHistory.length === 0) {
      setShowNotification({
        type: "info",
        message: "No transactions to export",
      });
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    exportWalletStatementToPDF(paymentHistory, walletStats, `RouteMate_Statement_${today}.pdf`);
    setShowNotification({
      type: "success",
      message: "Statement generated successfully",
    });
    setTimeout(() => setShowNotification(null), 3000);
  };

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main) hover:border-primary/40"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">
                Payments
              </h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                Manage payment methods
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleDownloadStatement}
              className="rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-2 text-sm font-semibold text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5 flex items-center gap-2"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Statement</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Notification Toast */}
        {showNotification && (
          <div
            className={`rounded-2xl border p-4 flex items-center gap-3 animation-fadeIn ${
              showNotification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : showNotification.type === "danger"
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
            }`}
          >
            {showNotification.type === "success" && <CheckCircle size={20} />}
            {showNotification.type === "danger" && <AlertCircle size={20} />}
            {showNotification.type === "info" && <AlertCircle size={20} />}
            <span className="font-semibold">{showNotification.message}</span>
          </div>
        )}

        {/* ── Wallet Balance ── */}
        <section className="glass-card group relative overflow-hidden rounded-4xl border border-(--card-border) p-8 lg:p-12 shadow-sm">
          <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full blur-3xl transition-all duration-700" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Section */}
            <div className="space-y-6 flex-1">
              <div>
                <p className="mb-2 text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                  Available Balance
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl font-black text-(--text-main)">
                    ₹{walletStats.availableBalance.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-emerald-500">
                    Ready to Withdraw
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-t border-(--card-border) pt-6">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Total Withdrawn
                  </span>
                  <span className="font-bold text-(--text-main)">
                    ₹{walletStats.totalWithdrawn.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Pending Withdrawal
                  </span>
                  <span className="font-bold text-amber-500">
                    ₹{walletStats.pendingWithdrawal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Next Payout
                  </span>
                  <span className="font-bold text-(--text-main)">
                    {walletStats.nextPayoutDate}
                  </span>
                </div>
              </div>

              <button
                onClick={handleWithdraw}
                className="w-full rounded-xl bg-linear-to-r from-primary to-primary-dark px-6 py-3 text-sm font-black text-black transition-all hover:-translate-y-px hover:shadow-lg"
              >
                Withdraw Now
              </button>
            </div>

            {/* Withdrawal Trend Chart */}
            <div className="flex-1">
              <p className="mb-6 text-sm font-bold text-(--text-dim)">
                Withdrawal Trend
              </p>
              <div className="flex items-end justify-between gap-4 h-48">
                {withdrawalStats.map((item, idx) => (
                  <div
                    key={idx}
                    className="group/bar relative flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="relative h-full w-full flex items-end justify-center">
                      <div
                        className="from-primary to-primary-dark group-hover/bar:shadow-primary/40 w-3/5 rounded-t-lg bg-linear-to-t shadow-lg transition-all duration-300 group-hover/bar:shadow-xl"
                        style={{
                          height: `${(item.amount / maxWithdrawal) * 100}%`,
                        }}
                      >
                        <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 dark:bg-white/80 text-white dark:text-black px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-opacity z-20">
                          ₹{item.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-(--text-main)">
                        {item.month}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Tabs ── */}
        <section>
          <div className="flex gap-2 border-b border-(--card-border) mb-6">
            <button
              onClick={() => setActiveTab("methods")}
              className={`px-4 py-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === "methods"
                  ? "border-primary text-primary"
                  : "border-transparent text-(--text-dim) hover:text-(--text-main)"
              }`}
            >
              Payment Methods
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-(--text-dim) hover:text-(--text-main)"
              }`}
            >
              Transaction History
            </button>
            <button
              onClick={() => setActiveTab("fees")}
              className={`px-4 py-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === "fees"
                  ? "border-primary text-primary"
                  : "border-transparent text-(--text-dim) hover:text-(--text-main)"
              }`}
            >
              Fee Structure
            </button>
          </div>

          {/* ── Payment Methods Tab ── */}
          {activeTab === "methods" && (
            <div className="space-y-4">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
                  Your Payment Methods{" "}
                  <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
                </h2>
                <button
                  onClick={handleAddMethod}
                  className="rounded-xl bg-linear-to-r from-primary to-primary-dark px-4 py-2 text-sm font-black text-black transition-all hover:-translate-y-px hover:shadow-lg flex items-center gap-2"
                >
                  <Plus size={16} /> Add Method
                </button>
              </div>

              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="glass-card group rounded-3xl border border-(--card-border) p-6 shadow-sm transition-all hover:border-primary/40 cursor-pointer"
                    onClick={() =>
                      setExpandedMethod(
                        expandedMethod === method.id ? null : method.id
                      )
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="text-4xl">{method.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-black text-(--text-main)">
                                {method.name}
                              </h3>
                              {method.isDefault && (
                                <span className="rounded-full bg-primary/20 px-2 py-1 text-[8px] font-bold text-primary uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                              {method.verified && (
                                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[8px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle size={10} /> Verified
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-(--text-dim)">
                              {method.accountHolder}
                            </p>
                          </div>
                        </div>

                        {/* Account Details */}
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-(--card-bg) p-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-(--text-main)">
                              <Lock size={14} className="text-(--text-dim)" />
                              <span>
                                {showCardNumbers[method.id]
                                  ? method.type === "bank"
                                    ? `${method.accountNumber.replace(
                                        "*",
                                        ""
                                      )}`
                                    : method.accountNumber
                                  : method.accountNumber}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCardVisibility(method.id);
                              }}
                              className="text-(--text-dim) hover:text-(--text-main) transition-colors"
                            >
                              {showCardNumbers[method.id] ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                          {method.type === "bank" && (
                            <p className="text-xs text-(--text-dim) px-3">
                              IFSC: {method.ifsc}
                            </p>
                          )}
                          <p className="text-[10px] text-(--text-dim) px-3">
                            Added {method.addedDate}
                          </p>
                        </div>

                        {/* Expanded Actions */}
                        {expandedMethod === method.id && (
                          <div className="space-y-3 border-t border-(--card-border) pt-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditMethod(method.id);
                              }}
                              className="flex items-center gap-2 w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2.5 text-sm font-bold text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5"
                            >
                              <Edit2 size={14} /> Edit Details
                            </button>
                            {!method.isDefault && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefault(method.id);
                                }}
                                className="flex items-center gap-2 w-full rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-bold text-primary transition-all hover:border-primary/40 hover:bg-primary/10"
                              >
                                <Check size={14} /> Make Default
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMethod(method.id);
                              }}
                              className="flex items-center gap-2 w-full rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-sm font-bold text-rose-500 transition-all hover:border-rose-500/40 hover:bg-rose-500/10"
                            >
                              <Trash2 size={14} /> Remove Method
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <div className="flex-shrink-0 text-primary mt-1">
                        <ChevronRight
                          size={20}
                          className={`transition-transform ${
                            expandedMethod === method.id ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Method Card */}
              <div className="glass-card rounded-3xl border-2 border-dashed border-(--card-border) p-8 text-center shadow-sm transition-all hover:border-primary/40">
                <div className="space-y-3">
                  <div className="flex justify-center"></div>
                  <Plus
                    size={32}
                    className="text-primary/40 mx-auto mb-2"
                  />
                  <p className="text-sm font-bold text-(--text-main)">
                    Add New Payment Method
                  </p>
                  <p className="text-xs text-(--text-dim)">
                    Bank account, wallet, or card
                  </p>
                  <button
                    onClick={handleAddMethod}
                    className="mt-4 rounded-lg bg-primary/10 px-4 py-2 text-xs font-black text-primary transition-all hover:bg-primary/20"
                  >
                    Add Method
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Transaction History Tab ── */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main) mb-6">
                Transaction History{" "}
                <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
              </h2>

              <div className="space-y-3">
                {paymentHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="glass-card group flex items-center justify-between rounded-2xl border border-(--card-border) p-4 lg:p-6 transition-all hover:border-primary/40 shadow-sm"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="hidden rounded-xl bg-(--card-bg) p-3 text-2xl sm:flex h-14 w-14 items-center justify-center flex-shrink-0">
                        {tx.type === "withdrawal" ? (
                          <ArrowDownLeft className="text-primary" />
                        ) : tx.type === "refund" ? (
                          <ArrowUpRight className="text-rose-500" />
                        ) : (
                          <Wallet className="text-emerald-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-sm font-bold text-(--text-main) capitalize">
                          {tx.type === "withdrawal"
                            ? "Withdrawal"
                            : tx.type === "refund"
                            ? "Refund"
                            : "Bonus"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-(--text-dim) font-medium">
                          <span>{tx.method}</span>
                          <span>•</span>
                          <span>
                            {tx.date} at {tx.time}
                          </span>
                          {tx.status === "completed" && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-500 font-bold flex items-center gap-1">
                                <Check size={12} /> {tx.status}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-(--text-dim) mt-1">
                          ID: {tx.transactionId}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p
                        className={`text-lg font-black ${
                          tx.type === "withdrawal" || tx.type === "refund"
                            ? "text-rose-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {tx.type === "withdrawal" || tx.type === "refund"
                          ? "-"
                          : "+"}
                        ₹{tx.amount.toLocaleString()}
                      </p>
                      <span className="rounded-lg bg-(--card-bg) px-2 py-1 text-[10px] font-bold text-(--text-dim) uppercase tracking-wider">
                        {tx.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Fee Structure Tab ── */}
          {activeTab === "fees" && (
            <div className="space-y-4">
              <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main) mb-6">
                Fee Structure <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {feeStructure.map((item, idx) => (
                  <div
                    key={idx}
                    className="glass-card rounded-3xl border border-(--card-border) p-6 shadow-sm"
                  >
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <h3 className="text-sm font-black text-(--text-main) mb-1">
                      {item.type}
                    </h3>
                    <p className="text-xs text-(--text-dim) mb-4">
                      {item.method}
                    </p>

                    <div className="space-y-3 border-t border-(--card-border) pt-4">
                      <div>
                        <p className="text-xs font-bold text-(--text-dim) uppercase mb-1">
                          Processing Fee
                        </p>
                        <p className="text-lg font-black text-(--text-main)">
                          {item.fee}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-(--text-dim) uppercase mb-1">
                          Processing Time
                        </p>
                        <div className="flex items-center gap-2 text-sm font-bold text-(--text-main)">
                          <Clock size={14} className="text-primary" />
                          {item.processingTime}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Important Note */}
              <div className="glass-card rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
                <div className="flex gap-4">
                  <AlertCircle
                    size={24}
                    className="text-amber-500 flex-shrink-0"
                  />
                  <div>
                    <h3 className="text-sm font-black text-(--text-main) mb-2">
                      Important Information
                    </h3>
                    <ul className="space-y-1 text-xs leading-relaxed text-(--text-dim)">
                      <li>
                        • Minimum withdrawal amount: ₹{sysConfig?.withdrawalMinAmount || 500}
                      </li>
                      <li>
                        • Maximum withdrawal amount: ₹{(sysConfig?.withdrawalDailyMax || 100000).toLocaleString()} per transaction
                      </li>
                      <li>
                        • Payouts are processed every Friday
                      </li>
                      <li>
                        • Bank transfers may take up to 24 hours during weekends
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Security Section ── */}
        <section>
          <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main) mb-4">
            Security <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
          </h2>

          <div className="glass-card rounded-3xl border border-(--card-border) p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-(--card-bg) p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-(--text-main)">
                      Two-Factor Authentication
                    </p>
                    <p className="text-xs text-(--text-dim)">
                      Add extra security to your account
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-sm font-bold text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5">
                  Enable
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-(--card-bg) p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-(--text-main)">
                      Password
                    </p>
                    <p className="text-xs text-(--text-dim)">
                      Last changed 45 days ago
                    </p>
                  </div>
                </div>
                <button className="rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-sm font-bold text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5">
                  Change
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl border-t border-(--card-border) px-6 py-10 text-center">
        <p className="text-[9px] font-black tracking-[0.3em] text-(--text-dim) uppercase">
          RouteMate • © 2026
        </p>
      </footer>
    </div>
  );
};

export default PayoutsPage;