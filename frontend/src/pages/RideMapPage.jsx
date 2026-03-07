import React, { useState } from "react";
import { MapPin, Navigation, Car, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const RideMapPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");

  return (
    <div className="relative min-h-screen bg-(--bg-main) font-sans text-(--text-main) overflow-x-hidden transition-colors duration-500">
      
      {/* ── Background Map Image (Placeholder) ── */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-20"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=2000')" }}
      >
        <div className="absolute inset-0 bg-linear-to-b from-(--bg-main)/80 via-transparent to-(--bg-main) backdrop-blur-[2px]" />
      </div>

      {/* ── Floating Map Elements (Mock Vehicles) ── */}
      <div className="absolute top-[30%] left-[40%] z-0 flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-primary/20">
        <Car size={14} className="text-primary" />
      </div>
      <div className="absolute top-[45%] left-[60%] z-0 flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-emerald-500/20 delay-150">
        <Car size={16} className="text-emerald-500" />
      </div>
      <div className="absolute top-[60%] left-[25%] z-0 flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-primary/20 delay-300">
        <Car size={14} className="text-primary" />
      </div>

      {/* ── Header ── */}
      <header className="pointer-events-none absolute top-0 z-50 flex w-full items-center justify-between p-6">
         <div className="pointer-events-auto group cursor-pointer rounded-2xl border border-(--card-border) bg-(--card-bg) px-4 py-2 shadow-lg backdrop-blur-md transition-transform duration-300 hover:scale-105" onClick={() => navigate('/passenger/dashboard')}>
            <span className="font-display text-xl font-bold tracking-tighter">
              <span className="bg-linear-to-br from-(--text-main) to-(--text-dim) bg-clip-text text-transparent italic">
                Route
              </span>
              <span className="text-primary">Mate</span>
            </span>
         </div>
         <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-(--card-border) bg-(--card-bg) px-3 py-2 shadow-lg backdrop-blur-md">
            <ThemeToggle />
            <div 
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-primary/10 font-bold text-primary transition-all hover:bg-primary/20" 
              onClick={() => navigate('/passenger/dashboard')}
              title="Go to Dashboard"
            >
               <UserIcon size={16}/>
            </div>
         </div>
      </header>

      {/* ── Interactive Overlay ── */}
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-end px-4 pt-24 pb-6 sm:px-6 sm:pb-10">
        <div className="glass-card animate-in fade-in slide-in-from-bottom-10 flex max-h-[80vh] flex-col overflow-hidden rounded-3xl border-(--card-border) shadow-2xl backdrop-blur-xl duration-700 sm:rounded-4xl">
          <div className="overflow-y-auto p-6 sm:p-8">
            <h1 className="font-display mb-2 text-xl font-black text-(--text-main) sm:text-2xl">
              Where to, {user?.name?.split(' ')[0] || 'there'}?
            </h1>
            <p className="mb-6 text-xs font-medium text-(--text-dim) sm:text-sm">
               Enter your route to find available rides near you.
            </p>

            <div className="relative space-y-3 sm:space-y-4">
               {/* Decorative Connection Line */}
               <div className="absolute top-12 bottom-16 left-3.75 z-0 w-0.5 border-l-2 border-dashed border-(--card-border) opacity-50 sm:bottom-20" />

               <div className="relative z-10">
                 <Input
                    icon={Navigation}
                    placeholder="Pickup Location"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="relative z-10"
                 />
               </div>
               <div className="relative z-10">
                 <Input
                    icon={MapPin}
                    placeholder="Destination (e.g. Airport, Downtown)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="relative z-10"
                 />
               </div>

               <Button fullWidth className="mt-2 py-3.5 text-sm tracking-wide shadow-xl sm:mt-4 sm:py-4">
                  Find Available Rides
               </Button>
            </div>
          </div>
          <div className="border-t border-(--card-border) bg-(--card-bg)/30 p-4 sm:p-6">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-xs font-bold text-(--text-main)">Available Vehicles</p>
                   <p className="text-[10px] font-medium text-(--text-dim)">3 rides near your location</p>
                </div>
                <div className="flex gap-2">
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 transition-transform active:scale-95"><Car size={18} className="text-primary"/></div>
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 transition-transform active:scale-95"><Car size={18} className="text-emerald-500"/></div>
                </div>
             </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default RideMapPage;
