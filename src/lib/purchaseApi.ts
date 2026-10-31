/**
 * Purchase module API client + data adapters.
 * Each adapter returns fields that exactly match the mock data arrays in purchasesData.ts,
 * so API data can directly replace mock state without type changes.
 * Callers should catch fetch errors and fall back to mock data.
 */
import { apiFetch } from "./api";

const API = "/api/v1/purchases";

// ── API response shapes ────────────────────────────────────────────────────────

interface ApiPOItem {
  id: string;
  global_product_id: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: string;
  total_price: string;
}

interface ApiPO {
  id: string;
  po_number: string;
  distributor_name: string;
  order_date: string;
  expected_date: string | null;
  warehouse: string;
  payment_terms: string;
  status: string;
  total_amount: string;
  items: ApiPOItem[];
}

interface ApiPOList {
  total: number; page: number; page_size: number; items: ApiPO[];
}

interface ApiGRN {
  grn_number: string;
  po_number: string | null;
  distributor_name: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: string;
  gst_total: string;
  total_amount: string;
  paid_amount: string;
  balance_amount: string;
  status: string;
  items: unknown[];
}

interface ApiGRNList {
  total: number; page: number; page_size: number; items: ApiGRN[];
}

interface ApiReturnItem {
  quantity: number;
}

interface ApiReturn {
  id: string;
  return_number: string;
  grn_number: string | null;
  distributor_name: string;
  return_date: string;
  reason: string;
  status: string;
  total_amount: string;
  credit_note_number: string | null;
  items: ApiReturnItem[];
}

interface ApiReturnList {
  total: number; page: number; page_size: number; items: ApiReturn[];
}

interface ApiPayment {
  id: string;
  payment_number: string;
  grn_number: string | null;
  distributor_name: string;
  payment_date: string;
  payment_mode: string;
  bank_name: string;
  reference_number: string;
  amount: string;
  status: string;
}

interface ApiPaymentList {
  total: number; page: number; page_size: number; items: ApiPayment[];
}

// ── Status mappers ─────────────────────────────────────────────────────────────

const PO_STATUS: Record<string, string> = {
  draft: "Draft",
  sent: "Pending",
  partial: "Partially Received",
  received: "Completed",
  cancelled: "Cancelled",
};

const GRN_STATUS: Record<string, string> = {
  pending: "Unpaid",
  partial: "Partial",
  paid: "Paid",
};

const RETURN_STATUS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  credited: "Posted",
  cancelled: "Cancelled",
};

// ── Adapters — output shapes match mock data arrays in purchasesData.ts ────────

function adaptPO(api: ApiPO) {
  const received = api.items.reduce((s, i) => s + i.quantity_received, 0);
  const ordered = api.items.reduce((s, i) => s + i.quantity_ordered, 0);
  return {
    id: api.po_number,
    dbId: api.id,
    supplier: api.distributor_name,
    date: api.order_date,
    expectedDelivery: api.expected_date ?? "",
    items: api.items.length,
    orderValue: parseFloat(api.total_amount),
    received,
    pending: Math.max(0, ordered - received),
    status: PO_STATUS[api.status] ?? api.status,
    warehouse: api.warehouse,
    paymentTerms: api.payment_terms,
  };
}

function adaptGRN(api: ApiGRN) {
  return {
    id: api.grn_number,
    supplier: api.distributor_name,
    poRef: api.po_number ?? "-",
    grnRef: api.grn_number,
    date: api.invoice_date,
    due: api.due_date ?? "",
    items: api.items.length,
    subtotal: parseFloat(api.subtotal),
    tax: parseFloat(api.gst_total),
    total: parseFloat(api.total_amount),
    paid: parseFloat(api.paid_amount),
    balance: parseFloat(api.balance_amount),
    status: GRN_STATUS[api.status] ?? api.status,
  };
}

function adaptReturn(api: ApiReturn) {
  return {
    id: api.return_number,
    dbId: api.id,
    invoiceRef: api.grn_number ?? "-",
    supplier: api.distributor_name,
    date: api.return_date,
    reason: api.reason,
    items: api.items.length,
    qty: api.items.reduce((s, i) => s + i.quantity, 0),
    total: parseFloat(api.total_amount),
    creditNote: api.credit_note_number ?? "-",
    status: RETURN_STATUS[api.status] ?? api.status,
  };
}

function adaptPayment(api: ApiPayment) {
  return {
    id: api.payment_number || api.id.slice(0, 16),
    supplier: api.distributor_name,
    invoiceRef: api.grn_number ?? "-",
    date: api.payment_date,
    method: api.payment_mode,
    bank: api.bank_name,
    ref: api.reference_number,
    amount: parseFloat(api.amount),
    balanceAfter: 0,
    status: api.status,
  };
}

// ── Public fetch functions ─────────────────────────────────────────────────────

export async function fetchPurchaseOrders(page = 1, pageSize = 50) {
  const data = await apiFetch<ApiPOList>(`${API}/orders?page=${page}&page_size=${pageSize}`);
  return { total: data.total, items: data.items.map(adaptPO) };
}

export async function fetchPODetail(dbId: string) {
  const data = await apiFetch<ApiPO>(`${API}/orders/${encodeURIComponent(dbId)}`);
  return data.items.map((item, i) => ({
    id: i + 1,
    productId: item.global_product_id,
    productName: item.product_name,
    pack: "",
    currentStock: 0,
    avgSales: "",
    suggestedQty: 0,
    orderQty: item.quantity_ordered,
    purchaseRate: parseFloat(item.unit_price),
    scheme: "",
    freeQty: 0,
    mrp: 0,
    gst: 0,
    stockOnPO: item.quantity_ordered - item.quantity_received,
    pendingOrders: 0,
    branchStock: 0,
    nearExpiryQty: 0,
    safetyStock: 0,
  }));
}

export async function fetchPurchaseInvoices(page = 1, pageSize = 50) {
  const data = await apiFetch<ApiGRNList>(`${API}/grn?page=${page}&page_size=${pageSize}`);
  return { total: data.total, items: data.items.map(adaptGRN) };
}

export async function fetchPurchaseReturns(page = 1, pageSize = 50) {
  const data = await apiFetch<ApiReturnList>(`${API}/returns?page=${page}&page_size=${pageSize}`);
  return { total: data.total, items: data.items.map(adaptReturn) };
}

export async function fetchPurchasePayments(page = 1, pageSize = 50) {
  const data = await apiFetch<ApiPaymentList>(`${API}/payments?page=${page}&page_size=${pageSize}`);
  return { total: data.total, items: data.items.map(adaptPayment) };
}

// ── Write payload types ────────────────────────────────────────────────────────

export interface CreatePOPayload {
  global_distributor_id: string;
  distributor_name: string;
  order_date: string;
  expected_date?: string | null;
  warehouse?: string;
  payment_terms?: string;
  items: Array<{
    global_product_id: string;
    product_name: string;
    quantity_ordered: number;
    unit_price: number;
  }>;
  notes?: string;
}

export interface CreateGRNPayload {
  global_distributor_id: string;
  distributor_name: string;
  invoice_date: string;
  due_date?: string | null;
  distributor_invoice_number?: string;
  po_id?: string | null;
  po_number?: string | null;
  items: Array<{
    global_product_id: string;
    product_name: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    free_quantity?: number;
    mrp: number;
    purchase_rate: number;
    gst_rate?: number;
  }>;
  discount?: number;
  paid_amount?: number;
  payment_mode?: string;
  notes?: string;
}

export interface CreateReturnPayload {
  global_distributor_id: string;
  distributor_name: string;
  grn_id?: string | null;
  grn_number?: string | null;
  return_date: string;
  reason?: string;
  items: Array<{
    global_product_id: string;
    product_name: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    purchase_rate: number;
    mrp?: number;
    gst_rate?: number;
    disposition?: string;
  }>;
  notes?: string;
}

export interface CreatePaymentPayload {
  global_distributor_id: string;
  distributor_name?: string;
  grn_id?: string | null;
  grn_number?: string | null;
  payment_date: string;
  amount: number;
  payment_mode?: string;
  bank_name?: string;
  reference_number?: string;
  notes?: string;
}

// ── Write functions ────────────────────────────────────────────────────────────

export async function createPurchaseOrder(payload: CreatePOPayload) {
  return apiFetch<{ id: string; po_number: string }>(`${API}/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePOStatus(dbId: string, status: string) {
  return apiFetch<{ id: string; po_number: string }>(
    `${API}/orders/${encodeURIComponent(dbId)}/status?status=${encodeURIComponent(status)}`,
    { method: "PATCH" }
  );
}

export async function createGRN(payload: CreateGRNPayload) {
  return apiFetch<{ id: string; grn_number: string }>(`${API}/grn`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPurchaseReturn(payload: CreateReturnPayload) {
  return apiFetch<{ id: string; return_number: string }>(`${API}/returns`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateReturnStatus(dbId: string, status: string) {
  return apiFetch<{ id: string; return_number: string }>(
    `${API}/returns/${encodeURIComponent(dbId)}/status?status=${encodeURIComponent(status)}`,
    { method: "PATCH" }
  );
}

export async function createPayment(payload: CreatePaymentPayload) {
  return apiFetch<{ id: string; payment_number: string }>(`${API}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
