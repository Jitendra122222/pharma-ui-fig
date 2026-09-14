import { useState, useRef, useEffect, useMemo } from "react";
import { suppliers } from "../../data/mockData";
import { SearchIcon, ChevronDown } from "../shared/Icons";
import {
  type PriorBatch, priorBatchesFor,
  type AddMedForm, emptyMedForm, DOSAGE_FORMS, ROUTES, PRESCRIPTION_STATUSES, PRODUCT_STATUSES,
  MANUFACTURER_TYPES, KNOWN_MANUFACTURERS_SEED, KNOWN_COMPOSITIONS_SEED,
  type CompositionEntry,
  type DistributorFormData, emptyDistributor,
  DISTRIBUTOR_TYPES, ACCOUNT_STATUSES, DISTRIBUTOR_PAYMENT_TERMS, INDIAN_STATES, NOTIFY_CHANNEL_OPTIONS,
  type PurchaseLine, parsedDrugs, purchaseOrders, purchaseInvoices, purchaseReturns, purchasePayments,
  DISTRIBUTOR_POLICIES,
  money, formatDMY, calcLineAmount,
  type MedCatalogItem, PO_MED_CATALOG,
} from "./purchasesData";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import MultiStepper from "../shared/MultiStepper";

// ─── Basic table / form primitives ───────────────────────────────────────────

export function Td({ children, mono, right, center, bold, color }: { children: React.ReactNode; mono?: boolean; right?: boolean; center?: boolean; bold?: boolean; color?: string }) {
  return (
    <td style={{
      padding: "12px 14px", fontSize: 13,
      fontFamily: mono ? "JetBrains Mono" : "Inter",
      fontWeight: bold ? 600 : 400,
      color: color ?? (mono ? "#6B7280" : "#1A2436"),
      textAlign: right ? "right" : center ? "center" : "left",
      borderBottom: "1px solid #F4F6FA",
    }}>
      {children}
    </td>
  );
}

export function TableRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "#F7F9FC" : "transparent", cursor: onClick ? "pointer" : "default", transition: "background 0.1s" }}
    >
      {children}
    </tr>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{children}</label>;
}

export function TextInput({ type = "text", value, onChange, placeholder, defaultValue }: { type?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; defaultValue?: string }) {
  return (
    <input type={type} value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}
      onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
      onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
    />
  );
}

export function DropdownSelect({ value, onChange, options, placeholder }: { value?: string; onChange?: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)}
      style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, cursor: "pointer" }}
      onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
      onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

export function PrimaryBtn({ children, onClick, small, disabled }: { children: React.ReactNode; onClick?: () => void; small?: boolean; disabled?: boolean }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ padding: small ? "6px 14px" : "9px 20px", border: "none", background: disabled ? "#C8D6E5" : "#1B6CA8", fontSize: small ? 12 : 13, cursor: disabled ? "not-allowed" : "pointer", color: disabled ? "#8FA3B1" : "#fff", fontFamily: "Inter", fontWeight: 600 }}>
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width, border: "1px solid #E8ECF4", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "22px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Filter row primitives ────────────────────────────────────────────────────

export function FilterSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", flex: "0 1 280px", minWidth: 220 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <SearchIcon />
      </span>
      <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", color: "#2B3A4F", minHeight: 40 }} />
    </div>
  );
}

export function FilterDropdown({ value, onChange, options, allLabel }: { value: string; onChange: (v: string) => void; options: string[]; allLabel: string }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: value === "All" ? "#8A94A8" : "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" as const }}>
        {["All", ...options].map(o => (
          <option key={o} value={o}>{o === "All" ? allLabel : o}</option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
        <ChevronDown />
      </span>
    </div>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding: "10px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter", minHeight: 40 }}>
      Clear
    </button>
  );
}

export function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div style={{ marginLeft: "auto" }}>
      <button onClick={onClick}
        style={{ padding: "10px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, minHeight: 40, whiteSpace: "nowrap" }}>
        {label}
      </button>
    </div>
  );
}

// ─── Overlay / drawer components ─────────────────────────────────────────────

export function BackConfirmDialog({
  message, onCancel, onSave, onDiscard,
}: {
  message: string;
  onCancel: () => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "20px 24px", width: 260, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>Save before leaving?</div>
        <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", marginBottom: 18, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={onSave} style={{ padding: "6px 16px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Save</button>
          <button onClick={onDiscard} style={{ padding: "6px 14px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>Discard</button>
        </div>
      </div>
    </div>
  );
}

export function HorizontalStepper({ steps, current }: { steps: string[]; current: number }) {
  return <MultiStepper steps={steps} current={current} />;
}

export function EmptyTableRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>{message}</td>
    </tr>
  );
}

export function EmptyListPlaceholder({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>{message}</div>
  );
}

export function DrawerStepFooter({
  step, total, onBack, onCancel, onContinue, continueDisabled, finalLabel,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  onCancel: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  finalLabel?: string;
}) {
  const isFinal = step === total;
  return (
    <div style={{ padding: "14px 32px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6B7280" }}>
        <span style={{ display: "inline-flex", width: 18, height: 18, borderRadius: "50%", border: "1px solid #DDE3EC", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#9CA3AF" }}>?</span>
        Step {step} of {total} · Required fields are marked <span style={{ color: "#C62828" }}>*</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {step > 1 && onBack && (
          <button onClick={onBack} style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
            ← Back
          </button>
        )}
        <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        <button onClick={onContinue} disabled={continueDisabled}
          style={{ padding: "9px 22px", border: "none", background: continueDisabled ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: continueDisabled ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          {isFinal ? <>{finalLabel ?? "Save"} <span>✓</span></> : <>Continue <span>→</span></>}
        </button>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

export function BarcodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z" />
      <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function ShieldSolidIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="14" height="12" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2" />
      <circle cx="18.5" cy="18.5" r="2" />
    </svg>
  );
}

function StepChip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 40, height: 40, background: "#E8F5E9", border: "1px solid #C8E6C9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </div>
  );
}

// ─── Drawer layout helpers ────────────────────────────────────────────────────

export function DrawerSectionHeader({ n, title, subtitle, icon }: { n: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span style={{ width: 30, height: 30, background: "#F0F6FF", border: "1px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 700, color: "#1B6CA8", fontFamily: "JetBrains Mono" }}>{n}</span>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.01em" }}>{title}</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 3, maxWidth: 480 }}>{subtitle}</div>
        </div>
      </div>
      {icon}
    </div>
  );
}

export function DrawerField({ label, required, children, gridSpan }: { label: string; required?: boolean; children: React.ReactNode; gridSpan?: number }) {
  return (
    <div style={gridSpan ? { gridColumn: `span ${gridSpan}` } : undefined}>
      <div style={{ fontSize: 12, color: "#4A5875", fontWeight: 500, marginBottom: 6, fontFamily: "Inter" }}>
        {label}{required && <span style={{ color: "#C62828", marginLeft: 3 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

export function DrawerRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>{children}</div>;
}

function MedStepper({ current }: { current: number }) {
  return <HorizontalStepper steps={["Medicine", "Compliance", "Operations", "Review"]} current={current} />;
}

export function drugBarcode(id: number): string {
  return `8901234${String(id).padStart(6, "0")}`;
}

// ─── Manufacturer combobox ────────────────────────────────────────────────────

interface ManufacturerEntry { name: string; code: string; type: string; address: string; city: string; }

function AddManufacturerModal({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: (name: string) => void }) {
  const [mfg, setMfg] = useState<ManufacturerEntry>({ name: initialName, code: "", type: "Pharmaceutical", address: "", city: "" });
  const upd = <K extends keyof ManufacturerEntry>(k: K, v: ManufacturerEntry[K]) => setMfg(prev => ({ ...prev, [k]: v }));
  const canSave = mfg.name.trim().length > 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 520, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(10,22,44,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>New Manufacturer</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add manufacturer</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <DrawerField label="Manufacturer name" required><TextInput value={mfg.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. GSK" /></DrawerField>
            <DrawerField label="Manufacturer code"><TextInput value={mfg.code} onChange={e => upd("code", e.target.value)} placeholder="e.g. MFG-001" /></DrawerField>
            <DrawerField label="Manufacturer type" required><DropdownSelect value={mfg.type} onChange={v => upd("type", v)} options={MANUFACTURER_TYPES} /></DrawerField>
            <DrawerField label="City" required><TextInput value={mfg.city} onChange={e => upd("city", e.target.value)} placeholder="e.g. Mumbai" /></DrawerField>
            <DrawerField label="Address" gridSpan={2}><TextInput value={mfg.address} onChange={e => upd("address", e.target.value)} placeholder="Street, building, area" /></DrawerField>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <button onClick={() => { if (canSave) { onSaved(mfg.name.trim()); onClose(); } }} disabled={!canSave}
            style={{ padding: "9px 20px", border: "none", background: canSave ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: canSave ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Save manufacturer
          </button>
        </div>
      </div>
    </div>
  );
}

function ManufacturerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [knownList, setKnownList] = useState(KNOWN_MANUFACTURERS_SEED);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  const q = value.trim().toLowerCase();
  const matches = q ? knownList.filter(m => m.toLowerCase().includes(q)) : knownList.slice(0, 8);
  const exactMatch = knownList.some(m => m.toLowerCase() === q);
  const noResults = q.length > 0 && matches.length === 0;
  const showAddButton = q.length > 0 && !exactMatch;
  return (
    <>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <TextInput value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} placeholder="e.g. GSK" />
        {open && (matches.length > 0 || showAddButton) && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", borderTop: "none", zIndex: 20, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.10)" }}>
            {matches.map(m => (
              <button key={m} onClick={() => { onChange(m); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>{m}</button>
            ))}
            {showAddButton && (
              <button onClick={() => { setOpen(false); setShowAddModal(true); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: noResults ? "transparent" : "#FAFBFD", cursor: "pointer", fontSize: 13, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8, borderTop: matches.length > 0 ? "1px solid #EEF1F6" : "none" }}>
                <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#1B6CA8", flexShrink: 0, lineHeight: 1 }}>+</span>
                <span style={{ color: "#1B6CA8", fontWeight: 600 }}>{noResults ? <>No results — add "{value.trim()}" as new manufacturer</> : <>Add "{value.trim()}" as new manufacturer</>}</span>
              </button>
            )}
          </div>
        )}
      </div>
      {showAddModal && <AddManufacturerModal initialName={value.trim()} onClose={() => setShowAddModal(false)} onSaved={name => { setKnownList(prev => [...prev, name]); onChange(name); }} />}
    </>
  );
}

// ─── Composition combobox ─────────────────────────────────────────────────────

function AddCompositionModal({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: (name: string) => void }) {
  const [comp, setComp] = useState<CompositionEntry>({ name: initialName, shortName: "", strength: "", sideEffects: "", description: "" });
  const upd = <K extends keyof CompositionEntry>(k: K, v: CompositionEntry[K]) => setComp(prev => ({ ...prev, [k]: v }));
  const canSave = comp.name.trim().length > 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 520, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(10,22,44,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>New Composition</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add composition</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <DrawerField label="Composition name" required><TextInput value={comp.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. Paracetamol 500 mg" /></DrawerField>
            <DrawerField label="Short name"><TextInput value={comp.shortName} onChange={e => upd("shortName", e.target.value)} placeholder="e.g. PCM" /></DrawerField>
            <DrawerField label="Strength" required><TextInput value={comp.strength} onChange={e => upd("strength", e.target.value)} placeholder="e.g. 500 mg" /></DrawerField>
            <DrawerField label="Side effects"><TextInput value={comp.sideEffects} onChange={e => upd("sideEffects", e.target.value)} placeholder="e.g. Nausea, dizziness" /></DrawerField>
            <DrawerField label="Description" gridSpan={2}>
              <textarea value={comp.description} onChange={e => upd("description", e.target.value)} placeholder="Pharmacological description" rows={3}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
            </DrawerField>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <button onClick={() => { if (canSave) { onSaved(comp.name.trim()); onClose(); } }} disabled={!canSave}
            style={{ padding: "9px 20px", border: "none", background: canSave ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: canSave ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Save composition
          </button>
        </div>
      </div>
    </div>
  );
}

function CompositionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [knownList, setKnownList] = useState(KNOWN_COMPOSITIONS_SEED);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  const q = value.trim().toLowerCase();
  const matches = q ? knownList.filter(c => c.toLowerCase().includes(q)) : knownList.slice(0, 8);
  const exactMatch = knownList.some(c => c.toLowerCase() === q);
  const noResults = q.length > 0 && matches.length === 0;
  const showAddButton = q.length > 0 && !exactMatch;
  return (
    <>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <TextInput value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} placeholder="e.g. Paracetamol 500 mg" />
        {open && (matches.length > 0 || showAddButton) && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", borderTop: "none", zIndex: 20, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.10)" }}>
            {matches.map(c => (
              <button key={c} onClick={() => { onChange(c); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>{c}</button>
            ))}
            {showAddButton && (
              <button onClick={() => { setOpen(false); setShowAddModal(true); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: noResults ? "transparent" : "#FAFBFD", cursor: "pointer", fontSize: 13, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8, borderTop: matches.length > 0 ? "1px solid #EEF1F6" : "none" }}>
                <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#1B6CA8", flexShrink: 0, lineHeight: 1 }}>+</span>
                <span style={{ color: "#1B6CA8", fontWeight: 600 }}>{noResults ? <>No results — add "{value.trim()}" as new composition</> : <>Add "{value.trim()}" as new composition</>}</span>
              </button>
            )}
          </div>
        )}
      </div>
      {showAddModal && <AddCompositionModal initialName={value.trim()} onClose={() => setShowAddModal(false)} onSaved={name => { setKnownList(prev => [...prev, name]); onChange(name); }} />}
    </>
  );
}

function MedCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#4A5875", fontFamily: "Inter" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#1B6CA8" }} />
      {label}
    </label>
  );
}

// ─── Add Medicine Drawer ──────────────────────────────────────────────────────

export function AddMedicineDrawer({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: (name: string) => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<AddMedForm>({ ...emptyMedForm(), genericName: initialName });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const upd = <K extends keyof AddMedForm>(key: K, value: AddMedForm[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const goNext = () => {
    if (step < 4) setStep(s => (s + 1) as 1 | 2 | 3 | 4);
    else { onSaved(form.genericName || form.brandName || "New Medicine"); onClose(); }
  };
  const goBack = () => { if (step > 1) setStep(s => (s - 1) as 1 | 2 | 3 | 4); };
  const continueDisabled = step === 1 && !form.genericName.trim();
  const reviewName = [form.genericName, form.brandName].filter(Boolean).join(" · ") || "—";
  const reviewStrength = [form.strength, form.dosageForm].filter(Boolean).join(" · ") || "—";
  const reviewPricing = [form.mrp ? `Purchase ₹${form.mrp}` : null, form.sellingPrice ? `MRP ₹${form.sellingPrice}` : null].filter(Boolean).join(" — ") || "—";
  const reviewStock = [form.openingStock || null, form.stockLocation || null].filter(Boolean).join(" · ") || "—";
  const reviewHsn = [form.hsnCode || null, form.gstRate ? `${form.gstRate}% · GST` : null].filter(Boolean).join(" · ") || "—";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.5)", zIndex: 500, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(760px, 58vw)", background: "#fff", zIndex: 501, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(12,27,51,0.15)" }}>
        <div style={{ padding: "22px 32px 20px", position: "relative", flexShrink: 0, borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.14em", textTransform: "uppercase" }}>Inventory · New Medicine</div>
          <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em", marginTop: 6 }}>Add medicine</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4, maxWidth: 560 }}>Create a catalog record that is ready for purchasing, batch tracking, and stock control.</div>
          <button onClick={onClose} aria-label="Close"
            style={{ position: "absolute", top: 22, right: 22, width: 32, height: 32, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <MedStepper current={step} />
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {step === 1 && (
            <>
              <DrawerSectionHeader n="01" title="Medicine identity" subtitle="Use the approved catalog name, strength, and pack information." icon={<StepChip><PillIcon /></StepChip>} />
              <DrawerRow><DrawerField label="Generic name" required><TextInput value={form.genericName} onChange={e => upd("genericName", e.target.value)} placeholder="e.g. Paracetamol" /></DrawerField><DrawerField label="Brand name" required><TextInput value={form.brandName} onChange={e => upd("brandName", e.target.value)} placeholder="e.g. Crocin 500" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Strength" required><TextInput value={form.strength} onChange={e => upd("strength", e.target.value)} placeholder="e.g. 500 mg" /></DrawerField><DrawerField label="Dosage form" required><DropdownSelect value={form.dosageForm} onChange={v => upd("dosageForm", v)} options={DOSAGE_FORMS} /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Route" required><DropdownSelect value={form.route} onChange={v => upd("route", v)} options={ROUTES} /></DrawerField><DrawerField label="Pack / Unit" required><TextInput value={form.packUnit} onChange={e => upd("packUnit", e.target.value)} placeholder="e.g. 10 tablets / strip" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Manufacturer" required><ManufacturerField value={form.manufacturer} onChange={v => upd("manufacturer", v)} /></DrawerField><DrawerField label="Therapeutic category" required><TextInput value={form.therapeuticCategory} onChange={e => upd("therapeuticCategory", e.target.value)} placeholder="e.g. Analgesic &amp; antipyretic" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Salt composition" required><CompositionField value={form.saltComposition} onChange={v => upd("saltComposition", v)} /></DrawerField><DrawerField label="Therapeutic class" required><TextInput value={form.therapeuticClass} onChange={e => upd("therapeuticClass", e.target.value)} placeholder="e.g. Analgesic" /></DrawerField></DrawerRow>
            </>
          )}
          {step === 2 && (
            <>
              <DrawerSectionHeader n="02" title="Compliance &amp; storage" subtitle="These controls support pharmacy dispensing and inventory safety." icon={<StepChip><ShieldSolidIcon /></StepChip>} />
              <DrawerRow><DrawerField label="HSN code" required><TextInput value={form.hsnCode} onChange={e => upd("hsnCode", e.target.value)} placeholder="e.g. 3482345" /></DrawerField><DrawerField label="Barcode / GTIN"><TextInput value={form.barcode} onChange={e => upd("barcode", e.target.value)} placeholder="Scan or enter barcode" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Prescription status"><DropdownSelect value={form.prescriptionStatus} onChange={v => upd("prescriptionStatus", v)} options={PRESCRIPTION_STATUSES} /></DrawerField><DrawerField label="GST / Tax rate" required><div style={{ display: "flex" }}><TextInput value={form.gstRate} onChange={e => upd("gstRate", e.target.value)} placeholder="12" /><span style={{ padding: "9px 12px", border: "1px solid #E8ECF4", borderLeft: "none", fontSize: 13, color: "#6B7280", background: "#F9FAFB", whiteSpace: "nowrap", flexShrink: 0 }}>%</span></div></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Storage condition" required><TextInput value={form.storageCondition} onChange={e => upd("storageCondition", e.target.value)} placeholder="Store below 25°C" /></DrawerField><DrawerField label="Temperature range" required><TextInput value={form.tempRange} onChange={e => upd("tempRange", e.target.value)} placeholder="15–25°C" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Storage zone" required><TextInput value={form.storageZone} onChange={e => upd("storageZone", e.target.value)} placeholder="Main store" /></DrawerField><DrawerField label="Manufacturer product code"><TextInput value={form.mfgProductCode} onChange={e => upd("mfgProductCode", e.target.value)} placeholder="Distributor/manufacturer code" /></DrawerField></DrawerRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginTop: 16 }}>
                <MedCheckbox checked={form.controlledDrug} onChange={v => upd("controlledDrug", v)} label="Controlled drug" />
                <MedCheckbox checked={form.narcotic} onChange={v => upd("narcotic", v)} label="Narcotic / psychotropic" />
                <MedCheckbox checked={form.coldChain} onChange={v => upd("coldChain", v)} label="Cold-chain item" />
                <MedCheckbox checked={form.specialHandling} onChange={v => upd("specialHandling", v)} label="Special handling" />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <DrawerSectionHeader n="03" title="Operations" subtitle="Pricing, stock levels, and unit configuration for this medicine." icon={<StepChip><BoxIcon /></StepChip>} />
              <DrawerRow><DrawerField label="MRP" required><TextInput value={form.mrp} onChange={e => upd("mrp", e.target.value)} placeholder="e.g. 45" /></DrawerField><DrawerField label="Selling price" required><TextInput value={form.sellingPrice} onChange={e => upd("sellingPrice", e.target.value)} placeholder="e.g. 45" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Opening stock" required><TextInput value={form.openingStock} onChange={e => upd("openingStock", e.target.value)} placeholder="e.g. 04" /></DrawerField><DrawerField label="Reorder threshold" required><TextInput value={form.reorderThreshold} onChange={e => upd("reorderThreshold", e.target.value)} placeholder="e.g. 10" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Minimum stock" required><TextInput value={form.minimumStock} onChange={e => upd("minimumStock", e.target.value)} placeholder="e.g. 5" /></DrawerField><DrawerField label="Stock location" required><TextInput value={form.stockLocation} onChange={e => upd("stockLocation", e.target.value)} placeholder="Main store" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Base unit"><TextInput value={form.baseUnit} onChange={e => upd("baseUnit", e.target.value)} placeholder="Unit" /></DrawerField><DrawerField label="Purchase unit"><TextInput value={form.purchaseUnit} onChange={e => upd("purchaseUnit", e.target.value)} placeholder="Box" /></DrawerField></DrawerRow>
              <DrawerRow><DrawerField label="Maximum stock" required><TextInput value={form.maximumStock} onChange={e => upd("maximumStock", e.target.value)} placeholder="100" /></DrawerField><DrawerField label="Reorder quantity" required><TextInput value={form.reorderQty} onChange={e => upd("reorderQty", e.target.value)} placeholder="50" /></DrawerField></DrawerRow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginTop: 16 }}>
                <MedCheckbox checked={form.batchTracking} onChange={v => upd("batchTracking", v)} label="Batch/lot tracking" />
                <MedCheckbox checked={form.expiryTracking} onChange={v => upd("expiryTracking", v)} label="Expiry tracking" />
                <MedCheckbox checked={form.fefoDispensing} onChange={v => upd("fefoDispensing", v)} label="FEFO dispensing" />
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <DrawerSectionHeader n="04" title="Review medicine" subtitle="Confirm the catalog record before making it available to purchasing." icon={<StepChip><CheckCircleIcon /></StepChip>} />
              <div style={{ border: "1px solid #E8ECF4" }}>
                {[
                  { l1: "Generic / Brand", v1: reviewName, l2: "Strength &amp; Form", v2: reviewStrength },
                  { l1: "Manufacturer", v1: form.manufacturer || "—", l2: "HSN / Tax", v2: reviewHsn },
                  { l1: "Pricing", v1: reviewPricing, l2: "Opening Stock", v2: reviewStock },
                ].map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: i < 2 ? "1px solid #F4F6FA" : "none" }}>
                    <div style={{ padding: "14px 18px", borderRight: "1px solid #F4F6FA" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.l1}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{r.v1}</div>
                    </div>
                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.l2}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{r.v2}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, padding: "12px 16px", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", gap: 12 }}>
                <ShieldSolidIcon />
                <span style={{ fontSize: 13, color: "#2E7D32", lineHeight: 1.5 }}>Saving creates a protected medicine master record and makes it immediately searchable from the purchase invoice.</span>
              </div>
            </>
          )}
        </div>
        <DrawerStepFooter step={step} total={4} onBack={step > 1 ? goBack : undefined} onCancel={onClose} onContinue={goNext} continueDisabled={continueDisabled} finalLabel="Save medicine" />
      </aside>
    </>
  );
}

// ─── Medicine Name Cell ───────────────────────────────────────────────────────

import { drugs } from "../../data/mockData";

export function MedicineNameCell({ value, alloc, onSelect }: {
  value: string;
  alloc: "FEFO" | "LEFO";
  onSelect: (name: string, batch: PriorBatch) => void;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [batchDrug, setBatchDrug] = useState<typeof drugs[0] | null>(null);
  const [showAddMed, setShowAddMed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setBatchDrug(null); }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return drugs.slice(0, 8);
    return drugs.filter(d => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.supplier.toLowerCase().includes(q)).slice(0, 8);
  }, [text]);

  const hasQuery = text.trim().length > 0;
  const noResults = hasQuery && matches.length === 0;

  const openBatchesFor = (d: typeof drugs[0]) => { setText(d.name); setBatchDrug(d); setOpen(true); };
  const commitBatch = (d: typeof drugs[0], b: PriorBatch) => { setText(d.name); onSelect(d.name, b); setOpen(false); setBatchDrug(null); };

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative", minWidth: 240, width: "100%" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ position: "absolute", left: 7, color: "#9CA3AF", pointerEvents: "none" }}>
            <circle cx="8.5" cy="8.5" r="5.5" stroke="#9CA3AF" strokeWidth="1.8" />
            <path d="M13 13l3 3" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input ref={inputRef} value={text}
            onChange={e => { setText(e.target.value); setOpen(true); setBatchDrug(null); }}
            onFocus={() => setOpen(true)}
            placeholder="Search medicine, generic name..."
            style={{ flex: 1, padding: "5px 8px 5px 26px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, minWidth: 170 }} />
        </div>
        {open && !batchDrug && (matches.length > 0 || noResults || !hasQuery) && (
          <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #DDE3EC", borderTop: "none", zIndex: 10, maxHeight: 300, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 620 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", position: "sticky", top: 0 }}>
                  {["Product Name", "Composition", "Pack", "Dosage Form"].map(h => (
                    <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid #E8ECF4", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {noResults ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "14px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>No medicine found for "{text.trim()}"</span>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => { setOpen(false); setShowAddMed(true); }}
                          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add Medicine
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : matches.map(d => {
                  const catalog = PO_MED_CATALOG.find(c => c.name === d.name);
                  return (
                    <tr key={d.id} onClick={() => openBatchesFor(d)}
                      style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{d.name}</div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{d.supplier}</div>
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: "#6B7280", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{catalog?.composition ?? "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>{catalog?.pack ?? d.unit}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>{catalog?.dosageForm ?? "—"}</td>
                    </tr>
                  );
                })}
                {!noResults && (
                  <tr>
                    <td colSpan={4} style={{ padding: 0 }}>
                      <button onMouseDown={e => e.preventDefault()} onClick={() => { setOpen(false); setShowAddMed(true); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", border: "none", borderTop: "1px solid #EEF1F6", background: "#F0F6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, width: "100%", textAlign: "left" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#F0F6FF")}>
                        <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
                        Add Medicine{text.trim() ? ` — "${text.trim()}"` : ""}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {open && batchDrug && (
          <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 20, boxShadow: "0 4px 12px rgba(10,22,44,0.12)", minWidth: 560 }}>
            <div style={{ padding: "8px 12px", background: "#F0F6FF", borderBottom: "1px solid #E8ECF4", fontSize: 11, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Select Batch — {batchDrug.name}</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 10 }}>{alloc}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Batch #", "Qty", "Packs", "Mfg Date", "Exp Date", "MRP", "Rate"].map(h => (
                    <th key={h} style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #F4F6FA", textAlign: "left", background: "#FAFBFD", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...priorBatchesFor(batchDrug)]
                  .sort((a, b) => alloc === "FEFO" ? a.expDate.localeCompare(b.expDate) : b.expDate.localeCompare(a.expDate))
                  .map(b => {
                    const nearExpiry = b.expDate < "2027-06-30";
                    return (
                      <tr key={b.id} onClick={() => commitBatch(batchDrug, b)}
                        style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA", background: nearExpiry ? "#FFFBEB" : "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                        onMouseLeave={e => (e.currentTarget.style.background = nearExpiry ? "#FFFBEB" : "transparent")}>
                        <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{b.id}</td>
                        <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{b.qty}</td>
                        <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.packs}</td>
                        <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280", whiteSpace: "nowrap" }}>{b.mfgDate}</td>
                        <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: nearExpiry ? "#E65100" : "#6B7280", fontWeight: nearExpiry ? 600 : 400, whiteSpace: "nowrap" }}>{b.expDate}</td>
                        <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{b.mrp.toFixed(2)}</td>
                        <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 600 }}>₹{b.rate.toFixed(2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <div style={{ padding: "7px 12px", borderTop: "1px solid #F4F6FA", background: "#FAFBFD", fontSize: 11, color: "#6B7280" }}>
              Click a row to copy its details.
            </div>
          </div>
        )}
      </div>
      {showAddMed && <AddMedicineDrawer initialName={text.trim()} onClose={() => setShowAddMed(false)} onSaved={name => { setText(name); setShowAddMed(false); }} />}
    </>
  );
}

// ─── Distributor stepper & step components ────────────────────────────────────

function DistributorStepper({ current }: { current: number }) {
  return <HorizontalStepper steps={["Business", "Compliance", "Terms", "Review"]} current={current} />;
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EXPIRY_PERIODS = ["15 days", "30 days", "45 days", "60 days", "90 days", "180 days"];

type DistributorStepProps = {
  data: DistributorFormData;
  update: <K extends keyof DistributorFormData>(key: K, value: DistributorFormData[K]) => void;
};

function DayPills({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (d: string) => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d]);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {WEEK_DAYS.map(d => {
        const on = value.includes(d);
        return (
          <button key={d} onClick={() => toggle(d)}
            style={{ padding: "5px 10px", border: `1.5px solid ${on ? "#1B6CA8" : "#DDE3EC"}`, background: on ? "#EFF6FF" : "#fff", color: on ? "#1B6CA8" : "#6B7280", fontSize: 12, fontWeight: on ? 700 : 500, fontFamily: "Inter", cursor: "pointer", borderRadius: 4, lineHeight: 1.2 }}>
            {d}
          </button>
        );
      })}
    </div>
  );
}

function YesNoToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid #DDE3EC", overflow: "hidden", borderRadius: 4 }}>
      {["Yes", "No"].map(opt => {
        const active = value === opt;
        const isYes = opt === "Yes";
        return (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding: "7px 18px", border: "none", background: active ? (isYes ? "#E8F5E9" : "#FFEBEE") : "#fff", color: active ? (isYes ? "#2E7D32" : "#C62828") : "#6B7280", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "Inter", cursor: "pointer", borderRight: opt === "Yes" ? "1px solid #DDE3EC" : "none", lineHeight: 1.2 }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function BusinessStep({ data, update }: DistributorStepProps) {
  return (
    <>
      <DrawerSectionHeader n="01" title="Business identity" subtitle="Use the legal name shown on invoices and licenses." icon={<StepChip><BriefcaseIcon /></StepChip>} />
      <DrawerRow>
        <DrawerField label="Distributor Name" required><TextInput value={data.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Medline Distributors" /></DrawerField>
        <DrawerField label="Legal Business Name"><TextInput value={data.legalName} onChange={e => update("legalName", e.target.value)} placeholder="Registered legal name" /></DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Distributor Type"><DropdownSelect value={data.type} onChange={v => update("type", v)} options={DISTRIBUTOR_TYPES} /></DrawerField>
        <DrawerField label="Account status"><DropdownSelect value={data.accountStatus} onChange={v => update("accountStatus", v)} options={ACCOUNT_STATUSES} /></DrawerField>
      </DrawerRow>
    </>
  );
}

function ComplianceStep({ data, update }: DistributorStepProps) {
  return (
    <>
      <DrawerSectionHeader n="02" title="Compliance &amp; primary contact" subtitle="These details appear on purchase invoices and audit records." icon={<StepChip><ShieldSolidIcon /></StepChip>} />
      <DrawerRow>
        <DrawerField label="GSTIN" required><TextInput value={data.gstin} onChange={e => update("gstin", e.target.value)} placeholder="27AAAAA0000A1Z5" /></DrawerField>
        <DrawerField label="Drug License No. 1" required><TextInput value={data.drugLicense1} onChange={e => update("drugLicense1", e.target.value)} placeholder="DL-20B-123456" /></DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Drug License No. 2"><TextInput value={data.drugLicense2} onChange={e => update("drugLicense2", e.target.value)} placeholder="DL-21B-123456" /></DrawerField>
        <DrawerField label="PAN"><TextInput value={data.pan} onChange={e => update("pan", e.target.value)} placeholder="AAAAA0000A" /></DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Contact person" required><TextInput value={data.contactPerson} onChange={e => update("contactPerson", e.target.value)} placeholder="Full name" /></DrawerField>
        <DrawerField label="Phone" required><TextInput value={data.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 98765 43210" /></DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Email"><TextInput type="email" value={data.email} onChange={e => update("email", e.target.value)} placeholder="orders@distributor.com" /></DrawerField>
        <DrawerField label="Sales representative"><TextInput value={data.salesRep} onChange={e => update("salesRep", e.target.value)} placeholder="Assigned sales rep" /></DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Notify Channel" required>
          <DropdownSelect value={data.notifyChannel} onChange={v => update("notifyChannel", v)} options={NOTIFY_CHANNEL_OPTIONS} />
        </DrawerField>
      </DrawerRow>
    </>
  );
}

function TermsStep({ data, update }: DistributorStepProps) {
  return (
    <>
      <DrawerSectionHeader n="03" title="Address &amp; credit terms" subtitle="Set the defaults your procurement team will use for every order." icon={<StepChip><TruckIcon /></StepChip>} />
      <DrawerRow>
        <DrawerField label="Address line 1" required><TextInput value={data.addressLine1} onChange={e => update("addressLine1", e.target.value)} placeholder="Street, building" /></DrawerField>
        <DrawerField label="Address line 2"><TextInput value={data.addressLine2} onChange={e => update("addressLine2", e.target.value)} placeholder="Landmark (optional)" /></DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="City" required><TextInput value={data.city} onChange={e => update("city", e.target.value)} placeholder="City" /></DrawerField>
        <DrawerField label="State" required><DropdownSelect value={data.state} onChange={v => update("state", v)} options={INDIAN_STATES} placeholder="— Select state —" /></DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Pincode" required><TextInput value={data.pincode} onChange={e => update("pincode", e.target.value)} placeholder="400001" /></DrawerField>
        <DrawerField label="Credit limit"><TextInput value={data.creditLimit} onChange={e => update("creditLimit", e.target.value)} placeholder="₹ 0.00" /></DrawerField>
      </DrawerRow>
      <DrawerRow>
        <DrawerField label="Payment terms" required><DropdownSelect value={data.paymentTerms} onChange={v => update("paymentTerms", v)} options={DISTRIBUTOR_PAYMENT_TERMS} /></DrawerField>
        <DrawerField label="Expected delivery days" required><TextInput type="number" value={data.expectedDeliveryDays} onChange={e => update("expectedDeliveryDays", e.target.value)} placeholder="8" /></DrawerField>
      </DrawerRow>
      <div style={{ margin: "24px 0 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: "#EEF1F6" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Delivery &amp; Return Policy</span>
        <div style={{ flex: 1, height: 1, background: "#EEF1F6" }} />
      </div>
      <DrawerField label="Delivery days"><DayPills value={data.deliveryDays} onChange={v => update("deliveryDays", v)} /></DrawerField>
      <div style={{ marginTop: 16 }}><DrawerField label="Salesperson visit days"><DayPills value={data.salespersonVisitDays} onChange={v => update("salespersonVisitDays", v)} /></DrawerField></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <DrawerField label="Same day delivery"><YesNoToggle value={data.sameDayDelivery} onChange={v => update("sameDayDelivery", v)} /></DrawerField>
        <DrawerField label="Return allowed"><YesNoToggle value={data.returnAllowed} onChange={v => update("returnAllowed", v)} /></DrawerField>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <DrawerField label="Damage product return"><YesNoToggle value={data.damageReturnAllowed} onChange={v => update("damageReturnAllowed", v)} /></DrawerField>
        <DrawerField label="Expiry return allowed"><YesNoToggle value={data.expiryReturnAllowed} onChange={v => update("expiryReturnAllowed", v)} /></DrawerField>
      </div>
      {data.expiryReturnAllowed === "Yes" && (
        <div style={{ marginTop: 16 }}>
          <DrawerField label="Expiry return period"><DropdownSelect value={data.expiryReturnPeriod} onChange={v => update("expiryReturnPeriod", v)} options={EXPIRY_PERIODS} placeholder="— Select period —" /></DrawerField>
        </div>
      )}
    </>
  );
}

function ReviewStep({ data }: { data: DistributorFormData }) {
  const addressLine = [data.addressLine1, data.addressLine2, data.city, data.state, data.pincode].filter(Boolean).join(", ");
  const deliveryDaysStr = data.deliveryDays.length > 0 ? data.deliveryDays.join(", ") : "—";
  const visitDaysStr = data.salespersonVisitDays.length > 0 ? data.salespersonVisitDays.join(", ") : "—";
  const expiryStr = data.expiryReturnAllowed === "Yes" ? `Yes${data.expiryReturnPeriod ? ` · ${data.expiryReturnPeriod}` : ""}` : "No";
  const rows = [
    { l1: "Distributor Name", v1: data.name || "—", l2: "GSTIN", v2: data.gstin || "—" },
    { l1: "Primary Contact", v1: data.contactPerson || "—", l2: "Phone", v2: data.phone || "—" },
    { l1: "Email", v1: data.email || "—", l2: "Notify Channel", v2: data.notifyChannel || "—" },
    { l1: "Registered Address", v1: addressLine || "—", l2: "Payment Terms", v2: data.paymentTerms || "—" },
    { l1: "Delivery Days", v1: deliveryDaysStr, l2: "Salesperson Visit Days", v2: visitDaysStr },
    { l1: "Same Day Delivery", v1: data.sameDayDelivery, l2: "Return Allowed", v2: data.returnAllowed },
    { l1: "Damage Return", v1: data.damageReturnAllowed, l2: "Expiry Return", v2: expiryStr },
  ];
  return (
    <>
      <DrawerSectionHeader n="04" title="Review distributor" subtitle="Confirm the account details before adding it to purchasing." icon={<StepChip><CheckCircleIcon /></StepChip>} />
      <div style={{ border: "1px solid #E8ECF4" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: i < rows.length - 1 ? "1px solid #F4F6FA" : "none" }}>
            <div style={{ padding: "14px 18px", borderRight: "1px solid #F4F6FA" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.l1}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{r.v1}</div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.l2}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1B33", marginTop: 4 }}>{r.v2}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, padding: "12px 16px", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", gap: 12 }}>
        <ShieldSolidIcon />
        <span style={{ fontSize: 13, color: "#2E7D32", lineHeight: 1.5 }}>Saving creates a protected distributor account and makes it immediately searchable from the purchase invoice.</span>
      </div>
    </>
  );
}

// ─── Add Distributor Drawer ───────────────────────────────────────────────────

export function AddDistributorDrawer({ onClose, onSaved, initialData }: { onClose: () => void; onSaved: (name: string) => void; initialData?: Partial<DistributorFormData> }) {
  const isEdit = !!initialData;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [data, setData] = useState<DistributorFormData>(initialData ? { ...emptyDistributor, ...initialData } : emptyDistributor);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof DistributorFormData>(key: K, value: DistributorFormData[K]) => { setData(d => ({ ...d, [key]: value })); };
  const canContinueStep1 = data.name.trim().length > 0;
  const goNext = () => {
    if (step < 4) setStep(s => (s + 1) as 1 | 2 | 3 | 4);
    else { if (data.name.trim()) onSaved(data.name.trim()); onClose(); }
  };
  const goBack = () => { if (step > 1) setStep(s => (s - 1) as 1 | 2 | 3 | 4); };
  const continueDisabled = step === 1 && !canContinueStep1;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.5)", zIndex: 500, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(760px, 58vw)", background: "#fff", zIndex: 501, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(12,27,51,0.15)" }}>
        <div style={{ padding: "22px 32px 20px", position: "relative", flexShrink: 0, borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.14em", textTransform: "uppercase" }}>Purchasing · {isEdit ? "Edit Account" : "New Account"}</div>
          <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em", marginTop: 6 }}>{isEdit ? "Edit distributor" : "Add distributor"}</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4, maxWidth: 560 }}>{isEdit ? "Update the distributor profile." : "Create a complete distributor profile without leaving your purchase invoice."}</div>
          <button onClick={onClose} aria-label="Close"
            style={{ position: "absolute", top: 22, right: 22, width: 32, height: 32, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <DistributorStepper current={step} />
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {step === 1 && <BusinessStep data={data} update={update} />}
          {step === 2 && <ComplianceStep data={data} update={update} />}
          {step === 3 && <TermsStep data={data} update={update} />}
          {step === 4 && <ReviewStep data={data} />}
        </div>
        <DrawerStepFooter step={step} total={4} onBack={step > 1 ? goBack : undefined} onCancel={onClose} onContinue={goNext} continueDisabled={continueDisabled} finalLabel={isEdit ? "Save changes" : "Save distributor"} />
      </aside>
    </>
  );
}

// ─── Distributor Search ───────────────────────────────────────────────────────

export function DistributorSearch({ selected, onSelect, distributors, onAdd }: {
  selected: string;
  onSelect: (name: string) => void;
  distributors: string[];
  onAdd: () => void;
}) {
  const [query, setQuery] = useState(selected);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(selected); }, [selected]);
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q.length > 0 ? distributors.filter(d => d.toLowerCase().includes(q)) : distributors.slice(0, 8);
  const isSelected = !!selected && query === selected;

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <input value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (selected) onSelect(""); }}
        onFocus={() => setOpen(true)}
        placeholder="Search distributor..."
        style={{ width: "100%", padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", background: isSelected ? "#F0F6FF" : "#fff" }} />
      {isSelected && <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✓</div>}
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #E8ECF4", zIndex: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", minWidth: 320, maxHeight: 320, overflowY: "auto" }}>
          {results.map(name => {
            const sup = suppliers.find(s => s.name === name);
            const payable = sup && sup.balance < 0 ? Math.abs(sup.balance) : 0;
            return (
              <button key={name} onMouseDown={e => e.preventDefault()} onClick={() => { onSelect(name); setQuery(name); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sup ? <><span style={{ fontFamily: "JetBrains Mono" }}>{sup.id}</span>{" · "}{sup.contact}</> : <span style={{ fontStyle: "italic" }}>Added this session</span>}
                    </div>
                  </div>
                  {payable > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#C62828", background: "#FFEBEE", padding: "2px 8px", whiteSpace: "nowrap" }}>Due ₹{payable.toFixed(2)}</span>}
                </div>
              </button>
            );
          })}
          {results.length === 0 && <div style={{ padding: "14px", fontSize: 12, color: "#9CA3AF", textAlign: "center", fontFamily: "Inter" }}>No distributors match "{query}"</div>}
          <button onMouseDown={e => e.preventDefault()} onClick={() => { setOpen(false); onAdd(); }}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "#F0F6FF", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontWeight: 600, fontFamily: "Inter" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#DBEAFE")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F0F6FF")}>
            + Add Distributor
          </button>
        </div>
      )}
    </div>
  );
}

export function MedicineMapModal({
  importedName,
  onMap,
  onCreateNew,
  onClose,
}: {
  importedName: string;
  onMap: (systemName: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState(importedName);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parsedDrugs.slice(0, 12);
    return parsedDrugs
      .map(d => {
        let score = 0;
        if (d.name.toLowerCase().includes(q))     score += 3;
        if (d.generic.toLowerCase().includes(q))  score += 2;
        if (d.strength.toLowerCase().includes(q)) score += 1;
        if (d.unit.toLowerCase().includes(q))     score += 1;
        if (d.category.toLowerCase().includes(q)) score += 1;
        return { d, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(r => r.d);
  }, [search]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", width: 720, maxWidth: "calc(100vw - 32px)", maxHeight: "80vh", display: "flex", flexDirection: "column", border: "1px solid #E8ECF4", boxShadow: "0 12px 40px rgba(10,22,44,0.18)" }}>

        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Map Medicine Name</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 5, lineHeight: 1.5 }}>
            Imported as{" "}
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C2410C", background: "#FFF7ED", padding: "1px 6px", border: "1px solid #FED7AA" }}>
              {importedName}
            </span>
            {" "}— select the matching system medicine below.
          </div>
        </div>

        <div style={{ padding: "10px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, composition, strength, pack, or category…"
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
            onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
            onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {suggestions.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              No medicines found for &ldquo;{search}&rdquo;
              <div style={{ marginTop: 10, fontSize: 12 }}>Use <strong>Create New Medicine</strong> below to add it to the master.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", position: "sticky", top: 0, zIndex: 1 }}>
                  {["Medicine Name", "Composition", "Pack", "MRP", ""].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: h === "MRP" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #E8ECF4", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suggestions.map(d => {
                  const catalog = PO_MED_CATALOG.find(c => c.name === d.name);
                  return (
                    <tr key={d.id}
                      onClick={() => onMap(d.name)}
                      style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{d.name}</div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{d.category}</div>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {catalog?.composition ?? d.generic ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>
                        {catalog?.pack ?? d.unit ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", textAlign: "right", whiteSpace: "nowrap" }}>
                        {catalog ? money(catalog.price) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <span style={{ fontSize: 11, color: "#1B6CA8", fontWeight: 700, padding: "3px 10px", background: "#EFF6FF", whiteSpace: "nowrap", border: "1px solid #DBEAFE" }}>
                          Select →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={onCreateNew}
            style={{ padding: "8px 16px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}
          >
            + Create New Medicine
          </button>
          <button
            onClick={onClose}
            style={{ padding: "8px 16px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function PurchaseLineItemsTable({ items, alloc, onChange, onDelete, onMap, onAccept, lineSearch, onLineSearchChange }: {
  items: PurchaseLine[];
  alloc: "FEFO" | "LEFO";
  onChange: (id: number, field: keyof PurchaseLine, value: number | string) => void;
  onDelete: (id: number) => void;
  onMap?: (id: number) => void;
  onAccept?: (id: number) => void;
  lineSearch?: string;
  onLineSearchChange?: (v: string) => void;
}) {
  const inputStyle = (w: number): React.CSSProperties => ({
    width: w, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none",
    fontFamily: "JetBrains Mono", textAlign: "right", background: "#fff", color: "#1A2436",
  });

  const q = (lineSearch ?? "").trim().toLowerCase();
  const visibleItems = q
    ? items.filter(i =>
        i.medicineName.toLowerCase().includes(q) ||
        (i.importedName ?? "").toLowerCase().includes(q) ||
        i.batchNo.toLowerCase().includes(q)
      )
    : items;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
      <table style={{ borderCollapse: "collapse", minWidth: 1300, width: "100%" }}>
        <thead>
          <tr>
            <Th>Medicine</Th>
            <Th>Batch #</Th>
            <Th>Exp</Th>
            <Th right>Pack</Th>
            <Th right>Qty</Th>
            <Th right>Free</Th>
            <Th right>Rate</Th>
            <Th right>MRP</Th>
            <Th right>Disc %</Th>
            <Th right>GST %</Th>
            <Th right>Amount</Th>
            <Th center>Action</Th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map(item => {
            const ms = item.mappingStatus;
            return (
            <tr key={item.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
              <td style={{ padding: "6px 10px", textAlign: "left", minWidth: 260 }}>
                {ms ? (
                  ms === "matched" ? (
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1A2436", fontFamily: "Inter" }}>
                      {item.medicineName}
                    </span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 500, fontFamily: "Inter",
                        color: ms === "unmatched" ? "#C0392B" : "#A05C00",
                      }}>
                        {item.importedName}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {ms === "fuzzy" && item.medicineName && (
                          <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "Inter" }}>
                            → {item.medicineName}
                          </span>
                        )}
                        {ms === "unmatched" && (
                          <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>No match found</span>
                        )}
                        {ms === "fuzzy" && item.medicineName && (
                          <button
                            onClick={() => onAccept?.(item.id)}
                            title="Accept suggestion"
                            style={{ border: "none", background: "transparent", cursor: "pointer", padding: "1px 2px", display: "inline-flex", alignItems: "center" }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => onMap?.(item.id)}
                          title="Map to system medicine"
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: "1px 2px", display: "inline-flex", alignItems: "center" }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <MedicineNameCell
                    value={item.medicineName}
                    alloc={alloc}
                    onSelect={(name, batch) => {
                      onChange(item.id, "medicineName", name);
                      onChange(item.id, "batchNo", batch.id);
                      onChange(item.id, "mfgDate", batch.mfgDate);
                      onChange(item.id, "expDate", batch.expDate);
                      onChange(item.id, "mrp", batch.mrp);
                      onChange(item.id, "purchaseRate", batch.rate);
                    }}
                  />
                )}
              </td>
              <td style={{ padding: "6px 10px", textAlign: "left" }}>
                <input value={item.batchNo} onChange={e => onChange(item.id, "batchNo", e.target.value)} placeholder="BATCH-#"
                  style={{ width: 100, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: "#1A2436" }} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "left" }}>
                <input type="date" value={item.expDate} onChange={e => onChange(item.id, "expDate", e.target.value)}
                  style={{ width: 130, padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 11, outline: "none", fontFamily: "JetBrains Mono", background: "#fff", color: item.expDate && item.expDate < "2026-12-31" ? "#E65100" : "#1A2436" }} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.packSize || ""} onChange={e => onChange(item.id, "packSize", parseFloat(e.target.value) || 0)}
                  style={inputStyle(58)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.qty || ""} onChange={e => onChange(item.id, "qty", parseFloat(e.target.value) || 0)}
                  style={inputStyle(62)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.free || ""} onChange={e => onChange(item.id, "free", parseFloat(e.target.value) || 0)}
                  style={inputStyle(50)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.purchaseRate || ""} onChange={e => onChange(item.id, "purchaseRate", parseFloat(e.target.value) || 0)}
                  style={inputStyle(74)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.mrp || ""} onChange={e => onChange(item.id, "mrp", parseFloat(e.target.value) || 0)}
                  style={inputStyle(70)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.disc || ""} onChange={e => onChange(item.id, "disc", parseFloat(e.target.value) || 0)}
                  style={inputStyle(54)} />
              </td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>
                <input type="number" value={item.gst || ""} onChange={e => onChange(item.id, "gst", parseFloat(e.target.value) || 0)}
                  style={inputStyle(54)} />
              </td>
              <td style={{ padding: "6px 10px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, textAlign: "right", color: "#1A2436", whiteSpace: "nowrap" }}>
                {item.medicineName ? money(calcLineAmount(item)) : "—"}
              </td>
              <td style={{ padding: "6px 10px", textAlign: "center" }}>
                {item.medicineName && (
                    <button onClick={() => onDelete(item.id)} title="Remove"
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#C62828", fontSize: 16, padding: "2px 4px" }}>×</button>
                  )}
                </td>
              </tr>
              );
            })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

type DrawerTab = "overview" | "invoices" | "paid" | "returns";

export function DistributorDrawer({ supplierName, onClose, onEdit }: { supplierName: string; onClose: () => void; onEdit?: () => void }) {
  const [tab, setTab] = useState<"overview" | "invoice" | "return" | "payment">("overview");
  const sup = suppliers.find(s => s.name === supplierName);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const invoices = purchaseInvoices.filter(i => i.supplier === supplierName);
  const returns = purchaseReturns.filter(r => r.supplier === supplierName);
  const payments = purchasePayments.filter(p => p.supplier === supplierName);

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = payments.filter(p => p.status === "Cleared").reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  const DRAWER_TABS = [
    { id: "overview" as const, label: "Overview" },
    { id: "invoice" as const, label: "Purchase Invoice", count: invoices.length },
    { id: "return" as const, label: "Purchase Return", count: returns.length },
    { id: "payment" as const, label: "Payments", count: payments.length },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.35)", zIndex: 299 }} />
      <aside style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 520, background: "#fff", zIndex: 300, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.10)" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>{supplierName}</div>
            {sup && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{sup.contact} · {sup.phone}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, fontWeight: 600, cursor: onEdit ? "pointer" : "default", color: "#1A2436", fontFamily: "Inter" }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 1.5a1.414 1.414 0 0 1 2 2L4 11H1.5V8.5L9.5 1.5Z" stroke="#1A2436" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Edit Distributor
            </button>
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1, padding: "0 2px" }}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          {DRAWER_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "10px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                fontFamily: "Inter", background: "transparent",
                color: tab === t.id ? "#1B6CA8" : "#6B7280",
                borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent",
                display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
              }}>
              {t.label}
              {t.count !== undefined && (
                <span style={{ padding: "1px 6px", fontSize: 10, fontFamily: "JetBrains Mono", fontWeight: 700, background: tab === t.id ? "#EFF6FF" : "#F0F3F7", color: tab === t.id ? "#1B6CA8" : "#9CA3AF" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* ── Overview ── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* KPI strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Invoiced</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2436", fontFamily: "JetBrains Mono", marginTop: 3 }}>{money(totalInvoiced)}</div>
                </div>
                <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#2E7D32", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Paid</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#2E7D32", fontFamily: "JetBrains Mono", marginTop: 3 }}>{money(totalPaid)}</div>
                </div>
                <div style={{ background: totalOutstanding > 0 ? "#FFEBEE" : "#F8FAFC", border: `1px solid ${totalOutstanding > 0 ? "#FFCDD2" : "#EEF1F6"}`, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: totalOutstanding > 0 ? "#C62828" : "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Outstanding</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: totalOutstanding > 0 ? "#C62828" : "#9CA3AF", fontFamily: "JetBrains Mono", marginTop: 3 }}>{money(totalOutstanding)}</div>
                </div>
              </div>

              {/* Contact info */}
              {sup ? (
                <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Contact Information</div>
                  {[
                    { label: "Contact Person", value: sup.contact },
                    { label: "Email", value: sup.email },
                    { label: "Phone", value: sup.phone },
                    { label: "Notify Channel", value: sup.notifyChannel ?? "—" },
                    { label: "Address", value: sup.address },
                    { label: "Products Supplied", value: String(sup.products) },
                    { label: "Rating", value: `${"★".repeat(Math.round(sup.rating))} ${sup.rating}` },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, minWidth: 130, flexShrink: 0 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: r.label === "Notify Channel" ? "#1B6CA8" : "#1A2436", fontWeight: r.label === "Notify Channel" ? 600 : 500 }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "#9CA3AF", background: "#F8FAFC", border: "1px solid #EEF1F6" }}>
                  Added this session — save the invoice to persist this distributor.
                </div>
              )}

              {/* Business Rules & Terms */}
              {(() => {
                const pol = DISTRIBUTOR_POLICIES[supplierName];
                const expiryReturnOk = pol ? pol.expiryReturn : true;
                const damageReturnOk = pol ? pol.damageReturn : true;
                const rules = [
                  { label: "Payment Terms", value: "Credit 30 Days", highlight: undefined as boolean | undefined },
                  { label: "Min Expiry on Goods", value: pol ? `${pol.minExpiry} from delivery` : "12 months from delivery", highlight: undefined },
                  { label: "Expiry Return Policy", value: expiryReturnOk ? "Allowed" : "Not Allowed", highlight: expiryReturnOk },
                  { label: "Damage Return Policy", value: damageReturnOk ? "Allowed — report within 48 hrs" : "Not Allowed", highlight: damageReturnOk },
                  { label: "Short Expiry Discount", value: pol?.nearExpiryDiscount ?? "—", highlight: undefined },
                  { label: "Return Window", value: pol ? `${pol.returnWindow} from invoice date` : "30 days from invoice date", highlight: undefined },
                  { label: "GST Registration", value: "27AABCM1234K1ZX", highlight: undefined },
                  { label: "Drug License No.", value: "MH/DL/2024/00892", highlight: undefined },
                ];
                return (
                  <div style={{ border: "1px solid #EEF1F6" }}>
                    <div style={{ padding: "10px 14px", background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      Business Rules & Terms
                    </div>
                    {rules.map((r, i) => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: i < rules.length - 1 ? "1px solid #F4F6FA" : undefined, background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>{r.label}</span>
                        <span style={{ fontSize: 12, color: r.highlight === true ? "#2E7D32" : r.highlight === false ? "#C62828" : "#1A2436", fontWeight: 600, textAlign: "right", maxWidth: 220 }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Delivery & Ordering Schedule */}
              <div style={{ border: "1px solid #EEF1F6" }}>
                <div style={{ padding: "10px 14px", background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Delivery & Ordering Schedule
                </div>
                <div style={{ padding: "14px" }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Ordering Days (place PO on these days)</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["Mon", "Wed", "Fri"].map(d => (
                        <span key={d} style={{ padding: "4px 12px", background: "#EFF6FF", color: "#1B6CA8", fontSize: 12, fontWeight: 700, border: "1px solid #BFDBFE" }}>{d}</span>
                      ))}
                      {["Tue", "Thu", "Sat", "Sun"].map(d => (
                        <span key={d} style={{ padding: "4px 12px", background: "#F8FAFC", color: "#9CA3AF", fontSize: 12, border: "1px solid #EEF1F6" }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Delivery Days (expect goods on these days)</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["Tue", "Thu", "Sat"].map(d => (
                        <span key={d} style={{ padding: "4px 12px", background: "#E8F5E9", color: "#2E7D32", fontSize: 12, fontWeight: 700, border: "1px solid #A5D6A7" }}>{d}</span>
                      ))}
                      {["Mon", "Wed", "Fri", "Sun"].map(d => (
                        <span key={d} style={{ padding: "4px 12px", background: "#F8FAFC", color: "#9CA3AF", fontSize: 12, border: "1px solid #EEF1F6" }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Order Cut-off Time", value: "5:00 PM" },
                      { label: "Lead Time", value: "1–2 business days" },
                      { label: "Salesman Name", value: "Rajesh Kumar" },
                      { label: "Salesman Mobile", value: "+91 98200 44321" },
                      { label: "Min Order Value", value: money(500) },
                      { label: "Free Delivery Above", value: money(2000) },
                    ].map(r => (
                      <div key={r.label} style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{r.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436" }}>{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── Payments ── */}
          {tab === "payment" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Outstanding summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Invoiced</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", fontFamily: "JetBrains Mono", marginTop: 3 }}>{money(totalInvoiced)}</div>
                </div>
                <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#2E7D32", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Paid</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#2E7D32", fontFamily: "JetBrains Mono", marginTop: 3 }}>{money(totalPaid)}</div>
                </div>
                <div style={{ background: totalOutstanding > 0 ? "#FFEBEE" : "#F8FAFC", border: `1px solid ${totalOutstanding > 0 ? "#FFCDD2" : "#EEF1F6"}`, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: totalOutstanding > 0 ? "#C62828" : "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Outstanding</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: totalOutstanding > 0 ? "#C62828" : "#9CA3AF", fontFamily: "JetBrains Mono", marginTop: 3 }}>{money(totalOutstanding)}</div>
                </div>
              </div>

              {/* Payments table */}
              {payments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>No payments recorded for this distributor</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["Payment #", "Date", "Method", "Amount", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: h === "Amount" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #E8ECF4", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                        <td style={{ padding: "9px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600, whiteSpace: "nowrap" }}>{p.id}</td>
                        <td style={{ padding: "9px 10px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280", whiteSpace: "nowrap" }}>{formatDMY(p.date)}</td>
                        <td style={{ padding: "9px 10px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>
                          <div>{p.method}</div>
                          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{p.bank}</div>
                        </td>
                        <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right", whiteSpace: "nowrap" }}>{money(p.amount)}</td>
                        <td style={{ padding: "9px 10px" }}><Pill status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Purchase Invoice ── */}
          {tab === "invoice" && (
            <div>
              {invoices.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>No invoices for this distributor</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["Invoice #", "Date", "Due", "Total", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: h === "Total" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                        <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{inv.id}</td>
                        <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(inv.date)}</td>
                        <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(inv.due)}</td>
                        <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 600, textAlign: "right" }}>{money(inv.total)}</td>
                        <td style={{ padding: "9px 10px" }}><Pill status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Purchase Return ── */}
          {tab === "return" && (
            <div>
              {returns.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>No returns for this distributor</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["Return #", "Date", "Reason", "Total", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: h === "Total" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map(ret => (
                      <tr key={ret.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                        <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{ret.id}</td>
                        <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(ret.date)}</td>
                        <td style={{ padding: "9px 10px", fontSize: 12, color: "#6B7280", maxWidth: 130, whiteSpace: "normal" }}>{ret.reason}</td>
                        <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#C62828", fontWeight: 600, textAlign: "right" }}>-{money(ret.total)}</td>
                        <td style={{ padding: "9px 10px" }}><Pill status={ret.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </aside>
    </>
  );
}

export function POLineSearch({ onSelect, onAddMedicine }: { onSelect: (m: MedCatalogItem) => void; onAddMedicine?: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = query.trim().length > 0
    ? PO_MED_CATALOG.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.composition.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : PO_MED_CATALOG.slice(0, 10);

  function pick(m: MedCatalogItem) {
    onSelect(m);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ position: "absolute", left: 7, color: "#9CA3AF", pointerEvents: "none", flexShrink: 0 }}>
          <circle cx="8.5" cy="8.5" r="5.5" stroke="#9CA3AF" strokeWidth="1.8" />
          <path d="M13 13l3 3" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          placeholder="Search medicine, generic name..."
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          style={{ width: "100%", padding: "6px 8px 6px 26px", border: "1px solid #E8ECF4", fontSize: 12, fontFamily: "Inter", outline: "none", background: "#fff" }}
          onMouseDown={e => e.stopPropagation()}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 200, background: "#fff", border: "1px solid #DDE3EC", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 640, maxHeight: 260, overflowY: "auto" }}
          onMouseDown={e => e.preventDefault()}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", position: "sticky", top: 0 }}>
                {["Product Name", "Pack", "Dosage Form", "Composition", "Qty"].map(h => (
                  <th key={h} style={{ padding: "7px 10px", textAlign: h === "Qty" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid #E8ECF4", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#9CA3AF" }}>No medicines found for "{query}"</span>
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { setOpen(false); onAddMedicine?.(query); }}
                        style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Add Medicine
                      </button>
                    </div>
                  </td>
                </tr>
              ) : results.map(m => (
                <tr key={m.name}
                  onClick={() => pick(m)}
                  style={{ cursor: "pointer", borderBottom: "1px solid #F4F6FA" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{m.name}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "#6B7280" }}>{m.pack}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "#6B7280" }}>{m.dosageForm}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "#6B7280", maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.composition}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", color: m.totalQty === 0 ? "#C62828" : m.totalQty < 30 ? "#E65100" : "#2E7D32", fontWeight: 600 }}>{m.totalQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function EditableChip({ label, value, onChange, editable, prefix, allowNegative }: {
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

