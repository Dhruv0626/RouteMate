import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "info", duration = 4000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
                {toasts.map((toast) => (
                    <ToastItem 
                        key={toast.id} 
                        {...toast} 
                        onClose={() => removeToast(toast.id)} 
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem = ({ message, type, onClose }) => {
    const icons = {
        success: <CheckCircle className="text-emerald-500" size={18} />,
        error: <AlertCircle className="text-red-500" size={18} />,
        warning: <AlertTriangle className="text-amber-500" size={18} />,
        info: <Info className="text-blue-500" size={18} />,
    };

    const bgColors = {
        success: "bg-emerald-500/10 border-emerald-500/20",
        error: "bg-red-500/10 border-red-500/20",
        warning: "bg-amber-500/10 border-amber-500/20",
        info: "bg-blue-500/10 border-blue-500/20",
    };

    return (
        <div className={`flex items-center gap-3 p-4 pr-12 rounded-2xl border backdrop-blur-xl animate-in slide-in-from-right duration-300 ${bgColors[type] || bgColors.info} shadow-2xl relative min-w-[300px] max-w-md`}>
            {icons[type] || icons.info}
            <p className="text-xs font-bold text-(--text-main)">{message}</p>
            <button 
                onClick={onClose}
                className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-(--text-dim) transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
};
