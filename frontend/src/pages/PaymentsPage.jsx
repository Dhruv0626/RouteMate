import React, { useState } from "react";
import { 
  Wallet, 
  ChevronLeft, 
  Plus, 
  CreditCard, 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft,
  Smartphone,
  CheckCircle2,
  Trash2,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle";

const MOCK_CARDS = [
  { id: 1, type: "Visa", last4: "4521", expiry: "12/26", color: "bg-linear-to-br from-violet-600 to-indigo-700" },
  { id: 2, type: "Mastercard", last4: "8894", expiry: "08/25", color: "bg-linear-to-br from-rose-600 to-orange-600" },
];

const MOCK_TRANSACTIONS = [
  { id: 1, type: "Debit", title: "Ride Payment", amount: "₹185.00", date: "Today, 3:14 PM", status: "success" },
  { id: 2, type: "Credit", title: "Wallet Topup", amount: "₹500.00", date: "Yesterday, 11:30 AM", status: "success" },
  { id: 3, type: "Debit", title: "Ride Payment", amount: "₹140.00", date: "Yesterday, 1:02 PM", status: "success" },
];

const PaymentsPage = () => {
  const navigate = useNavigate();
  const balance = "₹1,240.50";

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
            <h1 className="font-display text-lg font-black text-(--text-main)">Payments & Wallet</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        
        {/* Wallet Balance Hero */}
        <section className="from-primary to-primary-dark rounded-[2.5rem] bg-linear-to-br p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 h-80 w-80 bg-white/10 blur-3xl rounded-full transition-transform group-hover:scale-110" />
          <div className="relative flex flex-col md:flex-row justify-between gap-8 md:items-center">
             <div>
                <p className="text-[10px] font-black text-black/60 uppercase tracking-[0.3em] mb-2">Available Balance</p>
                <h2 className="text-5xl font-black text-black">{balance}</h2>
                <p className="mt-4 text-xs font-bold text-black/70 flex items-center gap-2">
                   <Clock size={14} /> Automatic renewal is enabled
                </p>
             </div>
             <div className="flex gap-3">
                <button className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black/80 transition-all shadow-xl">
                   Top Up Wallet
                </button>
             </div>
          </div>
        </section>

        {/* Saved Methods */}
        <section>
          <div className="mb-6 flex items-center justify-between px-1">
            <h2 className="font-display text-lg font-black text-(--text-main) flex items-center gap-2">
              Payment Methods <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
            </h2>
            <button className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:underline">
               <Plus size={14} /> Add Method
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {MOCK_CARDS.map(card => (
               <div key={card.id} className={`${card.color} rounded-[2rem] p-6 shadow-xl relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02]`}>
                  <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                     <CreditCard size={100} />
                  </div>
                  <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                     <div className="flex justify-between items-start">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                           <CreditCard className="text-white" size={24} />
                        </div>
                        <span className="text-white/60 font-black text-xs uppercase tracking-widest">{card.type}</span>
                     </div>
                     <div>
                        <p className="text-white text-xl font-mono tracking-[0.3em]">•••• •••• •••• {card.last4}</p>
                        <div className="flex justify-between items-center mt-6">
                           <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Dhruv Trivedi</span>
                           <span className="text-white text-xs font-black">{card.expiry}</span>
                        </div>
                     </div>
                  </div>
               </div>
             ))}

             <div className="glass-card rounded-[2rem] border-2 border-dashed border-(--card-border) p-8 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary/30 transition-all">
                <div className="bg-primary/10 text-primary p-4 rounded-2xl mb-4 group-hover:bg-primary group-hover:text-black transition-all">
                   <Smartphone size={32} />
                </div>
                <h3 className="font-black text-sm mb-1">Link UPI ID</h3>
                <p className="text-xs text-(--text-dim)">Fast and secure payments via Google Pay, PhonePe or Paytm.</p>
             </div>
          </div>
        </section>

        {/* Transaction History */}
        <section className="space-y-6">
           <h2 className="font-display text-lg font-black text-(--text-main) flex items-center gap-2 px-1">
              Recent Transactions <span className="bg-primary h-1.5 w-1.5 rounded-full"></span>
           </h2>
           <div className="glass-card overflow-hidden rounded-3xl border border-(--card-border)">
              <div className="divide-y divide-(--card-border)">
                 {MOCK_TRANSACTIONS.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                       <div className="flex items-center gap-4">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${tx.type === 'Debit' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                             {tx.type === 'Debit' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                          </div>
                          <div>
                             <p className="text-sm font-black text-(--text-main)">{tx.title}</p>
                             <p className="text-[10px] font-bold text-(--text-dim) uppercase tracking-widest mt-0.5">{tx.date}</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </section>

      </main>
    </div>
  );
};

export default PaymentsPage;
