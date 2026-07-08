import React from "react";
import { FieldError } from "react-hook-form";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  icon?: React.ReactNode;
  dark: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  icon,
  dark,
  className = "",
  ...props
}) => {
  const inputCls = `w-full py-3 rounded-xl border text-sm outline-none transition-all ${
    dark
      ? "bg-white/5 border-white/10 text-white placeholder-white/25 focus:border-purple-500/60"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-600/50"
  } ${icon ? "pl-10" : "px-4"} ${error ? "border-red-500 focus:border-red-500" : ""}`;

  return (
    <div className="w-full">
      <label
        className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
          dark ? "text-white/50" : "text-slate-500"
        }`}
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
              dark ? "text-white/30" : "text-slate-400"
            }`}
          >
            {icon}
          </div>
        )}
        <input className={`${inputCls} ${className}`} {...props} />
      </div>
      {error && <p className="text-red-500 text-xs mt-1 font-medium">{error.message}</p>}
    </div>
  );
};
