import { useEffect, useState } from "react";
import { Home, Wallet, Calendar, LogOut } from "lucide-react";
import type { TabKey } from "../types";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";

interface ShellProps {
  active: TabKey;
  onChange: (t: TabKey) => void;
  children: React.ReactNode;
}

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "finances", label: "Finances", icon: Wallet },
  { key: "calendar", label: "Calendar", icon: Calendar },
];

export function AppShell({ active, onChange, children }: ShellProps) {
  const { normalizeSubscriptions, loading } = useApp();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    normalizeSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const userName = (user?.user_metadata?.full_name as string | undefined) ?? "User";
  const userEmail = user?.email ?? "";

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex justify-center">
      <div className="relative w-full max-w-md min-h-screen bg-slate-900 shadow-2xl shadow-black/40 flex flex-col">
        {/* Top accent + profile bar */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-white/5">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-indigo-500" />
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm font-bold text-slate-100 tracking-tight">LifeHub</span>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="relative flex items-center gap-2 rounded-full bg-slate-800/60 pl-1 pr-3 py-1 transition-all hover:bg-slate-800"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="max-w-[100px] truncate text-xs text-slate-300">{userName.split(" ")[0]}</span>
            </button>
          </div>

          {/* Dropdown menu */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-3 top-12 z-40 w-56 rounded-xl bg-slate-800 border border-white/10 shadow-xl overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-medium text-slate-100 truncate">{userName}</p>
                  <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  <LogOut size={16} className="text-rose-400" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto pb-24">{children}</main>

        {/* Bottom navigation */}
        <nav className="absolute bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-white/5">
          <div className="flex items-stretch justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onChange(tab.key)}
                  className={`relative flex flex-1 flex-col items-center gap-1 py-1.5 transition-all duration-300 ${
                    isActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                      isActive ? "bg-emerald-500/15 scale-110" : "bg-transparent scale-100"
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
