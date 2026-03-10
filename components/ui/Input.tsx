"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-mono uppercase tracking-widest text-mission-white/60">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`bg-mission-grey border border-mission-grey-light px-4 py-3 text-sm text-mission-white font-mono placeholder:text-mission-white/30 focus:outline-none focus:border-mission-red transition-colors ${
            error ? "border-mission-red-light error-glow" : ""
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-mission-red-light font-mono">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
