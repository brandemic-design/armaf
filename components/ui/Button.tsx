"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", pulse = false, className = "", children, ...props }, ref) => {
    const base =
      "font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-mission-red text-mission-white border border-mission-red hover:bg-mission-red-light hover:border-mission-red-light",
      secondary:
        "bg-transparent text-mission-white border border-mission-grey-light hover:border-mission-red hover:text-mission-red",
      ghost:
        "bg-transparent text-mission-white/60 border-none hover:text-mission-white",
    };

    const sizes = {
      sm: "px-4 py-2 text-xs",
      md: "px-6 py-3 text-sm",
      lg: "px-8 py-4 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${pulse ? "pulse-cta" : ""} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
