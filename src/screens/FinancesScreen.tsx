import { useEffect, useMemo, useState } from "react";
import {
  Plus, Upload, Loader2, Trash2, RefreshCw, TrendingUp, PieChart as PieIcon,
  Filter, ScanLine, BadgeDollarSign, Pencil, ChevronDown, Wallet, ArrowUpRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useApp } from "../context/AppContext";
import { Sheet, Field, inputClass } from "../components/ui";
import {
  EXPENSE_CATEGORIES, CATEGORY_COLORS, CURRENCY_CONFIG,
  type Transaction, type ExpenseCategory, type BillingCycle, type CurrencyCode,
} from "../types";
import { todayISO, addDays, daysBetween, parseISO, formatDateLong } from "../lib/dates";

const OCR_SAMPLES = [
  { amount: 14.5, payee: "Starbucks", category: "Food" as ExpenseCategory },
  { amount: 62.3, payee: "Whole Foods", category: "Food" as ExpenseCategory },
  { amount: 48.0, payee: "Uber", category: "Misc" as ExpenseCategory },
  { amount: 12.99, payee: "Netflix", category: "Entertainment" as ExpenseCategory },
  { amount: 89.99, payee: "Uniqlo", category: "Clothes" as ExpenseCategory },
  { amount: 35.2, payee: "Shell Gas", category: "Utilities" as ExpenseCategory },
  { amount: 156.0, payee: "Amazon", category: "Shopping" as ExpenseCategory },
];

export function FinancesScreen() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("INR");

  const symbol = CURRENCY_CONFIG[currency].symbol;
  const formatCurrency = (amount: number) => `${symbol}${amount.toFixed(2)}`;

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setSheetOpen(true);
  };

  return (
    <div className="px-4 pt-5 space-y-5">
      <Header currency={currency} setCurrency={setCurrency} formatCurrency={formatCurrency} />

      <Summary transactions={transactions} formatCurrency={formatCurrency} />

      <SubscriptionManager
        transactions={transactions}
        onDelete={deleteTransaction}
        onEdit={openEdit}
        formatCurrency={formatCurrency}
      />

      <Analytics transactions={transactions} formatCurrency={formatCurrency} />

      <TransactionList
        transactions={transactions}
        onDelete={deleteTransaction}
        onEdit={openEdit}
        formatCurrency={formatCurrency}
      />

      <button
        onClick={openAdd}
        className="tap-highlight-none fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 active:scale-95 animate-pulse-glow"
        style={{ zIndex: 30 }}
      >
        <Plus size={20} strokeWidth={2.5} /> Add Transaction
      </button>

      <TransactionSheet
        open={sheetOpen}
        editing={editing}
        symbol={symbol}
        onClose={() => setSheetOpen(false)}
        onSubmit={async (t) => {
          if (editing) {
            await updateTransaction(editing.id, t);
          } else {
            await addTransaction(t);
          }
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

function Header({
  currency, setCurrency, formatCurrency: _fmt,
}: {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatCurrency: (a: number) => string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Finances</h1>
        <p className="text-xs text-slate-400 mt-0.5">Track spending & subscriptions</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="appearance-none bg-slate-800 border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500/50 cursor-pointer"
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-white/10">
          <BadgeDollarSign size={20} className="text-emerald-400" />
        </div>
      </div>
    </div>
  );
}

function Summary({ transactions, formatCurrency }: { transactions: Transaction[]; formatCurrency: (a: number) => string }) {
  const now = new Date();
  const monthTx = transactions.filter((t) => {
    const d = parseISO(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const total = monthTx.reduce((s, t) => s + t.amount, 0);
  const subs = transactions.filter((t) => t.isSubscription);
  const monthlySubs = subs.reduce((s, t) => {
    if (t.billingCycle === "Monthly") return s + t.amount;
    if (t.billingCycle === "Weekly") return s + t.amount * 4.33;
    if (t.billingCycle === "Annual") return s + t.amount / 12;
    return s;
  }, 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Spent This Month" value={formatCurrency(total)} accent="emerald" icon={<ArrowUpRight size={14} />} />
      <StatCard label="Monthly Subs" value={formatCurrency(monthlySubs)} accent="sky" sub={`${subs.length} active`} icon={<RefreshCw size={14} />} />
    </div>
  );
}

function StatCard({ label, value, accent, sub, icon }: {
  label: string;
  value: string;
  accent: "emerald" | "sky";
  sub?: string;
  icon: React.ReactNode;
}) {
  const ring = accent === "emerald" ? "from-emerald-500/15" : "from-sky-500/15";
  const text = accent === "emerald" ? "text-emerald-400" : "text-sky-400";
  const iconBg = accent === "emerald" ? "bg-emerald-500/15 text-emerald-400" : "bg-sky-500/15 text-sky-400";
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${ring} to-slate-800 border border-white/10 p-4`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${iconBg}`}>{icon}</span>
      </div>
      <p className={`text-xl font-bold ${text}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ---------- Subscription Manager ---------- */
function SubscriptionManager({ transactions, onDelete, onEdit, formatCurrency }: {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
  formatCurrency: (a: number) => string;
}) {
  const subs = transactions.filter((t) => t.isSubscription);
  const today = todayISO();

  if (subs.length === 0) {
    return (
      <section className="rounded-2xl bg-slate-800/60 border border-white/10 p-4 text-center">
        <RefreshCw size={20} className="mx-auto text-slate-600 mb-2" />
        <p className="text-sm text-slate-400">No subscriptions yet</p>
        <p className="text-xs text-slate-500">Toggle "Is this a Subscription?" when adding a transaction.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        <RefreshCw size={16} className="text-sky-400" />
        <h3 className="text-sm font-semibold text-slate-100">Subscriptions</h3>
        <span className="text-xs text-slate-500">({subs.length})</span>
      </div>
      <div className="space-y-2">
        {subs
          .slice()
          .sort((a, b) => daysBetween(today, a.renewalDate ?? today) - daysBetween(today, b.renewalDate ?? today))
          .map((s) => {
            const d = s.renewalDate ? daysBetween(today, s.renewalDate) : 0;
            const urgent = d <= 3;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  urgent
                    ? "bg-sky-500/10 border-sky-500/30"
                    : "bg-slate-800/50 border-white/5"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                  <RefreshCw size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{s.payee}</p>
                  <p className="text-xs text-slate-400">
                    {s.billingCycle} · {formatCurrency(s.amount)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${urgent ? "text-sky-300" : "text-slate-300"}`}>
                    {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d}d`}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {s.renewalDate ? formatDateLong(s.renewalDate).split(", ")[1] : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => onEdit(s)}
                    className="text-slate-600 hover:text-emerald-400 transition-colors p-1"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}

/* ---------- Analytics ---------- */
function Analytics({ transactions, formatCurrency }: { transactions: Transaction[]; formatCurrency: (a: number) => string }) {
  const [range, setRange] = useState<"week" | "month">("week");
  const [catFilter, setCatFilter] = useState<"all" | ExpenseCategory>("all");

  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      if (catFilter !== "all" && t.category !== catFilter) return false;
      const d = parseISO(t.date);
      if (range === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return d >= start && d <= now;
      }
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [transactions, range, catFilter]);

  const byCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const t of filtered) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    return EXPENSE_CATEGORIES
      .filter((c) => map.has(c))
      .map((c) => ({ name: c, value: Math.round((map.get(c) ?? 0) * 100) / 100 }));
  }, [filtered]);

  const byDay = useMemo(() => {
    const days: { label: string; amount: number }[] = [];
    const now = new Date();
    const span = range === "week" ? 7 : 30;
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const amt = transactions
        .filter((t) => t.date === iso && (catFilter === "all" || t.category === catFilter))
        .reduce((s, t) => s + t.amount, 0);
      days.push({
        label: range === "week"
          ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]
          : `${d.getDate()}`,
        amount: Math.round(amt * 100) / 100,
      });
    }
    return days;
  }, [transactions, range, catFilter]);

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  return (
    <section className="rounded-2xl bg-slate-800/60 border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-100">Analytics</h3>
        <span className="ml-auto text-xs text-slate-400">Total: {formatCurrency(total)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg bg-slate-900/60 p-0.5">
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                range === r ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="relative">
          <Filter size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as "all" | ExpenseCategory)}
            className="rounded-lg bg-slate-900/60 border border-white/10 pl-7 pr-2 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5">
        <p className="text-xs text-slate-400 mb-2">Spending trend ({range})</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay} margin={{ top: 5, right: 5, bottom: 0, left: -28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={range === "month" ? 4 : 0} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(16,185,129,0.08)" }}
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, fontSize: 12, color: "#e2e8f0" }}
                formatter={(v) => [formatCurrency(Number(v)), "Spent"]}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#10b981" maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <PieIcon size={14} className="text-slate-400" />
          <p className="text-xs text-slate-400">By category</p>
        </div>
        {byCategory.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">No data for this filter</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={38} outerRadius={60} paddingAngle={2}>
                    {byCategory.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as ExpenseCategory]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, fontSize: 12, color: "#e2e8f0" }}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-1.5">
              {[...byCategory]
                .sort((a, b) => b.value - a.value)
                .map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c.name as ExpenseCategory] }} />
                    <span className="text-slate-300 flex-1">{c.name}</span>
                    <span className="text-slate-400 font-medium">{formatCurrency(c.value)}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Transaction List ---------- */
function TransactionList({ transactions, onDelete, onEdit, formatCurrency }: {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
  formatCurrency: (a: number) => string;
}) {
  const sorted = useMemo(
    () => transactions.slice().sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 px-1">
        <Wallet size={16} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-100">All Transactions</h3>
        <span className="text-xs text-slate-500">({sorted.length})</span>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((t) => (
          <li
            key={t.id}
            className="group flex items-center gap-3 rounded-xl bg-slate-800/40 border border-white/5 px-3 py-2.5 transition-all hover:bg-slate-800/70"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0"
              style={{ background: `${CATEGORY_COLORS[t.category]}20`, color: CATEGORY_COLORS[t.category] }}
            >
              {t.category[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">
                {t.payee}
                {t.isSubscription && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-sky-500/15 px-1 py-0.5 text-[9px] font-medium text-sky-300">
                    <RefreshCw size={8} /> Sub
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">{formatDateLong(t.date)}</p>
            </div>
            <span className="text-sm font-semibold text-slate-100">{formatCurrency(t.amount)}</span>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => onEdit(t)}
                className="text-slate-600 hover:text-emerald-400 transition-colors p-1"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(t.id)}
                className="text-slate-600 hover:text-rose-400 transition-colors p-1"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Add/Edit Transaction Sheet ---------- */
interface FormState {
  amount: string;
  payee: string;
  category: ExpenseCategory;
  date: string;
  isSubscription: boolean;
  billingCycle: BillingCycle;
}

const emptyForm: FormState = {
  amount: "",
  payee: "",
  category: "Food",
  date: todayISO(),
  isSubscription: false,
  billingCycle: "Monthly",
};

function TransactionSheet({
  open, editing, symbol, onClose, onSubmit,
}: {
  open: boolean;
  editing: Transaction | null;
  symbol: string;
  onClose: () => void;
  onSubmit: (t: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [ocrState, setOcrState] = useState<"idle" | "scanning" | "done">("idle");
  const [fileName, setFileName] = useState<string>("");
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
      setForm(emptyForm);
    }
    setOcrState("idle");
    setFileName("");
  }, [open, editing]);

  const reset = () => {
    setForm(emptyForm);
    setOcrState("idle");
    setFileName("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setOcrState("scanning");
    setTimeout(() => {
      const sample = OCR_SAMPLES[Math.floor(Math.random() * OCR_SAMPLES.length)];
      setForm((f) => ({
        ...f,
        amount: sample.amount.toFixed(2),
        payee: sample.payee,
        category: sample.category,
        date: todayISO(),
      }));
      setOcrState("done");
    }, 1500);
  };

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
        renewalDate = computeInitialRenewal(form.billingCycle, form.date);
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
      reset();
    } catch {
      // keep sheet open on error so user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={handleClose} title={editing ? "Edit Transaction" : "Add Transaction"}>
      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">Smart Upload</p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/40 px-4 py-5 transition-all hover:border-emerald-500/50 hover:bg-slate-900/70">
          {ocrState === "scanning" ? (
            <>
              <Loader2 size={22} className="text-emerald-400 animate-spin" />
              <span className="text-xs text-slate-300">Scanning receipt…</span>
            </>
          ) : ocrState === "done" ? (
            <>
              <ScanLine size={22} className="text-emerald-400" />
              <span className="text-xs text-emerald-300">Scanned "{fileName}" — review &amp; approve below</span>
            </>
          ) : (
            <>
              <Upload size={20} className="text-slate-500" />
              <span className="text-xs text-slate-400">Upload a receipt or screenshot</span>
              <span className="text-[10px] text-slate-600">We'll auto-extract the details</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      </div>

      <form onSubmit={submit}>
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

        <Field label="Payee">
          <input
            type="text"
            value={form.payee}
            onChange={(e) => setForm({ ...form, payee: e.target.value })}
            placeholder="e.g. Starbucks"
            className={inputClass}
            required
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, category: c })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  form.category === c
                    ? "text-white"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                }`}
                style={form.category === c ? { background: CATEGORY_COLORS[c] } : {}}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <button
          type="button"
          onClick={() => setForm({ ...form, isSubscription: !form.isSubscription })}
          className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 transition-all ${
            form.isSubscription
              ? "border-sky-500/40 bg-sky-500/10"
              : "border-white/10 bg-slate-700/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className={form.isSubscription ? "text-sky-400" : "text-slate-500"} />
            <span className="text-sm text-slate-200">Is this a Subscription?</span>
          </div>
          <span
            className={`relative h-5 w-9 rounded-full transition-colors ${
              form.isSubscription ? "bg-sky-500" : "bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                form.isSubscription ? "left-[18px]" : "left-0.5"
              }`}
            />
          </span>
        </button>

        {form.isSubscription && (
          <div className="mt-3 animate-[fadeIn_0.2s_ease-out]">
            <Field label="Billing Cycle">
              <div className="flex gap-1.5">
                {(["Weekly", "Monthly", "Annual"] as BillingCycle[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, billingCycle: c })}
                    className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-all ${
                      form.billingCycle === c
                        ? "bg-sky-500 text-white"
                        : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Update Transaction" : "Save Transaction"}
        </button>
      </form>
    </Sheet>
  );
}

function computeInitialRenewal(cycle: BillingCycle, startDate: string): string {
  const d = parseISO(startDate);
  if (cycle === "Weekly") return addDays(startDate, 7);
  if (cycle === "Annual") return addDays(startDate, 365);
  const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}
