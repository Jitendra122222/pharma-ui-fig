/**
 * Suppliers/Distributors module API client.
 * Adapters return shapes matching the suppliers array in mockData.ts.
 */
import { apiFetch } from "./api";

const API = "/api/v1/distributors";

// ── API response shapes ───────────────────────────────────────────────────────

/** Shape of DistributorResponse (global_distributors row) from the backend. */
interface ApiDistributor {
  id: string;
  name: string;
  legal_name: string;
  type: string;
  account_status: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  drug_license_number: string;
  pan: string;
  is_active: boolean;
}

interface ApiDistributorList {
  total: number; page: number; page_size: number; items: ApiDistributor[];
}

// ── Adapter ───────────────────────────────────────────────────────────────────

function expectedDeliveryLabel(days: number, sameDay: boolean): string {
  if (sameDay) return "Same Day";
  if (days === 1) return "Next Day";
  if (days === 2) return "2 Days";
  if (days === 3) return "3 Days";
  return "Custom";
}

/** Maps a global distributor (+ optional pharmacy settings/policies) to DistributorRecord in Suppliers.tsx. */
function adaptDistributor(api: ApiDistributor, settings?: PharmacySettings | null, policies: DistributorPolicy[] = []) {
  const byType = (t: PolicyType) => policies.find(p => p.policy_type === t);
  const expiry = byType("EXPIRY_RETURN");
  const credit = settings?.credit_limit ?? 0;
  return {
    id: api.id,
    name: api.name,
    // The backend has no distributor code yet; derive a stable display code from the id.
    code: settings?.code || `DIST-${api.id.slice(0, 6).toUpperCase()}`,
    group: settings?.group_name ?? "",
    pharmacySettings: settings ?? null,
    type: api.type,
    status: (api.account_status === "Draft" ? "Draft" : api.is_active && api.account_status !== "Inactive" ? "Active" : "Inactive") as "Active" | "Inactive" | "Draft",
    preferred: settings?.preferred ?? false,
    gstin: api.gst_number,
    drugLicense: api.drug_license_number,
    drugLicenseType: "",
    city: api.city,
    state: api.state,
    contactPerson: api.contact_person,
    mobile: api.phone,
    email: api.email,
    addrLine1: api.address,
    addrLine2: api.address_line2,
    pin: api.pincode,
    pan: api.pan,
    paymentTerms: settings?.payment_terms ?? "",
    creditLimit: credit,
    creditEnabled: credit > 0,
    expiryReturn: expiry?.is_allowed ?? false,
    expiryReturnWindow: typeof expiry?.params?.period === "string" ? (expiry.params.period as string) : undefined,
    nearExpiryReturn: byType("RETURN")?.is_allowed,
    replacementAllowed: byType("DAMAGE_RETURN")?.is_allowed,
    expectedDelivery: settings ? expectedDeliveryLabel(settings.expected_delivery_days, settings.same_day_delivery) : undefined,
    deliveryDays: settings?.delivery_days ? settings.delivery_days.split(",").filter(Boolean) : undefined,
    balance: 0,
  };
}

// ── Pharmacy field mapping (form <-> pharmacy_distributor_settings columns) ───────────────

/** Form fields that map 1:1 to a column on pharmacy_distributor_settings (snake_case of the key). */
const SETTINGS_FORM_KEYS = [
  "altPhone", "whatsapp", "website", "country", "area", "district", "gstType", "fssai",
  "drugLicenseType", "licenseExpiry", "additionalReg",
  "billingSameAsBusiness", "billAddrLine1", "billAddrLine2", "billArea", "billCity", "billDistrict", "billState", "billPin",
  "outstandingLimit", "defaultDiscount", "defaultScheme", "productWiseTerms", "distributorPricing",
  "defaultFreight", "minOrderValue", "minOrderQty",
  "expiryPolicy", "minShelfLife", "returnBeforeExpiry", "returnFreight", "creditNoteExpected", "expiredReturn",
  "orderMethod", "orderConfirmRequired", "expectedDelivery", "deliveryTimeFrom", "deliveryTimeTo",
  "minOrderValueDelivery", "freeDeliveryAbove", "partialDelivery", "backorder", "substitution",
  "invoiceFormat", "invoiceImportEnabled", "invoiceEmail", "prefInvoiceFormat", "autoInvoiceMatching", "invoiceValidation",
  "bankName", "accountName", "accountNumber", "ifsc", "branch", "upiId", "preferredPayment",
  "priorityRanking", "isDefault", "allowPO", "supplierConfirmation", "priceNegotiation", "schemeNegotiation",
  "substituteProduct", "partialSupply", "purchaseVerification", "physicalVerification",
  "distributorNotes", "internalRemarks", "importantInstructions",
] as const;

const toSnake = (k: string) =>
  k === "allowPO" ? "allow_po"
  : k === "expectedDelivery" ? "expected_delivery_label"
  : k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

type Obj = Record<string, unknown>;

/** Repeating rows (contacts, medicine expiry rules): drop the UI-only `id`, snake_case the keys. */
const rowToApi = (row: Obj): Obj =>
  Object.fromEntries(Object.entries(row).filter(([k]) => k !== "id").map(([k, v]) => [toSnake(k), v]));
const rowFromApi = (row: Obj, i: number): Obj =>
  ({ ...Object.fromEntries(Object.entries(row).filter(([k]) => k !== "id").map(([k, v]) => [toCamel(k), v])), id: i + 1 });

/** Form -> flat API fields (columns) plus the contacts / expiry_rules lists. */
export function formToSettingsFields(form: Obj): Obj {
  const out: Obj = {};
  for (const k of SETTINGS_FORM_KEYS) {
    if (form[k] !== undefined) out[toSnake(k)] = form[k];
  }
  out.contacts = ((form.contacts as Obj[] | undefined) ?? []).map(rowToApi);
  out.expiry_rules = ((form.medExpiryRules as Obj[] | undefined) ?? []).map(rowToApi);
  return out;
}

/** Saved settings (API shape) -> the form keys they cover; form defaults fill the rest. */
export function settingsToForm(s: Obj | undefined | null): Obj {
  const out: Obj = {};
  if (!s) return out;
  for (const k of SETTINGS_FORM_KEYS) {
    const snake = toSnake(k);
    if (snake in s) out[k] = s[snake];
  }
  if (Array.isArray(s.contacts) && s.contacts.length) out.contacts = (s.contacts as Obj[]).map(rowFromApi);
  if (Array.isArray(s.expiry_rules)) out.medExpiryRules = (s.expiry_rules as Obj[]).map(rowFromApi);
  return out;
}

// ── Create payload ────────────────────────────────────────────────────────────

export interface CreateDistributorPayload {
  // Global fields
  name: string;
  legal_name?: string;
  type?: string;
  account_status?: string;
  gst_number?: string;
  drug_license_number?: string;
  drug_license_2?: string;
  pan?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  sales_rep?: string;
  notify_channel?: string;
  address?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // Pharmacy-specific fields
  code?: string;
  preferred?: boolean;
  group_name?: string;
  /** Plus every other pharmacy column (bank_name, ifsc, ...) — see formToSettingsFields. */
  contacts?: Record<string, unknown>[];
  expiry_rules?: Record<string, unknown>[];
  [column: string]: unknown;
  credit_limit?: number;
  payment_terms?: string;
  expected_delivery_days?: number;
  delivery_days?: string[];
  salesperson_visit_days?: string[];
  same_day_delivery?: boolean;
  // Return policy flags — stored server-side as distributor_policies rows
  return_allowed?: boolean;
  damage_return_allowed?: boolean;
  expiry_return_allowed?: boolean;
  expiry_return_period?: string;
}

export type PolicyType = "RETURN" | "DAMAGE_RETURN" | "EXPIRY_RETURN" | "DELIVERY" | "CREDIT" | "PAYMENT";

export interface DistributorPolicy {
  id: string;
  policy_type: PolicyType;
  is_allowed: boolean;
  params: Record<string, unknown>;
  notes: string;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface PharmacySettings {
  id: string;
  global_distributor_id: string;
  credit_limit: number;
  payment_terms: string;
  expected_delivery_days: number;
  /** Comma-separated, e.g. "Mon,Thu" */
  delivery_days: string;
  salesperson_visit_days: string;
  same_day_delivery: boolean;
  code: string;
  preferred: boolean;
  group_name: string;
  contacts: Record<string, unknown>[];
  expiry_rules: Record<string, unknown>[];
  is_active: boolean;
  [column: string]: unknown;
}

export interface PharmacySettingsUpdate {
  code?: string;
  preferred?: boolean;
  group_name?: string;
  contacts?: Record<string, unknown>[];
  expiry_rules?: Record<string, unknown>[];
  [column: string]: unknown;
  credit_limit?: number;
  payment_terms?: string;
  expected_delivery_days?: number;
  delivery_days?: string[];
  salesperson_visit_days?: string[];
  same_day_delivery?: boolean;
  is_active?: boolean;
}

export interface PolicyUpsert {
  is_allowed: boolean;
  params?: Record<string, unknown>;
  notes?: string;
  effective_from?: string | null;
  effective_to?: string | null;
}

export interface CreateDistributorResponse {
  distributor: { id: string; name: string };
  pharmacy_settings: PharmacySettings | null;
  policies: DistributorPolicy[];
  /** True when the distributor already existed in the global catalog and was linked to this pharmacy. */
  linked_existing: boolean;
}

export interface MyDistributor {
  distributor: ApiDistributor;
  pharmacy_settings: PharmacySettings | null;
  policies: DistributorPolicy[];
}

// ── Public functions ──────────────────────────────────────────────────────────

/**
 * The Distributor Master list: this pharmacy's distributors with its own settings and policies.
 * Users without a pharmacy (super_admin) get the global catalog instead.
 */
export async function fetchDistributors(page = 1, pageSize = 100) {
  try {
    const mine = await fetchMyDistributors(page, pageSize);
    return {
      total: mine.total,
      items: mine.items.map(m => adaptDistributor(m.distributor, m.pharmacy_settings, m.policies)),
    };
  } catch {
    const data = await apiFetch<ApiDistributorList>(`${API}?page=${page}&page_size=${pageSize}`);
    return { total: data.total, items: data.items.map(d => adaptDistributor(d)) };
  }
}

export async function createDistributor(payload: CreateDistributorPayload) {
  return apiFetch<CreateDistributorResponse>(API, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Distributors linked to the signed-in pharmacy, with its own settings and policies. */
export async function fetchMyDistributors(page = 1, pageSize = 100, search = "") {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) q.set("search", search);
  return apiFetch<{ total: number; page: number; page_size: number; items: MyDistributor[] }>(`${API}/mine?${q}`);
}

export async function fetchMyDistributor(distributorId: string) {
  return apiFetch<MyDistributor>(`${API}/${distributorId}/mine`);
}

export async function updateMyDistributorSettings(distributorId: string, payload: PharmacySettingsUpdate) {
  return apiFetch<PharmacySettings>(`${API}/${distributorId}/settings`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function upsertMyDistributorPolicy(distributorId: string, type: PolicyType, payload: PolicyUpsert) {
  return apiFetch<DistributorPolicy>(`${API}/${distributorId}/policies/${type}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
