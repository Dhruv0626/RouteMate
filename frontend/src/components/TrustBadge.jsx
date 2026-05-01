import React from "react";

/**
 * Reusable badge for driver/passenger profile cards.
 * Props:
 *   score          -> number (0–100)
 *   completedRides -> number
 *   topTags        -> array of strings (optional)
 */
const TrustBadge = ({ score = 0, completedRides = 0, topTags = [] }) => {
  let label = "Low Trust";
  let colorClass = "bg-rose-500/10 text-rose-500 border-rose-500/20";
  let dotColor = "bg-rose-500";

  if (completedRides < 5) {
    label = "🆕 New Driver";
    colorClass = "bg-sky-500/10 text-sky-500 border-sky-500/20";
    dotColor = "bg-sky-500";
  } else if (score >= 80) {
    label = "🟢 Trusted";
    colorClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    dotColor = "bg-emerald-500";
  } else if (score >= 50) {
    label = "🟡 Reliable";
    colorClass = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    dotColor = "bg-amber-500";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${label !== "🆕 New Driver" ? "animate-pulse" : ""}`} />
        {label}
      </div>
      
      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {topTags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-[9px] font-bold text-(--text-dim) flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
              <span className="text-emerald-500">✓</span> {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrustBadge;
