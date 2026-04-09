import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

const DialogContext = createContext();

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) throw new Error("useDialog must be used within a DialogProvider");
    return context;
};

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);

    const showAlert = useCallback((message, title = "Alert", type = "info") => {
        return new Promise((resolve) => {
            setDialog({
                type: "alert",
                message,
                title,
                iconType: type,
                onConfirm: () => {
                    setDialog(null);
                    resolve();
                }
            });
        });
    }, []);

    const showConfirm = useCallback((message, title = "Confirm", type = "warning", confirmText = "OK", cancelText = "Cancel") => {
        return new Promise((resolve) => {
            setDialog({
                type: "confirm",
                message,
                title,
                iconType: type,
                confirmText,
                cancelText,
                onConfirm: () => {
                    setDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {dialog && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                        onClick={dialog.type === "alert" ? dialog.onConfirm : dialog.onCancel}
                    />
                    <div className="relative w-full max-w-sm glass-card border flex flex-col p-6 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <DialogContent {...dialog} />
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};

const DialogContent = ({ type, title, message, iconType, confirmText, cancelText, onConfirm, onCancel }) => {
    const icons = {
        success: <CheckCircle className="text-emerald-500" size={32} />,
        error: <AlertCircle className="text-red-500" size={32} />,
        warning: <AlertTriangle className="text-amber-500" size={32} />,
        info: <Info className="text-blue-500" size={32} />,
    };

    return (
        <>
            <div className={`mb-4 inline-flex items-center justify-center p-3 rounded-full w-fit bg-${
                iconType === "error" ? "red" : 
                iconType === "warning" ? "amber" : 
                iconType === "success" ? "emerald" : "blue"
            }-500/10`}>
                {icons[iconType] || icons.info}
            </div>
            
            <h3 className="text-xl font-bold text-(--text-main) mb-2">{title}</h3>
            <p className="text-sm font-medium text-(--text-dim) mb-8 whitespace-pre-wrap">{message}</p>
            
            <div className="flex items-center gap-3 mt-auto justify-end">
                {type === "confirm" && (
                    <button 
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-(--text-main) transition-colors"
                    >
                        {cancelText || "Cancel"}
                    </button>
                )}
                <button 
                    onClick={onConfirm}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-105 active:scale-95 ${
                        iconType === 'error' 
                            ? 'bg-red-500 text-white shadow-red-500/20' 
                            : 'bg-primary text-black shadow-primary/20'
                    }`}
                >
                    {type === "confirm" ? (confirmText || "Confirm") : "OK"}
                </button>
            </div>
        </>
    );
};
