import React, { useState, useEffect } from "react";
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
  Navigation,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Map as MapIcon,
  MousePointer2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ThemeToggle from "../components/ui/ThemeToggle";
import LocationSearch from "../components/map/LocationSearch";
import api from "../services/api";
import { reverseGeocode } from "../utils/geocode";
import { makeSimplePin } from "../utils/mapIcons";
import Loader from "../components/ui/Loader";

const redPinIcon = makeSimplePin("#ef4444");

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const CATEGORIES = [
  { id: "home", label: "Home", icon: Home, bg: "bg-blue-500/10", color: "text-blue-500" },
  { id: "work", label: "Work", icon: Briefcase, bg: "bg-amber-500/10", color: "text-amber-500" },
  { id: "favorite", label: "Favorite", icon: Heart, bg: "bg-rose-500/10", color: "text-rose-500" },
  { id: "other", label: "Other", icon: MapPin, bg: "bg-slate-500/10", color: "text-slate-500" },
];

const AHMEDABAD_CENTER = [23.0225, 72.5714];

// Helper to handle map clicks
const MapClickHandler = ({ onLocationPick }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      onLocationPick(lat, lng);
    },
  });
  return null;
};

// Component to handle map center updates
const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15);
  }, [center, map]);
  return null;
};

const SavedPlacesPage = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const [newPlace, setNewPlace] = useState({
    title: "",
    address: "",
    coordinates: null, // [lng, lat]
    type: "favorite"
  });

  const [mapCenter, setMapCenter] = useState(AHMEDABAD_CENTER);

  // Fetch saved places
  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      const response = await api.get("/saved-places");
      if (response.data.success) {
        setPlaces(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch saved places", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapLocationPick = async (lat, lng) => {
    setIsReverseGeocoding(true);
    setNewPlace(prev => ({ ...prev, coordinates: [lng, lat] }));
    setMapCenter([lat, lng]);
    
    try {
      const result = await reverseGeocode(lat, lng);
      const addressName = result?.name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setNewPlace(prev => ({ ...prev, address: addressName }));
    } catch (err) {
      console.error("Reverse geocoding failed", err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleAddPlace = async (e) => {
    e.preventDefault();
    if (!newPlace.title || !newPlace.address || !newPlace.coordinates) {
      setError("Please provide a name and select a location from the search or map.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/saved-places", newPlace);
      if (response.data.success) {
        setSuccess("Place saved successfully!");
        setPlaces([response.data.data, ...places]);
        setShowAddForm(false);
        setNewPlace({ title: "", address: "", coordinates: null, type: "favorite" });
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save place.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/saved-places/${id}`);
      if (response.data.success) {
        setPlaces(places.filter(p => p._id !== id));
      }
    } catch (err) {
      console.error("Failed to delete place", err);
    }
  };

  const getCategoryIcon = (type) => {
    const cat = CATEGORIES.find(c => c.id === type) || CATEGORIES[3];
    return cat;
  };

   if (loading) return <Loader fullPage text="Retrieving your Saved Places..." />;
  
  return (
    <div className="mesh-bg min-h-screen font-sans text-(--text-main)">
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
        
        {/* Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 text-emerald-500 text-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle size={18} /> {success}
          </div>
        )}

        {/* Add Section */}
        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full bg-primary text-black flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.01] transition-all shadow-lg shadow-primary/10 active:scale-95"
          >
            <Plus size={18} /> Add New Routine Place
          </button>
        ) : (
          <section className="glass-card rounded-3xl p-6 border border-primary/30 bg-primary/5 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-xl text-primary">
                  <MapIcon size={20} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest">New Favorite Place</h2>
              </div>
              <button 
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Form Info */}
              <form onSubmit={handleAddPlace} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest ml-1">Place Name</label>
                  <input 
                    type="text"
                    placeholder="e.g., Dad's House, Gym, College"
                    value={newPlace.title}
                    onChange={e => setNewPlace({...newPlace, title: e.target.value})}
                    className="w-full bg-(--bg-main) border border-(--card-border) rounded-2xl py-4 px-4 outline-none focus:border-primary text-sm font-semibold transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <LocationSearch 
                    label="Search Address"
                    placeholder="Find the location..."
                    value={newPlace.address}
                    onSelect={(loc) => {
                      setNewPlace({...newPlace, address: loc.name, coordinates: [loc.lng, loc.lat]});
                      setMapCenter([loc.lat, loc.lng]);
                    }}
                  />
                  {isReverseGeocoding && (
                    <div className="flex items-center gap-2 text-[10px] text-primary font-bold animate-pulse mt-1 ml-1">
                      <Loader2 size={10} className="animate-spin" /> Fetching precise address...
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest ml-1">Category</label>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewPlace({...newPlace, type: cat.id})}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                          newPlace.type === cat.id 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-(--card-border) bg-black/5 dark:bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <cat.icon size={18} />
                        <span className="text-xs font-bold">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submitting || isReverseGeocoding}
                    className="w-full bg-primary text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : "Save Place"}
                  </button>
                </div>
              </form>

              {/* Right Column: Map Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest ml-1 flex items-center gap-2">
                    <MousePointer2 size={12} /> Pin on Map
                  </label>
                  <span className="text-[10px] font-medium text-(--text-dim) italic">Click map to set precise pin</span>
                </div>
                <div className="h-[350px] w-full rounded-3xl overflow-hidden border border-(--card-border) shadow-inner relative">
                  <MapContainer
                    center={mapCenter}
                    zoom={15}
                    className="h-full w-full z-0"
                    zoomControl={false}
                  >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <MapClickHandler onLocationPick={handleMapLocationPick} />
                    <ChangeView center={mapCenter} />
                    {newPlace.coordinates && (
                      <Marker 
                        position={[newPlace.coordinates[1], newPlace.coordinates[0]]} 
                        icon={redPinIcon}
                      />
                    )}
                  </MapContainer>
                  <div className="absolute bottom-4 right-4 z-10">
                    <button 
                      onClick={() => {
                        window.navigator.geolocation.getCurrentPosition((pos) => {
                          handleMapLocationPick(pos.coords.latitude, pos.coords.longitude);
                        });
                      }}
                      className="bg-(--bg-main) p-3 rounded-2xl border border-(--card-border) text-primary shadow-xl hover:scale-110 active:scale-95 transition-all"
                    >
                      <Navigation size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Places List */}
        <section className="space-y-4">
          {loading ? (
             <div className="py-20 flex justify-center">
               <Loader2 className="animate-spin text-primary" size={32} />
             </div>
          ) : places.length > 0 ? (
            places.map((place) => {
              const cat = getCategoryIcon(place.type);
              const Icon = cat.icon;
              return (
                <div 
                  key={place._id} 
                  className="glass-card group flex items-center justify-between rounded-3xl border border-(--card-border) p-5 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${cat.bg} ${cat.color}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-(--text-main) text-base">{place.title}</h3>
                      <p className="text-xs text-(--text-dim) mt-0.5 truncate pr-4">{place.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate('/passenger/dashboard/ride', { state: { destination: place.address, location: place.location } })}
                      className="p-2.5 rounded-xl bg-primary text-black hover:scale-110 transition-all shadow-md shadow-primary/20"
                      title="Book a ride here"
                    >
                      <Navigation size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(place._id)}
                      className="p-2.5 rounded-xl bg-rose-500 text-white hover:scale-110 transition-all shadow-md shadow-rose-500/20"
                      title="Delete place"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass-card rounded-3xl p-16 text-center border-(--card-border)">
               <div className="mx-auto w-16 h-16 rounded-3xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-(--text-dim) mb-6">
                 <MapPin size={32} />
               </div>
               <p className="text-lg font-bold">No routine places saved</p>
               <p className="text-sm text-(--text-dim) mt-2 max-w-xs mx-auto">Add your college, gym, or family home for quicker ride setup.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SavedPlacesPage;
