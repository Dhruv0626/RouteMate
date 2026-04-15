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
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const MyRatingPage = () => {
  const navigate = useNavigate();
  const [filterRating, setFilterRating] = useState("all");
  const [expandedReview, setExpandedReview] = useState(null);

  // Mock data for demonstration
  const ratingStats = {
    overallRating: 0.0,
    totalRatings: 0,
    twentyFour: 0.0,
    sevenDay: 0.0,
    thirtyDay: 0.0,
  };

  const ratingDistribution = [
    { stars: 5, count: 0, percentage: 0 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 },
  ];

  const ratingTrend = [
    { week: "Week 1", rating: 0.0, reviews: 0 },
    { week: "Week 2", rating: 0.0, reviews: 0 },
    { week: "Week 3", rating: 0.0, reviews: 0 },
    { week: "Week 4", rating: 0.0, reviews: 0 },
    { week: "Week 5", rating: 0.0, reviews: 0 },
  ];

  const reviews = [
    {
      id: 1,
      rating: 5,
      text: "Excellent driver! Very professional and courteous. The ride was smooth and comfortable. Highly recommended!",
      passenger: "Sarah M.",
      route: "Downtown → Airport",
      date: "2 hours ago",
      helpful: 5,
      verified: true,
      emoji: "😍",
    },
    {
      id: 2,
      rating: 5,
      text: "Great experience! Driver was on time and took the best route. Made my day stress-free.",
      passenger: "John P.",
      route: "Mall → Hotel Grand",
      date: "4 hours ago",
      helpful: 3,
      verified: true,
      emoji: "👍",
    },
    {
      id: 3,
      rating: 4,
      text: "Good ride overall. Driver was friendly but car could use some air freshener. Still very satisfied.",
      passenger: "Emma R.",
      route: "Station → Office",
      date: "1 day ago",
      helpful: 2,
      verified: true,
      emoji: "😊",
    },
    {
      id: 4,
      rating: 5,
      text: "Perfect! Driver helped me with luggage and was super accommodating. Will definitely ride again.",
      passenger: "Michael T.",
      route: "Railway Station → Hotel",
      date: "2 days ago",
      helpful: 8,
      verified: true,
      emoji: "⭐",
    },
    {
      id: 5,
      rating: 4,
      text: "Nice driver, smooth ride. Just wish the music wasn't so loud initially, but they adjusted it right away.",
      passenger: "Lisa K.",
      route: "Tech Park → Downtown",
      date: "3 days ago",
      helpful: 4,
      verified: true,
      emoji: "🎵",
    },
  ];

  const badgeAttributes = [
    {
      icon: "⭐",
      label: "Excellent Rating",
      description: "Maintained 0.0+ stars",
      achieved: true,
    },
    {
      icon: "💎",
      label: "Premium Driver",
      description: "0+ verified reviews",
      achieved: true,
    },
    {
      icon: "🎯",
      label: "On-Time King",
      description: "98%+ on-time arrivals",
      achieved: true,
    },
    {
      icon: "🤝",
      label: "Community Leader",
      description: "Help other drivers",
      achieved: false,
    },
    {
      icon: "🚀",
      label: "Rising Star",
      description: "Rating improved this month",
      achieved: true,
    },
    {
      icon: "❤️",
      label: "Customer Favorite",
      description: "Top 10% of drivers",
      achieved: true,
    },
  ];

  const improvementTips = [
    {
      icon: "🛣️",
      title: "Optimize Route Choice",
      description: "Choose faster routes to improve ride experience",
      improvement: "2-3% rating boost",
    },
    {
      icon: "🎵",
      title: "Music & Atmosphere",
      description: "Ask passengers about music preferences",
      improvement: "1-2% rating boost",
    },
    {
      icon: "💬",
      title: "Communication",
      description: "Share ETA and let passengers know about delays",
      improvement: "2-3% rating boost",
    },
    {
      icon: "🚗",
      title: "Vehicle Cleanliness",
      description: "Keep car clean and well-maintained",
      improvement: "2-3% rating boost",
    },
  ];

  const maxReviews = Math.max(...ratingDistribution.map((r) => r.count));
  const filteredReviews =
    filterRating === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(filterRating));

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
            <ThemeToggle />
            <button className="rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-2 text-sm font-semibold text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5 flex items-center gap-2">
              <Download size={16} />
              <span className="hidden sm:inline">Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* ── Overall Rating Hero ── */}
        <section className="glass-card group relative overflow-hidden rounded-4xl border border-(--card-border) p-8 lg:p-12 shadow-sm">
          <div className="from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full blur-3xl transition-all duration-700" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Section */}
            <div className="space-y-6 flex-1">
              <div>
                <p className="mb-2 text-xs font-bold tracking-wider text-(--text-dim) uppercase">
                  Your Overall Rating
                </p>
                <div className="flex items-end gap-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-7xl font-black text-(--text-main)">
                      {ratingStats.overallRating}
                    </span>
                    <span className="text-2xl text-amber-500 mb-2">/5</span>
                  </div>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={24}
                        fill={
                          i < Math.floor(ratingStats.overallRating)
                            ? "#FBBF24"
                            : "currentColor"
                        }
                        className={
                          i < Math.floor(ratingStats.overallRating)
                            ? "text-amber-400"
                            : "text-(--text-dim)"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-(--card-border) pt-6">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Total Ratings
                  </span>
                  <span className="font-bold text-(--text-main)">
                    {ratingStats.totalRatings}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Last 24 Hours
                  </span>
                  <span className="font-bold text-amber-500">
                    {ratingStats.twentyFour}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Last 7 Days
                  </span>
                  <span className="font-bold text-amber-500">
                    {ratingStats.sevenDay}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-(--text-dim)">
                    Last 30 Days
                  </span>
                  <span className="font-bold text-amber-500">
                    {ratingStats.thirtyDay}/5
                  </span>
                </div>
              </div>
            </div>

            {/* Rating Trend Chart */}
            <div className="flex-1">
              <p className="mb-6 text-sm font-bold text-(--text-dim)">
                Rating Trend
              </p>
              <div className="flex items-end justify-between gap-2 h-48">
                {ratingTrend.map((item, idx) => (
                  <div
                    key={idx}
                    className="group/bar relative flex flex-1 flex-col items-center gap-2"
                  >
                    <div className="relative h-full w-full flex items-end justify-center">
                      <div
                        className="from-primary to-primary-dark group-hover/bar:shadow-primary/40 w-3/5 rounded-t-lg bg-linear-to-t shadow-lg transition-all duration-300 group-hover/bar:shadow-xl"
                        style={{ height: `${(item.rating / 5) * 100}%` }}
                      >
                        <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 dark:bg-white/80 text-white dark:text-black px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-opacity z-20">
                          {item.rating}/5
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-(--text-main)">
                        {item.week}
                      </p>
                      <p className="text-[10px] text-(--text-dim)">
                        {item.reviews} reviews
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Rating Distribution ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Rating Breakdown <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="glass-card rounded-3xl border border-(--card-border) p-6 lg:p-8 shadow-sm">
            <div className="space-y-4">
              {[...ratingDistribution].reverse().map((item) => (
                <div key={item.stars} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-32">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < item.stars ? "#FBBF24" : "currentColor"}
                            className={
                              i < item.stars
                                ? "text-amber-400"
                                : "text-(--text-dim)"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-(--text-dim)">
                        {item.stars} star
                        {item.stars !== 1 && "s"}
                      </span>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="relative h-3 rounded-full bg-(--card-border) overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-amber-400 to-amber-500 transition-all"
                          style={{
                            width: `${(item.count / maxReviews) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 min-w-28">
                      <span className="text-sm font-bold text-(--text-main)">
                        {item.count}
                      </span>
                      <span className="text-xs font-semibold text-(--text-dim) w-12 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Badges & Achievements ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Achievements <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="glass-card rounded-2xl border border-(--card-border) p-8 text-center shadow-sm">
            <p className="text-(--text-dim) text-sm font-medium">
              No achievements recorded yet. Complete more rides to unlock badges!
            </p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Recent Reviews <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="glass-card rounded-2xl border border-(--card-border) p-8 text-center shadow-sm">
            <p className="text-(--text-dim) font-medium">
              No reviews received yet.
            </p>
          </div>
        </section>

        {/* ── Improvement Tips ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Improvement Tips <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="glass-card rounded-2xl border border-(--card-border) p-8 text-center shadow-sm">
            <p className="text-(--text-dim) text-sm font-medium">
              No improvement tips available at this time.
            </p>
          </div>
        </section>

        {/* ── Rating Insights ── */}
        <section className="glass-card rounded-2xl border border-(--card-border) p-8 text-center shadow-sm">
          <p className="text-(--text-dim) text-sm font-medium">
            Rating insights will appear here as you gather more passenger feedback.
          </p>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl border-t border-(--card-border) px-6 py-10 text-center">
        <p className="text-[9px] font-black tracking-[0.3em] text-(--text-dim) uppercase">
          RouteMate • © 2026
        </p>
      </footer>
    </div>
  );
};

export default MyRatingPage;