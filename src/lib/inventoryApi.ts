/**
 * Inventory / product master API client.
 *
 * A product has two halves: the shared catalog row (global_products) and this pharmacy's own settings
 * (pharmacy_product_settings). The Add Product form mixes both, so this file maps the form to one flat
 * request and back again. Nothing here is mock data; if a request fails the caller shows the error.
 */
import { apiFetch } from "./api";

const API = "/api/v1/products";

// ── Form <-> API field mapping ────────────────────────────────────────────────

/** The Add Product form (all values are strings/booleans exactly as the inputs hold them). */
export interface ProductForm {
  genericName: string; brandName: string; strength: string; dosageForm: string;
  route: string; packUnit: string; manufacturer: string; therapeuticCategory: string;
  saltComposition: string; therapeuticClass: string;
  hsnCode: string; barcode: string; prescriptionStatus: string; gstRate: string;
  storageCondition: string; tempRange: string; storageZone: string; mfgProductCode: string;
  distributorRef: string; regulatoryNotes: string;
  prescriptionRequired: boolean; looseSell: boolean;
  controlledDrug: boolean; narcotic: boolean; coldChain: boolean; specialHandling: boolean;
  mrp: string; sellingPrice: string; openingStock: string; reorderThreshold: string;
  minimumStock: string; stockLocation: string; location: string; baseUnit: string; purchaseUnit: string;
  saleUnit: string; unitConversion: string; wholesalePrice: string; margin: string;
  discountLimit: string; maximumStock: string; reorderQty: string; leadTime: string;
  batchTracking: boolean; expiryTracking: boolean; fefoDispensing: boolean;
  therapeuticIndications: string; contraindications: string; dosageInstructions: string;
  sideEffects: string; patientLabelText: string; reviewNotes: string;
  productStatus: string; effectiveFrom: string;
}

/** form key -> API field, for every field that is sent as-is (strings). */
const TEXT_FIELDS: Record<string, string> = {
  genericName: "generic_name", brandName: "brand_name", strength: "strength", dosageForm: "dosage_form",
  route: "route", packUnit: "pack_unit", manufacturer: "manufacturer", therapeuticCategory: "therapeutic_category",
  saltComposition: "salt_composition", therapeuticClass: "therapeutic_class", hsnCode: "hsn_code", barcode: "barcode",
  prescriptionStatus: "prescription_status", storageCondition: "storage_condition", tempRange: "temp_range",
  storageZone: "storage_zone", mfgProductCode: "mfg_product_code", distributorRef: "distributor_ref",
  regulatoryNotes: "regulatory_notes", stockLocation: "stock_location", location: "location",
  baseUnit: "base_unit", purchaseUnit: "purchase_unit", saleUnit: "sale_unit", unitConversion: "unit_conversion",
  therapeuticIndications: "therapeutic_indications", contraindications: "contraindications",
  dosageInstructions: "dosage_instructions", sideEffects: "side_effects", patientLabelText: "patient_label_text",
  reviewNotes: "review_notes", productStatus: "product_status",
};
const BOOL_FIELDS: Record<string, string> = {
  prescriptionRequired: "prescription_required", looseSell: "loose_sell", controlledDrug: "controlled_drug",
  narcotic: "narcotic", coldChain: "cold_chain", specialHandling: "special_handling",
  batchTracking: "batch_tracking", expiryTracking: "expiry_tracking", fefoDispensing: "fefo_dispensing",
};
/** decimals travel as strings so no precision is lost */
const DECIMAL_FIELDS: Record<string, string> = {
  gstRate: "gst_rate", mrp: "mrp", sellingPrice: "selling_price", wholesalePrice: "wholesale_price",
  margin: "margin", discountLimit: "discount_limit",
};
const INT_FIELDS: Record<string, string> = {
  openingStock: "opening_stock", minimumStock: "minimum_stock", maximumStock: "maximum_stock",
  reorderThreshold: "reorder_threshold", reorderQty: "reorder_qty", leadTime: "lead_time_days",
};

type Obj = Record<string, unknown>;

/** Form -> flat API payload. Blank numeric inputs are sent as 0 so the backend defaults/validators decide. */
export function formToPayload(form: ProductForm, opts: { isDraft: boolean; isGloballyAvailable?: boolean }): Obj {
  const f = form as unknown as Obj;
  const out: Obj = {};
  for (const [k, api] of Object.entries(TEXT_FIELDS)) out[api] = String(f[k] ?? "").trim();
  for (const [k, api] of Object.entries(BOOL_FIELDS)) out[api] = !!f[k];
  for (const [k, api] of Object.entries(DECIMAL_FIELDS)) out[api] = String(f[k] ?? "").trim() || "0";
  for (const [k, api] of Object.entries(INT_FIELDS)) {
    const n = parseInt(String(f[k] ?? "").trim(), 10);
    out[api] = Number.isNaN(n) ? 0 : n;
  }
  out.effective_from = form.effectiveFrom || null;
  out.schedule_drug = ["Schedule H", "Schedule H1", "Schedule X", "Schedule G"].includes(form.prescriptionStatus);
  out.is_draft = opts.isDraft;
  if (opts.isGloballyAvailable !== undefined) out.is_globally_available = opts.isGloballyAvailable;
  return out;
}

/** Settings-only payload for an existing product (the pharmacy half of the form). */
export function formToSettingsPayload(form: ProductForm): Obj {
  const all = formToPayload(form, { isDraft: false });
  const keep = new Set([
    "selling_price", "wholesale_price", "margin", "discount_limit", "opening_stock", "minimum_stock", "maximum_stock",
    "reorder_threshold", "reorder_qty", "lead_time_days", "stock_location", "location", "storage_zone", "sale_unit",
    "unit_conversion", "loose_sell", "batch_tracking", "expiry_tracking", "fefo_dispensing", "distributor_ref",
    "regulatory_notes", "patient_label_text", "review_notes", "product_status", "effective_from",
  ]);
  return Object.fromEntries(Object.entries(all).filter(([k]) => keep.has(k)));
}

/** API product + settings -> form values. */
export function detailToForm(d: ApiMyProduct, defaults: ProductForm): ProductForm {
  const merged: Obj = { ...d.product, ...(d.pharmacy_settings ?? {}) };
  const out: Obj = { ...defaults };
  for (const [k, api] of Object.entries(TEXT_FIELDS)) if (merged[api] !== undefined && merged[api] !== null) out[k] = String(merged[api]);
  for (const [k, api] of Object.entries(BOOL_FIELDS)) if (merged[api] !== undefined) out[k] = !!merged[api];
  for (const [k, api] of Object.entries(DECIMAL_FIELDS)) if (merged[api] !== undefined) out[k] = String(merged[api]);
  for (const [k, api] of Object.entries(INT_FIELDS)) if (merged[api] !== undefined) out[k] = String(merged[api]);
  if (d.pharmacy_settings?.effective_from) out.effectiveFrom = String(d.pharmacy_settings.effective_from);
  return out as unknown as ProductForm;
}

// ── API shapes ────────────────────────────────────────────────────────────────

export interface ApiProduct {
  id: string; brand_name: string; generic_name: string; strength: string; dosage_form: string;
  manufacturer: string; therapeutic_category: string; pack_unit: string; hsn_code: string; gst_rate: string;
  mrp: string; prescription_status: string; is_active: boolean; controlled_drug: boolean; narcotic: boolean;
  is_globally_available: boolean; is_draft: boolean; product_status: string;
  [k: string]: unknown;
}

export interface ApiSettings {
  id: string; selling_price: string; minimum_stock: number; opening_stock: number; location: string;
  distributor_ref: string; product_status: string; is_draft: boolean; effective_from: string | null;
  [k: string]: unknown;
}

export interface ApiImage { id: string; filename: string; content_type: string; size_bytes: number; position: number; url: string }

export interface ApiMyProduct {
  product: ApiProduct; pharmacy_settings: ApiSettings | null; images: ApiImage[]; total_stock: number;
  linked_existing?: boolean;
}

interface ApiMyList { total: number; page: number; page_size: number; items: ApiMyProduct[] }

// ── List adapter: the shape the Inventory table and other screens already use ──

function stockStatus(stock: number, min: number, active: boolean): string {
  if (!active || stock <= 0) return "Out of Stock";
  return stock < min ? "Low Stock" : "In Stock";
}

export function adaptMyProduct(m: ApiMyProduct) {
  const p = m.product, s = m.pharmacy_settings;
  const mrp = parseFloat(p.mrp);
  const selling = s ? parseFloat(s.selling_price) : mrp;
  const min = s?.minimum_stock ?? 0;
  const active = p.is_active && (s?.product_status ?? p.product_status) === "Active";
  return {
    id: p.id,
    name: `${p.brand_name || p.generic_name}${p.strength && !p.brand_name.includes(p.strength) ? " " + p.strength : ""}`,
    category: p.therapeutic_category,
    manufacturer: p.manufacturer,
    stock: m.total_stock,
    minStock: min,
    unit: p.dosage_form || "Units",
    price: selling,
    cost: s ? parseFloat(String(s.wholesale_price ?? 0)) : 0,
    expiry: "",
    supplier: s?.distributor_ref ?? "",
    location: s?.location ?? "",
    status: m.pharmacy_settings?.is_draft ? "Draft" : stockStatus(m.total_stock, min, active),
    batchId: "",
    lastMove: "",
    // product facts and flags
    genericName: p.generic_name, brandName: p.brand_name, strength: p.strength, form: p.dosage_form,
    packUnit: p.pack_unit, hsnCode: p.hsn_code, gstRate: parseFloat(p.gst_rate), mrp, saleRate: selling,
    prescriptionStatus: p.prescription_status, controlled: p.controlled_drug, narcotic: p.narcotic,
    isDraft: !!s?.is_draft, isGloballyAvailable: p.is_globally_available,
  };
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** The products in the signed-in pharmacy's inventory (drives the Inventory list). */
export async function fetchProducts(page = 1, pageSize = 100, search = "") {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) q.set("search", search);
  try {
    const data = await apiFetch<ApiMyList>(`${API}/mine?${q}`);
    return { total: data.total, items: data.items.map(adaptMyProduct) };
  } catch (e) {
    // A user with no pharmacy (super_admin) sees the whole catalog instead.
    if (!(e instanceof Error) || !/\b400\b/.test(e.message)) throw e;
    const data = await apiFetch<{ total: number; items: ApiProduct[] }>(`${API}?${q}`);
    return {
      total: data.total,
      items: data.items.map(p => adaptMyProduct({ product: p, pharmacy_settings: null, images: [], total_stock: 0 })),
    };
  }
}

export async function fetchMyProduct(productId: string): Promise<ApiMyProduct> {
  return apiFetch<ApiMyProduct>(`${API}/${productId}/mine`);
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createProduct(form: ProductForm, opts: { isDraft: boolean; isGloballyAvailable?: boolean }) {
  return apiFetch<ApiMyProduct>(API, { method: "POST", body: JSON.stringify(formToPayload(form, opts)) });
}

export async function updateMySettings(productId: string, payload: Obj) {
  return apiFetch<ApiMyProduct>(`${API}/${productId}/settings`, { method: "PUT", body: JSON.stringify(payload) });
}

/** Publish a saved draft: sets is_draft=false together with the latest pharmacy values. */
export async function publishDraft(productId: string, form: ProductForm) {
  return updateMySettings(productId, { ...formToSettingsPayload(form), is_draft: false });
}

export async function uploadProductImage(productId: string, file: File): Promise<ApiImage> {
  const body = new FormData();
  body.append("file", file);
  // apiFetch leaves Content-Type unset for FormData so the browser adds the multipart boundary.
  return apiFetch<ApiImage>(`${API}/${productId}/images`, { method: "POST", body });
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await apiFetch<void>(`${API}/${productId}/images/${imageId}`, { method: "DELETE" });
}

// ── Super-admin catalog flag ──────────────────────────────────────────────────

export async function setProductAvailability(productId: string, available: boolean) {
  return apiFetch<ApiProduct>(`${API}/${productId}/availability`, {
    method: "PUT", body: JSON.stringify({ is_globally_available: available }),
  });
}

export async function bulkSetAvailability(productIds: string[], available: boolean) {
  return apiFetch<{ requested: number; updated: number; not_found: string[] }>(`${API}/availability/bulk`, {
    method: "POST", body: JSON.stringify({ product_ids: productIds, is_globally_available: available }),
  });
}
