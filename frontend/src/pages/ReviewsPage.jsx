import React, { useState, useEffect } from "react";
import { 
  Star, 
  ChevronLeft, 
  MessageSquare, 
  ThumbsUp, 
  Clock, 
  User, 
  Calendar,
  Filter,
  ArrowRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ui/ThemeToggle";
import ReviewCard from "../components/ReviewCard";
import Loader from "../components/ui/Loader";

/* ── Partial Star Rating Component ─────────────────────────────────────────
   Renders 5 stars. Each star can be:
   - Fully filled  (index < Math.floor(rating))
   - Partially filled (index === Math.floor(rating), filled by decimal fraction)
   - Empty          (index > Math.floor(rating))
   Uses an SVG clipPath so the partial fill is pixel-perfect.
─────────────────────────────────────────────────────────────────────────── */
const PartialStarRating = ({ rating, size = 28 }) => {
  const total = 5;
  const fullStars = Math.floor(rating);
  const fraction = rating - fullStars; // e.g. 0.8 for 4.8

  return (
    <div className="flex items-center gap-1" aria-label={`Rating: ${rating} out of 5`}>
      {Array.from({ length: total }).map((_, i) => {
        const isFull    = i < fullStars;
        const isPartial = i === fullStars && fraction > 0;
        const clipId    = `star-clip-${i}-${rating}`;

        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block", flexShrink: 0 }}
          >
            {isPartial && (
              <defs>
                <clipPath id={clipId}>
                  {/* Clip rect width = fraction * 24 (the star viewBox width) */}
                  <rect x="0" y="0" width={fraction * 24} height="24" />
                </clipPath>
              </defs>
            )}

            {/* Background (empty) star */}
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill="none"
              stroke="#FFB800"
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity={isFull ? 0 : 0.35}
            />

            {/* Filled star — full or partial via clipPath */}
            {(isFull || isPartial) && (
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill="#FFB800"
                stroke="#FFB800"
                strokeWidth="1"
                strokeLinejoin="round"
                clipPath={isPartial ? `url(#${clipId})` : undefined}
              />
            )}
          </svg>
        );
      })}
    </div>
  );
};

const ReviewsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchReviews = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get(`/reviews/user/${user?.id || user?._id}`);
      if (res.data.success) {
        setReviews(res.data.reviews || []);
        setStats(res.data.stats || {});
      }
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) fetchReviews();
  }, [user]);

  const filteredReviews = reviews.filter(r => {
    if (filter === "positive") return r.rating >= 4;
    if (filter === "critical") return r.rating <= 2;
    return true;
  });

  if (loading) {
    return <Loader fullPage text="Fetching your Reviews..." />;
  }

  return (
    <div className="mesh-bg min-h-screen font-sans text-(--text-main)">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/passenger/dashboard")}
              className="rounded-xl border border-(--card-border) p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">Rate & Review</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchReviews(true)} disabled={refreshing} className="p-2 text-(--text-dim) hover:text-primary transition-all">
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        
        {/* Stats Section */}
        {!loading && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-3xl border border-(--card-border) p-5 flex flex-col gap-1">
                <span className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">Trust Score</span>
                <div className="flex items-center gap-2">
                   <ThumbsUp size={18} className="text-primary" />
                   <span className="text-2xl font-black">{stats.trustScore?.toFixed(0) || "0"}</span>
                   {stats.trustBadge && (
                     <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-tighter ml-auto bg-${stats.trustBadge.color}-500/10 text-${stats.trustBadge.color}-400`}>
                       {stats.trustBadge.badge}
                     </span>
                   )}
                </div>
              </div>
              <div className="glass-card rounded-3xl border border-(--card-border) p-5 flex flex-col gap-2">
                <span className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">Avg Rating</span>
                <div className="flex items-center gap-2">
                   <span className="text-2xl font-black">
                     {stats.averageRating ? stats.averageRating.toFixed(1) : (stats.newDriver ? "NEW" : "5.0")}
                   </span>
                   <span className="text-xs text-(--text-dim) font-bold">/ 5.0</span>
                </div>
                <PartialStarRating
                  rating={stats.averageRating ?? (stats.newDriver ? 0 : 5)}
                  size={22}
                />
              </div>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="flex items-center justify-between border-b border-(--card-border) pb-4">
           <div className="flex items-center gap-6">
              <button onClick={() => setFilter("all")} className={`text-xs font-black uppercase tracking-widest transition-all ${filter === "all" ? "text-primary underline underline-offset-8" : "text-(--text-dim)"}`}>All Reviews</button>
              <button onClick={() => setFilter("positive")} className={`text-xs font-black uppercase tracking-widest transition-all ${filter === "positive" ? "text-primary underline underline-offset-8" : "text-(--text-dim)"}`}>Positive</button>
              <button onClick={() => setFilter("critical")} className={`text-xs font-black uppercase tracking-widest transition-all ${filter === "critical" ? "text-primary underline underline-offset-8" : "text-(--text-dim)"}`}>Critical</button>
           </div>
           <Filter size={16} className="text-(--text-dim)" />
        </section>

        {/* Review List */}
        <section className="space-y-4 pb-20">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
               <Loader2 className="animate-spin text-primary opacity-20" size={32} />
               <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest animate-pulse">Fetching your feedback history...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-20 text-center glass-card rounded-[2.5rem] border border-(--card-border)">
               <MessageSquare size={48} className="mx-auto text-(--text-dim) opacity-10 mb-4" />
               <h3 className="font-black text-lg">No reviews found</h3>
               <p className="text-xs text-(--text-dim)">Complete trips to build your reputation on RouteMate.</p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <ReviewCard key={review._id} review={review} revealed={true} />
            ))
          )}
        </section>

      </main>
    </div>
  );
};

export default ReviewsPage;
