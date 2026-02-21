import React, { useState } from "react";
import { Mail, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import ThemeToggle from "../../components/ui/ThemeToggle";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
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
            Forget Password
          </h1>
          <p className="mt-1 text-xs font-medium tracking-widest text-(--text-dim) uppercase opacity-70">
            Enter your email to receive recovery link
          </p>
        </div>

        <div className="glass-card group relative overflow-hidden rounded-4xl p-8 shadow-2xl">
          <div className="bg-primary absolute top-0 left-0 h-0.75 w-full"></div>

          {!submitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <p className="text-xs leading-relaxed font-medium text-(--text-dim)">
                Lost your access? It happens. Provide the email associated with
                your account and we'll send you instructions to reset your
                password.
              </p>

              <Input
                label="Registered Email"
                type="email"
                placeholder="name@example.com"
                icon={Mail}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                fullWidth
                className="h-12 text-sm"
                disabled={loading}
              >
                {loading ? "Sending Instructions..." : "Send Recovery Link"}
                {!loading && <ArrowRight size={18} className="ml-2" />}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-(--text-main)">
                  Check your inbox
                </h3>
                <p className="text-sm leading-relaxed font-medium text-(--text-dim)">
                  We've sent a recovery link to{" "}
                  <span className="text-primary font-bold">{email}</span>. Click
                  the link to securely reset your credentials.
                </p>
              </div>
              <Button
                onClick={() => setSubmitted(false)}
                variant="secondary"
                fullWidth
                className="h-10 text-xs"
              >
                Didn't receive email? Try again
              </Button>
            </div>
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
