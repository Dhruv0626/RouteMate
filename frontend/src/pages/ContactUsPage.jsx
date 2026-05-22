import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useDialog } from "../context/DialogContext";
import { ArrowLeft, Mail, Phone, MessageSquare, ChevronRight, MapPin } from "lucide-react";

const ContactUsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showAlert } = useDialog();

  const contactOptions = [
    {
      icon: <MessageSquare size={20} className="text-primary" />,
      title: t("liveChat") || "Live Chat",
      description: t("liveChatDesc") || "Chat with our support team instantly.",
      action: () => showAlert("Live Chat functionality will be available in an upcoming update.", "Coming Soon", "info"),
    },
    {
      icon: <Phone size={20} className="text-primary" />,
      title: t("callUs") || "Call Us",
      description: t("callUsDesc") || "Speak directly with a customer service representative.",
      action: () => window.location.href = "tel:+1234567890",
    },
    {
      icon: <Mail size={20} className="text-primary" />,
      title: t("emailSupport") || "Email Support",
      description: t("emailSupportDesc") || "Send us an email and we'll get back to you within 24 hours.",
      action: () => window.location.href = "mailto:support@routemate.com",
    }
  ];

  return (
    <div className="mesh-bg flex min-h-screen justify-center p-4 transition-colors duration-500">
      <div className="glass-card flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border-(--card-border) shadow-2xl">
        
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-(--card-border) bg-(--bg-main)/80 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="group rounded-xl border border-(--card-border) bg-(--card-bg) p-2 text-(--text-dim) transition-all hover:text-(--text-main)"
            >
              <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-black text-(--text-main)">Contact Us</h1>
              <p className="text-xs font-semibold text-(--text-dim)">We're here to help you</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-24">
          
          <div className="text-center mb-4">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone size={32} className="text-primary" />
            </div>
            <p className="text-sm text-(--text-dim) mt-2 max-w-sm mx-auto">
              Choose your preferred method to reach our support team. We are available 24/7.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase ml-2 flex items-center gap-2 mb-4">
              <MessageSquare size={14} /> Get in Touch
            </h2>
            {contactOptions.map((option, index) => (
              <button 
                key={index}
                onClick={option.action}
                className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-left border border-transparent hover:border-(--card-border)"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-(--bg-main) p-3 rounded-xl border border-(--card-border)">
                    {option.icon}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-(--text-main)">{option.title}</p>
                    <p className="text-[11px] text-(--text-dim) mt-0.5">{option.description}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-(--text-dim)" />
              </button>
            ))}
          </section>

          <section className="mt-8 pt-6 border-t border-(--card-border)">
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase ml-2 flex items-center gap-2 mb-4">
              <MapPin size={14} /> Headquarters
            </h2>
            <div className="flex items-start gap-4 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-(--card-border)">
              <div className="bg-primary/20 p-3 rounded-xl text-primary flex-shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <p className="font-bold text-sm text-(--text-main)">RouteMate Inc.</p>
              </div>
            </div>
          </section>

          <div className="pt-8 text-center">
            <p className="text-[10px] font-bold tracking-widest text-(--text-dim) uppercase">RouteMate Support</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUsPage;
