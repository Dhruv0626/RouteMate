import React, { useState } from "react";
import { 
  Star, 
  ChevronLeft, 
  MessageSquare, 
  ThumbsUp, 
  Clock, 
  User, 
  Calendar,
  Filter,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";

const MOCK_REVIEWS = [
  { id: 1, driver: "Ravi Kumar", date: "Today", rating: 5, comment: "Excellent service! The car was clean and Ravi was very professional.", trip: "Maninagar to Iskon" },
  { id: 2, driver: "Arjun Mehta", date: "Yesterday", rating: 4, comment: "Fairly good ride, though we hit some traffic in the end.", trip: "Bopal to SP Stadium" },
  { id: 3, driver: "Kiran R.", date: "6 Mar", rating: 5, comment: "Very polite driver. Highly recommended.", trip: "Satellite to Prahlad Nagar" },
];

const PENDING_REVIEWS = [
  { id: 101, driver: "Deepak S.", date: "Yesterday, 4:20 PM", trip: "CEPT Uni to Bodakdev" },
];

const ReviewsPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

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
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        
        {/* Pending Reviews Section */}
        {PENDING_REVIEWS.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-black text-(--text-main) mb-6 flex items-center gap-2">
              Pending Reviews <span className="bg-amber-400 h-1.5 w-1.5 rounded-full"></span>
            </h2>
            <div className="space-y-4">
              {PENDING_REVIEWS.map((trip) => (
                <div key={trip.id} className="from-primary/20 to-primary/5 rounded-3xl border border-primary/20 bg-linear-to-br p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute -right-8 -top-8 h-32 w-32 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-black shadow-lg">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-(--text-main) text-lg">{trip.driver}</h3>
                        <p className="text-xs text-(--text-dim) font-bold uppercase tracking-widest mt-0.5">{trip.trip}</p>
                        <p className="text-[10px] text-(--text-dim) font-black mt-1 uppercase tracking-widest opacity-60">Completed {trip.date}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                       <div className="flex items-center gap-1 justify-center sm:justify-end">
                         {[1, 2, 3, 4, 5].map(star => (
                           <Star key={star} size={24} className="text-(--card-border) cursor-pointer hover:text-primary transition-colors" />
                         ))}
                       </div>
                       <button className="bg-primary text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                         Leave Feedback
                       </button>
                    </div>
                  </div>
                </div>
              ))}
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
        <section className="space-y-4">
          {MOCK_REVIEWS.map((review) => (
            <div key={review.id} className="glass-card rounded-3xl border border-(--card-border) p-6 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-(--text-dim)">
                       <User size={18} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-(--text-main)">{review.driver}</h4>
                       <span className="text-[9px] font-black text-(--text-dim) uppercase tracking-[0.2em]">{review.date} • {review.trip}</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-black">{review.rating.toFixed(1)}</span>
                 </div>
              </div>
              <p className="text-sm text-(--text-dim) leading-relaxed">
                 "{review.comment}"
              </p>
              <div className="mt-4 flex items-center gap-4 pt-4 border-t border-(--card-border)/50">
                 <button className="flex items-center gap-2 text-[10px] font-black uppercase text-(--text-dim) hover:text-primary transition-all">
                    <ThumbsUp size={12} /> Helpful
                 </button>
                 <button className="flex items-center gap-2 text-[10px] font-black uppercase text-(--text-dim) hover:text-primary transition-all">
                    <MessageSquare size={12} /> View Reply
                 </button>
              </div>
            </div>
          ))}
        </section>

      </main>
    </div>
  );
};

export default ReviewsPage;
