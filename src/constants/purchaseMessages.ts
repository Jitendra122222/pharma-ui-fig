// Purchase module — UI message constants
// All user-facing notification strings for the Purchase module.
// When a backend messages API is implemented, replace these with API calls.

// ── Purchase Orders ───────────────────────────────────────────────────────────
export const MSG_PO_REJECT_ALL    = "All items are rejected successfully.";
export const MSG_PO_SHORT_BOOK    = "Successfully Added to Short Book.";
export const MSG_PO_ACCEPT_ALL    = "All changes accepted successfully.";
export const MSG_PO_ACCEPT_NOTIFY = "Changes accepted and distributor notified successfully.";
export const MSG_PO_NEGOTIATE     = "Negotiation sent to distributor successfully.";

// ── Purchase Invoices ─────────────────────────────────────────────────────────
export const MSG_INVOICE_DRAFT    = "Purchase Invoice saved as Draft successfully.";
export const MSG_INVOICE_POST     = "Purchase Invoice posted successfully.";

// ── Purchase Returns ──────────────────────────────────────────────────────────
export const MSG_RETURN_DRAFT     = "Purchase Return saved as Draft successfully.";
export const MSG_RETURN_SUBMIT    = "Purchase Return submitted successfully.";

// ── Purchase Payments ─────────────────────────────────────────────────────────
export const MSG_HOLD_RESOLVED     = (invoiceId: string) => `Payment hold for ${invoiceId} resolved successfully.`;
export const MSG_HOLD_NOT_RESOLVED = (invoiceId: string) => `Payment hold for ${invoiceId} was not resolved.`;
