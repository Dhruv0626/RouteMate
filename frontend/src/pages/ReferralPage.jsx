import React, { useState, useEffect } from "react";
import { 
  Users, 
  ChevronLeft, 
  Copy, 
  Share2, 
  Gift, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  UserPlus,
  Loader2,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";
import api from "../services/api";

const ReferralPage = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    referralCode: "",
    joinedCount: 0,
    totalEarned: 0,
    recentReferrals: []
  });
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setError(false);
        const res = await api.get("/users/referral-stats");
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch referral stats:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchReferralData();
  }, []);

  const handleCopy = () => {
    if (!stats.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const shareText = `Hey! Join RouteMate and use my referral code ${stats.referralCode} to get a bonus on your first ride! Download here: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: 'RouteMate Referral',
        text: shareText,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="mesh-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-(--text-dim) font-black uppercase tracking-widest text-[10px]">Synchronizing Rewards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mesh-bg min-h-screen flex items-center justify-center p-6 text-center">
        <div className="glass-card p-10 max-w-sm rounded-3xl border-(--card-border)">
          <div className="bg-red-500/10 p-4 rounded-full w-fit mx-auto mb-6">
            <TrendingUp size={48} className="text-red-500" />
          </div>
          <h2 className="text-xl font-black mb-2 text-(--text-main)">Data Connection Error</h2>
          <p className="text-sm text-(--text-dim) mb-6">We couldn't fetch your referral information. This might be a temporary issue.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-black py-3 rounded-xl font-black hover:scale-105 transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
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
            <h1 className="font-display text-lg font-black text-(--text-main)">Referral Program</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        
        {/* Referral Hero */}
        <section className="glass-card relative overflow-hidden rounded-[2.5rem] border border-(--card-border) p-10 text-center shadow-2xl">
           <div className="bg-primary/20 absolute -left-20 -top-20 h-64 w-64 rounded-full blur-3xl" />
           
           <div className="relative z-10 flex flex-col items-center">
              <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center text-black shadow-xl mb-6 shadow-primary/20 scale-110">
                 <Gift size={40} />
              </div>
              <h2 className="text-3xl font-black text-(--text-main) max-w-md mx-auto leading-tight">
                 Earn <span className="text-primary italic">Rewards!</span>
              </h2>
              <p className="mt-4 text-sm font-medium text-(--text-dim) max-w-sm mx-auto leading-relaxed">
                 Invite your friends to RouteMate and earn wallet credits when they complete their first ride.
              </p>

              {/* Referral Code Box */}
              <div className="mt-10 w-full max-w-sm">
                 <div className="flex items-center gap-2 p-2 rounded-2xl border border-(--card-border) bg-black/5 dark:bg-white/5">
                    <div className="flex-1 font-mono text-2xl font-black tracking-widest text-(--text-main) py-2 ml-4">
                       {stats.referralCode || "CODE_PENDING"}
                    </div>
                    <button 
                      onClick={handleCopy}
                      className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-primary text-black'}`}
                    >
                       {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    </button>
                 </div>
                 <button 
                  onClick={handleShare}
                  className="mt-4 w-full bg-white/5 border border-white/10 hover:bg-white/10 text-(--text-main) font-black py-4 rounded-2xl flex justify-center items-center gap-2 transition-all"
                 >
                   <Share2 size={18} /> Share Invite Link
                 </button>
              </div>
           </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <div className="glass-card rounded-[2rem] p-6 border border-(--card-border) text-center">
              <div className="bg-primary/10 text-primary mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4"><Users size={24} /></div>
              <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest mb-1">Total Invites</p>
              <h4 className="text-2xl font-black">{stats.joinedCount} Friends</h4>
           </div>
           <div className="glass-card rounded-[2rem] p-6 border border-(--card-border) text-center">
              <div className="bg-emerald-500/10 text-emerald-400 mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4"><TrendingUp size={24} /></div>
              <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest mb-1">Successful</p>
              <h4 className="text-2xl font-black">{stats.joinedCount} Joined</h4>
           </div>
           <div className="glass-card rounded-[2rem] p-6 border border-(--card-border) text-center">
              <div className="bg-violet-500/10 text-violet-400 mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4"><Gift size={24} /></div>
              <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest mb-1">Total Earned</p>
              <h4 className="text-2xl font-black text-violet-400">₹{stats.totalEarned}</h4>
           </div>
        </section>

        {/* Recent Referrals */}
        {stats.recentReferrals.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black text-(--text-main)">Recent Friends</h3>
              <span className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">Last 5</span>
            </div>
            <div className="space-y-3">
              {stats.recentReferrals.map((referral, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 border border-(--card-border) flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <UserPlus size={18} />
                    </div>
                    <div>
                      <p className="font-black text-sm">{referral.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-(--text-dim) font-bold">
                        <Calendar size={10} /> {referral.date}
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    Joined
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ReferralPage;
