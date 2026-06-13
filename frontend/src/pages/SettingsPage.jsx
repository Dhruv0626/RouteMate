import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/ui/Loader";
import { useDialog } from "../context/DialogContext";
import { useLanguage } from "../context/LanguageContext";
import {
  ArrowLeft,
  Bell,
  Moon,
  Sun,
  Shield,
  Smartphone,
  Globe,

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
  const { currentLanguage, setLanguage, t } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Local state for toggles — all hooks must be declared before any conditional return
  const defaultSettings = JSON.parse(localStorage.getItem("appSettings") || '{"pushNotifs":false,"emailNotifs":false,"locationTracking":false}');
  const [pushNotifs, setPushNotifs] = useState(defaultSettings.pushNotifs);
  const [emailNotifs, setEmailNotifs] = useState(defaultSettings.emailNotifs);
  const [locationTracking, setLocationTracking] = useState(defaultSettings.locationTracking);

  // Show loader until settings are ready (guarantees loader shows on every mount)
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

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
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  if (pageLoading) {
    return <Loader fullPage text="Loading your settings..." />;
  }

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
              <h1 className="font-display text-2xl font-black text-(--text-main)">{t("settings")}</h1>
              <p className="text-xs font-semibold text-(--text-dim)">{t("preferences")}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-24">
          
          {/* Appearance Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase ml-2 flex items-center gap-2">
              <Sun size={14} /> {t("appearance")}
            </h2>
            <div className="glass-card rounded-3xl border-(--card-border) p-2">
              <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl">
                <div>
                  <p className="font-bold text-sm text-(--text-main)">{t("darkMode")}</p>
                  <p className="text-[10px] text-(--text-dim) mt-0.5">{t("toggleTheme")}</p>
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
              <Bell size={14} /> {t("notifications")}
            </h2>
            <div className="glass-card rounded-3xl border-(--card-border) p-2 space-y-2">
              <Toggle 
                label={t("pushNotifications")} 
                description={t("pushDesc")}
                enabled={pushNotifs} 
                onChange={(val) => updateSetting("pushNotifs", val, setPushNotifs)} 
              />
              <Toggle 
                label={t("emailAlerts")} 
                description={t("emailDesc")}
                enabled={emailNotifs} 
                onChange={(val) => updateSetting("emailNotifs", val, setEmailNotifs)} 
              />
            </div>
          </section>

          {/* Privacy & App Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase ml-2 flex items-center gap-2">
              <Shield size={14} /> {t("privacySettings")}
            </h2>
            <div className="glass-card rounded-3xl border-(--card-border) p-2 space-y-2">
              <Toggle 
                label={t("locationServices")} 
                description={t("locationDesc")}
                enabled={locationTracking} 
                onChange={(val) => updateSetting("locationTracking", val, setLocationTracking)} 
              />
              
              <div className="space-y-2">
                <button 
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-(--text-dim)" />
                    <div>
                      <p className="font-bold text-sm text-(--text-main)">{t("language")}</p>
                      <p className="text-[10px] text-(--text-dim) mt-0.5">
                        {currentLanguage === "en" ? "English" : currentLanguage === "hi" ? "Hindi (हिन्दी)" : "Gujarati (ગુજરાતી)"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className={`text-(--text-dim) transition-transform duration-200 ${isLanguageOpen ? "rotate-90" : ""}`} />
                </button>

                {isLanguageOpen && (
                  <div className="grid grid-cols-1 gap-2 p-2 bg-black/5 dark:bg-white/5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    {[
                      { code: "en", name: "English", local: "English" },
                      { code: "hi", name: "Hindi", local: "हिन्दी" },
                      { code: "gu", name: "Gujarati", local: "ગુજરાતી" }
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsLanguageOpen(false);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                          currentLanguage === lang.code
                            ? "bg-primary text-black font-black"
                            : "hover:bg-black/10 dark:hover:bg-white/10 text-(--text-main)"
                        }`}
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-sm">{lang.name}</span>
                          <span className={`text-[9px] ${currentLanguage === lang.code ? "text-black/60" : "text-(--text-dim)"}`}>{lang.local}</span>
                        </div>
                        {currentLanguage === lang.code && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>


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
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-primary text-black hover:scale-[1.02] transition-all text-left shadow-lg shadow-primary/10"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={18} />
                  <p className="font-black text-sm uppercase tracking-widest">{t("signOut")}</p>
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
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-primary text-black hover:scale-[1.02] transition-all text-left shadow-lg shadow-primary/10 mt-2"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={18} />
                  <p className="font-black text-sm uppercase tracking-widest">{isDeleting ? t("deleting") : t("deleteAccount")}</p>
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
