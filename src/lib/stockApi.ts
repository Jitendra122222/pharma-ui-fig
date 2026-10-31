/**
 * Stock/Batches module API client.
 * Adapters return shapes matching the batch data used in stock management views.
 */
import { apiFetch } from "./api";

const API = "/api/v1/batches";

// ── API response shapes ───────────────────────────────────────────────────────

interface ApiBatch {
  id: string;
  batch_number: string;
  global_product_id: string;
  product_name: string;
  manufacturer: string;
  manufacturing_date: string | null;
  expiry_date: string;
  quantity_on_hand: number;
  mrp: string;
  purchase_rate: string;
  sale_rate: string;
  location: string;
  distributor_name: string;
  is_active: boolean;
}

interface ApiBatchList {
  total: number; page: number; page_size: number; items: ApiBatch[];
}

// ── Adapter ───────────────────────────────────────────────────────────────────

function adaptBatch(api: ApiBatch) {
  const qty = api.quantity_on_hand;
  const status = qty === 0 ? "Out of Stock" : qty <= 20 ? "Low" : "Active";
  // Returns a shape compatible with the mock `batches` array in stockData.ts
  // so fetched data can replace mock rows in BatchTracking without type issues.
  return {
    id: api.batch_number,
    drug: api.product_name,
    manufacturer: api.manufacturer,
    category: "",
    supplier: api.distributor_name,
    received: api.manufacturing_date ?? "",
    expiry: api.expiry_date,
    qtyReceived: qty,
    qtyCurrent: qty,
    unit: "Units",
    location: api.location,
    status,
    // Extra fields
    dbId: api.id,
    mrp: parseFloat(api.mrp),
    purchaseRate: parseFloat(api.purchase_rate),
    saleRate: parseFloat(api.sale_rate),
    productId: api.global_product_id,
  };
}

// ── Public fetch functions ────────────────────────────────────────────────────

export async function fetchBatches(page = 1, pageSize = 100, inStockOnly = false) {
  const qs = `page=${page}&page_size=${pageSize}${inStockOnly ? "&in_stock_only=true" : ""}`;
  const data = await apiFetch<ApiBatchList>(`${API}?${qs}`);
  return { total: data.total, items: data.items.map(adaptBatch) };
}

export async function fetchFefo(globalProductId: string) {
  const data = await apiFetch<ApiBatch[]>(
    `${API}/product/${encodeURIComponent(globalProductId)}/fefo`
  );
  return data.map(adaptBatch);
}

// =============================================================================
// Product stock: ledger movements, per-product figures, batches, adjustments, transfers.
// Used by the Inventory product detail page. fetchBatches / fetchFefo above stay as they were
// for Stock Management and Sales.
// =============================================================================

const S = "/api/v1/stock";

// ── Batches ───────────────────────────────────────────────────────────────────

export interface ApiProductBatch {
  id: string;
  global_product_id: string;
  batch_number: string;
  expiry_date: string;
  manufacture_date: string | null;
  quantity_in: number;
  quantity_available: number;
  mrp: string;
  ptr: string;
  sale_rate: string;
  purchase_rate: string;
  location: string;
  location_id: string | null;
  status: "Active" | "Quarantine" | "Blocked" | "Damaged";
  global_distributor_id: string | null;
  created_at: string;
}

export interface ProductBatch {
  id: string;
  batchNo: string;
  expiry: string;           // YYYY-MM-DD
  mfgDate: string;
  qtyReceived: number;
  qtyCurrent: number;
  mrp: number;
  cost: number;
  saleRate: number;
  locationId: string | null;
  status: ApiProductBatch["status"];
  distributorId: string | null;
  receivedDate: string;     // YYYY-MM-DD
}

export function adaptProductBatch(b: ApiProductBatch): ProductBatch {
  return {
    id: b.id, batchNo: b.batch_number, expiry: b.expiry_date, mfgDate: b.manufacture_date ?? "",
    qtyReceived: b.quantity_in, qtyCurrent: b.quantity_available, mrp: Number(b.mrp), cost: Number(b.purchase_rate),
    saleRate: Number(b.sale_rate), locationId: b.location_id, status: b.status, distributorId: b.global_distributor_id,
    receivedDate: b.created_at.slice(0, 10),
  };
}

export async function fetchProductBatches(productId: string): Promise<ProductBatch[]> {
  const r = await apiFetch<{ items: ApiProductBatch[] }>(`/api/v1/batches?global_product_id=${productId}&page_size=100`);
  return r.items.map(adaptProductBatch);
}

export async function setBatchStatus(batchId: string, status: ProductBatch["status"], note = ""): Promise<ProductBatch> {
  return adaptProductBatch(await apiFetch<ApiProductBatch>(`${S}/batches/${batchId}/status`, { method: "PATCH", body: JSON.stringify({ status, note }) }));
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface StockSummary {
  totalStock: number; available: number; quarantine: number; blocked: number; damaged: number; expired: number;
  batchCount: number; stockValue: number; valueAtRisk: number;
  expiryHealthy: number; expiry90: number; expiry30: number;
  openPoQty: number; soldToday: number; sold7: number; sold30: number; avgDaily: number; daysOfStock: number | null;
  byLocation: { locationId: string | null; location: string; quantity: number }[];
}

interface ApiSummary {
  total_stock: number; available: number; quarantine: number; blocked: number; damaged: number; expired: number;
  batch_count: number; stock_value: string; value_at_risk: string; expiry_healthy: number; expiry_90: number; expiry_30: number;
  open_po_qty: number; sold_today: number; last_7_days_sold: number; last_30_days_sold: number; avg_daily_sales: number;
  days_of_stock: number | null; by_location: { location_id: string | null; location: string; quantity: number }[];
}

export const EMPTY_STOCK: StockSummary = {
  totalStock: 0, available: 0, quarantine: 0, blocked: 0, damaged: 0, expired: 0, batchCount: 0, stockValue: 0, valueAtRisk: 0,
  expiryHealthy: 0, expiry90: 0, expiry30: 0, openPoQty: 0, soldToday: 0, sold7: 0, sold30: 0, avgDaily: 0, daysOfStock: null, byLocation: [],
};

export async function fetchStockSummary(productId: string): Promise<StockSummary> {
  const s = await apiFetch<ApiSummary>(`${S}/products/${productId}/summary`);
  return {
    totalStock: s.total_stock, available: s.available, quarantine: s.quarantine, blocked: s.blocked, damaged: s.damaged,
    expired: s.expired, batchCount: s.batch_count, stockValue: Number(s.stock_value), valueAtRisk: Number(s.value_at_risk),
    expiryHealthy: s.expiry_healthy, expiry90: s.expiry_90, expiry30: s.expiry_30, openPoQty: s.open_po_qty,
    soldToday: s.sold_today, sold7: s.last_7_days_sold, sold30: s.last_30_days_sold, avgDaily: s.avg_daily_sales,
    daysOfStock: s.days_of_stock,
    byLocation: s.by_location.map(l => ({ locationId: l.location_id, location: l.location, quantity: l.quantity })),
  };
}

// ── Movements ─────────────────────────────────────────────────────────────────

/** Ledger event -> label shown in the UI (the Movement tab's filter pills). */
export const EVENT_LABEL: Record<string, string> = {
  OPENING: "Opening", PURCHASE: "Purchase", SALE: "Sale", SALE_RETURN: "Sale Return",
  PURCHASE_RETURN: "Return to Distributor", PURCHASE_RETURN_CANCEL: "Return Cancelled",
  ADJUSTMENT: "Adjustment", TRANSFER_OUT: "Transfer Out", TRANSFER_IN: "Transfer In",
  EXPIRY_WRITE_OFF: "Expiry", DAMAGE_WRITE_OFF: "Damage Write-off",
};
const EVENT_FROM_LABEL = Object.fromEntries(Object.entries(EVENT_LABEL).map(([k, v]) => [v, k]));
export const MOVEMENT_FILTERS = Object.values(EVENT_LABEL);
export const eventCode = (label: string) => EVENT_FROM_LABEL[label];

export interface Movement {
  id: string; date: string; event: string; batchNo: string; qty: number; balance: number;
  ref: string; refType: string; refId: string | null; note: string; user: string;
}

export interface MovementPage { total: number; totalIn: number; totalOut: number; items: Movement[] }

export async function fetchMovements(
  productId: string,
  q: { page: number; pageSize: number; event?: string; search?: string; dateFrom?: string; dateTo?: string; batchId?: string },
): Promise<MovementPage & { page: number; pageSize: number }> {
  const p = new URLSearchParams({ page: String(q.page), page_size: String(q.pageSize) });
  if (q.event) p.set("event_type", q.event);
  if (q.search?.trim()) p.set("search", q.search.trim());
  if (q.dateFrom) p.set("date_from", q.dateFrom);
  if (q.dateTo) p.set("date_to", q.dateTo);
  if (q.batchId) p.set("batch_id", q.batchId);
  const r = await apiFetch<{
    total: number; page: number; page_size: number; total_in: number; total_out: number;
    items: { id: string; batch_number: string; event_type: string; quantity: number; balance_after: number; reference_no: string;
      reference_type: string; reference_id: string | null; note: string; user_name: string; created_at: string }[];
  }>(`${S}/products/${productId}/movements?${p}`);
  return {
    total: r.total, totalIn: r.total_in, totalOut: r.total_out, page: r.page, pageSize: r.page_size,
    items: r.items.map(m => ({
      id: m.id, date: m.created_at, event: EVENT_LABEL[m.event_type] ?? m.event_type, batchNo: m.batch_number,
      qty: m.quantity, balance: m.balance_after, ref: m.reference_no, refType: m.reference_type, refId: m.reference_id,
      note: m.note, user: m.user_name || "System",
    })),
  };
}

// ── Adjustments and transfers ─────────────────────────────────────────────────

export interface Adjustment {
  id: string; number: string; batchId: string; type: "COUNT" | "WRITE_OFF"; reason: string; notes: string;
  systemQty: number; countedQty: number; variance: number; status: "pending" | "approved" | "rejected";
  requestedBy: string; reviewedBy: string; reviewNote: string; createdAt: string;
  productId: string; productName: string; batchNumber: string; location: string; reviewedAt: string;
}

interface ApiAdjustment {
  id: string; adjustment_number: string; batch_id: string; adjustment_type: "COUNT" | "WRITE_OFF"; reason: string; notes: string;
  system_qty: number; counted_qty: number; variance: number; status: Adjustment["status"]; requested_by_name: string;
  reviewed_by_name: string; review_note: string; created_at: string;
  global_product_id: string; product_name?: string; batch_number?: string; location?: string; reviewed_at?: string | null;
}

const adaptAdjustment = (a: ApiAdjustment): Adjustment => ({
  id: a.id, number: a.adjustment_number, batchId: a.batch_id, type: a.adjustment_type, reason: a.reason, notes: a.notes,
  systemQty: a.system_qty, countedQty: a.counted_qty, variance: a.variance, status: a.status, requestedBy: a.requested_by_name,
  reviewedBy: a.reviewed_by_name, reviewNote: a.review_note, createdAt: a.created_at,
  productId: a.global_product_id, productName: a.product_name ?? "", batchNumber: a.batch_number ?? "", location: a.location ?? "",
  reviewedAt: a.reviewed_at ?? "",
});

export async function requestAdjustment(body: {
  batchId: string; type: "COUNT" | "WRITE_OFF"; countedQty?: number; writeOffQty?: number; reason: string; notes?: string;
}): Promise<Adjustment> {
  return adaptAdjustment(await apiFetch<ApiAdjustment>(`${S}/adjustments`, {
    method: "POST",
    body: JSON.stringify({
      batch_id: body.batchId, adjustment_type: body.type, counted_qty: body.countedQty, write_off_qty: body.writeOffQty,
      reason: body.reason, notes: body.notes ?? "",
    }),
  }));
}

export async function fetchAdjustments(productId: string, status?: string): Promise<Adjustment[]> {
  const p = new URLSearchParams({ product_id: productId, page_size: "100" });
  if (status) p.set("status", status);
  return (await apiFetch<{ items: ApiAdjustment[] }>(`${S}/adjustments?${p}`)).items.map(adaptAdjustment);
}

export interface AdjustmentCounts { pending: number; approved: number; rejected: number; today: number }

/** Every adjustment of this pharmacy (newest first) with the status counts, paging through the server's 100-row pages. */
export async function fetchAllAdjustments(): Promise<{ items: Adjustment[]; counts: AdjustmentCounts }> {
  const out: Adjustment[] = [];
  let counts: AdjustmentCounts = { pending: 0, approved: 0, rejected: 0, today: 0 };
  for (let page = 1; page <= 10; page++) {
    const r = await apiFetch<{ total: number; counts: Record<string, number>; items: ApiAdjustment[] }>(`${S}/adjustments?page=${page}&page_size=100`);
    out.push(...r.items.map(adaptAdjustment));
    counts = { pending: r.counts.pending ?? 0, approved: r.counts.approved ?? 0, rejected: r.counts.rejected ?? 0, today: r.counts.today ?? 0 };
    if (out.length >= r.total) break;
  }
  return { items: out, counts };
}

export async function reviewAdjustment(id: string, action: "approve" | "reject", note = ""): Promise<Adjustment> {
  return adaptAdjustment(await apiFetch<ApiAdjustment>(`${S}/adjustments/${id}/review`, { method: "PATCH", body: JSON.stringify({ action, note }) }));
}

export interface Transfer {
  id: string; number: string; batchId: string; fromLocationId: string; toLocationId: string; quantity: number;
  reason: string; status: "pending" | "completed" | "cancelled"; requestedBy: string; completedBy: string; createdAt: string;
  notes: string; completedAt: string; productId: string; productName: string; batchNumber: string; fromLocation: string; toLocation: string;
}

interface ApiTransfer {
  id: string; transfer_number: string; batch_id: string; from_location_id: string; to_location_id: string; quantity: number;
  reason: string; status: Transfer["status"]; requested_by_name: string; completed_by_name: string; created_at: string;
  notes?: string; completed_at?: string | null; global_product_id: string; product_name?: string; batch_number?: string;
  from_location?: string; to_location?: string;
}

const adaptTransfer = (t: ApiTransfer): Transfer => ({
  id: t.id, number: t.transfer_number, batchId: t.batch_id, fromLocationId: t.from_location_id, toLocationId: t.to_location_id,
  quantity: t.quantity, reason: t.reason, status: t.status, requestedBy: t.requested_by_name, completedBy: t.completed_by_name,
  createdAt: t.created_at, notes: t.notes ?? "", completedAt: t.completed_at ?? "", productId: t.global_product_id,
  productName: t.product_name ?? "", batchNumber: t.batch_number ?? "", fromLocation: t.from_location ?? "", toLocation: t.to_location ?? "",
});

export async function requestTransfer(body: { batchId: string; toLocationId: string; quantity: number; reason: string; notes?: string }) {
  return adaptTransfer(await apiFetch<ApiTransfer>(`${S}/transfers`, {
    method: "POST",
    body: JSON.stringify({ batch_id: body.batchId, to_location_id: body.toLocationId, quantity: body.quantity, reason: body.reason, notes: body.notes ?? "" }),
  }));
}

export async function fetchTransfers(productId: string, status?: string): Promise<Transfer[]> {
  const p = new URLSearchParams({ product_id: productId, page_size: "100" });
  if (status) p.set("status", status);
  return (await apiFetch<{ items: ApiTransfer[] }>(`${S}/transfers?${p}`)).items.map(adaptTransfer);
}

export interface TransferCounts { pending: number; completed: number; cancelled: number }

/** Every transfer of this pharmacy (newest first) with the status counts, paging through the server's 100-row pages. */
export async function fetchAllTransfers(): Promise<{ items: Transfer[]; counts: TransferCounts }> {
  const out: Transfer[] = [];
  let counts: TransferCounts = { pending: 0, completed: 0, cancelled: 0 };
  for (let page = 1; page <= 10; page++) {
    const r = await apiFetch<{ total: number; counts: Record<string, number>; items: ApiTransfer[] }>(`${S}/transfers?page=${page}&page_size=100`);
    out.push(...r.items.map(adaptTransfer));
    counts = { pending: r.counts.pending ?? 0, completed: r.counts.completed ?? 0, cancelled: r.counts.cancelled ?? 0 };
    if (out.length >= r.total) break;
  }
  return { items: out, counts };
}

export async function completeTransfer(id: string): Promise<Transfer> {
  return adaptTransfer(await apiFetch<ApiTransfer>(`${S}/transfers/${id}/complete`, { method: "PATCH" }));
}

export async function cancelTransfer(id: string): Promise<Transfer> {
  return adaptTransfer(await apiFetch<ApiTransfer>(`${S}/transfers/${id}/cancel`, { method: "PATCH" }));
}

// ── Product history, demand, distributors, audit ──────────────────────────────

export interface PurchaseRow {
  date: string; reference: string; distributor: string; batch: string; qty: number; rate: number; amount: number;
  kind: "Purchase" | "Return"; status: string; refId: string;
}
export interface SaleRow {
  date: string; invoice: string; patient: string; batch: string; qty: number; rate: number; amount: number;
  status: string; paymentStatus: string; refId: string;
}
export interface PageOf<T> { total: number; page: number; pageSize: number; items: T[] }

function qs(base: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v !== undefined && v !== "") p.set(k, String(v));
  return p.toString();
}

export async function fetchPurchaseHistory(
  productId: string,
  q: { page: number; pageSize: number; kind?: string; status?: string; search?: string; dateFrom?: string; dateTo?: string },
): Promise<PageOf<PurchaseRow> & { totalPurchased: number; totalPurchaseValue: number; totalReturned: number }> {
  const r = await apiFetch<{
    total: number; page: number; page_size: number; total_purchased: number; total_purchase_value: string; total_returned: number;
    items: { date: string; reference: string; distributor: string; batch: string; qty: number; rate: string; amount: string; kind: "Purchase" | "Return"; status: string; ref_id: string }[];
  }>(`${S}/products/${productId}/purchases?${qs({ page: q.page, page_size: q.pageSize, kind: q.kind, status: q.status, search: q.search?.trim(), date_from: q.dateFrom, date_to: q.dateTo })}`);
  return {
    total: r.total, page: r.page, pageSize: r.page_size, totalPurchased: r.total_purchased,
    totalPurchaseValue: Number(r.total_purchase_value), totalReturned: r.total_returned,
    items: r.items.map(i => ({ date: i.date, reference: i.reference, distributor: i.distributor, batch: i.batch, qty: i.qty,
      rate: Number(i.rate), amount: Number(i.amount), kind: i.kind, status: i.status, refId: i.ref_id })),
  };
}

export async function fetchSaleHistory(
  productId: string,
  q: { page: number; pageSize: number; status?: string; search?: string; dateFrom?: string; dateTo?: string },
): Promise<PageOf<SaleRow> & { totalSold: number; totalSaleValue: number }> {
  const r = await apiFetch<{
    total: number; page: number; page_size: number; total_sold: number; total_sale_value: string;
    items: { date: string; invoice: string; patient: string; batch: string; qty: number; rate: string; amount: string; status: string; payment_status: string; ref_id: string }[];
  }>(`${S}/products/${productId}/sales?${qs({ page: q.page, page_size: q.pageSize, status: q.status, search: q.search?.trim(), date_from: q.dateFrom, date_to: q.dateTo })}`);
  return {
    total: r.total, page: r.page, pageSize: r.page_size, totalSold: r.total_sold, totalSaleValue: Number(r.total_sale_value),
    items: r.items.map(i => ({ date: i.date, invoice: i.invoice, patient: i.patient, batch: i.batch, qty: i.qty, rate: Number(i.rate),
      amount: Number(i.amount), status: i.status, paymentStatus: i.payment_status, refId: i.ref_id })),
  };
}

export interface DemandDay { date: string; day: string; qty: number }
export async function fetchDemand(productId: string, days = 7): Promise<DemandDay[]> {
  return (await apiFetch<{ trend: DemandDay[] }>(`${S}/products/${productId}/demand?days=${days}`)).trend;
}

export interface ProductDistributor {
  distributorId: string; name: string; email: string; phone: string; preferred: boolean; active: boolean;
  currentStock: number; lastOrderDate: string; lastRate: number; effectiveCost: number; leadDays: number | null; totalOrders: number;
}
export async function fetchProductDistributors(productId: string): Promise<ProductDistributor[]> {
  const r = await apiFetch<{
    distributor_id: string; name: string; email: string; phone: string; preferred: boolean; active: boolean; current_stock: number;
    last_order_date: string; last_rate: string; effective_cost: string; lead_days: number | null; total_orders: number;
  }[]>(`${S}/products/${productId}/distributors`);
  return r.map(d => ({ distributorId: d.distributor_id, name: d.name, email: d.email, phone: d.phone, preferred: d.preferred, active: d.active,
    currentStock: d.current_stock, lastOrderDate: d.last_order_date, lastRate: Number(d.last_rate), effectiveCost: Number(d.effective_cost),
    leadDays: d.lead_days, totalOrders: d.total_orders }));
}

export interface AuditEntry { id: string; user: string; action: string; detail: string; at: string }
export async function fetchProductAudit(productId: string, page = 1, pageSize = 25): Promise<PageOf<AuditEntry>> {
  const r = await apiFetch<{ total: number; page: number; page_size: number; items: { id: string; user_name: string; action: string; detail: string; created_at: string }[] }>(
    `${S}/products/${productId}/audit?page=${page}&page_size=${pageSize}`);
  return { total: r.total, page: r.page, pageSize: r.page_size,
    items: r.items.map(a => ({ id: a.id, user: a.user_name || "System", action: a.action, detail: a.detail, at: a.created_at })) };
}

// ── The product + this pharmacy's settings (hero, Overview) ───────────────────

import type { ApiMyProduct } from "./inventoryApi";

export async function fetchMyProductDetail(productId: string): Promise<ApiMyProduct> {
  return apiFetch<ApiMyProduct>(`/api/v1/products/${productId}/mine`);
}

// ── Stock Management overview (one row per product) ───────────────────────────

export interface StockOverviewRow {
  id: string; name: string; category: string; manufacturer: string; unit: string; rx: string; location: string; supplier: string;
  stock: number; minStock: number; reorderPoint: number; cost: number; price: number; stockValue: number;
  expiry: string; daysToExpiry: number | null; velocity: number; daysLeft: number | null; confidence: number;
  status: string; batchCount: number; lastCounted: string;
}
export interface StockOverviewPage {
  total: number; totalSkus: number; totalStockValue: number; lowStock: number; outOfStock: number; items: StockOverviewRow[];
}

export async function fetchStockOverview(q: { search?: string; status?: string; page?: number; pageSize?: number } = {}): Promise<StockOverviewPage> {
  const r = await apiFetch<{
    total: number; total_skus: number; total_stock_value: string; low_stock: number; out_of_stock: number;
    items: {
      id: string; name: string; category: string; manufacturer: string; unit: string; prescription_status: string; location: string;
      supplier: string; stock: number; min_stock: number; reorder_point: number; cost: string; price: string; stock_value: string;
      nearest_expiry: string | null; days_to_expiry: number | null; weekly_velocity: number; days_left: number | null;
      confidence: number; status: string; batch_count: number; last_counted: string | null;
    }[];
  }>(`${S}/overview?${qs({ search: q.search?.trim(), status: q.status, page: q.page ?? 1, page_size: q.pageSize ?? 500 })}`);
  return {
    total: r.total, totalSkus: r.total_skus, totalStockValue: Number(r.total_stock_value), lowStock: r.low_stock, outOfStock: r.out_of_stock,
    items: r.items.map(i => ({
      id: i.id, name: i.name, category: i.category, manufacturer: i.manufacturer, unit: i.unit, rx: i.prescription_status || "OTC",
      location: i.location, supplier: i.supplier, stock: i.stock, minStock: i.min_stock, reorderPoint: i.reorder_point,
      cost: Number(i.cost), price: Number(i.price), stockValue: Number(i.stock_value), expiry: i.nearest_expiry ?? "",
      daysToExpiry: i.days_to_expiry, velocity: i.weekly_velocity, daysLeft: i.days_left, confidence: i.confidence,
      status: i.status, batchCount: i.batch_count, lastCounted: i.last_counted ?? "",
    })),
  };
}

// ── Batch Tracking: every batch of this pharmacy ──────────────────────────────

export interface TrackedBatch {
  id: string; batchNo: string; productId: string; product: string; distributorId: string | null; received: string; expiry: string;
  qtyReceived: number; qtyCurrent: number; unitCost: number; mrp: number; location: string; locationId: string | null;
  status: ApiProductBatch["status"];
}

export async function fetchAllBatches(): Promise<TrackedBatch[]> {
  const out: TrackedBatch[] = [];
  for (let page = 1; page <= 30; page++) {
    const r = await apiFetch<{ total: number; items: (ApiProductBatch & { product_name: string })[] }>(`/api/v1/batches?page=${page}&page_size=100`);
    out.push(...r.items.map(b => ({
      id: b.id, batchNo: b.batch_number, productId: b.global_product_id, product: b.product_name, distributorId: b.global_distributor_id,
      received: b.created_at.slice(0, 10), expiry: b.expiry_date, qtyReceived: b.quantity_in, qtyCurrent: b.quantity_available,
      unitCost: Number(b.purchase_rate), mrp: Number(b.mrp), location: b.location, locationId: b.location_id, status: b.status,
    })));
    if (out.length >= r.total) break;
  }
  return out;
}

export async function createBatch(body: {
  productId: string; productName: string; batchNo: string; expiry: string; quantity: number; mrp: number; saleRate: number;
  purchaseRate: number; locationId: string; distributorId?: string;
}) {
  return apiFetch<{ id: string; batch_number: string }>("/api/v1/batches", {
    method: "POST",
    body: JSON.stringify({
      global_product_id: body.productId, product_name: body.productName, batch_number: body.batchNo, expiry_date: body.expiry,
      quantity_in: body.quantity, mrp: String(body.mrp), sale_rate: String(body.saleRate), purchase_rate: String(body.purchaseRate),
      location_id: body.locationId, global_distributor_id: body.distributorId || null,
    }),
  });
}

// ── Expiry Management ─────────────────────────────────────────────────────────

export type ExpiryLevel = "expired" | "urgent" | "critical" | "warning" | "ok";
export type ReturnEligibility = "Eligible" | "Non-returnable" | "Window Closed" | "No distributor";

export interface ExpiryAlert {
  batchId: string; productId: string; product: string; category: string; batchNo: string; location: string; quantity: number;
  expiry: string; daysLeft: number; level: ExpiryLevel; status: ApiProductBatch["status"]; statusNote: string;
  unitCost: number; value: number; distributorId: string | null; distributor: string; returnStatus: ReturnEligibility;
  dailySales: number; willExpireUnsold: number; unit: string; productStock: number; mrp: number;
}
export interface ExpirySummary {
  expiredValue: number; expiredCount: number; criticalValue: number; criticalCount: number; warningValue: number; warningCount: number; atRiskValue: number;
}

export async function fetchExpiryAlerts(): Promise<{ items: ExpiryAlert[]; summary: ExpirySummary }> {
  const r = await apiFetch<{
    items: {
      batch_id: string; product_id: string; product: string; category: string; batch_number: string; location: string; quantity: number;
      expiry_date: string; days_left: number; level: ExpiryLevel; status: ApiProductBatch["status"]; status_note: string; unit_cost: string;
      value: string; distributor_id: string | null; distributor: string; return_status: ReturnEligibility; daily_sales: number;
      will_expire_unsold: number; unit: string; product_stock: number; mrp: string;
    }[];
    summary: { expired_value: string; expired_count: number; critical_value: string; critical_count: number; warning_value: string; warning_count: number; at_risk_value: string };
  }>(`${S}/expiry/alerts`);
  return {
    items: r.items.map(i => ({
      batchId: i.batch_id, productId: i.product_id, product: i.product, category: i.category, batchNo: i.batch_number, location: i.location,
      quantity: i.quantity, expiry: i.expiry_date, daysLeft: i.days_left, level: i.level, status: i.status, statusNote: i.status_note,
      unitCost: Number(i.unit_cost), value: Number(i.value), distributorId: i.distributor_id, distributor: i.distributor,
      returnStatus: i.return_status, dailySales: i.daily_sales, willExpireUnsold: i.will_expire_unsold, unit: i.unit,
      productStock: i.product_stock, mrp: Number(i.mrp),
    })),
    summary: {
      expiredValue: Number(r.summary.expired_value), expiredCount: r.summary.expired_count, criticalValue: Number(r.summary.critical_value),
      criticalCount: r.summary.critical_count, warningValue: Number(r.summary.warning_value), warningCount: r.summary.warning_count,
      atRiskValue: Number(r.summary.at_risk_value),
    },
  };
}

export interface HeldBatch {
  batchId: string; productId: string; product: string; batchNo: string; quantity: number; status: ApiProductBatch["status"]; reason: string;
  since: string; daysOnHold: number; overdue: boolean; location: string; value: number; expiry: string;
}
export async function fetchQuarantine(): Promise<{ items: HeldBatch[]; activeValue: number; overdueCount: number }> {
  const r = await apiFetch<{
    items: { batch_id: string; product_id: string; product: string; batch_number: string; quantity: number; status: ApiProductBatch["status"]; reason: string;
      since: string; days_on_hold: number; overdue: boolean; location: string; value: string; expiry_date: string }[];
    active_value: string; overdue_count: number;
  }>(`${S}/expiry/quarantine`);
  return {
    items: r.items.map(i => ({ batchId: i.batch_id, productId: i.product_id, product: i.product, batchNo: i.batch_number, quantity: i.quantity,
      status: i.status, reason: i.reason, since: i.since, daysOnHold: i.days_on_hold, overdue: i.overdue, location: i.location,
      value: Number(i.value), expiry: i.expiry_date })),
    activeValue: Number(r.active_value), overdueCount: r.overdue_count,
  };
}

export interface AlertThreshold { category: string; warning: number; critical: number; urgent: number; isDefault: boolean }
export async function fetchThresholds(): Promise<AlertThreshold[]> {
  const r = await apiFetch<{ category: string; warning_days: number; critical_days: number; urgent_days: number; is_default: boolean }[]>(`${S}/expiry/thresholds`);
  return r.map(t => ({ category: t.category, warning: t.warning_days, critical: t.critical_days, urgent: t.urgent_days, isDefault: t.is_default }));
}
export async function saveThresholds(rows: AlertThreshold[]): Promise<AlertThreshold[]> {
  const r = await apiFetch<{ category: string; warning_days: number; critical_days: number; urgent_days: number; is_default: boolean }[]>(`${S}/expiry/thresholds`, {
    method: "PUT",
    body: JSON.stringify({ items: rows.map(t => ({ category: t.category, warning_days: t.warning, critical_days: t.critical, urgent_days: t.urgent })) }),
  });
  return r.map(t => ({ category: t.category, warning: t.warning_days, critical: t.critical_days, urgent: t.urgent_days, isDefault: t.is_default }));
}

export async function writeOffExpired(body: { batchId: string; quantity: number; method: string; certificate?: string; notes?: string }) {
  return apiFetch<{ batch_id: string; quantity_written_off: number; balance: number; value: string }>(`${S}/expiry/write-off`, {
    method: "POST",
    body: JSON.stringify({ batch_id: body.batchId, quantity: body.quantity, method: body.method, certificate: body.certificate ?? "", notes: body.notes ?? "" }),
  });
}

export interface ExpiryCheck {
  id: string; number: string; type: string; scheduledDate: string; completedDate: string; assignedTo: string;
  itemsReviewed: number; issuesFound: number; status: "Scheduled" | "Overdue" | "In Progress" | "Completed" | "Cancelled"; notes: string;
}
const adaptCheck = (c: { id: string; number: string; type: string; scheduled_date: string; completed_date: string; assigned_to: string;
  items_reviewed: number; issues_found: number; status: ExpiryCheck["status"]; notes: string }): ExpiryCheck => ({
  id: c.id, number: c.number, type: c.type, scheduledDate: c.scheduled_date, completedDate: c.completed_date, assignedTo: c.assigned_to,
  itemsReviewed: c.items_reviewed, issuesFound: c.issues_found, status: c.status, notes: c.notes,
});
type ApiCheck = Parameters<typeof adaptCheck>[0];
export async function fetchExpiryChecks(): Promise<ExpiryCheck[]> {
  return (await apiFetch<ApiCheck[]>(`${S}/expiry/checks`)).map(adaptCheck);
}
export async function scheduleExpiryCheck(body: { type: string; scheduledDate: string; assignedTo: string; notes: string }) {
  return adaptCheck(await apiFetch<ApiCheck>(`${S}/expiry/checks`, {
    method: "POST", body: JSON.stringify({ check_type: body.type, scheduled_date: body.scheduledDate, assigned_to: body.assignedTo, notes: body.notes }),
  }));
}
export async function completeExpiryCheck(id: string, body: { itemsReviewed: number; issuesFound: number; notes: string }) {
  return adaptCheck(await apiFetch<ApiCheck>(`${S}/expiry/checks/${id}/complete`, {
    method: "PATCH", body: JSON.stringify({ items_reviewed: body.itemsReviewed, issues_found: body.issuesFound, notes: body.notes }),
  }));
}

// ── Controlled drug (Schedule H1 / X) register ────────────────────────────────

export interface ControlledProduct { id: string; name: string; schedule: string; stock: number }
export async function fetchControlledProducts(): Promise<ControlledProduct[]> {
  return apiFetch<ControlledProduct[]>(`${S}/narcotic/products`);
}

export interface RegisterEntry {
  id: string; at: string; type: string; ref: string; batch: string; prescriber: string; patient: string;
  quantity: number; balance: number; signedBy: string; note: string;
}
export interface RegisterMonth {
  productName: string; year: number; month: number; opening: number; receipts: number; issues: number; closing: number; entries: RegisterEntry[];
}
export async function fetchNarcoticRegister(productId: string, year: number, month: number): Promise<RegisterMonth> {
  const r = await apiFetch<{
    product: { name: string }; year: number; month: number; opening_balance: number; total_receipts: number; total_issues: number;
    closing_balance: number;
    entries: { id: string; at: string; type: string; ref: string; batch: string; prescriber: string; patient: string; quantity: number;
      balance: number; signed_by: string; note: string }[];
  }>(`${S}/narcotic/register?product_id=${productId}&year=${year}&month=${month}`);
  return {
    productName: r.product.name, year: r.year, month: r.month, opening: r.opening_balance, receipts: r.total_receipts,
    issues: r.total_issues, closing: r.closing_balance,
    entries: r.entries.map(e => ({ id: e.id, at: e.at, type: e.type, ref: e.ref, batch: e.batch, prescriber: e.prescriber,
      patient: e.patient, quantity: e.quantity, balance: e.balance, signedBy: e.signed_by, note: e.note })),
  };
}

// ── Drug recall ───────────────────────────────────────────────────────────────

export interface RecallCase {
  id: string; number: string; productId: string; product: string; recallClass: "I" | "II" | "III"; source: string; reason: string;
  noticeDate: string; status: "Open" | "Resolved" | "Closed"; batchNumbers: string[]; batchesInStock: number; patientsNotified: number;
  outcomeNotes: string; createdBy: string; closedAt: string;
}
export interface RecallSummary { open: number; batchesHeld: number; patientsNotified: number; resolvedThisMonth: number }
type ApiRecall = {
  id: string; number: string; product_id: string; product: string; class: "I" | "II" | "III"; source: string; reason: string; notice_date: string;
  status: RecallCase["status"]; batch_numbers: string[]; batches_in_stock: number; patients_notified: number; outcome_notes: string;
  created_by: string; closed_at: string;
};
const adaptRecall = (r: ApiRecall): RecallCase => ({
  id: r.id, number: r.number, productId: r.product_id, product: r.product, recallClass: r.class, source: r.source, reason: r.reason,
  noticeDate: r.notice_date, status: r.status, batchNumbers: r.batch_numbers, batchesInStock: r.batches_in_stock,
  patientsNotified: r.patients_notified, outcomeNotes: r.outcome_notes, createdBy: r.created_by, closedAt: r.closed_at,
});

export async function fetchRecalls(): Promise<{ items: RecallCase[]; summary: RecallSummary }> {
  const r = await apiFetch<{ items: ApiRecall[]; summary: { open: number; batches_held: number; patients_notified: number; resolved_this_month: number } }>(`${S}/recalls`);
  return {
    items: r.items.map(adaptRecall),
    summary: { open: r.summary.open, batchesHeld: r.summary.batches_held, patientsNotified: r.summary.patients_notified, resolvedThisMonth: r.summary.resolved_this_month },
  };
}

export interface RecallBatch {
  batchId: string; productId: string; product: string; manufacturer: string; category: string; batchNo: string; location: string;
  quantity: number; received: number; expiry: string; status: ApiProductBatch["status"]; value: number;
}
export interface RecallPatient { invoiceId: string; invoice: string; date: string; patient: string; patientId: string | null; phone: string; items: string[]; quantity: number }
export interface RecallMovement { id: string; at: string; event: string; ref: string; batchNo: string; quantity: number; balance: number; user: string }
export async function searchRecall(q: string): Promise<{ batches: RecallBatch[]; patients: RecallPatient[]; movements: RecallMovement[] }> {
  const r = await apiFetch<{
    batches: { batch_id: string; product_id: string; product: string; manufacturer: string; category: string; batch_number: string; location: string;
      quantity: number; quantity_received: number; expiry_date: string; status: ApiProductBatch["status"]; value: string }[];
    patients: { invoice_id: string; invoice: string; date: string; patient: string; patient_id: string | null; phone: string; items: string[]; quantity: number }[];
    movements: { id: string; at: string; event: string; ref: string; batch_number: string; quantity: number; balance: number; user: string }[];
  }>(`${S}/recalls/search?q=${encodeURIComponent(q)}`);
  return {
    batches: r.batches.map(b => ({ batchId: b.batch_id, productId: b.product_id, product: b.product, manufacturer: b.manufacturer, category: b.category,
      batchNo: b.batch_number, location: b.location, quantity: b.quantity, received: b.quantity_received, expiry: b.expiry_date, status: b.status, value: Number(b.value) })),
    patients: r.patients.map(p => ({ invoiceId: p.invoice_id, invoice: p.invoice, date: p.date, patient: p.patient, patientId: p.patient_id, phone: p.phone, items: p.items, quantity: p.quantity })),
    movements: r.movements.map(m => ({ id: m.id, at: m.at, event: m.event, ref: m.ref, batchNo: m.batch_number, quantity: m.quantity, balance: m.balance, user: m.user })),
  };
}

export async function openRecall(body: {
  productId: string; batchNumbers: string[]; recallClass: "I" | "II" | "III"; source: string; reason: string; noticeDate: string; holdStock: boolean;
}): Promise<RecallCase & { quarantined: number; notInStock: string[] }> {
  const r = await apiFetch<ApiRecall & { quarantined: number; not_in_stock: string[] }>(`${S}/recalls`, {
    method: "POST",
    body: JSON.stringify({ product_id: body.productId, batch_numbers: body.batchNumbers, recall_class: body.recallClass, source: body.source,
      reason: body.reason, notice_date: body.noticeDate, hold_stock: body.holdStock }),
  });
  return { ...adaptRecall(r), quarantined: r.quarantined, notInStock: r.not_in_stock };
}

export async function updateRecall(id: string, body: { patientsNotified?: number; status?: "open" | "resolved" | "closed"; outcomeNotes?: string }): Promise<RecallCase> {
  return adaptRecall(await apiFetch<ApiRecall>(`${S}/recalls/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ patients_notified: body.patientsNotified, status: body.status, outcome_notes: body.outcomeNotes }),
  }));
}

// ── Stock investigations ──────────────────────────────────────────────────────

export type InvStatus = "In Progress" | "Pending Approval" | "Approved" | "Rejected" | "Adjusted";
export type InvPriority = "High" | "Medium" | "Low";
export const INVESTIGATION_STEPS = [
  "Stock Difference", "Identify Transaction", "Batch Investigation", "Location Investigation",
  "User / Action Investigation", "Reason", "Approval", "Adjustment",
];
export const ROOT_CAUSES = [
  "Damaged / Broken", "Expired Disposal", "Unrecorded Sale", "Wrong Batch Booked", "Wrong Location",
  "Purchase Entry Error", "Transfer Not Recorded", "Theft / Pilferage", "Other",
];
export const EVIDENCE_TYPES = ["Physical Evidence", "System Logs", "Witness Account", "CCTV / Footage", "No Evidence"];

export interface InvCase {
  id: string; number: string; productId: string; product: string; countDate: string; systemQty: number; physicalQty: number; variance: number;
  priority: InvPriority; currentStep: number; stepName: string; status: InvStatus; assignedTo: string; reportedBy: string;
  reason: string; reasonNotes: string; adjustmentRef: string; createdAt: string;
}
export interface InvFinding { kind: "transaction" | "batch" | "location" | "suspect"; refId: string; refNo: string; label: string; expectedQty: number | null; countedQty: number | null }
export interface InvEvidence { id: string; type: string; description: string; reference: string; addedBy: string; at: string }
export interface InvDetail extends InvCase {
  notes: { transaction: string; batch: string; location: string; suspect: string }; evidenceType: string; approvedBy: string; approvalNotes: string;
  decidedAt: string; findings: InvFinding[]; evidence: InvEvidence[];
}
export interface InvSummary {
  total: number; resolved: number; rejected: number; pending: number; inProgress: number; qtyAdjusted: number; resolutionRate: number;
  rootCauses: { cause: string; count: number }[];
}
type ApiInv = {
  id: string; number: string; product_id: string; product: string; count_date: string; system_qty: number; physical_qty: number; variance: number;
  priority: InvPriority; current_step: number; step_name: string; status: InvStatus; assigned_to: string; reported_by: string; reason: string;
  reason_notes: string; adjustment_ref: string; created_at: string;
};
const adaptInv = (r: ApiInv): InvCase => ({
  id: r.id, number: r.number, productId: r.product_id, product: r.product, countDate: r.count_date, systemQty: r.system_qty, physicalQty: r.physical_qty,
  variance: r.variance, priority: r.priority, currentStep: r.current_step, stepName: r.step_name, status: r.status, assignedTo: r.assigned_to,
  reportedBy: r.reported_by, reason: r.reason, reasonNotes: r.reason_notes, adjustmentRef: r.adjustment_ref, createdAt: r.created_at,
});
type ApiInvDetail = ApiInv & {
  notes: InvDetail["notes"]; evidence_type: string; approved_by: string; approval_notes: string; decided_at: string;
  findings: { kind: InvFinding["kind"]; ref_id: string; ref_no: string; label: string; expected_qty: number | null; counted_qty: number | null }[];
  evidence: { id: string; type: string; description: string; reference: string; added_by: string; at: string }[];
};
const adaptDetail = (r: ApiInvDetail): InvDetail => ({
  ...adaptInv(r), notes: r.notes, evidenceType: r.evidence_type, approvedBy: r.approved_by, approvalNotes: r.approval_notes, decidedAt: r.decided_at,
  findings: r.findings.map(f => ({ kind: f.kind, refId: f.ref_id, refNo: f.ref_no, label: f.label, expectedQty: f.expected_qty, countedQty: f.counted_qty })),
  evidence: r.evidence.map(e => ({ id: e.id, type: e.type, description: e.description, reference: e.reference, addedBy: e.added_by, at: e.at })),
});

export async function fetchInvestigations(): Promise<{ items: InvCase[]; summary: InvSummary }> {
  const r = await apiFetch<{ items: ApiInv[]; summary: { total: number; resolved: number; rejected: number; pending: number; in_progress: number;
    qty_adjusted: number; resolution_rate: number; root_causes: { cause: string; count: number }[] } }>(`${S}/investigations`);
  return {
    items: r.items.map(adaptInv),
    summary: { total: r.summary.total, resolved: r.summary.resolved, rejected: r.summary.rejected, pending: r.summary.pending, inProgress: r.summary.in_progress,
      qtyAdjusted: r.summary.qty_adjusted, resolutionRate: r.summary.resolution_rate, rootCauses: r.summary.root_causes },
  };
}
export async function fetchInvestigation(id: string): Promise<InvDetail> { return adaptDetail(await apiFetch<ApiInvDetail>(`${S}/investigations/${id}`)); }

export async function openInvestigation(body: { productId: string; physicalQty: number; countDate: string; priority: InvPriority; assignedTo: string; reportedBy: string }) {
  return adaptDetail(await apiFetch<ApiInvDetail>(`${S}/investigations`, {
    method: "POST",
    body: JSON.stringify({ product_id: body.productId, physical_qty: body.physicalQty, count_date: body.countDate, priority: body.priority,
      assigned_to: body.assignedTo, reported_by: body.reportedBy }),
  }));
}

export interface InvContext {
  transactions: { id: string; at: string; event: string; ref: string; batch: string; quantity: number; user: string }[];
  batches: { id: string; batchNumber: string; received: string; expiry: string; location: string; expectedQty: number; status: string }[];
  locations: { id: string; name: string; expectedQty: number }[];
}
export async function fetchInvestigationContext(id: string): Promise<InvContext> {
  const r = await apiFetch<{
    transactions: InvContext["transactions"];
    batches: { id: string; batch_number: string; received: string; expiry: string; location: string; expected_qty: number; status: string }[];
    locations: { id: string; name: string; expected_qty: number }[];
  }>(`${S}/investigations/${id}/context`);
  return {
    transactions: r.transactions,
    batches: r.batches.map(b => ({ id: b.id, batchNumber: b.batch_number, received: b.received, expiry: b.expiry, location: b.location, expectedQty: b.expected_qty, status: b.status })),
    locations: r.locations.map(l => ({ id: l.id, name: l.name, expectedQty: l.expected_qty })),
  };
}

export async function saveInvestigation(id: string, body: {
  currentStep?: number; priority?: InvPriority; assignedTo?: string; notes?: Partial<InvDetail["notes"]>;
  findings?: Partial<Record<InvFinding["kind"], { refId: string; countedQty?: number }[]>>;
  reason?: string; reasonNotes?: string; evidenceType?: string;
}): Promise<InvDetail> {
  const findings = body.findings
    ? Object.fromEntries(Object.entries(body.findings).map(([k, v]) => [k, (v ?? []).map(f => ({ ref_id: f.refId, counted_qty: f.countedQty ?? null }))]))
    : undefined;
  return adaptDetail(await apiFetch<ApiInvDetail>(`${S}/investigations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ current_step: body.currentStep, priority: body.priority, assigned_to: body.assignedTo, notes: body.notes, findings,
      reason: body.reason, reason_notes: body.reasonNotes, evidence_type: body.evidenceType }),
  }));
}
export async function addInvestigationEvidence(id: string, body: { type: string; description: string; reference: string }): Promise<InvDetail> {
  return adaptDetail(await apiFetch<ApiInvDetail>(`${S}/investigations/${id}/evidence`, {
    method: "POST", body: JSON.stringify({ evidence_type: body.type, description: body.description, reference: body.reference }),
  }));
}
export async function submitInvestigation(id: string): Promise<InvDetail> {
  return adaptDetail(await apiFetch<ApiInvDetail>(`${S}/investigations/${id}/submit`, { method: "POST" }));
}
export async function decideInvestigation(id: string, action: "approve" | "reject", notes: string): Promise<InvDetail> {
  return adaptDetail(await apiFetch<ApiInvDetail>(`${S}/investigations/${id}/decision`, { method: "POST", body: JSON.stringify({ action, notes }) }));
}
export async function postInvestigation(id: string): Promise<InvDetail> {
  return adaptDetail(await apiFetch<ApiInvDetail>(`${S}/investigations/${id}/post`, { method: "POST" }));
}

export interface InvEvent { id: string; case: string; product: string; at: string; actor: string; action: string; detail: string; type: string; fromStep: string; toStep: string }
export async function fetchInvestigationEvents(): Promise<InvEvent[]> {
  const r = await apiFetch<{ id: string; case: string; product: string; at: string; actor: string; action: string; detail: string; type: string; from_step: string; to_step: string }[]>(`${S}/investigations/events`);
  return r.map(e => ({ id: e.id, case: e.case, product: e.product, at: e.at, actor: e.actor, action: e.action, detail: e.detail, type: e.type, fromStep: e.from_step, toStep: e.to_step }));
}

// ── Bins / locations ──────────────────────────────────────────────────────────

export const RACK_TYPES = ["Shelf Rack", "Drawer", "High Shelf", "Cold Unit", "Counter", "Floor", "Safe"];
export const TEMP_ZONES = ["Ambient", "Refrigerated", "Frozen"];
export const AUDIT_TYPES = ["Cycle Count", "Full Count", "Spot Check", "Expiry Check"];

export interface BinItem {
  batchId: string; productId: string; product: string; category: string; manufacturer: string; batchNo: string; expiry: string; daysToExpiry: number;
  quantity: number; unit: string; minStock: number; productStock: number; low: boolean; status: string; locationId: string | null; location: string;
}
export interface BinRow {
  id: string; name: string; label: string; zone: string; rackType: string; tempZone: string; maxCapacity: number; locationId: string; location: string;
  notes: string; used: number; fillPct: number; status: "ok" | "low" | "critical"; skuCount: number; items: BinItem[]; lastAudit: string; nextAudit: string;
  lastTemp: number | null; lastTempAt: string; tempOk: boolean | null;
}
export interface BinsOverview {
  bins: BinRow[]; unassigned: BinItem[]; locations: { id: string; name: string }[];
  summary: { bins: number; skusInBins: number; critical: number; attention: number; unassignedUnits: number };
}
type ApiBinItem = {
  batch_id: string; product_id: string; product: string; category: string; manufacturer: string; batch_number: string; expiry_date: string; days_to_expiry: number;
  quantity: number; unit: string; min_stock: number; product_stock: number; low: boolean; status: string; location_id: string | null; location: string;
};
const adaptBinItem = (i: ApiBinItem): BinItem => ({
  batchId: i.batch_id, productId: i.product_id, product: i.product, category: i.category, manufacturer: i.manufacturer, batchNo: i.batch_number,
  expiry: i.expiry_date, daysToExpiry: i.days_to_expiry, quantity: i.quantity, unit: i.unit, minStock: i.min_stock, productStock: i.product_stock,
  low: i.low, status: i.status, locationId: i.location_id, location: i.location,
});

export async function fetchBins(): Promise<BinsOverview> {
  const r = await apiFetch<{
    bins: {
      id: string; name: string; label: string; zone: string; rack_type: string; temp_zone: string; max_capacity: number; location_id: string; location: string;
      notes: string; used: number; fill_pct: number; status: BinRow["status"]; sku_count: number; items: ApiBinItem[]; last_audit: string; next_audit: string;
      last_temp: number | null; last_temp_at: string; temp_ok: boolean | null;
    }[];
    unassigned: ApiBinItem[]; locations: { id: string; name: string }[];
    summary: { bins: number; skus_in_bins: number; critical: number; attention: number; unassigned_units: number };
  }>(`${S}/bins`);
  return {
    bins: r.bins.map(b => ({
      id: b.id, name: b.name, label: b.label, zone: b.zone, rackType: b.rack_type, tempZone: b.temp_zone, maxCapacity: b.max_capacity, locationId: b.location_id,
      location: b.location, notes: b.notes, used: b.used, fillPct: b.fill_pct, status: b.status, skuCount: b.sku_count, items: b.items.map(adaptBinItem),
      lastAudit: b.last_audit, nextAudit: b.next_audit, lastTemp: b.last_temp, lastTempAt: b.last_temp_at, tempOk: b.temp_ok,
    })),
    unassigned: r.unassigned.map(adaptBinItem), locations: r.locations,
    summary: { bins: r.summary.bins, skusInBins: r.summary.skus_in_bins, critical: r.summary.critical, attention: r.summary.attention, unassignedUnits: r.summary.unassigned_units },
  };
}

export interface BinForm { name: string; label: string; zone: string; rackType: string; tempZone: string; maxCapacity: number; locationId?: string; notes: string }
const binBody = (f: BinForm) => JSON.stringify({ name: f.name, label: f.label, zone: f.zone, rack_type: f.rackType, temp_zone: f.tempZone,
  max_capacity: f.maxCapacity, location_id: f.locationId || null, notes: f.notes });
export const createBin = (f: BinForm) => apiFetch<{ id: string; name: string }>(`${S}/bins`, { method: "POST", body: binBody(f) });
export const updateBin = (id: string, f: BinForm) => apiFetch<{ id: string; name: string }>(`${S}/bins/${id}`, { method: "PUT", body: binBody(f) });
export const deactivateBin = (id: string) => apiFetch<{ id: string; name: string }>(`${S}/bins/${id}`, { method: "DELETE" });
export const moveToBin = (body: { batchId: string; toBinId: string | null; quantity?: number; reason?: string }) =>
  apiFetch<{ batch_id: string; moved: number; bin: string | null }>(`${S}/bins/move`, {
    method: "POST", body: JSON.stringify({ batch_id: body.batchId, to_bin_id: body.toBinId, quantity: body.quantity ?? null, reason: body.reason ?? "" }),
  });

export interface BinAuditRow {
  id: string; binId: string; bin: string; type: string; priority: string; scheduledDate: string; assignedTo: string; notes: string;
  completedDate: string; variancesFound: number; status: "Scheduled" | "Overdue" | "Completed" | "Cancelled";
}
const adaptAudit = (a: { id: string; bin_id: string; bin: string; type: string; priority: string; scheduled_date: string; assigned_to: string; notes: string;
  completed_date: string; variances_found: number; status: BinAuditRow["status"] }): BinAuditRow => ({
  id: a.id, binId: a.bin_id, bin: a.bin, type: a.type, priority: a.priority, scheduledDate: a.scheduled_date, assignedTo: a.assigned_to, notes: a.notes,
  completedDate: a.completed_date, variancesFound: a.variances_found, status: a.status,
});
type ApiAudit = Parameters<typeof adaptAudit>[0];
export async function fetchBinAudits(binId?: string): Promise<BinAuditRow[]> {
  return (await apiFetch<ApiAudit[]>(`${S}/bins/audits${binId ? `?bin_id=${binId}` : ""}`)).map(adaptAudit);
}
export async function scheduleBinAudit(binId: string, b: { type: string; priority: string; scheduledDate: string; assignedTo: string; notes: string }) {
  return adaptAudit(await apiFetch<ApiAudit>(`${S}/bins/${binId}/audits`, {
    method: "POST", body: JSON.stringify({ audit_type: b.type, priority: b.priority, scheduled_date: b.scheduledDate, assigned_to: b.assignedTo, notes: b.notes }),
  }));
}
export async function completeBinAudit(id: string, variancesFound: number) {
  return adaptAudit(await apiFetch<ApiAudit>(`${S}/bins/audits/${id}/complete`, { method: "PATCH", body: JSON.stringify({ variances_found: variancesFound }) }));
}

export interface TempLog {
  bin: string; tempZone: string; range: [number, number] | null; items: { id: string; at: string; tempC: number; by: string; inRange: boolean | null }[];
  excursions: { id: string; at: string; tempC: number }[]; warning?: string;
}
type ApiTempLog = {
  bin: string; temp_zone: string; range: [number, number] | null; items: { id: string; at: string; temp_c: number; by: string; in_range: boolean | null }[];
  excursions: { id: string; at: string; temp_c: number }[]; warning?: string;
};
const adaptTemp = (r: ApiTempLog): TempLog => ({
  bin: r.bin, tempZone: r.temp_zone, range: r.range, warning: r.warning,
  items: r.items.map(i => ({ id: i.id, at: i.at, tempC: i.temp_c, by: i.by, inRange: i.in_range })),
  excursions: r.excursions.map(e => ({ id: e.id, at: e.at, tempC: e.temp_c })),
});
export const fetchBinTemperature = async (binId: string) => adaptTemp(await apiFetch<ApiTempLog>(`${S}/bins/${binId}/temperature`));
export const recordBinTemperature = async (binId: string, tempC: number) =>
  adaptTemp(await apiFetch<ApiTempLog>(`${S}/bins/${binId}/temperature`, { method: "POST", body: JSON.stringify({ temp_c: tempC }) }));
