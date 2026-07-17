import React from "react";
import { HeartPulse } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  // Dimensions based on size
  const height = size === "sm" ? 32 : size === "md" ? 48 : 72;

  return (
    <div className={`flex items-center gap-3 select-none`}>
      {/* Brand Icon */}
      <div className={`flex items-center justify-center ${size === "sm" ? "w-8 h-8" : "w-12 h-12"} bg-blue-600 rounded-lg text-white`}>
        <HeartPulse size={size === "sm" ? 18 : 24} />
      </div>

      {showText && (
        <div className="flex items-center gap-3">
          {/* English side */}
          <div className="text-left">
            <h2 className={`font-black text-slate-900 dark:text-white ${size === "sm" ? "text-sm" : "text-lg"} leading-tight`}>
              ABC Hospital
            </h2>
            <p className={`font-medium text-slate-500 dark:text-slate-400 ${size === "sm" ? "text-[10px]" : "text-xs"} tracking-wide`}>
              PR System
            </p>
          </div>
          
          {/* Vertical Separator */}
          <div className="h-8 w-[1px] bg-slate-300 dark:bg-slate-600"></div>

          {/* Arabic side */}
          <div className="text-right">
            <h2 className={`font-black text-slate-900 dark:text-white ${size === "sm" ? "text-sm" : "text-lg"} leading-tight`}>
              مستشفى إي بي سي
            </h2>
            <p className={`font-medium text-slate-500 dark:text-slate-400 ${size === "sm" ? "text-[10px]" : "text-xs"} tracking-wide`}>
              نظام استبيان
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
