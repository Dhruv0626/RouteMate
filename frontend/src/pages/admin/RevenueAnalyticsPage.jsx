import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Calendar, IndianRupee, TrendingUp, Filter, 
  Download, Clock, User, Car, MapPin, RefreshCw, ChevronRight,
  TrendingDown, DollarSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../context/DialogContext";
import ThemeToggle from "../../components/ui/ThemeToggle";

const RevenueAnalyticsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState({ dailyIncome: [], trips: [] });
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/revenue-stats", { params: filters });
      if (res.data.success) {
        setRevenueData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch revenue", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPlatformRevenue = revenueData.dailyIncome.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalTrips = revenueData.dailyIncome.reduce((acc, curr) => acc + curr.tripCount, 0);
  const avgPerTrip = totalTrips > 0 ? (totalPlatformRevenue / totalTrips).toFixed(2) : 0;

  const handleExportCSV = () => {
    if (revenueData.trips.length === 0) {
      showAlert("There are no revenue records available to export for the selected date range.", "Export Prevented", "warning");
      return;
    }

    const headers = ["Date", "Time", "From", "To", "Passenger", "Driver", "Total Fare", "Platform Income"];
    const rows = revenueData.trips.map(trip => [
      new Date(trip.date).toLocaleDateString("en-IN"),
      new Date(trip.date).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }),
      `"${trip.source?.replace(/"/g, '""')}"`,
      `"${trip.destination?.replace(/"/g, '""')}"`,
      `"${trip.passenger}"`,
      `"${trip.driver}"`,
      trip.totalFare,
      trip.platformIncome
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RouteMate_Revenue_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen mesh-bg text-(--text-main) font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/superadmin/dashboard")}
              className="p-2 hover:bg-(--card-bg) rounded-xl border border-(--card-border) transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-display font-black tracking-tight">Revenue Analytics</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
               <TrendingUp size={20} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="glass-card p-6 rounded-3xl border border-(--card-border) relative overflow-hidden group">
              <div className="absolute right-[-10%] top-[-10%] opacity-5 group-hover:scale-110 transition-transform duration-500">
                 <IndianRupee size={120} className="text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text-dim) mb-1">Total Platform Income</p>
              <h2 className="text-3xl font-black text-primary">₹{totalPlatformRevenue.toLocaleString()}</h2>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg w-fit">
                 <TrendingUp size={12} /> +12.5% from last month
              </div>
           </div>

           <div className="glass-card p-6 rounded-3xl border border-(--card-border) relative overflow-hidden group">
              <div className="absolute right-[-10%] top-[-10%] opacity-5 group-hover:scale-110 transition-transform duration-500">
                 <Car size={120} className="text-violet-500" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text-dim) mb-1">Completed Trips</p>
              <h2 className="text-3xl font-black text-violet-500">{totalTrips}</h2>
              <p className="mt-4 text-[10px] font-bold text-(--text-dim)">Verified & Processed Payments</p>
           </div>

           <div className="glass-card p-6 rounded-3xl border border-(--card-border) relative overflow-hidden group">
              <div className="absolute right-[-10%] top-[-10%] opacity-5 group-hover:scale-110 transition-transform duration-500">
                 <DollarSign size={120} className="text-amber-500" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-(--text-dim) mb-1">Avg. Platform Fee / Trip</p>
              <h2 className="text-3xl font-black text-amber-500">₹{avgPerTrip}</h2>
              <p className="mt-4 text-[10px] font-bold text-(--text-dim)">Net Platform Margin</p>
           </div>
        </div>

        {/* ── Filters ── */}
        <div className="glass-card p-4 rounded-2xl border border-(--card-border) flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-4">
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-dim)" />
                <input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="bg-(--bg-main) border border-(--card-border) rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:border-primary/50"
                />
              </div>
              <span className="text-(--text-dim) text-xs font-bold">to</span>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-dim)" />
                <input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="bg-(--bg-main) border border-(--card-border) rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:border-primary/50"
                />
              </div>
              <button 
                onClick={fetchRevenue}
                className="bg-primary text-black px-6 py-2 rounded-xl text-xs font-black hover:scale-105 transition-all shadow-lg shadow-primary/20"
              >
                Apply Filters
              </button>
           </div>
           <button 
             onClick={handleExportCSV}
             className="flex items-center gap-2 px-4 py-2 rounded-xl border border-(--card-border) text-xs font-bold hover:bg-(--card-bg) transition-all"
           >
              <Download size={14} /> Export CSV
           </button>
        </div>

        {/* ── Tables Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Day-wise Income */}
           <div className="lg:col-span-1 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Calendar size={16} className="text-primary" /> Daily Aggregates
              </h3>
              <div className="glass-card rounded-3xl border border-(--card-border) overflow-hidden">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-(--card-bg) border-b border-(--card-border)">
                       <tr>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-(--text-dim)">Date</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-(--text-dim) text-right">Income</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-(--card-border)">
                       {revenueData.dailyIncome.map((day) => (
                          <tr key={day._id} className="hover:bg-primary/5 transition-colors group">
                             <td className="px-4 py-4">
                                <p className="text-xs font-black">{new Date(day._id).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}</p>
                                <p className="text-[10px] font-bold text-(--text-dim)">{day.tripCount} trips</p>
                             </td>
                             <td className="px-4 py-4 text-right">
                                <span className="text-xs font-black text-primary">₹{day.totalRevenue.toLocaleString()}</span>
                             </td>
                          </tr>
                       ))}
                       {revenueData.dailyIncome.length === 0 && !loading && (
                         <tr><td colSpan="2" className="px-4 py-10 text-center text-xs text-(--text-dim) font-bold">No data found for selected range</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* Trip-wise Detailed List */}
           <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <RefreshCw size={16} className="text-violet-500" /> Recent Trip Revenue
              </h3>
              <div className="glass-card rounded-3xl border border-(--card-border) overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                       <thead className="bg-(--card-bg) border-b border-(--card-border)">
                          <tr>
                             <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-(--text-dim)">Trip Details</th>
                             <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-(--text-dim)">Parties</th>
                             <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-(--text-dim) text-right">Fare</th>
                             <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-(--text-dim) text-right">Platform</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-(--card-border)">
                          {revenueData.trips.map((trip) => (
                             <tr key={trip.id} className="hover:bg-violet-500/5 transition-colors group">
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <div className="p-2 bg-violet-500/10 text-violet-500 rounded-lg">
                                         <Clock size={14} />
                                      </div>
                                      <div>
                                         <p className="text-xs font-black">{new Date(trip.date).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}</p>
                                         <p className="text-[10px] font-bold text-(--text-dim) flex items-center gap-1">
                                            <MapPin size={8} /> {trip.source?.split(',')[0]} → {trip.destination?.split(',')[0]}
                                         </p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-(--text-dim) flex items-center gap-1"><User size={8} /> {trip.passenger}</p>
                                      <p className="text-[10px] font-bold text-(--text-dim) flex items-center gap-1"><Car size={8} /> {trip.driver}</p>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <span className="text-xs font-black">₹{trip.totalFare}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <span className="text-xs font-black text-emerald-500">₹{trip.platformIncome}</span>
                                </td>
                             </tr>
                          ))}
                          {revenueData.trips.length === 0 && !loading && (
                            <tr><td colSpan="4" className="px-6 py-10 text-center text-xs text-(--text-dim) font-bold">No trips found</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {loading && (
         <div className="fixed inset-0 bg-(--bg-main)/50 backdrop-blur-sm z-[100] flex items-center justify-center">
            <RefreshCw className="animate-spin text-primary" size={40} />
         </div>
      )}
    </div>
  );
};

export default RevenueAnalyticsPage;
