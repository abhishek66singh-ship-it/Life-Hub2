import { addDays, daysBetween, nextAnnualOccurrence, todayISO, parseISO } from "./dates";
import type { CalendarEvent, Reminder, Transaction } from "../types";

const CURRENCY_SYMBOL = "₹";
const formatCurrency = (amount: number) => `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;

export interface BriefingData {
  greeting: string;
  weatherLine: string;
  meetingCount: number;
  upcomingEvent?: { title: string; days: number };
  upcomingSubscription?: { payee: string; days: number };
}

/**
 * The Morning Brief — a rule-based text summary aggregating weather,
 * today's meetings, upcoming annual events, and subscription renewals.
 */
export function buildBriefing(
  greeting: string,
  weather: { rainHour?: number; condition: string; rainChance: number; todayLabel: string },
  events: CalendarEvent[],
  subscriptions: Transaction[]
): BriefingData {
  const today = todayISO();

  // Today's meetings (non-annual, scheduled today)
  const todaysMeetings = events.filter(
    (e) => e.date === today && !e.isAnnual
  );

  // Nearest upcoming annual event within 30 days
  let upcomingEvent: BriefingData["upcomingEvent"];
  let minDays = Infinity;
  for (const e of events) {
    if (!e.isAnnual) continue;
    const next = nextAnnualOccurrence(e.originalDate ?? e.date, today);
    const d = daysBetween(today, next);
    if (d >= 0 && d < minDays) {
      minDays = d;
      upcomingEvent = { title: e.title, days: d };
    }
  }

  // Nearest upcoming subscription renewal
  let upcomingSubscription: BriefingData["upcomingSubscription"];
  let minSubDays = Infinity;
  for (const s of subscriptions) {
    if (!s.renewalDate) continue;
    const d = daysBetween(today, s.renewalDate);
    if (d >= 0 && d < minSubDays) {
      minSubDays = d;
      upcomingSubscription = { payee: s.payee, days: d };
    }
  }

  // Weather line
  let weatherLine: string;
  if (weather.rainHour !== undefined && weather.rainChance >= 40) {
    const hour12 = weather.rainHour % 12 || 12;
    const ampm = weather.rainHour >= 12 ? "PM" : "AM";
    weatherLine = `Expect showers around ${hour12} ${ampm} today, so grab an umbrella.`;
  } else if (weather.condition === "sunny") {
    weatherLine = `It's looking sunny and clear today — a great day to be outside.`;
  } else if (weather.condition === "cloudy") {
    weatherLine = `Skies are mostly cloudy today, but no rain expected.`;
  } else if (weather.condition === "partly") {
    weatherLine = `Partly cloudy skies today with comfortable temperatures.`;
  } else if (weather.condition === "storm") {
    weatherLine = `Stormy weather is moving in today — best to stay indoors if you can.`;
  } else {
    weatherLine = `Light rain possible today (${weather.rainChance}% chance).`;
  }

  return {
    greeting,
    weatherLine,
    meetingCount: todaysMeetings.length,
    upcomingEvent,
    upcomingSubscription,
  };
}

/**
 * Active reminders carousel:
 * - Annual events within 7 days
 * - Subscriptions renewing within 3 days
 */
export function buildReminders(
  events: CalendarEvent[],
  subscriptions: Transaction[]
): Reminder[] {
  const today = todayISO();
  const out: Reminder[] = [];

  for (const e of events) {
    if (!e.isAnnual) continue;
    const next = nextAnnualOccurrence(e.originalDate ?? e.date, today);
    const d = daysBetween(today, next);
    if (d >= 0 && d <= 7) {
      out.push({
        id: `evt-${e.id}`,
        kind: "event",
        title: e.title,
        subtitle:
          d === 0
            ? `Today — ${e.type.toLowerCase()}`
            : `In ${d} day${d === 1 ? "" : "s"} — ${e.type.toLowerCase()}`,
        daysAway: d,
        icon: e.type === "Birthday" ? "cake" : e.type === "Anniversary" ? "heart" : "star",
        accent: e.type === "Birthday" ? "#ec4899" : e.type === "Anniversary" ? "#f43f5e" : "#f59e0b",
      });
    }
  }

  for (const s of subscriptions) {
    if (!s.renewalDate) continue;
    const d = daysBetween(today, s.renewalDate);
    if (d >= 0 && d <= 3) {
      out.push({
        id: `sub-${s.id}`,
        kind: "subscription",
        title: s.payee,
        subtitle:
          d === 0
            ? `Renews today — ${formatCurrency(s.amount)}`
            : `Renews in ${d} day${d === 1 ? "" : "s"} — ${formatCurrency(s.amount)}`,
        daysAway: d,
        icon: "refresh",
        accent: "#6366f1",
      });
    }
  }

  return out.sort((a, b) => a.daysAway - b.daysAway);
}

/** Advance a renewal date by one billing cycle after it passes. */
export function advanceRenewalDate(
  renewalISO: string,
  cycle: Transaction["billingCycle"]
): string {
  if (cycle === "Weekly") return addDays(renewalISO, 7);
  if (cycle === "Annual") return addDays(renewalISO, 365);
  // Monthly — add roughly a month preserving day-of-month
  const d = parseISO(renewalISO);
  const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
    next.getDate()
  ).padStart(2, "0")}`;
}

export const todayEvents = (events: CalendarEvent[]): CalendarEvent[] => {
  const t = todayISO();
  return events
    .filter((e) => e.date === t)
    .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
};

export const eventsOnDay = (events: CalendarEvent[], iso: string): CalendarEvent[] =>
  events
    .filter((e) => e.date === iso)
    .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
