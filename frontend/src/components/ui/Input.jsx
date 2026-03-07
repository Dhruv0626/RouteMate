import React from "react";
import { AlertCircle } from "lucide-react";

const Input = ({
  label,
  icon: Icon,
  rightSection,
  type = "text",
  placeholder,
  error,
  className = "",
  ...props
}) => {
  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {label && (
        <label className="font-display ml-1 text-xs font-bold tracking-widest text-(--text-dim) uppercase transition-colors duration-500">
          {label}
        </label>
      )}
      <div className="group relative">
        {Icon && (
          <div className="group-focus-within:text-primary absolute top-1/2 left-4 -translate-y-1/2 text-slate-500 transition-colors duration-300">
            <Icon size={18} />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-(--card-border) bg-(--card-bg) py-3 ${Icon ? "pl-12" : "px-4"} ${rightSection ? "pr-12" : "pr-4"} focus:ring-primary/20 focus:border-primary/50 font-sans text-sm text-(--text-main) transition-all duration-500 placeholder:text-slate-500 focus:ring-2 focus:outline-none ${error ? "border-red-500/50 ring-red-500/10" : ""} `}
          {...props}
        />
        {rightSection && (
          <div className="absolute top-1/2 right-4 flex -translate-y-1/2 items-center justify-center">
            {rightSection}
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle size={12} className="text-red-500" />
          <span className="text-[10px] font-bold text-red-500">
            {error}
          </span>
        </div>
      )}
    </div>
  );
};

export default Input;
