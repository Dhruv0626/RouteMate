import React from "react";
import { Star, Lock, User } from "lucide-react";

/**
 * Reusable card used in the reviews list.
 * Props:
 *   review   -> review object from API
 *   revealed -> boolean
 */
const ReviewCard = ({ review, revealed }) => {
  const isRevealed = revealed !== undefined ? revealed : (review.isRevealed !== false);

  if (!isRevealed) {
    return (
      <div className="relative glass-card rounded-[2rem] border border-(--card-border) p-8 overflow-hidden group hover:border-primary/20 transition-all duration-500">
        <div className="absolute inset-0 bg-(--bg-main)/40 backdrop-blur-xl z-10 flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-2xl border border-white/10 animate-pulse">
            <Lock size={28} className="text-primary/60" />
          </div>
          <h4 className="text-[10px] font-black text-(--text-main) mb-1 uppercase tracking-[0.2em] opacity-80">Feedback Pending</h4>
          <p className="text-[9px] text-(--text-dim) font-bold uppercase tracking-tight opacity-40">Reveals when both parties submit</p>
        </div>

        {/* Placeholder content behind blur */}
        <div className="opacity-5 grayscale select-none blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl" />
            <div className="h-4 w-32 bg-white/20 rounded-lg" />
          </div>
          <div className="h-16 w-full bg-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { reviewer, rating, comment, tags, createdAt } = review;
  const date = new Date(createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="glass-card rounded-[2rem] border border-(--card-border) p-6 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5 flex items-center justify-center text-(--text-dim) overflow-hidden">
            {reviewer?.profileImage 
              ? <img src={reviewer.profileImage} alt="" className="w-full h-full object-cover" />
              : <User size={20} />
            }
          </div>
          <div>
            <h4 className="text-sm font-black text-(--text-main)">{reviewer?.name || "RouteMate User"}</h4>
            <span className="text-[10px] font-black text-(--text-dim) uppercase tracking-[0.15em] opacity-60">
              {date}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-[#FFB800] bg-[#FFB800]/10 px-3 py-1 rounded-xl border border-[#FFB800]/20">
            <Star size={14} fill="currentColor" />
            <span className="text-sm font-black">{rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag, idx) => (
            <span 
              key={idx} 
              className="px-2.5 py-1 rounded-full border border-(--card-border) text-[9px] font-bold text-(--text-dim) uppercase tracking-tighter"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Comment Section */}
      {comment && (
        <div className="relative mt-4 pt-4 border-t border-white/5">
          <p className="text-sm text-(--text-dim) italic leading-relaxed font-medium pl-4 border-l-2 border-primary/40">
            "{comment}"
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
