import { useState } from "react";

type SubTab = "overview" | "ledger" | "journal" | "receivables" | "payables";

const TABS: { id: SubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "ledger", label: "General Ledger" },
  { id: "journal", label: "Journal Entries" },
  { id: "receivables", label: "Receivables" },
  { id: "payables", label: "Payables" },
];

function Th({ children, right, center, sortDir, onSort }: { children: React.ReactNode; right?: boolean; center?: boolean; sortDir?: "asc" | "desc" | null; onSort?: () => void; }) {
  return (
    <th onClick={onSort} style={{ padding: "10px 14px", textAlign: right ? "right" : center ? "center" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap", background: "#FAFBFD", cursor: onSort ? "pointer" : "default", userSelect: onSort ? "none" : "auto" }}>
      {onSort ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {children}
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, lineHeight: 1 }}>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
          </span>
        </span>
      ) : children}
    </th>
  );
}

const accounts = [
  { code: "1000", name: "Cash & Cash Equivalents", type: "Asset", balance: 48200.00, debit: 72400.00, credit: 24200.00 },
  { code: "1100", name: "Accounts Receivable", type: "Asset", balance: 56.02, debit: 142280.00, credit: 142223.98 },
  { code: "1200", name: "Inventory — Pharmaceutical", type: "Asset", balance: 38420.50, debit: 61340.00, credit: 22919.50 },
  { code: "1300", name: "Prepaid Expenses", type: "Asset", balance: 3200.00, debit: 5400.00, credit: 2200.00 },
  { code: "2000", name: "Accounts Payable", type: "Liability", balance: -4390.67, debit: 14820.00, credit: 19210.67 },
  { code: "2100", name: "Accrued Expenses", type: "Liability", balance: -1240.00, debit: 0, credit: 1240.00 },
  { code: "2200", name: "Tax Payable", type: "Liability", balance: -3120.00, debit: 0, credit: 3120.00 },
  { code: "3000", name: "Owner Equity", type: "Equity", balance: -75000.00, debit: 0, credit: 75000.00 },
  { code: "3100", name: "Retained Earnings", type: "Equity", balance: -6125.85, debit: 0, credit: 6125.85 },
  { code: "4000", name: "Sales Revenue", type: "Revenue", balance: -203900.00, debit: 0, credit: 203900.00 },
  { code: "4100", name: "Other Income", type: "Revenue", balance: -1240.00, debit: 0, credit: 1240.00 },
  { code: "5000", name: "Cost of Goods Sold", type: "Expense", balance: 101950.00, debit: 101950.00, credit: 0 },
  { code: "6000", name: "Salaries & Wages", type: "Expense", balance: 18400.00, debit: 18400.00, credit: 0 },
  { code: "6100", name: "Rent & Utilities", type: "Expense", balance: 5200.00, debit: 5200.00, credit: 0 },
  { code: "6200", name: "Depreciation", type: "Expense", balance: 1800.00, debit: 1800.00, credit: 0 },
];

const journalEntries = [
  { id: "JE-2025-0288", date: "2025-07-28", desc: "Sales invoice SINV-2025-0221 — Margaret Thompson", dr: "Accounts Receivable", cr: "Sales Revenue", amount: 20.28, ref: "SINV-2025-0221", by: "System" },
  { id: "JE-2025-0287", date: "2025-07-28", desc: "Cash receipt — SPAY-2025-0084", dr: "Cash & Cash Equivalents", cr: "Accounts Receivable", amount: 20.28, ref: "SPAY-2025-0084", by: "System" },
  { id: "JE-2025-0286", date: "2025-07-27", desc: "Purchase invoice PINV-2025-0058 — MedLine Pharma", dr: "Inventory — Pharmaceutical", cr: "Accounts Payable", amount: 2928.48, ref: "PINV-2025-0058", by: "System" },
  { id: "JE-2025-0285", date: "2025-07-27", desc: "Supplier payment PPAY-2025-0031 — MedLine Pharma", dr: "Accounts Payable", cr: "Cash & Cash Equivalents", amount: 2928.48, ref: "PPAY-2025-0031", by: "System" },
  { id: "JE-2025-0284", date: "2025-07-25", desc: "Stock write-off ADJ-2025-0041 — expired goods", dr: "Cost of Goods Sold", cr: "Inventory — Pharmaceutical", amount: 24.00, ref: "ADJ-2025-0041", by: "Jane Doe" },
  { id: "JE-2025-0283", date: "2025-07-22", desc: "Monthly rent & utilities", dr: "Rent & Utilities", cr: "Cash & Cash Equivalents", amount: 2600.00, ref: "UTIL-JUL22", by: "Jane Doe" },
];

const receivables = [
  { id: "P-002", name: "Robert Kiefer", invoice: "SINV-2025-0228", date: "2025-07-28", due: "2025-08-27", amount: 19.20, paid: 0, balance: 19.20, daysOut: 0 },
  { id: "P-004", name: "David Okafor", invoice: "SINV-2025-0220", date: "2025-07-27", due: "2025-08-26", amount: 37.85, paid: 0, balance: 37.85, daysOut: 1 },
];

const payables = [
  { id: "SUP-002", name: "GenPharm Ltd", invoice: "PINV-2025-0057", date: "2025-07-25", due: "2025-08-24", amount: 989.10, paid: 494.55, balance: 494.55, daysOut: 3 },
  { id: "SUP-003", name: "PharmaCo Inc", invoice: "PINV-2025-0056", date: "2025-07-22", due: "2025-08-21", amount: 3896.12, paid: 0, balance: 3896.12, daysOut: 6 },
];

// ─── Overview ─────────────────────────────────────────────────────────────────

function AccountsOverview() {
  const assets = accounts.filter(a => a.type === "Asset").reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts.filter(a => a.type === "Liability").reduce((s, a) => s + Math.abs(a.balance), 0);
  const equity = accounts.filter(a => a.type === "Equity").reduce((s, a) => s + Math.abs(a.balance), 0);
  const revenue = Math.abs(accounts.find(a => a.code === "4000")!.balance);
  const expenses = accounts.filter(a => a.type === "Expense").reduce((s, a) => s + a.balance, 0);
  const netIncome = revenue - expenses;

  return (
    <div className="flex flex-col gap-5">
      {/* Balance sheet summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Assets", value: `₹${assets.toLocaleString("en", { minimumFractionDigits: 2 })}`, color: "#1B6CA8", sub: "Current period" },
          { label: "Total Liabilities", value: `₹${liabilities.toFixed(2)}`, color: "#E65100", sub: "+ Equity = Assets" },
          { label: "Net Income (YTD)", value: `₹${netIncome.toFixed(2)}`, color: "#2E7D32", sub: `Revenue ₹${revenue.toFixed(0)} — Expenses ₹${expenses.toFixed(0)}` },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E8ECF4", borderTop: `3px solid ${k.color}`, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 700, color: k.color, letterSpacing: "-0.02em" }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart of accounts */}
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Chart of Accounts</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Code", "Account Name", "Type", "Debit Total", "Credit Total", "Balance"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {["Asset", "Liability", "Equity", "Revenue", "Expense"].map(type => {
              const group = accounts.filter(a => a.type === type);
              return [
                <tr key={`hdr-${type}`}>
                  <td colSpan={6} style={{ padding: "8px 14px", background: "#F0F6FF", fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.08em", textTransform: "uppercase" }}>{type}</td>
                </tr>,
                ...group.map(a => (
                  <tr key={a.code} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{a.code}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "#1A2436" }}>{a.name}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280" }}>{a.type}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#6B7280" }}>₹{a.debit.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#6B7280" }}>₹{a.credit.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: Math.abs(a.balance) > 0 ? "#1A2436" : "#9CA3AF" }}>
                      ${Math.abs(a.balance).toFixed(2)}
                    </td>
                  </tr>
                ))
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Journal ──────────────────────────────────────────────────────────────────

function Journal() {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortedRows = sortCol
    ? [...journalEntries].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : journalEntries;
  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Journal Entries</div>
          <button style={{ padding: "8px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Manual Entry</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>JE #</Th>
            <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
            <Th onSort={() => handleSort("desc")} sortDir={sortCol === "desc" ? sortDir : null}>Description</Th>
            <Th onSort={() => handleSort("dr")} sortDir={sortCol === "dr" ? sortDir : null}>Debit Account</Th>
            <Th onSort={() => handleSort("cr")} sortDir={sortCol === "cr" ? sortDir : null}>Credit Account</Th>
            <Th onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Amount</Th>
            <Th onSort={() => handleSort("ref")} sortDir={sortCol === "ref" ? sortDir : null}>Reference</Th>
            <Th onSort={() => handleSort("by")} sortDir={sortCol === "by" ? sortDir : null}>Posted By</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(je => (
              <tr key={je.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{je.id}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{je.date}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#1A2436", maxWidth: 220 }}>{je.desc}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#1B6CA8" }}>Dr: {je.dr}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#E65100" }}>Cr: {je.cr}</td>
                <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" }}>₹{je.amount.toFixed(2)}</td>
                <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{je.ref}</td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{je.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Receivables / Payables ───────────────────────────────────────────────────

function AgingTable({ data, type }: { data: typeof receivables; type: "receivable" | "payable" }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const total = data.reduce((s, r) => s + r.balance, 0);
  const sortedRows = sortCol
    ? [...data].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : data;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `Total ${type === "receivable" ? "Receivable" : "Payable"}`, value: `₹${total.toFixed(2)}`, color: type === "receivable" ? "#1B6CA8" : "#E65100" },
          { label: "Current (0–30d)", value: `₹${total.toFixed(2)}`, color: "#2E7D32" },
          { label: "Overdue (>30d)", value: "₹0.00", color: "#C62828" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E8ECF4", borderTop: `3px solid ${k.color}`, padding: "18px 22px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "Outfit", fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
          {type === "receivable" ? "Customer Receivables" : "Supplier Payables"} Ledger
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>{type === "receivable" ? "Patient" : "Supplier"}</Th>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>ID</Th>
            <Th onSort={() => handleSort("invoice")} sortDir={sortCol === "invoice" ? sortDir : null}>Invoice</Th>
            <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Invoice Date</Th>
            <Th onSort={() => handleSort("due")} sortDir={sortCol === "due" ? sortDir : null}>Due Date</Th>
            <Th onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Amount</Th>
            <Th onSort={() => handleSort("paid")} sortDir={sortCol === "paid" ? sortDir : null}>Paid</Th>
            <Th onSort={() => handleSort("balance")} sortDir={sortCol === "balance" ? sortDir : null}>Balance</Th>
            <Th onSort={() => handleSort("daysOut")} sortDir={sortCol === "daysOut" ? sortDir : null}>Days Outstanding</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{r.name}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{r.id}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{r.invoice}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.date}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{r.due}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436" }}>₹{r.amount.toFixed(2)}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#2E7D32" }}>₹{r.paid.toFixed(2)}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: r.balance > 0 ? "#C62828" : "#9CA3AF" }}>₹{r.balance.toFixed(2)}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: r.daysOut > 30 ? "#C62828" : "#6B7280" }}>{r.daysOut}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Accounts() {
  const [tab, setTab] = useState<SubTab>("overview");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Accounts & Finance</h1>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Chart of accounts · Ledger · Journal · Receivables · Payables</div>
      </div>
      <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 22px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#1B6CA8" : "#9CA3AF", borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <AccountsOverview />}
      {tab === "ledger" && <Journal />}
      {tab === "journal" && <Journal />}
      {tab === "receivables" && <AgingTable data={receivables} type="receivable" />}
      {tab === "payables" && <AgingTable data={payables} type="payable" />}
    </div>
  );
}
