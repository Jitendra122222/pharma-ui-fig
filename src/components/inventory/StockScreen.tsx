import { useState, useEffect, useRef } from "react";
import { drugs } from "../../data/mockData";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { Th } from "../shared/Th";
import { Pill } from "../shared/Pill";
import { useTableSort } from "../shared/useTableSort";
import MultiStepper from "../shared/MultiStepper";

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

// ─── Batch data ────────────────────────────────────────────────────────────────

const INV_BATCHES: { id: string; drug: string; expiry: string; supplier: string; purchaseRate: number; mrp: number; qtyCurrent: number; location: string; status: string }[] = [
  { id: "BT-2025-0118", drug: "Amoxicillin 500mg",   expiry: "2026-08-15", supplier: "MedLine Pharma", purchaseRate: 0.42, mrp: 0.85, qtyCurrent: 240, location: "A1-02", status: "Active" },
  { id: "BT-2025-0117", drug: "Metformin 1000mg",    expiry: "2025-12-31", supplier: "GenPharm Ltd",   purchaseRate: 0.16, mrp: 0.32, qtyCurrent: 18,  location: "B3-05", status: "Low" },
  { id: "BT-2025-0116", drug: "Insulin Glargine",    expiry: "2025-10-15", supplier: "BioPharm AG",    purchaseRate: 26.0, mrp: 42.0, qtyCurrent: 45,  location: "COLD-01", status: "Near Expiry" },
  { id: "BT-2025-0115", drug: "Atorvastatin 20mg",   expiry: "2027-01-10", supplier: "MedLine Pharma", purchaseRate: 0.36, mrp: 0.78, qtyCurrent: 312, location: "C1-04", status: "Active" },
  { id: "BT-2025-0114", drug: "Warfarin 5mg",        expiry: "2026-04-01", supplier: "PharmaCo Inc",   purchaseRate: 0.50, mrp: 0.95, qtyCurrent: 6,   location: "B4-02", status: "Low" },
  { id: "BT-2025-0113", drug: "Ciprofloxacin 500mg", expiry: "2025-11-20", supplier: "PharmaCo Inc",   purchaseRate: 0.62, mrp: 1.20, qtyCurrent: 12,  location: "A1-06", status: "Near Expiry" },
  { id: "BT-2025-0112", drug: "Paracetamol 500mg",   expiry: "2027-05-15", supplier: "GenPharm Ltd",   purchaseRate: 0.04, mrp: 0.08, qtyCurrent: 1200, location: "A3-01", status: "Active" },
  { id: "BT-2025-0111", drug: "Amlodipine 5mg",      expiry: "2026-11-30", supplier: "MedLine Pharma", purchaseRate: 0.20, mrp: 0.45, qtyCurrent: 380, location: "B2-03", status: "Active" },
];

const COMPOSITION_MAP: Record<string, { ingredient: string; strength: string; role: string }[]> = {
  "Amoxicillin 500mg":    [{ ingredient: "Amoxicillin Trihydrate", strength: "500 mg", role: "Active" }, { ingredient: "Microcrystalline Cellulose", strength: "—", role: "Excipient" }],
  "Metformin 1000mg":     [{ ingredient: "Metformin Hydrochloride", strength: "1000 mg", role: "Active" }, { ingredient: "Povidone K30", strength: "—", role: "Binder" }],
  "Lisinopril 10mg":      [{ ingredient: "Lisinopril Dihydrate", strength: "10 mg", role: "Active" }, { ingredient: "Calcium Hydrogen Phosphate", strength: "—", role: "Filler" }],
  "Atorvastatin 20mg":    [{ ingredient: "Atorvastatin Calcium", strength: "20 mg", role: "Active" }, { ingredient: "Hydroxypropyl Cellulose", strength: "—", role: "Binder" }],
  "Omeprazole 20mg":      [{ ingredient: "Omeprazole", strength: "20 mg", role: "Active" }, { ingredient: "Mannitol", strength: "—", role: "Filler" }],
  "Salbutamol Inhaler":   [{ ingredient: "Salbutamol Sulphate", strength: "100 mcg/actuation", role: "Active" }, { ingredient: "HFA 134a Propellant", strength: "—", role: "Propellant" }],
  "Paracetamol 500mg":    [{ ingredient: "Paracetamol (Acetaminophen)", strength: "500 mg", role: "Active" }, { ingredient: "Pregelatinised Starch", strength: "—", role: "Filler" }],
  "Ciprofloxacin 500mg":  [{ ingredient: "Ciprofloxacin Hydrochloride", strength: "500 mg", role: "Active" }, { ingredient: "Crospovidone", strength: "—", role: "Disintegrant" }],
  "Amlodipine 5mg":       [{ ingredient: "Amlodipine Besylate", strength: "5 mg", role: "Active" }, { ingredient: "Anhydrous Dibasic Calcium Phosphate", strength: "—", role: "Filler" }],
  "Insulin Glargine":     [{ ingredient: "Insulin Glargine", strength: "100 U/mL", role: "Active" }, { ingredient: "m-Cresol", strength: "—", role: "Preservative" }],
  "Warfarin 5mg":         [{ ingredient: "Warfarin Sodium", strength: "5 mg", role: "Active" }, { ingredient: "Lactose Monohydrate", strength: "—", role: "Filler" }],
  "Sertraline 50mg":      [{ ingredient: "Sertraline Hydrochloride", strength: "50 mg", role: "Active" }, { ingredient: "Microcrystalline Cellulose", strength: "—", role: "Filler" }],
};

// ─── Expiry helpers ─────────────────────────────────────────────────────────────

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

function MedCheckbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: disabled ? "default" : "pointer", fontSize: 13, color: disabled ? "#9CA3AF" : "#4A5875", fontFamily: "Inter" }}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled}
        style={{ width: 16, height: 16, cursor: disabled ? "default" : "pointer", accentColor: "#1B6CA8" }} />
      {label}
    </label>
  );
}

// ─── Manufacturer combobox ─────────────────────────────────────────────────────

function ManufacturerField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  if (disabled) return <TextInput value={value} onChange={() => {}} placeholder="e.g. GSK" disabled />;
  const [open, setOpen] = useState(false);
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
  const showAddButton = q.length > 0 && !exactMatch;
  return (
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
            <button onClick={() => { setKnownList(prev => [...prev, value.trim()]); onChange(value.trim()); setOpen(false); }}
              style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "#FAFBFD", cursor: "pointer", fontSize: 13, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #EEF1F6" }}>
              <span style={{ display: "inline-flex", width: 20, height: 20, background: "#EFF6FF", border: "1px solid #BFDBFE", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#1B6CA8", flexShrink: 0, lineHeight: 1 }}>+</span>
              <span style={{ color: "#1B6CA8", fontWeight: 600 }}>Add "{value.trim()}" as new manufacturer</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Composition combobox ──────────────────────────────────────────────────────

function CompositionField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  if (disabled) return <TextInput value={value} onChange={() => {}} placeholder="e.g. Paracetamol 500 mg" disabled />;
  const [open, setOpen] = useState(false);
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
  const showAddButton = q.length > 0 && !exactMatch;
  return (
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
            <button onClick={() => { setKnownList(prev => [...prev, value.trim()]); onChange(value.trim()); setOpen(false); }}
              style={{ width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "#FAFBFD", cursor: "pointer", fontSize: 13, fontFamily: "Inter", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #EEF1F6" }}>
              <span style={{ display: "inline-flex", width: 20, height: 20, background: "#EFF6FF", border: "1px solid #BFDBFE", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#1B6CA8", flexShrink: 0, lineHeight: 1 }}>+</span>
              <span style={{ color: "#1B6CA8", fontWeight: 600 }}>Add "{value.trim()}" as new composition</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function StepChip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 40, height: 40, background: "#E8F5E9", border: "1px solid #C8E6C9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </div>
  );
}
function PillIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z" /><line x1="8.5" y1="15.5" x2="15.5" y2="8.5" /></svg>;
}
function ShieldIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function BoxIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>;
}
function CheckCircleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

// ─── Create Medicine Page ──────────────────────────────────────────────────────

function CreateMedicinePage({ onBack, mode = "create", drug }: {
  onBack: () => void; mode?: "create" | "view" | "edit"; drug?: typeof drugs[0];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isView = mode === "view" && !isEditing;

  const [form, setForm] = useState<AddMedForm>(() => {
    if (drug) {
      return { ...emptyMedForm(), genericName: drug.name, therapeuticCategory: drug.category, location: drug.location, stockLocation: drug.location, openingStock: drug.stock.toString(), minimumStock: drug.minStock.toString(), sellingPrice: drug.price.toFixed(2), mrp: drug.price.toFixed(2), wholesalePrice: drug.cost.toFixed(2), effectiveFrom: drug.expiry, distributorRef: drug.supplier, productStatus: drug.status === "Out of Stock" ? "Inactive" : "Active", baseUnit: drug.unit };
    }
    return emptyMedForm();
  });
  const [saved, setSaved] = useState(false);
  const upd = <K extends keyof AddMedForm>(key: K, value: AddMedForm[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const saveDisabled = !form.genericName.trim();
  const taStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: isView ? "#F8FAFC" : "#fff", boxSizing: "border-box", resize: isView ? "none" as const : "vertical" as const, color: isView ? "#6B7280" : undefined };
  const FL = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{children}{req && <span style={{ color: "#C62828", marginLeft: 3 }}>*</span>}</div>
  );
  const SectionCard = ({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) => (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4", marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 12 }}>{icon}<div><div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#0C1B33" }}>{title}</div><div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{subtitle}</div></div></div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Inventory / Stock</span>
          <span style={{ fontSize: 12, color: "#C8CDD8" }}>{"›"}</span>
          <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{mode === "view" ? "View Medicine" : mode === "edit" ? "Edit Medicine" : "Create New Medicine"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mode === "view" && !isEditing && (<button onClick={() => setIsEditing(true)} style={{ padding: "9px 22px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 13, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>Edit</button>)}
          <GhostBtn onClick={onBack}>Cancel</GhostBtn>
          <button onClick={() => !saveDisabled && !isView && setSaved(true)} disabled={saveDisabled || isView} style={{ padding: "9px 22px", border: "none", background: saveDisabled || isView ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: saveDisabled || isView ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
            {mode === "create" ? "Save Medicine" : "Save Changes"}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 48px" }}>
        <SectionCard icon={<StepChip><PillIcon /></StepChip>} title="Medicine Identity" subtitle="Use the approved catalog name, strength, and pack information.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 20px" }}>
            <div><FL req>Generic name</FL><TextInput value={form.genericName} onChange={e => upd("genericName", e.target.value)} placeholder="e.g. Paracetamol" disabled={isView} /></div>
            <div><FL req>Brand name</FL><TextInput value={form.brandName} onChange={e => upd("brandName", e.target.value)} placeholder="e.g. Crocin 500" disabled={isView} /></div>
            <div><FL req>Strength</FL><TextInput value={form.strength} onChange={e => upd("strength", e.target.value)} placeholder="e.g. 500 mg" disabled={isView} /></div>
            <div><FL req>Dosage form</FL><DropdownSelect value={form.dosageForm} onChange={v => upd("dosageForm", v)} options={DOSAGE_FORMS} disabled={isView} /></div>
            <div><FL req>Route</FL><DropdownSelect value={form.route} onChange={v => upd("route", v)} options={ROUTES} disabled={isView} /></div>
            <div><FL req>Pack / Unit</FL><TextInput value={form.packUnit} onChange={e => upd("packUnit", e.target.value)} placeholder="e.g. 10 tablets / strip" disabled={isView} /></div>
            <div><FL req>Manufacturer</FL><ManufacturerField value={form.manufacturer} onChange={v => upd("manufacturer", v)} disabled={isView} /></div>
            <div><FL req>Therapeutic category</FL><TextInput value={form.therapeuticCategory} onChange={e => upd("therapeuticCategory", e.target.value)} placeholder="e.g. Analgesic" disabled={isView} /></div>
            <div><FL req>Therapeutic class</FL><TextInput value={form.therapeuticClass} onChange={e => upd("therapeuticClass", e.target.value)} placeholder="e.g. Analgesic" disabled={isView} /></div>
            <div style={{ gridColumn: "1 / -1" }}><FL req>Salt composition</FL><CompositionField value={form.saltComposition} onChange={v => upd("saltComposition", v)} disabled={isView} /></div>
          </div>
        </SectionCard>
        <SectionCard icon={<StepChip><ShieldIcon /></StepChip>} title="Compliance & Storage" subtitle="These controls support pharmacy dispensing and inventory safety.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 20px" }}>
            <div><FL req>HSN code</FL><TextInput value={form.hsnCode} onChange={e => upd("hsnCode", e.target.value)} placeholder="e.g. 3482345" disabled={isView} /></div>
            <div><FL>Barcode / GTIN</FL><TextInput value={form.barcode} onChange={e => upd("barcode", e.target.value)} placeholder="Scan or enter barcode" disabled={isView} /></div>
            <div><FL>Prescription status</FL><DropdownSelect value={form.prescriptionStatus} onChange={v => upd("prescriptionStatus", v)} options={PRESCRIPTION_STATUSES} disabled={isView} /></div>
            <div><FL req>GST / Tax rate</FL><div style={{ display: "flex" }}><TextInput value={form.gstRate} onChange={e => upd("gstRate", e.target.value)} placeholder="12" disabled={isView} /><span style={{ padding: "9px 12px", border: "1px solid #E8ECF4", borderLeft: "none", fontSize: 13, color: "#6B7280", background: "#F9FAFB", flexShrink: 0 }}>%</span></div></div>
            <div><FL req>Storage condition</FL><TextInput value={form.storageCondition} onChange={e => upd("storageCondition", e.target.value)} placeholder="Store below 25°C" disabled={isView} /></div>
            <div><FL req>Temperature range</FL><TextInput value={form.tempRange} onChange={e => upd("tempRange", e.target.value)} placeholder="15-25°C" disabled={isView} /></div>
            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 16px", paddingTop: 4 }}>
              <MedCheckbox checked={form.controlledDrug} onChange={v => upd("controlledDrug", v)} label="Controlled drug" disabled={isView} />
              <MedCheckbox checked={form.narcotic} onChange={v => upd("narcotic", v)} label="Narcotic / psychotropic" disabled={isView} />
              <MedCheckbox checked={form.coldChain} onChange={v => upd("coldChain", v)} label="Cold-chain item" disabled={isView} />
              <MedCheckbox checked={form.specialHandling} onChange={v => upd("specialHandling", v)} label="Special handling" disabled={isView} />
            </div>
          </div>
        </SectionCard>
        <SectionCard icon={<StepChip><BoxIcon /></StepChip>} title="Pricing & Stock" subtitle="Pricing, stock levels, and unit configuration for this medicine.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 20px" }}>
            <div><FL req>MRP</FL><TextInput value={form.mrp} onChange={e => upd("mrp", e.target.value)} placeholder="e.g. 45.00" disabled={isView} /></div>
            <div><FL req>Selling price</FL><TextInput value={form.sellingPrice} onChange={e => upd("sellingPrice", e.target.value)} placeholder="e.g. 40.00" disabled={isView} /></div>
            <div><FL>Wholesale price</FL><TextInput value={form.wholesalePrice} onChange={e => upd("wholesalePrice", e.target.value)} placeholder="0.00" disabled={isView} /></div>
            <div><FL req>Opening stock</FL><TextInput value={form.openingStock} onChange={e => upd("openingStock", e.target.value)} placeholder="e.g. 04" disabled={isView} /></div>
            <div><FL req>Minimum stock</FL><TextInput value={form.minimumStock} onChange={e => upd("minimumStock", e.target.value)} placeholder="e.g. 5" disabled={isView} /></div>
            <div><FL req>Maximum stock</FL><TextInput value={form.maximumStock} onChange={e => upd("maximumStock", e.target.value)} placeholder="100" disabled={isView} /></div>
            <div><FL req>Reorder threshold</FL><TextInput value={form.reorderThreshold} onChange={e => upd("reorderThreshold", e.target.value)} placeholder="e.g. 10" disabled={isView} /></div>
            <div><FL req>Location / Bin</FL><TextInput value={form.location} onChange={e => upd("location", e.target.value)} placeholder="e.g. Rack A / Shelf 2" disabled={isView} /></div>
            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px", paddingTop: 4 }}>
              <MedCheckbox checked={form.batchTracking} onChange={v => upd("batchTracking", v)} label="Batch/lot tracking" disabled={isView} />
              <MedCheckbox checked={form.expiryTracking} onChange={v => upd("expiryTracking", v)} label="Expiry tracking" disabled={isView} />
              <MedCheckbox checked={form.fefoDispensing} onChange={v => upd("fefoDispensing", v)} label="FEFO dispensing" disabled={isView} />
            </div>
          </div>
        </SectionCard>
        <SectionCard icon={<StepChip><CheckCircleIcon /></StepChip>} title="Clinical Notes" subtitle="Patient-facing and catalog review information.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
            <div><FL>Therapeutic indications</FL><textarea value={form.therapeuticIndications} onChange={e => upd("therapeuticIndications", e.target.value)} rows={3} style={taStyle} disabled={isView} placeholder="Approved indications" onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")} onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} /></div>
            <div><FL>Contraindications</FL><textarea value={form.contraindications} onChange={e => upd("contraindications", e.target.value)} rows={3} style={taStyle} disabled={isView} placeholder="Important contraindications" onFocus={isView ? undefined : e => (e.currentTarget.style.borderColor = "#1B6CA8")} onBlur={isView ? undefined : e => (e.currentTarget.style.borderColor = "#E8ECF4")} /></div>
            <div><FL>Product status</FL><DropdownSelect value={form.productStatus} onChange={v => upd("productStatus", v)} options={PRODUCT_STATUSES} disabled={isView} /></div>
            <div><FL>Effective from</FL><TextInput type="date" value={form.effectiveFrom} onChange={e => upd("effectiveFrom", e.target.value)} disabled={isView} /></div>
          </div>
          <div style={{ marginTop: 20, padding: "12px 16px", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldIcon />
            <span style={{ fontSize: 13, color: "#2E7D32", lineHeight: 1.5 }}>Saving creates a protected medicine master record and makes it immediately searchable from the purchase invoice.</span>
          </div>
        </SectionCard>
      </div>
      {saved && (
        <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>{mode === "edit" ? "Medicine Updated Successfully" : "Medicine Added Successfully"}</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, fontFamily: "JetBrains Mono" }}>{[form.genericName, form.brandName].filter(Boolean).join(" · ") || "New Medicine"} &middot; Added to catalog</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <GhostBtn onClick={onBack}>Back to Stock</GhostBtn>
              <button onClick={() => { setForm(emptyMedForm()); setSaved(false); }} style={{ padding: "9px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Add Another</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Medicine Detail Page ──────────────────────────────────────────────────────

function ScanModal({ drug, onClose }: { drug: typeof drugs[0]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<typeof INV_BATCHES[0] | null | "none">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleScan() {
    if (!query.trim()) return;
    const found = INV_BATCHES.find(b =>
      b.id.toLowerCase() === query.trim().toLowerCase() ||
      b.drug.toLowerCase().includes(query.trim().toLowerCase())
    );
    setResult(found ?? "none");
  }

  const bs = result && result !== "none"
    ? result.status === "Active" ? { bg: "#E8F5E9", color: "#2E7D32" }
    : result.status === "Low"    ? { bg: "#FFF8E1", color: "#F57F17" }
    :                              { bg: "#FFEBEE", color: "#C62828" }
    : null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.32)", zIndex: 300 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 440, background: "#fff", border: "1px solid #E8ECF4", boxShadow: "0 16px 48px rgba(10,22,44,0.18)", zIndex: 301, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33", marginBottom: 3 }}>Scan Barcode / Batch ID</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Scan or enter a barcode or batch ID to look up stock details</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", fontSize: 16, color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h3M3 12h3M3 17h3M11 7h10M11 12h10M11 17h10"/></svg>
              <input ref={inputRef} type="text" value={query} onChange={e => { setQuery(e.target.value); setResult(null); }}
                onKeyDown={e => e.key === "Enter" && handleScan()}
                placeholder="e.g. BT-2025-0113 or Ciprofloxacin..."
                style={{ width: "100%", padding: "9px 12px 9px 32px", border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", outline: "none", boxSizing: "border-box" as const }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")} onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")} />
            </div>
            <button onClick={handleScan} style={{ padding: "9px 18px", border: "none", background: "#1B6CA8", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "Inter", cursor: "pointer" }}>
              Look Up
            </button>
          </div>

          {result === "none" && (
            <div style={{ padding: "14px 16px", background: "#FFEBEE", border: "1px solid #EF9A9A", fontSize: 13, color: "#C62828" }}>
              No batch or medicine found for <strong>{query}</strong>. Please check the ID and try again.
            </div>
          )}

          {result && result !== "none" && bs && (
            <div style={{ border: "1px solid #E8ECF4", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Batch Found</span>
                <span style={{ fontSize: 10, padding: "2px 8px", background: bs.bg, color: bs.color, fontWeight: 700, borderRadius: 2 }}>{result.status}</span>
              </div>
              {[
                { label: "Batch ID",      value: result.id },
                { label: "Medicine",      value: result.drug },
                { label: "Supplier",      value: result.supplier },
                { label: "Expiry",        value: result.expiry },
                { label: "Location",      value: result.location },
                { label: "Current Qty",   value: String(result.qtyCurrent) },
                { label: "Purchase Rate", value: `₹${result.purchaseRate.toFixed(2)}` },
                { label: "MRP",           value: `₹${result.mrp.toFixed(2)}` },
              ].map((r, i, arr) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}

          {result === null && (
            <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center" as const, padding: "12px 0" }}>
              Press Enter or click Look Up after entering a barcode or batch ID
            </div>
          )}
        </div>
        <div style={{ padding: "12px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>Close</button>
        </div>
      </div>
    </>
  );
}

// ─── Detail page mock data ─────────────────────────────────────────────────────

const DETAIL_MOVEMENTS: { drug: string; date: string; txn: string; qty: number; dir: "in" | "out"; from: string; to: string; ref: string; user: string; status: string }[] = [
  { drug: "Amlodipine 5mg",    date: "2025-07-25", txn: "Sale",              qty: 30,  dir: "out", from: "B2-03",   to: "Counter",    ref: "INV-2025-0892", user: "Priya K.",  status: "Completed" },
  { drug: "Amlodipine 5mg",    date: "2025-07-20", txn: "Purchase Received", qty: 200, dir: "in",  from: "Supplier", to: "B2-03",     ref: "PO-2025-0441",  user: "Ramesh S.", status: "Completed" },
  { drug: "Amlodipine 5mg",    date: "2025-07-15", txn: "Transfer",          qty: 50,  dir: "out", from: "B2-03",   to: "Cold Store", ref: "TRF-2025-044",  user: "Priya K.",  status: "Completed" },
  { drug: "Amlodipine 5mg",    date: "2025-07-10", txn: "Sale",              qty: 60,  dir: "out", from: "B2-03",   to: "Counter",    ref: "INV-2025-0781", user: "System",    status: "Completed" },
  { drug: "Amlodipine 5mg",    date: "2025-07-05", txn: "Adjustment",        qty: 5,   dir: "in",  from: "—",       to: "B2-03",      ref: "ADJ-2025-012",  user: "Ramesh S.", status: "Completed" },
  { drug: "Metformin 1000mg",  date: "2025-07-22", txn: "Sale",              qty: 20,  dir: "out", from: "B3-05",   to: "Counter",    ref: "INV-2025-0890", user: "System",    status: "Completed" },
  { drug: "Paracetamol 500mg", date: "2025-07-24", txn: "Sale",              qty: 80,  dir: "out", from: "A3-01",   to: "Counter",    ref: "INV-2025-0888", user: "Priya K.",  status: "Completed" },
  { drug: "Paracetamol 500mg", date: "2025-07-18", txn: "Purchase Received", qty: 500, dir: "in",  from: "Supplier", to: "A3-01",     ref: "PO-2025-0435",  user: "Ramesh S.", status: "Completed" },
];

const DETAIL_LOCATIONS: { drug: string; location: string; batch: string; availQty: number; reservedQty: number; status: string; lastMovement: string }[] = [
  { drug: "Amlodipine 5mg",    location: "B2-03",               batch: "BT-2025-0111", availQty: 230, reservedQty: 50,  status: "Active",    lastMovement: "2025-07-25" },
  { drug: "Amlodipine 5mg",    location: "B2-04",               batch: "BT-2025-0111", availQty: 60,  reservedQty: 0,   status: "Active",    lastMovement: "2025-07-15" },
  { drug: "Amlodipine 5mg",    location: "Counter",             batch: "BT-2025-0111", availQty: 40,  reservedQty: 0,   status: "Active",    lastMovement: "2025-07-25" },
  { drug: "Metformin 1000mg",  location: "B3-05 (Main Store)",  batch: "BT-2025-0117", availQty: 18,  reservedQty: 0,   status: "Low",       lastMovement: "2025-07-22" },
  { drug: "Paracetamol 500mg", location: "A3-01 (Main Store)",  batch: "BT-2025-0112", availQty: 1200,reservedQty: 120, status: "Active",    lastMovement: "2025-07-24" },
];

const DETAIL_TIMELINE: { drug: string; date: string; time: string; event: string; qty: number; ref: string; user: string; txnType: string }[] = [
  { drug: "Amlodipine 5mg", date: "2025-07-25", time: "10:42 AM", event: "Sale",              qty: -30,  ref: "INV-2025-0892", user: "Priya K.",  txnType: "sale" },
  { drug: "Amlodipine 5mg", date: "2025-07-20", time: "09:00 AM", event: "Purchase Received", qty: 200,  ref: "PO-2025-0441",  user: "Ramesh S.", txnType: "purchase" },
  { drug: "Amlodipine 5mg", date: "2025-07-15", time: "02:15 PM", event: "Transfer Out",      qty: -50,  ref: "TRF-2025-044",  user: "Priya K.",  txnType: "transfer" },
  { drug: "Amlodipine 5mg", date: "2025-07-10", time: "11:30 AM", event: "Sale",              qty: -60,  ref: "INV-2025-0781", user: "System",    txnType: "sale" },
  { drug: "Amlodipine 5mg", date: "2025-07-05", time: "04:00 PM", event: "Stock Adjustment",  qty: 5,    ref: "ADJ-2025-012",  user: "Ramesh S.", txnType: "adjustment" },
  { drug: "Amlodipine 5mg", date: "2025-06-28", time: "09:00 AM", event: "Physical Count",    qty: 0,    ref: "CNT-2025-028",  user: "Priya K.",  txnType: "count" },
];

const DETAIL_ISSUES: { drug: string; id: string; type: string; severity: string; description: string; raised: string; status: string }[] = [
  { drug: "Metformin 1000mg",    id: "ISS-2025-0034", type: "Short Book",      severity: "High",   description: "Stock below minimum threshold — reorder immediately",       raised: "2025-07-20", status: "Open" },
  { drug: "Metformin 1000mg",    id: "ISS-2025-0031", type: "Expiry Recovery", severity: "Medium", description: "Batch BT-2025-0117 expires in 5 months — plan clearance",   raised: "2025-07-15", status: "In Progress" },
  { drug: "Insulin Glargine",    id: "ISS-2025-0033", type: "Near Expiry",     severity: "High",   description: "Batch BT-2025-0116 expires in 79 days — cold chain verified", raised: "2025-07-18", status: "Open" },
  { drug: "Insulin Glargine",    id: "ISS-2025-0030", type: "Short Book",      severity: "Medium", description: "Cold chain medicine — reorder lead time is 14 days",          raised: "2025-07-10", status: "Open" },
  { drug: "Ciprofloxacin 500mg", id: "ISS-2025-0032", type: "Near Expiry",     severity: "High",   description: "Batch BT-2025-0113 expires in 114 days — schedule return",   raised: "2025-07-17", status: "Open" },
];

const BATCH_META: Record<string, { scheme: string; invoice: string }> = {
  "BT-2025-0111": { scheme: "10+1 Free", invoice: "PI-2025-0441" },
  "BT-2025-0112": { scheme: "—",         invoice: "PI-2025-0389" },
  "BT-2025-0115": { scheme: "5% Disc",   invoice: "PI-2025-0430" },
  "BT-2025-0118": { scheme: "—",         invoice: "PI-2025-0452" },
  "BT-2025-0113": { scheme: "Clearance", invoice: "PI-2025-0412" },
  "BT-2025-0116": { scheme: "—",         invoice: "PI-2025-0421" },
  "BT-2025-0117": { scheme: "—",         invoice: "PI-2025-0398" },
  "BT-2025-0114": { scheme: "—",         invoice: "PI-2025-0406" },
};

const INV_ROLES = ["Inventory Manager", "Pharmacist", "Store Operator", "Auditor"] as const;
type InvRole = typeof INV_ROLES[number];
const LOCKED_BY_ROLE: Record<InvRole, string[]> = {
  "Inventory Manager": [],
  "Pharmacist":        ["Adjust Stock", "Block Batch"],
  "Store Operator":    ["Adjust Stock", "Block Batch", "Quarantine", "Report Damage"],
  "Auditor":           ["Transfer Stock", "Count Stock", "Adjust Stock", "Report Damage", "Create Short", "Quarantine", "Block Batch", "Edit Medicine"],
};
const TXN_COLOR: Record<string, string> = { sale: "#C62828", purchase: "#2E7D32", transfer: "#1B6CA8", adjustment: "#E65100", count: "#6B7280" };
const TXN_BG:    Record<string, string> = { sale: "#FFEBEE", purchase: "#E8F5E9", transfer: "#EFF6FF", adjustment: "#FFF3E0", count: "#F0F3F7" };

function EmptyTabState({ label, sub }: { label: string; sub: string }) {
  return (
    <div style={{ padding: "48px 0", textAlign: "center" as const }}>
      <div style={{ width: 44, height: 44, background: "#F0F3F7", border: "1px solid #E8ECF4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#9CA3AF" }}>{sub}</div>
    </div>
  );
}

function MedicineDetailPage({ drug, onBack }: { drug: typeof drugs[0]; onBack: () => void }) {
  const [tab, setTab] = useState<"batches" | "locations" | "movements" | "issues" | "timeline">("batches");
  const [actionOpen, setActionOpen] = useState(false);
  const [actionPos, setActionPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [showScan, setShowScan] = useState(false);
  const [role, setRole] = useState<InvRole>("Inventory Manager");
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferDests, setTransferDests] = useState<{ location: string; qty: string }[]>([]);
  const [transferReason, setTransferReason] = useState("Location Reorganization");

  const batches     = INV_BATCHES.filter(b => b.drug === drug.name);
  const composition = COMPOSITION_MAP[drug.name] || [{ ingredient: drug.name, strength: "—", role: "Active" }];
  const movements   = DETAIL_MOVEMENTS.filter(m => m.drug === drug.name);
  const locations   = DETAIL_LOCATIONS.filter(l => l.drug === drug.name);
  const timeline    = DETAIL_TIMELINE.filter(t => t.drug === drug.name);
  const issues      = DETAIL_ISSUES.filter(is => is.drug === drug.name);

  const totalQty     = batches.reduce((s, b) => s + b.qtyCurrent, 0) || drug.stock;
  const sellableQty  = batches.filter(b => b.status === "Active").reduce((s, b) => s + b.qtyCurrent, 0) || Math.round(totalQty * 0.88);
  const reservedQty  = Math.round(totalQty * 0.12);
  const costValue    = totalQty * drug.cost;
  const nearExpiry   = batches.filter(b => { const d = Math.round((new Date(b.expiry).getTime() - Date.now()) / 86400000); return d <= 90 && d >= 0; });
  const avgDailySales = 12;
  const stockCover   = Math.round(sellableQty / avgDailySales);
  const incoming     = 100;

  const locked       = LOCKED_BY_ROLE[role];
  const expiryRisk   = nearExpiry.length > 2 ? "High" : nearExpiry.length > 0 ? "Medium" : "Low";
  const stockOutRisk = drug.stock < drug.minStock ? "High" : drug.stock < drug.minStock * 1.5 ? "Low" : "None";
  const coverRisk    = stockCover < 14 ? "High" : stockCover < 30 ? "Medium" : "Low";
  const overallRisk  = [expiryRisk, stockOutRisk === "High" ? "High" : "Low", coverRisk].includes("High") ? "High" : [expiryRisk, coverRisk].includes("Medium") ? "Medium" : "Low";
  const isShortBook  = SHORT_BOOK_STORE.has(drug.name);

  const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
    "In Stock":     { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
    "Low Stock":    { bg: "#FFF3E0", color: "#E65100", border: "#FFCC80" },
    "Out of Stock": { bg: "#FFEBEE", color: "#C62828", border: "#EF9A9A" },
    "Near Expiry":  { bg: "#FFF8E1", color: "#F57F17", border: "#FFE082" },
  };
  const sc = STATUS_COLOR[drug.status] ?? { bg: "#F0F3F7", color: "#6B7280", border: "#DDE3EC" };

  const ISSUE_SEV: Record<string, { bg: string; color: string }> = {
    High:   { bg: "#FFEBEE", color: "#C62828" },
    Medium: { bg: "#FFF3E0", color: "#E65100" },
    Low:    { bg: "#E8F5E9", color: "#2E7D32" },
  };

  const TABS: { key: "batches" | "locations" | "movements" | "issues" | "timeline"; label: string; count: number; warn: boolean }[] = [
    { key: "batches",   label: "Batches",   count: batches.length,   warn: false },
    { key: "locations", label: "Locations", count: locations.length, warn: false },
    { key: "movements", label: "Movements", count: movements.length, warn: false },
    { key: "issues",    label: "Issues",    count: issues.length,    warn: issues.length > 0 },
    { key: "timeline",  label: "Timeline",  count: timeline.length,  warn: false },
  ];

  const ACTIONS = ["Transfer Stock", "Count Stock", "Adjust Stock", "Report Damage", "Create Short", "Quarantine", "Block Batch", "View Timeline", "Edit Medicine"];

  function txnKey(txn: string, dir: "in" | "out"): string {
    if (dir === "in") return "purchase";
    if (txn.toLowerCase().includes("sale")) return "sale";
    if (txn.toLowerCase().includes("transfer")) return "transfer";
    return "adjustment";
  }

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Topbar — always visible */}
      <div style={{ background: "#fff", flexShrink: 0 }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#1B6CA8 0%,#00ACC1 100%)" }} />
        <div style={{ padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, borderBottom: "1px solid #EEF1F6" }}>

          {/* Left: back + breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onBack}
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>Inventory / Stock</span>
            <span style={{ color: "#C8CDD8", fontSize: 13 }}>›</span>
            <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>{drug.name}</span>
          </div>


        </div>
      </div>

      {showScan && <ScanModal drug={drug} onClose={() => setShowScan(false)} />}

      {/* Transfer Stock modal */}
      {showTransfer && (() => {
        const locOptions = locations.length > 0 ? locations.map(l => l.location) : [drug.location];
        const fromLoc = locations.find(l => l.location === transferFrom);
        const available = fromLoc ? fromLoc.availQty : drug.stock;
        const firstBatch = batches[0]?.batchNo ?? "—";
        const REASONS = ["Location Reorganization", "Replenishment", "Batch Consolidation", "Counter Refill", "Returns"];
        const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5, fontFamily: "Inter" };
        const valueStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: "JetBrains Mono" };
        const inputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #DDE3EC", fontSize: 13, fontFamily: "Inter", color: "#1A2436", background: "#fff", outline: "none", boxSizing: "border-box" };
        return (
          <>
            <div onClick={() => setShowTransfer(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.45)", zIndex: 210 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 580, background: "#fff", border: "1px solid #DDE3EC", boxShadow: "0 16px 48px rgba(10,22,44,0.2)", zIndex: 211, display: "flex", flexDirection: "column" as const }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #EEF1F6" }}>
                <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Transfer Stock</span>
                <button onClick={() => setShowTransfer(false)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "#9CA3AF", fontSize: 16, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#1A2436")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: "20px", display: "flex", flexDirection: "column" as const, gap: 16 }}>

                {/* Row 1: Medicine + Batch */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                  <div><div style={labelStyle}>Medicine</div><div style={valueStyle}>{drug.name}</div></div>
                  <div><div style={labelStyle}>Batch</div><div style={valueStyle}>{firstBatch}</div></div>
                </div>

                {/* Row 2: From + Available */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                  <div>
                    <div style={labelStyle}>From</div>
                    <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)} style={inputStyle}>
                      {locOptions.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={labelStyle}>Available</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "JetBrains Mono", color: "#0C1B33", marginTop: 3 }}>
                      {available.toLocaleString()} <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter", fontWeight: 400 }}>{drug.unit.toLowerCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Destination rows */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={labelStyle}>To (Destinations)</div>
                    {(() => {
                      const totalAllocated = transferDests.reduce((s, d) => s + (parseInt(d.qty) || 0), 0);
                      const over = totalAllocated > available;
                      return (
                        <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 600, color: over ? "#C62828" : "#2E7D32" }}>
                          {totalAllocated.toLocaleString()} / {available.toLocaleString()} allocated
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                    {transferDests.map((dest, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 120px 32px", gap: 8, alignItems: "center" }}>
                        <select value={dest.location} onChange={e => setTransferDests(ds => ds.map((d, i) => i === idx ? { ...d, location: e.target.value } : d))} style={inputStyle}>
                          {locOptions.filter(l => l !== transferFrom).map(l => <option key={l}>{l}</option>)}
                          <option value="New Location">New Location</option>
                        </select>
                        <input type="number" min={1} value={dest.qty}
                          onChange={e => setTransferDests(ds => ds.map((d, i) => i === idx ? { ...d, qty: e.target.value } : d))}
                          style={{ ...inputStyle, textAlign: "right" as const }} />
                        <button onClick={() => setTransferDests(ds => ds.filter((_, i) => i !== idx))}
                          style={{ width: 32, height: 32, border: "1px solid #EEF1F6", background: "#FAFBFD", cursor: "pointer", color: "#9CA3AF", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#FFEBEE"; e.currentTarget.style.color = "#C62828"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#FAFBFD"; e.currentTarget.style.color = "#9CA3AF"; }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setTransferDests(ds => [...ds, { location: locOptions.filter(l => l !== transferFrom)[0] ?? "New Location", qty: "0" }])}
                    style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#155D96")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#1B6CA8")}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>
                    Add Destination
                  </button>
                </div>

                {/* Reason */}
                <div>
                  <div style={labelStyle}>Reason</div>
                  <select value={transferReason} onChange={e => setTransferReason(e.target.value)} style={inputStyle}>
                    {REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid #EEF1F6" }}>
                <button onClick={() => setShowTransfer(false)}
                  style={{ padding: "7px 18px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#4A5875", fontFamily: "Inter", fontWeight: 600 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F0F3F7")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>Cancel</button>
                <button onClick={() => setShowTransfer(false)}
                  style={{ padding: "7px 18px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#155D96")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>Transfer Stock</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Short Book warning banner */}
      {isShortBook && (
        <div style={{ flexShrink: 0, background: "#FFF8E1", borderBottom: "1px solid #FFE082", padding: "7px 28px", display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F57F17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#F57F17", fontFamily: "Inter" }}>Active Short Book case for {drug.name}</span>
          <span style={{ fontSize: 11, color: "#B45309", marginLeft: 4 }}>— Pending supplier fulfilment</span>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Hero card */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
          {/* Gradient accent */}
          <div style={{ height: 4, background: "linear-gradient(90deg,#1B6CA8 0%,#00ACC1 100%)" }} />

          {/* Name + actions + chips */}
          <div style={{ padding: "18px 24px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", letterSpacing: "-0.02em" }}>{drug.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, padding: "5px 12px", background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 700, borderRadius: 4, whiteSpace: "nowrap" as const }}>{drug.status}</span>
                <button onClick={() => setShowScan(true)}
                  style={{ padding: "5px 13px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#4A5875", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 5, borderRadius: 4 }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#F0F3F7"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h3M3 12h3M3 17h3M11 7h10M11 12h10M11 17h10"/></svg>
                  Scan
                </button>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={e => {
                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      setActionPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                      setActionOpen(p => !p);
                    }}
                    style={{ padding: "5px 14px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#155D96")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#1B6CA8")}>
                    Actions
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3.5l3 3 3-3"/></svg>
                  </button>
                  {actionOpen && (
                    <>
                      <div onClick={() => setActionOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                      <div style={{ position: "fixed", top: actionPos.top, right: actionPos.right, background: "#fff", border: "1px solid #E8ECF4", boxShadow: "0 8px 24px rgba(10,22,44,0.14)", zIndex: 200, width: 182, borderRadius: 4, overflow: "hidden" }}>
                        {ACTIONS.map((a, i) => {
                          const isLocked = locked.includes(a);
                          const isDanger = ["Report Damage", "Block Batch", "Quarantine"].includes(a);
                          return (
                            <button key={a} onClick={() => { if (isLocked) return; setActionOpen(false); if (a === "Transfer Stock") { const locs = locations.length > 0 ? locations.map(l => l.location) : [drug.location]; setTransferFrom(locs[0]); setTransferDests([{ location: locs[1] ?? locs[0], qty: "20" }]); setShowTransfer(true); } }}
                              style={{ width: "100%", textAlign: "left" as const, padding: "9px 14px", border: "none", background: "transparent", cursor: isLocked ? "not-allowed" : "pointer", fontSize: 12.5, color: isLocked ? "#C8CDD8" : isDanger ? "#C62828" : "#1A2436", fontFamily: "Inter", borderBottom: i < ACTIONS.length - 1 ? "1px solid #F4F6FA" : "none" as const, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                              onMouseEnter={e => { if (!isLocked) e.currentTarget.style.background = "#F8FAFC"; }}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <span>{a}</span>
                              {isLocked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C8CDD8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Chips */}
            <div style={{ display: "flex", gap: 6 }}>
              {[drug.category, drug.unit, drug.supplier].map(tag => (
                <span key={tag} style={{ padding: "3px 10px", background: "#F0F3F7", border: "1px solid #E8ECF4", borderRadius: 100, fontSize: 11.5, color: "#4A5875", fontFamily: "Inter" }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* KPI Row 1 — full bleed */}
          <div style={{ borderTop: "1px solid #F0F3F7", display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
            {([
              { label: "Total Stock",   value: totalQty.toLocaleString(),  sub: drug.unit,                       warn: drug.stock < drug.minStock },
              { label: "Reorder Level", value: String(drug.minStock),       sub: drug.unit,                       warn: drug.stock < drug.minStock },
              { label: "Stock Value",   value: `₹${costValue.toFixed(0)}`,  sub: `@₹${drug.cost.toFixed(2)}`,     warn: false },
              { label: "MRP",           value: `₹${drug.price.toFixed(2)}`, sub: "per unit",                      warn: false },
              { label: "Near Expiry",   value: String(nearExpiry.length),   sub: nearExpiry.length === 1 ? "batch" : "batches", warn: nearExpiry.length > 0 },
            ] as { label: string; value: string; sub: string; warn: boolean }[]).map((k, i) => (
              <div key={k.label} style={{ padding: "14px 24px", borderRight: i < 4 ? "1px solid #F0F3F7" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "JetBrains Mono", color: k.warn ? "#C62828" : "#0C1B33", lineHeight: 1, marginBottom: 3 }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* KPI Row 2 — Inventory Intelligence */}
          <div style={{ borderTop: "1px solid #F0F3F7", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", background: "#FAFBFD" }}>
            {([
              { label: "Sellable",     value: sellableQty.toLocaleString(), sub: "active batches",        warn: false },
              { label: "Stock Cover",  value: `${stockCover} days`,         sub: stockCover >= 30 ? "healthy" : stockCover >= 14 ? "low" : "critical", warn: stockCover < 14 },
              { label: "Incoming",     value: String(incoming),             sub: drug.unit,               warn: false },
              { label: "Avg Sales",    value: `${avgDailySales}/day`,       sub: "",                      warn: false },
              { label: "Risk",         value: overallRisk,                  sub: "",                      warn: overallRisk === "High" },
            ] as { label: string; value: string; sub: string; warn: boolean }[]).map((k, i) => (
              <div key={k.label} style={{ padding: "10px 24px", borderRight: i < 4 ? "1px solid #F0F3F7" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "JetBrains Mono", color: k.warn ? "#C62828" : overallRisk === "Medium" && k.label === "Risk" ? "#E65100" : "#4A5875", lineHeight: 1, marginBottom: 3 }}>{k.value}</div>
                {k.sub && <div style={{ fontSize: 10, color: "#9CA3AF" }}>{k.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Stock Health Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Stock Breakdown */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #F0F3F7" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Stock Breakdown</div>
              <button style={{ fontSize: 11, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#155D96")}
                onMouseLeave={e => (e.currentTarget.style.color = "#1B6CA8")}>View Stock</button>
            </div>
            {([
              { label: "Sellable",       qty: sellableQty, color: "#2E7D32" },
              { label: "Reserved",       qty: reservedQty, color: "#1B6CA8" },
              { label: "Damaged",        qty: 0,           color: "#C62828" },
              { label: "Quarantine",     qty: 0,           color: "#E65100" },
              { label: "Return Pending", qty: 0,           color: "#9CA3AF" },
            ] as { label: string; qty: number; color: string }[]).map(row => {
              const pct = totalQty > 0 ? Math.round((row.qty / totalQty) * 100) : 0;
              return (
                <div key={row.label} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "#4A5875", fontFamily: "Inter" }}>{row.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{row.qty}</span>
                      <span style={{ fontSize: 10, color: "#9CA3AF", width: 32, textAlign: "right" as const }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "#F0F3F7", borderRadius: 3 }}>
                    <div style={{ height: 5, width: `${pct}%`, background: row.color, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inventory Health */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #F0F3F7" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Inventory Health</div>
              <button style={{ fontSize: 11, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#155D96")}
                onMouseLeave={e => (e.currentTarget.style.color = "#1B6CA8")}>View Risk</button>
            </div>
            {([
              { label: "Expiry Risk",    status: expiryRisk,  value: `${nearExpiry.length} batch${nearExpiry.length !== 1 ? "es" : ""} ≤90d` },
              { label: "Stock Cover",    status: coverRisk,   value: `${stockCover} days` },
              { label: "Stock-out Risk", status: stockOutRisk === "High" ? "High" : stockOutRisk === "Low" ? "Medium" : "Low", value: stockOutRisk === "High" ? "Below reorder" : "Adequate" },
              { label: "Overstock",      status: drug.stock > drug.minStock * 4 ? "High" : "Low", value: drug.stock > drug.minStock * 4 ? "Check demand" : "Normal" },
              { label: "Dead Stock",     status: "Low", value: "No flagged batches" },
            ] as { label: string; status: string; value: string }[]).map((row, i, arr) => {
              const st = row.status === "High" ? { color: "#C62828", bg: "#FFEBEE" } : row.status === "Medium" ? { color: "#E65100", bg: "#FFF3E0" } : { color: "#2E7D32", bg: "#E8F5E9" };
              return (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}>
                  <span style={{ fontSize: 12, color: "#4A5875", fontFamily: "Inter" }}>{row.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#6B7280" }}>{row.value}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", background: st.bg, color: st.color, borderRadius: 2 }}>{row.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Locations + composition row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Stock Locations card */}
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px", display: "flex", flexDirection: "column" as const }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #F0F3F7" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Stock Locations</div>
              <button style={{ fontSize: 11, fontWeight: 600, color: "#1B6CA8", fontFamily: "Inter", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#155D96")}
                onMouseLeave={e => (e.currentTarget.style.color = "#1B6CA8")}>View All</button>
            </div>
            {(() => {
              const locRows = locations.length > 0
                ? locations.map(l => ({ name: l.location, qty: l.availQty + l.reservedQty }))
                : [{ name: drug.location, qty: drug.stock }];
              const maxQty = Math.max(...locRows.map(r => r.qty), 1);
              return (
                <>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 12 }}>
                    {locRows.map(row => (
                      <div key={row.name}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436", minWidth: 80 }}>{row.name}</span>
                          <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#4A5875", minWidth: 72 }}>{row.qty.toLocaleString()} {drug.unit.toLowerCase()}</span>
                          <div style={{ flex: 1, height: 6, background: "#F0F3F7", borderRadius: 3 }}>
                            <div style={{ height: 6, width: `${Math.round((row.qty / totalQty) * 100)}%`, background: "#1B6CA8", borderRadius: 3 }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #F0F3F7", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
                    {locRows.length} location{locRows.length !== 1 ? "s" : ""}
                  </div>
                </>
              );
            })()}
          </div>

          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #F0F3F7" }}>Salt Composition</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {composition.map(c => (
                <div key={c.ingredient} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: c.role === "Active" ? "#EFF6FF" : "#FAFBFD", border: `1px solid ${c.role === "Active" ? "#BFDBFE" : "#EEF1F6"}`, borderRadius: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.role === "Active" ? "#1B6CA8" : "#C8CDD8", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: c.role === "Active" ? "#1B6CA8" : "#6B7280", fontWeight: c.role === "Active" ? 600 : 400, fontFamily: "Inter" }}>
                    {c.ingredient}{c.strength !== "—" ? ` (${c.strength})` : ""}
                  </span>
                  <span style={{ fontSize: 10, color: "#9CA3AF", padding: "2px 7px", background: "#fff", border: "1px solid #EEF1F6", borderRadius: 2 }}>{c.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #EEF1F6", padding: "0 4px" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? "#1B6CA8" : "#6B7280", borderBottom: tab === t.key ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: 6 }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", background: t.warn ? "#FFEBEE" : "#F0F3F7", color: t.warn ? "#C62828" : "#9CA3AF", borderRadius: 10 }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Batches */}
          {tab === "batches" && (
            <>
              <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAFBFD", borderBottom: "1px solid #F0F3F7" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>{batches.length} batch record{batches.length !== 1 ? "s" : ""}</span>
              </div>
              {batches.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {([ ["Batch ID","left"],["Expiry","left"],["Days Left","right"],["Supplier","left"],["Inv. No.","left"],["Pur. Rate","right"],["MRP","right"],["Qty","right"],["Scheme","left"],["Location","left"],["Status","left"] ] as [string,string][]).map(([h,a]) => (
                        <th key={h} style={{ padding: "9px 12px", textAlign: a as "left"|"right", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b, i, arr) => {
                      const bs = b.status === "Active" ? { bg: "#E8F5E9", color: "#2E7D32" } : b.status === "Low" ? { bg: "#FFF8E1", color: "#F57F17" } : { bg: "#FFEBEE", color: "#C62828" };
                      const daysLeft = Math.round((new Date(b.expiry).getTime() - Date.now()) / 86400000);
                      const meta = BATCH_META[b.id] ?? { scheme: "—", invoice: "—" };
                      const dlColor = daysLeft <= 90 ? "#C62828" : daysLeft <= 180 ? "#E65100" : "#2E7D32";
                      return (
                        <tr key={b.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                          <td style={{ padding: "11px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 700 }}>{b.id}</td>
                          <td style={{ padding: "11px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.expiry}</td>
                          <td style={{ padding: "11px 12px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: dlColor, textAlign: "right" as const }}>{daysLeft}d</td>
                          <td style={{ padding: "11px 12px", fontSize: 12, color: "#4A5875" }}>{b.supplier}</td>
                          <td style={{ padding: "11px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{meta.invoice}</td>
                          <td style={{ padding: "11px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>₹{b.purchaseRate.toFixed(2)}</td>
                          <td style={{ padding: "11px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" as const }}>₹{b.mrp.toFixed(2)}</td>
                          <td style={{ padding: "11px 12px", fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33", textAlign: "right" as const }}>{b.qtyCurrent}</td>
                          <td style={{ padding: "11px 12px", fontSize: 11, color: "#6B7280", fontFamily: "Inter" }}>{meta.scheme}</td>
                          <td style={{ padding: "11px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.location}</td>
                          <td style={{ padding: "11px 12px" }}>
                            <span style={{ fontSize: 10, padding: "3px 8px", background: bs.bg, color: bs.color, fontWeight: 700, borderRadius: 2 }}>{b.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: "48px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>No batch records found.</div>
              )}
            </>
          )}

          {/* Locations */}
          {tab === "locations" && (
            <>
              <div style={{ padding: "10px 16px", background: "#FAFBFD", borderBottom: "1px solid #F0F3F7" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>{locations.length} location{locations.length !== 1 ? "s" : ""}</span>
              </div>
              {locations.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {([ ["Location","left"],["Batch","left"],["Available","right"],["Reserved","right"],["Status","left"],["Last Movement","left"] ] as [string,string][]).map(([h,a]) => (
                        <th key={h} style={{ padding: "9px 14px", textAlign: a as "left"|"right", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc, i, arr) => {
                      const ls = loc.status === "Active" ? { bg: "#E8F5E9", color: "#2E7D32" } : loc.status === "Low" ? { bg: "#FFF8E1", color: "#F57F17" } : { bg: "#F0F3F7", color: "#6B7280" };
                      return (
                        <tr key={i} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                          <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{loc.location}</td>
                          <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 700 }}>{loc.batch}</td>
                          <td style={{ padding: "12px 14px", fontSize: 14, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#0C1B33", textAlign: "right" as const }}>{loc.availQty}</td>
                          <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#4A5875", textAlign: "right" as const }}>{loc.reservedQty}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontSize: 10, padding: "3px 8px", background: ls.bg, color: ls.color, fontWeight: 700, borderRadius: 2 }}>{loc.status}</span>
                          </td>
                          <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{loc.lastMovement}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <EmptyTabState label="Location Distribution" sub="No location records found for this medicine." />
              )}
            </>
          )}

          {/* Movements */}
          {tab === "movements" && (
            <>
              <div style={{ padding: "10px 16px", background: "#FAFBFD", borderBottom: "1px solid #F0F3F7" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>{movements.length} transaction{movements.length !== 1 ? "s" : ""}</span>
              </div>
              {movements.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {([ ["Date","left"],["Transaction","left"],["Qty","right"],["From","left"],["To","left"],["Reference","left"],["User","left"],["Status","left"] ] as [string,string][]).map(([h,a]) => (
                        <th key={h} style={{ padding: "9px 14px", textAlign: a as "left"|"right", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderBottom: "1px solid #EEF1F6" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m, i, arr) => {
                      const tk = txnKey(m.txn, m.dir);
                      return (
                        <tr key={i} style={{ borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                          <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{m.date}</td>
                          <td style={{ padding: "11px 14px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: TXN_BG[tk] ?? "#F0F3F7", color: TXN_COLOR[tk] ?? "#6B7280", borderRadius: 2 }}>{m.txn}</span>
                          </td>
                          <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: m.dir === "out" ? "#C62828" : "#2E7D32", textAlign: "right" as const }}>{m.dir === "out" ? "-" : "+"}{m.qty}</td>
                          <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{m.from}</td>
                          <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{m.to}</td>
                          <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{m.ref}</td>
                          <td style={{ padding: "11px 14px", fontSize: 12, color: "#4A5875" }}>{m.user}</td>
                          <td style={{ padding: "11px 14px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", background: "#E8F5E9", color: "#2E7D32", borderRadius: 2 }}>{m.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <EmptyTabState label="Stock Movements" sub="No movement records found for this medicine." />
              )}
            </>
          )}

          {/* Issues */}
          {tab === "issues" && (
            <div style={{ padding: 20 }}>
              {issues.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                  {issues.map(iss => {
                    const sev = ISSUE_SEV[iss.severity] ?? { bg: "#F0F3F7", color: "#9CA3AF" };
                    const statSt = iss.status === "Open" ? { bg: "#FFEBEE", color: "#C62828" } : iss.status === "In Progress" ? { bg: "#FFF3E0", color: "#E65100" } : { bg: "#E8F5E9", color: "#2E7D32" };
                    return (
                      <div key={iss.id} style={{ border: "1px solid #E8ECF4", background: "#FAFBFD", padding: "14px 18px", borderLeft: `3px solid ${sev.color}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33", fontFamily: "Outfit" }}>{iss.type}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", background: sev.bg, color: sev.color, borderRadius: 2 }}>{iss.severity}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#4A5875", fontFamily: "Inter" }}>{iss.description}</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", background: statSt.bg, color: statSt.color, borderRadius: 2, whiteSpace: "nowrap" as const }}>{iss.status}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{iss.id}</span>
                          <span style={{ fontSize: 11, color: "#9CA3AF" }}>Raised: {iss.raised}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "40px 0", textAlign: "center" as const }}>
                  <div style={{ width: 44, height: 44, background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#2E7D32", marginBottom: 4 }}>No Active Issues</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>This medicine has no open inventory issues</div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {tab === "timeline" && (
            <div style={{ padding: "20px 24px" }}>
              {timeline.length > 0 ? (
                <div style={{ position: "relative", paddingLeft: 28 }}>
                  <div style={{ position: "absolute", left: 8, top: 6, bottom: 6, width: 1, background: "#E8ECF4" }} />
                  {timeline.map((ev, i) => {
                    const tc = TXN_COLOR[ev.txnType] ?? "#9CA3AF";
                    const tb = TXN_BG[ev.txnType] ?? "#F0F3F7";
                    return (
                      <div key={i} style={{ display: "flex", gap: 16, marginBottom: i < timeline.length - 1 ? 20 : 0, position: "relative" }}>
                        <div style={{ position: "absolute", left: -22, top: 3, width: 10, height: 10, borderRadius: "50%", background: tc, border: "2px solid #fff", boxShadow: `0 0 0 1px ${tc}` }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#0C1B33", fontFamily: "Inter" }}>{ev.event}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", background: tb, color: tc, borderRadius: 2 }}>{ev.txnType}</span>
                            {ev.qty !== 0 && (
                              <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: ev.qty < 0 ? "#C62828" : "#2E7D32" }}>{ev.qty > 0 ? "+" : ""}{ev.qty}</span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{ev.date} {ev.time}</span>
                            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{ev.ref}</span>
                            <span style={{ fontSize: 11, color: "#6B7280" }}>{ev.user}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyTabState label="Stock Timeline" sub="No timeline events recorded for this medicine." />
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Add to Short Book drawer ─────────────────────────────────────────────────

const SHORT_BOOK_STORE: Set<string> = new Set();

function AddToShortBookDrawer({ drug, onClose }: { drug: typeof drugs[0]; onClose: () => void }) {
  const alreadyIn = SHORT_BOOK_STORE.has(drug.name);
  const suggested = Math.max(0, drug.minStock * 3 - drug.stock);
  const [orderQty, setOrderQty] = useState(String(suggested || drug.minStock));
  const [reason, setReason] = useState("Low Stock");
  const [supplier, setSupplier] = useState(drug.supplier);
  const [saved, setSaved] = useState(false);

  const handleAdd = () => { SHORT_BOOK_STORE.add(drug.name); setSaved(true); };

  if (saved) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
        <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
            <div style={{ width: 56, height: 56, background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#2E7D32" }}>&#10003;</div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 700, color: "#0C1B33", textAlign: "center" }}>{drug.name} added to Short Book</div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Close</button>
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
            <div style={{ padding: "14px 16px", background: "#FFF8E1", border: "1px solid #FFE082", fontSize: 13, color: "#F57F17" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{drug.name} is already in your Short Book.</div>
            </div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", flexShrink: 0 }}>
            <button onClick={onClose} style={{ width: "100%", padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Go to Short Book</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.28)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", zIndex: 101, boxShadow: "-6px 0 32px rgba(0,0,0,0.18)", background: "#fff" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#00ACC1", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Reorder</div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Add to Short Book</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33", marginBottom: 8 }}>{drug.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[{ label: "Current Stock", value: String(drug.stock), warn: drug.stock < drug.minStock }, { label: "Reorder Level", value: String(drug.minStock), warn: false }, { label: "Suggested Order", value: String(suggested), warn: false }, { label: "Supplier", value: drug.supplier, warn: false }].map(r => (
                <div key={r.label}><div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div><div style={{ fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: r.warn ? "#C62828" : "#1A2436" }}>{r.value}</div></div>
              ))}
            </div>
          </div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Order Quantity <span style={{ color: "#C62828" }}>*</span></div><input type="number" value={orderQty} min={1} onChange={e => setOrderQty(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "JetBrains Mono", boxSizing: "border-box" as const }} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Reason</div><select value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>{["Low Stock", "Out of Stock", "Today's Sales", "Manual", "Customer Demand"].map(r => <option key={r}>{r}</option>)}</select></div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: "#4A5875", marginBottom: 6 }}>Preferred Supplier</div><select value={supplier} onChange={e => setSupplier(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer" }}>{["ABC Pharma", "XYZ Pharma", "Medico", drug.supplier].filter((v, i, a) => a.indexOf(v) === i).map(s => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Cancel</button>
          <button onClick={handleAdd} disabled={!orderQty || Number(orderQty) < 1} style={{ flex: 2, padding: "9px 0", border: "none", background: !orderQty || Number(orderQty) < 1 ? "#C8CDD8" : "#1B6CA8", fontSize: 13, cursor: !orderQty || Number(orderQty) < 1 ? "not-allowed" : "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Add to Short Book</button>
        </div>
      </div>
    </>
  );
}

// ─── Filter dropdown ───────────────────────────────────────────────────────────

function InvFilterDropdown({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: "7px 24px 7px 10px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: value === label ? "#9CA3AF" : "#1A2436", fontFamily: "Inter", outline: "none", appearance: "none", WebkitAppearance: "none", minWidth: 112 }}>
        <option value={label}>{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "#9CA3AF" }}>&#9660;</span>
    </div>
  );
}

// ─── Filters drawer ────────────────────────────────────────────────────────────

function PnlSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 28px 8px 10px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", appearance: "none", WebkitAppearance: "none", cursor: "pointer", color: "#1A2436", boxSizing: "border-box" as const }} onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")} onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "#9CA3AF" }}>&#9660;</span>
    </div>
  );
}

interface FiltersDrawerProps {
  onClose: () => void; allCategories: string[]; allSuppliers: string[]; locationZones: string[];
  catFilter: string; setCatFilter: (v: string) => void; supplierFilter: string; setSupplierFilter: (v: string) => void;
  locationFilter: string; setLocationFilter: (v: string) => void; stockStatuses: string[]; setStockStatuses: (v: string[]) => void;
  expiryRange: string; setExpiryRange: (v: string) => void; expiryRisk: string; setExpiryRisk: (v: string) => void;
  minPrice: string; setMinPrice: (v: string) => void; maxPrice: string; setMaxPrice: (v: string) => void;
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

  const handleApply = () => { props.setCatFilter(draftCat); props.setSupplierFilter(draftSupplier); props.setLocationFilter(draftLocation); props.setStockStatuses(draftStatuses); props.setExpiryRange(draftExpiryRange); props.setExpiryRisk(draftExpiryRisk); props.setMinPrice(draftMinPrice); props.setMaxPrice(draftMaxPrice); props.setSortBy(draftSortBy); onClose(); };
  const handleReset = () => { setDraftCat("All Categories"); setDraftSupplier("All Suppliers"); setDraftLocation("All Locations"); setDraftStatuses(["In Stock", "Low Stock", "Out of Stock"]); setDraftExpiryRange("All"); setDraftExpiryRisk("All"); setDraftMinPrice(""); setDraftMaxPrice(""); setDraftSortBy("Name (A - Z)"); };
  const toggleStatus = (s: string) => setDraftStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const PnlSection = ({ label, children }: { label: string; children: React.ReactNode }) => <div><div style={{ fontSize: 13, fontWeight: 600, color: "#0C1B33", marginBottom: 10, fontFamily: "Inter" }}>{label}</div>{children}</div>;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "rgba(10,22,44,0.18)", zIndex: 100 }} />
      <div style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 400, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(10,22,44,0.14)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
          <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#0C1B33" }}>Filters</div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", color: "#6B7280", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{"×"}</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <PnlSection label="Categories"><PnlSelect value={draftCat} onChange={setDraftCat} options={["All Categories", ...allCategories]} /></PnlSection>
          <PnlSection label="Suppliers"><PnlSelect value={draftSupplier} onChange={setDraftSupplier} options={["All Suppliers", ...allSuppliers]} /></PnlSection>
          <PnlSection label="Locations"><PnlSelect value={draftLocation} onChange={setDraftLocation} options={["All Locations", ...locationZones]} /></PnlSection>
          <PnlSection label="Stock Status">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["In Stock", "Low Stock", "Out of Stock", "Near Expiry", "Expired", "Quarantine"].map(s => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={draftStatuses.includes(s)} onChange={() => toggleStatus(s)} style={{ width: 16, height: 16, accentColor: "#1B6CA8", cursor: "pointer" }} />
                  <span style={{ fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>{s}</span>
                </label>
              ))}
            </div>
          </PnlSection>
          <PnlSection label="Expiry Range"><PnlSelect value={draftExpiryRange} onChange={setDraftExpiryRange} options={["All", "Expiring in 30 days", "Expiring in 60 days", "Expiring in 90 days", "Expired"]} /></PnlSection>
          <PnlSection label="Expiry Risk"><PnlSelect value={draftExpiryRisk} onChange={setDraftExpiryRisk} options={["All", "High", "Medium", "Low"]} /></PnlSection>
          <PnlSection label="Sort By"><PnlSelect value={draftSortBy} onChange={setDraftSortBy} options={["Name (A - Z)", "Name (Z - A)", "Stock (High - Low)", "Stock (Low - High)", "Price (High - Low)", "Price (Low - High)"]} /></PnlSection>
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid #EEF1F6", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={handleReset} style={{ flex: 1, padding: "9px 0", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Reset</button>
          <button onClick={handleApply} style={{ flex: 2, padding: "9px 0", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Apply Filters</button>
        </div>
      </div>
    </>
  );
}

// ─── Main Stock Screen ─────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { label: "All",        statuses: ["In Stock", "Low Stock", "Out of Stock"] },
  { label: "Sellable",   statuses: ["In Stock"] },
  { label: "Near Expiry",statuses: ["Near Expiry"] },
  { label: "Low Stock",  statuses: ["Low Stock"] },
  { label: "Out of Stock",statuses: ["Out of Stock"] },
];

export default function StockScreen() {
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
  const [view, setView] = useState<"list" | "create" | "view" | "edit" | "detail">("list");
  const [selectedDrug, setSelectedDrug] = useState<typeof drugs[0] | null>(null);
  const [detailDrug, setDetailDrug] = useState<typeof drugs[0] | null>(null);
  const editDrugRef = useRef<typeof drugs[0] | null>(null);
  const [deactivatedIds, setDeactivatedIds] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [reorderDrug, setReorderDrug] = useState<typeof drugs[0] | null>(null);
  const [activeChip, setActiveChip] = useState("All");
  const [importedDrugs, setImportedDrugs] = useState<(typeof drugs[0])[]>([]);
  const [importResult, setImportResult] = useState<{ count: number; errors: number } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const headers = ["Name", "Category", "Supplier", "Stock", "Unit", "MRP", "Cost", "Min Stock", "Location", "Status", "Expiry"];
    const rows = sortedRows.map(d => [
      d.name, d.category, d.supplier, d.stock, d.unit,
      d.price.toFixed(2), d.cost.toFixed(2), d.minStock, d.location, d.status, d.expiry,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) || "";
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setImportResult({ count: 0, errors: 0 }); return; }
      const ts = Date.now();
      let added = 0;
      let errors = 0;
      const newDrugs: (typeof drugs[0])[] = [];
      lines.slice(1).forEach((line, i) => {
        const cols = line.split(",").map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
        if (cols.length < 9 || !cols[0]) { errors++; return; }
        newDrugs.push({
          id: ts + i,
          name: cols[0],
          category: cols[1] || "Other",
          supplier: cols[2] || "",
          stock: parseInt(cols[3]) || 0,
          unit: cols[4] || "Unit",
          price: parseFloat(cols[5]) || 0,
          cost: parseFloat(cols[6]) || 0,
          minStock: parseInt(cols[7]) || 0,
          location: cols[8] || "A1-01",
          status: cols[9] || "In Stock",
          expiry: cols[10] || "2026-12-31",
        } as typeof drugs[0]);
        added++;
      });
      setImportedDrugs(prev => [...prev, ...newDrugs]);
      setImportResult({ count: added, errors });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const allDrugs = [...drugs, ...importedDrugs].filter(d => !deactivatedIds.has(d.id));
  const allCategories = Array.from(new Set(drugs.map(d => d.category))).sort();
  const allSuppliers = Array.from(new Set(drugs.map(d => d.supplier))).sort();
  const locationZones = Array.from(new Set(drugs.map(d => d.location.includes("COLD") ? "Cold Storage" : `Section ${d.location.charAt(0)}`))).sort();

  const preFiltered = allDrugs.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.supplier.toLowerCase().includes(search.toLowerCase()) || d.location.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All Categories" || d.category === catFilter;
    const matchSupplier = supplierFilter === "All Suppliers" || d.supplier === supplierFilter;
    const matchLocation = locationFilter === "All Locations" || (locationFilter === "Cold Storage" ? d.location.includes("COLD") : d.location.startsWith(locationFilter.replace("Section ", "")));
    const { daysLeft, risk: r } = getExpiryInfo(d.expiry);
    const matchStatus = stockStatuses.length === 0 || stockStatuses.includes(d.status) || (stockStatuses.includes("Near Expiry") && daysLeft >= 0 && daysLeft <= 60) || (stockStatuses.includes("Expired") && daysLeft < 0);
    const matchExpRange = expiryRange === "All" || (expiryRange === "Expiring in 30 days" && daysLeft >= 0 && daysLeft <= 30) || (expiryRange === "Expiring in 60 days" && daysLeft >= 0 && daysLeft <= 60) || (expiryRange === "Expiring in 90 days" && daysLeft >= 0 && daysLeft <= 90) || (expiryRange === "Expired" && daysLeft < 0);
    const matchExpRisk = expiryRisk === "All" || r === expiryRisk;
    const matchMinP = !minPrice || d.price >= Number(minPrice);
    const matchMaxP = !maxPrice || d.price <= Number(maxPrice);
    return matchSearch && matchCat && matchSupplier && matchLocation && matchStatus && matchExpRange && matchExpRisk && matchMinP && matchMaxP;
  });

  const filtered = sortBy === "Name (Z - A)" ? [...preFiltered].sort((a, b) => b.name.localeCompare(a.name)) : sortBy === "Stock (High - Low)" ? [...preFiltered].sort((a, b) => b.stock - a.stock) : sortBy === "Stock (Low - High)" ? [...preFiltered].sort((a, b) => a.stock - b.stock) : sortBy === "Price (High - Low)" ? [...preFiltered].sort((a, b) => b.price - a.price) : sortBy === "Price (Low - High)" ? [...preFiltered].sort((a, b) => a.price - b.price) : [...preFiltered].sort((a, b) => a.name.localeCompare(b.name));

  const { sortCol, sortDir, handleSort, setSortCol, setSortDir, sorted: sortedRows } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sortedRows, 10);

  const MENU_ITEMS = [
    { label: "View Details",  color: "#1A2436", action: (d: typeof drugs[0]) => { setDetailDrug(d); setOpenMenuId(null); } },
    { label: "Edit",          color: "#1B6CA8", action: (d: typeof drugs[0]) => { editDrugRef.current = d; setView("edit"); setOpenMenuId(null); } },
    { label: "Reorder",       color: "#2E7D32", action: (d: typeof drugs[0]) => { setReorderDrug(d); setOpenMenuId(null); } },
    { label: "Transfer Stock",color: "#6B21A8", action: (_d: typeof drugs[0]) => setOpenMenuId(null) },
    { label: "Count Stock",   color: "#0C6E6E", action: (_d: typeof drugs[0]) => setOpenMenuId(null) },
    { label: "Report Damage", color: "#C62828", action: (_d: typeof drugs[0]) => setOpenMenuId(null) },
    { label: "Deactivate",    color: "#E65100", action: (d: typeof drugs[0]) => { setDeactivatedIds(prev => new Set([...prev, d.id])); setOpenMenuId(null); } },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Stock</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{allDrugs.length} products &middot; Medicine catalog</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => importRef.current?.click()} style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Import CSV</button>
          <button onClick={handleExport} style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter" }}>Export CSV</button>
          <input ref={importRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportFile} />
          <button onClick={() => setView("create")} style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Add Medicine</button>
        </div>
      </div>

      {/* Quick filter chips */}
      <div style={{ display: "flex", gap: 6 }}>
        {QUICK_CHIPS.map(c => (
          <button key={c.label} onClick={() => { setActiveChip(c.label); setStockStatuses(c.statuses); }}
            style={{ padding: "5px 14px", border: `1px solid ${activeChip === c.label ? "#1B6CA8" : "#DDE3EC"}`, background: activeChip === c.label ? "#EFF6FF" : "#fff", fontSize: 12, cursor: "pointer", color: activeChip === c.label ? "#1B6CA8" : "#6B7280", fontFamily: "Inter", fontWeight: activeChip === c.label ? 600 : 400, borderRadius: 20 }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", border: "1px solid #DDE3EC", overflow: "hidden" }}>
        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ position: "relative", flex: "0 0 260px" }}>
            <input type="text" placeholder="Search medicine, barcode, batch, supplier..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "7px 10px 7px 30px", border: "1px solid #DDE3EC", fontSize: 12, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}
              onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")} onBlur={e => (e.currentTarget.style.borderColor = "#DDE3EC")} />
            <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </div>
          <InvFilterDropdown value={catFilter} onChange={setCatFilter} options={allCategories} label="All Categories" />
          <InvFilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={allSuppliers} label="All Suppliers" />
          <InvFilterDropdown value={locationFilter} onChange={setLocationFilter} options={locationZones} label="All Locations" />
          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => setShowFiltersPanel(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto", minHeight: 420 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1060 }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Medicine</Th>
                <Th onSort={() => handleSort("category")} sortDir={sortCol === "category" ? sortDir : null}>Category</Th>
                <Th onSort={() => handleSort("location")} sortDir={sortCol === "location" ? sortDir : null}>Location</Th>
                <Th onSort={() => handleSort("stock")} sortDir={sortCol === "stock" ? sortDir : null}>Stock</Th>
                <Th onSort={() => handleSort("minStock")} sortDir={sortCol === "minStock" ? sortDir : null}>Reorder Level</Th>
                <Th>Stock Value</Th>
                <Th onSort={() => handleSort("expiry")} sortDir={sortCol === "expiry" ? sortDir : null}>Nearest Expiry</Th>
                <Th>Expiry Risk</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(d => {
                const stockValue = d.stock * d.cost;
                const { daysLeft, risk } = getExpiryInfo(d.expiry);
                const riskStyle = EXPIRY_RISK_STYLE[risk] ?? { bg: "#F3F4F6", color: "#9CA3AF" };
                return (
                  <tr key={d.id} onClick={() => setDetailDrug(d)} style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                    <td style={{ padding: "10px 12px", minWidth: 170 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1B6CA8", textDecoration: "underline" }}>
                        {d.name}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280" }}>{d.category}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.location}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, color: d.stock === 0 ? "#C62828" : d.stock < d.minStock ? "#E65100" : "#1A2436" }}>{d.stock.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>{d.unit}</div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{d.minStock}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{"₹"}{stockValue.toFixed(0)}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>@{"₹"}{d.cost.toFixed(2)}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.expiry}</div>
                      <div style={{ fontSize: 10, marginTop: 1, color: daysLeft < 0 ? "#C62828" : daysLeft <= 60 ? "#E65100" : "#9CA3AF" }}>{daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `+${daysLeft}d`}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {risk === "Expired" ? <span style={{ fontSize: 11, color: "#9CA3AF" }}>—</span> : <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", background: riskStyle.bg, color: riskStyle.color, borderRadius: 2 }}>{risk}</span>}
                    </td>
                    <td style={{ padding: "10px 12px" }}><Pill status={d.status} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (openMenuId === d.id) { setOpenMenuId(null); return; }
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          setOpenMenuId(d.id);
                        }}
                        style={{ width: 28, height: 28, border: "1px solid #E8ECF4", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
                        <svg width="3" height="14" viewBox="0 0 3 14" fill="currentColor"><circle cx="1.5" cy="1.5" r="1.5" /><circle cx="1.5" cy="7" r="1.5" /><circle cx="1.5" cy="12.5" r="1.5" /></svg>
                      </button>
                      {openMenuId === d.id && (
                        <>
                          <div onClick={() => setOpenMenuId(null)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                          <div style={{ position: "fixed", top: menuPos.top, right: menuPos.right, background: "#fff", border: "1px solid #E8ECF4", boxShadow: "0 4px 16px rgba(10,22,44,0.12)", zIndex: 200, width: 148 }}>
                            {MENU_ITEMS.map((item, mi) => (
                              <button key={item.label} onClick={() => item.action(d)}
                                style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: item.color, fontFamily: "Inter", borderBottom: mi < MENU_ITEMS.length - 1 ? "1px solid #F4F6FA" : "none" as const }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6B7280", fontSize: 13 }}>No products match your search.</div>}
        </div>
        <PaginationFooter {...footerProps} />
      </div>

      {reorderDrug && <AddToShortBookDrawer drug={reorderDrug} onClose={() => setReorderDrug(null)} />}

      {detailDrug && <MedicineDetailPage drug={detailDrug} onBack={() => setDetailDrug(null)} />}

      {view === "create" && <CreateMedicinePage onBack={() => setView("list")} mode="create" />}
      {view === "view" && selectedDrug && <CreateMedicinePage onBack={() => setView("list")} mode="view" drug={selectedDrug} />}
      {view === "edit" && editDrugRef.current && <CreateMedicinePage onBack={() => { editDrugRef.current = null; setView("list"); }} mode="edit" drug={editDrugRef.current} />}

      {showFiltersPanel && (
        <FiltersDrawer onClose={() => setShowFiltersPanel(false)} allCategories={allCategories} allSuppliers={allSuppliers} locationZones={locationZones}
          catFilter={catFilter} setCatFilter={setCatFilter} supplierFilter={supplierFilter} setSupplierFilter={setSupplierFilter}
          locationFilter={locationFilter} setLocationFilter={setLocationFilter} stockStatuses={stockStatuses} setStockStatuses={setStockStatuses}
          expiryRange={expiryRange} setExpiryRange={setExpiryRange} expiryRisk={expiryRisk} setExpiryRisk={setExpiryRisk}
          minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} sortBy={sortBy} setSortBy={setSortBy} />
      )}

      {importResult && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: importResult.count === 0 ? "#FFEBEE" : "#E8F5E9", border: `1px solid ${importResult.count === 0 ? "#EF9A9A" : "#A5D6A7"}`, padding: "14px 18px", boxShadow: "0 4px 20px rgba(10,22,44,0.14)", zIndex: 300, display: "flex", alignItems: "center", gap: 14, minWidth: 280 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0C1B33", fontFamily: "Inter" }}>
              {importResult.count > 0 ? `${importResult.count} medicine${importResult.count !== 1 ? "s" : ""} imported` : "Nothing imported"}
            </div>
            {importResult.errors > 0 && (
              <div style={{ fontSize: 11, color: "#E65100", marginTop: 3, fontFamily: "Inter" }}>{importResult.errors} row{importResult.errors !== 1 ? "s" : ""} skipped (invalid format)</div>
            )}
          </div>
          <button onClick={() => setImportResult(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: "#6B7280", lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}>×</button>
        </div>
      )}
    </div>
  );
}
