import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ChevronLeft, ThumbsUp, MessageCircle } from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const REVIEWS = [
  { id: 1, name: "Riya Shah", date: "Today", rating: 5, comment: "Very professional and punctual driver. Car was very clean!", tags: ["Punctual", "Clean Car"] },
  { id: 2, name: "Arjun Mehta", date: "Yesterday", rating: 4, comment: "Good driving, knew the routes well. A bit quiet but that's okay.", tags: ["Good Route", "Safe Drive"] },
  { id: 3, name: "Kavita Patel", date: "7 Mar", rating: 5, comment: "Best ride I've had on RouteMate. Will definitely choose this driver again.", tags: ["Friendly", "Punctual"] },
  { id: 4, name: "Harshil Joshi", date: "6 Mar", rating: 3, comment: "AC was not working properly. Everything else was fine.", tags: [] },
  { id: 5, name: "Sneha Trivedi", date: "5 Mar", rating: 5, comment: "Excellent! Very comfortable and fast ride.", tags: ["Friendly", "Clean Car", "Safe Drive"] },
];

const RATING_CATEGORIES = [
  { label: "Comfort", score: 4.7 },
  { label: "Cleanliness", score: 4.5 },
  { label: "Safety", score: 4.9 },
  { label: "Punctuality", score: 4.6 },
];

const StarRow = ({ rating, max = 5, size = 16 }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Star key={i} size={size} fill={i < rating ? "currentColor" : "none"}
        className={i < rating ? "text-amber-400" : "text-(--text-dim) opacity-30"} />
    ))}
  </div>
);

const MyRatingPage = () => {
  const navigate = useNavigate();
  const avgRating = (REVIEWS.reduce((a, r) => a + r.rating, 0) / REVIEWS.length).toFixed(1);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? REVIEWS : REVIEWS.filter(r => r.rating === Number(filter));

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main)">
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/driver/dashboard")} className="rounded-xl p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all">
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">My Rating</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Hero Rating Card */}
        <div className="glass-card relative overflow-hidden rounded-3xl p-8 text-center">
          <div className="bg-amber-400/10 pointer-events-none absolute inset-0 rounded-3xl" />
          <p className="text-[10px] font-black tracking-[0.3em] text-(--text-dim) uppercase mb-2">Overall Rating</p>
          <p className="text-7xl font-black text-(--text-main)">{avgRating}</p>
          <div className="flex justify-center my-3">
            <StarRow rating={Math.round(avgRating)} size={24} />
          </div>
          <p className="text-sm text-(--text-dim)">Based on <span className="font-black text-(--text-main)">{REVIEWS.length} reviews</span></p>
        </div>

        {/* Category Breakdown */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="font-display font-black text-(--text-main) mb-4">Rating Breakdown</h2>
          <div className="space-y-3">
            {RATING_CATEGORIES.map(({ label, score }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-24 text-sm font-bold text-(--text-dim)">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-(--card-bg) overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${(score / 5) * 100}%` }} />
                </div>
                <span className="w-8 text-sm font-black text-(--text-main) text-right">{score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {["all", "5", "4", "3", "2", "1"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${filter === f ? "bg-primary text-black" : "glass-card text-(--text-dim)"}`}>
              {f !== "all" && <Star size={10} fill="currentColor" className="text-amber-400" />}
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {/* Reviews */}
        <div className="space-y-4">
          {filtered.map(review => (
            <div key={review.id} className="glass-card rounded-3xl p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="from-primary to-primary-dark flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br font-black text-black">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="font-black text-(--text-main)">{review.name}</p>
                    <p className="text-xs text-(--text-dim)">{review.date}</p>
                  </div>
                </div>
                <StarRow rating={review.rating} size={14} />
              </div>

              {review.comment && (
                <div className="flex gap-2">
                  <MessageCircle size={14} className="text-(--text-dim) flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-(--text-main) leading-relaxed">{review.comment}</p>
                </div>
              )}

              {review.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {review.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-black text-primary">
                      <ThumbsUp size={9} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MyRatingPage;
