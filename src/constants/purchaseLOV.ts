// Purchase module — list-of-values (LOV) constants
// Single source of truth for all dropdown options and selection lists.
// When backend LOV endpoints are live, replace these exports with API calls.

// ── Scalars ──────────────────────────────────────────────────────────────────
export const COVERAGE_DAYS = 30;
export const NEAR_EXPIRY_DAYS = 90;

// ── Payment & financial ───────────────────────────────────────────────────────
export const PAY_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "RTGS", "Other"];
export const PAYMENT_TYPES = ["Invoice Payment", "Multiple Invoice Payment", "Advance Payment", "On Account"];
export const ADJ_TYPES = ["Purchase Return", "Credit Note", "Expiry Claim", "Scheme Claim", "Rate Difference", "Settlement Discount", "Other"];
export const REVERSAL_REASONS = ["Wrong Amount", "Wrong Distributor", "Wrong Invoice", "Duplicate Payment", "Payment Method Error", "Other"];
export const BANK_NAMES = ["HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Yes Bank"];
export const BANK_ACCOUNTS = ["Chase — Main Operating", "Chase — Petty Cash", "Wells Fargo — Savings", "HDFC — Current"];
export const PAYMENT_TERMS_OPTIONS = ["Cash on Delivery", "Credit 15 Days", "Credit 30 Days", "Credit 45 Days", "Credit 60 Days"];
export const DISTRIBUTOR_PAYMENT_TERMS = ["COD", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"];

// ── Purchase orders ───────────────────────────────────────────────────────────
export const CANCEL_REASONS = ["Distributor unavailable", "Price negotiation pending", "Order placed in error", "Budget constraint", "Alternative distributor selected", "Other"];
export const WAREHOUSES = ["Main Warehouse", "Cold Store", "Branch Store"];

// ── Returns ───────────────────────────────────────────────────────────────────
export const RETURN_REASONS = [
  "Damaged on arrival",
  "Near-expiry batch",
  "Incorrect item shipped",
  "Wrong quantity received",
  "Quality issue",
  "Other",
];
export const DISPOSITION_OPTIONS = ["Replacement", "Credit Note", "Refund", "Discard"];
export const RETURN_TYPES = ["Replacement", "Credit Note", "Refund"];

// ── Payments — holds ─────────────────────────────────────────────────────────
export const HOLD_TYPES = ["Short Qty", "Rate Variance", "Expiry Issue", "Quality Issue", "Damaged", "Other"];

// ── Verification ─────────────────────────────────────────────────────────────
export const SKIP_REASONS = [
  "Direct Purchase",
  "Emergency Purchase",
  "Small / Low-Value Purchase",
  "Supplier Already Verified",
  "Already Checked Manually",
  "Trusted Supplier",
  "Other",
];

// ── Product / drug ────────────────────────────────────────────────────────────
export const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Inhaler", "Patch", "Powder", "Suppository"];
export const ROUTES = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual", "Rectal", "Ocular", "Nasal"];
export const SCHEDULES = ["Schedule H", "Schedule H1", "Schedule X", "Schedule G", "Schedule J", "OTC", "None"];
export const PRESCRIPTION_STATUSES = ["OTC", "Prescription", "Schedule H", "Schedule H1", "Schedule X", "Schedule G"];
export const PRODUCT_STATUSES = ["Active", "Inactive", "Discontinued", "Under Review"];
export const MANUFACTURER_TYPES = ["Pharmaceutical", "Biotechnology", "Generic", "OTC", "Ayurvedic", "Veterinary", "Contract Manufacturing"];

// ── Distributor ───────────────────────────────────────────────────────────────
export const DISTRIBUTOR_TYPES = ["Stockist", "Wholesaler", "Manufacturer", "Direct"];
export const ACCOUNT_STATUSES = ["Active", "Inactive", "On Hold"];
export const INDIAN_STATES = ["Andhra Pradesh", "Delhi", "Gujarat", "Karnataka", "Kerala", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];
export const NOTIFY_CHANNEL_OPTIONS = ["Email", "WhatsApp", "Email & WhatsApp"];

// ── Delivery schedule ─────────────────────────────────────────────────────────
export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const EXPIRY_PERIODS = ["15 days", "30 days", "45 days", "60 days", "90 days", "180 days"];

// ── Near-expiry helper ────────────────────────────────────────────────────────
export function isNearExpiry(expDate: string): boolean {
  if (!expDate) return false;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + NEAR_EXPIRY_DAYS);
  return new Date(expDate) < threshold;
}
