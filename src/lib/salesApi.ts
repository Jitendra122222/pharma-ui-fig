/**
 * Sales module API client.
 * Adapters return shapes that match salesData.ts mock arrays so API data
 * replaces mock state without type changes.
 */
import { apiFetch } from "./api";

const API = "/api/v1/sales";

// ── API response shapes ───────────────────────────────────────────────────────

interface ApiSaleItem {
  id: string;
  global_product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  mrp: string;
  sale_rate: string;
  item_discount_pct: string;
  item_discount_amount: string;
  gst_rate: string;
  total_amount: string;
}

interface ApiSaleInvoice {
  id: string;
  invoice_number: string;
  patient_id: string | null;
  patient_name: string;
  invoice_date: string;
  sale_type: string;
  status: string;
  subtotal: string;
  item_discount_total: string;
  cash_discount: string;
  gst_total: string;
  round_off: string;
  adjustment: string;
  total_amount: string;
  paid_amount: string;
  balance_amount: string;
  payment_mode: string;
  notes: string;
  items: ApiSaleItem[];
}

interface ApiSaleInvoiceList {
  total: number; page: number; page_size: number; items: ApiSaleInvoice[];
}

interface ApiSalePayment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: string;
  payment_mode: string;
  reference_number: string;
}

// ── Status mapper ─────────────────────────────────────────────────────────────

const SALE_STATUS: Record<string, string> = {
  draft: "Draft",
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  cancelled: "Cancelled",
};

// ── Adapters ──────────────────────────────────────────────────────────────────

function adaptInvoice(api: ApiSaleInvoice) {
  const total = parseFloat(api.total_amount);
  const paid = parseFloat(api.paid_amount);
  return {
    id: api.invoice_number,
    dbId: api.id,
    patient: api.patient_name || "Walk-in Customer",
    patientId: api.patient_id ?? "—",
    date: api.invoice_date,
    due: api.invoice_date,
    items: api.items.length,
    subtotal: parseFloat(api.subtotal),
    tax: parseFloat(api.gst_total),
    total,
    paid,
    method: api.payment_mode,
    status: SALE_STATUS[api.status] ?? api.status,
  };
}

// ── Public fetch functions ────────────────────────────────────────────────────

export async function fetchSaleInvoices(page = 1, pageSize = 50) {
  const data = await apiFetch<ApiSaleInvoiceList>(`${API}?page=${page}&page_size=${pageSize}`);
  return { total: data.total, items: data.items.map(adaptInvoice) };
}

// ── Write payload types ───────────────────────────────────────────────────────

export interface CreateSaleInvoicePayload {
  patient_id?: string | null;
  invoice_date: string;
  sale_type?: string;
  items: Array<{
    global_product_id: string;
    batch_id?: string | null;
    quantity: number;
    sale_rate?: number | null;
    item_discount_pct?: number;
  }>;
  cash_discount?: number;
  adjustment?: number;
  round_off?: number | null;
  paid_amount?: number;
  payment_mode?: string;
  notes?: string;
}

export interface RecordSalePaymentPayload {
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_mode?: string;
  reference_number?: string;
  notes?: string;
}

// ── Write functions ───────────────────────────────────────────────────────────

export async function createSaleInvoice(payload: CreateSaleInvoicePayload) {
  return apiFetch<{ id: string; invoice_number: string }>(API, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function recordSalePayment(invoiceId: string, payload: RecordSalePaymentPayload) {
  return apiFetch<ApiSalePayment>(`${API}/${encodeURIComponent(invoiceId)}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
