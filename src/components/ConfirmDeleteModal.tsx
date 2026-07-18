import React from "react";

interface ConfirmDeleteModalProps {
  badge: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export default function ConfirmDeleteModal({
  badge,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmDeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#0F172A]/45 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in duration-200 text-right">
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 justify-end">
          <span className="p-1 px-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold leading-normal">
            {badge}
          </span>
          <span>{title}</span>
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-sm disabled:opacity-60"
          >
            {isPending ? "..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer transition-all"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
