export type SubTab = "overview" | "ledger" | "journal" | "receivables" | "payables";

export const TABS: { id: SubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "ledger", label: "General Ledger" },
  { id: "journal", label: "Journal Entries" },
  { id: "receivables", label: "Receivables" },
  { id: "payables", label: "Payables" },
];

export type LedgerRow = {
  id: string;
  name: string;
  invoice: string;
  date: string;
  due: string;
  amount: number;
  paid: number;
  balance: number;
  daysOut: number;
};

export const accounts = [
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

export const journalEntries = [
  { id: "JE-2025-0288", date: "2025-07-28", desc: "Sales invoice SINV-2025-0221 — Margaret Thompson", dr: "Accounts Receivable", cr: "Sales Revenue", amount: 20.28, ref: "SINV-2025-0221", by: "System" },
  { id: "JE-2025-0287", date: "2025-07-28", desc: "Cash receipt — SPAY-2025-0084", dr: "Cash & Cash Equivalents", cr: "Accounts Receivable", amount: 20.28, ref: "SPAY-2025-0084", by: "System" },
  { id: "JE-2025-0286", date: "2025-07-27", desc: "Purchase invoice PINV-2025-0058 — MedLine Pharma", dr: "Inventory — Pharmaceutical", cr: "Accounts Payable", amount: 2928.48, ref: "PINV-2025-0058", by: "System" },
  { id: "JE-2025-0285", date: "2025-07-27", desc: "Supplier payment PPAY-2025-0031 — MedLine Pharma", dr: "Accounts Payable", cr: "Cash & Cash Equivalents", amount: 2928.48, ref: "PPAY-2025-0031", by: "System" },
  { id: "JE-2025-0284", date: "2025-07-25", desc: "Stock write-off ADJ-2025-0041 — expired goods", dr: "Cost of Goods Sold", cr: "Inventory — Pharmaceutical", amount: 24.00, ref: "ADJ-2025-0041", by: "Jane Doe" },
  { id: "JE-2025-0283", date: "2025-07-22", desc: "Monthly rent & utilities", dr: "Rent & Utilities", cr: "Cash & Cash Equivalents", amount: 2600.00, ref: "UTIL-JUL22", by: "Jane Doe" },
];

export const receivables: LedgerRow[] = [
  { id: "P-002", name: "Robert Kiefer", invoice: "SINV-2025-0228", date: "2025-07-28", due: "2025-08-27", amount: 19.20, paid: 0, balance: 19.20, daysOut: 0 },
  { id: "P-004", name: "David Okafor", invoice: "SINV-2025-0220", date: "2025-07-27", due: "2025-08-26", amount: 37.85, paid: 0, balance: 37.85, daysOut: 1 },
];

export const payables: LedgerRow[] = [
  { id: "SUP-002", name: "GenPharm Ltd", invoice: "PINV-2025-0057", date: "2025-07-25", due: "2025-08-24", amount: 989.10, paid: 494.55, balance: 494.55, daysOut: 3 },
  { id: "SUP-003", name: "PharmaCo Inc", invoice: "PINV-2025-0056", date: "2025-07-22", due: "2025-08-21", amount: 3896.12, paid: 0, balance: 3896.12, daysOut: 6 },
];
