/**
 * Distributor detail page API client (Suppliers module).
 *
 * The detail page loads a small KPI summary when a distributor is opened, then each tab's list
 * the first time that tab is shown. Every list is filtered and paginated by the server.
 */
import { apiFetch } from "./api";

const DIST = "/api/v1/distributors";
const PUR = "/api/v1/purchases";

// ── Query ─────────────────────────────────────────────────────────────────────

export interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  /** Backend status value (not the UI label). */
  status?: string;
  /** Backend payment_mode value (payments only). */
  paymentMode?: string;
  /** Inclusive YYYY-MM-DD bounds. */
  dateFrom?: string;
  dateTo?: string;
}

export interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

function listUrl(path: string, distributorId: string, q: ListQuery): string {
  const p = new URLSearchParams({
    distributor_id: distributorId,
    page: String(q.page),
    page_size: String(q.pageSize),
  });
  if (q.search?.trim()) p.set("search", q.search.trim());
  if (q.status) p.set("status", q.status);
  if (q.paymentMode) p.set("payment_mode", q.paymentMode);
  if (q.dateFrom) p.set("date_from", q.dateFrom);
  if (q.dateTo) p.set("date_to", q.dateTo);
  return `${PUR}/${path}?${p}`;
}

// ── UI label <-> backend value maps (the filter dropdowns show the labels) ────

export const ORDER_STATUS_FILTER: Record<string, string> = {
  Draft: "draft", Pending: "sent", "Partially Received": "partial", Completed: "received", Cancelled: "cancelled",
};
export const INVOICE_STATUS_FILTER: Record<string, string> = {
  Unpaid: "pending", "Part Paid": "partial", Paid: "paid",
};
export const RETURN_STATUS_FILTER: Record<string, string> = {
  Draft: "draft", Submitted: "submitted", Approved: "approved", "Credit Issued": "credited", Cancelled: "cancelled",
};
export const PAYMENT_STATUS_FILTER: Record<string, string> = {
  Cleared: "Cleared", Adjusted: "Adjusted", Pending: "Pending",
};
export const PAYMENT_MODE_FILTER: Record<string, string> = {
  "Bank Transfer": "bank_transfer", UPI: "upi", Cheque: "cheque", Cash: "cash", RTGS: "rtgs",
};

const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));
const ORDER_LABEL = invert(ORDER_STATUS_FILTER);
const INVOICE_LABEL = invert(INVOICE_STATUS_FILTER);
const RETURN_LABEL = invert(RETURN_STATUS_FILTER);
const MODE_LABEL = invert(PAYMENT_MODE_FILTER);

// ── Formatting ────────────────────────────────────────────────────────────────

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-08-18" -> "18 Aug 2026" (parsed as a calendar date, so no timezone shift). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MON[m - 1]} ${y}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const num = (v: string | number | null | undefined) => (v === null || v === undefined ? 0 : Number(v));

// ── Summary (KPI strip) ───────────────────────────────────────────────────────

export interface DistributorSummary {
  totalPOs: number;
  lastPODate: string | null;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  returnCount: number;
  totalReturns: number;
  paymentCount: number;
  totalPayments: number;
}

export const EMPTY_SUMMARY: DistributorSummary = {
  totalPOs: 0, lastPODate: null, invoiceCount: 0, totalInvoiced: 0, totalPaid: 0, outstanding: 0,
  returnCount: 0, totalReturns: 0, paymentCount: 0, totalPayments: 0,
};

interface ApiSummary {
  total_pos: number; last_po_date: string | null;
  invoice_count: number; total_invoiced: string; total_paid: string; outstanding: string;
  return_count: number; total_returns: string; payment_count: number; total_payments: string;
}

export async function fetchDistributorSummary(distributorId: string): Promise<DistributorSummary> {
  const s = await apiFetch<ApiSummary>(`${DIST}/${distributorId}/summary`);
  return {
    totalPOs: s.total_pos, lastPODate: s.last_po_date,
    invoiceCount: s.invoice_count, totalInvoiced: num(s.total_invoiced), totalPaid: num(s.total_paid),
    outstanding: num(s.outstanding), returnCount: s.return_count, totalReturns: num(s.total_returns),
    paymentCount: s.payment_count, totalPayments: num(s.total_payments),
  };
}

// ── Purchase orders ───────────────────────────────────────────────────────────

export interface OrderRow { poNo: string; date: string; items: number; amount: number; status: string }

interface ApiOrder { po_number: string; order_date: string; status: string; total_amount: string; items: unknown[] }

export async function fetchDistributorOrders(distributorId: string, q: ListQuery): Promise<Paged<OrderRow>> {
  const r = await apiFetch<{ total: number; page: number; page_size: number; items: ApiOrder[] }>(listUrl("orders", distributorId, q));
  return {
    total: r.total, page: r.page, pageSize: r.page_size,
    items: r.items.map(o => ({
      poNo: o.po_number, date: fmtDate(o.order_date), items: o.items.length,
      amount: num(o.total_amount), status: ORDER_LABEL[o.status] ?? o.status,
    })),
  };
}

// ── Invoices (goods receipts) ─────────────────────────────────────────────────

export interface InvoiceRow {
  invNo: string; poRef: string; date: string; dueDate: string; items: number;
  subtotal: number; gst: number; total: number; paid: number; balance: number; status: string;
}

interface ApiInvoice {
  grn_number: string; po_number: string | null; invoice_date: string; due_date: string | null;
  subtotal: string; gst_total: string; total_amount: string; paid_amount: string; balance_amount: string;
  status: string; items: unknown[];
}

export async function fetchDistributorInvoices(distributorId: string, q: ListQuery): Promise<Paged<InvoiceRow>> {
  const r = await apiFetch<{ total: number; page: number; page_size: number; items: ApiInvoice[] }>(listUrl("grn", distributorId, q));
  return {
    total: r.total, page: r.page, pageSize: r.page_size,
    items: r.items.map(i => ({
      invNo: i.grn_number, poRef: i.po_number || "—", date: fmtDate(i.invoice_date), dueDate: fmtDate(i.due_date),
      items: i.items.length, subtotal: num(i.subtotal), gst: num(i.gst_total), total: num(i.total_amount),
      paid: num(i.paid_amount), balance: num(i.balance_amount), status: INVOICE_LABEL[i.status] ?? i.status,
    })),
  };
}

// ── Returns ───────────────────────────────────────────────────────────────────

export interface ReturnRow {
  retNo: string; invRef: string; date: string; items: number; reason: string; amount: number;
  creditNote: string; status: string;
}

interface ApiReturn {
  return_number: string; grn_number: string | null; return_date: string; reason: string; status: string;
  total_amount: string; credit_note_number: string | null; items: unknown[];
}

export async function fetchDistributorReturns(distributorId: string, q: ListQuery): Promise<Paged<ReturnRow>> {
  const r = await apiFetch<{ total: number; page: number; page_size: number; items: ApiReturn[] }>(listUrl("returns", distributorId, q));
  return {
    total: r.total, page: r.page, pageSize: r.page_size,
    items: r.items.map(x => ({
      retNo: x.return_number, invRef: x.grn_number || "—", date: fmtDate(x.return_date), items: x.items.length,
      reason: x.reason, amount: num(x.total_amount), creditNote: x.credit_note_number ?? "",
      status: RETURN_LABEL[x.status] ?? x.status,
    })),
  };
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface PaymentRow {
  payNo: string; date: string; invRef: string; method: string; amount: number; status: string;
}

interface ApiPayment {
  id: string; payment_number: string; grn_number: string | null; payment_date: string;
  payment_mode: string; amount: string; status: string;
}

export async function fetchDistributorPayments(distributorId: string, q: ListQuery): Promise<Paged<PaymentRow>> {
  const r = await apiFetch<{ total: number; page: number; page_size: number; items: ApiPayment[] }>(listUrl("payments", distributorId, q));
  return {
    total: r.total, page: r.page, pageSize: r.page_size,
    items: r.items.map(p => ({
      payNo: p.payment_number || p.id.slice(0, 12), date: fmtDate(p.payment_date), invRef: p.grn_number || "—",
      method: MODE_LABEL[p.payment_mode] ?? p.payment_mode, amount: num(p.amount), status: p.status,
    })),
  };
}

// ── Audit history ─────────────────────────────────────────────────────────────

export interface AuditRow { id: string; ts: string; user: string; action: string; detail: string }

interface ApiAudit { id: string; user_name: string; action: string; detail: string; created_at: string }

export async function fetchDistributorAudit(distributorId: string, page: number, pageSize: number): Promise<Paged<AuditRow>> {
  const r = await apiFetch<{ total: number; page: number; page_size: number; items: ApiAudit[] }>(
    `${DIST}/${distributorId}/audit?page=${page}&page_size=${pageSize}`,
  );
  return {
    total: r.total, page: r.page, pageSize: r.page_size,
    items: r.items.map(a => ({ id: a.id, ts: fmtDateTime(a.created_at), user: a.user_name || "—", action: a.action, detail: a.detail })),
  };
}
