import { useState, useEffect, useRef } from "react";
import { drugs } from "../data/mockData";
import { usePagination, PaginationFooter } from "./shared/usePagination";

// ─── Types & form defaults ─────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

interface AddMedForm {
  genericName: string; brandName: string; strength: string; dosageForm: string;
  route: string; packUnit: string; manufacturer: string; therapeuticCategory: string;
  saltComposition: string; therapeuticClass: string;
  hsnCode: string; barcode: string; prescriptionStatus: string; gstRate: string;
  storageCondition: string; tempRange: string; storageZone: string; mfgProductCode: string;
  distributorRef: string; regulatoryNotes: string;
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

const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Inhaler", "Patch", "Powder", "Suppository"];
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
      style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: disabled ? "#F8FAFC" : "#fff", boxSizing: "border-box" as const, color: disabled ? "#6B7280" : undefined, cursor: disabled ? "default" : undefined }}
      onFocus={disabled ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
      onBlur={disabled ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
  );
}

function DropdownSelect({ value, onChange, options, disabled }: { value?: string; onChange?: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <select value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled}
      style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: disabled ? "#F8FAFC" : "#fff", boxSizing: "border-box" as const, cursor: disabled ? "default" : "pointer", color: disabled ? "#6B7280" : undefined }}
      onFocus={disabled ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
      onBlur={disabled ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
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
    <div style={{ width: 40, height: 40, background: "#E8F5E9", border: "1px solid #C8E6C9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
  const steps = ["Medicine", "Compliance", "Operations", "Review"];
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 32px", background: "#FAFBFD", borderTop: "1px solid #EEF1F6", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const state: "done" | "active" | "idle" = current > n ? "done" : current === n ? "active" : "idle";
        const isLast = i === steps.length - 1;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: state === "done" ? "#E8F5E9" : state === "active" ? "#EFF6FF" : "#F5F5F5",
                border: `1.5px solid ${state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#DDE3EC"}`,
                color: state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#9CA3AF",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono",
                flexShrink: 0,
              }}>{state === "done" ? "✓" : String(n).padStart(2, "0")}</div>
              <span style={{ fontSize: 13, fontWeight: state === "idle" ? 500 : 700, color: state === "done" ? "#2E7D32" : state === "active" ? "#1B6CA8" : "#9CA3AF", whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {!isLast && <div style={{ flex: 1, height: 1, background: state === "done" ? "#A5D6A7" : "#DDE3EC", margin: "0 14px", minWidth: 20 }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Manufacturer combobox ─────────────────────────────────────────────────────

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
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{"×"}</button>
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
  if (disabled) return <TextInput value={value} onChange={() => {}} placeholder="e.g. GSK" disabled />;

  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [knownList, setKnownList] = useState(KNOWN_MANUFACTURERS_SEED);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
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
      <div style={{ background: "#fff", width: 520, border: "1px solid #E8ECF4", boxShadow: "0 8px 32px rgba(10,22,44,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #EEF1F6" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>New Composition</div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add composition</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{"×"}</button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <DrawerField label="Composition name" required><TextInput value={comp.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. Paracetamol 500 mg" /></DrawerField>
            <DrawerField label="Short name"><TextInput value={comp.shortName} onChange={e => upd("shortName", e.target.value)} placeholder="e.g. PCM" /></DrawerField>
            <DrawerField label="Strength" required><TextInput value={comp.strength} onChange={e => upd("strength", e.target.value)} placeholder="e.g. 500 mg" /></DrawerField>
            <DrawerField label="Side effects"><TextInput value={comp.sideEffects} onChange={e => upd("sideEffects", e.target.value)} placeholder="e.g. Nausea, dizziness" /></DrawerField>
            <DrawerField label="Description" gridSpan={2}>
              <textarea value={comp.description} onChange={e => upd("description", e.target.value)} placeholder="Pharmacological description or usage notes" rows={3}
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

function CompositionField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  if (disabled) return <TextInput value={value} onChange={() => {}} placeholder="e.g. Paracetamol 500 mg" disabled />;

  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [knownList, setKnownList] = useState(KNOWN_COMPOSITIONS_SEED);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
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

// ─── Create Medicine Page ──────────────────────────────────────────────────────

function CreateMedicinePage({ onBack, mode = "create", drug }: {
  onBack: () => void;
  mode?: "create" | "view" | "edit";
  drug?: (typeof drugs)[0];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isView = mode === "view" && !isEditing;

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
  const [saved, setSaved] = useState(false);

  const upd = <K extends keyof AddMedForm>(key: K, value: AddMedForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const saveDisabled = !form.genericName.trim();

  const taStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4",
    fontSize: 13, outline: "none", fontFamily: "Inter", background: isView ? "#F8FAFC" : "#fff",
    boxSizing: "border-box", resize: isView ? "none" as const : "vertical" as const,
    color: isView ? "#6B7280" : undefined,
  };

  const FL = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
      {children}{req && <span style={{ color: "#C62828", marginLeft: 3 }}>*</span>}
    </div>
  );

  const SectionCard = ({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) => (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4", marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 12 }}>
        {icon}
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#0C1B33" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18, padding: "0 4px", display: "flex", alignItems: "center" }}>{"←"}</button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Inventory</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>{"›"}</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>
            {mode === "view" ? "View Medicine" : mode === "edit" ? "Edit Medicine" : "Create New Medicine"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mode === "view" && !isEditing && (
            <button onClick={() => setIsEditing(true)}
              style={{ padding: "9px 22px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
              Edit
            </button>
          )}
          <GhostBtn onClick={onBack}>Cancel</GhostBtn>
          <button
            onClick={() => !saveDisabled && !isView && setSaved(true)}
            disabled={saveDisabled || isView}
            style={{ padding: "9px 22px", border: "none", background: saveDisabled || isView ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: saveDisabled || isView ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            {mode === "create" ? "Save Medicine" : "Save Changes"}
          </button>
        </div>
      </div>

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
                <TextInput value={form.gstRate} onChange={e => upd("gstRate", e.target.value)} placeholder="12" disabled={isView} />
                <span style={{ padding: "9px 12px", border: "1px solid #E8ECF4", borderLeft: "none", fontSize: 13, color: "#6B7280", background: "#F9FAFB", whiteSpace: "nowrap", flexShrink: 0 }}>%</span>
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
              <TextInput value={form.mfgProductCode} onChange={e => upd("mfgProductCode", e.target.value)} placeholder="Supplier/manufacturer code" disabled={isView} />
            </div>
            <div>
              <FL>Distributor reference</FL>
              <TextInput value={form.distributorRef} onChange={e => upd("distributorRef", e.target.value)} placeholder="Preferred supplier or distributor" disabled={isView} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FL>Regulatory notes</FL>
              <textarea value={form.regulatoryNotes} onChange={e => upd("regulatoryNotes", e.target.value)} placeholder="License, schedule, or dispensing restrictions" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
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
                onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
            </div>
            <div>
              <FL>Contraindications</FL>
              <textarea value={form.contraindications} onChange={e => upd("contraindications", e.target.value)} placeholder="Important contraindications" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
            </div>
            <div>
              <FL>Dosage instructions</FL>
              <textarea value={form.dosageInstructions} onChange={e => upd("dosageInstructions", e.target.value)} placeholder="Patient-facing directions" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
            </div>
            <div>
              <FL>Side effects</FL>
              <textarea value={form.sideEffects} onChange={e => upd("sideEffects", e.target.value)} placeholder="Known common side effects" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
            </div>
            <div>
              <FL>Patient label text</FL>
              <textarea value={form.patientLabelText} onChange={e => upd("patientLabelText", e.target.value)} placeholder="Label instructions shown to patient" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
            </div>
            <div>
              <FL>Review notes</FL>
              <textarea value={form.reviewNotes} onChange={e => upd("reviewNotes", e.target.value)} placeholder="Catalog review notes" rows={3} style={taStyle} disabled={isView}
                onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
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

      </div>

      {/* Saved — blur popup */}
      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
              {mode === "edit" ? "Medicine Updated Successfully" : "Medicine Added Successfully"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, fontFamily: "JetBrains Mono" }}>
              {[form.genericName, form.brandName].filter(Boolean).join(" · ") || "New Medicine"} &middot; Added to catalog
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <GhostBtn onClick={onBack}>Back to Inventory</GhostBtn>
              <button onClick={() => { setForm(emptyMedForm()); setSaved(false); }}
                style={{ padding: "9px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Add Another
              </button>
            </div>
          </div>
        </div>
      )}

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

  if (saved) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
        <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
            <div style={{ width: 56, height: 56, background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#2E7D32" }}>&#10003;</div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", textAlign: "center" }}>{drug.name} added to Short Book</div>
            <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>
              Order quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{orderQty}</span>
            </div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  if (alreadyIn) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
        <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Already in Short Book</div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          <div style={{ flex: 1, padding: "20px 22px" }}>
            <div style={{ padding: "14px 16px", background: "#FFF8E1", border: "1px solid #FFE082", fontSize: 13, color: "#F57F17", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{drug.name} is already in your Short Book.</div>
              <div style={{ color: "#6B7280", fontSize: 12 }}>Current Order Quantity: <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{suggested}</span></div>
            </div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
            <button style={{ flex: 1, padding: "9px 0", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
              Update Quantity
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Go to Short Book
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Reorder</div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add to Short Book</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Medicine info */}
          <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33", marginBottom: 8 }}>{drug.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Current Stock", value: String(drug.stock), warn: drug.stock < drug.minStock },
                { label: "Reorder Level", value: String(drug.minStock), warn: false },
                { label: "Suggested Order", value: String(suggested), warn: false },
                { label: "Supplier", value: drug.supplier, warn: false },
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
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Reason</div>
            <select value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
              {["Low Stock", "Out of Stock", "Today's Sales", "Manual", "Customer Demand"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Preferred Supplier</div>
            <select value={supplier} onChange={e => setSupplier(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>
              {["ABC Pharma", "XYZ Pharma", "Medico", drug.supplier].filter((v, i, a) => a.indexOf(v) === i).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={handleAdd} disabled={!orderQty || Number(orderQty) < 1}
            style={{ flex: 2, padding: "9px 0", border: "none", background: !orderQty || Number(orderQty) < 1 ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: !orderQty || Number(orderQty) < 1 ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Add to Short Book
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Status & risk styles ─────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  "In Stock": { bg: "#E8F5E9", color: "#2E7D32" },
  "Low Stock": { bg: "#FFF3E0", color: "#E65100" },
  "Out of Stock": { bg: "#FFEBEE", color: "#C62828" },
  "Near Expiry": { bg: "#FFF3E0", color: "#E65100" },
};

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

function InvFilterDropdown({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: string[]; label: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "7px 24px 7px 10px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: value === label ? "#9CA3AF" : "#1A2436", fontFamily: "Inter", outline: "none", appearance: "none", WebkitAppearance: "none", minWidth: 112 }}>
        <option value={label}>{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "#9CA3AF" }}>&#9660;</span>
    </div>
  );
}


const QUICK_ACTIONS = [
  { label: "Low Stock Report", icon: "▼", color: "#E65100", bg: "#FFF3E0" },
  { label: "Expiry Report",    icon: "◷", color: "#C62828", bg: "#FFEBEE" },
  { label: "Stock Valuation",  icon: "₹", color: "#1B6CA8", bg: "#EFF6FF" },
  { label: "Batches",          icon: "⊞", color: "#2E7D32", bg: "#E8F5E9" },
  { label: "Stock Movement",   icon: "⇄", color: "#6B21A8", bg: "#F5F3FF" },
  { label: "Import Stock",     icon: "↑", color: "#0C6E6E", bg: "#ECFDF5" },
];

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
        style={{ width: "100%", padding: "8px 28px 8px 10px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", appearance: "none", WebkitAppearance: "none", cursor: "pointer", color: "#1A2436", boxSizing: "border-box" as const }}
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
    setDraftCat("All Categories"); setDraftSupplier("All Suppliers"); setDraftLocation("All Locations");
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
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {"×"}
          </button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <PnlSection label="Categories">
            <PnlSelect value={draftCat} onChange={setDraftCat} options={["All Categories", ...allCategories]} />
          </PnlSection>
          <PnlSection label="Suppliers">
            <PnlSelect value={draftSupplier} onChange={setDraftSupplier} options={["All Suppliers", ...allSuppliers]} />
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
                style={{ flex: 1, padding: "7px 10px", border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")} />
              <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>to</span>
              <input type="number" placeholder="Max Price" value={draftMaxPrice} onChange={e => setDraftMaxPrice(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }}
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
            style={{ flex: 1, padding: "9px 0", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>
            Reset
          </button>
          <button onClick={handleApply}
            style={{ flex: 2, padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Batch lookup (subset for inventory view drawer) ───────────────────────────

const INV_BATCHES: { id: string; drug: string; expiry: string; qtyCurrent: number; status: string }[] = [
  { id: "BT-2025-0118", drug: "Amoxicillin 500mg",    expiry: "2026-08-15", qtyCurrent: 240, status: "Active" },
  { id: "BT-2025-0117", drug: "Metformin 1000mg",     expiry: "2025-12-31", qtyCurrent: 18,  status: "Low" },
  { id: "BT-2025-0116", drug: "Insulin Glargine",     expiry: "2025-10-15", qtyCurrent: 45,  status: "Expiring Soon" },
  { id: "BT-2025-0115", drug: "Atorvastatin 20mg",    expiry: "2027-01-10", qtyCurrent: 312, status: "Active" },
  { id: "BT-2025-0114", drug: "Warfarin 5mg",         expiry: "2026-04-01", qtyCurrent: 6,   status: "Low" },
  { id: "BT-2025-0113", drug: "Ciprofloxacin 500mg",  expiry: "2025-11-20", qtyCurrent: 12,  status: "Expiring Soon" },
];

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

// ─── Drug view drawer ───────────────────────────────────────────────────────────

function DrugViewDrawer({ drug, onClose, onEdit, onReorder }: {
  drug: typeof drugs[0];
  onClose: () => void;
  onEdit: () => void;
  onReorder: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "stock" | "batch">("overview");

  const today = new Date("2026-08-30");
  const daysRemaining = Math.floor((new Date(drug.expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const maxStock = drug.minStock * 3;
  const stockValue = drug.stock * drug.cost;
  const retailValue = drug.stock * drug.price;
  const drugBatches = INV_BATCHES.filter(b => b.drug === drug.name);
  const expired = daysRemaining < 0 ? drug.stock : 0;
  const quarantine = drug.status === "Low Stock" ? Math.floor(drug.stock * 0.05) : 0;
  const sellable = drug.stock - expired - quarantine;
  const composition = COMPOSITION_MAP[drug.name] || [{ ingredient: drug.name, strength: "—", role: "Active" }];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const statusBg = drug.status === "In Stock" ? "#E8F5E9" : drug.status === "Low Stock" ? "#FFF3E0" : "#FFEBEE";
  const statusColor = drug.status === "In Stock" ? "#2E7D32" : drug.status === "Low Stock" ? "#E65100" : "#C62828";
  const warnColor = daysRemaining < 0 ? "#C62828" : "#E65100";

  const TABS: { key: "overview" | "stock" | "batch"; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "stock",    label: "Stock Details" },
    { key: "batch",    label: "Batch Summary" },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,27,51,0.35)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 500, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(12,27,51,0.08)" }}>

        {/* Header */}
        <div style={{ flexShrink: 0, borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ padding: "20px 24px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em" }}>{drug.name}</div>
              <div style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>{drug.category} &middot; {drug.unit} &middot; {drug.supplier}</div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#9CA3AF", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 2px", marginLeft: 12, flexShrink: 0 }}>×</button>
          </div>
          <div style={{ padding: "0 24px 14px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", background: statusBg, color: statusColor }}>{drug.status}</span>
          </div>
          {/* Tab bar */}
          <div style={{ display: "flex", paddingLeft: 24, borderTop: "1px solid #EEF1F6" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? "#1B6CA8" : "#6B7280", borderBottom: tab === t.key ? "2px solid #1B6CA8" : "2px solid transparent", whiteSpace: "nowrap" as const }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14, background: "#F8FAFC" }}>

          {/* ── TAB: OVERVIEW ── */}
          {tab === "overview" && (
            <>
              {/* Medicine Info */}
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Medicine Info</div>
                {([
                  { label: "Medicine Name", value: drug.name,     mono: false, warn: false },
                  { label: "Category",      value: drug.category, mono: false, warn: false },
                  { label: "Manufacturer",  value: drug.supplier, mono: false, warn: false },
                  { label: "Supplier",      value: drug.supplier, mono: false, warn: false },
                  { label: "Location",      value: drug.location, mono: true,  warn: false },
                  { label: "Nearest Expiry", value: drug.expiry,  mono: true,  warn: daysRemaining < 90 },
                  { label: "Days Remaining", value: daysRemaining < 0 ? "Expired" : `${daysRemaining} days`, mono: false, warn: daysRemaining < 90 },
                ] as { label: string; value: string; mono: boolean; warn: boolean }[]).map((row, i, arr) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: row.mono ? "JetBrains Mono" : "Inter", color: row.warn ? warnColor : "#1A2436" }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Composition */}
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Composition</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Ingredient", "Strength", "Role"].map((h, i) => (
                        <th key={h} style={{ padding: "8px 14px", textAlign: "left" as const, fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {composition.map((c, i, arr) => (
                      <tr key={c.ingredient} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                        <td style={{ padding: "9px 14px", fontSize: 12, color: "#1A2436", fontWeight: c.role === "Active" ? 600 : 400 }}>{c.ingredient}</td>
                        <td style={{ padding: "9px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.strength}</td>
                        <td style={{ padding: "9px 14px" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", fontWeight: 700,
                            background: c.role === "Active" ? "#EFF6FF" : "#F8FAFC",
                            color: c.role === "Active" ? "#1B6CA8" : "#6B7280" }}>{c.role}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── TAB: STOCK DETAILS ── */}
          {tab === "stock" && (
            <>
              {/* Stock KPIs */}
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Stock Levels</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  {([
                    { label: "Current Stock",  value: drug.stock.toString(),        unit: drug.unit, color: "#0C1B33" },
                    { label: "Minimum Stock",  value: drug.minStock.toString(),     unit: drug.unit, color: "#E65100" },
                    { label: "Maximum Stock",  value: maxStock.toString(),           unit: drug.unit, color: "#2E7D32" },
                    { label: "Stock Value",    value: `₹${stockValue.toFixed(2)}`,  unit: "at cost",  color: "#1B6CA8" },
                  ] as { label: string; value: string; unit: string; color: string }[]).map((k, i) => (
                    <div key={k.label} style={{ padding: "14px 16px", borderRight: i % 2 === 0 ? "1px solid #EEF1F6" : "none", borderBottom: i < 2 ? "1px solid #EEF1F6" : "none" }}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 5 }}>{k.label}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, fontWeight: 700, color: k.color }}>{k.value}</div>
                      {k.unit && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{k.unit}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Pricing</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                  {([
                    { label: "Cost / Unit",      value: `₹${drug.cost.toFixed(2)}`,              color: "#1A2436" },
                    { label: "Selling Price",     value: `₹${drug.price.toFixed(2)}`,             color: "#1A2436" },
                    { label: "Retail Value",      value: `₹${retailValue.toFixed(2)}`,            color: "#2E7D32" },
                  ] as { label: string; value: string; color: string }[]).map((k, i) => (
                    <div key={k.label} style={{ padding: "14px 16px", borderRight: i < 2 ? "1px solid #EEF1F6" : "none" }}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Breakdown */}
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Stock Breakdown</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                  {([
                    { label: "Sellable",   value: sellable,   color: "#2E7D32", bg: "#E8F5E9" },
                    { label: "Quarantine", value: quarantine, color: "#E65100", bg: "#FFF3E0" },
                    { label: "Expired",    value: expired,    color: "#C62828", bg: "#FFEBEE" },
                  ] as { label: string; value: number; color: string; bg: string }[]).map((k, i) => (
                    <div key={k.label} style={{ padding: "16px 0", textAlign: "center" as const, borderRight: i < 2 ? "1px solid #EEF1F6" : "none" }}>
                      <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10 }}>{k.label}</div>
                      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: k.bg }}>
                        <span style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 700, color: k.color }}>{k.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── TAB: BATCH SUMMARY ── */}
          {tab === "batch" && (
            <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Batch Summary</span>
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{drugBatches.length} record{drugBatches.length !== 1 ? "s" : ""}</span>
              </div>
              {drugBatches.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {(["Batch", "Expiry", "Qty", "Status"] as const).map((h, i) => (
                        <th key={h} style={{ padding: "8px 14px", textAlign: i === 2 ? "right" as const : "left" as const, fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#F8FAFC", borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drugBatches.map((b, i, arr) => {
                      const bs = b.status === "Active" ? { bg: "#E8F5E9", color: "#2E7D32" } : b.status === "Low" ? { bg: "#FFF8E1", color: "#F57F17" } : { bg: "#FFEBEE", color: "#C62828" };
                      return (
                        <tr key={b.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                          <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{b.id}</td>
                          <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.expiry}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436", textAlign: "right" as const }}>{b.qtyCurrent}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ fontSize: 10, padding: "2px 8px", background: bs.bg, color: bs.color, fontWeight: 700 }}>{b.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 32, fontSize: 13, color: "#9CA3AF", textAlign: "center" as const }}>No batch records available for this medicine.</div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", background: "#fff", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            Close
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onReorder}
            style={{ padding: "9px 18px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#2E7D32", fontFamily: "Inter", fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F0FFF4")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            Reorder
          </button>
          <button onClick={onEdit}
            style={{ padding: "9px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#155A8A")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>
            Edit
          </button>
        </div>

      </aside>
    </>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All Categories");
  const [supplierFilter, setSupplierFilter] = useState("All Suppliers");
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
  const [deactivatedIds, setDeactivatedIds] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [reorderDrug, setReorderDrug] = useState<(typeof drugs)[0] | null>(null);
  const [viewDrawerDrug, setViewDrawerDrug] = useState<(typeof drugs)[0] | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

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
    const matchSupplier = supplierFilter === "All Suppliers" || d.supplier === supplierFilter;
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
    return matchSearch && matchCat && matchSupplier && matchLocation && matchStatus && matchExpRange && matchExpRisk && matchMinP && matchMaxP;
  });

  const filtered = sortBy === "Name (Z - A)" ? [...preFiltered].sort((a, b) => b.name.localeCompare(a.name))
    : sortBy === "Stock (High - Low)"         ? [...preFiltered].sort((a, b) => b.stock - a.stock)
    : sortBy === "Stock (Low - High)"         ? [...preFiltered].sort((a, b) => a.stock - b.stock)
    : sortBy === "Price (High - Low)"         ? [...preFiltered].sort((a, b) => b.price - a.price)
    : sortBy === "Price (Low - High)"         ? [...preFiltered].sort((a, b) => a.price - b.price)
    : [...preFiltered].sort((a, b) => a.name.localeCompare(b.name));

  const sortedRows = sortCol
    ? [...filtered].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : filtered;

  const { pageRows, footerProps } = usePagination(sortedRows, 10);

  const lowStockCount    = allDrugs.filter(d => d.status === "Low Stock").length;
  const outStockCount    = allDrugs.filter(d => d.status === "Out of Stock").length;
  const nearExpiryCount  = allDrugs.filter(d => { const { daysLeft } = getExpiryInfo(d.expiry); return daysLeft >= 0 && daysLeft <= 60; }).length;
  const expiredCount     = allDrugs.filter(d => getExpiryInfo(d.expiry).daysLeft < 0).length;
  const totalAlerts      = lowStockCount + outStockCount + nearExpiryCount + expiredCount;

  const actionRows: { dot: string; text: string; sub: string; statuses: string[] }[] = [
    { dot: "#C62828", text: `${outStockCount} medicines out of stock`,           sub: "Immediate action required",    statuses: ["Out of Stock"]  },
    { dot: "#E65100", text: `${lowStockCount} medicines below reorder level`,    sub: "Order soon to avoid stockout", statuses: ["Low Stock"]     },
    { dot: "#F57F17", text: `${nearExpiryCount} medicines expiring within 60d`,  sub: "Review and plan returns",      statuses: ["Near Expiry"]   },
    { dot: "#9CA3AF", text: `${expiredCount} medicines past expiry date`,         sub: "Quarantine immediately",       statuses: ["Expired"]       },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Inventory</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{allDrugs.length} products &middot; {totalAlerts} alerts</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Import CSV</button>
          <button style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Export CSV</button>
          <button onClick={() => setView("create")} style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Add Medicine</button>
        </div>
      </div>

      {/* Two-panel top section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Action Required */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0C1B33", letterSpacing: "0.04em", marginBottom: 14, textTransform: "uppercase" }}>Action Required</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actionRows.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid #EEF1F6", borderLeft: `3px solid ${row.dot}`, background: "#FAFBFD" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{row.text}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{row.sub}</div>
                </div>
                <button onClick={() => setStockStatuses(row.statuses)}
                  style={{ padding: "4px 10px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, flexShrink: 0 }}>
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0C1B33", letterSpacing: "0.04em", marginBottom: 14, textTransform: "uppercase" }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {QUICK_ACTIONS.map(a => {
              const handleClick = () => {
                if (a.label === "Low Stock Report") {
                  setStockStatuses(["Low Stock"]);
                } else if (a.label === "Expiry Report") {
                  setExpiryRange("Expiring in 60 days");
                  setStockStatuses(["In Stock", "Low Stock", "Out of Stock"]);
                } else if (a.label === "Stock Valuation") {
                  setSortCol("cost"); setSortDir("desc");
                } else if (a.label === "Batches") {
                  setSortCol("expiry"); setSortDir("asc");
                } else if (a.label === "Stock Movement") {
                  setSortCol("stock"); setSortDir("asc");
                } else if (a.label === "Import Stock") {
                  setView("create");
                }
              };
              return (
                <button key={a.label} onClick={handleClick}
                  style={{ padding: "10px 8px", border: "1px solid #EEF1F6", background: "#FAFBFD", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "Inter" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F0F6FF"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#BFDBFE"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FAFBFD"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#EEF1F6"; }}>
                  <div style={{ width: 32, height: 32, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: a.color, fontWeight: 700, flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <span style={{ fontSize: 11, color: "#4A5875", fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>

        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ position: "relative", flex: "0 0 240px" }}>
            <input type="text" placeholder="Search by name, generic, barcode..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "7px 10px 7px 30px", border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, color: "#1A2436" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
              onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")} />
            <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <InvFilterDropdown value={catFilter}      onChange={setCatFilter}      options={allCategories} label="All Categories" />
          <InvFilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={allSuppliers}  label="All Suppliers"  />
          <InvFilterDropdown value={locationFilter} onChange={setLocationFilter} options={locationZones} label="All Locations"  />
          <InvFilterDropdown
            value={stockStatuses.length === 1 && ["In Stock", "Low Stock", "Out of Stock"].includes(stockStatuses[0]) ? stockStatuses[0] : "All Status"}
            onChange={v => v === "All Status" ? setStockStatuses(["In Stock", "Low Stock", "Out of Stock"]) : setStockStatuses([v])}
            options={["In Stock", "Low Stock", "Out of Stock"]}
            label="All Status" />
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <button
              onClick={() => setShowFiltersPanel(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", fontWeight: 500, flexShrink: 0 }}
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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1060 }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th onClick={() => handleSort("name")} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>
                  MEDICINE
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "name" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "name" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th onClick={() => handleSort("category")} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>
                  CATEGORY
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "category" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "category" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th onClick={() => handleSort("location")} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>
                  LOCATION
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "location" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "location" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th onClick={() => handleSort("stock")} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>
                  STOCK
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "stock" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "stock" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th onClick={() => handleSort("minStock")} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>
                  REORDER LEVEL
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "minStock" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "minStock" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap" }}>
                  STOCK VALUE
                </th>
                <th onClick={() => handleSort("expiry")} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>
                  NEAREST EXPIRY
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "expiry" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "expiry" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap" }}>
                  EXPIRY RISK
                </th>
                <th onClick={() => handleSort("status")} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" as const }}>
                  STATUS
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "status" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "status" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", borderBottom: "1px solid #DDE3EC", whiteSpace: "nowrap" }}>
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(d => {
                const st = STATUS_STYLE[d.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                const stockValue = d.stock * d.cost;
                const { daysLeft, risk } = getExpiryInfo(d.expiry);
                const riskStyle = EXPIRY_RISK_STYLE[risk] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
                return (
                  <tr key={d.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>

                    {/* Medicine */}
                    <td style={{ padding: "10px 12px", minWidth: 170 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0C1B33" }}>{d.name}</div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280" }}>{d.category}</td>

                    {/* Location */}
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location}</td>

                    {/* Stock */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: d.stock === 0 ? "#C62828" : d.stock < d.minStock ? "#E65100" : "#1A2436" }}>
                        {d.stock.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{d.unit}</div>
                    </td>

                    {/* Reorder Level */}
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{d.minStock}</td>

                    {/* Stock Value */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{"₹"}{stockValue.toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>@{"₹"}{d.cost.toFixed(2)}</div>
                    </td>

                    {/* Nearest Expiry */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.expiry}</div>
                      <div style={{ fontSize: 10, marginTop: 1, color: daysLeft < 0 ? "#C62828" : daysLeft <= 60 ? "#E65100" : "#9CA3AF" }}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `+${daysLeft}d`}
                      </div>
                    </td>

                    {/* Expiry Risk */}
                    <td style={{ padding: "10px 12px" }}>
                      {risk === "Expired"
                        ? <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span>
                        : <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", background: riskStyle.bg, color: riskStyle.color }}>{risk}</span>}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", background: st.bg, color: st.color }}>{d.status}</span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: "10px 12px", position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === d.id ? null : d.id); }}
                          style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                          <svg width="3" height="14" viewBox="0 0 3 14" fill="currentColor">
                            <circle cx="1.5" cy="1.5" r="1.5" />
                            <circle cx="1.5" cy="7" r="1.5" />
                            <circle cx="1.5" cy="12.5" r="1.5" />
                          </svg>
                        </button>
                      </div>
                      {openMenuId === d.id && (
                        <div onClick={e => e.stopPropagation()}
                          style={{ position: "absolute", right: 8, top: "100%", background: "#fff", border: "1px solid #E8ECF4", boxShadow: "0 4px 16px rgba(10,22,44,0.12)", zIndex: 100, minWidth: 130 }}>
                          {[
                            { label: "View",    color: "#1A2436", action: () => { setViewDrawerDrug(d); setOpenMenuId(null); } },
                            { label: "Edit",    color: "#1B6CA8", action: () => { editDrugRef.current = d; setView("edit"); setOpenMenuId(null); } },
                            { label: "Reorder", color: "#2E7D32", action: () => { setReorderDrug(d); setOpenMenuId(null); } },
                            { label: "Deactivate", color: "#E65100", action: () => { setDeactivatedIds(prev => new Set([...prev, d.id])); setOpenMenuId(null); } },
                          ].map(item => (
                            <button key={item.label} onClick={e => { e.stopPropagation(); item.action(); }}
                              style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: item.color, fontFamily: "Inter", borderBottom: item.label !== "Deactivate" ? "1px solid #F4F6FA" : "none" as const }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              {item.label}
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

      {viewDrawerDrug && (
        <DrugViewDrawer
          drug={viewDrawerDrug}
          onClose={() => setViewDrawerDrug(null)}
          onEdit={() => { editDrugRef.current = viewDrawerDrug; setView("edit"); setViewDrawerDrug(null); }}
          onReorder={() => { setReorderDrug(viewDrawerDrug); setViewDrawerDrug(null); }}
        />
      )}

      {view === "create" && (
        <CreateMedicinePage onBack={() => setView("list")} mode="create" />
      )}
      {view === "view" && selectedDrug && (
        <CreateMedicinePage onBack={() => setView("list")} mode="view" drug={selectedDrug} />
      )}
      {view === "edit" && editDrugRef.current && (
        <CreateMedicinePage onBack={() => { editDrugRef.current = null; setView("list"); }} mode="edit" drug={editDrugRef.current} />
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
  );
}
