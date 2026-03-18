import React, { useState } from "react";
import {
  Shield,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Key,
  Phone,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import api from "../../services/api";
import ThemeToggle from "../../components/ui/ThemeToggle";
import OTPInput from "../../components/ui/OTPInput";
import { useEffect, useCallback } from "react";
import {
  validateEmail,
  validateName,
  validatePhone,
  validatePassword,
} from "../../utils/validation";

const AdminSignupPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    Mobile_no: "",
    password: "",
    secretKey: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Client-side validation
    const errors = {};
    const nameErr = validateName(formData.name);
    const emailErr = validateEmail(formData.email);
    const phoneErr = validatePhone(formData.Mobile_no);
    const passErr = validatePassword(formData.password);

    if (nameErr) errors.name = nameErr;
    if (emailErr) errors.email = emailErr;
    if (phoneErr) errors.Mobile_no = phoneErr;
    if (passErr) errors.password = passErr;
    
    if (!formData.secretKey) {
      errors.secretKey = "Admin secret key is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/register", {
        ...formData,
        role: "admin",
      });
      if (response.data.success) {
        if (response.data.needsVerification) {
          setNeedsVerification(true);
        } else {
          setUser(response.data.user);
          navigate(`/${response.data.user.role}/dashboard`);
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
        setError(err.response?.data?.message || "Admin registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue) => {
    // If otpValue is passed, use it, otherwise use current state (though with OTPInput we use callback)
    const codeToVerify = typeof otpValue === "string" ? otpValue : otp;
    
    if (!codeToVerify || codeToVerify.length !== 6) {
      setError("Please enter a complete 6-digit OTP.");
      return;
    }

    setVerifying(true);
    setError("");
    try {
      const response = await api.post("/users/verify-otp", {
        email: formData.email,
        otp: codeToVerify
      });
      if (response.data.success) {
        setUser(response.data.user);
        navigate(`/${response.data.user.role}/dashboard`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const startTimer = useCallback(() => {
    setTimeLeft(60);
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
        email: formData.email
      });
      if (response.data.success) {
        setError("New OTP sent successfully.");
        startTimer();
        setResetOTPTrigger((prev) => !prev); // Reset the 6 boxes
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const handleInputChange = (field, value) => {
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
      <div className="relative z-10 w-full max-sm:px-4 max-w-sm">
        <div className="mb-8 text-center px-4">
          <div className="bg-primary/10 border-primary/20 text-primary shadow-primary/5 mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg">
            <Shield size={28} />
          </div>
          <h1 className="font-display text-3xl font-black tracking-tighter text-[var(--text-main)]">
            {needsVerification ? "Verify Email" : "Admin Registration"}
          </h1>
          <p className="mt-1 text-[10px] font-medium tracking-widest text-[var(--text-dim)] uppercase opacity-70">
            {needsVerification 
              ? `Enter OTP sent to ${formData.email}` 
              : "Initialize a new administrator account"}
          </p>
        </div>

        <div className="glass-card group relative rounded-[32px] p-8 shadow-2xl">
          <div className="bg-primary absolute top-0 left-0 h-[3px] w-full"></div>

          {needsVerification ? (
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              {error && (
                <div className={`rounded-xl border p-3 text-[11px] leading-tight font-bold ${
                  error.includes("sent") ? "border-green-500/20 bg-green-500/10 text-green-500" : "border-red-500/20 bg-red-500/10 text-red-500"
                }`}>
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="pl-1 text-[10px] font-black tracking-widest text-[var(--text-dim)] uppercase">
                    Verification Code
                  </p>
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
                    className="h-12 text-sm font-black shadow-[0_4px_15px_-5px_rgba(255,204,0,0.4)] transition-all hover:scale-[1.02]"
                  >
                    {verifying ? "Authorizing..." : "Verify & Sign In"}
                    {!verifying && <ArrowRight size={18} className="ml-1" />}
                  </Button>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resending || (timeLeft > 0)}
                    className="text-[10px] font-black tracking-widest text-primary uppercase transition-all hover:opacity-80 disabled:opacity-50"
                  >
                    {resending ? "Authorizing Security..." : timeLeft > 0 ? `Wait ${timeLeft}s to Resend` : "Resend Verification Code"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNeedsVerification(false)}
                    className="text-[10px] font-black tracking-widest text-[var(--text-dim)] uppercase transition-all hover:text-[var(--text-main)]"
                  >
                    Change Registration Details
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] leading-tight font-bold text-red-500">
                  {error}
                </div>
              )}

              <Input
                label="Admin Full Name"
                placeholder="System Administrator"
                icon={User}
                required
                value={formData.name}
                error={fieldErrors.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
              <Input
                label="Official Email"
                type="email"
                placeholder="admin@routemate.com"
                icon={Mail}
                required
                value={formData.email}
                error={fieldErrors.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="10-digit number"
                icon={Phone}
                required
                value={formData.Mobile_no}
                error={fieldErrors.Mobile_no}
                onChange={(e) => handleInputChange("Mobile_no", e.target.value)}
              />

              <div className="space-y-1">
                <Input
                  label="Set Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  icon={Lock}
                  required
                  value={formData.password}
                  error={fieldErrors.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  rightSection={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-primary text-[var(--text-dim)] transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                {!fieldErrors.password && (
                  <p className="pl-1 text-[9px] font-medium text-[var(--text-dim)] italic opacity-70">
                    Min 6 chars, 1 uppercase, 1 number
                  </p>
                )}
              </div>

              <Input
                label="Admin Secret Key"
                type="password"
                placeholder="Secret Key"
                icon={Key}
                required
                value={formData.secretKey}
                error={fieldErrors.secretKey}
                onChange={(e) => handleInputChange("secretKey", e.target.value)}
              />

              <div className="bg-primary/10 border-primary/20 rounded-xl border p-3.5">
                <p className="text-primary mb-1 text-[10px] font-black tracking-widest uppercase">
                  SECURITY NOTICE
                </p>
                <p className="text-[10px] leading-tight font-medium text-[var(--text-dim)]">
                  Registration requires a master key. All attempts are monitored
                  for security audits.
                </p>
              </div>

              <Button
                type="submit"
                fullWidth
                className="mt-2 h-10 text-sm"
                disabled={loading}
              >
                {loading ? "Processing..." : "Create Account"}
                {!loading && <ArrowRight size={16} className="ml-1" />}
              </Button>
            </form>
          )}

          <div className="mt-8 border-t border-[var(--card-border)] pt-6 text-center">
            <p className="text-xs font-medium text-[var(--text-dim)]">
              Already an administrator?{" "}
              <Link
                to="/admin/signin"
                className="text-primary font-black transition-colors hover:text-[var(--text-main)]"
              >
                Authorize Here
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-[10px] font-black tracking-widest text-[var(--text-dim)] uppercase transition-colors hover:text-[var(--text-main)]"
          >
            <ArrowRight size={14} className="rotate-180" />
            Back to User Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSignupPage;
