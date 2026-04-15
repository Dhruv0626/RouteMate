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
      "bg-primary hover:bg-primary-dark text-black shadow-lg shadow-primary/10 font-black",
    outline:
      "bg-primary hover:bg-primary-dark text-black shadow-lg shadow-primary/10 font-black",
    ghost:
      "bg-primary hover:bg-primary-dark text-black shadow-lg shadow-primary/10 font-black",
    danger:
      "bg-primary hover:bg-primary-dark text-black shadow-lg shadow-primary/10 font-black",
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
