import { useState, useEffect, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { S } from "../styles/common";
import { IV } from "../styles/inventory";
import { AreaChart, Area, BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { drugs } from "../data/mockData";
import { purchaseOrders, PAYMENT_TERMS_OPTIONS } from "./purchases/purchasesData";
import { usePagination, PaginationFooter } from "./shared/usePagination";
import { Th } from "./shared/Th";
import { Pill } from "./shared/Pill";
import { useTableSort } from "./shared/useTableSort";
import MultiStepper from "./shared/MultiStepper";

// ─── Types & form defaults ─────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

interface AddMedForm {
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

const emptyMedForm = (): AddMedForm => ({
  genericName: "", brandName: "", strength: "", dosageForm: "Tablet",
  route: "Oral", packUnit: "", manufacturer: "", therapeuticCategory: "",
  saltComposition: "", therapeuticClass: "",
  hsnCode: "", barcode: "", prescriptionStatus: "OTC", gstRate: "12",
  storageCondition: "", tempRange: "", storageZone: "Main store", mfgProductCode: "",
  distributorRef: "", regulatoryNotes: "",
  prescriptionRequired: false, looseSell: false,
  controlledDrug: false, narcotic: false, coldChain: false, specialHandling: false,
  mrp: "", sellingPrice: "", openingStock: "", reorderThreshold: "",
  minimumStock: "", stockLocation: "Main store", location: "", baseUnit: "Unit", purchaseUnit: "Box",
  saleUnit: "Strip", unitConversion: "", wholesalePrice: "0.00", margin: "",
  discountLimit: "", maximumStock: "100", reorderQty: "50", leadTime: "1",
  batchTracking: true, expiryTracking: true, fefoDispensing: true,
  therapeuticIndications: "", contraindications: "", dosageInstructions: "",
  sideEffects: "", patientLabelText: "", reviewNotes: "",
  productStatus: "Active", effectiveFrom: TODAY,
});

const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Inhaler", "Patch", "Powder", "Suppository", "Sachet", "Diaper"];
const LOOSE_SELL_FORMS = new Set(["Tablet", "Capsule", "Sachet", "Diaper", "Injection"]);
const ROUTES = ["Oral", "IV", "IM", "SC", "Topical", "Inhaled", "Sublingual", "Rectal", "Ocular", "Nasal"];
const PRESCRIPTION_STATUSES = ["OTC", "Prescription", "Schedule H", "Schedule H1", "Schedule X", "Schedule G"];
const PRODUCT_STATUSES = ["Active", "Inactive", "Discontinued", "Under Review"];
const MANUFACTURER_TYPES = ["Pharmaceutical", "Biotechnology", "Generic", "OTC", "Ayurvedic", "Veterinary", "Contract Manufacturing"];

const KNOWN_MANUFACTURERS_SEED = [
  "GSK", "Cipla", "Sun Pharma", "Dr. Reddy's", "Lupin", "Alkem", "Torrent Pharma",
  "Abbott India", "Pfizer India", "Novartis India", "Zydus Cadila", "Mankind Pharma",
  "Intas Pharma", "Glenmark", "Aurobindo", "Wockhardt", "Emcure", "Micro Labs",
];

const KNOWN_COMPOSITIONS_SEED = [
  "Paracetamol 500 mg", "Paracetamol 650 mg", "Amoxicillin 250 mg", "Amoxicillin 500 mg",
  "Metformin 500 mg", "Metformin 850 mg", "Atorvastatin 10 mg", "Atorvastatin 20 mg",
  "Amlodipine 5 mg", "Amlodipine 10 mg", "Azithromycin 250 mg", "Azithromycin 500 mg",
  "Cetirizine 10 mg", "Pantoprazole 40 mg", "Omeprazole 20 mg", "Ranitidine 150 mg",
  "Ibuprofen 400 mg", "Ibuprofen 600 mg", "Diclofenac 50 mg", "Aspirin 75 mg",
];

// ─── UI primitives ─────────────────────────────────────────────────────────────

function TextInput({ type = "text", value, onChange, placeholder, disabled }: { type?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: disabled ? "#F8FAFC" : "#fff", boxSizing: "border-box" as const, color: disabled ? "#9CA3AF" : "#0C1B33", cursor: disabled ? "default" : undefined, minHeight: 40 }}
      onFocus={disabled ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
      onBlur={disabled ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
  );
}

function DropdownSelect({ value, onChange, options, disabled }: { value?: string; onChange?: (v: string) => void; options: string[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) { setOpen(false); setPos(null); }
    }
    function handleScroll(e: Event) {
      if (popupRef.current && popupRef.current.contains(e.target as Node)) return;
      setOpen(false); setPos(null);
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  if (disabled) {
    return (
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", background: "#F8FAFC", color: "#9CA3AF", minHeight: 40, boxSizing: "border-box" as const }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginLeft: 6 }}><path d="M1 3l4 4 4-4" stroke="#C4C9D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    );
  }

  function toggle() {
    if (open) { setOpen(false); setPos(null); return; }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const zoom = getBodyZoom();
      const top  = r.bottom / zoom + 2;
      const left = r.left   / zoom;
      const width = r.width / zoom;
      const spaceBelow = window.innerHeight / zoom - top - 4;
      setPos({ top, left, width, maxH: Math.min(280, Math.max(80, spaceBelow)) });
    }
    setOpen(true);
  }

  return (
    <div style={{ position: "relative" as const, width: "100%" }}>
      <button ref={btnRef} onClick={toggle} type="button"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${open ? "#1B6CA8" : "#E8ECF4"}`, background: open ? "#F8FBFF" : "#fff", fontSize: 13, fontFamily: "Inter", color: "#0C1B33", cursor: "pointer", minHeight: 40, boxSizing: "border-box" as const, outline: "none", boxShadow: open ? "0 0 0 3px rgba(27,108,168,0.08)" : "none", transition: "border-color 0.15s, box-shadow 0.15s" }}>
        <span style={{ textAlign: "left" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1 }}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginLeft: 8, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}><path d="M1 3l4 4 4-4" stroke={open ? "#1B6CA8" : "#9CA3AF"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && pos && createPortal(
        <div ref={popupRef} onMouseDown={e => e.stopPropagation()}
          style={{ position: "fixed" as const, top: pos.top, left: pos.left, width: pos.width, background: "#fff", borderRadius: 10, border: "1px solid #E8ECF4", boxShadow: "0 8px 28px rgba(12,27,51,0.14)", zIndex: 9999, maxHeight: pos.maxH, overflowY: "auto" as const, padding: "6px 0" }}>
          {options.map(o => {
            const sel = o === value;
            return (
              <div key={o} onMouseDown={() => { onChange?.(o); setOpen(false); setPos(null); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, fontFamily: "Inter", cursor: "pointer", color: sel ? "#1B6CA8" : "#0C1B33", fontWeight: sel ? 600 : 400, background: sel ? "#EFF6FF" : "#fff" }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#F8FAFC"; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "#fff"; }}>
                <span>{o}</span>
                {sel && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M2.5 7l3.5 3.5 5.5-6.5" stroke="#1B6CA8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding: "9px 20px", borderRadius: 6, border: "1.5px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500, minHeight: 40, boxSizing: "border-box" as const }}>
      {children}
    </button>
  );
}

function DrawerField({ label, required, children, gridSpan }: { label: string; required?: boolean; children: React.ReactNode; gridSpan?: number }) {
  return (
    <div style={gridSpan ? { gridColumn: `span ${gridSpan}` } : undefined}>
      <div style={{ fontSize: 12, color: "#4A5875", fontWeight: 500, marginBottom: 6, fontFamily: "Inter" }}>
        {label}{required && <span style={{ color: "#C62828", marginLeft: 3 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

function DrawerRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>{children}</div>;
}

function DrawerSectionHeader({ n, title, subtitle, icon }: { n: string; title: string; subtitle: string; icon: React.ReactNode }) {
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

function StepChip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 42, height: 42, background: "linear-gradient(135deg,#E8F5E9 0%,#F0FFF4 100%)", border: "1.5px solid #A5D6A7", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 4px rgba(46,125,50,0.10)" }}>
      {children}
    </div>
  );
}

function MedCheckbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: disabled ? "default" : "pointer", fontSize: 13, color: disabled ? "#9CA3AF" : "#4A5875", fontFamily: "Inter" }}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled}
        style={{ width: 16, height: 16, cursor: disabled ? "default" : "pointer", accentColor: "#1B6CA8" }} />
      {label}
    </label>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function PillIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z" />
      <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" />
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
function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
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

// ─── Stepper ───────────────────────────────────────────────────────────────────

function MedStepper({ current }: { current: number }) {
  return <MultiStepper steps={["Medicine", "Compliance", "Operations", "Review"]} current={current} />;
}

// ─── Manufacturer combobox ─────────────────────────────────────────────────────

interface ManufacturerEntry { name: string; code: string; type: string; address: string; city: string; }

function AddManufacturerModal({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: (name: string) => void }) {
  const [mfg, setMfg] = useState<ManufacturerEntry>({ name: initialName, code: "", type: "Pharmaceutical", address: "", city: "" });
  const upd = <K extends keyof ManufacturerEntry>(k: K, v: ManufacturerEntry[K]) => setMfg(prev => ({ ...prev, [k]: v }));
  const canSave = mfg.name.trim().length > 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 520, borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(10,22,44,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>New Manufacturer</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add manufacturer</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
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

function ManufacturerField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [knownList, setKnownList] = useState(KNOWN_MANUFACTURERS_SEED);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (!disabled) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [disabled]);

  if (disabled) return <TextInput value={value} onChange={() => {}} placeholder="e.g. GSK" disabled />;

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
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", borderTop: "none", zIndex: 20, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.10)" }}>
            {matches.map(m => (
              <button key={m} onClick={() => { onChange(m); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {m}
              </button>
            ))}
            {showAddButton && (
              <button onClick={() => { setOpen(false); setShowAddModal(true); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: noResults ? "transparent" : "#FAFBFD", cursor: "pointer", fontSize: 13, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8, borderTop: matches.length > 0 ? "1px solid #EEF1F6" : "none" }}>
                <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#1B6CA8", flexShrink: 0, lineHeight: 1 }}>+</span>
                <span style={{ color: "#1B6CA8", fontWeight: 600 }}>
                  {noResults
                    ? <>No results &mdash; add &ldquo;{value.trim()}&rdquo; as new manufacturer</>
                    : <>Add &ldquo;{value.trim()}&rdquo; as new manufacturer</>}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      {showAddModal && (
        <AddManufacturerModal initialName={value.trim()} onClose={() => setShowAddModal(false)}
          onSaved={name => { setKnownList(prev => [...prev, name]); onChange(name); }} />
      )}
    </>
  );
}

// ─── Composition combobox ──────────────────────────────────────────────────────

interface CompositionEntry { name: string; shortName: string; strength: string; sideEffects: string; description: string; }

function AddCompositionModal({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: (name: string) => void }) {
  const [comp, setComp] = useState<CompositionEntry>({ name: initialName, shortName: "", strength: "", sideEffects: "", description: "" });
  const upd = <K extends keyof CompositionEntry>(k: K, v: CompositionEntry[K]) => setComp(prev => ({ ...prev, [k]: v }));
  const canSave = comp.name.trim().length > 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 520, borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(10,22,44,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>New Composition</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add composition</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <DrawerField label="Composition name" required><TextInput value={comp.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. Paracetamol 500 mg" /></DrawerField>
            <DrawerField label="Short name"><TextInput value={comp.shortName} onChange={e => upd("shortName", e.target.value)} placeholder="e.g. PCM" /></DrawerField>
            <DrawerField label="Strength" required><TextInput value={comp.strength} onChange={e => upd("strength", e.target.value)} placeholder="e.g. 500 mg" /></DrawerField>
            <DrawerField label="Side effects"><TextInput value={comp.sideEffects} onChange={e => upd("sideEffects", e.target.value)} placeholder="e.g. Nausea, dizziness" /></DrawerField>
            <DrawerField label="Description" gridSpan={2}>
              <textarea value={comp.description} onChange={e => upd("description", e.target.value)} placeholder="Pharmacological description or usage notes" rows={3}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, resize: "vertical" }}
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

function CompositionField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [knownList, setKnownList] = useState(KNOWN_COMPOSITIONS_SEED);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (!disabled) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [disabled]);

  if (disabled) return <TextInput value={value} onChange={() => {}} placeholder="e.g. Paracetamol 500 mg" disabled />;

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
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", borderTop: "none", zIndex: 20, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(10,22,44,0.10)" }}>
            {matches.map(c => (
              <button key={c} onClick={() => { onChange(c); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#1A2436", fontFamily: "Inter", borderBottom: "1px solid #F4F6FA" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F6FF")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {c}
              </button>
            ))}
            {showAddButton && (
              <button onClick={() => { setOpen(false); setShowAddModal(true); }}
                style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: noResults ? "transparent" : "#FAFBFD", cursor: "pointer", fontSize: 13, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8, borderTop: matches.length > 0 ? "1px solid #EEF1F6" : "none" }}>
                <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#1B6CA8", flexShrink: 0, lineHeight: 1 }}>+</span>
                <span style={{ color: "#1B6CA8", fontWeight: 600 }}>
                  {noResults
                    ? <>No results &mdash; add &ldquo;{value.trim()}&rdquo; as new composition</>
                    : <>Add &ldquo;{value.trim()}&rdquo; as new composition</>}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      {showAddModal && (
        <AddCompositionModal initialName={value.trim()} onClose={() => setShowAddModal(false)}
          onSaved={name => { setKnownList(prev => [...prev, name]); onChange(name); }} />
      )}
    </>
  );
}

// ─── Stable form-layout helpers (must live outside CreateMedicinePage so React
//     never sees a new component type on re-render, which would remount children) ──

function FL({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>
      {children}{req && <span style={{ color: "#E53935", marginLeft: 3 }}>*</span>}
    </div>
  );
}

function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8ECF4", marginBottom: 24, overflow: "hidden", boxShadow: "0 1px 6px rgba(12,27,51,0.05)" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 14, background: "#FAFBFD" }}>
        {icon}
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: "24px 24px" }}>{children}</div>
    </div>
  );
}

// ─── Create Medicine Page ──────────────────────────────────────────────────────

function CreateMedicinePage({ onBack, mode = "create", drug, onSaved, onDraftSaved, onVerificationSent }: {
  onBack: () => void;
  mode?: "create" | "view" | "edit";
  drug?: (typeof drugs)[0];
  onSaved?: (ok: boolean) => void;
  onDraftSaved?: (ok: boolean) => void;
  onVerificationSent?: (ok: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isView = mode === "view" && !isEditing;
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  const [form, setForm] = useState<AddMedForm>(() => {
    if (drug) {
      return {
        ...emptyMedForm(),
        genericName: drug.name,
        therapeuticCategory: drug.category,
        location: drug.location,
        stockLocation: drug.location,
        openingStock: drug.stock.toString(),
        minimumStock: drug.minStock.toString(),
        sellingPrice: drug.price.toFixed(2),
        mrp: drug.price.toFixed(2),
        wholesalePrice: drug.cost.toFixed(2),
        effectiveFrom: drug.expiry,
        distributorRef: drug.supplier,
        productStatus: drug.status === "Out of Stock" ? "Inactive" : "Active",
        baseUnit: drug.unit,
      };
    }
    return emptyMedForm();
  });
  const [productImages, setProductImages] = useState<Array<{ file: File; url: string }>>([]);
  const [imgDragging, setImgDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addImages(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    setProductImages(prev => [...prev, ...valid.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  }
  function removeImage(idx: number) {
    setProductImages(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const upd = <K extends keyof AddMedForm>(key: K, value: AddMedForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const saveDisabled = !form.genericName.trim();

  const taStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4",
    fontSize: 13, outline: "none", fontFamily: "Inter", background: isView ? "#F8FAFC" : "#fff",
    boxSizing: "border-box", resize: isView ? "none" as const : "vertical" as const,
    color: isView ? "#9CA3AF" : "#0C1B33", lineHeight: 1.6,
  };


  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => isView ? onBack() : setShowLeaveDialog(true)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Inventory</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>{"›"}</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {mode === "view" ? "View Medicine" : mode === "edit" ? "Edit Medicine" : "Create New Medicine"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mode === "view" && !isEditing && (
            <button onClick={() => setIsEditing(true)}
              style={{ padding: "9px 22px", borderRadius: 6, border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
              Edit
            </button>
          )}
          <GhostBtn onClick={() => isView ? onBack() : setShowLeaveDialog(true)}>Cancel</GhostBtn>
          {!isView && (
            <button
              onClick={() => { onDraftSaved?.(true); onBack(); }}
              style={{ padding: "9px 22px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#F8FAFC", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 600, minHeight: 40, boxSizing: "border-box" as const }}>
              Save Draft
            </button>
          )}
          <button
            onClick={() => { if (!saveDisabled && !isView) { setShowVerifyDialog(true); } }}
            disabled={saveDisabled || isView}
            style={{ padding: "9px 22px", borderRadius: 6, border: "none", background: saveDisabled || isView ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: saveDisabled || isView ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, minHeight: 40, boxSizing: "border-box" as const }}>
            {mode === "create" ? "Save Medicine" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Leave confirmation dialog */}
      {showLeaveDialog && (
        <>
          <div onClick={() => setShowLeaveDialog(false)} style={{ position: "fixed", inset: 0, background: "rgba(100,116,139,0.65)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 201, background: "#fff", borderRadius: 16, padding: "28px 28px 24px", width: 340, boxShadow: "0 8px 32px rgba(10,22,44,0.18)", textAlign: "center" }}>
            <div style={{ fontFamily: "Inter", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 10 }}>Save before leaving?</div>
            <div style={{ fontSize: 13, color: "#6B7280", fontFamily: "Inter", lineHeight: 1.6, marginBottom: 24 }}>Save this medicine as a draft before going back?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowLeaveDialog(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
                Cancel
              </button>
              <button
                onClick={() => { setShowLeaveDialog(false); onDraftSaved?.(true); onBack(); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Save
              </button>
              <button
                onClick={() => { setShowLeaveDialog(false); onBack(); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#C62828", fontFamily: "Inter", fontWeight: 500 }}>
                Discard
              </button>
            </div>
          </div>
        </>
      )}

      {/* Global availability confirmation dialog */}
      {showVerifyDialog && (
        <>
          <div onClick={() => setShowVerifyDialog(false)} style={{ position: "fixed", inset: 0, background: "rgba(100,116,139,0.65)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 201, background: "#fff", borderRadius: 16, padding: "32px 28px 24px", width: 380, boxShadow: "0 8px 32px rgba(10,22,44,0.18)", textAlign: "center" as const }}>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 10 }}>
              Do you want to add this medicine as Globally available?
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", fontFamily: "Inter", lineHeight: 1.65, marginBottom: 24 }}>
              Selecting Yes will make this medicine visible across all pharmacy accounts.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setShowVerifyDialog(false); onSaved?.(true); onBack(); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F0F3F7")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                No
              </button>
              <button
                onClick={() => { setShowVerifyDialog(false); onVerificationSent?.(true); onBack(); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#155A8A")}
                onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>
                Yes
              </button>
            </div>
          </div>
        </>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 48px" }}>

        {/* 1 — Medicine Identity */}
        <SectionCard icon={<StepChip><PillIcon /></StepChip>} title="Medicine Identity" subtitle="Use the approved catalog name, strength, and pack information.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 20px" }}>
            <div>
              <FL req>Generic name</FL>
              <TextInput value={form.genericName} onChange={e => upd("genericName", e.target.value)} placeholder="e.g. Paracetamol" disabled={isView} />
            </div>
            <div>
              <FL req>Brand name</FL>
              <TextInput value={form.brandName} onChange={e => upd("brandName", e.target.value)} placeholder="e.g. Crocin 500" disabled={isView} />
            </div>
            <div>
              <FL req>Strength</FL>
              <TextInput value={form.strength} onChange={e => upd("strength", e.target.value)} placeholder="e.g. 500 mg" disabled={isView} />
            </div>
            <div>
              <FL req>Dosage form</FL>
              <DropdownSelect value={form.dosageForm} onChange={v => upd("dosageForm", v)} options={DOSAGE_FORMS} disabled={isView} />
            </div>
            <div>
              <FL req>Route</FL>
              <DropdownSelect value={form.route} onChange={v => upd("route", v)} options={ROUTES} disabled={isView} />
            </div>
            <div>
              <FL req>Pack / Unit</FL>
              <TextInput value={form.packUnit} onChange={e => upd("packUnit", e.target.value)} placeholder="e.g. 10 tablets / strip" disabled={isView} />
            </div>
            <div>
              <FL req>Manufacturer</FL>
              <ManufacturerField value={form.manufacturer} onChange={v => upd("manufacturer", v)} disabled={isView} />
            </div>
            <div>
              <FL req>Therapeutic category</FL>
              <TextInput value={form.therapeuticCategory} onChange={e => upd("therapeuticCategory", e.target.value)} placeholder="e.g. Analgesic & antipyretic" disabled={isView} />
            </div>
            <div>
              <FL req>Therapeutic class</FL>
              <TextInput value={form.therapeuticClass} onChange={e => upd("therapeuticClass", e.target.value)} placeholder="e.g. Analgesic" disabled={isView} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FL req>Salt composition</FL>
              <CompositionField value={form.saltComposition} onChange={v => upd("saltComposition", v)} disabled={isView} />
            </div>
          </div>
        </SectionCard>

        {/* 2 — Compliance & Storage */}
        <SectionCard icon={<StepChip><ShieldSolidIcon /></StepChip>} title="Compliance & Storage" subtitle="These controls support pharmacy dispensing and inventory safety.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 20px" }}>
            <div>
              <FL req>HSN code</FL>
              <TextInput value={form.hsnCode} onChange={e => upd("hsnCode", e.target.value)} placeholder="e.g. 3482345" disabled={isView} />
            </div>
            <div>
              <FL>Barcode / GTIN</FL>
              <TextInput value={form.barcode} onChange={e => upd("barcode", e.target.value)} placeholder="Scan or enter barcode" disabled={isView} />
            </div>
            <div>
              <FL>Prescription status</FL>
              <DropdownSelect value={form.prescriptionStatus} onChange={v => upd("prescriptionStatus", v)} options={PRESCRIPTION_STATUSES} disabled={isView} />
            </div>
            <div>
              <FL req>GST / Tax rate</FL>
              <div style={{ display: "flex" }}>
                <input value={form.gstRate} onChange={e => upd("gstRate", e.target.value)} placeholder="12" disabled={isView}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: "6px 0 0 6px", border: "1.5px solid #E8ECF4", borderRight: "none", fontSize: 13, outline: "none", fontFamily: "Inter", background: isView ? "#F8FAFC" : "#fff", color: isView ? "#9CA3AF" : "#0C1B33", minHeight: 40, boxSizing: "border-box" as const }}
                  onFocus={isView ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
                  onBlur={isView ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
                <span style={{ padding: "10px 12px", borderRadius: "0 6px 6px 0", border: "1.5px solid #E8ECF4", borderLeft: "none", fontSize: 13, color: "#6B7280", background: "#F8FAFC", whiteSpace: "nowrap" as const, flexShrink: 0, minHeight: 40, boxSizing: "border-box" as const, display: "flex", alignItems: "center" }}>%</span>
              </div>
            </div>
            <div>
              <FL req>Storage condition</FL>
              <TextInput value={form.storageCondition} onChange={e => upd("storageCondition", e.target.value)} placeholder="Store below 25°C" disabled={isView} />
            </div>
            <div>
              <FL req>Temperature range</FL>
              <TextInput value={form.tempRange} onChange={e => upd("tempRange", e.target.value)} placeholder="15-25°C" disabled={isView} />
            </div>
            <div>
              <FL req>Storage zone</FL>
              <TextInput value={form.storageZone} onChange={e => upd("storageZone", e.target.value)} placeholder="Main store" disabled={isView} />
            </div>
            <div>
              <FL>Manufacturer product code</FL>
              <TextInput value={form.mfgProductCode} onChange={e => upd("mfgProductCode", e.target.value)} placeholder="Distributor/manufacturer code" disabled={isView} />
            </div>
            <div>
              <FL>Distributor reference</FL>
              <TextInput value={form.distributorRef} onChange={e => upd("distributorRef", e.target.value)} placeholder="Preferred distributor" disabled={isView} />
            </div>
            <div>
              <FL>Prescription Required</FL>
              <div style={{ display: "flex", alignItems: "center", minHeight: 40 }}>
                <div onClick={() => !isView && upd("prescriptionRequired", !form.prescriptionRequired)}
                  style={{ position: "relative" as const, width: 44, height: 24, cursor: isView ? "default" : "pointer", flexShrink: 0 }}>
                  <div style={{ position: "absolute" as const, inset: 0, borderRadius: 12, background: form.prescriptionRequired ? "#1B6CA8" : "#DDE3EC", transition: "background 0.2s" }} />
                  <div style={{ position: "absolute" as const, top: 3, left: form.prescriptionRequired ? 23 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 0.2s" }} />
                </div>
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FL>Regulatory notes</FL>
              <textarea value={form.regulatoryNotes} onChange={e => upd("regulatoryNotes", e.target.value)} placeholder="License, schedule, or dispensing restrictions" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
                onBlur={isView ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 16px", paddingTop: 4 }}>
              <MedCheckbox checked={form.controlledDrug} onChange={v => upd("controlledDrug", v)} label="Controlled drug" disabled={isView} />
              <MedCheckbox checked={form.narcotic} onChange={v => upd("narcotic", v)} label="Narcotic / psychotropic" disabled={isView} />
              <MedCheckbox checked={form.coldChain} onChange={v => upd("coldChain", v)} label="Cold-chain item" disabled={isView} />
              <MedCheckbox checked={form.specialHandling} onChange={v => upd("specialHandling", v)} label="Special handling" disabled={isView} />
            </div>
          </div>
        </SectionCard>

        {/* 3 — Pricing & Stock */}
        <SectionCard icon={<StepChip><BoxIcon /></StepChip>} title="Pricing & Stock" subtitle="Pricing, stock levels, and unit configuration for this medicine.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 20px" }}>
            <div>
              <FL req>MRP</FL>
              <TextInput value={form.mrp} onChange={e => upd("mrp", e.target.value)} placeholder="e.g. 45.00" disabled={isView} />
            </div>
            <div>
              <FL req>Selling price</FL>
              <TextInput value={form.sellingPrice} onChange={e => upd("sellingPrice", e.target.value)} placeholder="e.g. 40.00" disabled={isView} />
            </div>
            <div>
              <FL>Wholesale price</FL>
              <TextInput value={form.wholesalePrice} onChange={e => upd("wholesalePrice", e.target.value)} placeholder="0.00" disabled={isView} />
            </div>
            <div>
              <FL>Margin %</FL>
              <TextInput value={form.margin} onChange={e => upd("margin", e.target.value)} placeholder="e.g. 12" disabled={isView} />
            </div>
            <div>
              <FL>Discount limit %</FL>
              <TextInput value={form.discountLimit} onChange={e => upd("discountLimit", e.target.value)} placeholder="Maximum discount %" disabled={isView} />
            </div>
            <div>
              <FL req>Opening stock</FL>
              <TextInput value={form.openingStock} onChange={e => upd("openingStock", e.target.value)} placeholder="e.g. 04" disabled={isView} />
            </div>
            <div>
              <FL req>Minimum stock</FL>
              <TextInput value={form.minimumStock} onChange={e => upd("minimumStock", e.target.value)} placeholder="e.g. 5" disabled={isView} />
            </div>
            <div>
              <FL req>Maximum stock</FL>
              <TextInput value={form.maximumStock} onChange={e => upd("maximumStock", e.target.value)} placeholder="100" disabled={isView} />
            </div>
            <div>
              <FL req>Reorder threshold</FL>
              <TextInput value={form.reorderThreshold} onChange={e => upd("reorderThreshold", e.target.value)} placeholder="e.g. 10" disabled={isView} />
            </div>
            <div>
              <FL req>Reorder quantity</FL>
              <TextInput value={form.reorderQty} onChange={e => upd("reorderQty", e.target.value)} placeholder="50" disabled={isView} />
            </div>
            <div>
              <FL req>Lead time (days)</FL>
              <TextInput value={form.leadTime} onChange={e => upd("leadTime", e.target.value)} placeholder="1" disabled={isView} />
            </div>
            <div>
              <FL req>Stock location</FL>
              <TextInput value={form.stockLocation} onChange={e => upd("stockLocation", e.target.value)} placeholder="Main store" disabled={isView} />
            </div>
            <div>
              <FL req>Location / Bin</FL>
              <TextInput value={form.location} onChange={e => upd("location", e.target.value)} placeholder="e.g. Rack A / Shelf 2 / Bin 04" disabled={isView} />
            </div>
            <div>
              <FL>Base unit</FL>
              <TextInput value={form.baseUnit} onChange={e => upd("baseUnit", e.target.value)} placeholder="Unit" disabled={isView} />
            </div>
            <div>
              <FL>Purchase unit</FL>
              <TextInput value={form.purchaseUnit} onChange={e => upd("purchaseUnit", e.target.value)} placeholder="Box" disabled={isView} />
            </div>
            <div>
              <FL>Sale unit</FL>
              <TextInput value={form.saleUnit} onChange={e => upd("saleUnit", e.target.value)} placeholder="Strip" disabled={isView} />
            </div>
            <div>
              <FL>Unit conversion</FL>
              <TextInput value={form.unitConversion} onChange={e => upd("unitConversion", e.target.value)} placeholder="1 box = 10 strips" disabled={isView} />
            </div>
            {/* Loose Sell toggle — visible only for applicable dosage forms */}
            {LOOSE_SELL_FORMS.has(form.dosageForm) && (
              <div>
                <FL>Loose Sell Allowed</FL>
                <div style={{ display: "flex", alignItems: "center", minHeight: 40 }}>
                  <div onClick={() => !isView && upd("looseSell", !form.looseSell)}
                    style={{ position: "relative" as const, width: 44, height: 24, cursor: isView ? "default" : "pointer", flexShrink: 0 }}>
                    <div style={{ position: "absolute" as const, inset: 0, borderRadius: 12, background: form.looseSell ? "#1B6CA8" : "#DDE3EC", transition: "background 0.2s" }} />
                    <div style={{ position: "absolute" as const, top: 3, left: form.looseSell ? 23 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 0.2s" }} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px", paddingTop: 4 }}>
              <MedCheckbox checked={form.batchTracking} onChange={v => upd("batchTracking", v)} label="Batch/lot tracking" disabled={isView} />
              <MedCheckbox checked={form.expiryTracking} onChange={v => upd("expiryTracking", v)} label="Expiry tracking" disabled={isView} />
              <MedCheckbox checked={form.fefoDispensing} onChange={v => upd("fefoDispensing", v)} label="FEFO dispensing" disabled={isView} />
            </div>
          </div>
        </SectionCard>

        {/* 4 — Clinical Notes */}
        <SectionCard icon={<StepChip><CheckCircleIcon /></StepChip>} title="Clinical Notes" subtitle="Patient-facing and catalog review information for this medicine.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
            <div>
              <FL>Therapeutic indications</FL>
              <textarea value={form.therapeuticIndications} onChange={e => upd("therapeuticIndications", e.target.value)} placeholder="Approved indications" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
                onBlur={isView ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div>
              <FL>Contraindications</FL>
              <textarea value={form.contraindications} onChange={e => upd("contraindications", e.target.value)} placeholder="Important contraindications" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
                onBlur={isView ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div>
              <FL>Dosage instructions</FL>
              <textarea value={form.dosageInstructions} onChange={e => upd("dosageInstructions", e.target.value)} placeholder="Patient-facing directions" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
                onBlur={isView ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div>
              <FL>Side effects</FL>
              <textarea value={form.sideEffects} onChange={e => upd("sideEffects", e.target.value)} placeholder="Known common side effects" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
                onBlur={isView ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div>
              <FL>Patient label text</FL>
              <textarea value={form.patientLabelText} onChange={e => upd("patientLabelText", e.target.value)} placeholder="Label instructions shown to patient" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
                onBlur={isView ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div>
              <FL>Review notes</FL>
              <textarea value={form.reviewNotes} onChange={e => upd("reviewNotes", e.target.value)} placeholder="Catalog review notes" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => { e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)"; }}
                onBlur={isView ? undefined : e => { e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none"; }} />
            </div>
            <div>
              <FL>Product status</FL>
              <DropdownSelect value={form.productStatus} onChange={v => upd("productStatus", v)} options={PRODUCT_STATUSES} disabled={isView} />
            </div>
            <div>
              <FL>Effective from</FL>
              <TextInput type="date" value={form.effectiveFrom} onChange={e => upd("effectiveFrom", e.target.value)} disabled={isView} />
            </div>
          </div>
          <div style={{ marginTop: 20, padding: "12px 16px", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldSolidIcon />
            <span style={{ fontSize: 13, color: "#2E7D32", lineHeight: 1.5 }}>Saving creates a protected medicine master record and makes it immediately searchable from the purchase invoice.</span>
          </div>
        </SectionCard>

        {/* 5 — Product Images */}
        <SectionCard
          icon={<StepChip><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="3.5" width="15" height="11" rx="2" stroke="#2E7D32" strokeWidth="1.5"/><circle cx="9" cy="9" r="2.5" stroke="#2E7D32" strokeWidth="1.5"/><path d="M6 3.5l1-2h4l1 2" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round"/></svg></StepChip>}
          title="Product Images"
          subtitle="Upload front, back, and label photos. Multiple images are supported.">

          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => { addImages(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ display: "none" }} />

          {/* Drop zone — hidden in view mode when images exist */}
          {!isView && (
            <div
              onDragOver={e => { e.preventDefault(); setImgDragging(true); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setImgDragging(false); }}
              onDrop={e => { e.preventDefault(); setImgDragging(false); addImages(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${imgDragging ? "#1B6CA8" : "#DDE3EC"}`, borderRadius: 10, background: imgDragging ? "#EFF6FF" : "#FAFBFD", padding: "36px 24px", textAlign: "center" as const, cursor: "pointer", transition: "border-color 0.15s, background 0.15s", marginBottom: productImages.length > 0 ? 20 : 0 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: imgDragging ? "#DBEAFE" : "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="2" y="5" width="18" height="13" rx="2.5" stroke={imgDragging ? "#1B6CA8" : "#9CA3AF"} strokeWidth="1.6"/>
                    <circle cx="11" cy="11.5" r="3" stroke={imgDragging ? "#1B6CA8" : "#9CA3AF"} strokeWidth="1.6"/>
                    <path d="M7.5 5l1.2-2.5h4.6L14.5 5" stroke={imgDragging ? "#1B6CA8" : "#9CA3AF"} strokeWidth="1.6" strokeLinecap="round"/>
                    <circle cx="17" cy="7" r="1" fill={imgDragging ? "#1B6CA8" : "#C4C9D4"}/>
                  </svg>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: imgDragging ? "#1B6CA8" : "#1A2436", fontFamily: "Outfit", marginBottom: 4 }}>
                {imgDragging ? "Drop images here" : "Drag & drop product images"}
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>or click to browse from your computer</div>
              <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{ padding: "7px 18px", borderRadius: 6, border: "1.5px solid #1B6CA8", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                Browse Files
              </button>
              <div style={{ marginTop: 10, fontSize: 11, color: "#C4C9D4" }}>PNG, JPG, WEBP · up to 5 MB each</div>
            </div>
          )}

          {/* Thumbnails */}
          {productImages.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {productImages.map((img, idx) => (
                <div key={idx} style={{ border: "1px solid #E8ECF4", borderRadius: 8, overflow: "hidden", background: "#fff", boxShadow: "0 1px 4px rgba(12,27,51,0.06)" }}>
                  <div style={{ position: "relative" as const, height: 96, background: "#F8FAFC", overflow: "hidden" }}>
                    <img src={img.url} alt={img.file.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" as const, display: "block" }} />
                    {!isView && (
                      <button type="button" onClick={() => removeImage(idx)}
                        style={{ position: "absolute" as const, top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      </button>
                    )}
                  </div>
                  <div style={{ padding: "6px 8px" }}>
                    <div style={{ fontSize: 10, fontFamily: "Inter", color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{img.file.name}</div>
                    <div style={{ fontSize: 10, color: "#C4C9D4", marginTop: 1 }}>{(img.file.size / 1024).toFixed(0)} KB</div>
                  </div>
                </div>
              ))}
              {/* Add-more tile */}
              {!isView && (
                <div onClick={() => fileInputRef.current?.click()}
                  style={{ border: "2px dashed #DDE3EC", borderRadius: 8, height: 130, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 6, color: "#9CA3AF" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1B6CA8"; (e.currentTarget as HTMLDivElement).style.color = "#1B6CA8"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#DDE3EC"; (e.currentTarget as HTMLDivElement).style.color = "#9CA3AF"; }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 7v6M7 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: 11, fontFamily: "Inter" }}>Add more</span>
                </div>
              )}
            </div>
          )}

          {/* View-mode empty state */}
          {isView && productImages.length === 0 && (
            <div style={{ padding: "32px 24px", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13, border: "2px dashed #EEF1F6", borderRadius: 10, background: "#FAFBFD" }}>
              No product images uploaded
            </div>
          )}
        </SectionCard>

      </div>

      {/* Saved — blur popup */}
    </div>
  );
}

// ─── Add to Short Book drawer ─────────────────────────────────────────────────

const SHORT_BOOK_STORE: Set<string> = new Set();

function AddToShortBookDrawer({ drug, onClose }: { drug: (typeof drugs)[0]; onClose: () => void }) {
  const alreadyIn = SHORT_BOOK_STORE.has(drug.name);
  const suggested = Math.max(0, drug.minStock * 3 - drug.stock);
  const [orderQty, setOrderQty] = useState(String(suggested || drug.minStock));
  const [reason, setReason] = useState("Low Stock");
  const [supplier, setSupplier] = useState(drug.supplier);
  const [saved, setSaved] = useState(false);

  const handleAdd = () => {
    SHORT_BOOK_STORE.add(drug.name);
    setSaved(true);
  };

  const Backdrop = () => (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 200 }} />
  );
  const Modal = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 480, maxHeight: "90vh", display: "flex", flexDirection: "column", zIndex: 201, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(10,22,44,0.22)", overflow: "hidden" }}>
      {children}
    </div>
  );

  if (saved) {
    return (
      <>
        <Backdrop />
        <Modal>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#2E7D32" }}>&#10003;</div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", textAlign: "center" }}>{drug.name} added to Short Book</div>
            <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>
              Order quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{orderQty}</span>
            </div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "9px 0", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Close
            </button>
          </div>
        </Modal>
      </>
    );
  }

  if (alreadyIn) {
    return (
      <>
        <Backdrop />
        <Modal>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Already in Short Book</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
          </div>
          <div style={{ padding: "20px 22px" }}>
            <div style={{ padding: "14px 16px", borderRadius: 6, background: "#FFF8E1", border: "1px solid #FFE082", fontSize: 13, color: "#F57F17" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{drug.name} is already in your Short Book.</div>
              <div style={{ color: "#6B7280", fontSize: 12 }}>Current Order Quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{suggested}</span></div>
            </div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
            <button style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
              Update Quantity
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Go to Short Book
            </button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Backdrop />
      <Modal>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Reorder</div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add to Short Book</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Medicine info */}
          <div style={{ background: "#F8FAFC", borderRadius: 6, border: "1px solid #EEF1F6", padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33", marginBottom: 8 }}>{drug.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Current Stock", value: String(drug.stock), warn: drug.stock < drug.minStock },
                { label: "Reorder Level", value: String(drug.minStock), warn: false },
                { label: "Suggested Order", value: String(suggested), warn: false },
                { label: "Distributor", value: drug.supplier, warn: false },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: r.warn ? "#C62828" : "#1A2436" }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Order Quantity <span style={{ color: "#C62828" }}>*</span></div>
            <input type="number" value={orderQty} min={1} onChange={e => setOrderQty(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Reason</div>
            <select value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
              {["Low Stock", "Out of Stock", "Today's Sales", "Manual", "Customer Demand"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Preferred Distributor</div>
            <select value={supplier} onChange={e => setSupplier(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
              {["ABC Pharma", "XYZ Pharma", "Medico", drug.supplier].filter((v, i, a) => a.indexOf(v) === i).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={handleAdd} disabled={!orderQty || Number(orderQty) < 1}
            style={{ flex: 2, padding: "9px 0", border: "none", borderRadius: 6, background: !orderQty || Number(orderQty) < 1 ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: !orderQty || Number(orderQty) < 1 ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Add to Short Book
          </button>
        </div>
      </Modal>
    </>
  );
}

// ─── Expiry risk styles ───────────────────────────────────────────────────────

const EXPIRY_RISK_STYLE: Record<string, { bg: string; color: string }> = {
  "High":    { bg: "#FFEBEE", color: "#C62828" },
  "Medium":  { bg: "#FFF3E0", color: "#E65100" },
  "Low":     { bg: "#E8F5E9", color: "#2E7D32" },
  "Expired": { bg: "#F3F4F6", color: "#9CA3AF" },
};

function getExpiryInfo(expiryDate: string): { daysLeft: number; risk: string } {
  const ref = new Date("2025-07-28");
  const expiry = new Date(expiryDate);
  const daysLeft = Math.floor((expiry.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { daysLeft, risk: "Expired" };
  if (daysLeft <= 60) return { daysLeft, risk: "High" };
  if (daysLeft <= 180) return { daysLeft, risk: "Medium" };
  return { daysLeft, risk: "Low" };
}

function getBodyZoom(): number {
  try {
    const z = parseFloat(window.getComputedStyle(document.body).zoom);
    return isNaN(z) ? 1 : z;
  } catch { return 1; }
}

// Returns the bounding rect of the nearest ancestor with a CSS transform,
// which becomes the containing block for position:fixed children inside it.
function getTransformAncestorRect(el: Element): { top: number; left: number } | null {
  let node: Element | null = el.parentElement;
  while (node && node !== document.documentElement) {
    try {
      if (window.getComputedStyle(node).transform !== "none") {
        const r = node.getBoundingClientRect();
        return { top: r.top, left: r.left };
      }
    } catch { /* skip */ }
    node = node.parentElement;
  }
  return null;
}

function InvFilterDropdown({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: string[]; label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const isDefault = value === label;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPos(null);
      }
    }
    function handleScroll(e: Event) {
      if (popupRef.current && popupRef.current.contains(e.target as Node)) return;
      setOpen(false); setPos(null);
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  function toggle() {
    if (open) { setOpen(false); setPos(null); return; }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const zoom = getBodyZoom();
      const top = r.bottom / zoom + 2;
      const left = r.left / zoom;
      const width = Math.max(r.width / zoom, 130);
      const spaceBelow = window.innerHeight / zoom - top - 4;
      setPos({ top, left, width, maxH: Math.min(248, Math.max(80, spaceBelow)) });
    }
    setOpen(true);
  }

  return (
    <div style={{ position: "relative" as const }}>
      <button ref={btnRef} onClick={toggle}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px", borderRadius: 6, border: "1px solid #DDE3EC", background: open ? "#F8FAFC" : "#fff", fontSize: 12, cursor: "pointer", color: isDefault ? "#6B7280" : "#0C1B33", fontFamily: "Inter", fontWeight: isDefault ? 400 : 600, minWidth: 130, minHeight: 40, boxSizing: "border-box" as const, outline: "none" }}>
        <span style={{ flex: 1, textAlign: "left" as const }}>{isDefault ? label : value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M1 3l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && pos && (
        <div ref={popupRef} onMouseDown={e => e.stopPropagation()}
          style={{ position: "fixed" as const, top: pos.top, left: pos.left, width: pos.width, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 4px 16px rgba(12,27,51,0.10)", zIndex: 9999, maxHeight: pos.maxH, overflowY: "auto" as const }}>
          {[label, ...options].map(o => {
            const isSelected = o === value || (o === label && isDefault);
            return (
              <div key={o} onMouseDown={() => { onChange(o); setOpen(false); setPos(null); }}
                style={{ padding: "9px 14px", fontSize: 13, fontFamily: "Inter", cursor: "pointer", color: isSelected ? "#1B6CA8" : "#0C1B33", fontWeight: isSelected ? 600 : 400, background: isSelected ? "#EFF6FF" : "#fff", borderLeft: isSelected ? "3px solid #1B6CA8" : "3px solid transparent" }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "#F0F3F7"; } }}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "#fff"; } }}>
                {o}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


const QUICK_ACTIONS = [
  { label: "Stock Count",       icon: "≡", color: "#1B6CA8", bg: "#EFF6FF" },
  { label: "Expiry Management", icon: "◷", color: "#C62828", bg: "#FFEBEE" },
  { label: "Short Book",        icon: "↑", color: "#2E7D32", bg: "#E8F5E9" },
  { label: "Stock Movement",    icon: "⇄", color: "#6B21A8", bg: "#F5F3FF" },
  { label: "Batches",           icon: "⊞", color: "#0C6E6E", bg: "#ECFDF5" },
  { label: "Reorder Review",    icon: "▼", color: "#E65100", bg: "#FFF3E0" },
];

const DRUG_BATCH_MAP: Record<string, string> = {
  "Amlodipine 5mg":     "AM123", "Amoxicillin 500mg":   "AX221",
  "Atorvastatin 20mg":  "AT991", "Ciprofloxacin 500mg": "CP551",
  "Insulin Glargine":   "IN102", "Metformin 1000mg":    "MF443",
  "Lisinopril 10mg":    "LS201", "Omeprazole 20mg":     "OM334",
  "Salbutamol Inhaler": "SB119", "Paracetamol 500mg":   "PC882",
  "Warfarin 5mg":       "WF550", "Sertraline 50mg":     "SE771",
};

const DRUG_MANUFACTURER: Record<string, string> = {
  "Amoxicillin 500mg":   "GlaxoSmithKline",
  "Metformin 1000mg":    "Sun Pharma",
  "Lisinopril 10mg":     "Cipla Ltd",
  "Atorvastatin 20mg":   "Pfizer Ltd",
  "Omeprazole 20mg":     "AstraZeneca",
  "Salbutamol Inhaler":  "Cipla Ltd",
  "Paracetamol 500mg":   "GSK Pharma",
  "Ciprofloxacin 500mg": "Bayer Pharma",
  "Amlodipine 5mg":      "Pfizer Ltd",
  "Insulin Glargine":    "Sanofi India",
  "Warfarin 5mg":        "Abbott India",
  "Sertraline 50mg":     "Pfizer Ltd",
};

const DRUG_DOSAGE_FORM: Record<string, string> = {
  "Amoxicillin 500mg":   "Capsule",
  "Metformin 1000mg":    "Tablet",
  "Lisinopril 10mg":     "Tablet",
  "Atorvastatin 20mg":   "Tablet",
  "Omeprazole 20mg":     "Capsule",
  "Salbutamol Inhaler":  "Inhaler (MDI)",
  "Paracetamol 500mg":   "Tablet",
  "Ciprofloxacin 500mg": "Tablet",
  "Amlodipine 5mg":      "Tablet",
  "Insulin Glargine":    "Injection",
  "Warfarin 5mg":        "Tablet",
  "Sertraline 50mg":     "Tablet",
};

const DRUG_PACK: Record<string, string> = {
  "Amoxicillin 500mg":   "10 Caps / Strip",
  "Metformin 1000mg":    "10 Tabs / Strip",
  "Lisinopril 10mg":     "10 Tabs / Strip",
  "Atorvastatin 20mg":   "10 Tabs / Strip",
  "Omeprazole 20mg":     "10 Caps / Strip",
  "Salbutamol Inhaler":  "200 MDI / Inhaler",
  "Paracetamol 500mg":   "10 Tabs / Strip",
  "Ciprofloxacin 500mg": "10 Tabs / Strip",
  "Amlodipine 5mg":      "10 Tabs / Strip",
  "Insulin Glargine":    "3 mL / Vial",
  "Warfarin 5mg":        "30 Tabs / Bottle",
  "Sertraline 50mg":     "10 Tabs / Strip",
};

const DRUG_HSN: Record<string, string> = {
  "Amoxicillin 500mg":   "30049012",
  "Metformin 1000mg":    "30049049",
  "Lisinopril 10mg":     "30049012",
  "Atorvastatin 20mg":   "30049090",
  "Omeprazole 20mg":     "30049090",
  "Salbutamol Inhaler":  "30039019",
  "Paracetamol 500mg":   "30049031",
  "Ciprofloxacin 500mg": "30049012",
  "Amlodipine 5mg":      "30049090",
  "Insulin Glargine":    "30013910",
  "Warfarin 5mg":        "30049090",
  "Sertraline 50mg":     "30049090",
};

const DRUG_PRESCRIPTION: Record<string, "OTC" | "Schedule H" | "Schedule H1" | "Schedule X"> = {
  "Amoxicillin 500mg":   "Schedule H",
  "Metformin 1000mg":    "Schedule H",
  "Lisinopril 10mg":     "Schedule H",
  "Atorvastatin 20mg":   "Schedule H",
  "Omeprazole 20mg":     "OTC",
  "Salbutamol Inhaler":  "Schedule H",
  "Paracetamol 500mg":   "OTC",
  "Ciprofloxacin 500mg": "Schedule H",
  "Amlodipine 5mg":      "Schedule H",
  "Insulin Glargine":    "Schedule H",
  "Warfarin 5mg":        "Schedule H1",
  "Sertraline 50mg":     "Schedule H",
};

const DRUG_STORAGE: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  "Amoxicillin 500mg":   { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" },
  "Metformin 1000mg":    { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" },
  "Lisinopril 10mg":     { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" },
  "Atorvastatin 20mg":   { label: "< 25°C",  icon: "", color: "#E65100", bg: "#FFF3E0" },
  "Omeprazole 20mg":     { label: "< 25°C",  icon: "", color: "#E65100", bg: "#FFF3E0" },
  "Salbutamol Inhaler":  { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" },
  "Paracetamol 500mg":   { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" },
  "Ciprofloxacin 500mg": { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" },
  "Amlodipine 5mg":      { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" },
  "Insulin Glargine":    { label: "2–8°C",   icon: "", color: "#1B6CA8", bg: "#EFF6FF" },
  "Warfarin 5mg":        { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" },
  "Sertraline 50mg":     { label: "< 25°C",  icon: "", color: "#E65100", bg: "#FFF3E0" },
};

const DRUG_INDICATIONS: Record<string, string> = {
  "Amoxicillin 500mg":   "Bacterial infections (respiratory, urinary tract, skin)",
  "Metformin 1000mg":    "Type 2 diabetes — blood glucose control",
  "Lisinopril 10mg":     "Hypertension and heart failure management",
  "Atorvastatin 20mg":   "High cholesterol and cardiovascular risk reduction",
  "Omeprazole 20mg":     "Acid reflux, peptic ulcers, GERD treatment",
  "Salbutamol Inhaler":  "Acute bronchospasm relief in asthma and COPD",
  "Paracetamol 500mg":   "Mild to moderate pain relief and fever reduction",
  "Ciprofloxacin 500mg": "Bacterial infections (urinary, respiratory, GI tract)",
  "Amlodipine 5mg":      "Hypertension and stable angina pectoris",
  "Insulin Glargine":    "Long-acting basal insulin for Type 1 & Type 2 diabetes",
  "Warfarin 5mg":        "Prevention of blood clots, DVT, pulmonary embolism, AF",
  "Sertraline 50mg":     "Depression, anxiety disorders, OCD, PTSD",
};

const DRUG_SIDE_EFFECTS: Record<string, string[]> = {
  "Amoxicillin 500mg":   ["Nausea", "Diarrhoea", "Skin rash", "Allergic reaction"],
  "Metformin 1000mg":    ["Nausea", "Diarrhoea", "Metallic taste", "Lactic acidosis (rare)"],
  "Lisinopril 10mg":     ["Dry cough", "Dizziness", "Hypotension", "Hyperkalaemia"],
  "Atorvastatin 20mg":   ["Muscle pain", "Liver enzyme rise", "Headache", "Nausea"],
  "Omeprazole 20mg":     ["Headache", "Nausea", "Diarrhoea", "Abdominal pain"],
  "Salbutamol Inhaler":  ["Tremor", "Palpitations", "Headache", "Muscle cramps"],
  "Paracetamol 500mg":   ["Liver toxicity (overdose)", "Nausea", "Allergic reaction"],
  "Ciprofloxacin 500mg": ["Nausea", "Diarrhoea", "Tendon rupture (rare)", "Photosensitivity"],
  "Amlodipine 5mg":      ["Peripheral oedema", "Flushing", "Headache", "Fatigue"],
  "Insulin Glargine":    ["Hypoglycaemia", "Injection site reaction", "Weight gain"],
  "Warfarin 5mg":        ["Bleeding risk", "Bruising", "Nausea", "Hair loss (rare)"],
  "Sertraline 50mg":     ["Nausea", "Insomnia", "Diarrhoea", "Decreased libido", "Dry mouth"],
};

const DRUG_DOSAGE_INSTRUCTIONS: Record<string, string> = {
  "Amoxicillin 500mg":   "Take 1 capsule every 8 hours with or without food. Complete the full prescribed course.",
  "Metformin 1000mg":    "Take with meals to reduce stomach upset. Swallow whole — do not crush or chew.",
  "Lisinopril 10mg":     "Take once daily at the same time each day. Can be taken with or without food.",
  "Atorvastatin 20mg":   "Take 1 tablet once daily, preferably in the evening. Can be taken with or without food.",
  "Omeprazole 20mg":     "Take 30 minutes before a meal. Swallow capsule whole — do not chew.",
  "Salbutamol Inhaler":  "Shake well before use. Inhale 1–2 puffs as needed for relief. Max 4 puffs/day.",
  "Paracetamol 500mg":   "Take 1–2 tablets every 4–6 hours as needed. Do not exceed 8 tablets in 24 hours.",
  "Ciprofloxacin 500mg": "Take 1 tablet twice daily with plenty of water. Avoid dairy products 2 hours before or after.",
  "Amlodipine 5mg":      "Take once daily at the same time each day. Can be taken with or without food.",
  "Insulin Glargine":    "Inject subcutaneously once daily at the same time each day. Do not shake the vial.",
  "Warfarin 5mg":        "Take at the same time each day. Dose adjusted by INR monitoring. Avoid vitamin K-rich foods.",
  "Sertraline 50mg":     "Take once daily in the morning or evening with food. Allow 2–4 weeks for full effect.",
};

const DRUG_LOCATIONS: Record<string, { store: string; slots: { name: string; qty: number }[] }> = {
  "Amoxicillin 500mg":   { store: "Main Store", slots: [{ name: "Drawer A-02", qty: 140 }, { name: "Drawer A-03", qty: 60 }, { name: "Shelf B-01", qty: 40 }] },
  "Metformin 1000mg":    { store: "Main Store", slots: [{ name: "Drawer B-05", qty: 18 }] },
  "Lisinopril 10mg":     { store: "Main Store", slots: [] },
  "Atorvastatin 20mg":   { store: "Main Store", slots: [{ name: "Drawer C-04", qty: 180 }, { name: "Shelf C-01", qty: 132 }] },
  "Omeprazole 20mg":     { store: "Main Store", slots: [{ name: "Drawer A-08", qty: 90 }, { name: "Shelf A-02", qty: 55 }] },
  "Salbutamol Inhaler":  { store: "Main Store", slots: [{ name: "Cabinet D-01", qty: 28 }] },
  "Paracetamol 500mg":   { store: "Main Store", slots: [{ name: "Drawer A-01", qty: 600 }, { name: "Drawer A-02", qty: 400 }, { name: "Shelf A-03", qty: 200 }] },
  "Ciprofloxacin 500mg": { store: "Main Store", slots: [{ name: "Drawer A-06", qty: 12 }] },
  "Amlodipine 5mg":      { store: "Main Store", slots: [{ name: "Drawer B-03", qty: 84 }, { name: "Drawer B-04", qty: 22 }, { name: "Drawer C-01", qty: 12 }] },
  "Insulin Glargine":    { store: "Cold Store",  slots: [{ name: "Fridge COLD-01", qty: 45 }] },
  "Warfarin 5mg":        { store: "Main Store", slots: [{ name: "Drawer B-02", qty: 6 }] },
  "Sertraline 50mg":     { store: "Main Store", slots: [{ name: "Drawer C-07", qty: 220 }] },
};

// ─── Filters drawer ───────────────────────────────────────────────────────────

function PnlSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0C1B33", marginBottom: 10, fontFamily: "Inter" }}>{label}</div>
      {children}
    </div>
  );
}

function PnlSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "8px 28px 8px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", appearance: "none", WebkitAppearance: "none", cursor: "pointer", color: "#1A2436", boxSizing: "border-box" as const }}
        onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
        onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "#9CA3AF" }}>&#9660;</span>
    </div>
  );
}

interface FiltersDrawerProps {
  onClose: () => void;
  allCategories: string[]; allSuppliers: string[]; locationZones: string[];
  catFilter: string; setCatFilter: (v: string) => void;
  supplierFilter: string; setSupplierFilter: (v: string) => void;
  locationFilter: string; setLocationFilter: (v: string) => void;
  stockStatuses: string[]; setStockStatuses: (v: string[]) => void;
  expiryRange: string; setExpiryRange: (v: string) => void;
  expiryRisk: string; setExpiryRisk: (v: string) => void;
  minPrice: string; setMinPrice: (v: string) => void;
  maxPrice: string; setMaxPrice: (v: string) => void;
  sortBy: string; setSortBy: (v: string) => void;
}

function FiltersDrawer(props: FiltersDrawerProps) {
  const { onClose, allCategories, allSuppliers, locationZones } = props;
  const [draftCat, setDraftCat] = useState(props.catFilter);
  const [draftSupplier, setDraftSupplier] = useState(props.supplierFilter);
  const [draftLocation, setDraftLocation] = useState(props.locationFilter);
  const [draftStatuses, setDraftStatuses] = useState<string[]>(props.stockStatuses);
  const [draftExpiryRange, setDraftExpiryRange] = useState(props.expiryRange);
  const [draftExpiryRisk, setDraftExpiryRisk] = useState(props.expiryRisk);
  const [draftMinPrice, setDraftMinPrice] = useState(props.minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState(props.maxPrice);
  const [draftSortBy, setDraftSortBy] = useState(props.sortBy);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleApply = () => {
    props.setCatFilter(draftCat);
    props.setSupplierFilter(draftSupplier);
    props.setLocationFilter(draftLocation);
    props.setStockStatuses(draftStatuses);
    props.setExpiryRange(draftExpiryRange);
    props.setExpiryRisk(draftExpiryRisk);
    props.setMinPrice(draftMinPrice);
    props.setMaxPrice(draftMaxPrice);
    props.setSortBy(draftSortBy);
    onClose();
  };

  const handleReset = () => {
    setDraftCat("All Categories"); setDraftSupplier("All Distributors"); setDraftLocation("All Locations");
    setDraftStatuses(["In Stock", "Low Stock", "Out of Stock"]);
    setDraftExpiryRange("All"); setDraftExpiryRisk("All");
    setDraftMinPrice(""); setDraftMaxPrice("");
    setDraftSortBy("Name (A - Z)");
  };

  const toggleStatus = (s: string) =>
    setDraftStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.18)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 400, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(10,22,44,0.14)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Filters</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <PnlSection label="Categories">
            <PnlSelect value={draftCat} onChange={setDraftCat} options={["All Categories", ...allCategories]} />
          </PnlSection>
          <PnlSection label="Distributors">
            <PnlSelect value={draftSupplier} onChange={setDraftSupplier} options={["All Distributors", ...allSuppliers]} />
          </PnlSection>
          <PnlSection label="Locations">
            <PnlSelect value={draftLocation} onChange={setDraftLocation} options={["All Locations", ...locationZones]} />
          </PnlSection>
          <PnlSection label="Stock Status">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["In Stock", "Low Stock", "Out of Stock", "Near Expiry", "Expired", "Quarantine"].map(s => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={draftStatuses.includes(s)} onChange={() => toggleStatus(s)}
                    style={{ width: 16, height: 16, accentColor: "#1B6CA8", cursor: "pointer" }} />
                  <span style={{ fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>{s}</span>
                </label>
              ))}
            </div>
          </PnlSection>
          <PnlSection label="Expiry Range">
            <PnlSelect value={draftExpiryRange} onChange={setDraftExpiryRange}
              options={["All", "Expiring in 30 days", "Expiring in 60 days", "Expiring in 90 days", "Expired"]} />
          </PnlSection>
          <PnlSection label="Expiry Risk">
            <PnlSelect value={draftExpiryRisk} onChange={setDraftExpiryRisk} options={["All", "High", "Medium", "Low"]} />
          </PnlSection>
          <PnlSection label="Price Range (Unit Price)">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" placeholder="Min Price" value={draftMinPrice} onChange={e => setDraftMinPrice(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")} />
              <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>to</span>
              <input type="number" placeholder="Max Price" value={draftMaxPrice} onChange={e => setDraftMaxPrice(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")} />
            </div>
          </PnlSection>
          <PnlSection label="Sort By">
            <PnlSelect value={draftSortBy} onChange={setDraftSortBy}
              options={["Name (A - Z)", "Name (Z - A)", "Stock (High - Low)", "Stock (Low - High)", "Price (High - Low)", "Price (Low - High)"]} />
          </PnlSection>
        </div>
        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={handleReset}
            style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
            Reset
          </button>
          <button onClick={handleApply}
            style={{ flex: 2, padding: "9px 0", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Batch lookup (subset for inventory view drawer) ───────────────────────────

const INV_BATCHES: { id: string; drug: string; expiry: string; qtyCurrent: number; qtyReceived: number; receivedDate: string; purchasePrice: number; mrp: number; supplier: string; location: string; status: string }[] = [
  { id: "BT-2025-0118", drug: "Amoxicillin 500mg",   expiry: "2026-08-15", qtyCurrent: 240, qtyReceived: 300, receivedDate: "2025-08-10", purchasePrice: 42.00, mrp: 58.00, supplier: "MedLife Pharma",    location: "Rack A-3", status: "Active"        },
  { id: "BT-2025-0117", drug: "Metformin 1000mg",    expiry: "2025-12-31", qtyCurrent: 18,  qtyReceived: 100, receivedDate: "2025-06-01", purchasePrice: 28.50, mrp: 38.00, supplier: "Sun Pharma",         location: "Rack B-1", status: "Low"           },
  { id: "BT-2025-0116", drug: "Insulin Glargine",    expiry: "2025-10-15", qtyCurrent: 45,  qtyReceived: 60,  receivedDate: "2025-04-20", purchasePrice: 410.00,mrp: 520.00,supplier: "Novo Nordisk Ltd",   location: "Cold Store", status: "Expiring Soon" },
  { id: "BT-2026-0005", drug: "Insulin Glargine",    expiry: "2027-03-10", qtyCurrent: 80,  qtyReceived: 80,  receivedDate: "2026-03-01", purchasePrice: 415.00,mrp: 525.00,supplier: "Novo Nordisk Ltd",   location: "Cold Store", status: "Active"        },
  { id: "BT-2025-0115", drug: "Atorvastatin 20mg",   expiry: "2027-01-10", qtyCurrent: 312, qtyReceived: 400, receivedDate: "2025-09-15", purchasePrice: 18.00, mrp: 26.00, supplier: "Cipla Ltd",           location: "Rack C-2", status: "Active"        },
  { id: "BT-2025-0114", drug: "Warfarin 5mg",        expiry: "2026-04-01", qtyCurrent: 6,   qtyReceived: 50,  receivedDate: "2025-04-01", purchasePrice: 32.00, mrp: 44.00, supplier: "Abbott India",        location: "Rack D-4", status: "Low"           },
  { id: "BT-2025-0113", drug: "Ciprofloxacin 500mg", expiry: "2025-11-20", qtyCurrent: 12,  qtyReceived: 150, receivedDate: "2025-05-10", purchasePrice: 35.00, mrp: 48.00, supplier: "MedLife Pharma",    location: "Rack A-1", status: "Expiring Soon" },
  { id: "BT-2026-0011", drug: "Ciprofloxacin 500mg", expiry: "2027-06-30", qtyCurrent: 180, qtyReceived: 200, receivedDate: "2026-06-15", purchasePrice: 36.00, mrp: 49.00, supplier: "MedLife Pharma",    location: "Rack A-1", status: "Active"        },
  { id: "BT-2026-0008", drug: "Amlodipine 5mg",      expiry: "2027-09-01", qtyCurrent: 380, qtyReceived: 500, receivedDate: "2026-01-20", purchasePrice: 12.00, mrp: 18.50, supplier: "Lupin Ltd",           location: "Rack B-3", status: "Active"        },
  { id: "BT-2025-0099", drug: "Amlodipine 5mg",      expiry: "2026-03-15", qtyCurrent: 22,  qtyReceived: 200, receivedDate: "2025-03-10", purchasePrice: 11.50, mrp: 18.00, supplier: "Lupin Ltd",           location: "Rack B-3", status: "Expiring Soon" },
  { id: "BT-2026-0015", drug: "Paracetamol 500mg",   expiry: "2028-01-01", qtyCurrent: 850, qtyReceived: 1000,receivedDate: "2026-04-05", purchasePrice: 4.50,  mrp: 7.00,  supplier: "GSK Pharma",          location: "Rack E-1", status: "Active"        },
  { id: "BT-2025-0090", drug: "Paracetamol 500mg",   expiry: "2026-07-31", qtyCurrent: 95,  qtyReceived: 500, receivedDate: "2025-07-15", purchasePrice: 4.20,  mrp: 6.80,  supplier: "GSK Pharma",          location: "Rack E-1", status: "Active"        },
  { id: "BT-2026-0019", drug: "Omeprazole 20mg",     expiry: "2027-12-01", qtyCurrent: 220, qtyReceived: 300, receivedDate: "2026-05-10", purchasePrice: 9.00,  mrp: 14.00, supplier: "AstraZeneca",         location: "Rack C-4", status: "Active"        },
  { id: "BT-2026-0022", drug: "Sertraline 50mg",     expiry: "2028-03-01", qtyCurrent: 160, qtyReceived: 200, receivedDate: "2026-07-01", purchasePrice: 22.00, mrp: 32.00, supplier: "Pfizer India",        location: "Rack D-2", status: "Active"        },
  { id: "BT-2025-0110", drug: "Lisinopril 10mg",     expiry: "2026-11-30", qtyCurrent: 140, qtyReceived: 250, receivedDate: "2025-11-01", purchasePrice: 16.00, mrp: 24.00, supplier: "Zydus Cadila",        location: "Rack B-2", status: "Active"        },
  { id: "BT-2026-0031", drug: "Salbutamol Inhaler",  expiry: "2027-08-15", qtyCurrent: 72,  qtyReceived: 100, receivedDate: "2026-08-01", purchasePrice: 95.00, mrp: 130.00,supplier: "Cipla Ltd",           location: "Rack F-1", status: "Active"        },
];

// ─── Supplier lookup per drug ─────────────────────────────────────────────────

const DRUG_SUPPLIERS: Record<string, { name: string; status: "Preferred" | "Active" | "Inactive"; currentStock: number; lastOrderDate: string; lastRate: number; effCost: number; leadDays: number; totalOrders: number; rating: number; contact: string }[]> = {
  "Amoxicillin 500mg":    [{ name: "MedLife Pharma",  status: "Preferred", currentStock: 240, lastOrderDate: "2025-08-10", lastRate: 42.00, effCost: 40.50, leadDays: 1, totalOrders: 18, rating: 5, contact: "medlife@pharma.in"   },
                           { name: "Sun Pharma",       status: "Active",    currentStock: 0,   lastOrderDate: "2025-04-12", lastRate: 43.50, effCost: 42.00, leadDays: 2, totalOrders: 7,  rating: 4, contact: "sun@pharma.in"       }],
  "Metformin 1000mg":     [{ name: "Sun Pharma",       status: "Preferred", currentStock: 18,  lastOrderDate: "2025-06-01", lastRate: 28.50, effCost: 27.80, leadDays: 2, totalOrders: 14, rating: 4, contact: "sun@pharma.in"       },
                           { name: "Cipla Ltd",        status: "Active",    currentStock: 0,   lastOrderDate: "2025-01-20", lastRate: 29.00, effCost: 28.20, leadDays: 2, totalOrders: 5,  rating: 4, contact: "cipla@pharma.in"     }],
  "Lisinopril 10mg":      [{ name: "Zydus Cadila",    status: "Preferred", currentStock: 140, lastOrderDate: "2025-11-01", lastRate: 16.00, effCost: 15.40, leadDays: 2, totalOrders: 11, rating: 4, contact: "zydus@cadila.in"     },
                           { name: "Abbott India",     status: "Active",    currentStock: 0,   lastOrderDate: "2025-05-18", lastRate: 17.00, effCost: 16.50, leadDays: 3, totalOrders: 4,  rating: 3, contact: "abbott@india.in"     }],
  "Atorvastatin 20mg":    [{ name: "Cipla Ltd",        status: "Preferred", currentStock: 312, lastOrderDate: "2025-09-15", lastRate: 18.00, effCost: 17.50, leadDays: 2, totalOrders: 16, rating: 5, contact: "cipla@pharma.in"     },
                           { name: "MedLife Pharma",   status: "Active",    currentStock: 0,   lastOrderDate: "2025-03-08", lastRate: 18.80, effCost: 18.20, leadDays: 1, totalOrders: 6,  rating: 4, contact: "medlife@pharma.in"   }],
  "Omeprazole 20mg":      [{ name: "AstraZeneca",      status: "Preferred", currentStock: 220, lastOrderDate: "2026-05-10", lastRate: 9.00,  effCost: 8.70,  leadDays: 3, totalOrders: 9,  rating: 4, contact: "az@pharma.in"        },
                           { name: "Cipla Ltd",        status: "Active",    currentStock: 0,   lastOrderDate: "2025-08-22", lastRate: 9.50,  effCost: 9.20,  leadDays: 2, totalOrders: 4,  rating: 4, contact: "cipla@pharma.in"     }],
  "Salbutamol Inhaler":   [{ name: "Cipla Ltd",        status: "Preferred", currentStock: 72,  lastOrderDate: "2026-08-01", lastRate: 95.00, effCost: 92.00, leadDays: 2, totalOrders: 21, rating: 5, contact: "cipla@pharma.in"     }],
  "Paracetamol 500mg":    [{ name: "GSK Pharma",       status: "Preferred", currentStock: 945, lastOrderDate: "2026-04-05", lastRate: 4.50,  effCost: 4.30,  leadDays: 1, totalOrders: 24, rating: 5, contact: "gsk@pharma.in"       },
                           { name: "Sun Pharma",       status: "Active",    currentStock: 0,   lastOrderDate: "2025-12-10", lastRate: 4.70,  effCost: 4.55,  leadDays: 1, totalOrders: 8,  rating: 4, contact: "sun@pharma.in"       }],
  "Ciprofloxacin 500mg":  [{ name: "MedLife Pharma",   status: "Preferred", currentStock: 192, lastOrderDate: "2026-06-15", lastRate: 35.50, effCost: 34.80, leadDays: 1, totalOrders: 13, rating: 5, contact: "medlife@pharma.in"   },
                           { name: "Cipla Ltd",        status: "Active",    currentStock: 0,   lastOrderDate: "2025-09-04", lastRate: 36.00, effCost: 35.20, leadDays: 2, totalOrders: 5,  rating: 4, contact: "cipla@pharma.in"     }],
  "Amlodipine 5mg":       [{ name: "Lupin Ltd",        status: "Preferred", currentStock: 402, lastOrderDate: "2026-01-20", lastRate: 11.80, effCost: 11.20, leadDays: 1, totalOrders: 19, rating: 5, contact: "lupin@pharma.in"     },
                           { name: "MedLife Pharma",   status: "Active",    currentStock: 0,   lastOrderDate: "2025-07-11", lastRate: 12.50, effCost: 12.00, leadDays: 2, totalOrders: 6,  rating: 3, contact: "medlife@pharma.in"   },
                           { name: "Sun Pharma",       status: "Inactive",  currentStock: 0,   lastOrderDate: "2024-11-01", lastRate: 13.00, effCost: 12.80, leadDays: 3, totalOrders: 3,  rating: 2, contact: "sun@pharma.in"       }],
  "Insulin Glargine":     [{ name: "Novo Nordisk Ltd", status: "Preferred", currentStock: 125, lastOrderDate: "2026-03-01", lastRate: 412.00,effCost: 408.00,leadDays: 3, totalOrders: 10, rating: 5, contact: "novo@nordisk.in"     }],
  "Warfarin 5mg":         [{ name: "Abbott India",     status: "Preferred", currentStock: 6,   lastOrderDate: "2025-04-01", lastRate: 32.00, effCost: 31.20, leadDays: 3, totalOrders: 8,  rating: 4, contact: "abbott@india.in"     },
                           { name: "Sun Pharma",       status: "Active",    currentStock: 0,   lastOrderDate: "2024-12-15", lastRate: 33.50, effCost: 32.80, leadDays: 2, totalOrders: 3,  rating: 3, contact: "sun@pharma.in"       }],
  "Sertraline 50mg":      [{ name: "Pfizer India",     status: "Preferred", currentStock: 160, lastOrderDate: "2026-07-01", lastRate: 22.00, effCost: 21.20, leadDays: 2, totalOrders: 12, rating: 5, contact: "pfizer@india.in"     },
                           { name: "Sun Pharma",       status: "Active",    currentStock: 0,   lastOrderDate: "2025-10-22", lastRate: 23.00, effCost: 22.50, leadDays: 2, totalOrders: 4,  rating: 4, contact: "sun@pharma.in"       }],
};

// ─── Stock movement log per drug ──────────────────────────────────────────────

type MovementEvent = "Purchase" | "Sale" | "Sale Return" | "Transfer In" | "Transfer Out" | "Adjustment" | "Expiry" | "Return to Distributor";
const DRUG_MOVEMENTS: Record<string, { date: string; event: MovementEvent; batch: string; qty: number; balance: number; ref: string; user: string; role: string; note: string }[]> = {
  "Amoxicillin 500mg": [
    { date: "2026-08-28", event: "Sale",                   batch: "BT-2025-0118", qty: -6,   balance: 240, ref: "INV-2026-1182", user: "Priya S.",   role: "Cashier",    note: "Counter sale" },
    { date: "2026-08-25", event: "Sale",                   batch: "BT-2025-0118", qty: -10,  balance: 246, ref: "INV-2026-1150", user: "Rahul M.",   role: "Cashier",    note: "Rx sale" },
    { date: "2026-08-22", event: "Sale Return",            batch: "BT-2025-0118", qty: +2,   balance: 256, ref: "RET-2026-0082", user: "Priya S.",   role: "Pharmacist", note: "Damaged seal" },
    { date: "2026-08-10", event: "Purchase",               batch: "BT-2025-0118", qty: +300, balance: 254, ref: "PO-2026-0411",  user: "System",     role: "System",     note: "Purchase receipt" },
    { date: "2026-07-30", event: "Sale",                   batch: "BT-2025-0118", qty: -48,  balance: -46, ref: "INV-2026-1040", user: "Anita K.",   role: "Cashier",    note: "Bulk order" },
    { date: "2026-07-15", event: "Adjustment",             batch: "BT-2025-0118", qty: +4,   balance: 2,   ref: "ADJ-2026-0031", user: "Manager",    role: "Manager",    note: "Physical count variance" },
    { date: "2026-06-20", event: "Transfer In",            batch: "BT-2025-0118", qty: +24,  balance: -2,  ref: "TRF-2026-0021", user: "Sanjay R.",  role: "Manager",    note: "From Branch 2" },
  ],
  "Metformin 1000mg": [
    { date: "2026-08-26", event: "Sale",                   batch: "BT-2025-0117", qty: -4,   balance: 18,  ref: "INV-2026-1175", user: "Rahul M.",   role: "Cashier",    note: "Rx sale" },
    { date: "2026-08-18", event: "Adjustment",             batch: "BT-2025-0117", qty: -12,  balance: 22,  ref: "ADJ-2026-0028", user: "Manager",    role: "Manager",    note: "Damaged in storage" },
    { date: "2026-07-10", event: "Sale",                   batch: "BT-2025-0117", qty: -16,  balance: 34,  ref: "INV-2026-0980", user: "Priya S.",   role: "Cashier",    note: "Counter sale" },
    { date: "2026-06-01", event: "Purchase",               batch: "BT-2025-0117", qty: +100, balance: 50,  ref: "PO-2026-0288",  user: "System",     role: "System",     note: "Purchase receipt" },
  ],
  "Amlodipine 5mg": [
    { date: "2026-08-29", event: "Sale",                   batch: "BT-2026-0008", qty: -8,   balance: 402, ref: "INV-2026-1190", user: "Priya S.",   role: "Cashier",    note: "Counter sale" },
    { date: "2026-08-20", event: "Sale",                   batch: "BT-2025-0099", qty: -4,   balance: 410, ref: "INV-2026-1145", user: "Anita K.",   role: "Cashier",    note: "Rx sale" },
    { date: "2026-08-12", event: "Sale Return",            batch: "BT-2026-0008", qty: +2,   balance: 414, ref: "RET-2026-0091", user: "Rahul M.",   role: "Pharmacist", note: "Wrong qty dispensed" },
    { date: "2026-07-01", event: "Expiry",                 batch: "BT-2025-0099", qty: -18,  balance: 412, ref: "EXP-2026-0014", user: "Manager",    role: "Manager",    note: "Batch expired disposal" },
    { date: "2026-03-10", event: "Transfer Out",           batch: "BT-2025-0099", qty: -30,  balance: 430, ref: "TRF-2026-0009", user: "Sanjay R.",  role: "Manager",    note: "To Branch 3" },
    { date: "2026-01-20", event: "Purchase",               batch: "BT-2026-0008", qty: +500, balance: 460, ref: "PO-2026-0118",  user: "System",     role: "System",     note: "Purchase receipt" },
    { date: "2025-03-10", event: "Purchase",               batch: "BT-2025-0099", qty: +200, balance: -40, ref: "PO-2025-0211",  user: "System",     role: "System",     note: "Purchase receipt" },
  ],
  "Insulin Glargine": [
    { date: "2026-08-27", event: "Sale",                   batch: "BT-2026-0005", qty: -3,   balance: 125, ref: "INV-2026-1180", user: "Anita K.",   role: "Pharmacist", note: "Cold-chain Rx" },
    { date: "2026-08-15", event: "Sale",                   batch: "BT-2026-0005", qty: -6,   balance: 128, ref: "INV-2026-1121", user: "Rahul M.",   role: "Pharmacist", note: "Cold-chain Rx" },
    { date: "2026-08-01", event: "Return to Distributor",  batch: "BT-2025-0116", qty: -8,   balance: 134, ref: "RTD-2026-0004", user: "Manager",    role: "Manager",    note: "Cold-chain break" },
    { date: "2026-03-01", event: "Purchase",               batch: "BT-2026-0005", qty: +80,  balance: 142, ref: "PO-2026-0195",  user: "System",     role: "System",     note: "Purchase receipt" },
    { date: "2025-10-10", event: "Expiry",                 batch: "BT-2025-0116", qty: -7,   balance: 62,  ref: "EXP-2025-0031", user: "Manager",    role: "Manager",    note: "Expired disposal" },
  ],
  "Paracetamol 500mg": [
    { date: "2026-08-29", event: "Sale",                   batch: "BT-2026-0015", qty: -22,  balance: 945, ref: "INV-2026-1192", user: "Priya S.",   role: "Cashier",    note: "OTC bulk" },
    { date: "2026-08-24", event: "Sale",                   batch: "BT-2026-0015", qty: -18,  balance: 967, ref: "INV-2026-1161", user: "Rahul M.",   role: "Cashier",    note: "Counter sale" },
    { date: "2026-08-19", event: "Sale Return",            batch: "BT-2025-0090", qty: +5,   balance: 985, ref: "RET-2026-0088", user: "Anita K.",   role: "Pharmacist", note: "Expiry concern" },
    { date: "2026-04-05", event: "Purchase",               batch: "BT-2026-0015", qty: +1000,balance: 980, ref: "PO-2026-0231",  user: "System",     role: "System",     note: "Purchase receipt" },
    { date: "2026-02-20", event: "Adjustment",             batch: "BT-2025-0090", qty: -10,  balance: -20, ref: "ADJ-2026-0012", user: "Manager",    role: "Manager",    note: "Physical count short" },
  ],
  "Ciprofloxacin 500mg": [
    { date: "2026-08-28", event: "Sale",                   batch: "BT-2026-0011", qty: -12,  balance: 192, ref: "INV-2026-1185", user: "Rahul M.",   role: "Cashier",    note: "Rx sale" },
    { date: "2026-08-10", event: "Expiry",                 batch: "BT-2025-0113", qty: -12,  balance: 204, ref: "EXP-2026-0018", user: "Manager",    role: "Manager",    note: "Batch expired" },
    { date: "2026-06-15", event: "Purchase",               batch: "BT-2026-0011", qty: +200, balance: 216, ref: "PO-2026-0317",  user: "System",     role: "System",     note: "Purchase receipt" },
    { date: "2026-05-10", event: "Sale",                   batch: "BT-2025-0113", qty: -6,   balance: 16,  ref: "INV-2026-0840", user: "Priya S.",   role: "Cashier",    note: "Counter sale" },
  ],
  "Atorvastatin 20mg": [
    { date: "2026-08-27", event: "Sale",                   batch: "BT-2025-0115", qty: -14,  balance: 312, ref: "INV-2026-1178", user: "Anita K.",   role: "Cashier",    note: "Rx sale" },
    { date: "2026-08-14", event: "Sale Return",            batch: "BT-2025-0115", qty: +2,   balance: 326, ref: "RET-2026-0085", user: "Rahul M.",   role: "Pharmacist", note: "Duplicate dispensing" },
    { date: "2026-08-01", event: "Transfer In",            batch: "BT-2025-0115", qty: +24,  balance: 324, ref: "TRF-2026-0017", user: "Sanjay R.",  role: "Manager",    note: "From Branch 1" },
    { date: "2025-09-15", event: "Purchase",               batch: "BT-2025-0115", qty: +400, balance: 300, ref: "PO-2025-0388",  user: "System",     role: "System",     note: "Purchase receipt" },
  ],
  "Omeprazole 20mg": [
    { date: "2026-08-29", event: "Sale",                   batch: "BT-2026-0019", qty: -8,   balance: 220, ref: "INV-2026-1191", user: "Priya S.",   role: "Cashier",    note: "OTC sale" },
    { date: "2026-08-20", event: "Adjustment",             batch: "BT-2026-0019", qty: +3,   balance: 228, ref: "ADJ-2026-0029", user: "Manager",    role: "Manager",    note: "Physical count surplus" },
    { date: "2026-05-10", event: "Purchase",               batch: "BT-2026-0019", qty: +300, balance: 225, ref: "PO-2026-0267",  user: "System",     role: "System",     note: "Purchase receipt" },
  ],
  "Warfarin 5mg": [
    { date: "2026-08-26", event: "Sale",                   batch: "BT-2025-0114", qty: -2,   balance: 6,   ref: "INV-2026-1174", user: "Anita K.",   role: "Pharmacist", note: "Rx sale" },
    { date: "2026-07-10", event: "Adjustment",             batch: "BT-2025-0114", qty: -4,   balance: 8,   ref: "ADJ-2026-0022", user: "Manager",    role: "Manager",    note: "Physical count short" },
    { date: "2026-04-01", event: "Purchase",               batch: "BT-2025-0114", qty: +50,  balance: 12,  ref: "PO-2025-0299",  user: "System",     role: "System",     note: "Purchase receipt" },
    { date: "2025-12-01", event: "Return to Distributor",  batch: "BT-2025-0114", qty: -6,   balance: -38, ref: "RTD-2025-0011", user: "Manager",    role: "Manager",    note: "Near-expiry return" },
  ],
  "Lisinopril 10mg": [
    { date: "2026-08-28", event: "Sale",                   batch: "BT-2025-0110", qty: -6,   balance: 140, ref: "INV-2026-1183", user: "Rahul M.",   role: "Cashier",    note: "Rx sale" },
    { date: "2026-08-10", event: "Sale Return",            batch: "BT-2025-0110", qty: +1,   balance: 146, ref: "RET-2026-0079", user: "Priya S.",   role: "Pharmacist", note: "Wrong strength" },
    { date: "2025-11-01", event: "Purchase",               batch: "BT-2025-0110", qty: +250, balance: 145, ref: "PO-2025-0441",  user: "System",     role: "System",     note: "Purchase receipt" },
  ],
  "Salbutamol Inhaler": [
    { date: "2026-08-27", event: "Sale",                   batch: "BT-2026-0031", qty: -4,   balance: 72,  ref: "INV-2026-1179", user: "Anita K.",   role: "Pharmacist", note: "Rx sale" },
    { date: "2026-08-15", event: "Sale",                   batch: "BT-2026-0031", qty: -6,   balance: 76,  ref: "INV-2026-1120", user: "Priya S.",   role: "Cashier",    note: "OTC sale" },
    { date: "2026-08-01", event: "Purchase",               batch: "BT-2026-0031", qty: +100, balance: 82,  ref: "PO-2026-0402",  user: "System",     role: "System",     note: "Purchase receipt" },
  ],
  "Sertraline 50mg": [
    { date: "2026-08-29", event: "Sale",                   batch: "BT-2026-0022", qty: -4,   balance: 160, ref: "INV-2026-1193", user: "Rahul M.",   role: "Pharmacist", note: "Rx sale" },
    { date: "2026-08-18", event: "Adjustment",             batch: "BT-2026-0022", qty: +2,   balance: 164, ref: "ADJ-2026-0030", user: "Manager",    role: "Manager",    note: "Count correction" },
    { date: "2026-07-01", event: "Purchase",               batch: "BT-2026-0022", qty: +200, balance: 162, ref: "PO-2026-0355",  user: "System",     role: "System",     note: "Purchase receipt" },
  ],
};

// ─── Sales & Demand lookup ─────────────────────────────────────────────────────

const DRUG_SALES: Record<string, {
  today: number; last7: number; last30: number; avgDaily: number;
  currentAvailable: number; openPO: number;
  reorderLevel: number; recommendedQty: number;
  trend: { day: string; qty: number }[];
}> = {
  "Amoxicillin 500mg":  { today: 12, last7: 42,  last30: 168, avgDaily: 5.6,  currentAvailable: 118, openPO: 50,  reorderLevel: 20, recommendedQty: 30,  trend: [{ day:"M",qty:7},{ day:"T",qty:9},{ day:"W",qty:5},{ day:"T",qty:11},{ day:"F",qty:6},{ day:"S",qty:3},{ day:"S",qty:1}] },
  "Metformin 1000mg":   { today: 8,  last7: 55,  last30: 220, avgDaily: 7.3,  currentAvailable: 12,  openPO: 0,   reorderLevel: 30, recommendedQty: 60,  trend: [{ day:"M",qty:8},{ day:"T",qty:7},{ day:"W",qty:9},{ day:"T",qty:6},{ day:"F",qty:10},{ day:"S",qty:8},{ day:"S",qty:7}] },
  "Lisinopril 10mg":    { today: 5,  last7: 28,  last30: 112, avgDaily: 3.7,  currentAvailable: 90,  openPO: 0,   reorderLevel: 20, recommendedQty: 40,  trend: [{ day:"M",qty:4},{ day:"T",qty:6},{ day:"W",qty:3},{ day:"T",qty:5},{ day:"F",qty:4},{ day:"S",qty:4},{ day:"S",qty:2}] },
  "Atorvastatin 20mg":  { today: 15, last7: 68,  last30: 272, avgDaily: 9.1,  currentAvailable: 312, openPO: 100, reorderLevel: 50, recommendedQty: 0,   trend: [{ day:"M",qty:10},{ day:"T",qty:12},{ day:"W",qty:8},{ day:"T",qty:15},{ day:"F",qty:9},{ day:"S",qty:8},{ day:"S",qty:6}] },
  "Omeprazole 20mg":    { today: 20, last7: 140, last30: 560, avgDaily: 18.7, currentAvailable: 240, openPO: 0,   reorderLevel: 80, recommendedQty: 0,   trend: [{ day:"M",qty:18},{ day:"T",qty:22},{ day:"W",qty:20},{ day:"T",qty:25},{ day:"F",qty:19},{ day:"S",qty:16},{ day:"S",qty:20}] },
  "Salbutamol Inhaler": { today: 4,  last7: 18,  last30: 72,  avgDaily: 2.4,  currentAvailable: 30,  openPO: 20,  reorderLevel: 15, recommendedQty: 0,   trend: [{ day:"M",qty:3},{ day:"T",qty:4},{ day:"W",qty:2},{ day:"T",qty:4},{ day:"F",qty:3},{ day:"S",qty:1},{ day:"S",qty:1}] },
  "Paracetamol 500mg":  { today: 35, last7: 210, last30: 840, avgDaily: 28.0, currentAvailable: 800, openPO: 200, reorderLevel: 100,recommendedQty: 0,   trend: [{ day:"M",qty:28},{ day:"T",qty:35},{ day:"W",qty:30},{ day:"T",qty:40},{ day:"F",qty:25},{ day:"S",qty:32},{ day:"S",qty:20}] },
  "Ciprofloxacin 500mg":{ today: 6,  last7: 22,  last30: 88,  avgDaily: 2.9,  currentAvailable: 12,  openPO: 0,   reorderLevel: 20, recommendedQty: 40,  trend: [{ day:"M",qty:4},{ day:"T",qty:3},{ day:"W",qty:5},{ day:"T",qty:2},{ day:"F",qty:4},{ day:"S",qty:2},{ day:"S",qty:2}] },
  "Amlodipine 5mg":     { today: 9,  last7: 48,  last30: 192, avgDaily: 6.4,  currentAvailable: 156, openPO: 0,   reorderLevel: 30, recommendedQty: 0,   trend: [{ day:"M",qty:7},{ day:"T",qty:8},{ day:"W",qty:6},{ day:"T",qty:9},{ day:"F",qty:7},{ day:"S",qty:6},{ day:"S",qty:5}] },
  "Insulin Glargine":   { today: 3,  last7: 14,  last30: 56,  avgDaily: 1.9,  currentAvailable: 45,  openPO: 0,   reorderLevel: 10, recommendedQty: 0,   trend: [{ day:"M",qty:2},{ day:"T",qty:3},{ day:"W",qty:2},{ day:"T",qty:3},{ day:"F",qty:2},{ day:"S",qty:1},{ day:"S",qty:1}] },
  "Warfarin 5mg":       { today: 2,  last7: 8,   last30: 32,  avgDaily: 1.1,  currentAvailable: 6,   openPO: 0,   reorderLevel: 5,  recommendedQty: 20,  trend: [{ day:"M",qty:1},{ day:"T",qty:2},{ day:"W",qty:1},{ day:"T",qty:1},{ day:"F",qty:2},{ day:"S",qty:1},{ day:"S",qty:0}] },
  "Sertraline 50mg":    { today: 7,  last7: 35,  last30: 140, avgDaily: 4.7,  currentAvailable: 160, openPO: 0,   reorderLevel: 25, recommendedQty: 0,   trend: [{ day:"M",qty:5},{ day:"T",qty:7},{ day:"W",qty:4},{ day:"T",qty:8},{ day:"F",qty:6},{ day:"S",qty:3},{ day:"S",qty:2}] },
};

// ─── Composition lookup ────────────────────────────────────────────────────────

const COMPOSITION_MAP: Record<string, { ingredient: string; strength: string; role: string }[]> = {
  "Amoxicillin 500mg":    [{ ingredient: "Amoxicillin Trihydrate", strength: "500 mg", role: "Active" }, { ingredient: "Clavulanic Acid", strength: "—", role: "Enhancer" }, { ingredient: "Microcrystalline Cellulose", strength: "—", role: "Excipient" }],
  "Metformin 1000mg":     [{ ingredient: "Metformin Hydrochloride", strength: "1000 mg", role: "Active" }, { ingredient: "Povidone K30", strength: "—", role: "Binder" }, { ingredient: "Magnesium Stearate", strength: "—", role: "Lubricant" }],
  "Lisinopril 10mg":      [{ ingredient: "Lisinopril Dihydrate", strength: "10 mg", role: "Active" }, { ingredient: "Calcium Hydrogen Phosphate", strength: "—", role: "Filler" }, { ingredient: "Corn Starch", strength: "—", role: "Disintegrant" }],
  "Atorvastatin 20mg":    [{ ingredient: "Atorvastatin Calcium", strength: "20 mg", role: "Active" }, { ingredient: "Hydroxypropyl Cellulose", strength: "—", role: "Binder" }, { ingredient: "Polysorbate 80", strength: "—", role: "Surfactant" }],
  "Omeprazole 20mg":      [{ ingredient: "Omeprazole", strength: "20 mg", role: "Active" }, { ingredient: "Sodium Lauryl Sulphate", strength: "—", role: "Surfactant" }, { ingredient: "Mannitol", strength: "—", role: "Filler" }],
  "Salbutamol Inhaler":   [{ ingredient: "Salbutamol Sulphate", strength: "100 mcg/actuation", role: "Active" }, { ingredient: "HFA 134a Propellant", strength: "—", role: "Propellant" }],
  "Paracetamol 500mg":    [{ ingredient: "Paracetamol (Acetaminophen)", strength: "500 mg", role: "Active" }, { ingredient: "Pregelatinised Starch", strength: "—", role: "Filler" }, { ingredient: "Talc", strength: "—", role: "Glidant" }],
  "Ciprofloxacin 500mg":  [{ ingredient: "Ciprofloxacin Hydrochloride", strength: "500 mg", role: "Active" }, { ingredient: "Crospovidone", strength: "—", role: "Disintegrant" }, { ingredient: "Hypromellose", strength: "—", role: "Coating" }],
  "Amlodipine 5mg":       [{ ingredient: "Amlodipine Besylate", strength: "5 mg", role: "Active" }, { ingredient: "Anhydrous Dibasic Calcium Phosphate", strength: "—", role: "Filler" }, { ingredient: "Sodium Starch Glycolate", strength: "—", role: "Disintegrant" }],
  "Insulin Glargine":     [{ ingredient: "Insulin Glargine", strength: "100 U/mL", role: "Active" }, { ingredient: "Zinc Chloride", strength: "—", role: "Stabiliser" }, { ingredient: "m-Cresol", strength: "—", role: "Preservative" }],
  "Warfarin 5mg":         [{ ingredient: "Warfarin Sodium", strength: "5 mg", role: "Active" }, { ingredient: "Lactose Monohydrate", strength: "—", role: "Filler" }, { ingredient: "Indigo Carmine", strength: "—", role: "Colourant" }],
  "Sertraline 50mg":      [{ ingredient: "Sertraline Hydrochloride", strength: "50 mg", role: "Active" }, { ingredient: "Microcrystalline Cellulose", strength: "—", role: "Filler" }, { ingredient: "Hydroxypropyl Methylcellulose", strength: "—", role: "Coating" }],
};

// ─── Movement / Stock Count / Audit mock data ────────────────────────────────

const INV_MOVEMENTS: { date: string; type: "IN" | "OUT"; qty: number; ref: string; user: string; note: string }[] = [
  { date: "2026-08-28", type: "IN",  qty: 100, ref: "PI-2026-0142", user: "Admin",   note: "Purchase receipt"      },
  { date: "2026-08-25", type: "OUT", qty: 20,  ref: "INV-2026-1891", user: "Cashier", note: "Counter sale"          },
  { date: "2026-08-22", type: "OUT", qty: 15,  ref: "INV-2026-1850", user: "Cashier", note: "Counter sale"          },
  { date: "2026-08-18", type: "IN",  qty: 200, ref: "PI-2026-0128", user: "Admin",   note: "Purchase receipt"      },
  { date: "2026-08-10", type: "OUT", qty: 30,  ref: "INV-2026-1790", user: "Staff",   note: "Prescription sale"     },
  { date: "2026-08-05", type: "OUT", qty: 8,   ref: "ADJ-2026-0031", user: "Manager", note: "Adjustment – damage"   },
];

const INV_STOCK_COUNTS: { date: string; expected: number; actual: number; variance: number; status: string; doneBy: string }[] = [
  { date: "2026-08-01", expected: 420, actual: 418, variance: -2, status: "Approved", doneBy: "Admin"   },
  { date: "2026-07-01", expected: 380, actual: 380, variance:  0, status: "Approved", doneBy: "Manager" },
  { date: "2026-06-01", expected: 310, actual: 308, variance: -2, status: "Approved", doneBy: "Admin"   },
  { date: "2026-05-01", expected: 290, actual: 293, variance:  3, status: "Approved", doneBy: "Staff"   },
];

const INV_AUDIT: { date: string; action: string; changedBy: string; detail: string }[] = [
  { date: "2026-08-20", action: "Price Updated",   changedBy: "Admin",   detail: "MRP updated"                },
  { date: "2026-08-15", action: "Stock Adjusted",  changedBy: "Manager", detail: "+5 units (correction)"      },
  { date: "2026-07-10", action: "Status Changed",  changedBy: "Admin",   detail: "Status set to Low Stock"    },
  { date: "2026-06-01", action: "Reorder Updated", changedBy: "Manager", detail: "Reorder level changed"      },
  { date: "2026-04-15", action: "Record Created",  changedBy: "Admin",   detail: "Added to medicine catalog"  },
];

const INV_APPROVALS: { id: number; date: string; systemQty: number; physicalQty: number; variance: number; reason: string; notes: string; submittedBy: string; status: "Pending" | "Approved" | "Rejected" }[] = [
  { id: 1, date: "2026-09-20", systemQty: 380, physicalQty: 374, variance: -6,  reason: "Damaged",              notes: "Found damaged units on shelf B",        submittedBy: "Cashier",  status: "Pending"  },
  { id: 2, date: "2026-09-15", systemQty: 380, physicalQty: 382, variance:  2,  reason: "Purchase Entry Error", notes: "Extra units from last GRN not recorded", submittedBy: "Staff",    status: "Pending"  },
  { id: 3, date: "2026-08-10", systemQty: 420, physicalQty: 418, variance: -2,  reason: "Unrecorded Sale",      notes: "",                                       submittedBy: "Cashier",  status: "Approved" },
  { id: 4, date: "2026-07-05", systemQty: 310, physicalQty: 308, variance: -2,  reason: "Expired",              notes: "Two units found expired in batch AM123",  submittedBy: "Admin",    status: "Rejected" },
];

// ─── Add Batch Modal ──────────────────────────────────────────────────────────

const BATCH_STATUSES = ["Active", "Quarantine"] as const;

function generateBatchId() {
  const yr = new Date("2026-09-26").getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `BT-${yr}-${seq}`;
}

// GS1 DataMatrix parser — handles (AI)value sequences
function parseGS1(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /\((\d{2,4})\)([^(]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) out[m[1]] = m[2].trim();
  return out;
}

// Convert YYMMDD → YYYY-MM-DD
function gs1Date(s: string): string {
  if (s.length !== 6) return "";
  const yy = parseInt(s.slice(0, 2), 10);
  const yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
  return `${yyyy}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
}

// Demo GS1 strings per drug — realistic Indian pharma pack data
const DEMO_SCANS: Record<string, string> = {
  "Amoxicillin 500mg":    "(01)08901234000011(10)AMX-2026-D41(11)260601(17)280601(30)100(96)58.00",
  "Metformin 1000mg":     "(01)08901234000028(10)MET-2026-B17(11)260701(17)280101(30)200(96)38.00",
  "Lisinopril 10mg":      "(01)08901234000035(10)LIS-2026-C09(11)260801(17)281201(30)150(96)24.00",
  "Atorvastatin 20mg":    "(01)08901234000042(10)ATV-2026-E22(11)260901(17)290301(30)120(96)26.00",
  "Omeprazole 20mg":      "(01)08901234000059(10)OMP-2026-F05(11)260801(17)281101(30)180(96)14.00",
  "Salbutamol Inhaler":   "(01)08901234000066(10)SAL-2026-G11(11)260901(17)280901(30)50(96)130.00",
  "Paracetamol 500mg":    "(01)08901234000073(10)PAR-2026-H33(11)261001(17)291001(30)500(96)7.00",
  "Ciprofloxacin 500mg":  "(01)08901234000080(10)CIP-2026-J14(11)260901(17)281201(30)200(96)49.00",
  "Amlodipine 5mg":       "(01)08901234000097(10)AML-2026-K08(11)260801(17)290801(30)300(96)18.50",
  "Insulin Glargine":     "(01)08901234000103(10)INS-2026-L02(11)260901(17)270901(30)60(96)525.00",
  "Warfarin 5mg":         "(01)08901234000110(10)WAR-2026-M19(11)260701(17)280701(30)80(96)44.00",
  "Sertraline 50mg":      "(01)08901234000127(10)SER-2026-N27(11)261001(17)291001(30)120(96)32.00",
};

function AddBatchModal({ drug, onClose, onSaved }: {
  drug: typeof drugs[0];
  onClose: () => void;
  onSaved: (ok: boolean, batchId: string) => void;
}) {
  const suppliers = DRUG_SUPPLIERS[drug.name] ?? [];
  const preferredSupplier = suppliers.find(s => s.status === "Preferred") ?? suppliers[0];

  const [batchId,    setBatchId]    = useState(generateBatchId);
  const [mfgDate,    setMfgDate]    = useState("2026-09-01");
  const [expiryDate, setExpiryDate] = useState("2028-09-01");
  const [qtyRcvd,    setQtyRcvd]    = useState("");
  const [purchPrice, setPurchPrice] = useState(preferredSupplier ? String(preferredSupplier.lastRate) : "");
  const [mrp,        setMrp]        = useState(drug.price ? String(drug.price) : "");
  const [gst,        setGst]        = useState("12");
  const [supplier,   setSupplier]   = useState(preferredSupplier?.name ?? "");
  const [location,   setLocation]   = useState(drug.location);
  const [status,     setStatus]     = useState<"Active" | "Quarantine">("Active");
  const [notes,      setNotes]      = useState("");
  const [scanInput,    setScanInput]    = useState("");
  const [scanStatus,   setScanStatus]   = useState<"idle" | "success" | "error">("idle");
  const [highlighted,  setHighlighted]  = useState<Set<string>>(new Set());
  const scanRef = useRef<HTMLInputElement>(null);

  // Auto-focus scan input on open
  useEffect(() => { scanRef.current?.focus(); }, []);

  function applyParsed(parsed: Record<string, string>) {
    const filled = new Set<string>();
    if (parsed["10"]) { setBatchId(parsed["10"]); filled.add("batchId"); }
    if (parsed["11"]) { const d = gs1Date(parsed["11"]); if (d) { setMfgDate(d); filled.add("mfgDate"); } }
    if (parsed["17"]) { const d = gs1Date(parsed["17"]); if (d) { setExpiryDate(d); filled.add("expiryDate"); } }
    if (parsed["30"]) { setQtyRcvd(parsed["30"]); filled.add("qtyRcvd"); }
    if (parsed["96"]) { setMrp(parsed["96"]); filled.add("mrp"); }
    return filled;
  }

  function processScan(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const parsed = parseGS1(trimmed);
    if (Object.keys(parsed).length === 0) { setScanStatus("error"); return; }
    const filled = applyParsed(parsed);
    if (filled.size > 0) {
      setScanStatus("success");
      setHighlighted(filled);
      setTimeout(() => setHighlighted(new Set()), 2500);
    } else {
      setScanStatus("error");
    }
    setScanInput("");
  }

  function handleScanKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { processScan(scanInput); }
  }

  function doDemo() {
    const raw = DEMO_SCANS[drug.name] ?? Object.values(DEMO_SCANS)[0];
    setScanInput(raw);
    const parsed = parseGS1(raw);
    const filled = applyParsed(parsed);
    setScanStatus("success");
    setHighlighted(filled);
    setTimeout(() => setHighlighted(new Set()), 2500);
    setTimeout(() => setScanInput(""), 600);
  }

  const qty = parseInt(qtyRcvd, 10);
  const validQty = qtyRcvd !== "" && !isNaN(qty) && qty > 0;
  const validExpiry = expiryDate > mfgDate;
  const saveDisabled = !validQty || !expiryDate || !mfgDate || !validExpiry;

  function hlStyle(key: string): React.CSSProperties {
    return highlighted.has(key)
      ? { borderColor: "#2E7D32", boxShadow: "0 0 0 3px rgba(46,125,50,0.12)", background: "#F0FFF4" }
      : {};
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4",
    fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff",
    color: "#0C1B33", boxSizing: "border-box",
  };
  function fi(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "#1B6CA8";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)";
  }
  function fo(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "#E8ECF4";
    e.currentTarget.style.boxShadow = "none";
  }
  const lbl = (text: string, req?: boolean) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>
      {text}{req && <span style={{ color: "#E53935" }}> *</span>}
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", zIndex: 301, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(10,22,44,0.22)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Add Batch</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{drug.name} · {drug.dosageForm}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Scan strip */}
        <div style={{ padding: "12px 20px", background: "#F0F7FF", borderBottom: "1px solid #DBEAFE", flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1B6CA8", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5v4M3 5h4M21 5h-4M21 5v4M3 19v-4M3 19h4M21 19h-4M21 19v-4"/>
              <rect x="7" y="7" width="4" height="10" rx="0.5"/><rect x="13" y="7" width="4" height="10" rx="0.5"/>
            </svg>
            Scan Product Barcode / QR
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" as const, flex: 1 }}>
              <input ref={scanRef} value={scanInput} onChange={e => { setScanInput(e.target.value); setScanStatus("idle"); }}
                onKeyDown={handleScanKey}
                placeholder="Point scanner at pack or paste GS1 string and press Enter…"
                style={{ ...inputStyle, fontFamily: "JetBrains Mono", fontSize: 12,
                  borderColor: scanStatus === "success" ? "#2E7D32" : scanStatus === "error" ? "#E53935" : "#BFDBFE",
                  background: scanStatus === "success" ? "#F0FFF4" : scanStatus === "error" ? "#FFF0F0" : "#fff",
                  paddingRight: scanStatus !== "idle" ? 36 : 12 }} />
              {scanStatus === "success" && (
                <svg style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#E8F5E9"/><path d="M4.5 8l2.5 2.5 4.5-5" stroke="#2E7D32" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
              {scanStatus === "error" && (
                <svg style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#FFEBEE"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#C62828" strokeWidth="1.6" strokeLinecap="round"/></svg>
              )}
            </div>
            <button onClick={doDemo}
              style={{ padding: "0 14px", borderRadius: 6, border: "1.5px solid #BFDBFE", background: "#EFF6FF", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" as const }}>
              Try Demo Scan
            </button>
          </div>
          {scanStatus === "success" && (
            <div style={{ fontSize: 11, color: "#2E7D32", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#E8F5E9"/><path d="M2.5 5l1.8 1.8 3.2-3.6" stroke="#2E7D32" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Fields auto-filled from scan — highlighted in green. You can still edit any value below.
            </div>
          )}
          {scanStatus === "error" && (
            <div style={{ fontSize: 11, color: "#C62828", marginTop: 6 }}>Could not read barcode. Check the format or enter values manually below.</div>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px" }}>

          {/* Section: Batch Identity */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1B6CA8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 14, paddingBottom: 6, borderBottom: "1px solid #EEF1F6" }}>Batch Identity</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 1" }}>
                {lbl("Batch ID", true)}
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={batchId} onChange={e => setBatchId(e.target.value)}
                    style={{ ...inputStyle, fontFamily: "JetBrains Mono", flex: 1, ...hlStyle("batchId") }} onFocus={fi} onBlur={fo} />
                  <button onClick={() => setBatchId(generateBatchId())} title="Regenerate ID"
                    style={{ padding: "0 10px", borderRadius: 6, border: "1.5px solid #E8ECF4", background: "#F8FAFC", cursor: "pointer", color: "#6B7280", flexShrink: 0, display: "flex", alignItems: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  </button>
                </div>
              </div>
              <div>
                {lbl("Mfg Date", true)}
                <input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "JetBrains Mono", ...hlStyle("mfgDate") }} onFocus={fi} onBlur={fo} />
              </div>
              <div>
                {lbl("Expiry Date", true)}
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "JetBrains Mono", borderColor: (!validExpiry && expiryDate) ? "#E53935" : highlighted.has("expiryDate") ? "#2E7D32" : "#E8ECF4", ...hlStyle("expiryDate") }} onFocus={fi} onBlur={fo} />
                {!validExpiry && expiryDate && (
                  <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>Must be after Mfg Date</div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Stock & Pricing */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1B6CA8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 14, paddingBottom: 6, borderBottom: "1px solid #EEF1F6" }}>Stock & Pricing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
              <div>
                {lbl("Qty Received", true)}
                <input type="number" min="1" value={qtyRcvd} onChange={e => setQtyRcvd(e.target.value)}
                  placeholder={`${drug.unit}s`} style={{ ...inputStyle, ...hlStyle("qtyRcvd") }} onFocus={fi} onBlur={fo} />
              </div>
              <div>
                {lbl("Purchase Price")}
                <div style={{ position: "relative" as const }}>
                  <span style={{ position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9CA3AF" }}>₹</span>
                  <input type="number" min="0" step="0.01" value={purchPrice} onChange={e => setPurchPrice(e.target.value)}
                    placeholder="0.00" style={{ ...inputStyle, paddingLeft: 22, fontFamily: "JetBrains Mono" }} onFocus={fi} onBlur={fo} />
                </div>
              </div>
              <div>
                {lbl("MRP")}
                <div style={{ position: "relative" as const }}>
                  <span style={{ position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9CA3AF" }}>₹</span>
                  <input type="number" min="0" step="0.01" value={mrp} onChange={e => setMrp(e.target.value)}
                    placeholder="0.00" style={{ ...inputStyle, paddingLeft: 22, fontFamily: "JetBrains Mono", ...hlStyle("mrp") }} onFocus={fi} onBlur={fo} />
                </div>
              </div>
              <div>
                {lbl("GST %")}
                <input type="number" min="0" max="28" value={gst} onChange={e => setGst(e.target.value)}
                  placeholder="e.g. 12" style={{ ...inputStyle, fontFamily: "JetBrains Mono" }} onFocus={fi} onBlur={fo} />
              </div>
            </div>
          </div>

          {/* Section: Storage & Distributor */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1B6CA8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 14, paddingBottom: 6, borderBottom: "1px solid #EEF1F6" }}>Storage & Distributor</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                {lbl("Distributor")}
                {suppliers.length > 0 ? (
                  <select value={supplier} onChange={e => setSupplier(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }} onFocus={fi} onBlur={fo}>
                    {suppliers.map(s => <option key={s.name} value={s.name}>{s.name}{s.status === "Preferred" ? " ★" : ""}</option>)}
                  </select>
                ) : (
                  <input value={supplier} onChange={e => setSupplier(e.target.value)}
                    placeholder="Supplier name" style={inputStyle} onFocus={fi} onBlur={fo} />
                )}
              </div>
              <div>
                {lbl("Location / Bin")}
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Rack A-3" style={inputStyle} onFocus={fi} onBlur={fo} />
              </div>
              <div>
                {lbl("Status")}
                <select value={status} onChange={e => setStatus(e.target.value as "Active" | "Quarantine")}
                  style={{ ...inputStyle, cursor: "pointer" }} onFocus={fi} onBlur={fo}>
                  {BATCH_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            {lbl("Notes")}
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any remarks for this batch…" rows={2}
              style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.6 }}
              onFocus={fi} onBlur={fo} />
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0, background: "#fff", alignItems: "center" }}>
          {validQty && (
            <div style={{ flex: 1, fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
              Opening stock: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>{qtyRcvd} {drug.unit}s</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <button onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 6, border: "1.5px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
              Cancel
            </button>
            <button onClick={() => { if (!saveDisabled) { onSaved(true, batchId); onClose(); } }} disabled={saveDisabled}
              style={{ padding: "9px 24px", borderRadius: 6, border: "none", background: saveDisabled ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: saveDisabled ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Add Batch
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

// ─── Transfer Batch Modal ─────────────────────────────────────────────────────

const BRANCHES = ["Main Store", "Branch - Koramangala", "Branch - Indiranagar", "Branch - Whitefield", "Branch - HSR Layout", "Central Warehouse"];
const STAFF_LIST = ["Dr. Priya Sharma", "Ravi Kumar", "Anita Nair", "Suresh Patel", "Meena Iyer", "Arjun Das"];
const TRANSFER_REASONS = ["Branch Request", "Expiry Management", "Stock Rebalancing", "Emergency Supply", "Damage Transfer", "Other"];
const TRANSFER_MODES = ["Internal Transfer", "Consignment", "Return to Warehouse"] as const;

function generateTrfId() {
  const yr = new Date("2026-09-26").getFullYear();
  return `TRF-${yr}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function TransferBatchModal({ batch, drug, onClose }: {
  batch: typeof INV_BATCHES[0];
  drug: typeof drugs[0];
  onClose: () => void;
}) {
  const [trfRef,       setTrfRef]       = useState(generateTrfId);
  const [transferDate, setTransferDate] = useState("2026-09-26");
  const [deliveryDate, setDeliveryDate] = useState("2026-09-28");
  const [toBranch,     setToBranch]     = useState(BRANCHES[1]);
  const [toLocation,   setToLocation]   = useState("");
  const [tqty,         setTqty]         = useState("");
  const [mode,         setMode]         = useState<typeof TRANSFER_MODES[number]>("Internal Transfer");
  const [priority,     setPriority]     = useState<"Normal" | "Urgent">("Normal");
  const [requestedBy,    setRequestedBy]    = useState(STAFF_LIST[0]);
  const [staffSearch,    setStaffSearch]    = useState(STAFF_LIST[0]);
  const [staffOpen,      setStaffOpen]      = useState(false);
  const [staffPos,       setStaffPos]       = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);
  const staffRef  = useRef<HTMLDivElement>(null);
  const staffInRef = useRef<HTMLInputElement>(null);
  const [carrier,      setCarrier]      = useState("");
  const [reason,       setReason]       = useState("Branch Request");
  const [notes,        setNotes]        = useState("");
  const [saved,        setSaved]        = useState(false);

  const tqtyNum   = parseInt(tqty, 10);
  const validTqty = tqty !== "" && !isNaN(tqtyNum) && tqtyNum > 0;
  const overQty   = validTqty && tqtyNum > batch.qtyCurrent;
  const remaining = validTqty && !overQty ? batch.qtyCurrent - tqtyNum : null;
  const saveDisabled = !validTqty || overQty || !toBranch || !transferDate;

  const filteredStaff = STAFF_LIST.filter(s => s.toLowerCase().includes(staffSearch.toLowerCase()));

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (staffRef.current && !staffRef.current.contains(e.target as Node)) {
        setStaffOpen(false);
        setStaffPos(null);
        setStaffSearch(requestedBy);
      }
    }
    if (staffOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [staffOpen, requestedBy]);

  const expDate   = new Date(batch.expiry);
  const daysLeft  = Math.ceil((expDate.getTime() - new Date("2026-09-26").getTime()) / 86400000);
  const expColor  = daysLeft < 30 ? "#C62828" : daysLeft < 90 ? "#E65100" : "#2E7D32";
  const expStr    = `${expDate.getDate()} ${expDate.toLocaleString("en-IN", { month: "short" })} ${expDate.getFullYear()}`;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4",
    fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff",
    color: "#0C1B33", boxSizing: "border-box",
  };
  function fi(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "#1B6CA8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)";
  }
  function fo(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "#E8ECF4"; e.currentTarget.style.boxShadow = "none";
  }
  const lbl = (text: string, req?: boolean) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>
      {text}{req && <span style={{ color: "#E53935" }}> *</span>}
    </div>
  );
  const secHead = (title: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#1B6CA8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 14, paddingBottom: 6, borderBottom: "1px solid #EEF1F6" }}>{title}</div>
  );

  if (saved) return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 440, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(10,22,44,0.22)", zIndex: 301, padding: "44px 40px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
        <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", marginBottom: 6 }}>Transfer Initiated</div>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#1B6CA8", fontWeight: 700, marginBottom: 4 }}>{trfRef}</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>{drug.name} · {batch.id}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Units</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: "#1B6CA8" }}>{tqty}</div>
          </div>
          <div style={{ width: 1, background: "#E8ECF4" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>To</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0C1B33", marginTop: 2 }}>{toBranch}</div>
          </div>
          <div style={{ width: 1, background: "#E8ECF4" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Priority</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: priority === "Urgent" ? "#C62828" : "#2E7D32", marginTop: 2 }}>{priority}</div>
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, background: "#FFF3E0", border: "1px solid #FFE0B2", marginBottom: 24 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#E65100"/><path d="M5 3v2.5l1.5 1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#E65100" }}>Pending Dispatch</span>
        </div>
        <div>
          <button onClick={onClose} style={{ padding: "9px 28px", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Done</button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 580, maxHeight: "90vh", display: "flex", flexDirection: "column", zIndex: 301, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(10,22,44,0.22)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Transfer Batch</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{drug.name}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Batch info strip */}
        <div style={{ padding: "10px 20px", background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 20, flexShrink: 0, flexWrap: "wrap" as const }}>
          {[
            { label: "Batch", value: batch.id, mono: true },
            { label: "Current Qty", value: `${batch.qtyCurrent} ${drug.unit}s`, mono: true, valueColor: "#1B6CA8" },
            { label: "Expiry", value: expStr, mono: true, valueColor: expColor },
            { label: "Location", value: batch.location, mono: false },
          ].map((f, i, arr) => (
            <Fragment key={f.label}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontFamily: f.mono ? "JetBrains Mono" : "Inter", fontSize: 13, fontWeight: 600, color: f.valueColor ?? "#0C1B33" }}>{f.value}</div>
              </div>
              {i < arr.length - 1 && <div style={{ width: 1, background: "#E8ECF4", alignSelf: "stretch" }} />}
            </Fragment>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Transfer Reference & Dates */}
          <div>
            {secHead("Transfer Reference")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                {lbl("Reference No")}
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={trfRef} onChange={e => setTrfRef(e.target.value)}
                    style={{ ...inputStyle, fontFamily: "JetBrains Mono", flex: 1, fontSize: 12 }} onFocus={fi} onBlur={fo} />
                  <button onClick={() => setTrfRef(generateTrfId())} title="Regenerate"
                    style={{ padding: "0 10px", borderRadius: 6, border: "1.5px solid #E8ECF4", background: "#F8FAFC", cursor: "pointer", color: "#6B7280", flexShrink: 0, display: "flex", alignItems: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  </button>
                </div>
              </div>
              <div>
                {lbl("Transfer Date", true)}
                <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "JetBrains Mono" }} onFocus={fi} onBlur={fo} />
              </div>
              <div>
                {lbl("Expected Delivery")}
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "JetBrains Mono" }} onFocus={fi} onBlur={fo} />
              </div>
            </div>
          </div>

          {/* From / To */}
          <div>
            {secHead("From / To")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                {lbl("From Branch")}
                <div style={{ padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4", fontSize: 13, background: "#F8FAFC", color: "#6B7280" }}>Main Store</div>
              </div>
              <div>
                {lbl("To Branch", true)}
                <DropdownSelect value={toBranch} onChange={setToBranch} options={BRANCHES.filter(b => b !== "Main Store")} />
              </div>
              <div>
                {lbl("From Location")}
                <div style={{ padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4", fontSize: 13, fontFamily: "JetBrains Mono", background: "#F8FAFC", color: "#6B7280" }}>{batch.location}</div>
              </div>
              <div>
                {lbl("To Location / Bin")}
                <input value={toLocation} onChange={e => setToLocation(e.target.value)}
                  placeholder="e.g. Rack B-2" style={inputStyle} onFocus={fi} onBlur={fo} />
              </div>
            </div>
          </div>

          {/* Quantity & Mode */}
          <div>
            {secHead("Quantity & Mode")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                {lbl("Transfer Qty", true)}
                <input type="number" min="1" max={batch.qtyCurrent} value={tqty} onChange={e => setTqty(e.target.value)}
                  placeholder={`Max ${batch.qtyCurrent}`}
                  style={{ ...inputStyle, border: overQty ? "1.5px solid #E53935" : "1.5px solid #E8ECF4" }} onFocus={fi} onBlur={fo} />
                {overQty && <div style={{ fontSize: 11, color: "#C62828", marginTop: 4 }}>Exceeds available qty ({batch.qtyCurrent})</div>}
              </div>
              <div>
                {lbl("Remaining After")}
                <div style={{ display: "flex", alignItems: "center", minHeight: 40, padding: "10px 12px", borderRadius: 6, background: "#F8FAFC", border: "1.5px solid #E8ECF4" }}>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: remaining !== null ? (remaining === 0 ? "#C62828" : remaining < 10 ? "#E65100" : "#1B6CA8") : "#C4C9D4" }}>
                    {remaining !== null ? remaining : "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 6 }}>{drug.unit}s left</span>
                </div>
              </div>
              <div>
                {lbl("Transfer Mode")}
                <DropdownSelect value={mode} onChange={v => setMode(v as typeof TRANSFER_MODES[number])} options={[...TRANSFER_MODES]} />
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div>
            {secHead("Logistics")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div ref={staffRef} style={{ position: "relative" as const }}>
                {lbl("Requested By")}
                <div style={{ position: "relative" as const }}>
                  <input ref={staffInRef} value={staffSearch}
                    onChange={e => { setStaffSearch(e.target.value); setStaffOpen(true); }}
                    onFocus={() => {
                      setStaffSearch("");
                      if (staffInRef.current) {
                        const r = staffInRef.current.getBoundingClientRect();
                        const zoom = getBodyZoom();
                        const top = r.bottom / zoom + 2;
                        const left = r.left / zoom;
                        const width = r.width / zoom;
                        const spaceBelow = window.innerHeight / zoom - top - 4;
                        setStaffPos({ top, left, width, maxH: Math.min(220, Math.max(80, spaceBelow)) });
                      }
                      setStaffOpen(true);
                    }}
                    placeholder="Search staff…"
                    style={{ ...inputStyle, paddingRight: 32 }}
                    onBlur={undefined} />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" as const }}>
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                {staffOpen && staffPos && createPortal(
                  <div onMouseDown={e => e.stopPropagation()}
                    style={{ position: "fixed" as const, top: staffPos.top, left: staffPos.left, width: staffPos.width, background: "#fff", borderRadius: 10, border: "1px solid #E8ECF4", boxShadow: "0 8px 28px rgba(12,27,51,0.14)", zIndex: 9999, maxHeight: staffPos.maxH, overflowY: "auto" as const, padding: "6px 0" }}>
                    {filteredStaff.length === 0 ? (
                      <div style={{ padding: "10px 16px", fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" }}>No staff found</div>
                    ) : filteredStaff.map(s => {
                      const sel = s === requestedBy;
                      return (
                        <div key={s}
                          onMouseDown={() => { setRequestedBy(s); setStaffSearch(s); setStaffOpen(false); setStaffPos(null); }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", fontSize: 13, fontFamily: "Inter", cursor: "pointer", color: sel ? "#1B6CA8" : "#0C1B33", fontWeight: sel ? 600 : 400, background: sel ? "#EFF6FF" : "#fff" }}
                          onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#F8FAFC"; }}
                          onMouseLeave={e => { if (!sel) e.currentTarget.style.background = sel ? "#EFF6FF" : "#fff"; }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: sel ? "#DBEAFE" : "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: sel ? "#1B6CA8" : "#6B7280", flexShrink: 0 }}>
                              {s.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span>{s}</span>
                          </div>
                          {sel && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                              <path d="M2.5 7l3.5 3.5 5.5-6.5" stroke="#1B6CA8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>,
                  document.body
                )}
              </div>
              <div>
                {lbl("Priority")}
                <div style={{ display: "flex", background: "#F0F3F7", borderRadius: 8, padding: 4, gap: 2, height: 40, boxSizing: "border-box" }}>
                  {(["Normal", "Urgent"] as const).map(p => (
                    <button key={p} onClick={() => setPriority(p)}
                      style={{ flex: 1, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: 600, transition: "background 0.15s, color 0.15s",
                        background: priority === p ? (p === "Urgent" ? "#C62828" : "#1B6CA8") : "transparent",
                        color: priority === p ? "#fff" : "#6B7280" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                {lbl("Carrier / Transport")}
                <input value={carrier} onChange={e => setCarrier(e.target.value)}
                  placeholder="e.g. Internal courier" style={inputStyle} onFocus={fi} onBlur={fo} />
              </div>
            </div>
          </div>

          {/* Reason & Notes */}
          <div>
            {secHead("Reason & Notes")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                {lbl("Reason", true)}
                <DropdownSelect value={reason} onChange={setReason} options={TRANSFER_REASONS} />
              </div>
              <div>
                {lbl("Notes")}
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any remarks…" rows={1}
                  style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.6 }}
                  onFocus={fi} onBlur={fo} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0, background: "#fff", alignItems: "center" }}>
          {validTqty && !overQty && (
            <div style={{ flex: 1, fontSize: 12, color: "#6B7280" }}>
              Transferring <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>{tqty} {drug.unit}s</span> to <span style={{ fontWeight: 600, color: "#0C1B33" }}>{toBranch}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <button onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 6, border: "1.5px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
              Cancel
            </button>
            <button onClick={() => !saveDisabled && setSaved(true)} disabled={saveDisabled}
              style={{ padding: "9px 24px", borderRadius: 6, border: "none", background: saveDisabled ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: saveDisabled ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Initiate Transfer
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

// ─── Adjust Stock Modal ───────────────────────────────────────────────────────

const ADJUST_REASONS = ["Entry Error", "Damaged Goods", "Expired Stock", "Theft / Loss", "Transfer Out", "Distributor Return", "Other"];

type AdjustType = "add" | "remove" | "set";

function AdjustStockModal({ batch, drug, onClose }: {
  batch: typeof INV_BATCHES[0];
  drug: typeof drugs[0];
  onClose: () => void;
}) {
  const [adjType, setAdjType] = useState<AdjustType>("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Entry Error");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const qtyNum = qty === "" ? null : parseInt(qty, 10);
  const validQty = qtyNum !== null && !isNaN(qtyNum) && qtyNum > 0;

  const newQty = validQty
    ? adjType === "add"   ? batch.qtyCurrent + qtyNum!
    : adjType === "remove" ? Math.max(0, batch.qtyCurrent - qtyNum!)
    : qtyNum!
    : null;

  const saveDisabled = !validQty;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4",
    fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff",
    color: "#0C1B33", boxSizing: "border-box",
  };
  function fi(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = "#1B6CA8";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)";
  }
  function fo(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = "#E8ECF4";
    e.currentTarget.style.boxShadow = "none";
  }

  const expDate = new Date(batch.expiry);
  const expStr = `${expDate.getDate()} ${expDate.toLocaleString("en-IN", { month: "short" })} ${expDate.getFullYear()}`;
  const daysLeft = Math.ceil((expDate.getTime() - new Date("2026-09-26").getTime()) / 86400000);
  const expColor = daysLeft < 30 ? "#C62828" : daysLeft < 90 ? "#E65100" : "#2E7D32";

  const typeBtn = (t: AdjustType, label: string) => (
    <button onClick={() => setAdjType(t)}
      style={{ flex: 1, padding: "8px 0", fontSize: 13, fontFamily: "Inter", fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer",
               background: adjType === t ? "#1B6CA8" : "transparent",
               color: adjType === t ? "#fff" : "#6B7280",
               transition: "background 0.15s, color 0.15s" }}>
      {label}
    </button>
  );

  if (saved) return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(10,22,44,0.22)", zIndex: 301, padding: "48px 40px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#2E7D32" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", marginBottom: 6 }}>Stock Adjusted</div>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>{batch.id} · {drug.name}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 700, color: "#6B7280" }}>{batch.qtyCurrent}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: "#1B6CA8" }}>{newQty ?? batch.qtyCurrent}</span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>{drug.unit}s</span>
        </div>
        <button onClick={onClose} style={{ padding: "9px 28px", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Done</button>
      </div>
    </>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, maxHeight: "88vh", display: "flex", flexDirection: "column", zIndex: 301, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(10,22,44,0.22)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Adjust Stock</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{drug.name}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Batch info strip */}
        <div style={{ padding: "10px 20px", background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 20, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 }}>Batch</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{batch.id}</div>
          </div>
          <div style={{ width: 1, background: "#E8ECF4" }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 }}>Current Qty</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1B6CA8" }}>{batch.qtyCurrent} <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 12 }}>{drug.unit}s</span></div>
          </div>
          <div style={{ width: 1, background: "#E8ECF4" }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 }}>Expiry</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: expColor }}>{expStr}</div>
          </div>
          <div style={{ width: 1, background: "#E8ECF4" }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 }}>Location</div>
            <div style={{ fontSize: 13, color: "#0C1B33" }}>{batch.location}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Adjustment type */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>Adjustment Type</div>
            <div style={{ display: "flex", background: "#F0F3F7", borderRadius: 8, padding: 4, gap: 2 }}>
              {typeBtn("add", "+ Add")}
              {typeBtn("remove", "− Remove")}
              {typeBtn("set", "= Set To")}
            </div>
          </div>

          {/* Qty + new qty preview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>
                {adjType === "set" ? "New Quantity" : "Quantity"} <span style={{ color: "#E53935" }}>*</span>
              </div>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                placeholder={adjType === "set" ? `e.g. ${batch.qtyCurrent}` : "e.g. 10"}
                style={inputStyle} onFocus={fi} onBlur={fo} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>New Qty Preview</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, padding: "10px 12px", borderRadius: 6, background: "#F8FAFC", border: "1.5px solid #E8ECF4" }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#9CA3AF" }}>{batch.qtyCurrent}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: newQty !== null ? "#1B6CA8" : "#C4C9D4" }}>
                  {newQty !== null ? newQty : "—"}
                </span>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{drug.unit}s</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>Reason <span style={{ color: "#E53935" }}>*</span></div>
            <select value={reason} onChange={e => setReason(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {ADJUST_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>
              Notes <span style={{ fontWeight: 400, color: "#C4C9D4" }}>(optional)</span>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any remarks about this adjustment…" rows={3}
              style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.6 }}
              onFocus={fi} onBlur={fo} />
          </div>

          {/* Remove-to-zero warning */}
          {adjType === "remove" && validQty && qtyNum! >= batch.qtyCurrent && (
            <div style={{ padding: "10px 14px", borderRadius: 6, background: "#FFEBEE", border: "1px solid #FFCDD2", display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1l7 14H1L8 1z" stroke="#C62828" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 6v4M8 12v.5" stroke="#C62828" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span style={{ fontSize: 12, color: "#C62828", fontFamily: "Inter" }}>
                {qtyNum! > batch.qtyCurrent ? "Quantity exceeds current stock — will be clamped to 0." : "This will bring the batch quantity to zero."}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0, background: "#fff" }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1.5px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
            Cancel
          </button>
          <button onClick={() => !saveDisabled && setSaved(true)} disabled={saveDisabled}
            style={{ flex: 2, padding: "9px 0", borderRadius: 6, border: "none", background: saveDisabled ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: saveDisabled ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Save Adjustment
          </button>
        </div>

      </div>
    </>
  );
}

// ─── Stock Count Modal ────────────────────────────────────────────────────────

// ─── Print Label modal ───────────────────────────────────────────────────────

const PHARMACY_INFO = { name: "City Pharmacy", address: "12 MG Road, Bengaluru", phone: "080-4112 9900" };

type LabelSize = "small" | "standard" | "large";
const LABEL_SIZES: { key: LabelSize; label: string; dim: string; w: number; h: number }[] = [
  { key: "small",    label: "Small",    dim: "30 x 20 mm", w: 252, h: 168 },
  { key: "standard", label: "Standard", dim: "50 x 30 mm", w: 320, h: 192 },
  { key: "large",    label: "Large",    dim: "70 x 40 mm", w: 420, h: 240 },
];

function FakeBarcode({ value, width, height }: { value: string; width: number; height: number }) {
  const seed = value.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  let r = seed;
  while (x < width) {
    r = (r * 1664525 + 1013904223) & 0xffffffff;
    const bw = 1 + (Math.abs(r) % 3);
    const gap = 1 + (Math.abs((r >> 8)) % 2);
    bars.push({ x, w: bw });
    x += bw + gap;
  }
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#0C1B33" />)}
    </svg>
  );
}

function LabelPreview({ batch, drug, size }: { batch: typeof INV_BATCHES[0] | null; drug: typeof drugs[0]; size: LabelSize }) {
  const sz = LABEL_SIZES.find(s => s.key === size)!;
  const form   = DRUG_DOSAGE_FORM[drug.name] ?? drug.unit;
  const mfr    = DRUG_MANUFACTURER[drug.name] ?? drug.supplier;
  const pack   = DRUG_PACK[drug.name] ?? "";
  const store  = DRUG_STORAGE[drug.name] ?? { label: "Room Temperature (15–30°C)", icon: "", color: "#2E7D32", bg: "#E8F5E9" };
  const rx     = DRUG_PRESCRIPTION[drug.name] ?? "OTC";
  const expiry = batch?.expiry ?? "—";
  const batchNo= batch?.id ?? "—";
  const mrp    = batch?.mrp ?? drug.price;
  const mfgRaw = batch?.receivedDate ?? "";
  const mfgDisp = mfgRaw ? new Date(mfgRaw).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—";
  const expDisp = expiry !== "—" ? new Date(expiry).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—";

  const fs = size === "small" ? { title: 9, sub: 6.5, body: 6, tiny: 5.5 }
           : size === "standard" ? { title: 11, sub: 8, body: 7, tiny: 6.5 }
           : { title: 13, sub: 9.5, body: 8, tiny: 7.5 };

  return (
    <div style={{ width: sz.w, minHeight: sz.h, background: "#fff", border: "1px solid #C8CDD8", borderRadius: 4, overflow: "hidden", fontFamily: "Inter", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", flexShrink: 0 }}>
      {/* Pharmacy header */}
      <div style={{ background: "#0C1B33", padding: size === "small" ? "4px 8px" : "5px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: fs.sub + 1, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>{PHARMACY_INFO.name}</div>
          {size !== "small" && <div style={{ fontSize: fs.tiny, color: "#9CA3AF", marginTop: 1 }}>{PHARMACY_INFO.address} · {PHARMACY_INFO.phone}</div>}
        </div>
        <div style={{ background: rx === "OTC" ? "#2E7D32" : "#C62828", color: "#fff", fontSize: fs.tiny, fontWeight: 700, padding: "1px 5px", borderRadius: 3, letterSpacing: "0.04em" }}>{rx}</div>
      </div>

      {/* Drug name */}
      <div style={{ padding: size === "small" ? "5px 8px 3px" : "7px 10px 4px", borderBottom: "1px solid #EEF1F6" }}>
        <div style={{ fontFamily: "Outfit", fontSize: fs.title, fontWeight: 700, color: "#0C1B33", lineHeight: 1.2 }}>{drug.name}</div>
        <div style={{ fontSize: fs.sub, color: "#6B7280", marginTop: 2 }}>{form}{pack ? ` · ${pack}` : ""}{size !== "small" ? ` · ${mfr}` : ""}</div>
      </div>

      {/* Batch / dates / MRP */}
      <div style={{ padding: size === "small" ? "4px 8px" : "5px 10px", borderBottom: "1px solid #EEF1F6" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px" }}>
          <div style={{ fontSize: fs.body, color: "#6B7280" }}>Batch: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, color: "#0C1B33", fontSize: fs.body }}>{batchNo}</span></div>
          <div style={{ fontSize: fs.body, color: "#6B7280" }}>MRP: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33", fontSize: fs.body }}>₹{mrp.toFixed(2)}</span></div>
          <div style={{ fontSize: fs.body, color: "#6B7280" }}>Mfg: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, color: "#0C1B33", fontSize: fs.body }}>{mfgDisp}</span></div>
          <div style={{ fontSize: fs.body, color: "#6B7280" }}>Exp: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828", fontSize: fs.body }}>{expDisp}</span></div>
        </div>
        {size !== "small" && (
          <div style={{ fontSize: fs.tiny, color: "#9CA3AF", marginTop: 3 }}>MRP inclusive of all taxes</div>
        )}
      </div>

      {/* Barcode + storage */}
      <div style={{ padding: size === "small" ? "4px 8px" : "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <FakeBarcode value={batchNo + drug.name} width={Math.round(sz.w * 0.44)} height={size === "small" ? 18 : size === "standard" ? 24 : 30} />
          <div style={{ fontFamily: "JetBrains Mono", fontSize: fs.tiny, color: "#6B7280", marginTop: 2, letterSpacing: "0.08em" }}>{batchNo}</div>
        </div>
        <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
          <div style={{ fontSize: fs.tiny, color: store.color, fontWeight: 600 }}>{store.icon} {store.label}</div>
          {size === "large" && <div style={{ fontSize: fs.tiny - 0.5, color: "#9CA3AF", marginTop: 3, maxWidth: 160, lineHeight: 1.3 }}>Keep out of reach of children</div>}
        </div>
      </div>
    </div>
  );
}

function PrintLabelModal({ batch, drug, onClose }: {
  batch: typeof INV_BATCHES[0] | null;
  drug: typeof drugs[0];
  onClose: () => void;
}) {
  const [size,   setSize]   = useState<LabelSize>("standard");
  const [copies, setCopies] = useState(1);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  function handlePrint() {
    setPrinted(true);
    setTimeout(() => { setPrinted(false); onClose(); }, 1400);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 310 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 640, zIndex: 311, background: "#fff", borderRadius: 12, boxShadow: "0 8px 48px rgba(10,22,44,0.24)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Print Label</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{drug.name}{batch ? ` · ${batch.id}` : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#6B7280" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ display: "flex", gap: 0, flex: 1 }}>
          {/* Label preview panel */}
          <div style={{ flex: 1, background: "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, minHeight: 280 }}>
            <LabelPreview batch={batch} drug={drug} size={size} />
          </div>

          {/* Settings panel */}
          <div style={{ width: 200, borderLeft: "1px solid #EEF1F6", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 20, flexShrink: 0 }}>

            {/* Label size */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 10 }}>Label Size</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {LABEL_SIZES.map(s => (
                  <button key={s.key} onClick={() => setSize(s.key)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${size === s.key ? "#1B6CA8" : "#E8ECF4"}`, background: size === s.key ? "#EFF6FF" : "#fff", cursor: "pointer", textAlign: "left" as const }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: size === s.key ? "#1B6CA8" : "#0C1B33" }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{s.dim}</div>
                    </div>
                    {size === s.key && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7l3.5 3.5 5.5-6.5" stroke="#1B6CA8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>Copies</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setCopies(c => Math.max(1, c - 1))}
                  style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #E8ECF4", background: "#F8FAFC", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#0C1B33", flexShrink: 0 }}>−</button>
                <input type="number" min={1} max={100} value={copies} onChange={e => setCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
                  style={{ flex: 1, textAlign: "center" as const, padding: "6px 4px", borderRadius: 6, border: "1.5px solid #E8ECF4", fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#0C1B33", outline: "none", minWidth: 0 }} />
                <button onClick={() => setCopies(c => Math.min(100, c + 1))}
                  style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #E8ECF4", background: "#F8FAFC", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#0C1B33", flexShrink: 0 }}>+</button>
              </div>
            </div>

            {/* Print info */}
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", marginTop: "auto" }}>
              <div style={{ fontSize: 11, color: "#6B7280" }}>
                <div style={{ marginBottom: 4 }}>Size: <span style={{ fontWeight: 600, color: "#0C1B33" }}>{LABEL_SIZES.find(s => s.key === size)?.dim}</span></div>
                <div>Copies: <span style={{ fontWeight: 600, color: "#0C1B33" }}>{copies}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, background: "#FAFBFD", flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, fontFamily: "Inter", color: "#0C1B33", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handlePrint} disabled={printed}
            style={{ padding: "8px 22px", borderRadius: 7, border: "none", background: printed ? "#2E7D32" : "#1B6CA8", color: "#fff", fontSize: 13, fontFamily: "Inter", fontWeight: 600, cursor: printed ? "default" : "pointer", display: "flex", alignItems: "center", gap: 7, transition: "background 0.2s" }}>
            {printed ? (
              <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Sent to printer</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print {copies} {copies === 1 ? "copy" : "copies"}</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Batch history mock data ─────────────────────────────────────────────────

type BatchTx = { date: string; type: string; ref: string; change: number; balance: number; by: string; notes: string };

const BATCH_HISTORY: Record<string, BatchTx[]> = {
  "BT-2025-0118": [
    { date: "2025-09-15 14:22", type: "Sale",        ref: "INV-2025-2841", change: -18, balance: 240, by: "Ravi Kumar",      notes: "Counter sale" },
    { date: "2025-09-10 09:05", type: "Return",       ref: "RTN-2025-0188", change: +3,  balance: 258, by: "Anita Nair",      notes: "Returned by patient" },
    { date: "2025-09-01 11:30", type: "Sale",        ref: "INV-2025-2719", change: -8,  balance: 255, by: "Ravi Kumar",      notes: "" },
    { date: "2025-08-20 16:10", type: "Sale",        ref: "INV-2025-2602", change: -10, balance: 263, by: "Meena Iyer",      notes: "" },
    { date: "2025-08-15 10:45", type: "Sale",        ref: "INV-2025-2550", change: -12, balance: 273, by: "Suresh Patel",    notes: "" },
    { date: "2025-08-12 09:20", type: "Sale",        ref: "INV-2025-2510", change: -15, balance: 285, by: "Ravi Kumar",      notes: "" },
    { date: "2025-08-10 08:00", type: "Purchase",         ref: "PI-2025-0441", change: +300,balance: 300, by: "Arjun Das",       notes: "Opening stock receipt from MedLife Pharma" },
  ],
  "BT-2025-0117": [
    { date: "2025-07-20 15:00", type: "Sale",        ref: "INV-2025-2390", change: -18, balance: 18,  by: "Anita Nair",      notes: "" },
    { date: "2025-07-10 11:00", type: "Stock Count", ref: "ADJ-2025-0072", change: -2,  balance: 36,  by: "Arjun Das",       notes: "Physical count correction" },
    { date: "2025-07-01 10:30", type: "Sale",        ref: "INV-2025-2281", change: -15, balance: 38,  by: "Meena Iyer",      notes: "" },
    { date: "2025-06-20 14:20", type: "Sale",        ref: "INV-2025-2140", change: -12, balance: 53,  by: "Ravi Kumar",      notes: "" },
    { date: "2025-06-12 09:40", type: "Sale",        ref: "INV-2025-2010", change: -20, balance: 65,  by: "Suresh Patel",    notes: "" },
    { date: "2025-06-05 13:15", type: "Sale",        ref: "INV-2025-1940", change: -15, balance: 85,  by: "Anita Nair",      notes: "" },
    { date: "2025-06-01 08:00", type: "Purchase",         ref: "PI-2025-0388", change: +100,balance: 100, by: "Arjun Das",       notes: "Receipt from Sun Pharma" },
  ],
  "BT-2025-0116": [
    { date: "2025-08-15 10:00", type: "Sale",        ref: "INV-2025-2580", change: -5,  balance: 45,  by: "Dr. Priya Sharma",notes: "Prescription sale" },
    { date: "2025-07-20 11:30", type: "Transfer Out",ref: "TRF-2025-0091", change: -5,  balance: 50,  by: "Meena Iyer",      notes: "Transfer to Branch - Koramangala" },
    { date: "2025-06-10 09:00", type: "Sale",        ref: "INV-2025-2020", change: -5,  balance: 55,  by: "Dr. Priya Sharma",notes: "Prescription sale" },
    { date: "2025-05-01 14:30", type: "Adjustment",  ref: "ADJ-2025-0041", change: -5,  balance: 60,  by: "Arjun Das",       notes: "Cold chain damage — 5 vials discarded" },
    { date: "2025-04-20 08:00", type: "Purchase",         ref: "PI-2025-0310", change: +60, balance: 60,  by: "Arjun Das",       notes: "Receipt from Novo Nordisk — cold store" },
  ],
  "BT-2026-0005": [
    { date: "2026-09-20 15:10", type: "Sale",        ref: "INV-2026-4120", change: -4,  balance: 80,  by: "Dr. Priya Sharma",notes: "Prescription sale" },
    { date: "2026-09-01 09:30", type: "Return",       ref: "RTN-2026-0310", change: +4,  balance: 84,  by: "Ravi Kumar",      notes: "Unopened — patient returned" },
    { date: "2026-03-01 08:00", type: "Purchase",         ref: "PI-2026-0091", change: +80, balance: 80,  by: "Arjun Das",       notes: "New batch from Novo Nordisk" },
  ],
  "BT-2025-0115": [
    { date: "2025-11-10 13:40", type: "Sale",        ref: "INV-2025-3101", change: -22, balance: 312, by: "Meena Iyer",      notes: "" },
    { date: "2025-10-28 10:20", type: "Sale",        ref: "INV-2025-2980", change: -18, balance: 334, by: "Suresh Patel",    notes: "" },
    { date: "2025-10-15 09:00", type: "Transfer Out",ref: "TRF-2025-0110", change: -30, balance: 352, by: "Arjun Das",       notes: "Branch rebalancing — HSR Layout" },
    { date: "2025-10-01 11:30", type: "Sale",        ref: "INV-2025-2840", change: -16, balance: 382, by: "Anita Nair",      notes: "" },
    { date: "2025-09-15 08:00", type: "Purchase",         ref: "PI-2025-0481", change: +400,balance: 400, by: "Arjun Das",       notes: "Receipt from Cipla Ltd" },
  ],
  "BT-2025-0114": [
    { date: "2025-09-10 14:00", type: "Sale",        ref: "INV-2025-2799", change: -3,  balance: 6,   by: "Dr. Priya Sharma",notes: "Prescription — Schedule H1" },
    { date: "2025-08-20 10:00", type: "Sale",        ref: "INV-2025-2611", change: -6,  balance: 9,   by: "Dr. Priya Sharma",notes: "" },
    { date: "2025-07-15 09:30", type: "Sale",        ref: "INV-2025-2340", change: -10, balance: 15,  by: "Anita Nair",      notes: "" },
    { date: "2025-06-10 11:00", type: "Sale",        ref: "INV-2025-2031", change: -12, balance: 25,  by: "Ravi Kumar",      notes: "" },
    { date: "2025-05-08 15:00", type: "Sale",        ref: "INV-2025-1810", change: -13, balance: 37,  by: "Dr. Priya Sharma",notes: "" },
    { date: "2025-04-01 08:00", type: "Purchase",         ref: "PI-2025-0290", change: +50, balance: 50,  by: "Arjun Das",       notes: "Receipt from Abbott India" },
  ],
  "BT-2025-0113": [
    { date: "2025-09-12 14:10", type: "Sale",        ref: "INV-2025-2822", change: -5,  balance: 12,  by: "Meena Iyer",      notes: "" },
    { date: "2025-08-28 10:00", type: "Sale",        ref: "INV-2025-2690", change: -10, balance: 17,  by: "Ravi Kumar",      notes: "" },
    { date: "2025-07-20 09:30", type: "Write-off",   ref: "WO-2025-0031",  change: -15, balance: 27,  by: "Arjun Das",       notes: "Damaged blister packs — 15 strips" },
    { date: "2025-07-01 11:00", type: "Sale",        ref: "INV-2025-2281", change: -20, balance: 42,  by: "Suresh Patel",    notes: "" },
    { date: "2025-06-10 14:00", type: "Sale",        ref: "INV-2025-2040", change: -30, balance: 62,  by: "Anita Nair",      notes: "" },
    { date: "2025-05-25 09:00", type: "Sale",        ref: "INV-2025-1910", change: -23, balance: 92,  by: "Meena Iyer",      notes: "" },
    { date: "2025-05-10 08:00", type: "Purchase",         ref: "PI-2025-0340", change: +150,balance: 150, by: "Arjun Das",       notes: "Receipt from MedLife Pharma" },
  ],
  "BT-2026-0011": [
    { date: "2026-09-15 10:30", type: "Sale",        ref: "INV-2026-4080", change: -12, balance: 180, by: "Ravi Kumar",      notes: "" },
    { date: "2026-08-20 11:00", type: "Sale",        ref: "INV-2026-3810", change: -8,  balance: 192, by: "Meena Iyer",      notes: "" },
    { date: "2026-06-15 08:00", type: "Purchase",         ref: "PI-2026-0201", change: +200,balance: 200, by: "Arjun Das",       notes: "New batch from MedLife Pharma" },
  ],
  "BT-2026-0008": [
    { date: "2026-09-18 15:00", type: "Sale",        ref: "INV-2026-4095", change: -20, balance: 380, by: "Suresh Patel",    notes: "" },
    { date: "2026-08-30 13:00", type: "Sale",        ref: "INV-2026-3890", change: -30, balance: 400, by: "Anita Nair",      notes: "" },
    { date: "2026-07-15 10:30", type: "Transfer In", ref: "TRF-2026-0088", change: +30, balance: 430, by: "Arjun Das",       notes: "Received from Central Warehouse" },
    { date: "2026-06-10 11:00", type: "Sale",        ref: "INV-2026-3410", change: -50, balance: 400, by: "Ravi Kumar",      notes: "" },
    { date: "2026-04-20 14:30", type: "Adjustment",  ref: "ADJ-2026-0022", change: -20, balance: 450, by: "Arjun Das",       notes: "Stock count correction" },
    { date: "2026-01-20 08:00", type: "Purchase",         ref: "PI-2026-0031", change: +500,balance: 500, by: "Arjun Das",       notes: "Receipt from Lupin Ltd" },
  ],
  "BT-2025-0099": [
    { date: "2026-03-10 10:00", type: "Sale",        ref: "INV-2026-2990", change: -8,  balance: 22,  by: "Meena Iyer",      notes: "" },
    { date: "2026-02-01 11:00", type: "Sale",        ref: "INV-2026-2640", change: -20, balance: 30,  by: "Suresh Patel",    notes: "" },
    { date: "2026-01-10 14:00", type: "Sale",        ref: "INV-2026-2301", change: -50, balance: 50,  by: "Anita Nair",      notes: "" },
    { date: "2025-12-01 09:00", type: "Sale",        ref: "INV-2025-3540", change: -60, balance: 100, by: "Ravi Kumar",      notes: "" },
    { date: "2025-10-20 11:00", type: "Sale",        ref: "INV-2025-3100", change: -40, balance: 160, by: "Meena Iyer",      notes: "" },
    { date: "2025-03-10 08:00", type: "Purchase",         ref: "PI-2025-0201", change: +200,balance: 200, by: "Arjun Das",       notes: "Receipt from Lupin Ltd" },
  ],
  "BT-2026-0015": [
    { date: "2026-09-20 16:00", type: "Sale",        ref: "INV-2026-4110", change: -50, balance: 850, by: "Ravi Kumar",      notes: "OTC counter sale" },
    { date: "2026-09-01 10:00", type: "Sale",        ref: "INV-2026-3950", change: -60, balance: 900, by: "Anita Nair",      notes: "" },
    { date: "2026-07-20 13:30", type: "Sale",        ref: "INV-2026-3620", change: -40, balance: 960, by: "Meena Iyer",      notes: "" },
    { date: "2026-06-15 10:00", type: "Transfer Out",ref: "TRF-2026-0091", change: -50, balance: 1000,by: "Arjun Das",       notes: "To Branch - Indiranagar" },
    { date: "2026-04-05 08:00", type: "Purchase",         ref: "PI-2026-0121", change: +1000,balance: 1000,by: "Arjun Das",      notes: "Receipt from GSK Pharma" },
  ],
  "BT-2025-0090": [
    { date: "2026-02-10 14:00", type: "Sale",        ref: "INV-2026-2710", change: -30, balance: 95,  by: "Suresh Patel",    notes: "" },
    { date: "2026-01-05 11:00", type: "Sale",        ref: "INV-2026-2210", change: -80, balance: 125, by: "Ravi Kumar",      notes: "" },
    { date: "2025-12-10 10:00", type: "Sale",        ref: "INV-2025-3590", change: -100,balance: 205, by: "Anita Nair",      notes: "" },
    { date: "2025-10-01 13:00", type: "Sale",        ref: "INV-2025-2980", change: -80, balance: 305, by: "Meena Iyer",      notes: "" },
    { date: "2025-08-20 09:00", type: "Sale",        ref: "INV-2025-2620", change: -115,balance: 385, by: "Ravi Kumar",      notes: "" },
    { date: "2025-07-15 08:00", type: "Purchase",         ref: "PI-2025-0421", change: +500,balance: 500, by: "Arjun Das",       notes: "Receipt from GSK Pharma" },
  ],
  "BT-2026-0019": [
    { date: "2026-09-10 11:30", type: "Sale",        ref: "INV-2026-4010", change: -25, balance: 220, by: "Meena Iyer",      notes: "OTC sale" },
    { date: "2026-08-05 14:00", type: "Sale",        ref: "INV-2026-3730", change: -30, balance: 245, by: "Suresh Patel",    notes: "" },
    { date: "2026-06-20 10:00", type: "Sale",        ref: "INV-2026-3480", change: -25, balance: 275, by: "Anita Nair",      notes: "" },
    { date: "2026-05-10 08:00", type: "Purchase",         ref: "PI-2026-0151", change: +300,balance: 300, by: "Arjun Das",       notes: "Receipt from AstraZeneca" },
  ],
  "BT-2026-0022": [
    { date: "2026-09-18 09:50", type: "Sale",        ref: "INV-2026-4091", change: -15, balance: 160, by: "Dr. Priya Sharma",notes: "Prescription — Schedule H" },
    { date: "2026-09-01 13:10", type: "Sale",        ref: "INV-2026-3940", change: -10, balance: 175, by: "Dr. Priya Sharma",notes: "" },
    { date: "2026-08-10 10:00", type: "Sale",        ref: "INV-2026-3780", change: -15, balance: 185, by: "Anita Nair",      notes: "" },
    { date: "2026-07-01 08:00", type: "Purchase",         ref: "PI-2026-0211", change: +200,balance: 200, by: "Arjun Das",       notes: "Receipt from Pfizer India" },
  ],
  "BT-2025-0110": [
    { date: "2026-01-10 14:00", type: "Sale",        ref: "INV-2026-2290", change: -20, balance: 140, by: "Meena Iyer",      notes: "" },
    { date: "2025-12-20 10:30", type: "Sale",        ref: "INV-2025-3650", change: -30, balance: 160, by: "Ravi Kumar",      notes: "" },
    { date: "2025-12-01 09:00", type: "Sale",        ref: "INV-2025-3510", change: -20, balance: 190, by: "Suresh Patel",    notes: "" },
    { date: "2025-11-20 11:00", type: "Adjustment",  ref: "ADJ-2025-0098", change: -10, balance: 210, by: "Arjun Das",       notes: "Damaged packaging — 10 strips" },
    { date: "2025-11-01 08:00", type: "Purchase",         ref: "PI-2025-0501", change: +250,balance: 250, by: "Arjun Das",       notes: "Receipt from Zydus Cadila" },
  ],
  "BT-2026-0031": [
    { date: "2026-09-22 10:00", type: "Sale",        ref: "INV-2026-4118", change: -8,  balance: 72,  by: "Dr. Priya Sharma",notes: "Prescription sale" },
    { date: "2026-09-10 14:00", type: "Sale",        ref: "INV-2026-4009", change: -10, balance: 80,  by: "Anita Nair",      notes: "" },
    { date: "2026-08-20 11:00", type: "Sale",        ref: "INV-2026-3820", change: -10, balance: 90,  by: "Meena Iyer",      notes: "" },
    { date: "2026-08-01 08:00", type: "Purchase",         ref: "PI-2026-0281", change: +100,balance: 100, by: "Arjun Das",       notes: "Receipt from Cipla Ltd" },
  ],
};

const TX_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  "Purchase":      { bg: "#E8F5E9", color: "#2E7D32", dot: "#2E7D32" },
  "Sale":         { bg: "#EFF6FF", color: "#1B6CA8", dot: "#1B6CA8" },
  "Return":       { bg: "#F0F3F7", color: "#0C1B33", dot: "#6B7280" },
  "Adjustment":   { bg: "#FFF3E0", color: "#E65100", dot: "#E65100" },
  "Transfer Out": { bg: "#F5F3FF", color: "#6B21A8", dot: "#6B21A8" },
  "Transfer In":  { bg: "#E0F7F7", color: "#0C6E6E", dot: "#0C6E6E" },
  "Write-off":    { bg: "#FFEBEE", color: "#C62828", dot: "#C62828" },
  "Stock Count":  { bg: "#F0F3F7", color: "#374151", dot: "#9CA3AF" },
};

function BatchHistoryModal({ batch, drug, onClose }: {
  batch: typeof INV_BATCHES[0];
  drug: typeof drugs[0];
  onClose: () => void;
}) {
  const txs = BATCH_HISTORY[batch.id] ?? [];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const totalIn  = txs.filter(t => t.change > 0).reduce((s, t) => s + t.change, 0);
  const totalOut = txs.filter(t => t.change < 0).reduce((s, t) => s + t.change, 0);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 310 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 820, maxHeight: "88vh", display: "flex", flexDirection: "column", zIndex: 311, background: "#fff", borderRadius: 12, boxShadow: "0 8px 48px rgba(10,22,44,0.24)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "Outfit", fontSize: 17, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.01em" }}>Batch Transaction History</div>
              <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{drug.name}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#6B7280", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Batch identity chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {[
              { label: "Batch No",   value: batch.id },
              { label: "Expiry",     value: batch.expiry },
              { label: "Location",   value: batch.location },
              { label: "Distributor",   value: batch.supplier },
            ].map(c => (
              <div key={c.label} style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", borderRadius: 6, padding: "4px 10px", display: "flex", gap: 5, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{c.label}</span>
                <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{c.value}</span>
              </div>
            ))}
          </div>

          {/* Summary strip */}
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            {[
              { label: "Opening Stock", value: `${batch.qtyReceived} units`, color: "#0C1B33" },
              { label: "Total In",      value: `+${totalIn}`,               color: "#2E7D32" },
              { label: "Total Out",     value: `${totalOut}`,               color: "#C62828" },
              { label: "Current Stock", value: `${batch.qtyCurrent} units`, color: "#1B6CA8" },
            ].map(s => (
              <div key={s.label} style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", borderRadius: 8, padding: "8px 14px", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {txs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: "#9CA3AF" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div style={{ fontSize: 13, fontFamily: "Inter" }}>No transaction history found</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13, fontFamily: "Inter" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", position: "sticky" as const, top: 0, zIndex: 1 }}>
                  {["Date & Time", "Type", "Reference", "Change", "Balance", "Performed By", "Notes"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left" as const, fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.map((tx, i) => {
                  const s = TX_STYLE[tx.type] ?? TX_STYLE["Stock Count"];
                  const isPos = tx.change > 0;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #F0F3F7", background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFBFD")}>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" as const }}>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{tx.date.split(" ")[0]}</div>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#9CA3AF" }}>{tx.date.split(" ")[1]}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                          <span style={{ background: s.bg, color: s.color, padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const }}>{tx.type}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", fontWeight: 500 }}>{tx.ref}</span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" as const }}>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: isPos ? "#2E7D32" : "#C62828" }}>
                          {isPos ? "+" : ""}{tx.change}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" as const }}>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{tx.balance}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#6B7280", flexShrink: 0 }}>
                            {tx.by.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ color: "#1A2436", fontSize: 12 }}>{tx.by}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6B7280", fontSize: 12, maxWidth: 180 }}>
                        {tx.notes || <span style={{ color: "#D1D5DB" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #EEF1F6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFBFD" }}>
          <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
            {txs.length} transaction{txs.length !== 1 ? "s" : ""} · Closing balance:&nbsp;
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1B6CA8" }}>{batch.qtyCurrent} units</span>
          </div>
          <button onClick={onClose}
            style={{ padding: "8px 22px", borderRadius: 7, border: "none", background: "#1B6CA8", color: "#fff", fontSize: 13, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

const STOCK_COUNT_REASONS = ["Entry Error", "Damaged", "Expired", "Theft / Loss", "Transfer", "Adjustment", "Other"];

function StockCountModal({ drug, drugBatches, systemStock, onClose }: {
  drug: typeof drugs[0];
  drugBatches: typeof INV_BATCHES;
  systemStock: number;
  onClose: () => void;
}) {
  const [physicalCount, setPhysicalCount] = useState("");
  const [batchId, setBatchId] = useState(drugBatches.length > 0 ? drugBatches[0].id : "No batch");
  const [location, setLocation] = useState(drug.location);
  const [countDate, setCountDate] = useState("2026-08-30");
  const [reason, setReason] = useState("Entry Error");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const physical = physicalCount === "" ? null : Number(physicalCount);
  const validPhysical = physical !== null && !isNaN(physical) && physical >= 0;
  const variance = validPhysical ? (physical! - systemStock) : null;
  const hasVariance = variance !== null && variance !== 0;

  const varColor = variance === null ? "#9CA3AF" : variance > 0 ? "#2E7D32" : variance < 0 ? "#C62828" : "#1B6CA8";
  const varBg   = variance === null ? "#F0F3F7" : variance > 0 ? "#E8F5E9" : variance < 0 ? "#FFEBEE" : "#EFF6FF";
  const varText  = variance === null ? "—" : variance > 0 ? `+${variance}` : `${variance}`;
  const saveDisabled = !validPhysical;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 6, border: "1.5px solid #E8ECF4",
    fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff",
    color: "#0C1B33", minHeight: 40, boxSizing: "border-box",
  };
  function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = "#1B6CA8";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(27,108,168,0.08)";
  }
  function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = "#E8ECF4";
    e.currentTarget.style.boxShadow = "none";
  }

  if (saved) return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(10,22,44,0.22)", zIndex: 301, padding: "48px 40px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#2E7D32" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", marginBottom: 6 }}>Stock Count Saved</div>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
          {drug.name} · Physical: <span style={{ fontFamily: "JetBrains Mono", color: "#0C1B33" }}>{physicalCount}</span>
        </div>
        {variance !== null && variance !== 0 && (
          <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: varColor, marginBottom: 20 }}>Variance: {varText}</div>
        )}
        <button onClick={onClose} style={{ padding: "9px 28px", borderRadius: 6, border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Done</button>
      </div>
    </>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 520, maxHeight: "88vh", display: "flex", flexDirection: "column", zIndex: 301, background: "#fff", borderRadius: 10, boxShadow: "0 8px 40px rgba(10,22,44,0.22)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Add Stock Count</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{drug.name}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* System stock + Variance banner */}
        <div style={{ padding: "12px 20px", background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 3 }}>System Stock</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: "#1B6CA8" }}>{systemStock} <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7280" }}>{drug.unit}s</span></div>
          </div>
          <div style={{ width: 1, height: 36, background: "#E8ECF4" }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 3 }}>Physical Count</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: validPhysical ? "#0C1B33" : "#C4C9D4" }}>{validPhysical ? physicalCount : "—"} <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7280" }}>{drug.unit}s</span></div>
          </div>
          <div style={{ width: 1, height: 36, background: "#E8ECF4" }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 3 }}>Variance</div>
            <div style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 6, background: varBg }}>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: varColor }}>{varText}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Row 1: Physical Count + Batch */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>Physical Count <span style={{ color: "#E53935" }}>*</span></div>
              <input type="number" min="0" value={physicalCount} onChange={e => setPhysicalCount(e.target.value)}
                placeholder={`e.g. ${systemStock}`} style={{ ...inputStyle }}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>Batch</div>
              {drugBatches.length > 0 ? (
                <select value={batchId} onChange={e => setBatchId(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer", background: "#fff" }}>
                  {drugBatches.map(b => <option key={b.id} value={b.id}>{b.id} · Exp {b.expiry} · {b.qtyCurrent} units</option>)}
                </select>
              ) : (
                <input value="No batches tracked" disabled style={{ ...inputStyle, background: "#F8FAFC", color: "#9CA3AF" }} />
              )}
            </div>
          </div>

          {/* Row 2: Location + Count Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>Location / Bin</div>
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Rack A / Shelf 2" style={inputStyle}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>Count Date</div>
              <input type="date" value={countDate} onChange={e => setCountDate(e.target.value)}
                style={{ ...inputStyle, fontFamily: "JetBrains Mono" }}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>

          {/* Reason — only when variance exists */}
          {hasVariance && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>Reason for Variance</div>
              <select value={reason} onChange={e => setReason(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                {STOCK_COUNT_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 7 }}>Notes <span style={{ fontWeight: 400, color: "#C4C9D4" }}>(optional)</span></div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any remarks about this count…" rows={3}
              style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.6 }}
              onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Variance warning banner */}
          {hasVariance && (
            <div style={{ padding: "10px 14px", borderRadius: 6, background: variance! < 0 ? "#FFEBEE" : "#E8F5E9", border: `1px solid ${variance! < 0 ? "#FFCDD2" : "#A5D6A7"}`, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l7 14H1L8 1z" stroke={variance! < 0 ? "#C62828" : "#2E7D32"} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8 6v4M8 12v.5" stroke={variance! < 0 ? "#C62828" : "#2E7D32"} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 12, color: variance! < 0 ? "#C62828" : "#2E7D32", fontFamily: "Inter" }}>
                {variance! < 0
                  ? `${Math.abs(variance!)} unit${Math.abs(variance!) > 1 ? "s" : ""} less than system stock — please confirm reason before saving`
                  : `${variance} unit${variance! > 1 ? "s" : ""} more than system stock — surplus will be recorded`}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0, background: "#fff" }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1.5px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
            Cancel
          </button>
          <button onClick={() => !saveDisabled && setSaved(true)} disabled={saveDisabled}
            style={{ flex: 2, padding: "9px 0", borderRadius: 6, border: "none", background: saveDisabled ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: saveDisabled ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Save Count
          </button>
        </div>

      </div>
    </>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastState = { ok: boolean; msg: string } | null;

function Toast({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;

  return (
    <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 480, overflow: "hidden", background: toast.ok ? "#2E7D32" : "#C62828", boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
          {toast.ok ? (
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
          <span style={{ flex: 1, fontSize: 13, fontFamily: "Inter", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>{toast.msg}</span>
          <button onClick={onDone} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0 0 0 8px", flexShrink: 0, display: "flex", alignItems: "center" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 2s linear forwards" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Inventory View History Modal ─────────────────────────────────────────────

function seedRand(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function genDistHistory(drugName: string, distName: string, baseCost: number) {
  const seed = (drugName + distName).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = seedRand(seed);

  const PO_STATUSES  = ["Received", "Received", "Partially Received", "Received", "Cancelled", "Received", "Pending"];
  const RTN_REASONS  = ["Near Expiry", "Damaged", "Excess Stock", "Quality Issue", "Wrong Item"];
  const RTN_STATUSES = ["Credited", "Credited", "Pending", "Credited", "Rejected"];

  const rows: {
    ref: string; date: string; type: "Purchase" | "Return";
    orderedQty: number; receivedQty: number; pendingQty: number;
    returnQty: number; reason: string; credit: number;
    rate: number; amount: number; status: string;
  }[] = [];

  let dateMs = new Date("2026-08-18").getTime();
  const poCount  = 7 + Math.floor(rand() * 4);
  const rtnCount = 3 + Math.floor(rand() * 3);

  for (let i = 0; i < poCount; i++) {
    dateMs -= Math.floor(rand() * 30 + 12) * 86400000;
    const date = new Date(dateMs).toISOString().slice(0, 10);
    const orderedQty = Math.floor(rand() * 50 + 10);
    const status = PO_STATUSES[i % PO_STATUSES.length];
    const receivedQty = status === "Received" ? orderedQty : status === "Partially Received" ? Math.floor(orderedQty * (0.4 + rand() * 0.45)) : 0;
    const pendingQty  = status === "Cancelled" ? 0 : orderedQty - receivedQty;
    const rate   = parseFloat((baseCost * (0.85 + rand() * 0.18)).toFixed(2));
    const amount = parseFloat((orderedQty * rate).toFixed(2));
    rows.push({ ref: `PO-2026-${String(155 - i).padStart(4, "0")}`, date, type: "Purchase", orderedQty, receivedQty, pendingQty, returnQty: 0, reason: "", credit: 0, rate, amount, status });
  }

  let rtnDateMs = new Date("2026-07-20").getTime();
  for (let i = 0; i < rtnCount; i++) {
    rtnDateMs -= Math.floor(rand() * 40 + 15) * 86400000;
    const date     = new Date(rtnDateMs).toISOString().slice(0, 10);
    const returnQty = Math.floor(rand() * 15 + 2);
    const reason   = RTN_REASONS[i % RTN_REASONS.length];
    const status   = RTN_STATUSES[i % RTN_STATUSES.length];
    const rate     = parseFloat((baseCost * (0.9 + rand() * 0.1)).toFixed(2));
    const credit   = status === "Rejected" ? 0 : parseFloat((returnQty * rate).toFixed(2));
    rows.push({ ref: `RTN-2026-${String(20 + i).padStart(4, "0")}`, date, type: "Return", orderedQty: 0, receivedQty: 0, pendingQty: 0, returnQty, reason, credit, rate, amount: credit, status });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function InvViewHistoryModal({ drugName, distributorName, baseCost, onClose }: {
  drugName: string;
  distributorName: string;
  baseCost: number;
  onClose: () => void;
}) {
  const [search, setSearch]   = useState("");
  const [period, setPeriod]   = useState("All");
  const [typeFilter, setTypeFilter] = useState<"All" | "Purchase" | "Return">("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const PERIOD_OPTS = ["All", "Day", "Week", "Month", "Year"];
  const allRows = genDistHistory(drugName, distributorName, baseCost);

  const filtered = allRows.filter(r => {
    const matchType   = typeFilter === "All" || r.type === typeFilter;
    const matchSearch = !search || r.ref.toLowerCase().includes(search.toLowerCase());
    let matchPeriod   = true;
    if (period !== "All") {
      const diff = new Date("2026-08-30").getTime() - new Date(r.date).getTime();
      if (period === "Day")   matchPeriod = diff <= 86400000;
      if (period === "Week")  matchPeriod = diff <= 7 * 86400000;
      if (period === "Month") matchPeriod = diff <= 30 * 86400000;
      if (period === "Year")  matchPeriod = diff <= 365 * 86400000;
    }
    return matchType && matchSearch && matchPeriod;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalPurchases = allRows.filter(r => r.type === "Purchase").length;
  const totalReturns   = allRows.filter(r => r.type === "Return").length;
  const totalOrdered   = allRows.filter(r => r.type === "Purchase").reduce((s, r) => s + r.orderedQty, 0);
  const totalReturned  = allRows.filter(r => r.type === "Return").reduce((s, r) => s + r.returnQty, 0);

  const SC: Record<string, { bg: string; color: string }> = {
    Received:             { bg: "#E8F5E9", color: "#2E7D32" },
    "Partially Received": { bg: "#FFF3E0", color: "#E65100" },
    Cancelled:            { bg: "#FFEBEE", color: "#C62828" },
    Pending:              { bg: "#FFF8E1", color: "#E65100" },
    Credited:             { bg: "#E8F5E9", color: "#2E7D32" },
    Rejected:             { bg: "#FFEBEE", color: "#C62828" },
  };

  const pill = (label: string, custom?: { bg: string; color: string }) => {
    const s = custom ?? SC[label] ?? { bg: "#F5F5F5", color: "#6B7280" };
    return <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "Inter", padding: "3px 8px", borderRadius: 4, background: s.bg, color: s.color, whiteSpace: "nowrap" as const }}>{label}</span>;
  };

  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.07em", textTransform: "uppercase" as const, fontFamily: "Inter", textAlign: right ? "right" as const : "left" as const, borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" as const, background: "#F8FAFC" }}>{children}</th>
  );
  const TD = ({ children, mono, right, bold, color }: { children: React.ReactNode; mono?: boolean; right?: boolean; bold?: boolean; color?: string }) => (
    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: mono ? "JetBrains Mono" : "Inter", color: color ?? "#1A2436", fontWeight: bold ? 700 : 400, textAlign: right ? "right" as const : "left" as const, whiteSpace: "nowrap" as const }}>{children}</td>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 900, maxHeight: "90vh", display: "flex", flexDirection: "column", borderRadius: 10, border: "1px solid #E8ECF4", boxShadow: "0 8px 40px rgba(0,0,0,0.16)" }}>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Distributor History</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>{drugName} · {distributorName}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", display: "flex", alignItems: "center" }}><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          {[
            { label: "Total Purchases", value: String(totalPurchases), sub: `${totalOrdered} units ordered`,  color: "#1B6CA8" },
            { label: "Total Returns",   value: String(totalReturns),   sub: `${totalReturned} units returned`, color: "#E65100" },
            { label: "Net Qty",         value: `${totalOrdered - totalReturned}`, sub: "units net received",  color: "#2E7D32" },
            { label: "Avg Rate",        value: `₹${baseCost.toFixed(2)}`,         sub: "purchase cost / unit", color: "#0C1B33" },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ padding: "12px 16px", borderRight: i < arr.length - 1 ? "1px solid #EEF1F6" : "none", background: "#FAFBFD" }}>
              <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search ref…"
            style={{ width: 180, padding: "7px 10px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", color: "#0C1B33", outline: "none", flexShrink: 0 }} />
          <select value={period} onChange={e => { setPeriod(e.target.value); setPage(1); }}
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 13, fontFamily: "Inter", color: "#0C1B33", background: "#fff", cursor: "pointer", outline: "none", flexShrink: 0 }}>
            {PERIOD_OPTS.map(p => <option key={p} value={p}>{p === "All" ? "All Time" : `This ${p}`}</option>)}
          </select>
          <div style={{ display: "flex", gap: 4 }}>
            {(["All", "Purchase", "Return"] as const).map(t => (
              <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                style={{ padding: "6px 14px", borderRadius: 999, border: `1px solid ${typeFilter === t ? "#1B6CA8" : "#E8ECF4"}`, background: typeFilter === t ? "#EFF6FF" : "#fff", fontSize: 12, fontFamily: "Inter", fontWeight: typeFilter === t ? 600 : 400, color: typeFilter === t ? "#1B6CA8" : "#6B7280", cursor: "pointer" }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>
            {filtered.length} of {allRows.length} records
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No records match your filter.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <TH>Ref Number</TH>
                  <TH>Date</TH>
                  <TH>Type</TH>
                  <TH right>Ordered Qty</TH>
                  <TH right>Received Qty</TH>
                  <TH right>Pending</TH>
                  <TH right>Return Qty</TH>
                  <TH>Reason</TH>
                  <TH right>Rate</TH>
                  <TH right>Amount</TH>
                  <TH>Status</TH>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F4F6FA" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <TD mono color="#1B6CA8" bold>{r.ref}</TD>
                    <TD color="#6B7280">{r.date}</TD>
                    <td style={{ padding: "10px 12px" }}>
                      {pill(r.type, r.type === "Purchase" ? { bg: "#EFF6FF", color: "#1B6CA8" } : { bg: "#FFF3E0", color: "#E65100" })}
                    </td>
                    <TD mono right bold>{r.type === "Purchase" ? r.orderedQty : "—"}</TD>
                    <TD mono right color="#2E7D32" bold>{r.type === "Purchase" ? r.receivedQty : "—"}</TD>
                    <TD mono right color={r.pendingQty > 0 ? "#E65100" : "#9CA3AF"} bold>{r.type === "Purchase" ? r.pendingQty : "—"}</TD>
                    <TD mono right color="#E65100" bold>{r.type === "Return" ? r.returnQty : "—"}</TD>
                    <TD color="#6B7280">{r.reason || "—"}</TD>
                    <TD mono right>₹{r.rate.toFixed(2)}</TD>
                    <TD mono right bold>
                      {r.type === "Return" && r.credit === 0 ? "—" : `₹${r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                    </TD>
                    <td style={{ padding: "10px 12px" }}>{pill(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFBFD", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { label: "«", target: 1,           disabled: safePage === 1 },
              { label: "‹", target: safePage - 1, disabled: safePage === 1 },
              { label: "›", target: safePage + 1, disabled: safePage >= totalPages },
              { label: "»", target: totalPages,   disabled: safePage >= totalPages },
            ].map(b => (
              <button key={b.label} onClick={() => setPage(b.target)} disabled={b.disabled}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: b.disabled ? "default" : "pointer", color: b.disabled ? "#C8CDD8" : "#1A2436", fontSize: 12, fontFamily: "Inter", minWidth: 28 }}>
                {b.label}
              </button>
            ))}
            <span style={{ padding: "0 8px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{safePage} / {totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Place Order Modal ──────────────────────────────────────────────

type InvPoStep = "choose" | "existing" | "new";

function InvPlaceOrderModal({ drugName, distributorName, lastRate, onClose, onDone }: {
  drugName: string;
  distributorName: string;
  lastRate: number;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [step, setStep] = useState<InvPoStep>("choose");
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [rate, setRate] = useState(lastRate.toFixed(2));
  const [delivery, setDelivery] = useState("");
  const [payTerms, setPayTerms] = useState("Credit 30 Days");

  const openPOs = purchaseOrders
    .filter(o => o.status !== "Completed")
    .sort((a, b) => b.date.localeCompare(a.date));

  const cardWidth = step === "choose" ? 490 : step === "existing" ? 760 : 520;

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "8px 11px", borderRadius: 6, border: "1.5px solid #E8ECF4",
    fontSize: 13, fontFamily: "Inter", color: "#0C1B33", outline: "none", boxSizing: "border-box" as const,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.07em",
    textTransform: "uppercase" as const, fontFamily: "Inter", marginBottom: 4, display: "block",
  };

  const canSubmitExisting = !!selectedPoId && !!qty && Number(qty) >= 1;
  const canSubmitNew = !!qty && Number(qty) >= 1 && !!delivery;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: cardWidth, maxHeight: "88vh", display: "flex", flexDirection: "column", borderRadius: 10, border: "1px solid #E8ECF4", boxShadow: "0 8px 40px rgba(0,0,0,0.16)" }}>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {step !== "choose" && (
            <button onClick={() => { setStep("choose"); setSelectedPoId(null); }}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 18, lineHeight: 1, padding: "0 4px 0 0", flexShrink: 0 }}>‹</button>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
              {step === "choose" ? "Add to Purchase Order" : step === "existing" ? "Select Purchase Order" : "New Purchase Order"}
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>
              {drugName} · {distributorName}
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0 2px", flexShrink: 0, display: "flex", alignItems: "center" }}><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>

          {/* Step 1 — choose */}
          {step === "choose" && (
            <div style={{ display: "flex", gap: 12 }}>
              {[
                {
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="5" y="4" width="14" height="18" rx="2" stroke="#1B6CA8" strokeWidth="1.6"/>
                      <path d="M9 9h6M9 13h6M9 17h4" stroke="#1B6CA8" strokeWidth="1.4" strokeLinecap="round"/>
                      <circle cx="20" cy="19" r="5" fill="#E8F5E9" stroke="#2E7D32" strokeWidth="1.4"/>
                      <path d="M18 19l1.5 1.5L22 17" stroke="#2E7D32" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                  title: "Add to Existing PO",
                  desc: "Append this medicine to an open purchase order",
                  action: () => setStep("existing"),
                },
                {
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="5" y="4" width="14" height="18" rx="2" stroke="#1B6CA8" strokeWidth="1.6"/>
                      <path d="M12 10v6M9 13h6" stroke="#1B6CA8" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  ),
                  title: "Create New PO",
                  desc: "Start a fresh purchase order with this medicine",
                  action: () => setStep("new"),
                },
              ].map(opt => (
                <button key={opt.title} onClick={opt.action}
                  style={{ flex: 1, border: "1.5px solid #DDE3EC", borderRadius: 8, background: "#fff", cursor: "pointer", padding: "20px 16px", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F0F3F7")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  {opt.icon}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33", fontFamily: "Inter", marginBottom: 4 }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", lineHeight: 1.5 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2a — existing PO list */}
          {step === "existing" && (
            <div>
              {openPOs.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>
                  No open purchase orders found.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["PO Number", "Distributor", "Date", "Items", "Value", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.07em", textTransform: "uppercase" as const, fontFamily: "Inter", textAlign: h === "Value" ? "right" as const : "left" as const, borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openPOs.map(po => {
                      const isSel = selectedPoId === po.id;
                      return (
                        <tr key={po.id}
                          onClick={() => setSelectedPoId(isSel ? null : po.id)}
                          style={{ cursor: "pointer", background: isSel ? "#EFF6FF" : "#fff", borderLeft: isSel ? "3px solid #1B6CA8" : "3px solid transparent", borderBottom: "1px solid #F4F6FA" }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#F7F9FC"; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "#fff"; }}>
                          <td style={{ padding: "10px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{po.id}</td>
                          <td style={{ padding: "10px 10px", fontSize: 12, fontFamily: "Inter", color: "#1A2436" }}>{po.supplier}</td>
                          <td style={{ padding: "10px 10px", fontSize: 12, fontFamily: "Inter", color: "#6B7280" }}>{po.date}</td>
                          <td style={{ padding: "10px 10px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{po.items} items</td>
                          <td style={{ padding: "10px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 700, textAlign: "right" as const }}>₹{po.orderValue.toLocaleString("en-IN")}</td>
                          <td style={{ padding: "10px 10px" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "Inter", padding: "2px 8px", borderRadius: 4,
                              background: po.status === "Approved" ? "#EFF6FF" : po.status === "Partially Received" ? "#FFF3E0" : po.status === "Pending Approval" ? "#FFF8E1" : "#F5F5F5",
                              color: po.status === "Approved" ? "#1B6CA8" : po.status === "Partially Received" ? "#E65100" : po.status === "Pending Approval" ? "#E65100" : "#6B7280",
                            }}>{po.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {selectedPoId && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #EEF1F6" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436", fontFamily: "Inter", marginBottom: 12 }}>
                    Add to {selectedPoId}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Medicine</label>
                      <input value={drugName} readOnly style={{ ...fieldStyle, background: "#F8FAFC", color: "#9CA3AF" }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Qty</label>
                      <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={fieldStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Rate (₹)</label>
                      <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={fieldStyle} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2b — new PO */}
          {step === "new" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Medicine</label>
                  <input value={drugName} readOnly style={{ ...fieldStyle, background: "#F8FAFC", color: "#9CA3AF" }} />
                </div>
                <div>
                  <label style={labelStyle}>Distributor</label>
                  <input value={distributorName} readOnly style={{ ...fieldStyle, background: "#F8FAFC", color: "#9CA3AF" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Qty</label>
                  <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Purchase Rate (₹)</label>
                  <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Expected Delivery</label>
                  <input type="date" value={delivery} onChange={e => setDelivery(e.target.value)} style={fieldStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Payment Terms</label>
                <select value={payTerms} onChange={e => setPayTerms(e.target.value)} style={{ ...fieldStyle, appearance: "none" as const }}>
                  {PAYMENT_TERMS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "choose" && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
            <button onClick={onClose}
              style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
              Cancel
            </button>
            {step === "existing" && (
              <button
                disabled={!canSubmitExisting}
                onClick={() => { if (canSubmitExisting) onDone(`${drugName} added to ${selectedPoId}`); }}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: canSubmitExisting ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: canSubmitExisting ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Add to PO
              </button>
            )}
            {step === "new" && (
              <button
                disabled={!canSubmitNew}
                onClick={() => { if (canSubmitNew) onDone(`New PO created for ${distributorName}`); }}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: canSubmitNew ? "#1B6CA8" : "#C8CDD8", fontSize: 13, cursor: canSubmitNew ? "pointer" : "not-allowed", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Create PO
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Location Stock Modal ──────────────────────────────────────────────────────

function InvLocationStockModal({ drug, onClose }: { drug: typeof drugs[0]; onClose: () => void }) {
  const packStr = DRUG_PACK[drug.name] ?? "";
  const packMatch = packStr.match(/^(\d+)[^/]*\/\s*(.+)$/);
  const packSize = packMatch ? parseInt(packMatch[1]) : 1;
  const rawPackUnit = packMatch ? packMatch[2].trim() : drug.unit;
  const unitAlreadyPack = rawPackUnit.toLowerCase() === drug.unit.toLowerCase() ||
    rawPackUnit.toLowerCase() === drug.unit.toLowerCase().replace(/s$/, "");
  const packUnitShort = rawPackUnit
    .replace(/Inhaler/gi, "Inh").replace(/Bottle/gi, "Btl")
    .replace(/Strip/gi, "Str").replace(/Capsule/gi, "Cap").replace(/Tablet/gi, "Tab");
  function toPacks(qty: number) { return (packSize <= 1 || unitAlreadyPack) ? qty : Math.floor(qty / packSize); }

  const loc = DRUG_LOCATIONS[drug.name];
  const batches = INV_BATCHES.filter(b => b.drug === drug.name);
  const total = loc ? loc.slots.reduce((s, r) => s + r.qty, 0) : 0;
  const isCold = loc?.store === "Cold Store";

  function batchStatusStyle(status: string) {
    if (status === "Active")        return { bg: "#E8F5E9", color: "#2E7D32" };
    if (status === "Low")           return { bg: "#FFF3E0", color: "#E65100" };
    if (status === "Expiring Soon") return { bg: "#FFEBEE", color: "#C62828" };
    return { bg: "#F4F6FA", color: "#6B7280" };
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 8, width: 700, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E8ECF4", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Location Stock</span>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>—</span>
            <span style={{ fontSize: 13, color: "#1B6CA8", fontWeight: 600, fontFamily: "Inter" }}>{drug.name}</span>
            {loc && (
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: isCold ? "#EFF6FF" : "#F0F3F7", color: isCold ? "#1B6CA8" : "#6B7280", border: `1px solid ${isCold ? "#BFDBFE" : "#DDE3EC"}`, letterSpacing: "0.04em" }}>
                {isCold ? "COLD STORE" : "MAIN STORE"}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E8ECF4", borderRadius: 4, background: "#fff", cursor: "pointer" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Section 1: Storage Locations */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Storage Locations</div>
            {(!loc || loc.slots.length === 0) ? (
              <div style={{ padding: "24px 0", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No location data available for this medicine</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13, border: "1px solid #EEF1F6", borderRadius: 6, overflow: "hidden" as const }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["SLOT / POSITION", "DISTRIBUTION", "QTY", "SHARE"].map((h, i) => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: (i === 0 || i === 1 ? "left" : "right") as "left" | "right", fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loc.slots.map((slot, i, arr) => {
                    const pct = total > 0 ? (slot.qty / total) * 100 : 0;
                    return (
                      <tr key={slot.name} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                        <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, color: "#1A2436", fontWeight: 600 }}>{slot.name}</td>
                        <td style={{ padding: "11px 14px", width: 200 }}>
                          <div style={{ height: 7, background: "#EEF1F6", borderRadius: 4, overflow: "hidden" as const }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: isCold ? "#00ACC1" : "#1B6CA8", borderRadius: 4, transition: "width 0.3s" }} />
                          </div>
                        </td>
                        <td style={{ padding: "11px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33", whiteSpace: "nowrap" as const }}>
                          {toPacks(slot.qty)} <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span>
                        </td>
                        <td style={{ padding: "11px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#F8FAFC", borderTop: "2px solid #EEF1F6" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1A2436", fontSize: 13 }}>Total</td>
                    <td />
                    <td style={{ padding: "10px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33", fontSize: 14, whiteSpace: "nowrap" as const }}>
                      {toPacks(total)} <span style={{ fontSize: 12, fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontSize: 12, color: "#9CA3AF" }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Section 2: Batch Breakdown */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>
              Batch Breakdown <span style={{ fontSize: 10, fontWeight: 400, color: "#C8CDD8", marginLeft: 4 }}>({batches.length} batch{batches.length !== 1 ? "es" : ""})</span>
            </div>
            {batches.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No batch records found</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13, border: "1px solid #EEF1F6" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["BATCH ID", "RACK / LOCATION", "QTY", "EXPIRY", "STATUS"].map((h, i) => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: (i === 2 ? "right" : "left") as "left" | "right", fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, i, arr) => {
                    const { bg, color } = batchStatusStyle(b.status);
                    const expStr = new Date(b.expiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                    return (
                      <tr key={b.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                        <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", fontWeight: 600 }}>{b.id}</td>
                        <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{b.location}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33", whiteSpace: "nowrap" as const }}>
                          {toPacks(b.qtyCurrent)} <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span>
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{expStr}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg, color }}>{b.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Expiry Risk Modal ─────────────────────────────────────────────────────────

function InvExpiryRiskModal({ drug, onClose }: { drug: typeof drugs[0]; onClose: () => void }) {
  const today = new Date("2026-08-30");
  const packStr = DRUG_PACK[drug.name] ?? "";
  const packMatch = packStr.match(/^(\d+)[^/]*\/\s*(.+)$/);
  const packSize = packMatch ? parseInt(packMatch[1]) : 1;
  const rawPackUnit = packMatch ? packMatch[2].trim() : drug.unit;
  const unitAlreadyPack = rawPackUnit.toLowerCase() === drug.unit.toLowerCase() ||
    rawPackUnit.toLowerCase() === drug.unit.toLowerCase().replace(/s$/, "");
  const packUnitShort = rawPackUnit
    .replace(/Inhaler/gi, "Inh").replace(/Bottle/gi, "Btl")
    .replace(/Strip/gi, "Str").replace(/Capsule/gi, "Cap").replace(/Tablet/gi, "Tab");
  function toPacks(qty: number) { return (packSize <= 1 || unitAlreadyPack) ? qty : Math.floor(qty / packSize); }

  const batches = INV_BATCHES.filter(b => b.drug === drug.name);
  const sorted  = [...batches].sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());

  function dLeft(expiry: string) { return Math.floor((new Date(expiry).getTime() - today.getTime()) / 86400000); }

  const grpHealthy = batches.filter(b => dLeft(b.expiry) > 90);
  const grpNear90  = batches.filter(b => { const d = dLeft(b.expiry); return d > 30 && d <= 90; });
  const grpNear30  = batches.filter(b => { const d = dLeft(b.expiry); return d > 0 && d <= 30; });
  const grpExpired = batches.filter(b => dLeft(b.expiry) <= 0);

  const totalQty    = batches.reduce((s, b) => s + b.qtyCurrent, 0);
  const valueAtRisk = batches.filter(b => dLeft(b.expiry) <= 90).reduce((s, b) => s + b.qtyCurrent * b.purchasePrice, 0);

  const bands = [
    { label: "Healthy",     desc: "> 90 days",    grp: grpHealthy, color: "#2E7D32", bg: "#E8F5E9", border: "#A5D6A7" },
    { label: "Near Expiry", desc: "30 – 90 days",  grp: grpNear90,  color: "#E65100", bg: "#FFF3E0", border: "#FFCC80" },
    { label: "Critical",    desc: "< 30 days",    grp: grpNear30,  color: "#C62828", bg: "#FFEBEE", border: "#FFCDD2" },
    { label: "Expired",     desc: "Past expiry",  grp: grpExpired, color: grpExpired.length > 0 ? "#C62828" : "#9CA3AF", bg: grpExpired.length > 0 ? "#FFEBEE" : "#F4F6FA", border: grpExpired.length > 0 ? "#FFCDD2" : "#EEF1F6" },
  ];

  function daysChip(d: number) {
    if (d <= 0) return { text: "Expired",    color: "#C62828", bg: "#FFEBEE" };
    if (d <= 30) return { text: `${d}d left`, color: "#C62828", bg: "#FFEBEE" };
    if (d <= 90) return { text: `${d}d left`, color: "#E65100", bg: "#FFF3E0" };
    return           { text: `${d}d left`, color: "#2E7D32", bg: "#E8F5E9" };
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 8, width: 740, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>

        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E8ECF4", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Expiry Risk</span>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>—</span>
            <span style={{ fontSize: 13, color: "#1B6CA8", fontWeight: 600, fontFamily: "Inter" }}>{drug.name}</span>
            {valueAtRisk > 0 && (
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" }}>
                ₹{valueAtRisk.toLocaleString("en-IN", { maximumFractionDigits: 0 })} at risk
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E8ECF4", borderRadius: 4, background: "#fff", cursor: "pointer" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Section 1: Summary bands */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Expiry Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              {bands.map(band => {
                const qty = band.grp.reduce((s, b) => s + b.qtyCurrent, 0);
                const val = band.grp.reduce((s, b) => s + b.qtyCurrent * b.purchasePrice, 0);
                return (
                  <div key={band.label} style={{ border: `1px solid ${band.border}`, borderRadius: 6, padding: "12px 14px", background: band.bg }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: band.color, marginBottom: 2 }}>{band.label}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 10 }}>{band.desc}</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: band.color, lineHeight: 1 }}>{toPacks(qty)}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", marginTop: 3 }}>{packUnitShort}</div>
                    <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: qty > 0 ? band.color : "#9CA3AF", marginTop: 10, fontWeight: 600 }}>
                      ₹{val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Batch detail table */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>
              Batch Detail
              <span style={{ fontSize: 10, fontWeight: 400, color: "#C8CDD8", marginLeft: 6 }}>sorted by expiry — soonest first</span>
            </div>
            {sorted.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center" as const, color: "#9CA3AF", fontSize: 13 }}>No batch records found</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13, border: "1px solid #EEF1F6" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {(["BATCH ID", "LOCATION", "QTY", "EXPIRY DATE", "DAYS LEFT", "VALUE"] as const).map((h, i) => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: ([2, 4, 5].includes(i) ? "right" : "left") as "left" | "right", fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b, i, arr) => {
                    const d  = dLeft(b.expiry);
                    const dc = daysChip(d);
                    const expStr = new Date(b.expiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                    return (
                      <tr key={b.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                        <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", fontWeight: 600 }}>{b.id}</td>
                        <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{b.location}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33", whiteSpace: "nowrap" as const }}>
                          {toPacks(b.qtyCurrent)} <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span>
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{expStr}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" as const }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: dc.bg, color: dc.color, fontFamily: "JetBrains Mono" }}>{dc.text}</span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: d <= 90 ? 600 : 400, color: d <= 90 ? "#C62828" : "#6B7280" }}>
                          ₹{(b.qtyCurrent * b.purchasePrice).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#F8FAFC", borderTop: "2px solid #EEF1F6" }}>
                    <td colSpan={2} style={{ padding: "10px 14px", fontWeight: 700, color: "#1A2436", fontSize: 13 }}>Total</td>
                    <td style={{ padding: "10px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33", fontSize: 14, whiteSpace: "nowrap" as const }}>
                      {toPacks(totalQty)} <span style={{ fontSize: 12, fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span>
                    </td>
                    <td colSpan={2} style={{ padding: "10px 14px", textAlign: "right" as const, fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>Value at Risk</td>
                    <td style={{ padding: "10px 14px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13, color: valueAtRisk > 0 ? "#C62828" : "#2E7D32" }}>
                      ₹{valueAtRisk.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Drug Detail Page ──────────────────────────────────────────────────────────

function DrugDetailPage({ drug, onBack, onEdit, isDeactivated, onActivate, onDeactivate, onShortBook, onEditDistributor }: {
  drug: typeof drugs[0];
  onBack: () => void;
  onEdit: () => void;
  isDeactivated: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onShortBook: () => void;
  onEditDistributor?: (name: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "batches" | "suppliers" | "movement" | "sales" | "purchase-history" | "sale-history" | "audit">("overview");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showStockCount, setShowStockCount] = useState(false);
  const [showAddBatch,  setShowAddBatch]  = useState(false);
  const [adjustBatch,   setAdjustBatch]   = useState<typeof INV_BATCHES[0] | null>(null);
  const [transferBatch, setTransferBatch] = useState<typeof INV_BATCHES[0] | null>(null);
  const [historyBatch,  setHistoryBatch]  = useState<typeof INV_BATCHES[0] | null>(null);
  const [printLabelBatch, setPrintLabelBatch] = useState<typeof INV_BATCHES[0] | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [batchSearch, setBatchSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<"All" | "Available" | "Near Expiry" | "Quarantine" | "Blocked">("All");
  const [openBatchMenu, setOpenBatchMenu] = useState<string | null>(null);
  const [batchMenuPos, setBatchMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(10);
  const [movSearch, setMovSearch] = useState("");
  const [movFilter, setMovFilter] = useState<"All" | "Purchase" | "Sale" | "Sale Return" | "Transfer In" | "Transfer Out" | "Adjustment" | "Expiry" | "Return to Distributor">("All");
  const [movPeriod, setMovPeriod] = useState<"All" | "Daily" | "Weekly" | "Monthly" | "Yearly">("Monthly");
  const [movPeriodOpen, setMovPeriodOpen] = useState(false);
  const [movPeriodPos, setMovPeriodPos] = useState<{ top: number; right: number } | null>(null);
  const [movPage, setMovPage] = useState(1);
  const [movPageSize, setMovPageSize] = useState(10);
  const [phSearch, setPhSearch] = useState("");
  const [phPeriod, setPhPeriod] = useState("All Periods");
  const [phType, setPhType] = useState("All Types");
  const [phStatus, setPhStatus] = useState("All");
  const [phPage, setPhPage] = useState(1);
  const [phPageSize, setPhPageSize] = useState(10);
  const [shSearch, setShSearch] = useState("");
  const [shPeriod, setShPeriod] = useState("All Periods");
  const [shType, setShType] = useState("All Types");
  const [shStatus, setShStatus] = useState("All");
  const [shPage, setShPage] = useState(1);
  const [shPageSize, setShPageSize] = useState(10);
  const [suppSearch, setSuppSearch] = useState("");
  const [suppFilter, setSuppFilter] = useState<"All" | "Preferred" | "Active" | "Inactive">("All");
  const [suppPage, setSuppPage] = useState(1);
  const [suppPageSize, setSuppPageSize] = useState(10);
  const [openSuppMenu, setOpenSuppMenu] = useState<string | null>(null);
  const [suppMenuPos, setSuppMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [placeOrderDist, setPlaceOrderDist] = useState<{ name: string; lastRate: number } | null>(null);
  const [viewHistoryDist, setViewHistoryDist] = useState<string | null>(null);
  const [showLocationStock, setShowLocationStock] = useState(false);
  const [showExpiryRisk, setShowExpiryRisk] = useState(false);
  const [suppList, setSuppList] = useState(() => DRUG_SUPPLIERS[drug.name] ?? []);
  const qaRef = useRef<HTMLDivElement>(null);

  const today = new Date("2026-08-30");
  const daysRemaining = Math.floor((new Date(drug.expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const avgDailySale = Math.max(1, Math.round(drug.minStock / 30));
  const reserved = drug.status === "Low Stock" ? Math.floor(drug.stock * 0.05) : 0;
  const damaged = 0;
  const quarantine = 0;
  const blocked = 0;
  const available = Math.max(0, drug.stock - reserved - damaged - quarantine - blocked);
  const openPO = 50;
  const daysOfStock = Math.round(available / avgDailySale);
  const stockValue = drug.stock * drug.cost;
  const margin = drug.price > 0 ? ((drug.price - drug.cost) / drug.price * 100) : 0;
  const risk = daysRemaining < 90 ? "High" : daysRemaining < 180 ? "Medium" : "Low";
  const riskColor = risk === "High" ? "#C62828" : risk === "Medium" ? "#E65100" : "#2E7D32";
  const expectedStock = available + openPO;
  const safetyStock = Math.floor(drug.minStock * 0.5);
  const drugBatches = INV_BATCHES.filter(b => b.drug === drug.name);
  const barcode = `8901234${drug.id.toString().padStart(7, "0")}`;
  const statusBg = drug.status === "In Stock" ? "#E8F5E9" : drug.status === "Low Stock" ? "#FFF3E0" : "#FFEBEE";
  const statusColor = drug.status === "In Stock" ? "#2E7D32" : drug.status === "Low Stock" ? "#E65100" : "#C62828";

  const packStr = DRUG_PACK[drug.name] ?? "";
  const packMatch = packStr.match(/^(\d+)[^/]*\/\s*(.+)$/);
  const packSize = packMatch ? parseInt(packMatch[1]) : 1;
  const rawPackUnit = packMatch ? packMatch[2].trim() : drug.unit;
  const unitAlreadyPack = rawPackUnit.toLowerCase() === drug.unit.toLowerCase() ||
    rawPackUnit.toLowerCase() === drug.unit.toLowerCase().replace(/s$/, "");
  const packUnitShort = rawPackUnit
    .replace(/Inhaler/gi, "Inh").replace(/Bottle/gi, "Btl")
    .replace(/Strip/gi, "Str").replace(/Capsule/gi, "Cap").replace(/Tablet/gi, "Tab");
  function toPacks(qty: number) {
    return (packSize <= 1 || unitAlreadyPack) ? qty : Math.floor(qty / packSize);
  }

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (qaRef.current && !qaRef.current.contains(e.target as Node)) setShowQuickActions(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!openBatchMenu) return;
    function closeBatchMenu() { setOpenBatchMenu(null); setBatchMenuPos(null); }
    document.addEventListener("mousedown", closeBatchMenu);
    return () => document.removeEventListener("mousedown", closeBatchMenu);
  }, [openBatchMenu]);

  useEffect(() => {
    if (!openSuppMenu) return;
    function closeSuppMenu() { setOpenSuppMenu(null); setSuppMenuPos(null); }
    document.addEventListener("mousedown", closeSuppMenu);
    return () => document.removeEventListener("mousedown", closeSuppMenu);
  }, [openSuppMenu]);

  useEffect(() => {
    if (!movPeriodOpen) return;
    function closeMovPeriod() { setMovPeriodOpen(false); setMovPeriodPos(null); }
    document.addEventListener("mousedown", closeMovPeriod);
    return () => document.removeEventListener("mousedown", closeMovPeriod);
  }, [movPeriodOpen]);

  function batchHealth(expiry: string) {
    const d = Math.floor((new Date(expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (d <= 0) return { label: "Expired", color: "#C62828", icon: "" };
    if (d <= 180) return { label: "Near Expiry", color: "#E65100", icon: "!" };
    return { label: "Healthy", color: "#2E7D32", icon: "" };
  }

  const nearExpiryBatch = drugBatches.find(b => {
    const d = Math.floor((new Date(b.expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return d > 0 && d <= 180;
  });
  const insights: { icon: string; ok: boolean; text: string }[] = [
    ...(nearExpiryBatch ? [{ icon: "!", ok: false, text: `${toPacks(nearExpiryBatch.qtyCurrent)} ${packUnitShort} may reach expiry before expected sale` }] : []),
    { icon: "+", ok: true, text: `Open PO of ${toPacks(openPO)} ${packUnitShort} already arriving` },
    ...(drugBatches.length > 0 ? [{ icon: "+", ok: true, text: `${drugBatches[0].supplier} currently offers lowest effective cost` }] : []),
    ...(nearExpiryBatch ? [{ icon: "!", ok: false, text: `Batch ${nearExpiryBatch.id} has higher expiry risk` }] : []),
  ];

  const kpiRow1 = [
    { label: "Total Stock",   value: toPacks(drug.stock).toString(), sub: packUnitShort, color: "#0C1B33" },
    { label: "Available",     value: toPacks(available).toString(),  sub: packUnitShort, color: "#2E7D32" },
    { label: "Reserved",      value: toPacks(reserved).toString(),   sub: packUnitShort, color: "#1B6CA8" },
    { label: "Open PO",       value: toPacks(openPO).toString(),     sub: packUnitShort, color: "#6B21A8" },
    { label: "Days of Stock", value: daysOfStock.toString(), sub: "days", color: daysOfStock < 14 ? "#C62828" : daysOfStock < 30 ? "#E65100" : "#0C1B33" },
  ];
  const kpiRow2 = [
    { label: "Stock Value", value: `₹${stockValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, mono: true, color: "#0C1B33", dot: false },
    { label: "Avg Cost",    value: `₹${drug.cost.toFixed(2)}`, mono: true, color: "#0C1B33", dot: false },
    { label: "MRP",         value: `₹${drug.price.toFixed(0)}`, mono: true, color: "#0C1B33", dot: false },
    { label: "Margin",      value: `${margin.toFixed(1)}%`,     mono: false, color: margin >= 25 ? "#2E7D32" : "#E65100", dot: false },
    { label: "Risk",        value: risk,                         mono: false, color: riskColor, dot: true },
  ];

  const DETAIL_TABS = [
    { key: "overview", label: "Overview" }, { key: "batches", label: "Batches" },
    { key: "suppliers", label: "Distributors" }, { key: "movement", label: "Movement" },
    { key: "sales", label: "Sales & Demand" }, { key: "purchase-history", label: "Purchase History" },
    { key: "sale-history", label: "Sale History" }, { key: "audit", label: "Audit" },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: "#F8FAFC" }}>

      {/* Nav bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EEF1F6", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", padding: 0, width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>Stock</span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>Medicine Details</span>
        </div>
      </div>

      {/* Hero section */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EEF1F6", padding: "14px 24px", flexShrink: 0 }}>
        {/* Line 1: Name + Status + Clinical chips + Quick Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, minWidth: 0 }}>
            <div style={{ fontFamily: "Outfit", fontSize: 19, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em", whiteSpace: "nowrap" as const }}>{drug.name}</div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: statusBg, color: statusColor, flexShrink: 0 }}>
              {drug.status === "In Stock" ? "Active" : drug.status}
            </span>
            {(() => {
              const rx = DRUG_PRESCRIPTION[drug.name] ?? "OTC";
              const rc = rx === "OTC" ? "#2E7D32" : rx === "Schedule H" ? "#1B6CA8" : rx === "Schedule H1" ? "#E65100" : "#C62828";
              const rb = rx === "OTC" ? "#E8F5E9" : rx === "Schedule H" ? "#EFF6FF" : rx === "Schedule H1" ? "#FFF3E0" : "#FFEBEE";
              const required = rx !== "OTC";
              const s = DRUG_STORAGE[drug.name] ?? { label: "15–30°C", icon: "", color: "#2E7D32", bg: "#E8F5E9" };
              return (
                <>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: rb, color: rc, flexShrink: 0 }}>{rx}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: required ? "#FFEBEE" : "#E8F5E9", color: required ? "#C62828" : "#2E7D32", flexShrink: 0 }}>
                    {required ? "Rx Required" : "No Rx Needed"}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0 }}>{s.icon} {s.label}</span>
                </>
              );
            })()}
          </div>
          <div ref={qaRef} style={{ position: "relative", flexShrink: 0 }}>
            <button onClick={() => setShowQuickActions(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 13, fontFamily: "Inter", fontWeight: 600, cursor: "pointer", minHeight: 40, boxSizing: "border-box" as const }}
              onMouseEnter={e => (e.currentTarget.style.background = "#155A8A")}
              onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}><path d="M7 1L2 7h5l-2 4 5-6H5l2-4Z" fill="#fff"/></svg>
              Quick Actions
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ transform: showQuickActions ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                <path d="M1 3l4 4 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showQuickActions && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 4px 16px rgba(12,27,51,0.10)", zIndex: 200, minWidth: 200 }}>
                {([
                  { label: "Edit Medicine",   color: "#1B6CA8", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg>, action: () => { onEdit(); setShowQuickActions(false); } },
                  { label: "Add Batch",       color: "#2E7D32", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="1"/><path d="M8 5v6M5 8h6"/></svg>, action: () => { setShowAddBatch(true); setShowQuickActions(false); } },
                  { label: "Short Book",      color: "#7B1FA2", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="10" height="12" rx="1"/><path d="M6 5h4M6 8h4M6 11h2"/></svg>, action: () => { onShortBook(); setShowQuickActions(false); } },
                  { label: "Print Label",     color: "#0C1B33", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="6" width="10" height="7" rx="1"/><path d="M5 6V3h6v3"/><circle cx="12" cy="9" r="0.8" fill="currentColor" stroke="none"/></svg>, action: () => { setPrintLabelBatch(drugBatches[0] ?? null); setShowQuickActions(false); } },
                  isDeactivated
                    ? { label: "Activate",   color: "#2E7D32", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M5.5 8l2 2 3-3"/></svg>, action: () => { onActivate(); setShowQuickActions(false); } }
                    : { label: "Deactivate", color: "#E65100", icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/></svg>, action: () => { onDeactivate(); setShowQuickActions(false); } },
                ] as { label: string; color: string; icon: React.ReactNode; action: () => void }[]).map((item, i, arr) => (
                  <button key={item.label} onClick={item.action}
                    style={{ width: "100%", textAlign: "left" as const, padding: "9px 16px", border: "none", background: "#fff", cursor: "pointer", fontSize: 13, color: item.color, fontFamily: "Inter", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none", display: "flex", alignItems: "center", gap: 9 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Line 2: Form · Manufacturer · Barcode */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 3, fontSize: 12, color: "#6B7280" }}>
          <span>{DRUG_DOSAGE_FORM[drug.name] ?? drug.unit}</span>
          <span style={{ margin: "0 6px", color: "#DDE3EC" }}>·</span>
          <span>{DRUG_MANUFACTURER[drug.name] ?? drug.supplier}</span>
        </div>

        {/* Line 3: Category + Indication */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" as const }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 4, background: "#EFF6FF", color: "#1B6CA8", border: "1px solid #BFDBFE" }}>{drug.category}</span>
          <span style={{ color: "#DDE3EC", fontSize: 13 }}>·</span>
          <span style={{ fontSize: 12, color: "#6B7280" }}>{DRUG_INDICATIONS[drug.name] ?? ""}</span>
        </div>

        {/* Line 4: Side Effects */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" as const }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1A2436", letterSpacing: "0.08em", textTransform: "uppercase" as const, flexShrink: 0 }}>Side Effects</span>
          {(DRUG_SIDE_EFFECTS[drug.name] ?? []).map(se => (
            <span key={se} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#FFF3E0", color: "#C2410C", border: "1px solid #FED7AA", fontFamily: "Inter" }}>{se}</span>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EEF1F6", display: "flex", paddingLeft: 8, flexShrink: 0 }}>
        {DETAIL_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            style={{ padding: "11px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? "#1B6CA8" : "#6B7280", borderBottom: tab === t.key ? "2px solid #1B6CA8" : "2px solid transparent", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={(tab === "batches" || tab === "suppliers" || tab === "movement") ? { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "16px 20px" } : { flex: 1, overflowY: "auto" as const, padding: "16px 20px" }}>

        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Row: Stock Distribution + Stock Health */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Stock Distribution</div>
                <div style={{ padding: "4px 0" }}>
                  {([
                    { label: "Available",  value: available,  color: "#2E7D32" },
                    { label: "Reserved",   value: reserved,   color: "#1B6CA8" },
                    { label: "Damaged",    value: damaged,    color: "#C62828" },
                    { label: "Quarantine", value: quarantine, color: "#E65100" },
                    { label: "Blocked",    value: blocked,    color: "#6B7280" },
                  ] as { label: string; value: number; color: string }[]).map((row, i, arr) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0 }}></span>
                        <span style={{ fontSize: 13, color: "#6B7280" }}>{row.label}</span>
                      </div>
                      <span style={{ fontSize: 15, fontFamily: "JetBrains Mono", fontWeight: 700, color: row.value > 0 ? row.color : "#9CA3AF" }}>{toPacks(row.value)} <span style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Stock Health</div>
                <div style={{ padding: "4px 0" }}>
                  {([
                    { label: "Daily Sales",    value: `${toPacks(avgDailySale)} ${packUnitShort}/day` },
                    { label: "Reorder Level",  value: `${toPacks(drug.minStock)} ${packUnitShort}` },
                    { label: "Safety Stock",   value: `${toPacks(safetyStock)} ${packUnitShort}` },
                    { label: "Open PO",        value: `${toPacks(openPO)} ${packUnitShort}` },
                    { label: "Expected Stock", value: `${toPacks(expectedStock)} ${packUnitShort}` },
                  ] as { label: string; value: string }[]).map((row, i, arr) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                      <span style={{ fontSize: 13, color: "#6B7280" }}>{row.label}</span>
                      <span style={{ fontSize: 15, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#0C1B33" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Low Stock Alert Card */}
            {(drug.status === "Low Stock" || drug.status === "Out of Stock") && (
              <div style={{ background: "#fff", border: "1px solid #FED7AA" }}>
                {/* Header */}
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #FED7AA", background: "#FFF7ED", display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 12H1L7 1Z" stroke="#C2410C" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 5v3M7 10v.5" stroke="#C2410C" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#C2410C", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Low Stock</span>
                </div>
                {/* Rows */}
                <div style={{ padding: "4px 0" }}>
                  {([
                    { label: "Current Available", value: toPacks(available).toString(), unit: packUnitShort, color: available === 0 ? "#C62828" : "#E65100" },
                    { label: "Daily Sales",        value: toPacks(avgDailySale).toString(), unit: `${packUnitShort}/day`, color: "#0C1B33" },
                    { label: "Days of Stock",      value: daysOfStock.toString(), unit: "days", color: daysOfStock <= 3 ? "#C62828" : "#E65100" },
                  ].map((row, i) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #FEF3C7" }}>
                      <span style={{ fontSize: 13, color: "#6B7280" }}>{row.label}</span>
                      <span style={{ fontSize: 15, fontFamily: "JetBrains Mono", fontWeight: 700, color: row.color }}>
                        {row.value} <span style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 400, color: "#9CA3AF" }}>{row.unit}</span>
                      </span>
                    </div>
                  )))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #F4F6FA" }}>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>Open PO</span>
                    <span style={{ fontSize: 15, fontFamily: "JetBrains Mono", fontWeight: 700, color: openPO === 0 ? "#C62828" : "#2E7D32" }}>
                      {toPacks(openPO)} <span style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span>
                    </span>
                  </div>
                </div>
                {/* Action buttons */}
                <div style={{ padding: "12px 16px", display: "flex", gap: 8, borderTop: "1px solid #FED7AA", background: "#FFFBF7" }}>
                  <button style={{ flex: 1, padding: "8px 0", border: "1px solid #FED7AA", background: "#fff", color: "#C2410C", fontSize: 12, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FFF7ED")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    Add to Short Book
                  </button>
                  <button style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: "#1B6CA8", color: "#fff", fontSize: 12, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#155A8A")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>
                    Create PO
                  </button>
                </div>
              </div>
            )}

            {/* Row: Location Summary + Expiry Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Stock by Location */}
              {(() => {
                const loc = DRUG_LOCATIONS[drug.name];
                if (!loc || loc.slots.length === 0) return <div />;
                const total = loc.slots.reduce((s, r) => s + r.qty, 0);
                return (
                  <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Stock by Location</span>
                    </div>
                    <div style={{ padding: "10px 16px 4px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", marginBottom: 8 }}>{loc.store}</div>
                      {loc.slots.map((slot, i, arr) => (
                        <div key={slot.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                          <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "JetBrains Mono" }}>{slot.name}</span>
                          <span style={{ fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33" }}>{toPacks(slot.qty)}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 8px", borderTop: "1px solid #EEF1F6", marginTop: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Total</span>
                        <span style={{ fontSize: 15, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33" }}>{toPacks(total)}</span>
                      </div>
                    </div>
                    <div style={{ padding: "10px 16px 14px" }}>
                      <button onClick={() => setShowLocationStock(true)} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8", fontSize: 12, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                        View Location Stock
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Expiry Status */}
              {(() => {
                const healthy  = drugBatches.filter(b => Math.floor((new Date(b.expiry).getTime() - today.getTime()) / 86400000) > 90).reduce((s, b) => s + b.qtyCurrent, 0);
                const near90   = drugBatches.filter(b => { const d = Math.floor((new Date(b.expiry).getTime() - today.getTime()) / 86400000); return d > 30 && d <= 90; }).reduce((s, b) => s + b.qtyCurrent, 0);
                const near30   = drugBatches.filter(b => { const d = Math.floor((new Date(b.expiry).getTime() - today.getTime()) / 86400000); return d > 0 && d <= 30; }).reduce((s, b) => s + b.qtyCurrent, 0);
                const expired  = drugBatches.filter(b => Math.floor((new Date(b.expiry).getTime() - today.getTime()) / 86400000) <= 0).reduce((s, b) => s + b.qtyCurrent, 0);
                const valueAtRisk = drugBatches
                  .filter(b => Math.floor((new Date(b.expiry).getTime() - today.getTime()) / 86400000) <= 90)
                  .reduce((s, b) => s + b.qtyCurrent * b.purchasePrice, 0);
                const rows = [
                  { label: "Healthy",    value: healthy, color: "#2E7D32" },
                  { label: "30–90 days", value: near90,  color: "#E65100" },
                  { label: "< 30 days",  value: near30,  color: "#C62828" },
                  { label: "Expired",    value: expired, color: expired > 0 ? "#C62828" : "#9CA3AF" },
                ];
                return (
                  <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Expiry Status</span>
                    </div>
                    <div style={{ padding: "4px 16px" }}>
                      {rows.map((row, i, arr) => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                          <span style={{ fontSize: 13, color: "#6B7280" }}>{row.label}</span>
                          <span style={{ fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, color: row.color }}>{toPacks(row.value)}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 8px", borderTop: "1px solid #EEF1F6", marginTop: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>Value at Risk</span>
                        <span style={{ fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, color: valueAtRisk > 0 ? "#C62828" : "#2E7D32" }}>
                          ₹{valueAtRisk.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: "10px 16px 14px" }}>
                      <button onClick={() => setShowExpiryRisk(true)} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8", fontSize: 12, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                        View Expiry Risk
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Batch Summary */}
            <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Batch Summary</div>
              {drugBatches.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Batch", "Distributor", "Qty", "Cost", "Expiry", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 16px", textAlign: "left" as const, fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drugBatches.slice(0, 4).map((b, i, arr) => {
                      const h = batchHealth(b.expiry);
                      return (
                        <tr key={b.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                          <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1B6CA8" }}>{b.id}</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#1A2436" }}>{b.supplier}</td>
                          <td style={{ padding: "11px 16px", fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33" }}>{toPacks(b.qtyCurrent)} <span style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span></td>
                          <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>₹{b.purchasePrice.toFixed(2)}</td>
                          <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>
                            {new Date(b.expiry).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                          </td>
                          <td style={{ padding: "11px 16px" }}>
                            <span style={{ fontSize: 12, color: h.color, fontWeight: 600 }}>{h.icon} {h.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 24, fontSize: 13, color: "#9CA3AF", textAlign: "center" as const }}>No batch records available</div>
              )}
              <div style={{ padding: "10px 16px", borderTop: "1px solid #EEF1F6" }}>
                <button onClick={() => setTab("batches")} style={{ fontSize: 12, color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                  View All Batches
                </button>
              </div>
            </div>

            {/* Inventory Insights */}
            <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Inventory Insights</div>
              <div style={{ padding: "4px 0" }}>
                {insights.length > 0 ? insights.map((ins, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 16px", borderBottom: i < insights.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                    <span style={{ fontSize: 15, color: ins.ok ? "#2E7D32" : "#E65100", flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                    <span style={{ fontSize: 13, color: "#1A2436", lineHeight: 1.5 }}>{ins.text}</span>
                  </div>
                )) : (
                  <div style={{ padding: 20, fontSize: 13, color: "#9CA3AF", textAlign: "center" as const }}>No insights available</div>
                )}
              </div>
            </div>

          </div>
        )}

        {tab === "batches" && (() => {
          const BATCH_FILTERS = ["All", "Available", "Near Expiry", "Quarantine", "Blocked"] as const;
          const filtered = drugBatches.filter(b => {
            const q = batchSearch.toLowerCase();
            if (q && !b.id.toLowerCase().includes(q) && !b.supplier.toLowerCase().includes(q) && !b.location.toLowerCase().includes(q)) return false;
            if (batchFilter === "All") return true;
            const days = Math.floor((new Date(b.expiry).getTime() - today.getTime()) / 86400000);
            if (batchFilter === "Available") return days > 0 && b.status !== "Blocked" && b.status !== "Quarantine";
            if (batchFilter === "Near Expiry") return days > 0 && days <= 90;
            if (batchFilter === "Quarantine") return b.status === "Quarantine";
            if (batchFilter === "Blocked") return b.status === "Blocked";
            return true;
          });
          const totalAvail = filtered.reduce((s, b) => s + b.qtyCurrent, 0);
          const totalValue = filtered.reduce((s, b) => s + b.qtyCurrent * b.purchasePrice, 0);
          const nearExpCount = filtered.filter(b => { const d = Math.floor((new Date(b.expiry).getTime() - today.getTime()) / 86400000); return d > 0 && d <= 90; }).length;
          const totalPages = Math.max(1, Math.ceil(filtered.length / batchPageSize));
          const safePage = Math.min(batchPage, totalPages);
          const pageStart = (safePage - 1) * batchPageSize;
          const pageEnd = Math.min(safePage * batchPageSize, filtered.length);
          const pageRows = filtered.slice(pageStart, pageEnd);
          return (
            <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
              {/* Header row */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 10, flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>{drug.name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Batch Inventory — {filtered.length} batch{filtered.length !== 1 ? "es" : ""}</div>
                </div>
                {/* Summary chips */}
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "5px 12px", textAlign: "center" as const }}>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>{toPacks(totalAvail)} <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span></div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Total Available</div>
                  </div>
                  <div style={{ background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "5px 12px", textAlign: "center" as const }}>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>{`₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Batch Value</div>
                  </div>
                  {nearExpCount > 0 && (
                    <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, padding: "5px 12px", textAlign: "center" as const }}>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#C2410C" }}>{nearExpCount}</div>
                      <div style={{ fontSize: 10, color: "#C2410C", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Near Expiry</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Search + filter chips — single row */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "nowrap" as const, overflowX: "auto" as const }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "10px 12px", flex: "0 0 220px", minHeight: 40, boxSizing: "border-box" as const }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input value={batchSearch} onChange={e => { setBatchSearch(e.target.value); setBatchPage(1); }} placeholder="Search batch, distributor, location…"
                    style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
                </div>
                {BATCH_FILTERS.map(f => (
                  <button key={f} onClick={() => { setBatchFilter(f); setBatchPage(1); }}
                    style={{ fontSize: 12, fontFamily: "Inter", fontWeight: batchFilter === f ? 600 : 400, padding: "0 14px", borderRadius: 999, border: batchFilter === f ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: batchFilter === f ? "#EFF6FF" : "#fff", color: batchFilter === f ? "#1B6CA8" : "#6B7280", cursor: "pointer", whiteSpace: "nowrap" as const, minHeight: 40, boxSizing: "border-box" as const, flexShrink: 0 }}>
                    {f}
                  </button>
                ))}
              </div>
              {/* Table */}
              {filtered.length > 0 ? (
                <div style={{ flex: 1, overflowX: "auto" as const, overflowY: "auto" as const, minHeight: 0 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #DDE3EC" }}>
                        {[
                          { label: "Batch No",    align: "left"   },
                          { label: "Status",      align: "left"   },
                          { label: "Received On", align: "left"   },
                          { label: "Expiry",      align: "left"   },
                          { label: "Days Left",   align: "center" },
                          { label: "Rec'd Qty",   align: "right"  },
                          { label: "Available",   align: "right"  },
                          { label: "MRP",         align: "right"  },
                          { label: "Cost",        align: "right"  },
                          { label: "Margin",      align: "right"  },
                          { label: "Batch Value", align: "right"  },
                          { label: "Location",    align: "left"   },
                          { label: "Action",      align: "center" },
                        ].map(h => (
                          <th key={h.label} style={{ padding: "9px 12px", textAlign: h.align as "left" | "right" | "center", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.09em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(b => {
                        const days = Math.floor((new Date(b.expiry).getTime() - today.getTime()) / 86400000);
                        const expiryDate = new Date(b.expiry);
                        const expStr = `${expiryDate.toLocaleString("en-IN", { month: "short" })}-${String(expiryDate.getFullYear()).slice(2)}`;
                        const recvDate = new Date(b.receivedDate);
                        const recvStr = `${recvDate.getDate()} ${recvDate.toLocaleString("en-IN", { month: "short" })} ${String(recvDate.getFullYear()).slice(2)}`;
                        const margin = b.mrp > 0 ? Math.round(((b.mrp - b.purchasePrice) / b.mrp) * 100) : 0;
                        const batchValue = b.qtyCurrent * b.purchasePrice;

                        const statusLabel = days <= 0 ? "Expired" : b.status === "Expiring Soon" ? "Near Expiry" : b.status === "Low" ? "Low Stock" : b.status === "Quarantine" ? "Quarantine" : b.status === "Blocked" ? "Blocked" : "Active";
                        const statusCfg: Record<string, { bg: string; color: string }> = {
                          "Active":      { bg: "#E8F5E9", color: "#2E7D32" },
                          "Low Stock":   { bg: "#FFF3E0", color: "#E65100" },
                          "Near Expiry": { bg: "#FFF3E0", color: "#C2410C" },
                          "Expired":     { bg: "#FFEBEE", color: "#C62828" },
                          "Quarantine":  { bg: "#EFF6FF", color: "#1B6CA8" },
                          "Blocked":     { bg: "#FFEBEE", color: "#C62828" },
                        };
                        const sc = statusCfg[statusLabel] ?? { bg: "#F0F3F7", color: "#6B7280" };

                        const daysLabel = days <= 0 ? "Expired" : days > 365 ? `${Math.floor(days / 30)}mo` : `${days}d`;
                        const daysColor = days <= 0 ? "#C62828" : days <= 30 ? "#C62828" : days <= 90 ? "#E65100" : "#2E7D32";
                        const marginColor = margin >= 25 ? "#2E7D32" : margin >= 15 ? "#E65100" : "#C62828";
                        const fillPct = Math.min(100, Math.round((b.qtyCurrent / b.qtyReceived) * 100));
                        const fillColor = fillPct < 20 ? "#C62828" : fillPct < 40 ? "#E65100" : "#2E7D32";

                        return (
                          <tr key={b.id}
                            style={{ borderBottom: "1px solid #EEF1F6" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            {/* Batch No + Supplier subtitle */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{b.id}</div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{b.supplier}</div>
                            </td>
                            {/* Status — square pill, matching inventory */}
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: sc.bg, color: sc.color, whiteSpace: "nowrap" as const }}>{statusLabel}</span>
                            </td>
                            {/* Received On */}
                            <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" as const }}>{recvStr}</td>
                            {/* Expiry */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: daysColor }}>{expStr}</span>
                            </td>
                            {/* Days Left — bold colored text like Days Cover */}
                            <td style={{ padding: "10px 12px", textAlign: "center" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: daysColor }}>{daysLabel}</span>
                            </td>
                            {/* Rec'd Qty */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#9CA3AF" }}>{toPacks(b.qtyReceived)}</span>
                            </td>
                            {/* Available — bold + unit subtitle + progress bar (Saleable Qty pattern) */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{toPacks(b.qtyCurrent)}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{packUnitShort}</div>
                              <div style={{ width: 44, height: 3, background: "#EEF1F6", marginTop: 3, marginLeft: "auto" }}>
                                <div style={{ width: `${fillPct}%`, height: "100%", background: fillColor }} />
                              </div>
                            </td>
                            {/* MRP */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontSize: 12, color: "#1A2436" }}>{`₹${b.mrp.toFixed(2)}`}</td>
                            {/* Cost */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{`₹${b.purchasePrice.toFixed(2)}`}</td>
                            {/* Margin */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: marginColor }}>{margin}%</span>
                            </td>
                            {/* Batch Value */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{`₹${batchValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}</span>
                            </td>
                            {/* Location */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <span style={{ background: "#F0F3F7", padding: "3px 8px", fontSize: 11, color: "#6B7280", fontFamily: "Inter" }}>{b.location}</span>
                            </td>
                            {/* Action — 28×28 square, matches inventory */}
                            <td style={{ padding: "10px 12px", textAlign: "center" as const }}>
                              <button
                                onMouseDown={e => {
                                  e.stopPropagation();
                                  if (openBatchMenu === b.id) { setOpenBatchMenu(null); setBatchMenuPos(null); }
                                  else { const rect = e.currentTarget.getBoundingClientRect(); setBatchMenuPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right }); setOpenBatchMenu(b.id); }
                                }}
                                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: openBatchMenu === b.id ? "#F0F3F7" : "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}
                                onMouseEnter={e => { if (openBatchMenu !== b.id) e.currentTarget.style.background = "#F0F3F7"; }}
                                onMouseLeave={e => { if (openBatchMenu !== b.id) e.currentTarget.style.background = "#fff"; }}>
                                <svg width="3" height="14" viewBox="0 0 3 14" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.5"/><circle cx="1.5" cy="7" r="1.5"/><circle cx="1.5" cy="12.5" r="1.5"/></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : drugBatches.length === 0 ? (
                /* ── No batches at all for this drug ── */
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "48px 32px", gap: 0 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M3 8h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/><path d="M9 8v4m6-4v4"/>
                    </svg>
                  </div>
                  <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 8 }}>{drug.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2436", marginBottom: 10 }}>No inventory batches found.</div>
                  <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" as const, maxWidth: 380, lineHeight: 1.6, marginBottom: 28 }}>
                    This medicine exists in Medicine Master but has not yet been purchased for this store.
                  </div>
                  <button
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", background: "#1B6CA8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#155A8A")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Create Purchase Order
                  </button>
                </div>
              ) : (
                /* ── Batches exist but filter/search has no matches ── */
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: 48, gap: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2436", marginBottom: 6 }}>No batches match the filter</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>Try a different filter or clear your search.</div>
                  <button onClick={() => { setBatchSearch(""); setBatchFilter("All"); setBatchPage(1); }}
                    style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600, padding: "6px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8",  cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    Clear filters
                  </button>
                </div>
              )}
              {filtered.length > 0 && (
                <PaginationFooter
                  total={filtered.length}
                  page={safePage}
                  pageSize={batchPageSize}
                  totalPages={totalPages}
                  startLabel={filtered.length === 0 ? 0 : pageStart + 1}
                  endLabel={pageEnd}
                  onPageChange={p => setBatchPage(Math.min(Math.max(1, p), totalPages))}
                  onPageSizeChange={n => { setBatchPageSize(n); setBatchPage(1); }}
                />
              )}
              {/* Fixed dropdown — escapes overflowX container */}
              {openBatchMenu && batchMenuPos && (
                <div onMouseDown={e => e.stopPropagation()}
                  style={{ position: "fixed" as const, top: batchMenuPos.top, right: batchMenuPos.right, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 4px 12px rgba(12,27,51,0.12)", zIndex: 500, width: 168,  overflow: "hidden" }}>
                  {[
                    { label: "Adjust Stock",  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,                                                                                                                                                                                       color: "#1B6CA8", action: () => { const b = drugBatches.find(x => x.id === openBatchMenu); if (b) setAdjustBatch(b); setOpenBatchMenu(null); setBatchMenuPos(null); } },
                    { label: "Transfer",      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,                                                                                                                                                                                    color: "#6B21A8", action: () => { const b = drugBatches.find(x => x.id === openBatchMenu); if (b) setTransferBatch(b); setOpenBatchMenu(null); setBatchMenuPos(null); } },
                    { label: "View History",  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,                                                                                                                                               color: "#0C6E6E", action: () => { const b = drugBatches.find(x => x.id === openBatchMenu); if (b) setHistoryBatch(b); setOpenBatchMenu(null); setBatchMenuPos(null); } },
                    { label: "Print Label",   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,                                          color: "#6B7280", action: () => { const b = drugBatches.find(x => x.id === openBatchMenu); setPrintLabelBatch(b ?? null); setOpenBatchMenu(null); setBatchMenuPos(null); } },
                    { label: "Write-off",     icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>,                                                                                                                                 color: "#C62828", action: () => { setOpenBatchMenu(null); setBatchMenuPos(null); } },
                  ].map((item, mi, arr) => (
                    <button key={item.label} onClick={item.action}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: 500, color: item.color, textAlign: "left" as const, borderBottom: mi < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {tab === "suppliers" && (() => {
          const SUPP_FILTERS = ["All", "Preferred", "Active", "Inactive"] as const;
          const allSuppliers = suppList;
          const filtered = allSuppliers.filter(s => {
            const q = suppSearch.toLowerCase();
            if (q && !s.name.toLowerCase().includes(q) && !s.contact.toLowerCase().includes(q)) return false;
            if (suppFilter === "All") return true;
            return s.status === suppFilter;
          });
          const preferred = allSuppliers.find(s => s.status === "Preferred");
          const avgEffCost = allSuppliers.length ? allSuppliers.reduce((a, s) => a + s.effCost, 0) / allSuppliers.length : 0;
          const suppTotalPages = Math.max(1, Math.ceil(filtered.length / suppPageSize));
          const suppSafePage = Math.min(suppPage, suppTotalPages);
          const suppStart = (suppSafePage - 1) * suppPageSize;
          const suppEnd = Math.min(suppSafePage * suppPageSize, filtered.length);
          const suppPageRows = filtered.slice(suppStart, suppEnd);
          return (
            <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", display: "flex", flexDirection: "column" as const, flex: 1, minHeight: 0, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 10, flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Distributors for {drug.name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{allSuppliers.length} registered distributor{allSuppliers.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {preferred && (
                    <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "5px 12px", textAlign: "center" as const }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>{preferred.name}</div>
                      <div style={{ fontSize: 10, color: "#16A34A", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Preferred Distributor</div>
                    </div>
                  )}
                  {allSuppliers.length > 0 && (
                    <div style={{ background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "5px 12px", textAlign: "center" as const }}>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>{`₹${avgEffCost.toFixed(2)}`}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Avg Eff. Cost</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Search + filter chips — single row */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "nowrap" as const, overflowX: "auto" as const }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "10px 12px", flex: "0 0 220px", minHeight: 40, boxSizing: "border-box" as const }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input value={suppSearch} onChange={e => { setSuppSearch(e.target.value); setSuppPage(1); }} placeholder="Search distributor, contact…"
                    style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
                </div>
                {SUPP_FILTERS.map(f => (
                  <button key={f} onClick={() => { setSuppFilter(f); setSuppPage(1); }}
                    style={{ fontSize: 12, fontFamily: "Inter", fontWeight: suppFilter === f ? 600 : 400, padding: "0 14px", borderRadius: 999, border: suppFilter === f ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: suppFilter === f ? "#EFF6FF" : "#fff", color: suppFilter === f ? "#1B6CA8" : "#6B7280", cursor: "pointer", whiteSpace: "nowrap" as const, minHeight: 40, boxSizing: "border-box" as const, flexShrink: 0 }}>
                    {f}
                  </button>
                ))}
              </div>
              {/* Table */}
              {filtered.length > 0 ? (
                <div style={{ flex: 1, overflowX: "auto" as const, overflowY: "auto" as const, minHeight: 0 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #DDE3EC" }}>
                        {[
                          { label: "Distributor",   align: "left"   },
                          { label: "Status",        align: "left"   },
                          { label: "Current Stock", align: "right"  },
                          { label: "Last Order",    align: "left"   },
                          { label: "Last Rate",     align: "right"  },
                          { label: "Eff. Cost",     align: "right"  },
                          { label: "Margin",        align: "right"  },
                          { label: "Lead Time",     align: "center" },
                          { label: "Orders",        align: "center" },
                          { label: "Rating",        align: "center" },
                          { label: "Actions",       align: "center" },
                        ].map(h => (
                          <th key={h.label} style={{ padding: "9px 12px", textAlign: h.align as "left" | "right" | "center", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.09em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {suppPageRows.map(s => {
                        const margin = drug.mrp > 0 ? Math.round(((drug.mrp - s.effCost) / drug.mrp) * 100) : 0;
                        const marginColor = margin >= 25 ? "#2E7D32" : margin >= 15 ? "#E65100" : "#C62828";
                        const statusCfg = s.status === "Preferred"
                          ? { bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" }
                          : s.status === "Active"
                          ? { bg: "#EFF6FF", color: "#1B6CA8", border: "#BFDBFE" }
                          : { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
                        const ordDate = new Date(s.lastOrderDate);
                        const ordStr = `${ordDate.getDate()} ${ordDate.toLocaleString("en-IN", { month: "short" })} ${String(ordDate.getFullYear()).slice(2)}`;
                        return (
                          <tr key={s.name}
                            style={{ borderBottom: "1px solid #EEF1F6" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            {/* Distributor */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0C1B33", fontFamily: "Inter" }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{s.contact}</div>
                            </td>
                            {/* Status */}
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, whiteSpace: "nowrap" as const }}>
                                {s.status === "Preferred" ? "★ Preferred" : s.status}
                              </span>
                            </td>
                            {/* Current Stock */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: s.currentStock > 0 ? "#0C1B33" : "#9CA3AF" }}>{toPacks(s.currentStock)}</span>
                              {s.currentStock > 0 && <span style={{ fontSize: 10, color: "#9CA3AF", marginLeft: 3 }}>{packUnitShort}</span>}
                            </td>
                            {/* Last Order */}
                            <td style={{ padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" as const }}>{ordStr}</td>
                            {/* Last Rate */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const, fontFamily: "JetBrains Mono", fontSize: 12, color: "#6B7280" }}>{`₹${s.lastRate.toFixed(2)}`}</td>
                            {/* Eff. Cost */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>{`₹${s.effCost.toFixed(2)}`}</span>
                            </td>
                            {/* Margin */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: marginColor }}>{margin}%</span>
                            </td>
                            {/* Lead Time */}
                            <td style={{ padding: "10px 12px", textAlign: "center" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 600, color: s.leadDays <= 1 ? "#2E7D32" : s.leadDays <= 2 ? "#E65100" : "#C62828" }}>
                                {s.leadDays} day{s.leadDays !== 1 ? "s" : ""}
                              </span>
                            </td>
                            {/* Total Orders */}
                            <td style={{ padding: "10px 12px", textAlign: "center" as const, fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{s.totalOrders}</td>
                            {/* Rating */}
                            <td style={{ padding: "10px 12px", textAlign: "center" as const }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#F59E0B" }}>{s.rating}/5</span>
                            </td>
                            {/* Actions */}
                            <td style={{ padding: "10px 12px", textAlign: "center" as const }}>
                              <button
                                onMouseDown={e => {
                                  e.stopPropagation();
                                  if (openSuppMenu === s.name) { setOpenSuppMenu(null); setSuppMenuPos(null); }
                                  else { const rect = e.currentTarget.getBoundingClientRect(); setSuppMenuPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right }); setOpenSuppMenu(s.name); }
                                }}
                                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: openSuppMenu === s.name ? "#F0F3F7" : "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}
                                onMouseEnter={e => { if (openSuppMenu !== s.name) e.currentTarget.style.background = "#F0F3F7"; }}
                                onMouseLeave={e => { if (openSuppMenu !== s.name) e.currentTarget.style.background = "#fff"; }}>
                                <svg width="3" height="14" viewBox="0 0 3 14" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.5"/><circle cx="1.5" cy="7" r="1.5"/><circle cx="1.5" cy="12.5" r="1.5"/></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : allSuppliers.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "48px 32px", gap: 0 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 8 }}>No distributors registered</div>
                  <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" as const, maxWidth: 360, lineHeight: 1.6, marginBottom: 28 }}>
                    No distributors have been linked to this medicine yet. Add a distributor to start tracking pricing and lead times.
                  </div>
                  <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", background: "#1B6CA8", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontFamily: "Inter", fontWeight: 600, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#155A8A")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    Add Distributor
                  </button>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: 48, gap: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2436", marginBottom: 6 }}>No distributors match the filter</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>Try a different filter or clear your search.</div>
                  <button onClick={() => { setSuppSearch(""); setSuppFilter("All"); }}
                    style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600, padding: "6px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8",  cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    Clear filters
                  </button>
                </div>
              )}
              {filtered.length > 0 && (
                <PaginationFooter
                  total={filtered.length}
                  page={suppSafePage}
                  pageSize={suppPageSize}
                  totalPages={suppTotalPages}
                  startLabel={filtered.length === 0 ? 0 : suppStart + 1}
                  endLabel={suppEnd}
                  onPageChange={p => setSuppPage(Math.min(Math.max(1, p), suppTotalPages))}
                  onPageSizeChange={n => { setSuppPageSize(n); setSuppPage(1); }}
                />
              )}
              {/* Fixed dropdown */}
              {openSuppMenu && suppMenuPos && (
                <div onMouseDown={e => e.stopPropagation()}
                  style={{ position: "fixed" as const, top: suppMenuPos.top, right: suppMenuPos.right, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 4px 12px rgba(12,27,51,0.12)", zIndex: 500, width: 172,  overflow: "hidden" }}>
                  {[
                    { label: "Place Order",     icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,                                                                                                                             color: "#1B6CA8", action: () => { const suppName = openSuppMenu; const dist = suppName ? suppList.find(s => s.name === suppName) : null; setOpenSuppMenu(null); setSuppMenuPos(null); setPlaceOrderDist({ name: suppName ?? "", lastRate: dist?.lastRate ?? drug.cost }); } },
                    { label: "View History",    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,                                                                                    color: "#0C6E6E", action: () => { const n = openSuppMenu; setOpenSuppMenu(null); setSuppMenuPos(null); setViewHistoryDist(n); } },
                    ...(suppList.find(s => s.name === openSuppMenu)?.status !== "Preferred" ? [
                    { label: "Mark Preferred",  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, color: "#E65100", action: () => { const target = openSuppMenu; setOpenSuppMenu(null); setSuppMenuPos(null); setSuppList(prev => prev.map(s => { if (s.name === target) return { ...s, status: "Preferred" as const }; if (s.status === "Preferred") return { ...s, status: (s.currentStock > 0 ? "Active" : "Inactive") as "Active" | "Inactive" }; return s; })); setToast({ ok: true, msg: `${target} marked as Preferred distributor` }); } },
                    ] : []),
                    { label: "Edit Distributor",   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, color: "#6B7280", action: () => { const n = openSuppMenu; setOpenSuppMenu(null); setSuppMenuPos(null); onEditDistributor?.(n ?? ""); } },
                    { label: "Remove",          icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>,                                                                     color: "#C62828", action: () => { setOpenSuppMenu(null); setSuppMenuPos(null); } },
                  ].map((item, mi, arr) => (
                    <button key={item.label} onClick={item.action}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: 500, color: item.color, textAlign: "left" as const, borderBottom: mi < arr.length - 1 ? "1px solid #F0F3F7" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {item.icon}{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {tab === "movement" && (() => {
          const MOV_FILTERS: (typeof movFilter)[] = ["All", "Purchase", "Sale", "Sale Return", "Transfer In", "Transfer Out", "Adjustment", "Expiry", "Return to Distributor"];
          const MOV_PERIODS: (typeof movPeriod)[] = ["All", "Daily", "Weekly", "Monthly", "Yearly"];
          const allMovements = DRUG_MOVEMENTS[drug.name] ?? [];
          const now = new Date("2026-09-25");
          const periodCutoff = new Date(now);
          if (movPeriod === "Daily")        periodCutoff.setDate(now.getDate() - 1);
          else if (movPeriod === "Weekly")  periodCutoff.setDate(now.getDate() - 7);
          else if (movPeriod === "Monthly") periodCutoff.setMonth(now.getMonth() - 1);
          else if (movPeriod === "Yearly")  periodCutoff.setFullYear(now.getFullYear() - 1);
          else                              periodCutoff.setFullYear(2000); // "All" — no cutoff
          const filtered = allMovements.filter(m => {
            const mDate = new Date(m.date);
            if (mDate < periodCutoff) return false;
            const q = movSearch.toLowerCase();
            if (q && !m.batch.toLowerCase().includes(q) && !m.ref.toLowerCase().includes(q) && !m.user.toLowerCase().includes(q) && !m.event.toLowerCase().includes(q)) return false;
            return movFilter === "All" || m.event === movFilter;
          });
          const movTotalPages = Math.max(1, Math.ceil(filtered.length / movPageSize));
          const movSafePage = Math.min(movPage, movTotalPages);
          const movStart = (movSafePage - 1) * movPageSize;
          const movEnd = Math.min(movSafePage * movPageSize, filtered.length);
          const movPageRows = filtered.slice(movStart, movEnd);

          const totalIn  = allMovements.filter(m => m.qty > 0).reduce((s, m) => s + m.qty, 0);
          const totalOut = allMovements.filter(m => m.qty < 0).reduce((s, m) => s + m.qty, 0);

          const EVENT_CFG: Record<string, { bg: string; color: string; border: string }> = {
            "Purchase":              { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
            "Sale":                  { bg: "#EFF6FF", color: "#1B6CA8", border: "#BFDBFE" },
            "Sale Return":           { bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
            "Transfer In":           { bg: "#F5F3FF", color: "#6B21A8", border: "#DDD6FE" },
            "Transfer Out":          { bg: "#FDF4FF", color: "#86198F", border: "#F0ABFC" },
            "Adjustment":            { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
            "Expiry":                { bg: "#FFEBEE", color: "#C62828", border: "#FFCDD2" },
            "Return to Distributor": { bg: "#FEF9C3", color: "#92400E", border: "#FDE68A" },
          };

          return (
            <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", display: "flex", flexDirection: "column" as const, flex: 1, minHeight: 0, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 10, flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Stock Movement — {drug.name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{allMovements.length} total movement{allMovements.length !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 6, padding: "5px 12px", textAlign: "center" as const }}>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#2E7D32" }}>+{toPacks(totalIn)} <span style={{ fontSize: 10, fontWeight: 400, color: "#4CAF50" }}>{packUnitShort}</span></div>
                    <div style={{ fontSize: 10, color: "#2E7D32", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Total In</div>
                  </div>
                  <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", borderRadius: 6, padding: "5px 12px", textAlign: "center" as const }}>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#C62828" }}>{toPacks(totalOut)} <span style={{ fontSize: 10, fontWeight: 400, color: "#EF9A9A" }}>{packUnitShort}</span></div>
                    <div style={{ fontSize: 10, color: "#C62828", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Total Out</div>
                  </div>
                  <div style={{ background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "5px 12px", textAlign: "center" as const }}>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>{toPacks(totalIn + totalOut)} <span style={{ fontSize: 10, fontWeight: 400, color: "#9CA3AF" }}>{packUnitShort}</span></div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Net Change</div>
                  </div>
                </div>
              </div>
              {/* Search + filters */}
              <div style={{ padding: "10px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" as const, overflowX: "auto" as const, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "10px 12px", flex: "0 0 200px", minHeight: 40, boxSizing: "border-box" as const }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input value={movSearch} onChange={e => { setMovSearch(e.target.value); setMovPage(1); }} placeholder="Search event, batch, ref, user…"
                    style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
                </div>
                {/* Period dropdown */}
                <button
                  onMouseDown={e => {
                    e.stopPropagation();
                    if (movPeriodOpen) { setMovPeriodOpen(false); setMovPeriodPos(null); }
                    else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMovPeriodPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
                      setMovPeriodOpen(true);
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: "Inter", fontWeight: 500, padding: "0 12px", borderRadius: 6, border: "1px solid #DDE3EC", background: movPeriodOpen ? "#F0F3F7" : "#fff", color: "#1A2436", cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, minHeight: 40, boxSizing: "border-box" as const }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {movPeriod}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {MOV_FILTERS.map(f => (
                  <button key={f} onClick={() => { setMovFilter(f); setMovPage(1); }}
                    style={{ fontSize: 12, fontFamily: "Inter", fontWeight: movFilter === f ? 600 : 400, padding: "0 12px", borderRadius: 999, border: movFilter === f ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: movFilter === f ? "#EFF6FF" : "#fff", color: movFilter === f ? "#1B6CA8" : "#6B7280", cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, minHeight: 40, boxSizing: "border-box" as const }}>
                    {f}
                  </button>
                ))}
              </div>
              {/* Table */}
              {filtered.length > 0 ? (
                <div style={{ flex: 1, overflowX: "auto" as const, overflowY: "auto" as const, minHeight: 0 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #DDE3EC" }}>
                        {[
                          { label: "Date & Time", align: "left"  },
                          { label: "Event",        align: "left"  },
                          { label: "Batch No",     align: "left"  },
                          { label: "Qty",          align: "right" },
                          { label: "Balance",      align: "right" },
                          { label: "Reference",    align: "left"  },
                          { label: "Note",         align: "left"  },
                          { label: "User",         align: "left"  },
                        ].map(h => (
                          <th key={h.label} style={{ padding: "9px 12px", textAlign: h.align as "left" | "right", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.09em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {movPageRows.map(m => {
                        const d = new Date(m.date);
                        const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                        const dateStr = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${String(d.getFullYear()).slice(2)}`;
                        const dayStr  = days[d.getDay()];
                        const ec = EVENT_CFG[m.event] ?? { bg: "#F0F3F7", color: "#6B7280", border: "#DDE3EC" };
                        const isIn    = m.qty > 0;
                        const qtyColor = isIn ? "#2E7D32" : "#C62828";
                        const qtyBg   = isIn ? "#E8F5E9" : "#FFEBEE";
                        const qtyStr  = isIn ? `+${toPacks(m.qty)}` : `${toPacks(m.qty)}`;
                        const qtyLabel = isIn ? "Inbound" : "Outbound";
                        const refType: Record<string, string> = { "Purchase": "Purchase Order", "Sale": "Sales Invoice", "Sale Return": "Return Note", "Transfer In": "Transfer Slip", "Transfer Out": "Transfer Slip", "Adjustment": "Adjustment Note", "Expiry": "Write-off", "Return to Distributor": "Debit Note" };
                        const roleColor: Record<string, string> = { "Cashier": "#1B6CA8", "Pharmacist": "#6B21A8", "Manager": "#C2410C", "System": "#6B7280" };
                        return (
                          <tr key={`${m.date}-${m.ref}`}
                            style={{ borderBottom: "1px solid #EEF1F6" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            {/* Date */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{dateStr}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{dayStr}</div>
                            </td>
                            {/* Event */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: ec.bg, color: ec.color }}>{m.event}</span>
                            </td>
                            {/* Batch No */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#0C1B33" }}>{m.batch}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{drug.name}</div>
                            </td>
                            {/* Qty */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: qtyColor, background: qtyBg, padding: "3px 8px", display: "inline-block" }}>{qtyStr}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, textAlign: "right" as const }}>{qtyLabel}</div>
                            </td>
                            {/* Balance */}
                            <td style={{ padding: "10px 12px", textAlign: "right" as const }}>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: m.balance < 0 ? "#C62828" : "#1A2436" }}>{toPacks(m.balance)}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, textAlign: "right" as const }}>Running</div>
                            </td>
                            {/* Reference */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1B6CA8" }}>{m.ref}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{refType[m.event] ?? "Document"}</div>
                            </td>
                            {/* Note */}
                            <td style={{ padding: "10px 12px", maxWidth: 180 }}>
                              <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{m.note}</div>
                            </td>
                            {/* User */}
                            <td style={{ padding: "10px 12px", whiteSpace: "nowrap" as const }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0C1B33", fontFamily: "Inter" }}>{m.user}</div>
                              <div style={{ fontSize: 10, color: roleColor[m.role] ?? "#6B7280", marginTop: 2 }}>{m.role}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : allMovements.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  </div>
                  <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 8 }}>No movements recorded</div>
                  <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" as const, maxWidth: 360, lineHeight: 1.6 }}>Stock movements will appear here once purchases, sales, or adjustments are made for this medicine.</div>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: 48 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F0F3F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2436", marginBottom: 6 }}>No movements match the filter</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>Try a different filter or clear your search.</div>
                  <button onClick={() => { setMovSearch(""); setMovFilter("All"); setMovPeriod("Monthly"); setMovPage(1); }}
                    style={{ fontSize: 12, fontFamily: "Inter", fontWeight: 600, padding: "6px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8",  cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    Clear filters
                  </button>
                </div>
              )}
              {filtered.length > 0 && (
                <PaginationFooter
                  total={filtered.length}
                  page={movSafePage}
                  pageSize={movPageSize}
                  totalPages={movTotalPages}
                  startLabel={filtered.length === 0 ? 0 : movStart + 1}
                  endLabel={movEnd}
                  onPageChange={p => setMovPage(Math.min(Math.max(1, p), movTotalPages))}
                  onPageSizeChange={n => { setMovPageSize(n); setMovPage(1); }}
                />
              )}
              {/* Period dropdown portal */}
              {movPeriodOpen && movPeriodPos && (
                <div onMouseDown={e => e.stopPropagation()}
                  style={{ position: "fixed" as const, top: movPeriodPos.top, right: movPeriodPos.right, background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", boxShadow: "0 4px 12px rgba(12,27,51,0.12)", zIndex: 9999, width: 130, overflow: "hidden" }}>
                  {MOV_PERIODS.map(p => (
                    <button key={p} onMouseDown={e => { e.stopPropagation(); setMovPeriod(p); setMovPeriodOpen(false); setMovPeriodPos(null); setMovPage(1); }}
                      style={{ width: "100%", textAlign: "left" as const, padding: "9px 14px", fontSize: 12, fontFamily: "Inter", fontWeight: movPeriod === p ? 600 : 400, color: movPeriod === p ? "#1B6CA8" : "#1A2436", background: movPeriod === p ? "#EFF6FF" : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      onMouseEnter={e => { if (movPeriod !== p) e.currentTarget.style.background = "#F8FAFC"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = movPeriod === p ? "#EFF6FF" : "#fff"; }}>
                      {p}
                      {movPeriod === p && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {(tab === "purchase-history" || tab === "sale-history" || tab === "audit") && (() => {
          const allPurchaseRows = [
            { date: "28 Jul 2025", po: "PO-2025-0134", distributor: drug.supplier, batch: "BT-0041", qty: 50,  rate: drug.cost * 0.95, amount: 50  * drug.cost * 0.95, status: "Received", type: "Purchase Order" },
            { date: "15 Jun 2025", po: "PO-2025-0098", distributor: drug.supplier, batch: "BT-0028", qty: 100, rate: drug.cost * 0.93, amount: 100 * drug.cost * 0.93, status: "Received", type: "Purchase Order" },
            { date: "02 May 2025", po: "RTN-2025-0067", distributor: drug.supplier, batch: "BT-0019", qty: 10, rate: drug.cost * 0.92, amount: 10  * drug.cost * 0.92, status: "Returned", type: "Return" },
            { date: "18 Mar 2025", po: "PO-2025-0031", distributor: drug.supplier, batch: "BT-0011", qty: 60,  rate: drug.cost * 0.90, amount: 60  * drug.cost * 0.90, status: "Received", type: "Purchase Order" },
            { date: "05 Feb 2025", po: "PO-2025-0008", distributor: drug.supplier, batch: "BT-0004", qty: 80,  rate: drug.cost * 0.90, amount: 80  * drug.cost * 0.90, status: "Received", type: "Purchase Order" },
            { date: "10 Jan 2025", po: "RTN-2025-0003", distributor: drug.supplier, batch: "BT-0002", qty: 5,  rate: drug.cost * 0.88, amount: 5   * drug.cost * 0.88, status: "Returned", type: "Return" },
          ];
          const saleRows = [
            { date: "28 Jul 2025", invoice: "INV-2025-1084", patient: "Rajesh Kumar",  qty: 2, rate: drug.price, amount: 2 * drug.price, type: "Sale",   status: "Paid" },
            { date: "27 Jul 2025", invoice: "INV-2025-1071", patient: "Priya Sharma",  qty: 1, rate: drug.price, amount: 1 * drug.price, type: "Sale",   status: "Paid" },
            { date: "26 Jul 2025", invoice: "INV-2025-1058", patient: "Amit Verma",    qty: 3, rate: drug.price, amount: 3 * drug.price, type: "Sale",   status: "Pending" },
            { date: "25 Jul 2025", invoice: "RTN-2025-0042", patient: "Sunita Patel",  qty: 1, rate: drug.price, amount: 1 * drug.price, type: "Return", status: "Returned" },
            { date: "24 Jul 2025", invoice: "INV-2025-1039", patient: "Vikram Singh",  qty: 2, rate: drug.price, amount: 2 * drug.price, type: "Sale",   status: "Paid" },
            { date: "23 Jul 2025", invoice: "INV-2025-1021", patient: "Meena Iyer",    qty: 1, rate: drug.price, amount: 1 * drug.price, type: "Sale",   status: "Cancelled" },
          ];
          const auditRows = [
            { date: "28 Jul 2025 10:42", event: "Stock Adjusted",    user: "Admin",       detail: "Stock +10 units — manual count correction" },
            { date: "15 Jun 2025 09:15", event: "Price Updated",     user: "Pharmacist",  detail: `Sale rate: ₹${(drug.price * 0.95).toFixed(2)} → ₹${drug.price.toFixed(2)}` },
            { date: "02 May 2025 14:30", event: "Batch Received",    user: "Storekeeper", detail: "Batch BT-0019 added — Qty 75" },
            { date: "18 Mar 2025 11:05", event: "Reorder Level Set", user: "Admin",       detail: `Min stock set to ${drug.minStock} units` },
            { date: "05 Feb 2025 16:20", event: "Medicine Created",  user: "Admin",       detail: "Medicine master record created" },
          ];

          // Purchase history filters
          const PH_STATUSES = ["All", "Received", "Returned", "Pending", "Partial"];
          const phFiltered = allPurchaseRows.filter(r => {
            const matchSearch = !phSearch || r.po.toLowerCase().includes(phSearch.toLowerCase()) || r.distributor.toLowerCase().includes(phSearch.toLowerCase()) || r.batch.toLowerCase().includes(phSearch.toLowerCase());
            const matchType = phType === "All Types" || r.type === phType;
            const matchStatus = phStatus === "All" || r.status === phStatus;
            return matchSearch && matchType && matchStatus;
          });
          const phTotalPages = Math.max(1, Math.ceil(phFiltered.length / phPageSize));
          const phSafePage = Math.min(phPage, phTotalPages);
          const phPageRows = phFiltered.slice((phSafePage - 1) * phPageSize, phSafePage * phPageSize);

          // Sale history filters
          const SH_STATUSES = ["All", "Paid", "Pending", "Returned", "Cancelled"];
          const shFiltered = saleRows.filter(r => {
            const matchSearch = !shSearch || r.invoice.toLowerCase().includes(shSearch.toLowerCase()) || r.patient.toLowerCase().includes(shSearch.toLowerCase());
            const matchType = shType === "All Types" || r.type === shType;
            const matchStatus = shStatus === "All" || r.status === shStatus;
            return matchSearch && matchType && matchStatus;
          });
          const shTotalPages = Math.max(1, Math.ceil(shFiltered.length / shPageSize));
          const shSafePage = Math.min(shPage, shTotalPages);
          const shPageRows = shFiltered.slice((shSafePage - 1) * shPageSize, shSafePage * shPageSize);

          const thStyle: React.CSSProperties = { padding: "9px 14px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.07em", textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", whiteSpace: "nowrap" };
          const tdStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 13, color: "#1A2436", borderBottom: "1px solid #EEF1F6", fontFamily: "Inter" };
          const monoStyle: React.CSSProperties = { ...tdStyle, fontFamily: "JetBrains Mono", fontSize: 12 };

          const totalPurchased = allPurchaseRows.reduce((s, r) => s + r.qty, 0);
          const totalPurchaseValue = allPurchaseRows.reduce((s, r) => s + r.amount, 0);
          const totalSold = saleRows.reduce((s, r) => s + r.qty, 0);
          const totalSaleValue = saleRows.reduce((s, r) => s + r.amount, 0);

          return (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 0 }}>
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>

                {/* Header — purchase-history */}
                {tab === "purchase-history" && (
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 10, flexShrink: 0 }}>
                    <div>
                      <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Purchase History — {drug.name}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{allPurchaseRows.length} purchase record{allPurchaseRows.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "5px 12px", textAlign: "center" as const }}>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#1B6CA8" }}>{totalPurchased} <span style={{ fontSize: 11, fontWeight: 400, color: "#93C5FD" }}>units</span></div>
                        <div style={{ fontSize: 10, color: "#1B6CA8", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Total Qty</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", borderRadius: 6, padding: "5px 12px", textAlign: "center" as const }}>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>&#8377;{totalPurchaseValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Total Value</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header — sale-history */}
                {tab === "sale-history" && (
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 10, flexShrink: 0 }}>
                    <div>
                      <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Sale History — {drug.name}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{saleRows.length} sale record{saleRows.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 6, padding: "5px 12px", textAlign: "center" as const }}>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#2E7D32" }}>{totalSold} <span style={{ fontSize: 11, fontWeight: 400, color: "#81C784" }}>units</span></div>
                        <div style={{ fontSize: 10, color: "#2E7D32", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Total Sold</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", borderRadius: 6, padding: "5px 12px", textAlign: "center" as const }}>
                        <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>&#8377;{totalSaleValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Revenue</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter bar — purchase-history */}
                {tab === "purchase-history" && (
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap" as const, overflowX: "auto" as const }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, width: 220, flexShrink: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "10px 12px", minHeight: 40, boxSizing: "border-box" as const }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.6"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>
                      <input
                        value={phSearch} onChange={e => { setPhSearch(e.target.value); setPhPage(1); }}
                        placeholder="Search invoice, distributor, batch..."
                        style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "Inter", color: "#0C1B33", width: "100%" }}
                      />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <InvFilterDropdown
                        value={phPeriod} label="All Periods"
                        options={["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]}
                        onChange={v => { setPhPeriod(v); setPhPage(1); }}
                      />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <InvFilterDropdown
                        value={phType} label="All Types"
                        options={["Purchase Order", "Return"]}
                        onChange={v => { setPhType(v); setPhPage(1); }}
                      />
                    </div>
                    <div style={{ width: 1, height: 24, background: "#DDE3EC", flexShrink: 0 }} />
                    {PH_STATUSES.map(s => (
                      <button key={s} onClick={() => { setPhStatus(s); setPhPage(1); }}
                        style={{ fontSize: 12, fontFamily: "Inter", fontWeight: phStatus === s ? 600 : 400, padding: "0 14px", borderRadius: 999, border: phStatus === s ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: phStatus === s ? "#EFF6FF" : "#fff", color: phStatus === s ? "#1B6CA8" : "#6B7280", cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, minHeight: 40, boxSizing: "border-box" as const }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Filter bar — sale-history */}
                {tab === "sale-history" && (
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap" as const, overflowX: "auto" as const }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, width: 220, flexShrink: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, padding: "10px 12px", minHeight: 40, boxSizing: "border-box" as const }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.6"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>
                      <input
                        value={shSearch} onChange={e => { setShSearch(e.target.value); setShPage(1); }}
                        placeholder="Search invoice, patient..."
                        style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "Inter", color: "#0C1B33", width: "100%" }}
                      />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <InvFilterDropdown
                        value={shPeriod} label="All Periods"
                        options={["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]}
                        onChange={v => { setShPeriod(v); setShPage(1); }}
                      />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <InvFilterDropdown
                        value={shType} label="All Types"
                        options={["Sale", "Return"]}
                        onChange={v => { setShType(v); setShPage(1); }}
                      />
                    </div>
                    <div style={{ width: 1, height: 24, background: "#DDE3EC", flexShrink: 0 }} />
                    {SH_STATUSES.map(s => (
                      <button key={s} onClick={() => { setShStatus(s); setShPage(1); }}
                        style={{ fontSize: 12, fontFamily: "Inter", fontWeight: shStatus === s ? 600 : 400, padding: "0 14px", borderRadius: 999, border: shStatus === s ? "1.5px solid #1B6CA8" : "1px solid #DDE3EC", background: shStatus === s ? "#EFF6FF" : "#fff", color: shStatus === s ? "#1B6CA8" : "#6B7280", cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0, minHeight: 40, boxSizing: "border-box" as const }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ overflowX: "auto" as const }}>
                  {tab === "purchase-history" && (
                    <table style={{ width: "100%", borderCollapse: "collapse" as const, tableLayout: "fixed" as const }}>
                      <colgroup>
                        <col style={{ width: 108 }} />{/* Date */}
                        <col style={{ width: 128 }} />{/* PO Number */}
                        <col style={{ width: 150 }} />{/* Distributor */}
                        <col style={{ width: 140 }} />{/* Purchase Type */}
                        <col style={{ width: 86 }} />{/* Batch */}
                        <col style={{ width: 60 }} />{/* Qty */}
                        <col style={{ width: 96 }} />{/* Unit Rate */}
                        <col style={{ width: 106 }} />{/* Amount */}
                        <col style={{ width: 90 }} />{/* Status */}
                      </colgroup>
                      <thead>
                        <tr>
                          {([
                            { label: "Date",          align: "left"  },
                            { label: "Invoice",        align: "left"  },
                            { label: "Distributor",   align: "left"  },
                            { label: "Purchase Type", align: "left"  },
                            { label: "Batch",         align: "left"  },
                            { label: "Qty",           align: "right" },
                            { label: "Unit Rate",     align: "right" },
                            { label: "Amount",        align: "right" },
                            { label: "Status",        align: "left"  },
                          ] as const).map(h => (
                            <th key={h.label} style={{ ...thStyle, textAlign: h.align }}>{h.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {phPageRows.length === 0 ? (
                          <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No records match the filter</td></tr>
                        ) : phPageRows.map((r, i) => (
                          <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <td style={monoStyle}>{r.date}</td>
                            <td style={{ ...monoStyle, color: "#1B6CA8" }}>{r.po}</td>
                            <td style={{ ...tdStyle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.distributor}</td>
                            <td style={tdStyle}>
                              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.type === "Return" ? "#FFF3E0" : "#EFF6FF", color: r.type === "Return" ? "#E65100" : "#1B6CA8" }}>{r.type}</span>
                            </td>
                            <td style={monoStyle}>{r.batch}</td>
                            <td style={{ ...monoStyle, textAlign: "right" as const }}>{r.qty}</td>
                            <td style={{ ...monoStyle, textAlign: "right" as const }}>&#8377;{r.rate.toFixed(2)}</td>
                            <td style={{ ...monoStyle, textAlign: "right" as const, fontWeight: 700 }}>&#8377;{r.amount.toFixed(2)}</td>
                            <td style={tdStyle}>
                              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.status === "Returned" ? "#FFF3E0" : "#E8F5E9", color: r.status === "Returned" ? "#E65100" : "#2E7D32" }}>{r.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {tab === "sale-history" && (
                    <table style={{ width: "100%", borderCollapse: "collapse" as const, tableLayout: "fixed" as const }}>
                      <colgroup>
                        <col style={{ width: 108 }} />{/* Date */}
                        <col style={{ width: 136 }} />{/* Invoice No. */}
                        <col style={{ width: 150 }} />{/* Patient */}
                        <col style={{ width: 100 }} />{/* Type */}
                        <col style={{ width: 60 }} />{/* Qty */}
                        <col style={{ width: 96 }} />{/* Unit Rate */}
                        <col style={{ width: 110 }} />{/* Amount */}
                        <col style={{ width: 90 }} />{/* Status */}
                      </colgroup>
                      <thead>
                        <tr>
                          {([
                            { label: "Date",        align: "left"  },
                            { label: "Invoice No.", align: "left"  },
                            { label: "Patient",     align: "left"  },
                            { label: "Type",        align: "left"  },
                            { label: "Qty",         align: "right" },
                            { label: "Unit Rate",   align: "right" },
                            { label: "Amount",      align: "right" },
                            { label: "Status",      align: "left"  },
                          ] as const).map(h => (
                            <th key={h.label} style={{ ...thStyle, textAlign: h.align }}>{h.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shPageRows.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No records match the filter</td></tr>
                        ) : shPageRows.map((r, i) => {
                          const statusStyle: Record<string, { bg: string; color: string }> = {
                            Paid:      { bg: "#E8F5E9", color: "#2E7D32" },
                            Pending:   { bg: "#FFF3E0", color: "#E65100" },
                            Returned:  { bg: "#FFEBEE", color: "#C62828" },
                            Cancelled: { bg: "#F0F3F7", color: "#6B7280" },
                          };
                          const ss = statusStyle[r.status] ?? { bg: "#EFF6FF", color: "#1B6CA8" };
                          return (
                            <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                              <td style={monoStyle}>{r.date}</td>
                              <td style={{ ...monoStyle, color: "#1B6CA8" }}>{r.invoice}</td>
                              <td style={{ ...tdStyle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.patient}</td>
                              <td style={tdStyle}>
                                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: r.type === "Return" ? "#FFF3E0" : "#EFF6FF", color: r.type === "Return" ? "#E65100" : "#1B6CA8" }}>{r.type}</span>
                              </td>
                              <td style={{ ...monoStyle, textAlign: "right" as const }}>{r.qty}</td>
                              <td style={{ ...monoStyle, textAlign: "right" as const }}>&#8377;{r.rate.toFixed(2)}</td>
                              <td style={{ ...monoStyle, textAlign: "right" as const, fontWeight: 700 }}>&#8377;{r.amount.toFixed(2)}</td>
                              <td style={tdStyle}>
                                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color }}>{r.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {tab === "audit" && (
                    <table style={{ width: "100%", borderCollapse: "collapse" as const, tableLayout: "fixed" as const }}>
                      <colgroup>
                        <col style={{ width: 160 }} />
                        <col style={{ width: 160 }} />
                        <col style={{ width: 120 }} />
                        <col />
                      </colgroup>
                      <thead>
                        <tr>
                          {["Date & Time", "Event", "Changed By", "Details"].map(h => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {auditRows.map((r, i) => (
                          <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <td style={monoStyle}>{r.date}</td>
                            <td style={tdStyle}>
                              {(() => {
                                const evStyle: Record<string, { bg: string; color: string }> = {
                                  "Stock Adjusted":    { bg: "#EFF6FF", color: "#1B6CA8" },
                                  "Price Updated":     { bg: "#FFF3E0", color: "#E65100" },
                                  "Batch Received":    { bg: "#E8F5E9", color: "#2E7D32" },
                                  "Reorder Level Set": { bg: "#F5F3FF", color: "#7B1FA2" },
                                  "Medicine Created":  { bg: "#F0F3F7", color: "#6B7280" },
                                };
                                const s = evStyle[r.event] ?? { bg: "#EFF6FF", color: "#1B6CA8" };
                                return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: "nowrap" as const }}>{r.event}</span>;
                              })()}
                            </td>
                            <td style={tdStyle}>{r.user}</td>
                            <td style={{ ...tdStyle, color: "#6B7280", fontSize: 12 }}>{r.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination — purchase-history */}
                {tab === "purchase-history" && (
                  <div style={{ padding: "8px 14px", borderTop: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFBFD", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
                    <div>Showing {phFiltered.length === 0 ? 0 : (phSafePage - 1) * phPageSize + 1}–{Math.min(phSafePage * phPageSize, phFiltered.length)} of {phFiltered.length}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Rows per page:</span>
                        <select value={phPageSize} onChange={e => { setPhPageSize(Number(e.target.value)); setPhPage(1); }}
                          style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 12, background: "#fff", fontFamily: "Inter" }}>
                          {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {[["«", 1], ["‹", phSafePage - 1], null, ["›", phSafePage + 1], ["»", phTotalPages]].map((item, idx) => {
                          if (!item) return <span key={idx} style={{ padding: "0 8px", fontFamily: "JetBrains Mono", color: "#1A2436" }}>{phSafePage} / {phTotalPages}</span>;
                          const [label, target] = item as [string, number];
                          const disabled = label === "«" || label === "‹" ? phSafePage === 1 : phSafePage >= phTotalPages;
                          return (
                            <button key={idx} onClick={() => !disabled && setPhPage(Number(target))} disabled={disabled}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: disabled ? "default" : "pointer", color: disabled ? "#C8CDD8" : "#1A2436", fontSize: 12, fontFamily: "Inter", minWidth: 28 }}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pagination — sale-history */}
                {tab === "sale-history" && (
                  <div style={{ padding: "8px 14px", borderTop: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFBFD", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
                    <div>Showing {shFiltered.length === 0 ? 0 : (shSafePage - 1) * shPageSize + 1}–{Math.min(shSafePage * shPageSize, shFiltered.length)} of {shFiltered.length}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Rows per page:</span>
                        <select value={shPageSize} onChange={e => { setShPageSize(Number(e.target.value)); setShPage(1); }}
                          style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid #E8ECF4", fontSize: 12, background: "#fff", fontFamily: "Inter" }}>
                          {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {[["«", 1], ["‹", shSafePage - 1], null, ["›", shSafePage + 1], ["»", shTotalPages]].map((item, idx) => {
                          if (!item) return <span key={idx} style={{ padding: "0 8px", fontFamily: "JetBrains Mono", color: "#1A2436" }}>{shSafePage} / {shTotalPages}</span>;
                          const [label, target] = item as [string, number];
                          const disabled = label === "«" || label === "‹" ? shSafePage === 1 : shSafePage >= shTotalPages;
                          return (
                            <button key={idx} onClick={() => !disabled && setShPage(Number(target))} disabled={disabled}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: disabled ? "default" : "pointer", color: disabled ? "#C8CDD8" : "#1A2436", fontSize: 12, fontFamily: "Inter", minWidth: 28 }}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {tab === "sales" && (() => {
          const sd = DRUG_SALES[drug.name] ?? { today: 0, last7: 0, last30: 0, avgDaily: 0, currentAvailable: 0, openPO: 0, reorderLevel: 0, recommendedQty: 0, trend: [] };
          const daysOfStock = sd.avgDaily > 0 ? Math.floor(sd.currentAvailable / sd.avgDaily) : 0;
          const needsReorder = sd.currentAvailable <= sd.reorderLevel && sd.openPO === 0;
          return (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
              {/* Sales & Demand card */}
              <div style={{ background: "#fff", border: "1px solid #E8ECF4", borderRadius: 0 }}>
                <div style={{ padding: "10px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Sales &amp; Demand</span>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column" as const, gap: 14 }}>
                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#EEF1F6", border: "1px solid #EEF1F6" }}>
                    {[
                      { label: "Today",          value: `${sd.today} units` },
                      { label: "Last 7 Days",     value: `${sd.last7} units` },
                      { label: "Last 30 Days",    value: `${sd.last30} units` },
                      { label: "Avg Daily Sales", value: `${sd.avgDaily}` },
                    ].map(r => (
                      <div key={r.label} style={{ background: "#fff", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{r.label}</span>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#0C1B33" }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Trend chart */}
                  {(() => {
                    const maxQty = Math.max(...sd.trend.map(d => d.qty), 1);
                    const totalWeek = sd.trend.reduce((s, d) => s + d.qty, 0);
                    const peakDay = sd.trend.reduce((a, b) => b.qty > a.qty ? b : a, sd.trend[0] ?? { day: "—", qty: 0 });
                    const avgQty = totalWeek / (sd.trend.length || 1);
                    return (
                      <div style={{ border: "1px solid #E8ECF4", borderRadius: 8, overflow: "hidden" }}>
                        {/* Chart header */}
                        <div style={{ padding: "12px 16px", background: "#FAFBFD", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0C1B33", fontFamily: "Outfit" }}>Sales Trend</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>Last 7 days</div>
                          </div>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ textAlign: "right" as const }}>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#1B6CA8" }}>{totalWeek}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>7-Day Total</div>
                            </div>
                            <div style={{ width: 1, height: 28, background: "#EEF1F6" }} />
                            <div style={{ textAlign: "right" as const }}>
                              <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, color: "#00ACC1" }}>{peakDay.qty}</div>
                              <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Peak ({peakDay.day})</div>
                            </div>
                          </div>
                        </div>
                        {/* Bar chart */}
                        <div style={{ padding: "16px 12px 8px", background: "#fff" }}>
                          <ResponsiveContainer width="100%" height={130}>
                            <BarChart data={sd.trend} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="32%">
                              <CartesianGrid vertical={false} stroke="#EEF1F6" strokeDasharray="0" />
                              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF", fontFamily: "Inter", fontWeight: 500 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: "#C4C9D4", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                cursor={{ fill: "#F0F3F7", radius: 4 } as object}
                                contentStyle={{ fontSize: 12, fontFamily: "Inter", border: "1px solid #DDE3EC", borderRadius: 6, padding: "6px 12px", boxShadow: "0 2px 8px rgba(12,27,51,0.08)" }}
                                formatter={(v: number) => [`${v} units`, "Sold"]}
                                labelStyle={{ fontWeight: 600, color: "#0C1B33", marginBottom: 2 }}
                              />
                              <Bar dataKey="qty" radius={[4, 4, 0, 0]} maxBarSize={32}>
                                {sd.trend.map((entry, idx) => (
                                  <Cell
                                    key={idx}
                                    fill={entry.qty === maxQty ? "#00ACC1" : entry.qty >= avgQty ? "#1B6CA8" : "#93C5FD"}
                                    fillOpacity={entry.qty === maxQty ? 1 : 0.85}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Legend */}
                        <div style={{ padding: "8px 16px 10px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 16, background: "#FAFBFD" }}>
                          {[
                            { color: "#00ACC1", label: "Peak day" },
                            { color: "#1B6CA8", label: "Above avg" },
                            { color: "#93C5FD", label: "Below avg" },
                          ].map(l => (
                            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: "inline-block" }} />
                              <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter" }}>{l.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Inventory metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#EEF1F6", border: "1px solid #EEF1F6" }}>
                    {[
                      { label: "Current Available", value: `${sd.currentAvailable}` },
                      { label: "Daily Sales",        value: `${sd.avgDaily}` },
                      { label: "Days of Stock",      value: `${daysOfStock}`, warn: daysOfStock < 7 },
                      { label: "Open PO",            value: `${sd.openPO}` },
                    ].map(r => (
                      <div key={r.label} style={{ background: "#fff", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{r.label}</span>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: r.warn ? "#C62828" : "#0C1B33" }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reorder Status card */}
              <div style={{ background: "#fff", border: needsReorder ? "1px solid #FFCDD2" : "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 18px", borderBottom: `1px solid ${needsReorder ? "#FFCDD2" : "#EEF1F6"}`, background: needsReorder ? "#FFEBEE" : "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  {needsReorder && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.8h17.54a1 1 0 0 0 .87-1.5l-8.2-14.2a1 1 0 0 0-1.74 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, color: needsReorder ? "#C62828" : "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                    {needsReorder ? "Reorder Recommended" : "Reorder Status"}
                  </span>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column" as const, gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#EEF1F6", border: "1px solid #EEF1F6" }}>
                    {[
                      { label: "Reorder Level",     value: `${sd.reorderLevel}` },
                      { label: "Current Available", value: `${sd.currentAvailable}`, warn: sd.currentAvailable <= sd.reorderLevel },
                      { label: "Open PO",           value: `${sd.openPO}` },
                    ].map(r => (
                      <div key={r.label} style={{ background: "#fff", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{r.label}</span>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: r.warn ? "#C62828" : "#0C1B33" }}>{r.value}</span>
                      </div>
                    ))}
                    {needsReorder && (
                      <div style={{ background: "#FFEBEE", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#C62828", fontFamily: "Inter", fontWeight: 600 }}>Recommended Qty</span>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: "#C62828" }}>{sd.recommendedQty}</span>
                      </div>
                    )}
                  </div>
                  {/* Status line */}
                  {!needsReorder ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#E8F5E9", borderRadius: 6, border: "1px solid #A5D6A7" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32", fontFamily: "Inter" }}>No immediate reorder required</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FFEBEE", borderRadius: 6, border: "1px solid #FFCDD2" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.8h17.54a1 1 0 0 0 .87-1.5l-8.2-14.2a1 1 0 0 0-1.74 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#C62828", fontFamily: "Inter" }}>Stock is at or below reorder level — action needed</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ flex: 1, fontSize: 12, fontFamily: "Inter", fontWeight: 600, padding: "8px 14px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", color: "#1B6CA8", cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                          Add to Short Book
                        </button>
                        <button style={{ flex: 1, fontSize: 12, fontFamily: "Inter", fontWeight: 600, padding: "8px 14px", borderRadius: 6, border: "none", background: "#1B6CA8", color: "#fff", cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#155a8a")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>
                          Create PO
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {showStockCount && (
        <StockCountModal
          drug={drug}
          drugBatches={drugBatches}
          systemStock={drug.stock}
          onClose={() => setShowStockCount(false)}
        />
      )}

      {showAddBatch && (
        <AddBatchModal
          drug={drug}
          onClose={() => setShowAddBatch(false)}
          onSaved={(ok, id) => {
            setShowAddBatch(false);
            setToast({ ok, msg: ok ? `Batch ${id} added successfully` : "Failed to add batch. Please try again." });
          }}
        />
      )}

      {transferBatch && (
        <TransferBatchModal batch={transferBatch} drug={drug} onClose={() => setTransferBatch(null)} />
      )}

      {adjustBatch && (
        <AdjustStockModal
          batch={adjustBatch}
          drug={drug}
          onClose={() => setAdjustBatch(null)}
        />
      )}

      {historyBatch && (
        <BatchHistoryModal batch={historyBatch} drug={drug} onClose={() => setHistoryBatch(null)} />
      )}

      {printLabelBatch !== null && (
        <PrintLabelModal
          batch={printLabelBatch}
          drug={drug}
          onClose={() => setPrintLabelBatch(null)}
        />
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />

      {placeOrderDist && (
        <InvPlaceOrderModal
          drugName={drug.name}
          distributorName={placeOrderDist.name}
          lastRate={placeOrderDist.lastRate}
          onClose={() => setPlaceOrderDist(null)}
          onDone={msg => { setPlaceOrderDist(null); setToast({ ok: true, msg }); }}
        />
      )}

      {viewHistoryDist && (
        <InvViewHistoryModal
          drugName={drug.name}
          distributorName={viewHistoryDist}
          baseCost={drug.cost}
          onClose={() => setViewHistoryDist(null)}
        />
      )}

      {showLocationStock && (
        <InvLocationStockModal drug={drug} onClose={() => setShowLocationStock(false)} />
      )}

      {showExpiryRisk && (
        <InvExpiryRiskModal drug={drug} onClose={() => setShowExpiryRisk(false)} />
      )}

    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Inventory({ onEditDistributor }: { onEditDistributor?: (name: string) => void } = {}) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All Categories");
  const [supplierFilter, setSupplierFilter] = useState("All Distributors");
  const [availFilter, setAvailFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [stockStatuses, setStockStatuses] = useState<string[]>(["In Stock", "Low Stock", "Out of Stock"]);
  const [expiryRange, setExpiryRange] = useState("All");
  const [expiryRisk, setExpiryRisk] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("Name (A - Z)");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [view, setView] = useState<"list" | "create" | "view" | "edit">("list");
  const [selectedDrug, setSelectedDrug] = useState<(typeof drugs)[0] | null>(null);
  const editDrugRef = useRef<(typeof drugs)[0] | null>(null);
  const [invToast, setInvToast] = useState<ToastState>(null);
  const [deactivatedIds, setDeactivatedIds] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [reorderDrug, setReorderDrug] = useState<(typeof drugs)[0] | null>(null);

  useEffect(() => {
    function handle() { setOpenMenuId(null); }
    if (openMenuId !== null) {
      document.addEventListener("click", handle);
      return () => document.removeEventListener("click", handle);
    }
  }, [openMenuId]);

  const allDrugs = drugs.filter(d => !deactivatedIds.has(d.id));
  const allCategories = Array.from(new Set(drugs.map(d => d.category))).sort();
  const allSuppliers = Array.from(new Set(drugs.map(d => d.supplier))).sort();
  const locationZones = Array.from(
    new Set(drugs.map(d => d.location.includes("COLD") ? "Cold Storage" : `Section ${d.location.charAt(0)}`))
  ).sort();

  const preFiltered = allDrugs.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.supplier.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All Categories" || d.category === catFilter;
    const matchSupplier = supplierFilter === "All Distributors" || d.supplier === supplierFilter;
    const matchLocation = locationFilter === "All Locations"
      || (locationFilter === "Cold Storage" ? d.location.includes("COLD") : d.location.startsWith(locationFilter.replace("Section ", "")));
    const { daysLeft, risk: r } = getExpiryInfo(d.expiry);
    const matchStatus = stockStatuses.length === 0
      || stockStatuses.includes(d.status)
      || (stockStatuses.includes("Near Expiry") && daysLeft >= 0 && daysLeft <= 60)
      || (stockStatuses.includes("Expired") && daysLeft < 0);
    const matchExpRange = expiryRange === "All"
      || (expiryRange === "Expiring in 30 days" && daysLeft >= 0 && daysLeft <= 30)
      || (expiryRange === "Expiring in 60 days" && daysLeft >= 0 && daysLeft <= 60)
      || (expiryRange === "Expiring in 90 days" && daysLeft >= 0 && daysLeft <= 90)
      || (expiryRange === "Expired" && daysLeft < 0);
    const matchExpRisk = expiryRisk === "All" || r === expiryRisk;
    const matchMinP = !minPrice || d.price >= Number(minPrice);
    const matchMaxP = !maxPrice || d.price <= Number(maxPrice);
    const matchAvail = !availFilter
      || (availFilter === "Available"  && d.status === "In Stock")
      || (availFilter === "Reserved"   && d.status === "Low Stock")
      || (availFilter === "Damaged"    && d.status === "Damaged")
      || (availFilter === "Quarantine" && d.status === "Quarantine")
      || (availFilter === "Blocked"    && d.status === "Out of Stock");
    return matchSearch && matchCat && matchSupplier && matchLocation && matchStatus && matchExpRange && matchExpRisk && matchMinP && matchMaxP && matchAvail;
  });

  const filtered = sortBy === "Name (Z - A)" ? [...preFiltered].sort((a, b) => b.name.localeCompare(a.name))
    : sortBy === "Stock (High - Low)"         ? [...preFiltered].sort((a, b) => b.stock - a.stock)
    : sortBy === "Stock (Low - High)"         ? [...preFiltered].sort((a, b) => a.stock - b.stock)
    : sortBy === "Price (High - Low)"         ? [...preFiltered].sort((a, b) => b.price - a.price)
    : sortBy === "Price (Low - High)"         ? [...preFiltered].sort((a, b) => a.price - b.price)
    : [...preFiltered].sort((a, b) => a.name.localeCompare(b.name));

  const { sortCol, sortDir, handleSort, setSortCol, setSortDir, sorted: sortedRows } =
    useTableSort(filtered);

  const { pageRows, footerProps } = usePagination(sortedRows, 10);

  const lowStockCount    = allDrugs.filter(d => d.status === "Low Stock").length;
  const outStockCount    = allDrugs.filter(d => d.status === "Out of Stock").length;
  const nearExpiryCount  = allDrugs.filter(d => { const { daysLeft } = getExpiryInfo(d.expiry); return daysLeft >= 0 && daysLeft <= 60; }).length;
  const expiredCount     = allDrugs.filter(d => getExpiryInfo(d.expiry).daysLeft < 0).length;
  const totalAlerts      = lowStockCount + outStockCount + nearExpiryCount + expiredCount;

  const totalStockValue  = allDrugs.reduce((s, d) => s + d.stock * d.cost, 0);
  const lowCoverageCount = allDrugs.filter(d => { const dd = Math.max(1, d.minStock / 30); return d.stock / dd < 30; }).length;

  const fmtVal = (v: number) =>
    v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}K` : `₹${Math.round(v)}`;

  const saleableValue   = allDrugs.filter(d => d.status !== "Out of Stock").reduce((s, d) => s + d.stock * d.cost, 0);
  const saleableCount   = allDrugs.filter(d => d.status !== "Out of Stock").length;
  const reservedValue   = Math.round(totalStockValue * 0.072);
  const reservedCount   = Math.round(allDrugs.length * 0.059);
  const quarantineValue = 32000;
  const quarantineCount = 18;
  const atRiskDrugs     = allDrugs.filter(d => { const { daysLeft } = getExpiryInfo(d.expiry); return daysLeft >= 0 && daysLeft <= 90; });
  const atRiskValue     = atRiskDrugs.reduce((s, d) => s + d.stock * d.cost, 0);
  const atRiskCount     = atRiskDrugs.length;

  if (view === "view" && selectedDrug) return (
    <>
      <DrugDetailPage
        drug={selectedDrug}
        onBack={() => { setSelectedDrug(null); setView("list"); }}
        onEdit={() => { editDrugRef.current = selectedDrug; setSelectedDrug(null); setInvToast(null); setView("edit"); }}
        isDeactivated={deactivatedIds.has(selectedDrug.id)}
        onActivate={() => setDeactivatedIds(prev => { const n = new Set(prev); n.delete(selectedDrug.id); return n; })}
        onDeactivate={() => setDeactivatedIds(prev => new Set([...prev, selectedDrug.id]))}
        onShortBook={() => setReorderDrug(selectedDrug)}
        onEditDistributor={onEditDistributor}
      />
      {reorderDrug && <AddToShortBookDrawer drug={reorderDrug} onClose={() => setReorderDrug(null)} />}
    </>
  );

  if (view === "create") return (
    <CreateMedicinePage
      onBack={() => setView("list")}
      mode="create"
      onSaved={ok => setInvToast({ ok, msg: ok ? "Medicine added successfully" : "Failed to save medicine. Please try again." })}
      onDraftSaved={ok => setInvToast({ ok, msg: ok ? "Draft saved successfully" : "Failed to save draft. Please try again." })}
      onVerificationSent={ok => setInvToast({ ok, msg: ok ? "Send for verification successfully" : "Failed to send verification request. Please try again." })}
    />
  );

  if (view === "edit" && editDrugRef.current) return (
    <CreateMedicinePage
      onBack={() => { editDrugRef.current = null; setView("list"); }}
      mode="edit"
      drug={editDrugRef.current}
      onSaved={ok => setInvToast({ ok, msg: ok ? "Medicine added successfully" : "Failed to update medicine. Please try again." })}
      onDraftSaved={ok => setInvToast({ ok, msg: ok ? "Draft saved successfully" : "Failed to save draft. Please try again." })}
      onVerificationSent={ok => setInvToast({ ok, msg: ok ? "Send for verification successfully" : "Failed to send verification request. Please try again." })}
    />
  );

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ─── HEADER ─── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={S.pageTitle}>Inventory</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2, fontFamily: "Inter" }}>
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{allDrugs.length.toLocaleString()}</span>
            {" Medicines · "}
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{fmtVal(totalStockValue)}</span>
            {" Stock Value · "}
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, color: totalAlerts > 0 ? "#C62828" : "#1A2436" }}>{totalAlerts}</span>
            {" Alerts"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Import Stock</button>
          <button style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Export</button>
          <button onClick={() => { setInvToast(null); setView("create"); }} style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Add Medicine</button>
        </div>
      </div>

      {/* ─── TODAY’S INVENTORY ACTIONS ─── */}
      <div style={IV.sectionCard}>
        <div style={IV.cardSectionHeader}>
          <span style={IV.cardSectionLabel}>{"Today’s Inventory Actions"}</span>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {([
            { dotColor: "#C62828", valueStr: String(outStockCount || 6), label: "Stock Mismatch", onClick: () => setStockStatuses(["Out of Stock"]) },
            { dotColor: "#E65100", valueStr: String(nearExpiryCount),    label: "Expiry Return",  onClick: () => { setExpiryRange("Expiring in 60 days"); setStockStatuses(["In Stock", "Low Stock", "Out of Stock"]); } },
            { dotColor: "#F57F17", valueStr: String(lowCoverageCount),   label: "Low Coverage",   onClick: () => setStockStatuses(["Low Stock"]) },
            { dotColor: "#C62828", valueStr: "8",                         label: "Quarantine",     onClick: () => {} },
            { dotColor: "#E65100", valueStr: "3",                         label: "Distributor Short", onClick: () => {} },
            { dotColor: "#6B21A8", valueStr: "₹42,000",              label: "Dead Stock",     onClick: () => {} },
          ] as Array<{ dotColor: string; valueStr: string; label: string; onClick: () => void }>).map(card => (
            <div key={card.label} style={{ border: "1px solid #EEF1F6", padding: "14px 16px", background: "#FAFBFD", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, fontWeight: 700, color: card.dotColor }}>{card.valueStr}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{card.label}</div>
              <button onClick={card.onClick}
                style={{ alignSelf: "flex-start", padding: "3px 0", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                Review &rarr;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── STOCK HEALTH ─── */}
      <div style={IV.sectionCard}>
        <div style={IV.cardSectionHeader}>
          <span style={IV.cardSectionLabel}>Stock Health</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          {([
            { label: "SALEABLE",   value: fmtVal(saleableValue),   count: saleableCount,   color: "#2E7D32", bg: "#E8F5E9", bdColor: "#A5D6A7" },
            { label: "RESERVED",   value: fmtVal(reservedValue),   count: reservedCount,   color: "#1B6CA8", bg: "#EFF6FF", bdColor: "#BFDBFE" },
            { label: "QUARANTINE", value: fmtVal(quarantineValue), count: quarantineCount, color: "#E65100", bg: "#FFF3E0", bdColor: "#FFCC80" },
            { label: "AT RISK",    value: fmtVal(atRiskValue),     count: atRiskCount,     color: "#C62828", bg: "#FFEBEE", bdColor: "#FFCDD2" },
          ] as Array<{ label: string; value: string; count: number; color: string; bg: string; bdColor: string }>).map((tile, i, arr) => (
            <div key={tile.label} style={{ padding: "18px 20px", borderRight: i < arr.length - 1 ? "1px solid #EEF1F6" : "none" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", marginBottom: 6 }}>{tile.label}</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: tile.color, marginBottom: 8 }}>{tile.value}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", background: tile.bg, border: `1px solid ${tile.bdColor}` }}>
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 700, color: tile.color }}>{tile.count}</span>
                <span style={{ fontSize: 10, color: tile.color }}>{" meds"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── TABLE CARD ─── */}
      <div style={IV.tableCard}>

        {/* SEARCH & FILTER header */}
        <div style={IV.cardSectionHeader}>
          <span style={IV.cardSectionLabel}>Search & Filter</span>
        </div>

        {/* Search + Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 260px", minHeight: 40, boxSizing: "border-box" as const }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Medicine / Barcode / Batch..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
          </div>
          <InvFilterDropdown value={catFilter}      onChange={setCatFilter}      options={allCategories} label="All Categories" />
          <InvFilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={allSuppliers}  label="All Distributors"  />

          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={() => setShowFiltersPanel(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500, minHeight: 40, boxSizing: "border-box" as const }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Medicine</Th>
                <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Manufacturer</Th>
                <Th>Dosage Form</Th>
                <Th>Pack</Th>
                <Th>HSN Code</Th>
                <Th onSort={() => handleSort("stock")} sortDir={sortCol === "stock" ? sortDir : null}>Saleable Qty</Th>
                <Th>Reserved Qty</Th>
                <Th>Days Cover</Th>
                <Th>Expiry Risk</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(d => {
                const { daysLeft, risk } = getExpiryInfo(d.expiry);
                const riskStyle = EXPIRY_RISK_STYLE[risk] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
                const dailyDemand = Math.max(1, d.minStock / 30);
                const daysCover = Math.round(d.stock / dailyDemand);
                const reservedQty = d.status === "Low Stock" ? Math.floor(d.stock * 0.05) : 0;
                const saleableQty = Math.max(0, d.stock - reservedQty);
                const packStr = DRUG_PACK[d.name] ?? "";
                const packDisplay = packStr
                  .replace(/\s*\/\s*/g, "/")
                  .replace(/\s+(?:Tabs?|Capsules?|Caps?)/gi, "")
                  .replace(/\s+mL/gi, "mL")
                  .replace(/\s+MDI/gi, "MDI")
                  .replace(/Inhaler/gi, "Inh")
                  .replace(/Bottle/gi, "Btl")
                  .replace(/Strip/gi, "Str");
                const packMatch = packStr.match(/^(\d+)[^/]*\/\s*(.+)$/);
                const packSize = packMatch ? parseInt(packMatch[1]) : 1;
                const rawPackUnit = packMatch ? packMatch[2].trim() : d.unit;
                const unitAlreadyPack = rawPackUnit.toLowerCase() === d.unit.toLowerCase() || rawPackUnit.toLowerCase() === d.unit.toLowerCase().replace(/s$/, "");
                const packCount = unitAlreadyPack ? saleableQty : Math.floor(saleableQty / packSize);
                const looseUnits = unitAlreadyPack ? 0 : saleableQty % packSize;
                const batchCode = DRUG_BATCH_MAP[d.name] || (d.name.replace(/\s+/g, "").slice(0, 2).toUpperCase() + d.id.toString().padStart(3, "0"));
                const coverColor = daysCover < 14 ? "#C62828" : daysCover < 30 ? "#E65100" : "#1A2436";
                return (
                  <tr key={d.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>

                    {/* Medicine */}
                    <td style={{ padding: "10px 12px", minWidth: 160 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{d.category}</div>
                    </td>

                    {/* Manufacturer */}
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#1A2436", whiteSpace: "nowrap" as const }}>
                      {DRUG_MANUFACTURER[d.name] ?? d.supplier}
                    </td>

                    {/* Dosage Form */}
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" as const }}>
                      {DRUG_DOSAGE_FORM[d.name] ?? d.unit}
                    </td>

                    {/* Pack */}
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#1A2436", whiteSpace: "nowrap" as const }}>
                      {packDisplay || `1 ${d.unit}`}
                    </td>

                    {/* HSN Code */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>
                        {DRUG_HSN[d.name] ?? "30049090"}
                      </span>
                    </td>

                    {/* Saleable Qty */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: saleableQty === 0 ? "#C62828" : saleableQty < d.minStock ? "#E65100" : "#1A2436" }}>
                        {packCount > 0 ? packCount.toLocaleString() : saleableQty.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>
                        {packCount > 0
                          ? `${rawPackUnit}${packCount !== 1 ? "s" : ""}${looseUnits > 0 ? ` +${looseUnits} loose` : ""}`
                          : d.unit}
                      </div>
                    </td>

                    {/* Reserved Qty */}
                    <td style={{ padding: "10px 12px", textAlign: "center" as const }}>
                      <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: reservedQty > 0 ? "#1B6CA8" : "#9CA3AF" }}>
                        {reservedQty}
                      </span>
                    </td>

                    {/* Days Cover */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: coverColor }}>
                        {d.stock === 0 ? "0d" : `${daysCover}d`}
                      </span>
                    </td>

                    {/* Expiry Risk */}
                    <td style={{ padding: "10px 12px" }}>
                      {risk === "Expired"
                        ? <span style={{ fontSize: 11, color: "#9CA3AF" }}>Expired</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: riskStyle.bg, color: riskStyle.color }}>{risk}</span>}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "10px 12px" }}><Pill status={d.status} /></td>

                    {/* Action */}
                    <td style={{ padding: "10px 12px", position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === d.id ? null : d.id); }}
                          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                          <svg width="3" height="14" viewBox="0 0 3 14" fill="currentColor">
                            <circle cx="1.5" cy="1.5" r="1.5" />
                            <circle cx="1.5" cy="7" r="1.5" />
                            <circle cx="1.5" cy="12.5" r="1.5" />
                          </svg>
                        </button>
                      </div>
                      {openMenuId === d.id && (
                        <div onClick={e => e.stopPropagation()}
                          style={{ position: "absolute", right: 8, top: "100%", background: "#fff", borderRadius: 6, border: "1px solid #E8ECF4", boxShadow: "0 4px 16px rgba(10,22,44,0.12)", zIndex: 100, minWidth: 130 }}>
                          {[
                            { label: "View",       color: "#1A2436", icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="8" cy="8" rx="6" ry="4"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/></svg>, action: () => { setSelectedDrug(d); setView("view"); setOpenMenuId(null); } },
                            { label: "Edit",       color: "#1B6CA8", icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg>, action: () => { editDrugRef.current = d; setInvToast(null); setView("edit"); setOpenMenuId(null); } },
                            { label: "Short Book", color: "#7B1FA2", icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="10" height="12" rx="1"/><path d="M6 5h4M6 8h4M6 11h2"/></svg>, action: () => { setReorderDrug(d); setOpenMenuId(null); } },
                            { label: "Activate",   color: "#2E7D32", icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M5.5 8l2 2 3-3"/></svg>, action: () => { setDeactivatedIds(prev => { const n = new Set(prev); n.delete(d.id); return n; }); setOpenMenuId(null); } },
                            { label: "Deactivate", color: "#E65100", icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/></svg>, action: () => { setDeactivatedIds(prev => new Set([...prev, d.id])); setOpenMenuId(null); } },
                          ].map(item => (
                            <button key={item.label} onClick={e => { e.stopPropagation(); item.action(); }}
                              style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: item.color, fontFamily: "Inter", borderBottom: item.label !== "Deactivate" ? "1px solid #F4F6FA" : "none" as const, display: "flex", alignItems: "center", gap: 8 }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              {item.icon}{item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#6B7280", fontSize: 13 }}>No products match your search.</div>
          )}
        </div>
        <PaginationFooter {...footerProps} />
      </div>

      {reorderDrug && (
        <AddToShortBookDrawer drug={reorderDrug} onClose={() => setReorderDrug(null)} />
      )}


      {showFiltersPanel && (
        <FiltersDrawer
          onClose={() => setShowFiltersPanel(false)}
          allCategories={allCategories} allSuppliers={allSuppliers} locationZones={locationZones}
          catFilter={catFilter} setCatFilter={setCatFilter}
          supplierFilter={supplierFilter} setSupplierFilter={setSupplierFilter}
          locationFilter={locationFilter} setLocationFilter={setLocationFilter}
          stockStatuses={stockStatuses} setStockStatuses={setStockStatuses}
          expiryRange={expiryRange} setExpiryRange={setExpiryRange}
          expiryRisk={expiryRisk} setExpiryRisk={setExpiryRisk}
          minPrice={minPrice} setMinPrice={setMinPrice}
          maxPrice={maxPrice} setMaxPrice={setMaxPrice}
          sortBy={sortBy} setSortBy={setSortBy}
        />
      )}
    </div>
    <Toast toast={invToast} onDone={() => setInvToast(null)} />
    </>
  );
}
