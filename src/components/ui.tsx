import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** A bottom sheet modal — the primary progressive-disclosure surface. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        className="sheet-panel"
        style={{
          maxHeight: "85vh",
          overflow: "auto",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: "#1e293b",
          border: "1px solid rgba(255,255,255,0.1)",
          borderTop: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "12px 20px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ width: 40, height: 6, borderRadius: 3, backgroundColor: "#475569", margin: "0 auto 12px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "#334155",
                color: "#cbd5e1",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>{children}</div>
      </div>
    </div>,
    document.body
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
