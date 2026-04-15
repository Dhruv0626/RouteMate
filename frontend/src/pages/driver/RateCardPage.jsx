import { useState, useEffect } from "react";
import { 
  ChevronLeft, Info, Zap, IndianRupee, Clock, MapPin, 
  ShieldCheck, AlertCircle, TrendingUp, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { getMyDriverProfile } from "../../services/driverProfileService";
import Loader from "../../components/ui/Loader";

const VEHICLE_META = {
    MOTO: { label: "MOTO", image: "/images/Moto.png", color: "primary", desc: "Petrol Bike - Fast & Economical" },
    EVMOTO: { label: "EVMOTO", image: "/images/EVmoto.png", color: "emerald-500", desc: "Electric Bike - Sustainable Travel" },
    AUTO: { label: "AUTO", image: "/images/Auto.png", color: "amber-500", desc: "Classic Rickshaw - Urban Explorer" },
    EVAUTO: { label: "EVAUTO", image: "/images/EVauto.png", color: "emerald-500", desc: "Electric Auto - Silent & Smooth" },
    GO: { label: "GO", image: "/images/Go.png", color: "blue-400", desc: "Hatchback - Comfortable City Ride" },
    EVGO: { label: "EVGO", image: "/images/EVgo.png", color: "emerald-500", desc: "Electric Hatch - Modern Efficiency" },
    PRIME: { label: "PRIME", image: "/images/Prime.png", color: "indigo-500", desc: "Premium Sedan - Executive Comfort" },
    XL: { label: "XL", image: "/images/XL.png", color: "violet-500", desc: "SUV - Extra Space for Everyone" },
};

const RateCardPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [driverType, setDriverType] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [configRes, profileRes] = await Promise.all([
                api.get("/users/system-settings"),
                getMyDriverProfile()
            ]);

            if (configRes.data.success) {
                setConfig(configRes.data.settings);
            }
            
            if (profileRes.data.success && profileRes.data.data) {
                setDriverType(profileRes.data.data.vehicle?.type?.toUpperCase());
            }
        } catch (err) {
            console.error("Failed to fetch rates or profile:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return <Loader fullPage text="Fetching latest platform rates..." />;

    const pricing = config?.pricing || {};

    return (
        <div className="mesh-bg min-h-screen font-sans text-(--text-main) pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-(--card-bg) rounded-xl border border-(--card-border) text-(--text-dim) hover:text-(--text-main) transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-display font-black tracking-tight leading-none">Rate Card</h1>
                            <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-widest">Pricing Structure</p>
                        </div>                 
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
                
                {/* Info Alert */}
                <div className="glass-card p-4 rounded-3xl border-(--card-border) bg-blue-500/5 flex gap-4 items-start">
                    <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400">
                        <Info size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-100">Dynamic Pricing Active</p>
                        <p className="text-[11px] text-blue-600 dark:text-blue-300/70 leading-relaxed font-medium">
                            Rates shown are base values. Final fares may include surge multipliers (up to {config?.surgeMultiplier || '1.8x'}) during high demand or night hours.
                        </p>
                    </div>
                </div>

                {/* Rates List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-black uppercase tracking-widest text-(--text-dim)">
                            {driverType ? `Your Rates (${driverType})` : "Vehicle Categories"}
                        </h2>
                        <button 
                            onClick={fetchData}
                            className={`p-2 rounded-lg border border-(--card-border) bg-(--card-bg) text-(--text-dim) hover:text-primary transition-all ${loading ? 'animate-spin cursor-not-allowed' : ''}`}
                            disabled={loading}
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    {Object.entries(pricing)
                        .filter(([key]) => !driverType || key === driverType)
                        .map(([key, data]) => {
                        const meta = VEHICLE_META[key] || { label: key, image: "/images/Prime.png", color: "primary", desc: "Standard Vehicle" };
                        return (
                            <div key={key} className="glass-card group rounded-4xl border-(--card-border) overflow-hidden hover:border-primary/30 transition-all duration-500">
                                <div className={`h-1.5 w-full bg-${meta.color}`} />
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-12 flex items-center justify-center p-1 bg-black/5 rounded-xl border border-white/5 overflow-hidden">
                                                <img src={meta.image} alt={meta.label} className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-display font-black text-(--text-main)">{meta.label}</h3>
                                                <p className="text-[10px] text-(--text-dim) font-bold uppercase tracking-wider">{meta.desc}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-(--text-dim) uppercase mb-1">Base Price</span>
                                            <div className="flex items-center text-xl font-display font-black text-primary">
                                                <IndianRupee size={16} />
                                                {data.baseFare?.replace(/[^\d.]/g, "") || "0"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 border-t border-(--card-border) pt-6">
                                        <div className="bg-(--card-bg) p-3 rounded-2xl border border-(--card-border) flex flex-col items-center justify-center text-center">
                                            <MapPin size={12} className="text-(--text-dim) mb-1" />
                                            <span className="text-[9px] font-black text-(--text-dim) uppercase tracking-tighter mb-0.5">Per KM</span>
                                            <span className="text-xs font-black text-(--text-main)">{data.costPerKm || "₹0/km"}</span>
                                        </div>
                                        <div className="bg-(--card-bg) p-3 rounded-2xl border border-(--card-border) flex flex-col items-center justify-center text-center">
                                            <Clock size={12} className="text-(--text-dim) mb-1" />
                                            <span className="text-[9px] font-black text-(--text-dim) uppercase tracking-tighter mb-0.5">Per MIN</span>
                                            <span className="text-xs font-black text-(--text-main)">{data.perMinRate || "₹0/min"}</span>
                                        </div>
                                        <div className="bg-(--card-bg) p-3 rounded-2xl border border-(--card-border) flex flex-col items-center justify-center text-center">
                                            <IndianRupee size={12} className="text-(--text-dim) mb-1" />
                                            <span className="text-[9px] font-black text-(--text-dim) uppercase tracking-tighter mb-0.5">Min Fare</span>
                                            <span className="text-xs font-black text-(--text-main)">{data.minFare || "₹0"}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between px-2 pt-2">
                                        <div className="flex items-center gap-1.5">
                                            <AlertCircle size={10} className="text-amber-500" />
                                            <span className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">Night Charge: {data.nightCharge || "₹0"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <TrendingUp size={10} className="text-indigo-400" />
                                            <span className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">Max Surge Cap: {data.surgeCap || "1.8"}x</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="text-center space-y-2 opacity-50 pt-10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">RouteMate Protocol</p>
                    <p className="text-[9px] italic">Automated calculation logic enforced by Routemate systems.</p>
                </div>
            </main>
        </div>
    );
};

export default RateCardPage;
