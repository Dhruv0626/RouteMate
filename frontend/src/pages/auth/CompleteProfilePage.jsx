import React, { useState, useEffect } from "react";
import { Phone, ArrowRight, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import api from "../../services/api";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Loader from "../../components/ui/Loader";

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const { user, setUser, loading: authLoading } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ── Redirect Protection Logic ──
  useEffect(() => {
    if (authLoading) return;

    // If no user is logged in, unauthorized — go to signin
    if (!user) {
      navigate("/signin", { replace: true });
      return;
    }

    // If user already exists and HAS a mobile number registered, proceed to dashboard
    if (user.Mobile_no && user.Mobile_no !== "0000000000") {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [user, navigate, authLoading]);

  if (authLoading) {
    return <Loader fullPage text="Verifying your session..." />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      // Reverted to session-based update only
      const response = await api.post("/users/update-mobile", { 
        mobileNumber: mobileNumber 
      });

      if (response.data.success) {
        setUser(response.data.user);
        navigate(`/${response.data.user.role}/dashboard`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update mobile number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="relative z-10 w-full max-w-md transition-all duration-500">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 border-primary/20 text-primary shadow-primary/5 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border shadow-lg">
            <ShieldCheck size={32} />
          </div>
          <h1 className="font-display text-3xl font-black tracking-tighter text-(--text-main)">
            One Last Step
          </h1>
          <p className="mt-2 text-sm font-medium text-(--text-dim)">
            Please provide your mobile number to ensure secure rides and driver communications.
          </p>
        </div>

        <div className="glass-card group relative rounded-4xl p-8 shadow-2xl">
          <div className="bg-primary absolute top-0 left-0 h-1 w-full"></div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-500">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="10-digit number"
                icon={Phone}
                required
                maxLength={10}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-[10px] text-(--text-dim) opacity-60 ml-1">
                We'll never share your number with 3rd parties.
              </p>
            </div>

            <Button
              type="submit"
              fullWidth
              className="h-12 text-base font-bold"
              disabled={loading}
            >
              {loading ? "Completing Profile..." : "Complete Setup"}
              {!loading && <ArrowRight size={20} className="ml-2" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
