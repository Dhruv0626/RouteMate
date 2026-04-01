import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  IndianRupee,
  Wallet,
  CheckCircle,
  AlertCircle,
  Lock,
  Calendar,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const PayoutRequestPage = () => {
  const navigate = useNavigate();
  const [payoutAmount, setPayoutAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("bank");
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Amount, 2: Confirm
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  // Mock data
  const driverBalance = {
    available: 0,
    total: 0,
    pending: 0,
  };

  const payoutMethods = [
    {
      id: "bank",
      name: "Bank Account",
      icon: "🏦",
      details: "HDFC Bank • ***4567",
      lastUsed: "Mar 8, 2026",
    },
    {
      id: "upi",
      name: "UPI",
      icon: "📱",
      details: "driver@upi • ***7890",
      lastUsed: "Mar 5, 2026",
    },
    {
      id: "wallet",
      name: "Digital Wallet",
      icon: "💳",
      details: "PayTM Wallet • Active",
      lastUsed: "Feb 28, 2026",
    },
  ];

  const selectedPayoutMethod = payoutMethods.find((m) => m.id === selectedMethod);
  const minimumPayout = 500;
  const maximumPayout = driverBalance.available;

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPayoutAmount(value);
  };

  const isAmountValid = () => {
    const amount = parseInt(payoutAmount);
    return (
      payoutAmount &&
      amount >= minimumPayout &&
      amount <= maximumPayout &&
      !isNaN(amount)
    );
  };

  const handleNextStep = () => {
    if (!isAmountValid()) {
      setNotification({
        type: "danger",
        message: `Please enter an amount between ₹${minimumPayout} and ₹${maximumPayout.toLocaleString()}`,
      });
      setTimeout(() => {
        setNotification(null);
      }, 4000);
      return;
    }
    setNotification(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitPayout = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setNotification({
        type: "success",
        message: "Payout request submitted successfully!",
      });
      setTimeout(() => {
        navigate("/driver/dashboard/earnings");
      }, 2000);
    }, 1500);
  };

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver/dashboard/earnings")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main) hover:border-primary/40"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">
                Request Payout
              </h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                Withdraw your earnings
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`rounded-2xl border p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : notification.type === "danger"
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
            }`}
          >
            {notification.type === "success" && <CheckCircle size={20} />}
            {notification.type === "danger" && <AlertCircle size={20} />}
            {notification.type === "info" && <AlertCircle size={20} />}
            <span className="font-semibold text-sm">{notification.message}</span>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center gap-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-black transition-all ${
              step >= 1
                ? "bg-primary text-black"
                : "bg-(--card-bg) text-(--text-dim) border border-(--card-border)"
            }`}
          >
            1
          </div>
          <div
            className={`h-1 flex-1 rounded-full transition-all ${
              step >= 2 ? "bg-primary" : "bg-(--card-border)"
            }`}
          />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-black transition-all ${
              step >= 2
                ? "bg-primary text-black"
                : "bg-(--card-bg) text-(--text-dim) border border-(--card-border)"
            }`}
          >
            2
          </div>
        </div>

        {/* Available Balance Card */}
        <div className="glass-card relative overflow-hidden rounded-3xl border border-(--card-border) p-8 shadow-sm">
          <div className="from-primary/20 to-primary/5 absolute right-0 top-0 h-32 w-32 rounded-full blur-3xl" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                  Available Balance
                </p>
                <p className="text-4xl font-black text-primary">
                  ₹{driverBalance.available.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-4 text-primary">
                <Wallet size={32} />
              </div>
            </div>

            <div className="space-y-2 border-t border-(--card-border) pt-4">
              <div className="flex justify-between">
                <span className="text-sm text-(--text-dim)">Total Earnings</span>
                <span className="font-bold text-(--text-main)">
                  ₹{driverBalance.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-(--text-dim)">Pending</span>
                <span className="font-bold text-amber-500">
                  ₹{driverBalance.pending.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Amount Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="glass-card rounded-3xl border border-(--card-border) p-8 shadow-sm space-y-6">
              <div>
                <label className="mb-3 block text-sm font-bold text-(--text-main)">
                  Payout Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-primary">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payoutAmount}
                    onChange={handleAmountChange}
                    placeholder="Enter amount"
                    className="w-full rounded-2xl border border-(--card-border) bg-(--card-bg) py-4 pl-12 pr-6 text-2xl font-black text-(--text-main) placeholder-text-(--text-dim) transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <p className="mt-2 text-xs text-(--text-dim)">
                  Minimum: ₹{minimumPayout} | Maximum: ₹{maximumPayout.toLocaleString()}
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <p className="mb-3 text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                  Quick Select
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[2000, 5000, 8715].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setPayoutAmount(amount.toString())}
                      className={`rounded-2xl border-2 py-3 font-bold transition-all ${
                        parseInt(payoutAmount) === amount
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-(--card-border) bg-(--card-bg) text-(--text-main) hover:border-primary/40"
                      }`}
                    >
                      ₹{amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Breakdown */}
              {payoutAmount && (
                <div className="space-y-2 border-t border-(--card-border) pt-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-(--text-dim)">
                      Withdrawal Amount
                    </span>
                    <span className="font-bold text-(--text-main)">
                      ₹{parseInt(payoutAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-(--text-dim)">Processing Fee</span>
                    <span className="font-bold text-emerald-500">Free</span>
                  </div>
                  <div className="flex justify-between border-t border-(--card-border) pt-2">
                    <span className="text-sm font-bold text-(--text-main)">
                      You will receive
                    </span>
                    <span className="text-lg font-black text-primary">
                      ₹{parseInt(payoutAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payout Method Selection */}
            <div className="glass-card rounded-3xl border border-(--card-border) p-8 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-(--text-main)">
                Payout Method <span className="text-red-500">*</span>
              </h3>

              <div className="space-y-3">
                {payoutMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full rounded-2xl border-2 p-4 transition-all text-left ${
                      selectedMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-(--card-border) bg-(--card-bg) hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{method.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-(--text-main)">
                          {method.name}
                        </p>
                        <p className="text-xs text-(--text-dim)">
                          {method.details}
                        </p>
                        <p className="text-[10px] text-(--text-dim) mt-1">
                          Last used: {method.lastUsed}
                        </p>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          selectedMethod === method.id
                            ? "border-primary bg-primary"
                            : "border-(--card-border)"
                        }`}
                      >
                        {selectedMethod === method.id && (
                          <CheckCircle size={16} className="text-black" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Information Box */}
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
              <div className="flex gap-3">
                <AlertCircle
                  size={20}
                  className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-bold mb-1">Processing Details:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>Payouts are processed within 1-2 business days</li>
                    <li>No processing fees charged</li>
                    <li>Minimum withdrawal amount is ₹500</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleNextStep}
              className="w-full rounded-2xl bg-primary hover:bg-primary-dark text-black font-black px-6 py-4 text-base tracking-wide transition-all duration-300 active:scale-95 cursor-pointer hover:shadow-lg"
              type="button"
            >
              Continue to Review →
            </button>
          </div>
        )}

        {/* Step 2: Confirm & Submit */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Main Amount Display */}
            <div className="glass-card relative overflow-hidden rounded-3xl border-2 border-primary bg-primary/5 p-8 shadow-sm">
              <div className="from-primary/20 to-primary/10 absolute right-0 top-0 h-32 w-32 rounded-full blur-3xl" />
              <div className="relative text-center space-y-2">
                <p className="text-xs font-bold tracking-widest text-(--text-dim) uppercase">
                  Payout Amount
                </p>
                <p className="text-6xl font-black text-primary">
                  ₹{parseInt(payoutAmount).toLocaleString()}
                </p>
                <p className="text-sm text-(--text-dim) font-semibold">
                  No processing fees applied
                </p>
              </div>
            </div>

            {/* Confirmation Details */}
            <div className="glass-card rounded-3xl border border-(--card-border) p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-(--text-main) flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                  ✓
                </span>
                Review Your Details
              </h3>

              {/* Recipient Details Section */}
              <div className="space-y-4 border-b border-(--card-border) pb-6">
                <h4 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                  Recipient Information
                </h4>
                <div className="rounded-2xl bg-(--card-bg) border border-(--card-border) p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xl">👤</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-(--text-dim) uppercase font-bold">
                        Account Holder
                      </p>
                      <p className="font-bold text-(--text-main)">Rajesh Kumar</p>
                    </div>
                    <CheckCircle size={20} className="text-emerald-500" />
                  </div>
                  <div className="border-t border-(--card-border) pt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                      {selectedPayoutMethod.icon && (
                        <span className="text-xl">{selectedPayoutMethod.icon}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-(--text-dim) uppercase font-bold">
                        Payout Method
                      </p>
                      <p className="font-bold text-(--text-main)">
                        {selectedPayoutMethod.name}
                      </p>
                      <p className="text-xs text-(--text-dim) mt-1">
                        {selectedPayoutMethod.details}
                      </p>
                    </div>
                    <CheckCircle size={20} className="text-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="space-y-4 border-b border-(--card-border) pb-6">
                <h4 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                  Payment Breakdown
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-(--text-dim)">Withdrawal Amount</span>
                    <span className="font-bold text-(--text-main)">
                      ₹{parseInt(payoutAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-(--text-dim)">
                      <span>Processing Fee</span>
                      <span className="ml-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        Free
                      </span>
                    </span>
                    <span className="font-bold text-emerald-500">₹0</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-sm text-(--text-dim)">Taxes</span>
                    <span className="font-bold text-(--text-main)">₹0</span>
                  </div>
                  <div className="border-t border-(--card-border) pt-3 flex justify-between">
                    <span className="font-bold text-(--text-main)">
                      Total You'll Receive
                    </span>
                    <span className="text-xl font-black text-primary">
                      ₹{parseInt(payoutAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline & Processing */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-(--text-dim) uppercase tracking-wider">
                  Processing Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-(--card-bg) border border-(--card-border) p-4 text-center">
                    <Clock size={24} className="mx-auto mb-2 text-primary" />
                    <p className="text-xs text-(--text-dim) uppercase font-bold mb-1">
                      Processing Time
                    </p>
                    <p className="font-black text-(--text-main)">1-2 Days</p>
                    <p className="text-[10px] text-(--text-dim) mt-2">
                      Business days only
                    </p>
                  </div>
                  <div className="rounded-2xl bg-(--card-bg) border border-(--card-border) p-4 text-center">
                    <Calendar size={24} className="mx-auto mb-2 text-primary" />
                    <p className="text-xs text-(--text-dim) uppercase font-bold mb-1">
                      Expected Date
                    </p>
                    <p className="font-black text-(--text-main)">Mar 13</p>
                    <p className="text-[10px] text-(--text-dim) mt-2">By end of day</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Trust Section */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex gap-3">
                <Lock
                  size={20}
                  className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"
                />
                <div className="text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="font-bold mb-1">🔒 Bank-Level Security</p>
                  <p className="text-xs">
                    Encrypted & protected with 256-bit SSL
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex gap-3">
                <AlertCircle
                  size={20}
                  className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-bold mb-1">✓ Verified Account</p>
                  <p className="text-xs">All details verified & confirmed</p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="glass-card rounded-3xl border border-(--card-border) p-6 shadow-sm">
              <h4 className="text-sm font-black text-(--text-main) mb-4 flex items-center gap-2">
                <span className="text-lg">❓</span> Quick Help
              </h4>
              <div className="space-y-3">
                <details className="cursor-pointer">
                  <summary className="text-xs font-bold text-(--text-main) py-2 hover:text-primary transition-colors">
                    ▶ When will I receive the money?
                  </summary>
                  <p className="text-xs text-(--text-dim) ml-5 mt-2 pb-3">
                    Payouts are processed within 1-2 business days from submission. Weekends and holidays may add extra time.
                  </p>
                </details>
                <details className="cursor-pointer">
                  <summary className="text-xs font-bold text-(--text-main) py-2 hover:text-primary transition-colors">
                    ▶ Can I cancel this payout?
                  </summary>
                  <p className="text-xs text-(--text-dim) ml-5 mt-2 pb-3">
                    Yes, you can cancel within 30 minutes of submission. After that, the payout cannot be reversed.
                  </p>
                </details>
                <details className="cursor-pointer">
                  <summary className="text-xs font-bold text-(--text-main) py-2 hover:text-primary transition-colors">
                    ▶ Are there any hidden charges?
                  </summary>
                  <p className="text-xs text-(--text-dim) ml-5 mt-2 pb-3">
                    No hidden charges! RouteMate doesn't deduct any fees from your payout. You receive the full amount.
                  </p>
                </details>
              </div>
            </div>

            {/* Recent Payouts */}
            <div className="glass-card rounded-3xl border border-(--card-border) p-6 shadow-sm">
              <h4 className="text-sm font-black text-(--text-main) mb-4">
                Recent Payouts
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-(--card-border)">
                  <div>
                    <p className="text-xs font-bold text-(--text-main)">
                      Mar 8, 2026
                    </p>
                    <p className="text-xs text-(--text-dim)">
                      Bank Transfer • HDFC
                    </p>
                  </div>
                  <span className="font-bold text-emerald-500">+₹5,000</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-(--card-border)">
                  <div>
                    <p className="text-xs font-bold text-(--text-main)">
                      Mar 1, 2026
                    </p>
                    <p className="text-xs text-(--text-dim)">UPI • driver@upi</p>
                  </div>
                  <span className="font-bold text-emerald-500">+₹3,000</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-xs font-bold text-(--text-main)">
                      Feb 22, 2026
                    </p>
                    <p className="text-xs text-(--text-dim)">
                      PayTM Wallet
                    </p>
                  </div>
                  <span className="font-bold text-emerald-500">+₹2,500</span>
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 h-5 w-5 rounded accent-primary cursor-pointer"
              />
              <span className="text-xs text-(--text-dim) group-hover:text-(--text-main) transition-colors">
                I understand that:
                <ul className="mt-2 space-y-1 list-disc list-inside text-(--text-dim)">
                  <li>Payouts are non-refundable once processed</li>
                  <li>The transaction cannot be cancelled after 30 minutes</li>
                  <li>I have verified all recipient details are correct</li>
                </ul>
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-3 text-sm font-black text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-95"
              >
                ← Edit Details
              </button>
              <button
                onClick={handleSubmitPayout}
                disabled={isLoading}
                className="flex-1 rounded-2xl bg-primary hover:bg-primary-dark text-black font-black px-6 py-3 text-base tracking-wide transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer hover:shadow-lg"
              >
                {isLoading ? "Processing..." : "Confirm & Submit Payout"}
              </button>
            </div>

            {/* Info Footer */}
            <div className="text-center">
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider font-bold">
                🛡️ Your transaction is secure and protected
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-4xl border-t border-(--card-border) px-6 py-10 text-center">
        <p className="text-[9px] font-black tracking-[0.3em] text-(--text-dim) uppercase">
          RouteMate • © 2026
        </p>
      </footer>
    </div>
  );
};

export default PayoutRequestPage;
