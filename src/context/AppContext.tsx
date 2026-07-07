import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { advanceRenewalDate } from "../lib/engine";
import { daysBetween, todayISO } from "../lib/dates";
import type { CalendarEvent, Transaction } from "../types";

/** Row shape from Supabase (snake_case) → app shape (camelCase). */
function rowToTransaction(r: Record<string, unknown>): Transaction {
  return {
    id: r.id as string,
    amount: Number(r.amount),
    payee: r.payee as string,
    category: r.category as Transaction["category"],
    date: r.date as string,
    isSubscription: r.is_subscription as boolean,
    billingCycle: (r.billing_cycle ?? undefined) as Transaction["billingCycle"],
    renewalDate: (r.renewal_date ?? undefined) as string | undefined,
    note: (r.note ?? undefined) as string | undefined,
    createdAt: r.created_at as string,
  };
}

function rowToEvent(r: Record<string, unknown>): CalendarEvent {
  return {
    id: r.id as string,
    title: r.title as string,
    date: r.date as string,
    time: (r.time ?? undefined) as string | undefined,
    location: (r.location ?? undefined) as string | undefined,
    description: (r.description ?? undefined) as string | undefined,
    type: r.type as CalendarEvent["type"],
    isAnnual: r.is_annual as boolean,
    originalDate: (r.original_date ?? undefined) as string | undefined,
    source: (r.source ?? "manual") as CalendarEvent["source"],
    googleEventId: (r.google_event_id ?? undefined) as string | undefined,
    createdAt: r.created_at as string,
  };
}

interface AppContextValue {
  transactions: Transaction[];
  events: CalendarEvent[];
  loading: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Omit<Transaction, "id" | "createdAt">>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addEvent: (e: Omit<CalendarEvent, "id" | "createdAt">) => Promise<void>;
  updateEvent: (id: string, e: Partial<Omit<CalendarEvent, "id" | "createdAt">>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  upsertGoogleEvents: (events: Array<Omit<CalendarEvent, "id" | "createdAt">>) => Promise<void>;
  normalizeSubscriptions: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data when user changes
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const [txRes, evtRes] = await Promise.all([
        supabase.from("transactions").select("*").order("date", { ascending: false }),
        supabase.from("events").select("*").order("date", { ascending: true }),
      ]);

      if (txRes.data) setTransactions(txRes.data.map(rowToTransaction));
      if (evtRes.data) setEvents(evtRes.data.map(rowToEvent));
      setLoading(false);
    })();
  }, [user]);

  const addTransaction = useCallback(
    async (t: Omit<Transaction, "id" | "createdAt">) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          amount: t.amount,
          payee: t.payee,
          category: t.category,
          date: t.date,
          is_subscription: t.isSubscription,
          billing_cycle: t.billingCycle ?? null,
          renewal_date: t.renewalDate ?? null,
          note: t.note ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) setTransactions((prev) => [rowToTransaction(data), ...prev]);
    },
    []
  );

  const updateTransaction = useCallback(
    async (id: string, t: Partial<Omit<Transaction, "id" | "createdAt">>) => {
      const update: Record<string, unknown> = {};
      if (t.amount !== undefined) update.amount = t.amount;
      if (t.payee !== undefined) update.payee = t.payee;
      if (t.category !== undefined) update.category = t.category;
      if (t.date !== undefined) update.date = t.date;
      if (t.isSubscription !== undefined) update.is_subscription = t.isSubscription;
      if (t.billingCycle !== undefined) update.billing_cycle = t.billingCycle;
      if (t.renewalDate !== undefined) update.renewal_date = t.renewalDate;
      if (t.note !== undefined) update.note = t.note;

      const { error } = await supabase.from("transactions").update(update).eq("id", id);
      if (error) throw error;
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, ...t } : tx))
      );
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addEvent = useCallback(
    async (e: Omit<CalendarEvent, "id" | "createdAt">) => {
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: e.title,
          date: e.date,
          time: e.time ?? null,
          location: e.location ?? null,
          description: e.description ?? null,
          type: e.type,
          is_annual: e.isAnnual,
          original_date: e.originalDate ?? null,
          source: e.source ?? "manual",
          google_event_id: e.googleEventId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) setEvents((prev) => [...prev, rowToEvent(data)]);
    },
    []
  );

  const updateEvent = useCallback(
    async (id: string, e: Partial<Omit<CalendarEvent, "id" | "createdAt">>) => {
      const update: Record<string, unknown> = {};
      if (e.title !== undefined) update.title = e.title;
      if (e.date !== undefined) update.date = e.date;
      if (e.time !== undefined) update.time = e.time;
      if (e.location !== undefined) update.location = e.location;
      if (e.description !== undefined) update.description = e.description;
      if (e.type !== undefined) update.type = e.type;
      if (e.isAnnual !== undefined) update.is_annual = e.isAnnual;
      if (e.originalDate !== undefined) update.original_date = e.originalDate;

      const { error } = await supabase.from("events").update(update).eq("id", id);
      if (error) throw error;
      setEvents((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, ...e } : ev))
      );
    },
    []
  );

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const upsertGoogleEvents = useCallback(
    async (incoming: Array<Omit<CalendarEvent, "id" | "createdAt">>) => {
      for (const e of incoming) {
        if (!e.googleEventId) continue;
        const { data: existing } = await supabase
          .from("events")
          .select("id")
          .eq("google_event_id", e.googleEventId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("events")
            .update({
              title: e.title,
              date: e.date,
              time: e.time ?? null,
              location: e.location ?? null,
              description: e.description ?? null,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("events").insert({
            title: e.title,
            date: e.date,
            time: e.time ?? null,
            location: e.location ?? null,
            description: e.description ?? null,
            type: e.type,
            is_annual: false,
            source: "google",
            google_event_id: e.googleEventId,
          });
        }
      }
      // Reload events after sync
      const { data } = await supabase.from("events").select("*").order("date", { ascending: true });
      if (data) setEvents(data.map(rowToEvent));
    },
    []
  );

  const normalizeSubscriptions = useCallback(async () => {
    const today = todayISO();
    let changed = false;
    const updated = transactions.map((t) => {
      if (!t.isSubscription || !t.renewalDate || !t.billingCycle) return t;
      let renewal = t.renewalDate;
      while (daysBetween(today, renewal) < 0) {
        renewal = advanceRenewalDate(renewal, t.billingCycle);
      }
      if (renewal !== t.renewalDate) {
        changed = true;
        supabase.from("transactions").update({ renewal_date: renewal }).eq("id", t.id);
        return { ...t, renewalDate: renewal };
      }
      return t;
    });
    if (changed) setTransactions(updated);
  }, [transactions]);

  return (
    <AppContext.Provider
      value={{
        transactions,
        events,
        loading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addEvent,
        updateEvent,
        deleteEvent,
        upsertGoogleEvents,
        normalizeSubscriptions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
