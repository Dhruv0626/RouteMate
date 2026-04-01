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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badgeAttributes.map((badge, idx) => (
              <div
                key={idx}
                className={`glass-card rounded-2xl border p-4 shadow-sm transition-all ${
                  badge.achieved
                    ? "border-primary/40 hover:border-primary/60 bg-primary/5"
                    : "border-(--card-border) opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{badge.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-(--text-main)">
                      {badge.label}
                    </p>
                    <p className="text-xs text-(--text-dim) leading-relaxed">
                      {badge.description}
                    </p>
                    {badge.achieved && (
                      <p className="mt-2 text-xs font-semibold text-emerald-500 flex items-center gap-1">
                        <CheckCircle size={12} /> Achieved
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent Reviews ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Recent Reviews <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="rounded-lg border border-(--card-border) bg-(--card-bg) px-3 py-1.5 text-sm font-semibold text-(--text-main) transition-all focus:border-primary/40 focus:outline-none"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="glass-card group rounded-2xl border border-(--card-border) p-4 lg:p-6 shadow-sm transition-all hover:border-primary/40 cursor-pointer"
                  onClick={() =>
                    setExpandedReview(
                      expandedReview === review.id ? null : review.id
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{review.emoji}</div>
                          <div>
                            <p className="text-sm font-bold text-(--text-main)">
                              {review.passenger}
                            </p>
                            <p className="text-xs text-(--text-dim)">
                              {review.route}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {review.verified && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                              <CheckCircle size={12} /> Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rating Stars */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              fill={i < review.rating ? "#FBBF24" : "currentColor"}
                              className={
                                i < review.rating
                                  ? "text-amber-400"
                                  : "text-(--text-dim)"
                              }
                            />
                          ))}
                        </div>
                        <p className="text-xs text-(--text-dim)">
                          {review.date}
                        </p>
                      </div>

                      {/* Review Text */}
                      <p
                        className={`text-sm leading-relaxed text-(--text-main) transition-all ${
                          expandedReview === review.id
                            ? ""
                            : "line-clamp-2"
                        }`}
                      >
                        {review.text}
                      </p>

                      {/* Expanded Details */}
                      {expandedReview === review.id && (
                        <div className="mt-4 space-y-3 border-t border-(--card-border) pt-4">
                          <div className="flex items-center gap-3 bg-(--card-bg) rounded-lg p-3">
                            <ThumbsUp
                              size={16}
                              className="text-(--text-dim)"
                            />
                            <span className="text-sm text-(--text-dim)">
                              {review.helpful} people found this helpful
                            </span>
                          </div>
                          <button className="flex items-center gap-2 rounded-lg border border-(--card-border) bg-(--card-bg) w-full px-3 py-2 text-sm font-semibold text-(--text-main) transition-all hover:border-primary/40 hover:bg-primary/5">
                            <Heart size={14} />
                            Thank the rider
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <div className="flex-shrink-0 text-primary">
                      <ChevronRight
                        size={20}
                        className={`transition-transform ${
                          expandedReview === review.id ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card rounded-2xl border border-(--card-border) p-8 text-center shadow-sm">
                <p className="text-(--text-dim) font-medium">
                  No reviews with this rating yet.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Improvement Tips ── */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-display flex items-center gap-2 text-lg font-black text-(--text-main)">
              Improvement Tips <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {improvementTips.map((tip, idx) => (
              <div
                key={idx}
                className="glass-card group relative overflow-hidden rounded-3xl border border-(--card-border) p-6 shadow-sm transition-all hover:border-emerald-500/40"
              >
                <div className="from-emerald-500/20 to-emerald-500/5 absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl" />
                <div className="relative space-y-3">
                  <div className="text-4xl">{tip.icon}</div>
                  <div>
                    <h3 className="text-sm font-bold text-(--text-main) mb-1">
                      {tip.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-(--text-dim)">
                      {tip.description}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 px-3 py-2">
                    <p className="text-xs font-bold text-emerald-500">
                      {tip.improvement}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Rating Insights ── */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass-card rounded-2xl border border-(--card-border) p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-sm font-bold text-(--text-main)">
                Your Strength
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-(--text-dim) mb-3">
              Passengers love your communication skills and friendly nature.
            </p>
            <div className="text-lg font-black text-(--text-main)">
              Professional Attitude
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-(--card-border) p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <Target size={20} />
              </div>
              <h3 className="text-sm font-bold text-(--text-main)">
                Area to Improve
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-(--text-dim) mb-3">
              A few passengers mentioned vehicle cleanliness. Focus on this to boost ratings.
            </p>
            <div className="text-lg font-black text-(--text-main)">
              Vehicle Maintenance
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-(--card-border) p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-600 dark:text-cyan-400">
                <Award size={20} />
              </div>
              <h3 className="text-sm font-bold text-(--text-main)">
                Next Milestone
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-(--text-dim) mb-3">
              You're 2 five-star reviews away from reaching 200 perfect ratings!
            </p>
            <div className="text-lg font-black text-primary">
              2 reviews away
            </div>
          </div>
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