import React from "react";

const getPageLoaderText = (path) => {
  if (!path) return "Please wait...";

  // Driver Dashboard Pages
  if (path.includes("/driver/dashboard/settings")) return "Loading your settings...";
  if (path.includes("/driver/dashboard/rate-card")) return "Fetching latest platform rates...";
  if (path.includes("/driver/dashboard/go-online")) return "Go Online...";
  if (path.includes("/driver/dashboard/earnings")) return "Fetching your earnings...";
  if (path.includes("/driver/dashboard/history")) return "Fetching your Trip history...";
  if (path.includes("/driver/dashboard/rating")) return "Fetching your rating...";
  if (path.includes("/driver/dashboard/profile")) return "Fetching your Driver Profile...";
  if (path.includes("/driver/dashboard/wallet")) return "Fetching your Driver Wallet...";
  if (path.includes("/driver/dashboard/manage-rides")) return "Fetching your rides...";
  if (path.includes("/driver/dashboard/active-rides")) return "Fetching active rides...";
  if (path.includes("/driver/dashboard/bookings")) return "Loading your rides...";

  // Passenger Dashboard Pages
  if (path.includes("/passenger/dashboard/settings")) return "Loading your settings...";
  if (path.includes("/passenger/dashboard/places")) return "Retrieving your Saved Places...";
  if (path.includes("/passenger/dashboard/reviews")) return "Fetching your Reviews...";
  if (path.includes("/passenger/dashboard/referral")) return "Synchronizing Referral Page...";
  if (path.includes("/passenger/dashboard/payments")) return "Fetching your transaction records...";
  if (path.includes("/passenger/dashboard/profile")) return "Retrieving your Passenger Profile...";
  if (path.includes("/passenger/dashboard/my-rides")) return "Fetching your rides...";
  if (path.includes("/passenger/dashboard/history")) return "fetching your ride history...";

  // Generic settings (fallback for any role using /:role/dashboard/settings)
  if (path.includes("/dashboard/settings")) return "Loading your settings...";

  // General Dashboard Route
  if (path.endsWith("/driver/dashboard") || path.endsWith("/driver/dashboard/")) return "Navigate to your Dashboard...";
  if (path.endsWith("/passenger/dashboard") || path.endsWith("/passenger/dashboard/")) return "Navigate to your Dashboard...";
  if (path.includes("/dashboard") && (path.includes("/driver/") || path.includes("/passenger/"))) return "Navigate to your Dashboard...";

  // Admin Dashboard Pages
  if (path.includes("/dashboard/manage-users")) return "Accessing User Data...";
  if (path.includes("/dashboard/analytics")) return "Compiling platform metrics...";
  if (path.includes("/dashboard/revenue")) return "Fetching platform Revenue...";
  if (path.includes("/dashboard/driver-approvals")) return "Loading driver applications...";
  if (path.includes("/dashboard/fleet")) return "Scanning fleet transports...";
  if (path.includes("/dashboard/security")) return "Initializing cryptographic environment...";
  if (path.includes("/dashboard/profile") && path.includes("/admin/")) return "Fetching your Admin Profile...";
  if (path.includes("/dashboard/history") && path.includes("/admin/")) return "Retrieving Platform Audit Records...";
    if (path.includes("/dashboard/sos") && path.includes("/admin/")) return "Retrieving Sos Alerts...";

  // Public/Auth Routes
  if (path.includes("/signin")) return "Preparing secure access...";
  if (path.includes("/signup")) return "Building your ride profile...";
  if (path.includes("/forgot-password")) return "Locating recovery protocols...";
  if (path.includes("/home")) return "Initializing urban experience...";
  if (path.includes("/complete-profile")) return "Verifying your session...";

  // Fallbacks
  if (path.includes("driver")) return "Synchronizing your driver status...";
  if (path.includes("dashboard")) return "Navigate to your Dashboard...";
  return "Please Wait, Loading...";
};

const Loader = ({
  fullPage = false,
  className = "",
  text,
}) => {
  const resolvedText = text !== undefined ? text : getPageLoaderText(window.location.pathname);
  const containerClasses = fullPage
    ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-main)] transition-colors duration-500"
    : `flex flex-col items-center justify-center p-8 ${className}`;

  return (
    <div className={containerClasses}>
      {/* Dynamic Background Mesh (Only for Full Page) */}
      {fullPage && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-primary/5 absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full blur-[140px]" />
          <div
            className="absolute top-[20%] right-[10%] h-75 w-75 animate-pulse rounded-full bg-blue-500/5 blur-[100px]"
            style={{ animationDelay: "1s" }}
          />
        </div>
      )}

      <div className="relative flex h-35 w-35 items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full drop-shadow-2xl"
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

          {/* Perfect Outer Casing Border (Darker Tone) */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#E6B800"
            strokeWidth="2"
            opacity="0.15"
          />

          {/* Animated Spinner Border Section */}
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

          {/* Secondary Delicate Orbit (Dotted) */}
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

          {/* Thin Modern Route Path (Static) */}
          <path
            d="M30 50C30 50 40 35 50 50C60 65 70 50 70 50"
            stroke="#FFCC00"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.1"
          />

          {/* Thin Animated Route Line */}
          <path
            d="M30 50C30 50 40 35 50 50C60 65 70 50 70 50"
            stroke="#FFCC00"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="animate-route-flow"
            strokeDasharray="80"
            strokeDashoffset="80"
          />

          {/* Destination Pin (Location Shape) */}
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

          {/* Moving Vehicle (The Journey) */}
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

        {/* Outer Halo Glow */}
        <div className="absolute inset-0 scale-110 rounded-full border-[1.5px] border-[#fccd0e]" />
      </div>

      {fullPage && (
        <div className="relative z-10 mt-8 space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
             <div className="h-[1px] w-8 bg-linear-to-r from-transparent to-primary/50" />
             <h2 className="font-display text-2xl font-black tracking-tighter text-(--text-main)">
              <span className="bg-linear-to-br from-(--text-main) to-(--text-dim) bg-clip-text text-transparent">
                Route
              </span>
              <span className="text-primary italic">Mate</span>
            </h2>
            <div className="h-[1px] w-8 bg-linear-to-l from-transparent to-primary/50" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-[9px] font-black tracking-[0.6em] text-primary uppercase animate-pulse">
              {resolvedText}
            </p>
            <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-linear-to-r from-primary/20 via-primary to-primary/20 w-1/2 animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shimmer {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
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

        .animate-shimmer {
          animation: shimmer 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
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

export default Loader;
