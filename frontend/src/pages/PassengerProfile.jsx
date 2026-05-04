import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Mail,
  Phone,
  ArrowLeft,
  Edit2,
  Save,
  X,
  CreditCard,
  MapPin,
  Star,
  Activity,
  ShieldCheck,
  Camera,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import ThemeToggle from "../components/ui/ThemeToggle";
import api from "../services/api";
import EmergencyContactsManager from "../components/passenger/EmergencyContactsManager";

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");
  const normalizedPath = url.replace(/\\/g, "/");
  const path = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  return `${baseUrl}${path}`;
};

const PassengerProfile = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    profileImage: "",
  });
  const [profileImagePreview, setProfileImagePreview] = useState("");

  const [stats, setStats] = useState({ totalRides: 0, avgRating: "0.0" });
  const [savedPlacesCount, setSavedPlacesCount] = useState(0);
  const [paymentMethodsCount, setPaymentMethodsCount] = useState(0); // For now, keep 0 as not implemented
  
  useEffect(() => {
    const fetchData = async () => {
      if (user?.role === "passenger") {
        // Fetch History for trip count and rating
        try {
          const historyRes = await api.get("/rides/passenger-history");
          if (historyRes.data.success) {
            const history = historyRes.data.data.rides || [];
            const serverStats = historyRes.data.data.stats || {};
            
            const avgRating = history.length > 0 
              ? history.reduce((acc, curr) => acc + (curr.rating || 5), 0) / history.length
              : (user.passengerStats?.averageRating || 5.0);
            
            setStats({
              totalRides: serverStats.totalRides || user.passengerStats?.totalTrips || history.length,
              avgRating: typeof avgRating === 'number' ? avgRating.toFixed(1) : parseFloat(avgRating).toFixed(1)
            });
          }
        } catch (err) {
          console.error("Failed to fetch history", err);
          // Fallback to metadata
          setStats({
            totalRides: user.passengerStats?.totalTrips || 0,
            avgRating: user.passengerStats?.averageRating?.toFixed(1) || "5.0"
          });
        }

        // Fetch Saved Places
        try {
          const placesRes = await api.get("/saved-places");
          if (placesRes.data.success) {
            setSavedPlacesCount(placesRes.data.data.length);
          }
        } catch (err) {
          console.error("Failed to fetch saved places", err);
        }
      }
      setLoading(false);
    };

    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.Mobile_no || "Not provided",
        profileImage: user.profileImage || "",
      });
      if (user.profileImage) {
        setProfileImagePreview(getImageUrl(user.profileImage));
      }
      fetchData();
    }
  }, [user]);

  const handleInputChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
        setFormData({ ...formData, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };


  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    
    try {
      let updatedUser = { ...user };

      // 1. Update mobile if changed
      if (formData.phone !== user.Mobile_no) {
        const mobileRes = await api.post("/users/update-mobile", { mobileNumber: formData.phone });
        if (mobileRes.data.success) {
          updatedUser = mobileRes.data.user;
        }
      }

      // 2. Update profile image if changed (if it's a data URL)
      if (formData.profileImage && formData.profileImage !== user.profileImage && formData.profileImage.startsWith("data:")) {
        const imageRes = await api.post("/users/update-profile-image", { imageUrl: formData.profileImage });
        if (imageRes.data.success) {
          updatedUser = imageRes.data.user;
        }
      }
      
      // Sync with Context
      setUser(updatedUser);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

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
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">My Profile</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar / Photo */}
          <section className="w-full md:w-1/3 space-y-6">
            <div className="glass-card overflow-hidden rounded-3xl p-8 text-center border-(--card-border)">
              <div className="relative mx-auto mb-6 h-32 w-32 group">
                <div className="from-primary to-primary-dark flex h-full w-full items-center justify-center overflow-hidden rounded-3xl bg-linear-to-br text-4xl font-black text-black shadow-2xl transition-all group-hover:scale-105">
                  {profileImagePreview ? (
                    <img src={getImageUrl(profileImagePreview)} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(formData.name)
                  )}
                </div>
                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 cursor-pointer bg-(--bg-main) border border-(--card-border) p-3 rounded-2xl text-primary shadow-xl hover:scale-110 transition-all hover:bg-primary hover:text-black z-10">
                    <Camera size={20} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                )}
              </div>
              <h2 className="text-xl font-black text-(--text-main)">{formData.name}</h2>
              <p className="text-xs font-bold text-(--text-dim) uppercase tracking-widest mt-1">Passenger</p>
              
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-(--card-border) bg-black/5 p-3 dark:bg-black/20">
                  <p className="text-[10px] font-black text-(--text-dim) uppercase">Trips</p>
                  <p className="text-lg font-black">{stats.totalRides}</p>
                </div>
                <div className="rounded-2xl border border-(--card-border) bg-black/5 p-3 dark:bg-black/20">
                  <p className="text-[10px] font-black text-(--text-dim) uppercase">Rating</p>
                  <p className="text-lg font-black">{stats.avgRating}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 border-(--card-border)">
              <h3 className="text-sm font-black text-(--text-main) mb-4">Account Verified</h3>
              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-3 rounded-2xl border ${user?.isVerified ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}>
                  <ShieldCheck size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {user?.isVerified ? "Email Verified" : "Email Unverified"}
                  </span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-2xl border ${user?.Mobile_no ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}>
                  <ShieldCheck size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {user?.Mobile_no ? "Phone Linked" : "Phone Missing"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Main Info */}
          <section className="flex-1 space-y-6">
            <div className="glass-card rounded-3xl p-8 border-(--card-border)">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-display text-lg font-black text-(--text-main)">Personal Details</h3>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline">
                    <Edit2 size={14} /> Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-4">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-widest hover:underline">
                      <Save size={14} /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-xs font-black text-rose-400 uppercase tracking-widest hover:underline">
                      <X size={14} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-(--text-dim) uppercase tracking-[0.2em] ml-1">Full Name</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim) group-focus-within:text-primary transition-colors">
                        <UserIcon size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={formData.name} 
                        readOnly={true}
                        className="w-full rounded-2xl border border-(--card-border) bg-black/5 dark:bg-black/20 py-4 pl-12 pr-4 text-sm font-semibold text-(--text-dim) outline-none cursor-not-allowed opacity-60"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-(--text-dim) uppercase tracking-[0.2em] ml-1">Email Address</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim)">
                        <Mail size={18} />
                      </div>
                      <input 
                        type="email" 
                        value={formData.email} 
                        readOnly={true}
                        className="w-full rounded-2xl border border-(--card-border) bg-black/5 dark:bg-black/20 py-4 pl-12 pr-4 text-sm font-semibold text-(--text-dim) outline-none cursor-not-allowed opacity-60"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-(--text-dim) uppercase tracking-[0.2em] ml-1">Phone Number</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-dim) group-focus-within:text-primary transition-colors">
                        <Phone size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={formData.phone} 
                        readOnly={!isEditing}
                        onChange={(e) => handleInputChange(e, "phone")}
                        className={`w-full rounded-2xl border border-(--card-border) bg-black/5 dark:bg-black/20 py-4 pl-12 pr-4 text-sm font-semibold outline-none transition-all ${isEditing ? 'focus:border-primary focus:bg-transparent' : 'cursor-default'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-3xl p-6 border-(--card-border) group cursor-pointer hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-violet-500/10 text-violet-400 rounded-2xl group-hover:bg-violet-500 group-hover:text-black transition-all">
                    <CreditCard size={20} />
                  </div>
                </div>
                <h4 className="font-black text-(--text-main)">Payment Methods</h4>
                <p className="text-[10px] text-(--text-dim) font-bold mt-1 uppercase tracking-widest">
                  Wallet: ₹{user?.walletBalance || 0}
                </p>
              </div>
              <div className="glass-card rounded-3xl p-6 border-(--card-border) group cursor-pointer hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:bg-emerald-500 group-hover:text-black transition-all">
                    <MapPin size={20} />
                  </div>
                </div>
                <h4 className="font-black text-(--text-main)">Saved Places</h4>
                <p className="text-[10px] text-(--text-dim) font-bold mt-1 uppercase tracking-widest">
                  {savedPlacesCount === 0 ? "No places saved" : `${savedPlacesCount} saved ${savedPlacesCount === 1 ? 'place' : 'places'}`}
                </p>
              </div>
            </div>

            {/* ── Safety Settings ── */}
            <div className="glass-card rounded-3xl p-6 border-(--card-border)">
              <EmergencyContactsManager />
            </div>

          </section>

        </div>
      </main>
    </div>
  );
};

export default PassengerProfile;
