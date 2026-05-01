import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Award,
  AlertCircle,
  Filter,
  Download,
  Heart,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  ChevronRight,
  Loader2,
  RefreshCw
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ui/ThemeToggle";
import ReviewCard from "../../components/ReviewCard";

const MyRatingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState("all");

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
    if (filterRating === "all") return true;
    return r.rating === parseInt(filterRating);
  });

  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => r.rating === stars).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, count, percentage };
  });

  const maxCount = Math.max(...ratingDistribution.map(r => r.count), 1);

  if (loading && !refreshing) return (
    <div className="min-h-screen flex items-center justify-center mesh-bg">
      <Loader2 className="animate-spin text-primary w-10 h-10" />
    </div>
  );

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main) transition-colors duration-500">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md transition-all duration-500">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main) hover:border-primary/40"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-(--text-main)">
                My Ratings
              </h1>
              <p className="text-[10px] text-(--text-dim) uppercase tracking-wider">
                Passenger feedback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => fetchReviews(true)} disabled={refreshing} className="p-2 text-(--text-dim) hover:text-primary transition-all">
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto max-w-4xl space-y-8 px-6 py-8">
        
        {/* ── Overall Rating Hero ── */}
        <section className="glass-card group relative overflow-hidden rounded-4xl border border-(--card-border) p-8 shadow-sm">
          <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full blur-3xl transition-all duration-700" />

          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-4">
               <p className="text-xs font-bold tracking-wider text-(--text-dim) uppercase">Your Driver Reputation</p>
               <div className="flex items-baseline gap-2">
                 <span className="text-6xl font-black text-(--text-main)">
                   {stats.averageRating ? stats.averageRating.toFixed(1) : (stats.newDriver ? "NEW" : "5.0")}
                 </span>
                 <span className="text-xl text-amber-500 font-bold">/ 5.0</span>
               </div>
               <div className="flex gap-1">
                 {[1, 2, 3, 4, 5].map(i => (
                   <Star key={i} size={20} fill={(stats.averageRating || 5) >= i ? "#FBBF24" : "none"} className={(stats.averageRating || 5) >= i ? "text-amber-400" : "text-(--text-dim)"} />
                 ))}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 max-w-xs">
               <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-(--text-dim) tracking-widest mb-1">Trust Score</p>
                  <p className="text-xl font-black text-primary">{stats.trustScore?.toFixed(0) || "0"}</p>
               </div>
               <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-(--text-dim) tracking-widest mb-1">Badge</p>
                  <p className={`text-xs font-black uppercase bg-${stats.trustBadge?.color}-500/10 text-${stats.trustBadge?.color}-400 px-2 py-1 rounded-md w-fit`}>
                    {stats.trustBadge?.badge || "New"}
                  </p>
               </div>
            </div>
          </div>
        </section>

        {/* ── Rating Distribution ── */}
        <section className="space-y-4">
           <h2 className="font-display flex items-center gap-2 text-sm font-black text-(--text-dim) uppercase tracking-widest">
              Rating Breakdown <span className="bg-primary h-1 w-1 rounded-full"></span>
           </h2>
           <div className="glass-card rounded-3xl border border-(--card-border) p-6 space-y-3">
              {ratingDistribution.map(item => (
                <div key={item.stars} className="flex items-center gap-4">
                   <span className="text-xs font-bold text-(--text-dim) w-8">{item.stars} ★</span>
                   <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                   </div>
                   <span className="text-[10px] font-black text-(--text-main) w-8 text-right">{item.count}</span>
                   <span className="text-[10px] font-bold text-(--text-dim) w-10 text-right">{item.percentage}%</span>
                </div>
              ))}
           </div>
        </section>

        {/* ── Filters & Reviews ── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-sm font-black text-(--text-dim) uppercase tracking-widest">
              Recent Reviews <span className="bg-primary h-1 w-1 rounded-full"></span>
            </h2>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
              {["all", "5", "4", "3", "2", "1"].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilterRating(f)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${filterRating === f ? "bg-primary text-black" : "text-(--text-dim) hover:bg-white/5"}`}
                >
                  {f === "all" ? "All" : `${f}★`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pb-20">
            {filteredReviews.length === 0 ? (
              <div className="py-20 text-center glass-card rounded-[2.5rem] border border-(--card-border)">
                <MessageSquare size={48} className="mx-auto text-(--text-dim) opacity-10 mb-4" />
                <p className="text-xs text-(--text-dim)">No reviews found matching this filter.</p>
              </div>
            ) : (
              filteredReviews.map(review => (
                <ReviewCard key={review._id} review={review} revealed={true} />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MyRatingPage;