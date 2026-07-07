import { Sun, Cloud, CloudRain, CloudLightning, CloudSun, Cake, Heart, Star, RefreshCw, CalendarClock, Sparkles, ArrowRight, Loader2, MapPin, Search, X, Pencil, Trash2, Plus, ChevronDown } from "lucide-react";
import { useMemo, useState, useRef, useEffect, createContext, useContext } from "react";
import { useApp } from "../context/AppContext";
import { useLiveWeather } from "../lib/weather";
import { buildBriefing, buildReminders, todayEvents } from "../lib/engine";
import { greetByHour } from "../lib/dates";
import { Sheet, Field, inputClass } from "../components/ui";
import { todayISO } from "../lib/dates";
import type { WeatherDay, Reminder, TabKey, EventType, Transaction, CalendarEvent, CurrencyCode } from "../types";
import { CURRENCY_CONFIG } from "../types";

// Currency context for home screen sheets
interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatCurrency: (amount: number) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: "INR" as CurrencyCode,
      setCurrency: () => {},
      formatCurrency: (amount: number) => `₹${amount.toFixed(2)}`,
      symbol: "₹",
    };
  }
  return ctx;
}

function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("INR");

  const formatCurrency = (amount: number) => {
    const { symbol } = CURRENCY_CONFIG[currency];
    return `${symbol}${amount.toFixed(2)}`;
  };

  const symbol = CURRENCY_CONFIG[currency].symbol;

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

const weatherIcon = (c: WeatherDay["condition"], size = 22) => {
  switch (c) {
    case "sunny": return <Sun size={size} className="text-amber-400" />;
    case "partly": return <CloudSun size={size} className="text-sky-400" />;
    case "cloudy": return <Cloud size={size} className="text-slate-400" />;
    case "rain": return <CloudRain size={size} className="text-sky-500" />;
    case "storm": return <CloudLightning size={size} className="text-indigo-400" />;
  }
};

const reminderIcon = (name: string, size = 18) => {
  switch (name) {
    case "cake": return <Cake size={size} />;
    case "heart": return <Heart size={size} />;
    case "star": return <Star size={size} />;
    case "refresh": return <RefreshCw size={size} />;
    default: return <Star size={size} />;
  }
};

export function HomeScreen({ onNavigate }: { onNavigate: (t: TabKey) => void }) {
  const { transactions, events, addEvent, updateEvent, deleteEvent, addTransaction, updateTransaction, deleteTransaction } = useApp();

  const { weather, city, loading: weatherLoading, setLocation, searchCity } = useLiveWeather();
  const todayWeather = weather[0];
  const subscriptions = useMemo(
    () => transactions.filter((t) => t.isSubscription),
    [transactions]
  );

  // State for quick sheets
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const briefing = useMemo(
    () =>
      buildBriefing(
        greetByHour(),
        {
          rainHour: todayWeather?.rainHour,
          condition: todayWeather?.condition ?? "partly",
          rainChance: todayWeather?.rainChance ?? 0,
          todayLabel: "today",
        },
        events,
        subscriptions
      ),
    [events, subscriptions, todayWeather]
  );

  const reminders = useMemo(
    () => buildReminders(events, subscriptions),
    [events, subscriptions]
  );

  const todays = useMemo(() => todayEvents(events), [events]);

  return (
    <CurrencyProvider>
    <div className="px-4 pt-5 space-y-5">
      {/* === Morning Briefing Block === */}
      <MorningBrief briefing={briefing} />

      {/* === Row 1: Weather + Today's Schedule === */}
      <div className="grid grid-cols-1 gap-4">
        <WeatherCard weather={weather} city={city} loading={weatherLoading} setLocation={setLocation} searchCity={searchCity} />
        <ScheduleCard events={todays} onSeeAll={() => onNavigate("calendar")} />
      </div>

      {/* === Row 2: Active Reminders Carousel === */}
      <RemindersCarousel
        reminders={reminders}
        onEditEvent={(id) => {
          const e = events.find(ev => ev.id === id);
          if (e) {
            setEditingEvent(e);
            setEventSheetOpen(true);
          }
        }}
        onEditSubscription={(id) => {
          const t = transactions.find(tx => tx.id === id);
          if (t) {
            setEditingTransaction(t);
            setTransactionSheetOpen(true);
          }
        }}
        onDeleteEvent={(id) => deleteEvent(id)}
        onDeleteSubscription={(id) => deleteTransaction(id)}
        onAddEvent={() => {
          setEditingEvent(null);
          setEventSheetOpen(true);
        }}
        onAddSubscription={() => {
          setEditingTransaction(null);
          setTransactionSheetOpen(true);
        }}
      />

      {/* Event Sheet for quick add/edit from reminders */}
      <EventQuickSheet
        open={eventSheetOpen}
        editing={editingEvent}
        onClose={() => {
          setEventSheetOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={async (e) => {
          if (editingEvent) {
            await updateEvent(editingEvent.id, e);
          } else {
            await addEvent(e);
          }
          setEventSheetOpen(false);
          setEditingEvent(null);
        }}
      />

      {/* Transaction Sheet for quick add/edit subscriptions */}
      <TransactionQuickSheet
        open={transactionSheetOpen}
        editing={editingTransaction}
        onClose={() => {
          setTransactionSheetOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={async (t) => {
          if (editingTransaction) {
            await updateTransaction(editingTransaction.id, t);
          } else {
            await addTransaction(t);
          }
          setTransactionSheetOpen(false);
          setEditingTransaction(null);
        }}
      />

      {/* Footer space */}
      <div className="h-2" />
    </div>
    </CurrencyProvider>
  );
}

/* ---------- Morning Brief ---------- */
function MorningBrief({ briefing }: { briefing: ReturnType<typeof buildBriefing> }) {
  const bullets: { icon: React.ReactNode; text: React.ReactNode }[] = [];

  bullets.push({
    icon: <Sparkles size={14} className="text-sky-400" />,
    text: <span className="text-slate-300">{briefing.weatherLine}</span>,
  });

  bullets.push({
    icon: <CalendarClock size={14} className="text-emerald-400" />,
    text: (
      <span className="text-slate-300">
        You have{" "}
        <span className="font-semibold text-slate-100">
          {briefing.meetingCount} calendar {briefing.meetingCount === 1 ? "meeting" : "meetings"}
        </span>{" "}
        today.
      </span>
    ),
  });

  if (briefing.upcomingEvent) {
    bullets.push({
      icon: <Star size={14} className="text-amber-400" />,
      text: (
        <span className="text-slate-300">
          <span className="font-semibold text-emerald-300">{briefing.upcomingEvent.title}</span> is in{" "}
          <span className="font-semibold text-slate-100">
            {briefing.upcomingEvent.days} day{briefing.upcomingEvent.days === 1 ? "" : "s"}
          </span>
          {briefing.upcomingEvent.days === 0 && " (today!)"}
        </span>
      ),
    });
  }

  if (briefing.upcomingSubscription) {
    bullets.push({
      icon: <RefreshCw size={14} className="text-indigo-400" />,
      text: (
        <span className="text-slate-300">
          Your <span className="font-semibold text-indigo-300">{briefing.upcomingSubscription.payee}</span> subscription{" "}
          {briefing.upcomingSubscription.days === 0
            ? "renews today"
            : briefing.upcomingSubscription.days === 1
            ? "renews tomorrow"
            : `renews in ${briefing.upcomingSubscription.days} days`}
          .
        </span>
      ),
    });
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-white/10 p-5">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="absolute -left-6 -bottom-10 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-emerald-400 mb-3">
          <Sparkles size={16} />
          <span className="text-xs font-semibold uppercase tracking-widest">Morning Brief</span>
        </div>
        <h1 className="text-xl font-bold text-slate-50 leading-tight mb-3">
          {briefing.greeting}!
        </h1>
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className="mt-0.5 shrink-0">{b.icon}</span>
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Weather Card ---------- */
function WeatherCard({
  weather,
  city,
  loading,
  setLocation,
  searchCity,
}: {
  weather: WeatherDay[];
  city: string;
  loading: boolean;
  setLocation: (lat: number, lon: number, cityName?: string) => Promise<void>;
  searchCity: (query: string) => Promise<{ name: string; lat: number; lon: number; country: string }[]>;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lon: number; country: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchCity(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => handleSearch(value), 350);
    } else {
      setSearchResults([]);
    }
  };

  const selectCity = async (result: { name: string; lat: number; lon: number; country: string }) => {
    const displayName = result.country === "IN" ? `${result.name}, India` : `${result.name}, ${result.country}`;
    await setLocation(result.lat, result.lon, displayName);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <section className="rounded-2xl bg-gradient-to-br from-sky-900/40 to-slate-800 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">3-Day Forecast</p>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={14} className="text-emerald-400" />
            {showSearch ? (
              <div ref={searchRef} className="relative flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch(searchQuery);
                      if (e.key === "Escape") {
                        setShowSearch(false);
                        setSearchQuery("");
                        setSearchResults([]);
                      }
                    }}
                    placeholder="Type city name..."
                    className="w-full bg-slate-700/50 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button onClick={() => setShowSearch(false)} className="p-1.5 hover:bg-slate-700 rounded-lg">
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
                {searching && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-400 z-20">
                    Searching...
                  </div>
                )}
                {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-500 z-20">
                    No cities found
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <button
                        key={`${r.name}-${r.lat}-${i}`}
                        onClick={() => selectCity(r)}
                        className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center justify-between border-b border-white/5 last:border-0"
                      >
                        <span>{r.name}{r.country !== "IN" ? `, ${r.country}` : ""}</span>
                        <span className="text-emerald-400 text-xs font-medium">{r.country === "IN" ? "India" : r.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="text-sm text-slate-200 hover:text-emerald-400 transition-colors flex items-center gap-1.5 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg px-2 py-1"
              >
                {city}
                <Search size={12} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>
        {weather[0] && weatherIcon(weather[0].condition, 28)}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      ) : weather.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">Weather unavailable</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {weather.map((d, i) => (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 rounded-xl py-3 transition-all ${
                d.isToday ? "bg-white/10 ring-1 ring-emerald-500/30" : "bg-slate-800/40"
              }`}
            >
              <span className="text-[11px] font-medium text-slate-400">
                {d.isToday ? "Today" : d.day}
              </span>
              <div className="my-0.5">{weatherIcon(d.condition, 24)}</div>
              <span className="text-base font-bold text-slate-100">{d.tempHigh}°</span>
              <span className="text-[11px] text-slate-500">{d.tempLow}°</span>
              <span className="flex items-center gap-0.5 text-[10px] text-sky-400 mt-0.5">
                <CloudRain size={10} /> {d.rainChance}%
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Today's Schedule ---------- */
function ScheduleCard({ events, onSeeAll }: { events: ReturnType<typeof todayEvents>; onSeeAll: () => void }) {
  return (
    <section className="rounded-2xl bg-slate-800/60 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-100">Today's Schedule</h3>
        </div>
        <button
          onClick={onSeeAll}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
        >
          Calendar <ArrowRight size={12} />
        </button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Sun size={22} className="text-emerald-400" />
          </div>
          <p className="text-sm text-slate-300">No events today</p>
          <p className="text-xs text-slate-500">Enjoy your free time!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl bg-slate-900/50 px-3 py-2.5 animate-slide-in"
            >
              <div className="flex w-12 flex-col items-center justify-center rounded-lg bg-emerald-500/10 py-1">
                {e.time ? (
                  <>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {e.time.split(":")[0]}:{e.time.split(":")[1]}
                    </span>
                    <span className="text-[9px] text-emerald-500/70">
                      {Number(e.time.split(":")[0]) >= 12 ? "PM" : "AM"}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-emerald-400">All</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{e.title}</p>
                {e.location && (
                  <p className="truncate text-xs text-slate-400">{e.location}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Reminders Carousel ---------- */
function RemindersCarousel({
  reminders,
  onEditEvent,
  onEditSubscription,
  onDeleteEvent,
  onDeleteSubscription,
  onAddEvent,
  onAddSubscription,
}: {
  reminders: Reminder[];
  onEditEvent: (id: string) => void;
  onEditSubscription: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onDeleteSubscription: (id: string) => void;
  onAddEvent: () => void;
  onAddSubscription: () => void;
}) {
  if (reminders.length === 0) {
    return (
      <section className="rounded-2xl bg-slate-800/40 border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-100">Active Reminders</h3>
        </div>
        <p className="text-xs text-slate-400 text-center py-2">No upcoming reminders in the next 7 days</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAddEvent}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/25"
          >
            <Plus size={12} /> Add Event
          </button>
          <button
            onClick={onAddSubscription}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-300 transition-all hover:bg-indigo-500/25"
          >
            <Plus size={12} /> Add Subscription
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-100">Active Reminders</h3>
        <span className="text-xs text-slate-500">({reminders.length})</span>
      </div>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 snap-x">
        {reminders.map((r) => (
          <div
            key={r.id}
            className="snap-start shrink-0 w-44 rounded-2xl border p-4 transition-all hover:scale-[1.02] group"
            style={{
              background: `linear-gradient(135deg, ${r.accent}1a, rgba(30,41,59,0.6))`,
              borderColor: `${r.accent}40`,
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: `${r.accent}25`, color: r.accent }}
              >
                {reminderIcon(r.icon, 18)}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => r.kind === "event" ? onEditEvent(r.id.replace("evt-", "")) : onEditSubscription(r.id.replace("sub-", ""))}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => r.kind === "event" ? onDeleteEvent(r.id.replace("evt-", "")) : onDeleteSubscription(r.id.replace("sub-", ""))}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-100 truncate">{r.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{r.subtitle}</p>
            <div
              className="mt-3 h-1 w-full rounded-full overflow-hidden bg-slate-700/50"
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(15, 100 - (r.daysAway / 7) * 100)}%`,
                  background: r.accent,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Event Quick Sheet ---------- */
function EventQuickSheet({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: CalendarEvent | null;
  onClose: () => void;
  onSubmit: (e: Omit<CalendarEvent, "id" | "createdAt">) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "",
    date: todayISO(),
    time: "",
    type: "Meeting" as EventType,
    isAnnual: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && editing) {
      setForm({
        title: editing.title,
        date: editing.date,
        time: editing.time ?? "",
        type: editing.type,
        isAnnual: editing.isAnnual,
      });
    } else if (open) {
      setForm({ title: "", date: todayISO(), time: "", type: "Meeting", isAnnual: false });
    }
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const isAnnual = form.type === "Birthday" || form.type === "Anniversary" || form.isAnnual;
    try {
      await onSubmit({
        title: form.title.trim(),
        date: form.date,
        time: form.time || undefined,
        type: form.type,
        isAnnual,
        originalDate: isAnnual ? form.date : undefined,
      });
    } catch {
      // keep open on error
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit Event" : "Add Event"}>
      <form onSubmit={submit}>
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Mom's Birthday"
            className={inputClass}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Type">
          <div className="flex flex-wrap gap-1.5">
            {(["Meeting", "Birthday", "Anniversary", "Custom"] as EventType[]).map((t) => {
              const autoAnnual = t === "Birthday" || t === "Anniversary";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t, isAnnual: autoAnnual ? true : form.isAnnual })}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    form.type === t
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {reminderIcon(t === "Birthday" ? "cake" : t === "Anniversary" ? "heart" : "star", 12)} {t}
                </button>
              );
            })}
          </div>
        </Field>

        {(form.type === "Custom" || form.type === "Meeting") && (
          <button
            type="button"
            onClick={() => setForm({ ...form, isAnnual: !form.isAnnual })}
            className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 mt-3 transition-all ${
              form.isAnnual ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-slate-700/30"
            }`}
          >
            <span className="text-sm text-slate-200">Repeats every year</span>
            <span
              className={`relative h-5 w-9 rounded-full transition-colors ${
                form.isAnnual ? "bg-emerald-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  form.isAnnual ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
          </button>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Update Event" : "Save Event"}
        </button>
      </form>
    </Sheet>
  );
}

/* ---------- Transaction Quick Sheet ---------- */
function TransactionQuickSheet({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: Transaction | null;
  onClose: () => void;
  onSubmit: (t: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
}) {
  const { symbol, currency, setCurrency } = useCurrency();
  const [form, setForm] = useState({
    amount: "",
    payee: "",
    category: "Entertainment" as Transaction["category"],
    date: todayISO(),
    isSubscription: true,
    billingCycle: "Monthly" as Transaction["billingCycle"],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && editing) {
      setForm({
        amount: editing.amount.toString(),
        payee: editing.payee,
        category: editing.category,
        date: editing.date,
        isSubscription: editing.isSubscription,
        billingCycle: editing.billingCycle ?? "Monthly",
      });
    } else if (open) {
      setForm({ amount: "", payee: "", category: "Entertainment", date: todayISO(), isSubscription: true, billingCycle: "Monthly" });
    }
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0 || !form.payee.trim()) return;
    setSaving(true);

    let renewalDate: string | undefined;
    if (form.isSubscription) {
      if (editing?.renewalDate && editing.isSubscription && editing.billingCycle === form.billingCycle) {
        renewalDate = editing.renewalDate;
      } else {
        const d = new Date(form.date);
        if (form.billingCycle === "Weekly") {
          const next = new Date(d);
          next.setDate(next.getDate() + 7);
          renewalDate = next.toISOString().split("T")[0];
        } else if (form.billingCycle === "Annual") {
          const next = new Date(d);
          next.setFullYear(next.getFullYear() + 1);
          renewalDate = next.toISOString().split("T")[0];
        } else {
          const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
          renewalDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
        }
      }
    }

    try {
      await onSubmit({
        amount: amt,
        payee: form.payee.trim(),
        category: form.category,
        date: form.date,
        isSubscription: form.isSubscription,
        billingCycle: form.isSubscription ? form.billingCycle : undefined,
        renewalDate,
      });
    } catch {
      // keep open on error
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const categories: Transaction["category"][] = ["Food", "Rent", "Shopping", "Clothes", "Utilities", "Entertainment", "Misc"];
  const catColors: Record<string, string> = {
    Food: "#10b981",
    Rent: "#6366f1",
    Shopping: "#f59e0b",
    Clothes: "#ec4899",
    Utilities: "#06b6d4",
    Entertainment: "#8b5cf6",
    Misc: "#64748b",
  };

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit Subscription" : "Add Subscription"}>
      <form onSubmit={submit}>
        {/* Currency Selector */}
        <div className="mb-3">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Currency</label>
          <div className="flex gap-2 mt-1.5">
            {(["INR", "USD"] as CurrencyCode[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  currency === c
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {CURRENCY_CONFIG[c].symbol} {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{symbol}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className={`${inputClass} pl-7`}
                required
              />
            </div>
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
              required
            />
          </Field>
        </div>

        <Field label="Service">
          <input
            type="text"
            value={form.payee}
            onChange={(e) => setForm({ ...form, payee: e.target.value })}
            placeholder="e.g. Netflix, Spotify"
            className={inputClass}
            required
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, category: c })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  form.category === c
                    ? "text-white"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                }`}
                style={form.category === c ? { background: catColors[c] } : {}}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Billing Cycle">
          <div className="flex gap-1.5">
            {(["Weekly", "Monthly", "Annual"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, billingCycle: c })}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                  form.billingCycle === c
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Update Subscription" : "Add Subscription"}
        </button>
      </form>
    </Sheet>
  );
}
