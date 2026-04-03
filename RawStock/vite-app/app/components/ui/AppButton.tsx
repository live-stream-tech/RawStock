import { motion } from "motion/react";
import { ReactNode } from "react";
import { cn } from "./utils";

interface AppButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "amber";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function AppButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled = false,
  isLoading = false,
  type = "button",
  icon,
  fullWidth = false,
}: AppButtonProps) {
  const variants = {
    primary: "bg-[#0891B2] text-white hover:bg-[#0891B2]/90 shadow-lg shadow-[#0891B2]/20",
    secondary: "bg-slate-700 text-white hover:bg-slate-600",
    outline: "bg-transparent border border-slate-600 text-slate-300 hover:border-[#0891B2] hover:text-[#0891B2]",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20",
    amber: "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-4 py-2 text-xs",
    lg: "px-6 py-3 text-sm",
    xl: "px-8 py-4 text-base",
  };

  return (
    <motion.button
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-widest transition-all",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        (disabled || isLoading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  );
}
