import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex flex-col justify-end"
      onClick={onClose}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className="sheet-panel max-h-[85vh] overflow-y-auto rounded-t-3xl bg-slate-800 border-x border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3 pb-2 border-b border-white/5">
          <div className="w-10 h-1.5 rounded-full bg-slate-600 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100 m-0">{title}</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-slate-300 border-none cursor-pointer hover:bg-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="block mb-3">
      <span className="mb-1.5 block text-xs font-medium text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl bg-slate-700/60 border border-white/10 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500/60 focus:bg-slate-700 focus:ring-2 focus:ring-emerald-500/20";
