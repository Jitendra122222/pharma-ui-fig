import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import PurchaseVerifyFlow from "./PurchaseVerifyFlow";
import { suppliers, drugs } from "../../data/mockData";
import MultiStepper from "../shared/MultiStepper";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import { DateRangePicker } from "../shared/DateRangePicker";
import { SearchIcon, ChevronDown } from "../shared/Icons";
import {
  type PurchaseLine, type InvoiceInitialData, type ImportKind, type AttachedFile,
  purchaseInvoices, MOCK_INVOICE_LINES, MOCK_EMAILS, MOCK_OCR_HEADERS, SYSTEM_FIELDS,
  CLEAN_CSV_HEADERS, MESSY_CSV_HEADERS, TODAY,
  formatDMY, money, newEmptyLine, calcLineSubtotal, calcLineDiscount, calcLineTax,
  normalizeHeader, autoMapHeader, classifyImportedLine,
} from "./purchasesData";
import {
  Td, TableRow, PrimaryBtn, GhostBtn, Modal,
  FilterSearch, FilterDropdown, ClearFiltersButton, NewButton,
  BackConfirmDialog, EmptyTableRow,
  MedicineMapModal, PurchaseLineItemsTable, AddMedicineDrawer,
  DistributorSearch, AddDistributorDrawer, DistributorDrawer,
} from "./purchasesShared";

// ─── EditableChip (purchase-invoice–specific, not the shared one) ─────────────

function EditableChip({ label, value, onChange, editable, prefix, allowNegative }: {
  label: string; value: number; onChange?: (v: number) => void; editable: boolean; prefix?: string; allowNegative?: boolean;
}) {
  const [text, setText] = useState(value ? Math.abs(value).toFixed(2) : "");
  const commit = () => {
    const n = parseFloat(text) || 0;
    const signed = allowNegative ? n : Math.abs(n);
    onChange?.(signed);
    setText(signed ? Math.abs(signed).toFixed(2) : "");
  };
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "0 14px", borderLeft: "1px solid #EEF1F6", background: editable ? "#FAFBFD" : undefined, flex: "0 0 auto", minWidth: 140 }}>
      <div>
        <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        {editable ? (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#6B7280" }}>{prefix ?? ""}₹</span>
            <input type="text" value={text} onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()}
              placeholder="0.00"
              style={{ width: 72, padding: "2px 4px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", textAlign: "right" }} />
          </div>
        ) : (
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#6B7280" }}>{prefix ?? ""}₹{Math.abs(value).toFixed(2)}</div>
        )}
      </div>
    </div>
  );
}

// ─── PurchaseInvoiceFooter ────────────────────────────────────────────────────

function PurchaseInvoiceFooter({ items, paid = 0, cashDiscount = 0, onCashDiscountChange, adjustment = 0, onAdjustmentChange }: {
  items: PurchaseLine[]; paid?: number; cashDiscount?: number; onCashDiscountChange?: (v: number) => void; adjustment?: number; onAdjustmentChange?: (v: number) => void;
}) {
  const active = items.filter(i => i.medicineName);
  const subtotal = active.reduce((s, i) => s + calcLineSubtotal(i), 0);
  const discount = active.reduce((s, i) => s + calcLineDiscount(i), 0);
  const tax = active.reduce((s, i) => s + calcLineTax(i), 0);
  const preRound = subtotal - discount - cashDiscount + tax + adjustment;
  const roundOff = Math.round(preRound) - preRound;
  const total = preRound + roundOff;
  const balance = total - paid;

  const editableCash = onCashDiscountChange !== undefined;
  const editableAdj = onAdjustmentChange !== undefined;

  const readChips = [
    { label: "Subtotal", val: money(subtotal), muted: true },
    { label: "Item Discount", val: `-${money(discount)}`, muted: true },
    { label: "GST / Tax", val: money(tax), muted: true },
    { label: "Round Off", val: `${roundOff >= 0 ? "" : "-"}₹${Math.abs(roundOff).toFixed(2)}`, muted: true },
    { label: "Total", val: money(total), bold: true, highlight: true },
    { label: "Paid", val: money(paid), muted: true, color: "#2E7D32" },
    { label: "Balance", val: money(balance), bold: true, color: balance > 0 ? "#C62828" : "#2E7D32" },
  ];

  return (
    <div style={{ flexShrink: 0, borderTop: "2px solid #E8ECF4", background: "#fff", display: "flex", alignItems: "stretch", minHeight: 76 }}>
      <div style={{ display: "flex", alignItems: "stretch", flex: 1, width: "100%", flexWrap: "nowrap", overflowX: "auto" }}>
        <EditableChip label="Cash Discount" value={cashDiscount} onChange={onCashDiscountChange} editable={editableCash} prefix="-" />
        <EditableChip label="Adjustment" value={adjustment} onChange={onAdjustmentChange} editable={editableAdj} allowNegative />
        {readChips.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", padding: "0 16px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 110 }}>
            <div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
              <div style={{
                fontFamily: "JetBrains Mono",
                fontSize: s.bold ? 15 : 13,
                fontWeight: s.bold ? 700 : 500,
                color: s.color ?? (s.muted ? "#6B7280" : "#1A2436"),
                background: s.highlight ? "#EFF6FF" : undefined,
                padding: s.highlight ? "2px 6px" : undefined,
                display: "inline-block",
                whiteSpace: "nowrap",
              }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

// ─── ImportMenu ───────────────────────────────────────────────────────────────

function ImportMenu({ onImport }: { onImport: (file: AttachedFile) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const pick = (kind: ImportKind) => {
    setOpen(false);
    const map = { csv: csvRef, pdf: pdfRef, image: imgRef };
    map[kind].current?.click();
  };

  const change = (kind: ImportKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let headers: string[] = [];
    if (kind === "csv") {
      try {
        const text = await file.text();
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        headers = firstLine.split(",").map(h => h.trim().replace(/^"|"$/g, "")).filter(Boolean);
      } catch { headers = []; }
    } else {
      headers = MOCK_OCR_HEADERS;
    }
    onImport({ kind, name: file.name, size: file.size, source: "upload", headers });
    e.target.value = "";
  };

  const options: { kind: ImportKind; label: string; desc: string }[] = [
    { kind: "csv", label: "CSV file", desc: "Distributor invoice as CSV" },
    { kind: "pdf", label: "PDF invoice", desc: "Scanned or digital PDF" },
    { kind: "image", label: "Image", desc: "JPG / PNG photo of an invoice" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
        <UploadIcon />
        Import
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 60, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 220 }}>
          {options.map(o => (
            <button key={o.kind} onClick={() => pick(o.kind)}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA", fontFamily: "Inter" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{o.label}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{o.desc}</div>
            </button>
          ))}
        </div>
      )}
      <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={change("csv")} />
      <input ref={pdfRef} type="file" accept=".pdf,application/pdf" hidden onChange={change("pdf")} />
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={change("image")} />
    </div>
  );
}

// ─── EmailFetchModal ──────────────────────────────────────────────────────────

function EmailFetchModal({ onClose, onImport }: { onClose: () => void; onImport: (file: AttachedFile) => void }) {
  const pick = (email: typeof MOCK_EMAILS[0]) => {
    const headers = email.id === 1 ? CLEAN_CSV_HEADERS : MESSY_CSV_HEADERS;
    onImport({ kind: "csv", name: email.attachment, size: email.sizeKb * 1024, source: "email", sender: email.sender, headers });
    onClose();
  };
  return (
    <Modal title="Fetch invoices from email" onClose={onClose} width={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
          {MOCK_EMAILS.length} recent emails with CSV attachments from your distributors. Click any row to attach the CSV to this invoice.
        </div>
        <div style={{ border: "1px solid #E8ECF4" }}>
          {MOCK_EMAILS.map((email, i) => (
            <button key={email.id} onClick={() => pick(email)}
              style={{ width: "100%", textAlign: "left", padding: "12px 14px", border: "none", borderBottom: i < MOCK_EMAILS.length - 1 ? "1px solid #F4F6FA" : "none", background: "transparent", cursor: "pointer", fontFamily: "Inter" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{email.sender}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>&lt;{email.from}&gt;</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#4A5875", marginTop: 3 }}>{email.subject}</div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{email.attachment}</span>
                    <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>{email.sizeKb} KB</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {email.date}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <GhostBtn onClick={onClose}>Close</GhostBtn>
        </div>
      </div>
    </Modal>
  );
}

// ─── ImportWizard ─────────────────────────────────────────────────────────────

function ImportWizard({ file, distributorKnown, onCancel, onConfirm }: {
  file: AttachedFile;
  distributorKnown: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const headers = file.headers ?? [];
  const [step, setStep] = useState<"map" | "review">("map");
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(headers.map(h => [h, autoMapHeader(h) ?? "ignore"]))
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const mappedIds = new Set(Object.values(mapping).filter(v => v !== "ignore"));
  const requiredIds = SYSTEM_FIELDS.filter(f => f.required).map(f => f.id);
  const missingRequired = requiredIds.filter(id => !mappedIds.has(id));
  const mappedCount = headers.filter(h => mapping[h] !== "ignore").length;
  const ignoredCount = headers.length - mappedCount;
  const kindLabel = file.kind === "csv" ? "CSV" : file.kind === "pdf" ? "PDF" : "image";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 920, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 26px", borderBottom: "1px solid #EEF1F6", position: "relative", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Purchase Invoice Utility</div>
          <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.01em" }}>Import invoice {kindLabel}</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 6, maxWidth: 700 }}>
            Match your distributor&apos;s headers to the existing purchase invoice fields before anything enters inventory.
          </div>
          <button onClick={onCancel}
            style={{ position: "absolute", top: 20, right: 20, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", width: 32, height: 32, borderRadius: "50%", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <MultiStepper
          steps={["Upload " + kindLabel, "Map columns", "Review & import"]}
          current={step === "map" ? 2 : 3}
          noBorder
        />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {step === "map" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Your CSV Header", "Existing Invoice Field", "Match Status"].map(h => (
                    <th key={h} style={{ padding: "12px 26px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", background: "#fff", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {headers.map(h => {
                  const mapped = mapping[h];
                  const isMapped = mapped !== "ignore";
                  const field = SYSTEM_FIELDS.find(f => f.id === mapped);
                  const letter = h.trim().charAt(0).toUpperCase() || "?";
                  const isUnresolved = !isMapped && missingRequired.length > 0;
                  return (
                    <tr key={h} style={{ borderBottom: "1px solid #F4F6FA" }}>
                      <td style={{ padding: "16px 26px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ width: 24, height: 24, background: "#EEF1F6", color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono", flexShrink: 0 }}>{letter}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33" }}>{h}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 26px", verticalAlign: "middle" }}>
                        <div style={{ position: "relative", maxWidth: 320 }}>
                          <select value={mapped} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                            style={{ width: "100%", padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: "#0C1B33", appearance: "none", WebkitAppearance: "none" }}>
                            <option value="ignore">Ignore this column</option>
                            {SYSTEM_FIELDS.map(f => (
                              <option key={f.id} value={f.id}>{f.label}{f.required ? " · required" : ""}</option>
                            ))}
                          </select>
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
                            <ChevronDown />
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 26px", verticalAlign: "middle" }}>
                        {isMapped ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32", background: "#E8F5E9", padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11 }}>✓</span> Matched to {field?.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 500, color: isUnresolved ? "#92400E" : "#9CA3AF", background: isUnresolved ? "#FEF3C7" : "#F5F5F5", padding: "5px 12px", display: "inline-flex" }}>
                            {isUnresolved ? "⚠ Needs mapping" : "Will be ignored"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {step === "review" && (
            <div style={{ padding: "22px 26px" }}>
              {!distributorKnown && (
                <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", marginBottom: 16, fontSize: 13, color: "#1B6CA8" }}>
                  Distributor <strong>added this session</strong> — this mapping will be saved as their default when the invoice is posted.
                </div>
              )}
              {missingRequired.length > 0 && (
                <div style={{ padding: "12px 16px", background: "#FFF3E0", border: "1px solid #FDE68A", marginBottom: 16, fontSize: 13, color: "#92400E" }}>
                  <strong>Missing required fields:</strong> {missingRequired.map(id => SYSTEM_FIELDS.find(f => f.id === id)?.label).join(", ")}. Go back and map them before continuing.
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ padding: "14px 16px", border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Columns Mapped</div>
                  <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#2E7D32", marginTop: 4 }}>{mappedCount}</div>
                </div>
                <div style={{ padding: "14px 16px", border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Columns Ignored</div>
                  <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#6B7280", marginTop: 4 }}>{ignoredCount}</div>
                </div>
                <div style={{ padding: "14px 16px", border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Source</div>
                  <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{file.source === "email" ? file.sender ?? "Email" : "Local upload"}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Mapping Summary</div>
              <div style={{ border: "1px solid #E8ECF4" }}>
                {headers.map((h, i) => {
                  const mapped = mapping[h];
                  const isMapped = mapped !== "ignore";
                  const field = SYSTEM_FIELDS.find(f => f.id === mapped);
                  return (
                    <div key={h} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: i < headers.length - 1 ? "1px solid #F4F6FA" : "none", fontSize: 12 }}>
                      <span style={{ fontFamily: "JetBrains Mono", color: "#0C1B33" }}>{h}</span>
                      <span style={{ fontFamily: "Inter", color: isMapped ? "#2E7D32" : "#9CA3AF" }}>
                        → {isMapped ? field?.label : "Ignored"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 26px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Safe import · no invoice is posted automatically
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step === "map" ? (
              <>
                <GhostBtn onClick={onCancel}>← Cancel</GhostBtn>
                <button
                  onClick={() => setStep("review")}
                  disabled={missingRequired.length > 0}
                  title={missingRequired.length > 0 ? `Map these required fields first: ${missingRequired.map(id => SYSTEM_FIELDS.find(f => f.id === id)?.label).join(", ")}` : undefined}
                  style={{ padding: "10px 20px", border: "none", background: missingRequired.length > 0 ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: missingRequired.length > 0 ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  Preview normalized rows →
                </button>
              </>
            ) : (
              <>
                <GhostBtn onClick={() => setStep("map")}>← Back</GhostBtn>
                <button onClick={onConfirm} disabled={missingRequired.length > 0}
                  style={{ padding: "10px 20px", border: "none", background: missingRequired.length > 0 ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: missingRequired.length > 0 ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  Confirm & Attach
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ImportCards (empty-state illustration) ───────────────────────────────────

const ImportCards = () => (
  <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 16 }}>
    {/* CSV Doc */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 70 }}>
      <div style={{ width: 54, height: 68, background: "#E8F5E9", border: "1px dashed #81C784", borderRadius: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 6, position: "relative" }}>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#2E7D32" }} />
          <div style={{ width: 14, height: 3, background: "#81C784", borderRadius: 1 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, flex: 1, margin: "6px 0" }}>
          <div style={{ background: "#C8E6C9", height: 6 }} />
          <div style={{ background: "#A5D6A7", height: 6 }} />
          <div style={{ background: "#C8E6C9", height: 6 }} />
          <div style={{ background: "#A5D6A7", height: 6 }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#2E7D32", fontFamily: "JetBrains Mono", background: "#C8E6C9", padding: "1px 3px", borderRadius: 2, alignSelf: "flex-end" }}>CSV</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#57606A", marginTop: 6 }}>Excel/CSV</span>
    </div>

    {/* PDF Doc */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 70 }}>
      <div style={{ width: 54, height: 68, background: "#FFEBEE", border: "1px dashed #E57373", borderRadius: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 6 }}>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#C62828" }} />
          <div style={{ width: 14, height: 3, background: "#E57373", borderRadius: 1 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, margin: "8px 0" }}>
          <div style={{ background: "#FFCDD2", height: 3, width: "80%" }} />
          <div style={{ background: "#FFCDD2", height: 3, width: "100%" }} />
          <div style={{ background: "#FFCDD2", height: 3, width: "60%" }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#C62828", fontFamily: "JetBrains Mono", background: "#FFCDD2", padding: "1px 3px", borderRadius: 2, alignSelf: "flex-end" }}>PDF</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#57606A", marginTop: 6 }}>PDF Bill</span>
    </div>

    {/* OCR Image Doc */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 70 }}>
      <div style={{ width: 54, height: 68, background: "#E3F2FD", border: "1px dashed #64B5F6", borderRadius: 6, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 6 }}>
        <div style={{ display: "flex", gap: 3 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1565C0" }} />
          <div style={{ width: 14, height: 3, background: "#64B5F6", borderRadius: 1 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, margin: "6px 0", color: "#2196F3" }}>
          <span style={{ fontSize: 16 }}>📷</span>
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#1565C0", fontFamily: "JetBrains Mono", background: "#BBDEFB", padding: "1px 3px", borderRadius: 2, alignSelf: "flex-end" }}>IMG</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#57606A", marginTop: 6 }}>Scan/Photo</span>
    </div>
  </div>
);

// ─── Tab: Purchase Invoice list ───────────────────────────────────────────────

function PurchaseInvoiceList({ onNew, onView, invoices }: { onNew: () => void; onView: (id: string) => void; invoices: typeof purchaseInvoices }) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => invoices.filter(i => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || i.id.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q) || i.poRef.toLowerCase().includes(q);
    const mSupplier = supplierFilter === "All" || i.supplier === supplierFilter;
    const mStatus = statusFilter === "All" || i.status === statusFilter;
    const mFrom = !fromDate || i.date >= fromDate;
    const mTo = !toDate || i.date <= toDate;
    return mSearch && mSupplier && mStatus && mFrom && mTo;
  }), [invoices, search, supplierFilter, statusFilter, fromDate, toDate]);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || supplierFilter !== "All" || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setSupplierFilter("All"); setStatusFilter("All"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Purchase Invoices</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search invoice no, distributor, PO..." />
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <FilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={suppliers.map(s => s.name)} allLabel="All Distributors" />
          <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={["Paid", "Partial", "Unpaid", "Cancelled"]} allLabel="All Invoice Status" />
          {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
          <NewButton label="+ Purchase Invoice" onClick={onNew} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Invoice #</Th>
                <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Distributor</Th>
                <Th onSort={() => handleSort("poRef")} sortDir={sortCol === "poRef" ? sortDir : null}>PO Ref</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Invoice Date</Th>
                <Th onSort={() => handleSort("due")} sortDir={sortCol === "due" ? sortDir : null}>Due Date</Th>
                <Th right onSort={() => handleSort("items")} sortDir={sortCol === "items" ? sortDir : null}>Items</Th>
                <Th right onSort={() => handleSort("total")} sortDir={sortCol === "total" ? sortDir : null}>Total</Th>
                <Th right onSort={() => handleSort("paid")} sortDir={sortCol === "paid" ? sortDir : null}>Paid</Th>
                <Th right onSort={() => handleSort("balance")} sortDir={sortCol === "balance" ? sortDir : null}>Balance</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(inv => (
                <TableRow key={inv.id} onClick={() => onView(inv.id)}>
                  <Td mono>
                    <button
                      onClick={e => { e.stopPropagation(); onView(inv.id); }}
                      style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                      {inv.id}
                    </button>
                  </Td>
                  <Td bold>{inv.supplier}</Td>
                  <Td mono color="#9CA3AF">{inv.poRef}</Td>
                  <Td mono>{formatDMY(inv.date)}</Td>
                  <Td mono color={inv.balance > 0 && inv.due < TODAY ? "#C62828" : "#6B7280"}>{formatDMY(inv.due)}</Td>
                  <Td mono right>{inv.items}</Td>
                  <Td mono right bold color="#1A2436">{money(inv.total)}</Td>
                  <Td mono right color="#2E7D32">{money(inv.paid)}</Td>
                  <Td mono right bold={inv.balance > 0} color={inv.balance > 0 ? "#C62828" : "#9CA3AF"}>{inv.balance > 0 ? money(inv.balance) : "—"}</Td>
                  <Td><Pill status={inv.status} /></Td>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <EmptyTableRow colSpan={10} message="No invoices match your filters." />
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ─── New Purchase Invoice — full-screen overlay ───────────────────────────────

type InvoiceFormData = { supplier: string; invoiceNo: string; invoiceDate: string; dueDate: string; poRef: string; items: PurchaseLine[]; cashDiscount: number; adjustment: number; };

function NewPurchaseInvoice({ onBack, onSaveDraft, onPostInvoice, initialData, defaultViewMode = false }: {
  onBack: () => void;
  onSaveDraft?: (data: InvoiceFormData) => void;
  onPostInvoice?: (data: InvoiceFormData) => void;
  initialData?: InvoiceInitialData;
  defaultViewMode?: boolean;
}) {
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [supplier, setSupplier] = useState(initialData?.supplier ?? "");
  const [alloc, setAlloc] = useState<"FEFO" | "LEFO">("FEFO");
  const [invoiceNo, setInvoiceNo] = useState(initialData?.id ?? "");
  const [invoiceDate, setInvoiceDate] = useState(initialData?.date ?? "");
  const [dueDate, setDueDate] = useState(initialData?.due ?? "2026-09-21");
  const [poRef, setPoRef] = useState(initialData?.poRef ?? "");
  const [notes, setNotes] = useState("");
  const [cashDiscount, setCashDiscount] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [saved, setSaved] = useState<null | "draft" | "posted">(null);
  const [showBarcodeSelect, setShowBarcodeSelect] = useState(false);
  const [barcodeSelected, setBarcodeSelected] = useState<Set<number>>(new Set());
  const [barcodePrintQty, setBarcodePrintQty] = useState<Record<number, number>>({});
  const [barcodeHeaderTip, setBarcodeHeaderTip] = useState<"ptq" | "ptr" | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);
  const [showVerifyFlow, setShowVerifyFlow] = useState(false);
  const [purchaseVerified, setPurchaseVerified] = useState(false);
  const [mappingItemId, setMappingItemId] = useState<number | null>(null);
  const [showAddMedForMap, setShowAddMedForMap] = useState(false);
  const [showManual, setShowManual] = useState(!!initialData);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [supplierList, setSupplierList] = useState(suppliers.map(s => s.name));
  const [importedFile, setImportedFile] = useState<AttachedFile | null>(null);
  const [showEmailFetch, setShowEmailFetch] = useState(false);
  const [wizardFile, setWizardFile] = useState<AttachedFile | null>(null);

  const [centralOpen, setCentralOpen] = useState(false);
  const [lineSearch, setLineSearch] = useState("");
  const centralCsvRef = useRef<HTMLInputElement>(null);
  const centralPdfRef = useRef<HTMLInputElement>(null);
  const centralImgRef = useRef<HTMLInputElement>(null);

  const pickCentral = (kind: ImportKind) => {
    const map = { csv: centralCsvRef, pdf: centralPdfRef, image: centralImgRef };
    map[kind].current?.click();
  };

  const changeCentral = (kind: ImportKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let headers: string[] = [];
    if (kind === "csv") {
      try {
        const text = await file.text();
        const firstLine = text.split(/\r?\n/)[0] ?? "";
        headers = firstLine.split(",").map(h => h.trim().replace(/^"|"$/g, "")).filter(Boolean);
      } catch { headers = []; }
    } else {
      headers = MOCK_OCR_HEADERS;
    }
    handleAttach({ kind, name: file.name, size: file.size, source: "upload", headers });
    e.target.value = "";
  };

  const handleAttach = (file: AttachedFile) => {
    // Skip the column-mapping wizard and go straight to medicine name mapping.
    // Inject the three representative lines so the mapping UI is immediately visible.
    setImportedFile(file);
    const rawLines = [
      { importedName: "Amoxicillin 500mg", batchNo: "AMX-2026-99", mfgDate: "2025-05-10", expDate: "2026-08-15", packSize: 10, qty: 50,  free: 5,  purchaseRate: 4.50,  mrp: 8.50,  disc: 10, gst: 12 },
      { importedName: "Dolo 650",          batchNo: "PCM-2025-A",  mfgDate: "2025-06-01", expDate: "2027-05-15", packSize: 15, qty: 200, free: 20, purchaseRate: 0.60,  mrp: 1.20,  disc: 15, gst: 5  },
      { importedName: "Atorva-Gold 20",    batchNo: "ATV-1204X",   mfgDate: "2025-04-01", expDate: "2027-01-10", packSize: 30, qty: 100, free: 0,  purchaseRate: 11.40, mrp: 23.40, disc: 5,  gst: 12 },
    ];
    setItems([
      newEmptyLine(nextId.current++),
      ...rawLines.map(raw => {
        const { status, systemName } = classifyImportedLine(raw.importedName);
        return {
          id: nextId.current++,
          importedName: raw.importedName,
          mappingStatus: status,
          suggestedName: status !== "matched" ? systemName : undefined,
          medicineName: status === "matched" ? systemName : (status === "fuzzy" ? systemName : ""),
          batchNo: raw.batchNo, mfgDate: raw.mfgDate, expDate: raw.expDate,
          packSize: raw.packSize, qty: raw.qty, free: raw.free,
          purchaseRate: raw.purchaseRate, mrp: raw.mrp, disc: raw.disc, gst: raw.gst,
        };
      }),
    ]);
  };
  const nextId = useRef(100);
  const [items, setItems] = useState<PurchaseLine[]>(() => {
    if (initialData && MOCK_INVOICE_LINES[initialData.id]) {
      return [newEmptyLine(nextId.current++), ...MOCK_INVOICE_LINES[initialData.id]];
    }
    return [newEmptyLine(nextId.current++)];
  });

  const hasItems = items.some(i => i.medicineName !== "");

  const updateItem = (id: number, field: keyof PurchaseLine, value: number | string) => {
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, [field]: value } : i);
      const hasEmpty = updated.some(i => !i.medicineName);
      if (!hasEmpty && field === "medicineName") {
        return [newEmptyLine(nextId.current++), ...updated];
      }
      return updated;
    });
  };

  const deleteItem = (id: number) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      const hasEmpty = filtered.some(i => !i.medicineName);
      if (filtered.length === 0 || !hasEmpty) {
        return [newEmptyLine(nextId.current++), ...filtered];
      }
      return filtered;
    });
  };

  useEffect(() => {
    if (!printing) return;
    setPrintProgress(0);
    const duration = 5000 + Math.random() * 5000;
    const start = Date.now();
    const timer = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / duration) * 100, 100);
      setPrintProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => { setPrinting(false); setPrintProgress(0); onBack(); }, 600);
      }
    }, 60);
    return () => clearInterval(timer);
  }, [printing]);

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              onClick={() => viewMode ? onBack() : setShowBackConfirm(true)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#1A2436", fontSize: 20, fontWeight: 700, padding: "0 4px", display: "flex", alignItems: "center" }}
              onMouseEnter={e => { (e.currentTarget.style.color = "#1B6CA8"); const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = "1"; }}
              onMouseLeave={e => { (e.currentTarget.style.color = "#1A2436"); const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = "0"; }}
            >←</button>
            <span style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1A2436", color: "#fff", fontSize: 11, fontFamily: "Inter", fontWeight: 600, padding: "3px 8px", whiteSpace: "nowrap", pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", zIndex: 10 }}>
              Back
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Purchases</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>›</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {initialData ? (viewMode ? "View Invoice" : "Edit Invoice") : "New Purchase Invoice"}
          </span>
          {initialData && (
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginLeft: 4 }}>· {invoiceNo}</span>
          )}
          {initialData && viewMode && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#EEF1F6", color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 6 }}>Read-only</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {initialData && viewMode && (
            <>
              <button onClick={() => setViewMode(false)} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>
            </>
          )}
          {initialData && !viewMode && (
            <>
              <button onClick={() => setViewMode(true)} style={{ padding: "7px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
              <button onClick={() => setSaved("posted")} style={{ padding: "7px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save Changes</button>
            </>
          )}
          {!initialData && (
            <>
              {(() => {
                const hasUnresolved = items.some(i => i.mappingStatus === "fuzzy" || i.mappingStatus === "unmatched");
                const canPost = hasItems && !hasUnresolved;
                return (
                  <>
                    <button disabled={!hasItems} onClick={() => onSaveDraft?.({ supplier, invoiceNo, invoiceDate, dueDate, poRef, items, cashDiscount, adjustment })} style={{ padding: "7px 16px", border: `1px solid ${hasItems ? "#E8ECF4" : "#F0F0F0"}`, background: hasItems ? "#fff" : "#F5F5F5", fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: hasItems ? "#1A2436" : "#BDBDBD", fontFamily: "Inter" }}>Save Draft</button>
                    <button
                      disabled={!hasItems}
                      onClick={() => setShowVerifyFlow(true)}
                      style={{ padding: "7px 16px", border: `1px solid ${hasItems ? (purchaseVerified ? "#2E7D32" : "#1B6CA8") : "#F0F0F0"}`, background: purchaseVerified ? "#E8F5E9" : (hasItems ? "#EFF6FF" : "#F5F5F5"), fontSize: 13, cursor: hasItems ? "pointer" : "not-allowed", color: purchaseVerified ? "#2E7D32" : (hasItems ? "#1B6CA8" : "#BDBDBD"), fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      {purchaseVerified && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                      {purchaseVerified ? "Verified" : "Verify Purchase"}
                    </button>
                    <button
                      disabled={!canPost}
                      onClick={() => {
                        if (!canPost) return;
                        onPostInvoice?.({ supplier, invoiceNo, invoiceDate, dueDate, poRef, items, cashDiscount, adjustment });
                        const medicineItems = items.filter(i => i.medicineName !== "");
                        const initSelected = new Set(medicineItems.map(i => i.id));
                        const initQty: Record<number, number> = {};
                        medicineItems.forEach(i => { initQty[i.id] = i.qty + i.free; });
                        setBarcodeSelected(initSelected);
                        setBarcodePrintQty(initQty);
                        setShowBarcodeSelect(true);
                      }}
                      title={!hasItems ? "Add items first" : !canPost ? "Resolve all medicine mappings before posting" : undefined}
                      style={{ padding: "7px 20px", border: "none", background: canPost ? "#1B6CA8" : "#C8D6E5", fontSize: 13, cursor: canPost ? "pointer" : "not-allowed", color: canPost ? "#fff" : "#8FA3B1", fontFamily: "Inter", fontWeight: 600 }}>
                      Post Invoice
                    </button>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {showBackConfirm && (
        <BackConfirmDialog
          message="Save this invoice as a draft before going back?"
          onCancel={() => setShowBackConfirm(false)}
          onSave={() => { setSaved("draft"); setShowBackConfirm(false); }}
          onDiscard={onBack}
        />
      )}

      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "10px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 320px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Distributor</div>
            <div style={{ display: "flex", gap: 6 }}>
              {viewMode ? (
                <div style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{supplier || "—"}</div>
              ) : (
                <DistributorSearch
                  selected={supplier}
                  onSelect={setSupplier}
                  distributors={supplierList}
                  onAdd={() => setShowAddSupplier(true)}
                />
              )}
              {supplier && !viewMode && (
                <button onClick={() => setShowDetails(true)}
                  style={{ padding: "8px 12px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Details
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: "0 0 160px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Invoice #</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#FAFBFD", color: "#1A2436" }}>{invoiceNo}</div>
            ) : (
              <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: "#fff" }} />
            )}
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Invoice Date</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{formatDMY(invoiceDate)}</div>
            ) : (
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: "#fff" }} />
            )}
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Due Date</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#FAFBFD", color: "#1A2436" }}>{formatDMY(dueDate)}</div>
            ) : (
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: "#fff" }} />
            )}
          </div>

          <div style={{ flex: "0 0 140px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>PO Reference</div>
            {viewMode ? (
              <div style={{ padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#FAFBFD", color: "#1A2436" }}>{poRef || "—"}</div>
            ) : (
              <input value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="Optional"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box", background: "#fff" }} />
            )}
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Batch Allocation</div>
            <div style={{ display: "flex", border: "1px solid #E8ECF4", overflow: "hidden" }} title="Preferred dispense order for these batches when they later leave inventory">
              {(["FEFO", "LEFO"] as const).map(opt => (
                <button key={opt} onClick={() => !viewMode && setAlloc(opt)}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, border: "none", cursor: viewMode ? "default" : "pointer", fontFamily: "Inter", background: alloc === opt ? "#1B6CA8" : "#fff", color: alloc === opt ? "#fff" : "#9CA3AF", letterSpacing: "0.04em" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", margin: "10px 20px 0" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Line Items</span>
              <span style={{ padding: "3px 12px", background: "#E0F7FA", color: "#00838F", fontSize: 12, fontWeight: 700, borderRadius: 999, fontFamily: "Inter" }}>
                {items.filter(i => i.medicineName).length} items
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
<button onClick={() => setShowEmailFetch(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                <MailIcon />
                Fetch from Email
              </button>
            </div>
          </div>
          {importedFile && (
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#1B6CA8", fontFamily: "Inter" }}>
                {importedFile.source === "email" ? <MailIcon /> : <UploadIcon />}
                <span>
                  <strong style={{ fontWeight: 700 }}>{importedFile.kind.toUpperCase()}</strong> attached {importedFile.source === "email" ? "from" : "via upload"}
                  {importedFile.source === "email" && importedFile.sender ? ` ${importedFile.sender} email` : ""}
                  {" · "}
                  <span style={{ fontFamily: "JetBrains Mono" }}>{importedFile.name}</span> ({Math.max(1, Math.round(importedFile.size / 1024))} KB) · parsing on Post
                </span>
              </div>
              <button onClick={() => setImportedFile(null)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#1B6CA8", fontSize: 16, lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>
          )}
          {items.filter(i => i.medicineName).length === 0 && !showManual && !importedFile ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", border: "2px dashed #DDE3EC", background: "#FAFBFD", margin: "16px 20px", borderRadius: 8, flex: 1 }}>
              <ImportCards />
              <h3 style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", margin: "0 0 8px 0" }}>Import Distributor Invoice</h3>
              <p style={{ fontFamily: "Inter", fontSize: 12, color: "#6B7280", margin: "0 0 20px 0", textAlign: "center", maxWidth: 450, lineHeight: 1.5 }}>
                Quickly import your CSV, PDF, or image invoices from your distributor. Our system will map columns and parse line items into your table automatically.
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={() => setCentralOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", background: "#1B6CA8", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload Invoice File
                </button>
                <button onClick={() => setShowManual(true)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Items Manually
                </button>
              </div>

              {centralOpen && (
                <div style={{ position: "fixed", inset: 0, zIndex: 350, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,22,44,0.3)" }} onClick={() => setCentralOpen(false)}>
                  <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px", width: 280, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", borderRadius: 6 }} onClick={e => e.stopPropagation()}>
                    <h4 style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#0C1B33", margin: "0 0 12px 0" }}>Choose Invoice Type</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { kind: "csv" as const, label: "CSV File", desc: "Distributor CSV spreadsheet" },
                        { kind: "pdf" as const, label: "PDF Document", desc: "Digital or scanned PDF file" },
                        { kind: "image" as const, label: "Photo / Image", desc: "JPG or PNG image scan" }
                      ].map(o => (
                        <button key={o.kind} onClick={() => { setCentralOpen(false); pickCentral(o.kind); }}
                          style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "1px solid #EDF0F5", background: "#FAFBFD", cursor: "pointer", fontFamily: "Inter" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#F0F6FF"; e.currentTarget.style.borderColor = "#1B6CA8"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#FAFBFD"; e.currentTarget.style.borderColor = "#EDF0F5"; }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436" }}>{o.label}</div>
                          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{o.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <input ref={centralCsvRef} type="file" accept=".csv,text/csv" hidden onChange={changeCentral("csv")} />
              <input ref={centralPdfRef} type="file" accept=".pdf,application/pdf" hidden onChange={changeCentral("pdf")} />
              <input ref={centralImgRef} type="file" accept="image/*" hidden onChange={changeCentral("image")} />
            </div>
          ) : (
            <PurchaseLineItemsTable
              items={items}
              alloc={alloc}
              onChange={updateItem}
              onDelete={deleteItem}
              onMap={id => setMappingItemId(id)}
              onAccept={id => {
                const it = items.find(i => i.id === id);
                if (it?.medicineName) updateItem(id, "mappingStatus", "matched");
              }}
              lineSearch={lineSearch}
              onLineSearchChange={setLineSearch}
            />
          )}
        </div>
      </div>

      <div style={{ margin: "8px 20px 0", flexShrink: 0 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Add notes, delivery instructions, or distributor remarks..."
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", resize: "none", background: "#fff", boxSizing: "border-box" as const }} />
      </div>

      <div style={{ margin: "0 20px 0", flexShrink: 0 }}>
        <PurchaseInvoiceFooter items={items} paid={0} cashDiscount={cashDiscount} onCashDiscountChange={setCashDiscount} adjustment={adjustment} onAdjustmentChange={setAdjustment} />
      </div>

      {showAddSupplier && (
        <AddDistributorDrawer
          onClose={() => setShowAddSupplier(false)}
          onSaved={name => { setSupplierList(prev => [...prev, name]); setSupplier(name); }}
        />
      )}

      {showDetails && supplier && (
        <DistributorDrawer supplierName={supplier} onClose={() => setShowDetails(false)} />
      )}

      {showEmailFetch && (
        <EmailFetchModal onClose={() => setShowEmailFetch(false)} onImport={handleAttach} />
      )}

      {wizardFile && (
        <ImportWizard
          file={wizardFile}
          distributorKnown={!!supplier && suppliers.some(s => s.name === supplier)}
          onCancel={() => setWizardFile(null)}
          onConfirm={() => {
            setImportedFile(wizardFile);
            setWizardFile(null);
            // Simulate three representative import scenarios so all mapping states are visible immediately.
            const rawLines: Array<{ importedName: string; batchNo: string; mfgDate: string; expDate: string; packSize: number; qty: number; free: number; purchaseRate: number; mrp: number; disc: number; gst: number }> = [
              { importedName: "Amoxicillin 500mg", batchNo: "AMX-2026-99", mfgDate: "2025-05-10", expDate: "2026-08-15", packSize: 10, qty: 50,  free: 5,  purchaseRate: 4.50,  mrp: 8.50,  disc: 10, gst: 12 },
              { importedName: "Dolo 650",          batchNo: "PCM-2025-A",  mfgDate: "2025-06-01", expDate: "2027-05-15", packSize: 15, qty: 200, free: 20, purchaseRate: 0.60,  mrp: 1.20,  disc: 15, gst: 5  },
              { importedName: "Atorva-Gold 20",    batchNo: "ATV-1204X",   mfgDate: "2025-04-01", expDate: "2027-01-10", packSize: 30, qty: 100, free: 0,  purchaseRate: 11.40, mrp: 23.40, disc: 5,  gst: 12 },
            ];
            setItems([
              newEmptyLine(nextId.current++),
              ...rawLines.map(raw => {
                const { status, systemName } = classifyImportedLine(raw.importedName);
                return {
                  id: nextId.current++,
                  importedName: raw.importedName,
                  mappingStatus: status,
                  suggestedName: status !== "matched" ? systemName : undefined,
                  medicineName: status === "matched" ? systemName : (status === "fuzzy" ? systemName : ""),
                  batchNo: raw.batchNo, mfgDate: raw.mfgDate, expDate: raw.expDate,
                  packSize: raw.packSize, qty: raw.qty, free: raw.free,
                  purchaseRate: raw.purchaseRate, mrp: raw.mrp, disc: raw.disc, gst: raw.gst,
                };
              }),
            ]);
          }}
        />
      )}
      {mappingItemId !== null && !showAddMedForMap && (() => {
        const mapItem = items.find(i => i.id === mappingItemId);
        if (!mapItem) return null;
        return (
          <MedicineMapModal
            importedName={mapItem.importedName ?? mapItem.medicineName}
            onMap={systemName => {
              updateItem(mappingItemId, "medicineName", systemName);
              updateItem(mappingItemId, "mappingStatus", "matched");
              setMappingItemId(null);
            }}
            onCreateNew={() => setShowAddMedForMap(true)}
            onClose={() => setMappingItemId(null)}
          />
        );
      })()}

      {showAddMedForMap && mappingItemId !== null && (() => {
        const mapItem = items.find(i => i.id === mappingItemId);
        if (!mapItem) return null;
        return (
          <AddMedicineDrawer
            initialName={mapItem.importedName ?? mapItem.medicineName}
            onClose={() => setShowAddMedForMap(false)}
            onSaved={name => {
              updateItem(mappingItemId, "medicineName", name);
              updateItem(mappingItemId, "mappingStatus", "matched");
              setShowAddMedForMap(false);
              setMappingItemId(null);
            }}
          />
        );
      })()}

      {saved && !showBarcodeSelect && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              Purchase Invoice {saved === "posted" ? "Posted Successfully" : "Saved as Draft"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, fontFamily: "JetBrains Mono" }}>
              {invoiceNo} · {saved === "posted" ? "Stock updated · Distributor ledger updated" : "Draft — not yet posted"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <GhostBtn onClick={onBack}>Back to Purchases</GhostBtn>
              {saved === "posted" && (
                <PrimaryBtn onClick={() => {
                  const medicineItems = items.filter(i => i.medicineName !== "");
                  const initSelected = new Set(medicineItems.map(i => i.id));
                  const initQty: Record<number, number> = {};
                  medicineItems.forEach(i => { initQty[i.id] = i.qty + i.free; });
                  setBarcodeSelected(initSelected);
                  setBarcodePrintQty(initQty);
                  setShowBarcodeSelect(true);
                }}>Print Barcode</PrimaryBtn>
              )}
            </div>
          </div>
        </div>
      )}

      {showBarcodeSelect && (() => {
        const medicineItems = items.filter(i => i.medicineName !== "");
        const allIds = medicineItems.map(i => i.id);
        const allSelected = allIds.every(id => barcodeSelected.has(id));
        const someSelected = allIds.some(id => barcodeSelected.has(id)) && !allSelected;

        const toggleAll = () => {
          if (allSelected) {
            setBarcodeSelected(new Set());
          } else {
            setBarcodeSelected(new Set(allIds));
          }
        };

        const toggleItem = (id: number) => {
          setBarcodeSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        };

        const getDosageForm = (name: string) => drugs.find(d => d.name === name)?.unit ?? "—";
        const UNIT_ABBR: Record<string, string> = {
          "Tablets": "Tab", "Tablet": "Tab",
          "Capsules": "Cap", "Capsule": "Cap",
          "Inhaler": "Inh", "Syrup": "Syr",
          "Injection": "Inj", "Vial": "Vial",
          "Drops": "Drops", "Cream": "Crm", "Ointment": "Oint",
        };
        const getPackLabel = (name: string, packSize: number) => {
          const unit = getDosageForm(name);
          const abbr = UNIT_ABBR[unit] ?? unit;
          return `${packSize} ${abbr}`;
        };

        const selectedCount = allIds.filter(id => barcodeSelected.has(id)).length;

        return (
          <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 32px" }}>
            <div style={{ background: "#fff", border: "1px solid #E8ECF4", boxShadow: "0 12px 40px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", width: "100%", maxWidth: 1080, maxHeight: "100%", overflow: "hidden" }}>

              {/* Header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #E8ECF4", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: "#1A2436" }}>Print Barcode Labels</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Select items and set print quantity for each medicine</div>
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "JetBrains Mono" }}>
                  {selectedCount} of {medicineItems.length} selected
                </div>
              </div>

              {/* Table */}
              <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E8ECF4" }}>
                      <th style={{ width: 40, padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#6B7280" }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={el => { if (el) el.indeterminate = someSelected; }}
                          onChange={toggleAll}
                          style={{ cursor: "pointer", width: 14, height: 14 }}
                        />
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Medicine Name</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Composition</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Pack</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Dosage Form</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", position: "relative" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          PTQ
                          <button
                            onClick={e => { e.stopPropagation(); setBarcodeHeaderTip(barcodeHeaderTip === "ptq" ? null : "ptq"); }}
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: barcodeHeaderTip === "ptq" ? "#1B6CA8" : "#DDE3EC", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
                          >
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                              <text x="5" y="7.8" textAnchor="middle" fontSize="7" fontFamily="Inter" fontWeight="700" fill={barcodeHeaderTip === "ptq" ? "#fff" : "#6B7280"}>i</text>
                            </svg>
                          </button>
                          {barcodeHeaderTip === "ptq" && (
                            <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#1A2436", color: "#fff", fontSize: 11, fontWeight: 400, letterSpacing: "normal", textTransform: "none", padding: "6px 10px", whiteSpace: "nowrap", zIndex: 30, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", fontFamily: "Inter" }}>
                              <div style={{ marginBottom: 3 }}>Purchase Total Quantity</div>
                              <div style={{ color: "#9CA3AF", fontFamily: "JetBrains Mono", fontSize: 10 }}>Qty + Free = PTQ</div>
                            </div>
                          )}
                        </div>
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Expiry Date</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", minWidth: 100 }}>Print Qty</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>MRP</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#6B7280", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", position: "relative" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          PTR
                          <button
                            onClick={e => { e.stopPropagation(); setBarcodeHeaderTip(barcodeHeaderTip === "ptr" ? null : "ptr"); }}
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: barcodeHeaderTip === "ptr" ? "#1B6CA8" : "#DDE3EC", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
                          >
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                              <text x="5" y="7.8" textAnchor="middle" fontSize="7" fontFamily="Inter" fontWeight="700" fill={barcodeHeaderTip === "ptr" ? "#fff" : "#6B7280"}>i</text>
                            </svg>
                          </button>
                          {barcodeHeaderTip === "ptr" && (
                            <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#1A2436", color: "#fff", fontSize: 11, fontWeight: 400, letterSpacing: "normal", textTransform: "none", padding: "5px 10px", whiteSpace: "nowrap", zIndex: 30, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", fontFamily: "Inter" }}>
                              Purchase To Retailer
                            </div>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicineItems.map((item, idx) => {
                      const isSelected = barcodeSelected.has(item.id);
                      const totalQty = item.qty + item.free;
                      const printQty = barcodePrintQty[item.id] ?? totalQty;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          style={{
                            background: isSelected ? "#EFF6FF" : idx % 2 === 0 ? "#fff" : "#FAFBFD",
                            borderBottom: "1px solid #EEF1F6",
                            cursor: "pointer",
                          }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "#F8FAFC"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? "#EFF6FF" : idx % 2 === 0 ? "#fff" : "#FAFBFD"; }}
                        >
                          <td style={{ padding: "10px 12px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItem(item.id)}
                              style={{ cursor: "pointer", width: 14, height: 14 }}
                            />
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1A2436" }}>{item.medicineName}</td>
                          <td style={{ padding: "10px 12px", color: "#6B7280" }}>{item.medicineName}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono", color: "#1A2436" }}>{getPackLabel(item.medicineName, item.packSize)}</td>
                          <td style={{ padding: "10px 12px", color: "#6B7280" }}>{getDosageForm(item.medicineName)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono", color: "#1A2436" }}>{totalQty}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(item.expDate)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              min={1}
                              value={printQty}
                              onChange={e => {
                                const v = Math.max(1, parseInt(e.target.value) || 1);
                                setBarcodePrintQty(prev => ({ ...prev, [item.id]: v }));
                              }}
                              style={{ width: 72, padding: "4px 8px", border: "1px solid #E8ECF4", fontSize: 13, textAlign: "right", fontFamily: "JetBrains Mono", outline: "none", background: isSelected ? "#fff" : "#F5F5F5" }}
                            />
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono", color: "#1A2436" }}>₹{item.mrp.toFixed(2)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{item.purchaseRate.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {medicineItems.length === 0 && (
                      <tr>
                        <td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>No medicine items in this invoice.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ padding: "14px 24px", borderTop: "1px solid #E8ECF4", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                  {selectedCount > 0
                    ? `${allIds.filter(id => barcodeSelected.has(id)).reduce((s, id) => s + (barcodePrintQty[id] ?? 0), 0)} labels total across ${selectedCount} item${selectedCount !== 1 ? "s" : ""}`
                    : "Select at least one item to print"}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <GhostBtn onClick={() => { setShowBarcodeSelect(false); onBack(); }}>Cancel</GhostBtn>
                  <PrimaryBtn onClick={() => { setShowBarcodeSelect(false); setPrinting(true); }} disabled={selectedCount === 0}>
                    Print
                  </PrimaryBtn>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {printing && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.5)", backdropFilter: "blur(4px)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "48px 56px", textAlign: "center", minWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>
              {printProgress < 100 ? "Printing..." : "Done"}
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 24, fontFamily: "Inter" }}>
              Generating barcode labels for {invoiceNo}
            </div>
            <div style={{ background: "#EEF1F6", height: 6, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${printProgress}%`, background: printProgress < 100 ? "#1B6CA8" : "#2E7D32", borderRadius: 999, transition: "width 0.06s linear" }} />
            </div>
            <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>
              {Math.round(printProgress)}%
            </div>
          </div>
        </div>
      )}

      {showVerifyFlow && (() => {
        const invoiceTotal = items.reduce((sum, item) => {
          const sub = calcLineSubtotal(item);
          const disc = calcLineDiscount(item);
          const tax = calcLineTax(item);
          return sum + sub - disc + tax;
        }, 0) - cashDiscount + adjustment;
        return (
          <PurchaseVerifyFlow
            supplier={supplier}
            invoiceNo={invoiceNo}
            invoiceDate={invoiceDate}
            poRef={poRef}
            items={items}
            invoiceTotal={invoiceTotal}
            onClose={() => setShowVerifyFlow(false)}
            onPost={() => {
              setPurchaseVerified(true);
              setShowVerifyFlow(false);
              onPostInvoice?.({ supplier, invoiceNo, invoiceDate, dueDate, poRef, items, cashDiscount, adjustment });
              const medicineItems = items.filter(i => i.medicineName !== "");
              const initSelected = new Set(medicineItems.map(i => i.id));
              const initQty: Record<number, number> = {};
              medicineItems.forEach(i => { initQty[i.id] = i.qty + i.free; });
              setBarcodeSelected(initSelected);
              setBarcodePrintQty(initQty);
              setShowBarcodeSelect(true);
            }}
          />
        );
      })()}

    </div>
  );
}

// ─── Default export wrapper ───────────────────────────────────────────────────

export default function PurchaseInvoices() {
  const [view, setView] = useState<"list" | "new-invoice" | "view-invoice">("list");
  const [openInvoice, setOpenInvoice] = useState<typeof purchaseInvoices[0] | null>(null);
  const [invoices, setInvoices] = useState([...purchaseInvoices]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const buildInvoiceRow = (data: InvoiceFormData, status: "Draft" | "Unpaid") => {
    const filled = data.items.filter(i => i.medicineName);
    const subtotal = filled.reduce((s, i) => s + calcLineSubtotal(i), 0);
    const discount = filled.reduce((s, i) => s + calcLineDiscount(i), 0);
    const tax = filled.reduce((s, i) => s + calcLineTax(i), 0);
    const preRound = subtotal - discount - data.cashDiscount + tax + data.adjustment;
    const total = preRound + (Math.round(preRound) - preRound);
    return {
      id: `PINV-2026-${String(invoices.length + 1).padStart(4, "0")}`,
      supplier: data.supplier,
      poRef: data.poRef || "—",
      date: data.invoiceDate || TODAY,
      due: data.dueDate || TODAY,
      items: filled.length,
      total,
      paid: 0,
      balance: total,
      status,
    };
  };

  const handleSaveDraft = (data: InvoiceFormData) => {
    setInvoices(prev => [buildInvoiceRow(data, "Draft"), ...prev]);
    setView("list");
    setOpenInvoice(null);
    setToast({ type: "success", message: "Purchase Invoice saved as Draft successfully." });
  };

  const handlePostInvoice = (data: InvoiceFormData) => {
    // Add to list + show toast but don't redirect — the barcode popup owns navigation
    setInvoices(prev => [buildInvoiceRow(data, "Unpaid"), ...prev]);
    setToast({ type: "success", message: "Purchase Invoice posted successfully." });
  };

  const Toast = toast && (
    <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
      <div style={{
        pointerEvents: "auto",
        display: "flex",
        flexDirection: "column",
        minWidth: 320,
        maxWidth: 480,
        overflow: "hidden",
        background: toast.type === "success" ? "#2E7D32" : "#C62828",
        boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
        animation: "toast-slide-up 0.22s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
          {toast.type === "success" ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
              <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)" />
              <path d="M10 7v4M10 13.5h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: 19, lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 5s linear forwards" }} />
        </div>
      </div>
    </div>
  );

  if (view === "new-invoice" || view === "view-invoice") {
    return (
      <>
        <NewPurchaseInvoice
          onBack={() => { setView("list"); setOpenInvoice(null); }}
          onSaveDraft={handleSaveDraft}
          onPostInvoice={handlePostInvoice}
          initialData={openInvoice ?? undefined}
          defaultViewMode={view === "view-invoice"}
        />
        {Toast}
      </>
    );
  }
  return (
    <>
      <PurchaseInvoiceList
        invoices={invoices}
        onNew={() => setView("new-invoice")}
        onView={(id) => {
          const inv = invoices.find(i => i.id === id) ?? null;
          setOpenInvoice(inv);
          setView("view-invoice");
        }}
      />
      {Toast}
    </>
  );
}
