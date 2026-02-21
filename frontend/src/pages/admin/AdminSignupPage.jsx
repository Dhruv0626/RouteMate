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
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setValidationErrors([]);
    setLoading(true);

    // CSRF check removed

    // Admin Secret Key Check
    if (formData.secretKey !== "RouteMate@Admin2026") {
      setError("Invalid admin secret key. Access denied.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/users/register", {
        ...formData,
        role: "admin",
      });
      if (response.data.success) {
        setUser(response.data.user);
        navigate(`/${response.data.user.role}/dashboard`);
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);
        setError("Validation failed. Please check the fields below.");
      } else {
        setError(err.response?.data?.message || "Admin registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4 transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 border-primary/20 text-primary shadow-primary/5 mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg">
            <Shield size={28} />
          </div>
          <h1 className="font-display text-3xl font-black tracking-tighter text-[var(--text-main)]">
            Admin Registration
          </h1>
          <p className="mt-1 text-xs font-medium tracking-widest text-[var(--text-dim)] uppercase opacity-70">
            Initialize a new administrator account
          </p>
        </div>

        <div className="glass-card group relative overflow-hidden rounded-[32px] p-8 shadow-2xl">
          <div className="bg-primary absolute top-0 left-0 h-[3px] w-full"></div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="space-y-2">
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] leading-tight font-bold text-red-500">
                  {error}
                </div>
                {validationErrors.length > 0 && (
                  <ul className="list-inside list-disc rounded-xl border border-red-500/10 bg-red-500/5 p-2 text-[10px] text-red-500/80">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Input
              label="Admin Full Name"
              placeholder="System Administrator"
              icon={User}
              required
              value={formData.name}
              onChange={(e) => handleInputChange(e, "name")}
            />
            <Input
              label="Official Email"
              type="email"
              placeholder="admin@routemate.com"
              icon={Mail}
              required
              value={formData.email}
              onChange={(e) => handleInputChange(e, "email")}
            />
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="10-digit number"
              icon={Phone}
              required
              value={formData.Mobile_no}
              onChange={(e) => handleInputChange(e, "Mobile_no")}
            />

            <div className="space-y-1">
              <Input
                label="Set Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                icon={Lock}
                required
                value={formData.password}
                onChange={(e) => handleInputChange(e, "password")}
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
              <p className="pl-1 text-[9px] font-medium text-[var(--text-dim)] italic opacity-70">
                Min 6 chars, 1 uppercase, 1 number
              </p>
            </div>

            <Input
              label="Admin Secret Key"
              type="password"
              placeholder="Secret Key"
              icon={Key}
              required
              value={formData.secretKey}
              onChange={(e) => handleInputChange(e, "secretKey")}
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
