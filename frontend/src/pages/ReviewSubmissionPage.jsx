import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Star, ChevronLeft, User, MapPin, IndianRupee, Loader2, Send, CheckCircle2 } from "lucide-react";
// import confetti from "canvas-confetti";
import api from "../services/api";
import TagChipSelector from "../components/TagChipSelector";

const DRIVER_TAGS = ["On Time", "Clean Car", "Good Behavior", "Safe Driving", "Quick OTP", "Good Route"];
const PASSENGER_TAGS = ["Clear Location", "Quick OTP", "Well Behaved", "Polite", "Ready on Time", "Fair Payment"];

const ReviewSubmissionPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const direction = searchParams.get("direction") || "to_driver";

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/published-rides/${tripId}`);
        if (res.data.success) {
          setTrip(res.data.data);
        }
      } catch (err) {
        setError("Failed to load trip details");
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  // Timer logic
  useEffect(() => {
    if (!trip?.completedAt) return;

    const timer = setInterval(() => {
      const completedAt = new Date(trip.completedAt).getTime();
      const now = Date.now();
      const diff = (completedAt + 48 * 60 * 60 * 1000) - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Review window closed");
        clearInterval(timer);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${h}h ${m}m left to review`);
    }, 1000);

    return () => clearInterval(timer);
  }, [trip?.completedAt]);

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else if (selectedTags.length < 3) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post("/reviews", {
        tripId,
        rating,
        comment,
        tags: selectedTags,
        direction
      });

      if (res.data.success) {
        /*
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FFB800", "#10b981", "#3b82f6"]
        });
        */
        setTimeout(() => navigate("/home"), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const getTimerColor = () => {
    if (isExpired) return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    const diff = (new Date(trip?.completedAt).getTime() + 48 * 60 * 60 * 1000) - Date.now();
    if (diff < 2 * 60 * 60 * 1000) return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    if (diff < 24 * 60 * 60 * 1000) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center mesh-bg">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
    </div>
  );

  return (
    <div className="mesh-bg min-h-screen font-sans text-(--text-main) pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-(--card-border) text-(--text-dim) hover:bg-(--card-bg)">
            <ChevronLeft size={20} />
          </button>
          <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getTimerColor()}`}>
            {timeLeft || "⏳ Calculating..."}
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        
        {/* Trip Summary Card */}
        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="glass-card rounded-[2.5rem] border border-(--card-border) p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-16 -top-16 h-40 w-40 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                  <User size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black">{direction === "to_driver" ? trip?.driver?.name : trip?.passenger?.name}</h2>
                  <p className="text-xs text-(--text-dim) font-bold uppercase tracking-widest mt-0.5">
                    {direction === "to_driver" ? "Your Driver" : "Your Passenger"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-(--text-dim)">
                  <MapPin size={16} className="text-emerald-500" />
                  <span className="line-clamp-1">{trip?.source?.address} → {trip?.destination?.address}</span>
                </div>
                <div className="flex items-center gap-2 text-lg font-black text-emerald-400">
                  <IndianRupee size={18} />
                  <span>{trip?.fare?.total || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center space-y-8 pt-4">
          <h1 className="text-3xl font-black tracking-tight">How was your trip?</h1>

          {/* Star Rating */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  disabled={isExpired || submitting}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-all duration-200 active:scale-75"
                >
                  <Star 
                    size={42} 
                    fill={(hoverRating || rating) >= star ? "#FFB800" : "none"} 
                    className={(hoverRating || rating) >= star ? "text-[#FFB800]" : "text-[#CCCCCC]"} 
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-lg font-black text-primary animate-in zoom-in duration-300">
                {rating} / 5
              </p>
            )}
          </div>

          {/* Tag Chips */}
          {rating > 0 && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
              <p className="text-xs font-black text-(--text-dim) uppercase tracking-[0.2em]">What went well?</p>
              <TagChipSelector 
                tags={direction === "to_driver" ? DRIVER_TAGS : PASSENGER_TAGS}
                selected={selectedTags}
                onSelect={handleTagToggle}
                maxSelect={3}
              />
            </div>
          )}

          {/* Comment Box */}
          {rating > 0 && (
            <div className="animate-in fade-in slide-in-from-top-6 duration-700 space-y-2">
              <div className="relative">
                <textarea
                  disabled={isExpired || submitting}
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 200))}
                  placeholder="Additional comments (optional)..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-primary/50 transition-all resize-none min-h-[100px]"
                />
                <span className="absolute bottom-3 right-4 text-[10px] font-black text-(--text-dim) opacity-40">
                  {comment.length} / 200
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6">
            {error && (
              <p className="text-rose-500 text-xs font-bold mb-4 animate-shake">{error}</p>
            )}
            <button
              disabled={rating === 0 || isExpired || submitting}
              onClick={handleSubmit}
              className={`
                w-full max-w-sm py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300
                ${rating === 0 || isExpired || submitting
                  ? "bg-white/10 text-white/20 cursor-not-allowed"
                  : "bg-primary text-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
                }
              `}
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  Submit Review
                </>
              )}
            </button>
          </div>

          {isExpired && (
            <div className="flex items-center justify-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-3 rounded-2xl border border-rose-500/20">
              <CheckCircle2 size={16} />
              <span className="text-xs font-black uppercase">Review window closed</span>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default ReviewSubmissionPage;
