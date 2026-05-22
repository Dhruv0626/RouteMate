import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ArrowLeft, ChevronDown, ChevronUp, FileText } from "lucide-react";

const FAQPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState(null);

  const passengerFaqs = [
    { question: "How do I book a ride?", answer: "Enter your destination, select your preferred ride type, and confirm the booking. You will be matched with a nearby driver." },
    { question: "How do I cancel a ride?", answer: "Go to your active ride screen and tap the 'Cancel Ride' button. Cancellation fees may apply if the driver is already arriving." },
    { question: "Can I change my destination mid-trip?", answer: "Yes, you can update your destination in the app during the trip, and the fare will be adjusted automatically." },
    { question: "What payment methods are supported?", answer: "We support Credit/Debit Cards, Digital Wallets, and Cash (in select regions)." },
    { question: "How do I report a lost item?", answer: "Go to your Ride History, select the trip, and tap 'Report Lost Item' to contact the driver." },
  ];

  const driverFaqs = [
    { question: "How do I withdraw my earnings?", answer: "Go to the Wallet section and tap 'Withdraw'. Earnings are typically processed within 2-3 business days." },
    { question: "What do I do if a passenger cancels?", answer: "If a passenger cancels after you have already traveled a significant distance, you will receive a cancellation fee compensation." },
    { question: "How is my rating calculated?", answer: "Your rating is an average of the last 500 ratings provided by your passengers." },
    { question: "How do I change my vehicle details?", answer: "Go to Settings > Profile > Vehicle details and submit a change request with the new documentation." },
    { question: "What if I get into an accident?", answer: "Use the in-app SOS button immediately if you need emergency assistance, then report the incident through the support center." },
  ];

  const faqs = user?.role === "driver" ? driverFaqs : passengerFaqs;

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
              <h1 className="font-display text-2xl font-black text-(--text-main)">{t("faqs") || "FAQs"}</h1>
              <p className="text-xs font-semibold text-(--text-dim)">Frequently Asked Questions</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-24">
          <div className="text-center mb-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-primary" />
            </div>
            <p className="text-sm text-(--text-dim) max-w-sm mx-auto">
              Find quick answers to your questions below.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-primary uppercase ml-2 flex items-center gap-2 mb-4">
              <FileText size={14} /> Questions
            </h2>
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`border border-(--card-border) rounded-2xl overflow-hidden transition-all duration-300 ${openIndex === index ? 'bg-black/5 dark:bg-white/5' : 'bg-transparent'}`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
                >
                  <span className="font-bold text-sm text-(--text-main)">{faq.question}</span>
                  {openIndex === index ? (
                    <ChevronUp size={18} className="text-primary flex-shrink-0 ml-2" />
                  ) : (
                    <ChevronDown size={18} className="text-(--text-dim) flex-shrink-0 ml-2" />
                  )}
                </button>
                
                {openIndex === index && (
                  <div className="p-4 pt-0 text-xs text-(--text-dim) leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </section>

          <div className="pt-8 text-center">
            <p className="text-[10px] font-bold tracking-widest text-(--text-dim) uppercase">RouteMate Support</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
