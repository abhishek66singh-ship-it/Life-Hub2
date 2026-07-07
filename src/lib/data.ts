import { addDays, dayShort, parseISO, todayISO } from "./dates";
import type { CalendarEvent, Transaction, WeatherDay } from "../types";

/** Mock 3-day weather forecast derived from today's real date. */
export function getWeather(): WeatherDay[] {
  const t = todayISO();
  const base = parseISO(t);
  const todayDow = dayShort(base);
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Pseudo-random but stable per day
  const seed = base.getFullYear() * 372 + (base.getMonth() + 1) * 31 + base.getDate();
  const rand = (n: number) => {
    const x = Math.sin(seed + n) * 10000;
    return x - Math.floor(x);
  };

  const conditions: WeatherDay["condition"][] = ["sunny", "partly", "cloudy", "rain", "storm"];
  const days: WeatherDay[] = [];

  for (let i = 0; i < 3; i++) {
    const d = parseISO(addDays(t, i));
    const condIdx = Math.floor(rand(i + 1) * conditions.length);
    const cond = conditions[condIdx];
    const high = 18 + Math.floor(rand(i + 2) * 14); // 18–31
    const low = high - 6 - Math.floor(rand(i + 3) * 4);
    const rainChance =
      cond === "rain" || cond === "storm"
        ? 55 + Math.floor(rand(i + 4) * 35)
        : cond === "partly"
        ? 10 + Math.floor(rand(i + 4) * 20)
        : Math.floor(rand(i + 4) * 15);

    days.push({
      day: i === 0 ? todayDow : dayLabels[(base.getDay() + i) % 7],
      date: d.getDate(),
      tempHigh: high,
      tempLow: low,
      condition: cond,
      rainChance,
      isToday: i === 0,
      rainHour: rainChance >= 40 ? 10 + Math.floor(rand(i + 5) * 8) : undefined,
    });
  }
  return days;
}

/** Initial demo data so the app feels alive on first load. */
export function seedTransactions(): Transaction[] {
  const t = todayISO();
  const now = new Date().toISOString();

  const subRenewal1 = addDays(t, 3); // Netflix — renews in 3 days (triggers reminder)
  const subRenewal2 = addDays(t, 18);
  const subRenewal3 = addDays(t, 1); // Spotify — renews tomorrow (triggers reminder)

  return [
    { id: "s1", amount: 15.99, payee: "Netflix", category: "Entertainment", date: addDays(t, -2), isSubscription: true, billingCycle: "Monthly", renewalDate: subRenewal1, createdAt: now },
    { id: "s2", amount: 9.99, payee: "Spotify", category: "Entertainment", date: addDays(t, -5), isSubscription: true, billingCycle: "Monthly", renewalDate: subRenewal3, createdAt: now },
    { id: "s3", amount: 120, payee: "Adobe Creative", category: "Utilities", date: addDays(t, -12), isSubscription: true, billingCycle: "Annual", renewalDate: subRenewal2, createdAt: now },
    { id: "t1", amount: 14.5, payee: "Starbucks", category: "Food", date: addDays(t, -1), isSubscription: false, createdAt: now },
    { id: "t2", amount: 62.3, payee: "Whole Foods", category: "Food", date: addDays(t, -3), isSubscription: false, createdAt: now },
    { id: "t3", amount: 89.99, payee: "Uniqlo", category: "Clothes", date: addDays(t, -6), isSubscription: false, createdAt: now },
    { id: "t4", amount: 1450, payee: "Apartment Rent", category: "Rent", date: addDays(t, -8), isSubscription: false, createdAt: now },
    { id: "t5", amount: 42.1, payee: "Shell Gas", category: "Utilities", date: addDays(t, -4), isSubscription: false, createdAt: now },
    { id: "t6", amount: 28.75, payee: "Amazon", category: "Shopping", date: addDays(t, -2), isSubscription: false, createdAt: now },
    { id: "t7", amount: 12.0, payee: "Chipotle", category: "Food", date: t, isSubscription: false, createdAt: now },
  ];
}

export function seedEvents(): CalendarEvent[] {
  const t = todayISO();
  const now = new Date().toISOString();

  // Birthday in 4 days (annual) — triggers reminder
  const bdayOrig = `${new Date().getFullYear() - 30}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(
    Math.min(28, new Date().getDate() + 4)
  ).padStart(2, "0")}`;

  // Anniversary in 6 days (annual) — triggers reminder
  const annivOrig = `${new Date().getFullYear() - 5}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(
    Math.min(28, new Date().getDate() + 6)
  ).padStart(2, "0")}`;

  return [
    { id: "e1", title: "Team Standup", date: t, time: "09:00", location: "Zoom", description: "Daily sync with engineering", type: "Meeting", isAnnual: false, createdAt: now },
    { id: "e2", title: "Design Review", date: t, time: "14:30", location: "Conference Room B", description: "Review Q3 mockups", type: "Meeting", isAnnual: false, createdAt: now },
    { id: "e3", title: "Dad's Birthday", date: bdayOrig, type: "Birthday", isAnnual: true, originalDate: bdayOrig, createdAt: now },
    { id: "e4", title: "Wedding Anniversary", date: annivOrig, type: "Anniversary", isAnnual: true, originalDate: annivOrig, createdAt: now },
    { id: "e5", title: "Dentist Appointment", date: addDays(t, 2), time: "11:00", location: "Bright Smile Clinic", type: "Custom", isAnnual: false, createdAt: now },
    { id: "e6", title: "Lunch with Sarah", date: addDays(t, 1), time: "12:30", location: "Olive Garden", type: "Custom", isAnnual: false, createdAt: now },
  ];
}
