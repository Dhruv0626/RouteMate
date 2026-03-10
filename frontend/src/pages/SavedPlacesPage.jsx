import React, { useState } from "react";
import { 
  MapPin, 
  Home, 
  Briefcase, 
  Heart, 
  Plus, 
  Search, 
  ChevronLeft, 
  Trash2, 
  Edit2, 
  ArrowRight,
  Navigation
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";

const INITIAL_PLACES = [
  { id: 1, title: "Home", address: "Sector 24, Gandhinagar, Gujarat", type: "home", icon: Home, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { id: 2, title: "Office", address: "Prahlad Nagar, Ahmedabad, Gujarat", type: "work", icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: 3, title: "Gym (Gold's)", address: "Satellite, Ahmedabad", type: "favorite", icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10" },
];

const SavedPlacesPage = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState(INITIAL_PLACES);
  const [search, setSearch] = useState("");

  const handleDelete = (id) => {
    setPlaces(places.filter(p => p.id !== id));
  };

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
            <h1 className="font-display text-lg font-black text-(--text-main)">Saved Places</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        
        {/* Search & Add Section */}
        <section className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim) group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search for a new place..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/20 border border-(--card-border) rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 text-sm font-semibold transition-all"
            />
          </div>
          <button className="bg-primary text-black flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/10">
            <Plus size={18} /> Add New
          </button>
        </section>

        {/* Places List */}
        <section className="space-y-4">
          {places.map((place) => (
            <div 
              key={place.id} 
              className="glass-card group flex items-center justify-between rounded-3xl border border-(--card-border) p-5 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${place.bg} ${place.color}`}>
                  <place.icon size={24} />
                </div>
                <div>
                  <h3 className="font-black text-(--text-main) text-base">{place.title}</h3>
                  <p className="text-xs text-(--text-dim) mt-0.5 max-w-[200px] sm:max-w-md truncate">{place.address}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => navigate('/passenger/dashboard/ride', { state: { destination: place.address } })}
                  className="p-2.5 rounded-xl border border-(--card-border) bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all"
                  title="Ride here"
                >
                  <Navigation size={18} />
                </button>
                <button className="p-2.5 rounded-xl border border-(--card-border) text-(--text-dim) hover:text-primary transition-all">
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(place.id)}
                  className="p-2.5 rounded-xl border border-(--card-border) text-(--text-dim) hover:text-rose-400 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {places.length === 0 && (
            <div className="glass-card rounded-3xl p-16 text-center">
               <div className="mx-auto w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-(--text-dim) mb-4">
                 <MapPin size={32} />
               </div>
               <p className="text-lg font-bold">No saved places yet</p>
               <p className="text-sm text-(--text-dim) mt-1">Add your favorite spots for quicker booking.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SavedPlacesPage;
