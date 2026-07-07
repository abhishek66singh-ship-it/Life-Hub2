import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2, Cake, Heart, Star, User, CalendarDays,
  Pencil, RefreshCw, Loader2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { Sheet, Field, inputClass } from "../components/ui";
import {
  monthMatrix, monthName, toISO, todayISO, isSameDay, formatDateLong,
  formatTime12, parseISO, nextAnnualOccurrence,
} from "../lib/dates";
import { eventsOnDay } from "../lib/engine";
import type { CalendarEvent, EventType } from "../types";

const DOW_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarScreen() {
  const { events, addEvent, updateEvent, deleteEvent, upsertGoogleEvents } = useApp();
  const { session } = useAuth();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(todayISO());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const matrix = useMemo(() => monthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

  // Map: ISO date -> has events (for dot indicators)
  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      set.add(e.date);
      if (e.isAnnual && e.originalDate) {
        // Show dots on the annual occurrence in the current view month
        const occ = nextAnnualOccurrence(e.originalDate, todayISO());
        if (parseISO(occ).getMonth() === viewMonth && parseISO(occ).getFullYear() === viewYear) {
          set.add(occ);
        }
      }
    }
    return set;
  }, [events, viewMonth, viewYear]);

  const selectedEvents = useMemo(() => eventsOnDay(events, selected), [events, selected]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const todayIsoStr = todayISO();

  const openAdd = () => {
    setEditingEvent(null);
    setSheetOpen(true);
  };

  const openEdit = (e: CalendarEvent) => {
    setEditingEvent(e);
    setSheetOpen(true);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const providerToken = session?.provider_token;
      if (!providerToken) {
        setSyncError(
          "Google Calendar sync needs the Calendar scope. Sign out and back in to grant it."
        );
        setSyncing(false);
        return;
      }

      // Fetch events from Google Calendar API (next 90 days)
      const timeMin = new Date().toISOString();
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      const gRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&timeMin=${timeMin}&timeMax=${timeMax.toISOString()}&maxResults=250&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${providerToken}` } }
      );

      if (!gRes.ok) {
        const errBody = await gRes.json().catch(() => ({}));
        throw new Error(errBody?.error?.message ?? `Google API error (${gRes.status})`);
      }

      const gData = await gRes.json();
      const incoming: Array<Omit<CalendarEvent, "id" | "createdAt">> = (gData.items ?? [])
        .filter((item: { start?: { dateTime?: string; date?: string } }) => {
          const dt = item.start?.dateTime;
          return dt !== undefined;
        })
        .map((item: {
          id: string;
          summary?: string;
          start?: { dateTime?: string };
          location?: string;
          description?: string;
        }) => {
          const dt = new Date(item.start!.dateTime!);
          const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
            dt.getDate()
          ).padStart(2, "0")}`;
          const time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
          return {
            title: item.summary ?? "Untitled event",
            date: iso,
            time,
            location: item.location ?? undefined,
            description: item.description ?? undefined,
            type: "Meeting" as const,
            isAnnual: false,
            source: "google" as const,
            googleEventId: item.id,
          };
        });

      await upsertGoogleEvents(incoming);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="px-4 pt-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Calendar</h1>
          <p className="text-xs text-slate-400 mt-0.5">Plan &amp; track events</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-white/10">
          <CalendarDays size={20} className="text-emerald-400" />
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between rounded-2xl bg-slate-800/60 border border-white/10 px-4 py-3">
        <button
          onClick={goPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => {
            setViewYear(today.getFullYear());
            setViewMonth(today.getMonth());
            setSelected(todayIsoStr);
          }}
          className="text-base font-semibold text-slate-100 hover:text-emerald-400 transition-colors"
        >
          {monthName(viewMonth)} {viewYear}
        </button>
        <button
          onClick={goNext}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1">
        {DOW_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1">
        {matrix.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const iso = toISO(d);
          const isToday = isSameDay(d, today);
          const isSelected = iso === selected;
          const hasEvents = eventDays.has(iso);
          return (
            <button
              key={i}
              onClick={() => setSelected(iso)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all tap-highlight-none ${
                isSelected
                  ? "bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20"
                  : isToday
                  ? "bg-emerald-500/15 text-emerald-300 font-semibold"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>{d.getDate()}</span>
              {hasEvents && (
                <span
                  className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                    isSelected ? "bg-white" : "bg-emerald-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail pane */}
      <section className="rounded-2xl bg-slate-800/60 border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{formatDateLong(selected)}</h3>
            <p className="text-xs text-slate-400">
              {selectedEvents.length === 0
                ? "No events"
                : `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1 rounded-lg bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-all hover:bg-indigo-500/25 disabled:opacity-60"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/25"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {syncError && (
          <div className="mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-300">
            {syncError}
          </div>
        )}

        {selectedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/50">
              <CalendarDays size={18} className="text-slate-500" />
            </div>
            <p className="text-xs text-slate-500">Nothing scheduled. Tap "Add" to create one.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedEvents.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                onEdit={() => openEdit(e)}
                onDelete={() => deleteEvent(e.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <EventSheet
        open={sheetOpen}
        editing={editingEvent}
        defaultDate={selected}
        onClose={() => setSheetOpen(false)}
        onSubmit={async (e) => {
          if (editingEvent) {
            await updateEvent(editingEvent.id, e);
          } else {
            await addEvent(e);
          }
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

/* ---------- Event row ---------- */
const typeIcon = (type: EventType) => {
  switch (type) {
    case "Birthday": return <Cake size={14} className="text-pink-400" />;
    case "Anniversary": return <Heart size={14} className="text-rose-400" />;
    case "Meeting": return <User size={14} className="text-emerald-400" />;
    default: return <Star size={14} className="text-amber-400" />;
  }
};

function EventRow({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit: () => void; onDelete: () => void }) {
  return (
    <li className="group flex items-start gap-3 rounded-xl bg-slate-900/50 px-3 py-3 transition-all hover:bg-slate-900/80">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/60 shrink-0 mt-0.5">
        {typeIcon(event.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-100">{event.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
          {event.time && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> {formatTime12(event.time)}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {event.location}
            </span>
          )}
          {event.isAnnual && (
            <span className="flex items-center gap-1 text-emerald-400/80">
              <Star size={11} /> Annual
            </span>
          )}
        </div>
        {event.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{event.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        {event.source !== "google" && (
          <button
            onClick={onEdit}
            className="text-slate-600 hover:text-emerald-400 transition-colors p-1"
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="text-slate-600 hover:text-rose-400 transition-all p-1"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

/* ---------- Event Sheet (Add + Edit) ---------- */
interface EventForm {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  type: EventType;
  isAnnual: boolean;
}

function EventSheet({
  open, editing, defaultDate, onClose, onSubmit,
}: {
  open: boolean;
  editing: CalendarEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (e: Omit<CalendarEvent, "id" | "createdAt">) => Promise<void>;
}) {
  const [form, setForm] = useState<EventForm>({
    title: "",
    date: defaultDate,
    time: "",
    location: "",
    description: "",
    type: "Meeting",
    isAnnual: false,
  });
  const [saving, setSaving] = useState(false);

  // Populate form when editing or opening
  useEffect(() => {
    if (open && editing) {
      setForm({
        title: editing.title,
        date: editing.date,
        time: editing.time ?? "",
        location: editing.location ?? "",
        description: editing.description ?? "",
        type: editing.type,
        isAnnual: editing.isAnnual,
      });
    } else if (open) {
      setForm({ title: "", date: defaultDate, time: "", location: "", description: "", type: "Meeting", isAnnual: false });
    }
  }, [open, editing, defaultDate]);

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
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
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

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit Event" : "Add Event"}>
      <form onSubmit={submit}>
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Lunch with Sarah"
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

        <Field label="Location">
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Olive Garden"
            className={inputClass}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional notes"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </Field>

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
                  {typeIcon(t)} {t}
                </button>
              );
            })}
          </div>
        </Field>

        {(form.type === "Custom" || form.type === "Meeting") && (
          <button
            type="button"
            onClick={() => setForm({ ...form, isAnnual: !form.isAnnual })}
            className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 transition-all ${
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

        {(form.type === "Birthday" || form.type === "Anniversary") && (
          <p className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {form.type}s automatically repeat every year. We'll remind you 7 days before.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Update Event" : "Save Event"}
        </button>
      </form>
    </Sheet>
  );
}
