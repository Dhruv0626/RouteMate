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

const SignupPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [role, setRole] = useState("passenger");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    Mobile_no: "",
    password: "",
    licenseNumber: "",
    secretKey: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (newRole) => {
    if (newRole !== role) {
      setRole(newRole);
      setFormData({
        name: "",
        email: "",
        Mobile_no: "",
        password: "",
        licenseNumber: "",
        secretKey: "",
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
    const phoneErr = validatePhone(formData.Mobile_no);
    const passErr = validatePassword(formData.password);

    if (nameErr) errors.name = nameErr;
    if (emailErr) errors.email = emailErr;
    if (phoneErr) errors.Mobile_no = phoneErr;
    if (passErr) errors.password = passErr;
    if (role === "driver" && !formData.licenseNumber)
      errors.licenseNumber = "License number is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/register", { ...formData, role });
      if (response.data.success) {
        setUser(response.data.user);
        if (response.data.user.role === "passenger") {
          navigate("/passenger/ride");
        } else if (response.data.user.role === "driver") {
          navigate("/driver/profile-form");
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
        setError(err.response?.data?.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
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

      <div className="glass-card relative z-10 grid w-full max-w-210 grid-cols-1 rounded-3xl border-(--card-border) shadow-2xl lg:grid-cols-2 lg:overflow-hidden">
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
          <div className="mb-6">
            <h2 className="font-display mb-1 text-xl font-black text-(--text-main)">
              Join RouteMate
            </h2>
            <p className="text-sm font-medium text-(--text-dim) opacity-70">
              Create your account to get started.
            </p>
          </div>

          <div className="mb-6 flex rounded-xl border border-(--card-border) bg-(--card-bg) p-1.5">
            <button
              type="button"
              onClick={() => handleRoleChange("passenger")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${
                role === "passenger"
                  ? "bg-primary text-black shadow-md"
                  : "text-(--text-dim) hover:text-(--text-main)"
              }`}
            >
              <User size={14} /> Passenger
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("driver")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${
                role === "driver"
                  ? "bg-primary text-black shadow-md"
                  : "text-(--text-dim) hover:text-(--text-main)"
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Full Name"
                placeholder="Enter FullName"
                icon={User}
                required
                value={formData.name}
                error={fieldErrors.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="name@example.com"
                icon={Mail}
                required
                value={formData.email}
                error={fieldErrors.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </div>

            <Input
              label="Phone"
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              icon={Phone}
              required
              value={formData.Mobile_no}
              error={fieldErrors.Mobile_no}
              onChange={(e) => handleInputChange("Mobile_no", e.target.value)}
            />

            <Input
              label="Password"
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
                  className="hover:text-primary text-slate-500 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {role === "driver" && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <Input
                  label="License ID"
                  placeholder="Enter license number"
                  icon={IdCard}
                  required
                  value={formData.licenseNumber}
                  error={fieldErrors.licenseNumber}
                  onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                />
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                fullWidth
                disabled={loading}
                className="py-3 shadow-md"
              >
                {loading ? "Creating Account..." : "Continue"}
                {!loading && <ArrowRight size={16} />}
              </Button>
            </div>

            <p className="mt-4 text-center text-[11px] font-medium text-(--text-dim) opacity-80">
              Ready to join?{" "}
              <Link
                to="/signin"
                className="text-primary font-black transition-colors hover:text-(--text-main)"
              >
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
