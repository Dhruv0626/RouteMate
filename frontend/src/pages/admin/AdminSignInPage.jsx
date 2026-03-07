import React, { useState, useEffect } from "react";
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import api from "../../services/api";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { validateEmail } from "../../utils/validation";

const AdminSignInPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
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
      const response = await api.post("/users/signin", {
        ...formData,
        role: "admin",
      });
      if (response.data.success) {
        console.log("Admin Sign In successful", response.data);
        setUser(response.data.user);
        navigate(`/${response.data.user.role}/dashboard`);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const backendErrors = {};
        err.response.data.errors.forEach((e) => {
          backendErrors[e.field] = e.message;
        });
        setFieldErrors(backendErrors);
      } else if (err.response?.status === 403) {
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || "Admin authorization failed.");
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
      <div className="relative z-10 w-full max-w-sm transition-all duration-500">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 border-primary/20 text-primary shadow-primary/5 mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg">
            <Shield size={28} />
          </div>
          <h1 className="font-display text-3xl font-black tracking-tighter text-(--text-main)">
            Admin Portal
          </h1>
          <p className="mt-1 text-xs font-medium tracking-widest text-(--text-dim) uppercase opacity-70">
            Secure access for RouteMate administrators
          </p>
        </div>

        <div className="glass-card group relative rounded-4xl p-8 shadow-2xl">
          <div className="bg-primary absolute top-0 left-0 h-0.75 w-full"></div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] leading-tight font-bold text-red-500">
                {error}
              </div>
            )}

            <Input
              label="Admin Email"
              type="email"
              placeholder="admin@routemate.com"
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
              label="Security Password"
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
                  className="hover:text-primary text-(--text-dim) transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Button
              type="submit"
              fullWidth
              className="mt-2 h-10 text-sm"
              disabled={loading}
            >
              {loading ? "Authorizing..." : "Sign In"}
              {!loading && <ArrowRight size={16} className="ml-1" />}
            </Button>
          </form>

          <div className="mt-8 border-t border-(--card-border) pt-6 text-center">
            <p className="text-xs font-medium text-(--text-dim)">
              Need to register a new admin?{" "}
              <Link
                to="/admin/signup"
                className="text-primary font-black transition-colors hover:text-(--text-main)"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-2 text-[10px] font-black tracking-widest text-(--text-dim) uppercase transition-colors hover:text-(--text-main)"
          >
            <ArrowRight size={14} className="rotate-180" />
            Back to User Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminSignInPage;
