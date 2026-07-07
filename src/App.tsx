import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./screens/AuthScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { FinancesScreen } from "./screens/FinancesScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import type { TabKey } from "./types";

function LifeHub() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<TabKey>("home");

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <AppProvider>
      <AppShell active={tab} onChange={setTab}>
        {tab === "home" && <HomeScreen onNavigate={setTab} />}
        {tab === "finances" && <FinancesScreen />}
        {tab === "calendar" && <CalendarScreen />}
      </AppShell>
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <LifeHub />
    </AuthProvider>
  );
}

export default App;
