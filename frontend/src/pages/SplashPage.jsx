import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SplashPage = () => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // If we are on the manual /splash route, don't auto-redirect
    if (window.location.pathname === "/splash") return;

    // Show splash for 3.5 seconds then redirect
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => navigate("/home", { replace: true }), 600);
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-center bg-(--bg-main) transition-all duration-600 ${isExiting ? "opacity-0" : "opacity-100"}`}
    >
      {/* Animated Background Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Central Yellow Glow */}
        <div className="from-primary/10 absolute top-1/2 left-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-linear-to-br to-transparent blur-[100px]" />

        {/* Top Right Blue Accent */}
        <div
          className="absolute top-[15%] right-[5%] h-100 w-100 animate-pulse rounded-full bg-linear-to-bl from-blue-500/8 to-transparent blur-[120px]"
          style={{ animationDelay: "1s" }}
        />

        {/* Bottom Left Purple Accent */}
        <div
          className="absolute bottom-[10%] left-[-5%] h-87.5 w-87.5 animate-pulse rounded-full bg-linear-to-tr from-purple-500/8 to-transparent blur-[100px]"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      {/* Main Logo Container */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8">
        {/* Official Logo Container */}
          {/* Central Location Route Animation (Restored) */}
          <div className="relative z-10 flex h-48 w-48 items-center justify-center bg-white/5 rounded-full backdrop-blur-md border border-white/10 shadow-inner overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-32 h-32">
              <path
                d="M20 50 Q35 30 50 50 T80 50"
                className="stroke-primary/20"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M20 50 Q35 30 50 50 T80 50"
                className="stroke-primary animate-route-flow"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="10 100"
              />
              <g className="animate-vehicle-travel">
                <path
                  d="M-4 -8 C-4 -8 -8 -4 -8 0 C-8 4 -4 8 0 8 C4 8 8 4 8 0 C8 -4 4 -8 4 -8 L0 -14 Z"
                  fill="var(--color-primary)"
                  transform="scale(0.5) rotate(90)"
                />
                <circle r="1.5" fill="white" transform="translate(0, -2)" />
              </g>
            </svg>
          </div>


        {/* Brand Text with Animation */}
        <div
          className="animate-fade-in space-y-4 text-center"
          style={{ animationDelay: "0.5s" }}
        >
          <h1 className="text-5xl font-black tracking-tighter">
            <span className="via-primary animate-gradient-shift bg-linear-to-r from-(--text-main) to-(--text-main) bg-clip-text text-transparent">
              RouteMate
            </span>
          </h1>

          <p className="animate-pulse text-sm font-semibold tracking-widest text-(--text-dim) uppercase">
            Your Urban Journey Starts Here
          </p>
        </div>

        {/* Loading Dots */}
        <div
          className="animate-fade-in mt-8 flex gap-2"
          style={{ animationDelay: "1s" }}
        >
          <div className="bg-primary h-2 w-2 animate-bounce rounded-full" />
          <div
            className="bg-primary h-2 w-2 animate-bounce rounded-full"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="bg-primary h-2 w-2 animate-bounce rounded-full"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes route-flow {
          0% { stroke-dashoffset: 100; opacity: 0; }
          20% { opacity: 1; }
          80% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: -100; opacity: 0; }
        }
        @keyframes vehicle-travel {
          0% { offset-distance: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes pin-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
          opacity: 0;
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        .animate-route-flow {
          animation: route-flow 3s ease-in-out infinite;
        }
        .animate-vehicle-travel {
          offset-path: path("M25 50C25 50 35 30 50 50C65 70 75 50 75 50");
          animation: vehicle-travel 3s ease-in-out infinite;
        }
        .animate-pin-bounce {
          animation: pin-bounce 1s ease-in-out infinite;
        }
        .animate-spin-slow {
          transform-origin: center;
          animation: spin-slow 10s linear infinite;
        }
        .animate-spin-reverse {
          transform-origin: center;
          animation: spin-reverse 15s linear infinite;
        }
      `,
        }}
      />
    </div>
  );
};

export default SplashPage;
