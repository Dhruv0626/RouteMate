import React, { useState } from "react";
import {
  Mail,
  Lock,
  User,
  Car,
  ArrowRight,
  Eye,
  EyeOff,
  Phone,
  IdCard,
  ShieldCheck,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import ThemeToggle from "../../components/ui/ThemeToggle";
import api from "../../services/api";
import {
  validateEmail,
  validateName,
  validatePhone,
  validatePassword,
} from "../../utils/validation";
import OTPInput from "../../components/ui/OTPInput";
import { useEffect, useCallback } from "react";

const SignupPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [role, setRole] = useState("passenger");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    secretKey: "",
    appliedReferralCode: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [resetOTPTrigger, setResetOTPTrigger] = useState(false);
  const [registrationToken, setRegistrationToken] = useState("");

  const handleRoleChange = (newRole) => {
    if (newRole !== role) {
      setRole(newRole);
      setFormData({
        name: "",
        email: "",
        password: "",
        secretKey: "",
        appliedReferralCode: "",
      });
      setError("");
      setFieldErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Client-side validation
    const errors = {};
    const nameErr = validateName(formData.name);
    const emailErr = validateEmail(formData.email);
    const passErr = validatePassword(formData.password);

    if (nameErr) errors.name = nameErr;
    if (emailErr) errors.email = emailErr;
    if (passErr) errors.password = passErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/register", { ...formData, role });
      if (response.data.success) {
        if (response.data.needsVerification) {
          setRegistrationToken(response.data.registrationToken);
          setNeedsVerification(true);
        } else {
          setUser(response.data.user);
          navigate("/complete-profile");
        }
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const backendErrors = {};
        err.response.data.errors.forEach((e) => {
          backendErrors[e.field] = e.message;
        });
        setFieldErrors(backendErrors);
      } else {
        setError(err.response?.data?.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue) => {
    const codeToVerify = typeof otpValue === "string" ? otpValue : otp;
    
    if (!codeToVerify || codeToVerify.length !== 6) {
      setError("Please enter a complete 6-digit OTP.");
      return;
    }

    setVerifying(true);
    setError("");
    try {
      const response = await api.post("/users/verify-otp", {
        registrationToken,
        otp: codeToVerify
      });
      if (response.data.success) {
        setUser(response.data.user);
        navigate("/complete-profile");
      }
    } catch (err) {
      if (err.response?.data?.errors?.length > 0) {
        const backendErrors = {};
        err.response.data.errors.forEach((e) => {
          backendErrors[e.field] = e.message;
        });
        setFieldErrors(backendErrors);
        setError("");
      } else {
        setError(err.response?.data?.message || "Verification failed. Incorrect or expired OTP.");
      }
    } finally {
      setVerifying(false);
    }
  };

  const startTimer = useCallback(() => {
    setTimeLeft(600); // 10 minutes — matches the backend OTP expiry
  }, []);

  useEffect(() => {
    let timer;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (needsVerification) {
      startTimer();
    }
  }, [needsVerification, startTimer]);

  const handleResendOTP = async () => {
    setError("");
    setResending(true);
    try {
      const response = await api.post("/users/resend-otp", {
        registrationToken
      });
      if (response.data.success) {
        if (response.data.registrationToken) {
           setRegistrationToken(response.data.registrationToken);
        }
        setError("✅ New verification code sent to your email!");
        startTimer();
        setResetOTPTrigger((prev) => !prev);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleInputChange = (e, field) => {
    const value = e.target?.value !== undefined ? e.target.value : e;
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: "" });
    }
  };

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4 transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="glass-card relative z-10 grid w-full max-w-210 grid-cols-1 rounded-3xl border-(--card-border) shadow-2xl lg:grid-cols-2 lg:overflow-hidden">
        {/* Left Side */}
        <div className="from-primary/10 hidden flex-col justify-between border-r border-(--card-border) bg-linear-to-br to-transparent p-10 lg:flex">
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 p-2 shadow-[0_0_15px_rgba(255,204,0,0.3)]">
                <img src="/images/logo/logo.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <h1 className="font-display text-3xl font-black tracking-tighter text-(--text-main)">
                <span className="bg-linear-to-br from-(--text-main) to-(--text-dim) bg-clip-text text-transparent italic">
                  Route
                </span>
                <span className="text-primary">Mate</span>
              </h1>
            </div>
            <p className="text-base leading-relaxed font-medium text-(--text-dim) opacity-80">
              Join the future of urban mobility.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="group flex items-center gap-4">
              <div className="bg-primary/10 text-primary border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-(--text-main)">
                  Secure Rides
                </h4>
                <p className="text-xs text-(--text-dim) opacity-70">
                  Verified drivers & 24/7 support
                </p>
              </div>
            </div>
          </div>

          <p className="text-[9px] font-black tracking-[0.2em] text-(--text-dim) uppercase opacity-40">
            © 2026 RouteMate
          </p>
        </div>

        {/* Right Side */}
        <div className="p-8 transition-colors duration-500 lg:p-10">
          {needsVerification ? (
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="font-display mb-1 text-xl font-black text-(--text-main)">
                  Verify Your Email
                </h2>
                <p className="text-sm font-medium text-(--text-dim) opacity-70">
                  Enter the 6-digit code sent to {formData.email}
                </p>
              </div>

              {(verifying || resending) && (
                <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-primary animate-ping"></div>
                  <p className="text-xs font-bold text-primary italic">
                    Communicating with secure mail server... Please wait until the process is complete.
                  </p>
                </div>
              )}

              {error && (
                <div className={`rounded-xl border p-3 text-[11px] leading-tight font-bold ${
                  error.includes("sent") ? "border-green-500/20 bg-green-500/10 text-green-500" : "border-red-500/20 bg-red-500/10 text-red-500"
                }`}>
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <OTPInput 
                    length={6} 
                    onComplete={(code) => {
                      setOtp(code);
                    }} 
                    resetTrigger={resetOTPTrigger}
                  />
                  <div className="flex items-center justify-between pl-1">
                    <p className="text-[10px] items-center gap-1 font-bold text-[var(--text-dim)] opacity-70">
                      Code is valid for{" "}
                      <span className="text-primary font-black">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}s
                      </span>
                    </p>
                    {timeLeft === 0 && (
                      <p className="text-[9px] font-bold text-red-500 animate-pulse uppercase">Code Expired</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-4 pt-2">
                  <Button
                    type="button"
                    fullWidth
                    disabled={verifying || otp.length !== 6 || timeLeft === 0}
                    onClick={() => handleVerifyOTP(otp)}
                    className="h-12 shadow-[0_4px_15px_-5px_rgba(255,204,0,0.4)] transition-all hover:scale-[1.02]"
                  >
                    {verifying ? "Authorizing & Verifying Code... Please wait" : "Verify & Sign Up"}
                    {!verifying && <ArrowRight size={18} className="ml-1" />}
                  </Button>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resending || (timeLeft > 0)}
                    className="text-[10px] font-black tracking-widest text-primary uppercase transition-all hover:opacity-80 disabled:opacity-50"
                  >
                    {resending ? "Resending OTP... Please wait" : timeLeft > 0 ? `Wait ${timeLeft}s to Resend` : "Resend Verification Code"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNeedsVerification(false)}
                    className="text-[10px] font-black tracking-widest text-[var(--text-dim)] uppercase transition-all hover:text-[var(--text-main)]"
                  >
                    Back to Signup
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="transition-all duration-500">
              <div className="mb-6">
                <h2 className="font-display mb-1 text-xl font-black text-(--text-main)">
                  Join RouteMate
                </h2>
                <p className="text-sm font-medium text-(--text-dim) opacity-70">
                  Create your account to get started.
                </p>
              </div>

              {loading && (
                <div className="mb-6 rounded-xl border-green-500/20 bg-green-500/5 p-4 flex items-center gap-3 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-ping"></div>
                  <p className="text-xs font-bold text-green-500 italic">
                    Account Created! Triggering OTP delivery... You'll be redirected now.
                  </p>
                </div>
              )}

              <div className="mb-6 flex rounded-xl border border-(--card-border) bg-(--card-bg) p-1.5">
                <button
                  type="button"
                  onClick={() => handleRoleChange('passenger')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${role === 'passenger'
                    ? 'bg-primary text-black shadow-md'
                    : 'text-(--text-dim) hover:text-(--text-main)'
                    }`}
                >
                  <User size={14} /> Passenger
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('driver')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${role === 'driver'
                    ? 'bg-primary text-black shadow-md'
                    : 'text-(--text-dim) hover:text-(--text-main)'
                    }`}
                >
                  <Car size={14} /> Driver
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-tight font-bold text-red-500">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    placeholder="Enter FullName"
                    icon={User}
                    required
                    value={formData.name}
                    error={fieldErrors.name}
                    onChange={(e) => handleInputChange(e, 'name')}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="name@example.com"
                    icon={Mail}
                    required
                    value={formData.email}
                    error={fieldErrors.email}
                    onChange={(e) => handleInputChange(e, 'email')}
                  />
                </div>


                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  icon={Lock}
                  required
                  value={formData.password}
                  error={fieldErrors.password}
                  onChange={(e) => handleInputChange(e, 'password')}
                  rightSection={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-primary text-slate-500 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />




                <div className="pt-2">
                  <Button
                    type="submit"
                    fullWidth
                    disabled={loading}
                    className="py-3 shadow-md"
                  >
                    {loading ? 'Creating Account & Sending OTP... Please wait' : 'Continue'}
                    {!loading && <ArrowRight size={16} />}
                  </Button>
                </div>

                <div className="relative my-6 flex items-center py-2">
                  <div className="grow border-t border-(--card-border)"></div>
                  <span className="shrink-0 px-4 text-[10px] font-black tracking-widest text-(--text-dim) uppercase">
                    Or Continue With
                  </span>
                  <div className="grow border-t border-(--card-border)"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/auth/google?role=${role}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-(--card-border) bg-(--card-bg) py-3 text-sm font-black text-(--text-main) transition-all hover:bg-(--total-border) hover:scale-[1.02] shadow-sm"
                  >
                    <FcGoogle size={18} />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/auth/facebook?role=${role}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-(--card-border) bg-(--card-bg) py-3 text-sm font-black text-(--text-main) transition-all hover:bg-(--total-border) hover:scale-[1.02] shadow-sm"
                  >
                    <FaFacebook size={18} className="text-[#1877F2]" />
                    Facebook
                  </button>
                </div>

                <p className="mt-4 text-center text-[11px] font-medium text-(--text-dim) opacity-80">
                  Ready to join?{' '}
                  <Link
                    to="/signin"
                    className="text-primary font-black transition-colors hover:text-(--text-main)"
                  >
                    Sign In
                  </Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
