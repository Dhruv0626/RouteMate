import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SplashPage = () => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
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
        {/* Animated Logo SVG */}
        <div className="animate-float relative h-32 w-32">
          <div className="from-primary/20 absolute inset-0 animate-pulse rounded-full bg-linear-to-br to-blue-500/20 blur-xl" />

          <svg
            viewBox="0 0 100 100"
            className="relative z-10 h-full w-full drop-shadow-2xl"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main Container Glass Circle */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="var(--card-bg)"
              stroke="var(--card-border)"
              strokeWidth="0.5"
              className="backdrop-blur-sm"
            />

            {/* Outer Border */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#E6B800"
              strokeWidth="2"
              opacity="0.15"
            />

            {/* Animated Spinner */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#FFCC00"
              strokeWidth="1.5"
              strokeDasharray="80 220"
              strokeLinecap="round"
              className="animate-spin-slow"
            />

            {/* Secondary Orbit */}
            <circle
              cx="50"
              cy="50"
              r="50"
              fill="none"
              stroke="#fccd0e"
              strokeWidth="2"
              strokeDasharray="1 14"
              className="animate-spin-reverse opacity-60"
            />

            {/* Route Path */}
            <path
              d="M30 50C30 50 40 35 50 50C60 65 70 50 70 50"
              stroke="#FFCC00"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.1"
            />

            {/* Animated Route Line */}
            <path
              d="M30 50C30 50 40 35 50 50C60 65 70 50 70 50"
              stroke="#FFCC00"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="animate-route-flow"
              strokeDasharray="80"
              strokeDashoffset="80"
            />

            {/* Destination Pin */}
            <g
              className="animate-pin-bounce"
              style={{ transformOrigin: "70px 50px" }}
            >
              <path
                d="M70 43C67.8 43 66 44.8 66 47C66 49.8 70 54 70 54C70 54 74 49.8 74 47C74 44.8 72.2 43 70 43ZM70 49C68.9 49 68 48.1 68 47C68 45.9 68.9 45 70 45C71.1 45 72 45.9 72 47C72 48.1 71.1 49 70 49Z"
                fill="#FFCC00"
              />
              <circle
                cx="70"
                cy="54"
                r="2.5"
                stroke="#FFCC00"
                strokeWidth="0.5"
                opacity="0.4"
                className="animate-ping"
              />
            </g>

            {/* Moving Vehicle */}
            <g className="animate-vehicle-travel">
              <circle r="1.5" fill="#FFCC00" />
              <circle
                r="3.5"
                fill="#FFCC00"
                opacity="0.2"
                className="animate-pulse"
              />
            </g>
          </svg>

          {/* Outer Halo */}
          <div
            className="absolute inset-0 scale-110 animate-pulse rounded-full border-[1.5px] border-[#fccd0e]"
            style={{ animationDelay: "0.3s" }}
          />
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
