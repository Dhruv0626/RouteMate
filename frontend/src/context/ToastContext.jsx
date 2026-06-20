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

    const showToast = useCallback((message, type = "info", duration = 4000, options = {}) => {
        const id = Date.now();
        const { onClose, onDismiss, icon } = options;
        setToasts((prev) => [...prev, { id, message, type, duration, onClose, onDismiss, icon }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => {
            const toast = prev.find(t => t.id === id);
            if (toast?.onClose) toast.onClose();
            return prev.filter((t) => t.id !== id);
        });
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, removeToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem 
                            {...toast} 
                            onClose={() => removeToast(toast.id)} 
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem = ({ message, type, onClose, onDismiss, icon }) => {
    const icons = {
        success: <CheckCircle className="text-emerald-500" size={18} />,
        error: <AlertCircle className="text-red-500" size={18} />,
        warning: <AlertTriangle className="text-amber-500" size={18} />,
        info: <Info className="text-blue-500" size={18} />,
    };

    return (
        <div className={`flex items-center gap-3 p-4 pr-12 rounded-2xl border backdrop-blur-xl animate-in slide-in-from-right duration-300 bg-(--text-main) border-(--text-main) text-(--bg-main) shadow-2xl relative min-w-[300px] max-w-md`}>
            {icon ? icon : (icons[type] || icons.info)}
            <p className="text-xs font-bold text-(--bg-main)">{message}</p>
            <button 
                onClick={() => {
                   if (onDismiss) onDismiss();
                   onClose();
                }}
                className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-lg hover:bg-(--bg-main) hover:opacity-50 text-(--bg-main) opacity-70 transition-all"
            >
                <X size={14} />
            </button>
        </div>
    );
};
