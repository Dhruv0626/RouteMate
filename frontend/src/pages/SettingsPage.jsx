import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import {
  ArrowLeft,
  Bell,
  Moon,
  Sun,
  Shield,
  Smartphone,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Trash2,
  Check
} from "lucide-react";
import Button from "../components/ui/Button";
import ThemeToggle from "../components/ui/ThemeToggle";
import api from "../services/api";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showConfirm, showAlert } = useDialog();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Local state for toggles
  const defaultSettings = JSON.parse(localStorage.getItem("appSettings") || '{"pushNotifs":false,"emailNotifs":false,"locationTracking":false}');
  
  const [pushNotifs, setPushNotifs] = useState(defaultSettings.pushNotifs);
  const [emailNotifs, setEmailNotifs] = useState(defaultSettings.emailNotifs);
  const [locationTracking, setLocationTracking] = useState(defaultSettings.locationTracking);

  const updateSetting = (key, value, setter) => {
    setter(value);
    const newSettings = { pushNotifs, emailNotifs, locationTracking, [key]: value, hasConfigured: true };
    localStorage.setItem("appSettings", JSON.stringify(newSettings));
  };

  // Helper toggle component
  const Toggle = ({ label, description, enabled, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
      <div className="mr-4">
        <p className="font-bold text-sm text-(--text-main)">{label}</p>
        {description && <p className="text-[10px] text-(--text-dim) mt-0.5">{description}</p>}
      </div>
      <button 
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="mesh-bg flex min-h-screen justify-center p-4 transition-colors duration-500">
      <div className="glass-card flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border-(--card-border) shadow-2xl">
        
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-(--card-border) bg-(--bg-main)/80 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/${user?.role}/dashboard`)}
              className="group rounded-xl border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main)"
            >
              <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-black text-(--text-main)">Settings</h1>
              <p className="text-xs font-semibold text-(--text-dim)">Preferences & Configurations</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-24">
          
          {/* Appearance Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase ml-2 flex items-center gap-2">
              <Sun size={14} /> Appearance
            </h2>
            <div className="glass-card rounded-3xl border-(--card-border) p-2">
              <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl">
                <div>
                  <p className="font-bold text-sm text-(--text-main)">Dark Mode</p>
                  <p className="text-[10px] text-(--text-dim) mt-0.5">Toggle app visual theme</p>
                </div>
                <div className="pointer-events-auto">
                    <ThemeToggle />
                </div>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase ml-2 flex items-center gap-2">
              <Bell size={14} /> Notifications
            </h2>
            <div className="glass-card rounded-3xl border-(--card-border) p-2 space-y-2">
              <Toggle 
                label="Push Notifications" 
                description="Receive updates on rides and promotions"
                enabled={pushNotifs} 
                onChange={(val) => updateSetting("pushNotifs", val, setPushNotifs)} 
              />
              <Toggle 
                label="Email Alerts" 
                description="Crucial trip alerts and OTP verification"
                enabled={emailNotifs} 
                onChange={(val) => updateSetting("emailNotifs", val, setEmailNotifs)} 
              />
            </div>
          </section>

          {/* Privacy & App Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase ml-2 flex items-center gap-2">
              <Shield size={14} /> Privacy & Settings
            </h2>
            <div className="glass-card rounded-3xl border-(--card-border) p-2 space-y-2">
              <Toggle 
                label="Location Services" 
                description="Allow RouteMate to access your live location"
                enabled={locationTracking} 
                onChange={(val) => updateSetting("locationTracking", val, setLocationTracking)} 
              />
              
              <button className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-(--text-dim)" />
                  <div>
                    <p className="font-bold text-sm text-(--text-main)">Language</p>
                    <p className="text-[10px] text-(--text-dim) mt-0.5">English (US)</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-(--text-dim)" />
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <HelpCircle size={18} className="text-(--text-dim)" />
                  <div>
                    <p className="font-bold text-sm text-(--text-main)">Help & Support</p>
                    <p className="text-[10px] text-(--text-dim) mt-0.5">Contact us, FAQ, and resources</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-(--text-dim)" />
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="space-y-4 pt-4 border-t border-red-500/20">
            <div className="glass-card border-red-500/20 bg-red-500/5 rounded-3xl p-2 space-y-2">
              <button 
                onClick={async () => {
                  await logout();
                  navigate('/signin');
                }}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-red-500/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3 text-red-500">
                  <LogOut size={18} />
                  <p className="font-bold text-sm">Sign Out</p>
                </div>
              </button>
              
              <button 
                onClick={async () => {
                   const confirmed = await showConfirm(
                      "Are you absolutely sure you want to permanently delete your RouteMate account?\nThis action cannot be undone.",
                      "Delete Account",
                      "error",
                      "Yes, Delete My Account"
                   );
                   if (confirmed) {
                      setIsDeleting(true);
                      try {
                        await api.delete("/users/delete-account");
                        await logout();
                        navigate("/signin");
                      } catch (err) {
                        showAlert("Account deletion failed. Please try again later.", "Error", "error");
                      } finally {
                        setIsDeleting(false);
                      }
                   }
                }}
                disabled={isDeleting}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-red-500/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3 text-red-500">
                  <Trash2 size={18} />
                  <p className="font-bold text-sm">{isDeleting ? "Deleting..." : "Delete Account"}</p>
                </div>
              </button>
            </div>
          </section>
          
          <div className="pt-8 text-center">
            <p className="text-[10px] font-bold tracking-widest text-(--text-dim) uppercase">RouteMate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
