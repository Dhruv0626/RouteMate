import React, { useState, useEffect } from "react";
import { Mail, ArrowRight, ShieldCheck, ArrowLeft, Lock, Key, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import ThemeToggle from "../../components/ui/ThemeToggle";
import OTPInput from "../../components/ui/OTPInput";
import { validateEmail } from "../../utils/validation";
import api from "../../services/api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & Reset
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(0);
  const [resetOTPTrigger, setResetOTPTrigger] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && step === 2) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer, step]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setMessage("");

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/users/forgot-password", { email });
      if (data.success) {
        setStep(2);
        setTimer(600);
        setMessage(`✅ OTP sent to ${email}. Check your inbox (and spam folder).`);
        setResetOTPTrigger((prev) => !prev);
      }
    } catch (err) {
      // Handle field-specific errors from backend
      if (err.response?.data?.errors?.length > 0) {
        const backendErrors = {};
        err.response.data.errors.forEach((e) => {
          backendErrors[e.field] = e.message;
        });
        setFieldErrors(backendErrors);
      } else {
        // General error message (e.g. social account / server error)
        setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setMessage("");

    const errors = {};
    if (!otp || otp.length !== 6) errors.otp = "Please enter the complete 6-digit OTP.";
    const passwordError = validatePassword(newPassword);
    if (passwordError) errors.newPassword = passwordError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/users/reset-password", {
        email,
        otp,
        newPassword,
      });
      if (data.success) {
        setMessage("✅ Password reset successful! Redirecting to sign in...");
        setTimeout(() => navigate("/signin"), 2500);
      }
    } catch (err) {
      if (err.response?.data?.errors?.length > 0) {
        const backendErrors = {};
        err.response.data.errors.forEach((e) => {
          backendErrors[e.field] = e.message;
        });
        setFieldErrors(backendErrors);
      } else {
        setError(err.response?.data?.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4 transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md transition-all duration-500">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 border-primary/20 text-primary shadow-primary/5 mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <h1 className="font-display text-3xl font-black text-(--text-main)">
            Forgot Password
          </h1>
          <p className="mt-1 text-xs font-medium tracking-widest text-(--text-dim) uppercase opacity-70">
            {step === 1 ? "Step 1: Request OTP" : "Step 2: Reset Password"}
          </p>
        </div>

        <div className="glass-card group relative overflow-hidden rounded-4xl p-8 shadow-2xl">
          <div className="bg-primary absolute top-0 left-0 h-0.75 w-full"></div>

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleRequestOtp}>
              <p className="text-xs leading-relaxed font-medium text-(--text-dim)">
                Provide the email associated with your account and we'll send
                you a 6-digit OTP to reset your password.
              </p>

              {message && (
                <div className="rounded-xl bg-emerald-500/10 p-3 text-center text-xs font-bold text-emerald-500 border border-emerald-500/20">
                  {message}
                </div>
              )}

              <Input
                label="Registered Email"
                type="email"
                placeholder="name@example.com"
                icon={Mail}
                required
                value={email}
                error={fieldErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                }}
              />

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] leading-snug font-bold text-red-500">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                className="h-12 text-sm"
                disabled={loading}
              >
                {loading ? "Sending OTP... Please wait" : "Send OTP"}
                {!loading && <ArrowRight size={18} className="ml-2" />}
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <p className="text-xs leading-relaxed font-medium text-(--text-dim) mb-2 text-center">
                We've sent an OTP to <span className="text-primary font-bold">{email}</span>.
              </p>

              {message && (
                <div className="rounded-xl bg-emerald-500/10 p-3 text-center text-xs font-bold text-emerald-500 border border-emerald-500/20">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-500/10 p-3 text-center text-xs font-bold text-red-500 border border-red-500/20">
                  {error}
                </div>
              )}

              <div className="space-y-3 pb-2">
                <p className="pl-1 text-[10px] font-black uppercase tracking-widest text-(--text-dim)">
                  Secret 6-digit OTP
                </p>
                <OTPInput 
                  length={6} 
                  onComplete={(code) => {
                    setOtp(code);
                    if (fieldErrors.otp) setFieldErrors({ ...fieldErrors, otp: "" });
                  }}
                  resetTrigger={resetOTPTrigger}
                />
                {fieldErrors.otp && (
                  <p className="pl-1 text-[10px] font-bold text-red-500">{fieldErrors.otp}</p>
                )}
              </div>

              <Input
                label="New Secure Password"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                required
                value={newPassword}
                error={fieldErrors.newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: "" });
                }}
              />

              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-(--text-dim)">
                  <Clock size={12} className={timer < 10 ? "text-red-500 animate-pulse" : ""} />
                  Expires in: <span className={timer < 10 ? "text-red-500" : "text-primary"}>
                    {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                {timer === 0 && (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <Button
                type="submit"
                fullWidth
                className="h-12 text-sm"
                disabled={loading || (timer === 0 && !message.includes("successful"))}
              >
                {loading ? "Resetting... Please wait" : "Reset Password"}
                {!loading && <ShieldCheck size={18} className="ml-2" />}
              </Button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-[10px] font-black uppercase tracking-widest text-(--text-dim) hover:text-primary transition-colors mt-2"
              >
                Change Email
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-(--card-border) pt-6 text-center">
            <Link
              to="/signin"
              className="hover:text-primary inline-flex items-center gap-2 text-xs font-bold text-(--text-dim) transition-colors"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-[9px] font-black tracking-[0.3em] text-(--text-dim) uppercase opacity-40">
            RouteMate Security Protocol • 2026
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ForgotPassword;
