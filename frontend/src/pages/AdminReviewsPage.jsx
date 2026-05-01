import React, { useState, useEffect } from "react";
import { 
  Star, 
  MessageSquare, 
  User, 
  Search, 
  Filter, 
  Loader2, 
  RefreshCw,
  Trash2,
  AlertTriangle,
  ChevronLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ReviewCard from "../components/ReviewCard";
import ThemeToggle from "../components/ui/ThemeToggle";

const AdminReviewsPage = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchAllReviews = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // Assuming a general /admin/reviews endpoint or fetch all and filter
      const res = await api.get("/reviews/all"); // We might need to ensure this endpoint exists in backend
      if (res.data.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      console.error("Failed to fetch all reviews", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllReviews();
  }, []);

  const handleHideReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to hide this review from public view?")) return;
    try {
      await api.patch(`/reviews/${reviewId}/hide`);
      fetchAllReviews(true);
    } catch (err) {
      alert("Failed to hide review");
    }
  };

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = 
      r.reviewer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.target?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.comment?.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "critical") return matchesSearch && r.rating <= 2;
    if (filter === "positive") return matchesSearch && r.rating >= 4;
    return matchesSearch;
  });

  return (
    <div className="mesh-bg min-h-screen font-sans text-(--text-main)">
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-(--card-border) text-(--text-dim) hover:bg-(--card-bg)">
               <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">Global Reviews</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => fetchAllReviews(true)} disabled={refreshing} className="p-2 text-(--text-dim) hover:text-primary transition-all">
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
           <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim)" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, comment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all"
              />
           </div>
           <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
              {["all", "positive", "critical"].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-primary text-black" : "text-(--text-dim) hover:bg-white/5"}`}
                >
                  {f}
                </button>
              ))}
           </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">Scanning global feedback...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredReviews.length === 0 ? (
              <div className="py-20 text-center glass-card rounded-[2.5rem] border border-(--card-border)">
                <Star size={48} className="mx-auto text-(--text-dim) opacity-10 mb-4" />
                <p className="text-sm text-(--text-dim)">No reviews found.</p>
              </div>
            ) : (
              filteredReviews.map(review => (
                <div key={review._id} className="relative group">
                  <ReviewCard review={review} revealed={true} />
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleHideReview(review._id)}
                      className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-2 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-xl"
                      title="Hide Review"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 px-6 flex items-center justify-between">
                     <div className="flex items-center gap-2 text-[10px] font-black text-(--text-dim) uppercase tracking-tighter">
                        <User size={12} /> Target: <span className="text-(--text-main)">{review.target?.name || "User"}</span>
                     </div>
                     {review.isHidden && (
                       <span className="text-[9px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Hidden</span>
                     )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminReviewsPage;
