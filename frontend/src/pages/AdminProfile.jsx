import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Mail,
  Shield,
  Activity,
  ArrowLeft,
  Settings,
  Lock,
  Globe,
  Bell,
  Cpu,
  Database,
  Terminal,
  Camera,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ui/ThemeToggle";
import api from "../services/api";

const AdminProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState("");
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [systemHealth, setSystemHealth] = useState({ status: "Loading...", uptime: 0 });

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, healthRes] = await Promise.all([
          api.get("/admin/dashboard-stats"),
          api.get("/admin/system-health")
        ]);

        if (statsRes.data.success && statsRes.data.stats) {
          setTotalUsers(statsRes.data.stats.counts.total);
        }
        if (healthRes.data.success && healthRes.data.system) {
          setSystemHealth(healthRes.data.system);
        }
      } catch (err) {
        console.error("Failed to fetch admin statistics", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      setProfileImage(user.profileImage || "");
      setPreview(user.profileImage || "");
      fetchAdminData();
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        setProfileImage(reader.result);
        // In a real app, call API here or add a Save button
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) return null;

  const adminStats = [
    { label: "Identity", value: "Super Admin", icon: Shield, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Managed", value: `${totalUsers.toLocaleString()} Users`, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Node Status", value: systemHealth.status || "Operational", icon: Cpu, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="mesh-bg min-h-screen font-sans text-(--text-main)">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/admin/dashboard")}
              className="rounded-xl border border-(--card-border) p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">Admin Identity</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        
        {/* Profile Card */}
        <section className="glass-card relative overflow-hidden rounded-4xl p-10 border-(--card-border)">
          <div className="bg-violet-500/5 absolute -right-20 -top-20 h-80 w-80 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row items-center gap-10">
            <div className="relative group">
              <div className="from-violet-500 to-violet-700 h-32 w-32 rounded-3xl bg-linear-to-br flex items-center justify-center text-4xl font-black text-white shadow-2xl relative z-10 overflow-hidden transition-transform group-hover:scale-105">
                {preview ? (
                  <img src={preview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 z-20 cursor-pointer bg-(--bg-main) border border-(--card-border) p-3 rounded-2xl text-primary shadow-xl hover:scale-110 transition-all hover:bg-primary hover:text-black">
                <Camera size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
              <div className="absolute -inset-1 bg-violet-500/20 blur-lg rounded-3xl" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                <h2 className="text-3xl font-black text-(--text-main)">{user?.name}</h2>
                <span className="bg-violet-500/20 text-violet-400 border border-violet-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Master Root
                </span>
              </div>
              <p className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold text-(--text-dim)">
                <Mail size={14} /> {user?.email}
              </p>
              <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-8">
                {adminStats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`p-2.5 ${stat.bg} ${stat.color} rounded-xl`}>
                      <stat.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-(--text-dim) uppercase tracking-widest">{stat.label}</p>
                      <p className="text-sm font-black text-(--text-main)">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
               <button className="bg-primary text-black px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all">
                 System Audit
               </button>
               <button onClick={() => navigate("/admin/dashboard/settings")} className="bg-black/10 dark:bg-white/5 border border-(--card-border) text-(--text-main) px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black/20 transition-all">
                 Settings
               </button>
            </div>
          </div>
        </section>

        {/* Security & Access */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card md:col-span-2 rounded-3xl p-8 border-(--card-border) space-y-6">
            <h3 className="font-display text-lg font-black text-(--text-main) flex items-center gap-2">
              <Lock size={20} className="text-primary" /> Security Protocol
            </h3>
            
            <div className="divide-y divide-(--card-border)">
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-black text-(--text-main)">Two-Factor Authentication</p>
                  <p className="text-xs text-(--text-dim) mt-1">High-security layer enabled</p>
                </div>
                <div className="h-6 w-11 bg-primary rounded-full relative">
                  <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-black text-(--text-main)">SSH Key Provisioning</p>
                  <p className="text-xs text-(--text-dim) mt-1">Managed via internal cluster</p>
                </div>
                <button className="text-[10px] font-black uppercase text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all">Manage</button>
              </div>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-black text-(--text-main)">Active Sessions</p>
                  <p className="text-xs text-(--text-dim) mt-1">Currently active on 2 devices</p>
                </div>
                <button className="text-[10px] font-black uppercase text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all">Revoke All</button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 border-(--card-border) group hover:border-violet-500/30 transition-all cursor-pointer">
              <div className="bg-violet-500/10 text-violet-400 p-2.5 rounded-xl w-fit mb-4">
                <Database size={20} />
              </div>
              <h4 className="font-black text-sm">Cluster Management</h4>
              <p className="text-[10px] text-(--text-dim) font-bold mt-1 uppercase tracking-widest">Status: Operational</p>
            </div>
            <div className="glass-card rounded-3xl p-6 border-(--card-border) group hover:border-primary/30 transition-all cursor-pointer">
              <div className="bg-primary/10 text-primary p-2.5 rounded-xl w-fit mb-4">
                <Terminal size={20} />
              </div>
              <h4 className="font-black text-sm">API Console</h4>
              <p className="text-[10px] text-(--text-dim) font-bold mt-1 uppercase tracking-widest">Endpoint: v2.0-stable</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AdminProfile;
