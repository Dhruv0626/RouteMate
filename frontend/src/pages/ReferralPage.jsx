import React, { useState } from "react";
import { 
  Users, 
  ChevronLeft, 
  Copy, 
  Share2, 
  Gift, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  UserPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";

const ReferralPage = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const referralCode = "DHRUV-RT99";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const RECENT_REFERRALS = [
    { id: 1, name: "Aman Shah", status: "Joined", reward: "₹50", date: "2 days ago" },
    { id: 2, name: "Krina Patel", status: "Pending", reward: "-", date: "Today" },
  ];

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
                 Invite your friends to RouteMate and earn wallet credits.
              </p>

              {/* Referral Code Box */}
              <div className="mt-10 w-full max-w-sm">
                 <div className="flex items-center gap-2 p-2 rounded-2xl border border-(--card-border) bg-black/5 dark:bg-white/5">
                    <div className="flex-1 font-mono text-2xl font-black tracking-widest text-(--text-main) py-2 ml-4">
                       {referralCode}
                    </div>
                    <button 
                      onClick={handleCopy}
                      className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-primary text-black'}`}
                    >
                       {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    </button>
                 </div>
              </div>
           </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <div className="glass-card rounded-[2rem] p-6 border border-(--card-border) text-center">
              <div className="bg-primary/10 text-primary mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4"><Users size={24} /></div>
              <h4 className="text-xl font-black mt-1">12 Invites</h4>
           </div>
           <div className="glass-card rounded-[2rem] p-6 border border-(--card-border) text-center">
              <div className="bg-emerald-500/10 text-emerald-400 mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4"><TrendingUp size={24} /></div>
              <h4 className="text-xl font-black mt-1">8 Joined</h4>
           </div>
           <div className="glass-card rounded-[2rem] p-6 border border-(--card-border) text-center">
              <div className="bg-violet-500/10 text-violet-400 mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4"><TrendingUp size={24} /></div>
              <h4 className="text-xl font-black mt-1">₹400 Won</h4>
           </div>
        </section>
      </main>
    </div>
  );
};

export default ReferralPage;
