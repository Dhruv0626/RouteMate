import React, { useState, useEffect } from "react";
import { Mail, Lock, User, Car, ArrowRight, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import ThemeToggle from "../../components/ui/ThemeToggle";
import api from "../../services/api";
import { validateEmail } from "../../utils/validation";

const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const [role, setRole] = useState("passenger");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSuspended, setIsSuspended] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Read OAuth error from URL query params (set by backend redirect)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get("error");
    if (oauthError === "role_mismatch") {
      const existing = params.get("existing");   // e.g. "driver"
      const requested = params.get("requested"); // e.g. "passenger"
      
      // Use a secure, generic error message that prevents role enumeration
      setError("Authentication failed: This account is associated with a different portal. Please use the correct sign-in page.");
      
      // Auto-switch the toggle to the correct role ONLY for the user who just tried to log in
      if (existing) setRole(existing);
    } else if (oauthError === "oauth_failed") {
      setError("OAuth sign-in failed. Please try again.");
    }
    // Clean the URL so the error doesn't persist on refresh
    if (oauthError) {
      window.history.replaceState({}, document.title, "/signin");
    }
  }, [location.search]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      if (user.role === "passenger") {
        navigate("/passenger/ride", { replace: true });
      } else {
        navigate(`/${user.role}/dashboard`, { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Client-side validation
    const emailError = validateEmail(formData.email);
    const errors = {};
    if (emailError) errors.email = emailError;
    if (!formData.password) errors.password = "Password is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/signin", { ...formData, role });
      if (response.data.success) {
        setUser(response.data.user);
        if (response.data.user.role === "passenger") {
          navigate("/passenger/ride");
        } else {
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
        const msg = err.response?.data?.message || "Sign in failed.";
        if (msg.toLowerCase().includes("blocked")) {
          setIsSuspended(true);
          setError(msg);
        } else {
          setIsSuspended(false);
          setError(msg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailReset = () => {
    setError("");
    setIsSuspended(false);
  };

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4 transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="glass-card relative z-10 grid w-full max-w-200 grid-cols-1 rounded-3xl border-(--card-border) shadow-2xl lg:grid-cols-2 lg:overflow-hidden">
        {/* Left Side */}
        <div className="from-primary/10 hidden flex-col justify-between border-r border-(--card-border) bg-linear-to-br to-transparent p-10 lg:flex">
          <div className="relative z-10">
            <h1 className="font-display mb-1 text-3xl font-black tracking-tighter text-(--text-main)">
              <span className="bg-linear-to-br from-(--text-main) to-(--text-dim) bg-clip-text text-transparent italic">
                Route
              </span>
              <span className="text-primary">Mate</span>
            </h1>
            <p className="text-base leading-relaxed font-medium text-(--text-dim) opacity-80">
              Sign in to your dashboard.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-4 backdrop-blur-md">
              <p className="text-primary mb-1 text-[10px] leading-none font-black tracking-widest uppercase">
                Status
              </p>
              <h4 className="text-xs leading-snug font-bold text-(--text-main)">
                Managing the future of urban mobility.
              </h4>
            </div>
          </div>

          <p className="text-[9px] font-black tracking-[0.2em] text-(--text-dim) uppercase opacity-40">
            Intelligent Systems • 2026
          </p>
        </div>

        {/* Right Side */}
        <div className="p-8 transition-colors duration-500 lg:p-10">
          <div className="mb-6">
            <h2 className="font-display mb-1 text-xl font-black text-(--text-main)">
              Welcome Back
            </h2>
            <p className="text-sm font-medium text-(--text-dim) opacity-70">
              Enter your credentials to continue.
            </p>
          </div>

          <div className="mb-6 flex rounded-xl border border-(--card-border) bg-(--card-bg) p-1.5">
            <button
              onClick={() => setRole("passenger")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${
                role === "passenger"
                  ? "bg-primary scale-[1.02] text-black shadow-md"
                  : "text-(--text-dim) hover:text-(--text-main)"
              }`}
            >
              <User size={14} /> Passenger
            </button>
            <button
              onClick={() => setRole("driver")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${
                role === "driver"
                  ? "bg-primary scale-[1.02] text-black shadow-md"
                  : "text-(--text-dim) hover:text-(--text-main)"
              }`}
            >
              <Car size={14} /> Driver
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSuspended ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-400">
                  <ShieldAlert size={18} />
                  <p className="text-sm font-black">Account Suspended</p>
                </div>
                <p className="text-xs text-red-400/80 leading-relaxed">
                  For particular reasons your account has been suspended. Please <strong>check your Gmail inbox</strong> for a detailed explanation from our Trust &amp; Safety team.
                </p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-tight font-bold text-red-500">
                {error}
              </div>
            ) : null}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              icon={Mail}
              required
              value={formData.email}
              error={fieldErrors.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
              }}
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={Lock}
              required
              value={formData.password}
              error={fieldErrors.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
              }}
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

            <div className="flex items-center justify-between px-1">
              <label className="group flex cursor-pointer items-center gap-2 text-[10px] text-(--text-dim)">
                <input
                  type="checkbox"
                  className="text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer rounded border-(--card-border) bg-(--card-bg) transition-all duration-500"
                />
                <span className="font-medium transition-colors group-hover:text-(--text-main)">
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                title="Recover Password"
                className="text-primary text-[10px] font-black tracking-widest uppercase transition-colors hover:text-(--text-main)"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                fullWidth
                disabled={loading}
                className="py-3 shadow-md"
              >
                {loading ? "Authenticating..." : `Sign In`}
                {!loading && <ArrowRight size={16} />}
              </Button>
            </div>

            <div className="relative my-6 flex items-center py-2">
              <div className="grow border-t border-(--card-border)"></div>
              <span className="shrink-0 px-4 text-[10px] font-black tracking-widest text-(--text-dim) uppercase">
                Or Sign In With
              </span>
              <div className="grow border-t border-(--card-border)"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/auth/google?role=${role}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-(--card-border) bg-(--card-bg) py-3 text-sm font-bold text-(--text-main) transition-all hover:bg-(--bg-main) hover:border-primary/50"
              >
                <FcGoogle size={18} />
                Google
              </button>
              <button
                type="button"
                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/auth/facebook?role=${role}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-(--card-border) bg-(--card-bg) py-3 text-sm font-bold text-(--text-main) transition-all hover:bg-(--bg-main) hover:border-primary/50"
              >
                <FaFacebook size={18} className="text-[#1877F2]" />
                Facebook
              </button>
            </div>

            <p className="mt-6 text-center text-[11px] font-medium text-(--text-dim) opacity-80">
              New to RouteMate?{" "}
              <Link
                to="/signup"
                className="text-primary font-black transition-colors hover:text-(--text-main)"
              >
                Create Account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
