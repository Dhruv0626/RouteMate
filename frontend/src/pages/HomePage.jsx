import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Navigation, Car, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LandingPage = () => {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.role}/dashboard`} replace />;

  return (
    <div className="mesh-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 font-sans text-(--text-main)">
      {/* Background decoration */}
      <div className="bg-primary/10 pointer-events-none absolute top-[-20%] left-[-10%] h-[60%] w-[60%] rounded-full blur-[140px]" />
      <div className="bg-accent/5 pointer-events-none absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full blur-[140px]" />

      <div className="relative z-10 w-full max-w-4xl space-y-10 text-center">
        <div className="space-y-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
            <span className="bg-primary h-2 w-2 animate-pulse rounded-full"></span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
              Next Gen Mobility
            </span>
          </div>
          <h1 className="font-display text-5xl leading-tight font-bold tracking-tighter md:text-6xl">
            <span className="bg-linear-to-br from-(--text-main) to-(--text-dim) bg-clip-text text-transparent italic">
              Route
            </span>
            <span className="text-primary">Mate</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed font-medium text-slate-400 md:text-xl">
            The intelligent layer for urban transportation. Seamless, secure,
            and sophisticated.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
          <Link
            to="/signin"
            className="bg-primary hover:bg-primary-dark group flex w-full items-center gap-2 rounded-2xl px-10 py-3.5 text-base font-bold text-black shadow-[0_20px_40px_-10px_rgba(255,221,0,0.3)] transition-all active:scale-95 sm:w-auto"
          >
            Welcome to RouteMate
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-12 text-left md:grid-cols-3">
          {[
            {
              title: "Passengers",
              desc: "Find reliable rides and track your journey with real-time AI mapping.",
              icon: Navigation,
            },
            {
              title: "Drivers",
              desc: "Optimize your routes and maximize your earnings with smart dispatch.",
              icon: Car,
            },
            {
              title: "Enterprise",
              desc: "Scalable solutions for fleet management and corporate logistics.",
              icon: Shield,
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group glass-card hover:border-primary/30 rounded-3xl border-(--card-border) p-6 transition-all hover:-translate-y-1"
            >
              <div className="bg-primary/10 text-primary group-hover:bg-primary mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-all group-hover:text-black">
                <feature.icon size={18} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-(--text-main)">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-(--text-dim)">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <footer className="pt-16 pb-6 text-[10px] font-bold tracking-[0.3em] text-slate-600 uppercase">
          © 2026 RouteMate Technologies Inc.
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
