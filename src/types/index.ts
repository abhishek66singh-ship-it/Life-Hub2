export type TabKey = "home" | "finances" | "calendar";

export type CurrencyCode = "INR" | "USD";

export const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; name: string }> = {
  INR: { symbol: "₹", name: "Indian Rupee" },
  USD: { symbol: "$", name: "US Dollar" },
};

export type ExpenseCategory =
  | "Food"
  | "Rent"
  | "Shopping"
  | "Clothes"
  | "Utilities"
  | "Entertainment"
  | "Misc";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Rent",
  "Shopping",
  "Clothes",
  "Utilities",
  "Entertainment",
  "Misc",
];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: "#10b981",
  Rent: "#6366f1",
  Shopping: "#f59e0b",
  Clothes: "#ec4899",
  Utilities: "#06b6d4",
  Entertainment: "#8b5cf6",
  Misc: "#64748b",
};

export type BillingCycle = "Weekly" | "Monthly" | "Annual";

export interface Transaction {
  id: string;
  amount: number;
  payee: string;
  category: ExpenseCategory;
  date: string; // ISO date (YYYY-MM-DD)
  isSubscription: boolean;
  billingCycle?: BillingCycle;
  renewalDate?: string; // ISO date — next renewal
  note?: string;
  createdAt: string;
}

export type EventType = "Birthday" | "Anniversary" | "Custom" | "Meeting";
export type EventSource = "manual" | "google";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date (YYYY-MM-DD)
  time?: string; // HH:MM
  location?: string;
  description?: string;
  type: EventType;
  isAnnual: boolean; // Birthdays & Anniversaries repeat yearly
  originalDate?: string; // For annual events, the original date
  source?: EventSource; // 'manual' or 'google'
  googleEventId?: string; // Google Calendar event ID for dedup
  createdAt: string;
}

export interface WeatherDay {
  day: string; // "Mon", "Tue"
  date: number; // day of month
  tempHigh: number;
  tempLow: number;
  condition: "sunny" | "cloudy" | "rain" | "partly" | "storm";
  rainChance: number;
  isToday: boolean;
  rainHour?: number; // hour of day for "rain around X PM"
}

export interface Reminder {
  id: string;
  kind: "event" | "subscription";
  title: string;
  subtitle: string;
  daysAway: number;
  icon: string;
  accent: string;
}
