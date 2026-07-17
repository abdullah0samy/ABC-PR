import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const h = size === "sm" ? 32 : size === "md" ? 44 : 64;
  const textCls = size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-lg";
  const subCls = size === "sm" ? "text-[9px]" : "text-[11px]";

  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src="/ABC-Logo.png"
        alt="ABC Hospital Logo"
        className="object-contain shrink-0"
        style={{ height: h, width: "auto" }}
        draggable={false}
      />
      {showText && (
        <div className="flex items-center gap-2.5">
          <div className="text-left leading-tight">
            <h2 className={`font-extrabold text-slate-900 dark:text-white ${textCls}`}>
              ABC Hospital
            </h2>
            <p className={`font-semibold text-blue-600 dark:text-blue-400 ${subCls} tracking-wide`}>
              Survey System
            </p>
          </div>
          <div className="h-7 w-px bg-slate-300 dark:bg-slate-600 hidden sm:block" />
          <div className="text-right leading-tight hidden sm:block">
            <h2 className={`font-extrabold text-slate-900 dark:text-white ${textCls}`}>
              مستشفى إي بي سي
            </h2>
            <p className={`font-semibold text-blue-600 dark:text-blue-400 ${subCls} tracking-wide`}>
              نظام استبيان الرضا
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
