import React from "react";

const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  icon: Icon,
  fullWidth = false,
  ...props
}) => {
  const variants = {
    primary:
      "bg-primary hover:bg-primary-dark text-black shadow-lg shadow-primary/10 font-black",
    secondary:
      "bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--text-main)] border border-[var(--card-border)] shadow-md",
    outline:
      "bg-transparent border border-[var(--card-border)] hover:border-primary text-[var(--text-dim)] hover:text-primary",
    ghost:
      "bg-transparent hover:bg-[var(--card-bg)] text-[var(--text-dim)] hover:text-[var(--text-main)]",
    danger:
      "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 shadow-lg shadow-red-500/10",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`font-display flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm tracking-wide transition-all duration-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className} `}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;
