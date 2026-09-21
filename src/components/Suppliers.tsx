import { useState, useRef, useEffect } from "react";
import type { PurchasesDeepLink } from "../App";
import { Pill } from "./shared/Pill";
import { Th } from "./shared/Th";
import { useTableSort } from "./shared/useTableSort";
import { usePagination, PaginationFooter } from "./shared/usePagination";
import { ChevronDown } from "./shared/Icons";
import { INDIAN_STATES } from "./purchases/purchasesData";
import {
  Td, TableRow, PrimaryBtn, GhostBtn,
  FilterSearch, FilterDropdown, ClearFiltersButton, NewButton,
  BackConfirmDialog, EmptyTableRow,
} from "./purchases/purchasesShared";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenView = "list" | "add" | "view" | "edit";
type DetailTab = "overview" | "commercial" | "expiry" | "orders" | "invoices" | "returns" | "payments" | "audit";

interface ContactPerson {
  id: number;
  name: string;
  designation: string;
  mobile: string;
  email: string;
  whatsapp: string;
  isPrimary: boolean;
}

interface MedExpiryRule {
  id: number;
  medicine: string;
  minShelfLife: string;
  returnAllowed: string;
  returnWindow: string;
  resolution: string;
  notes: string;
}

interface DistributorRecord {
  id: string;
  name: string;
  code: string;
  type: string;
  status: "Active" | "Inactive" | "Draft";
  preferred: boolean;
  gstin: string;
  drugLicense: string;
  drugLicenseType: string;
  city: string;
  state: string;
  contactPerson: string;
  mobile: string;
  paymentTerms: string;
  creditLimit: number;
  creditEnabled: boolean;
  expiryReturn: boolean;
  balance: number;
  // extended fields stored from form
  email?: string;
  website?: string;
  addrLine1?: string;
  addrLine2?: string;
  area?: string;
  district?: string;
  pin?: string;
  gstType?: string;
  pan?: string;
  fssai?: string;
  defaultDiscount?: string;
  defaultScheme?: string;
  defaultFreight?: string;
  minOrderValue?: string;
  expiryPolicy?: string;
  minShelfLife?: string;
  expiryReturnWindow?: string;
  returnFreight?: string;
  nearExpiryReturn?: boolean;
  expiredReturn?: boolean;
  creditNoteExpected?: boolean;
  replacementAllowed?: boolean;
  orderMethod?: string;
  expectedDelivery?: string;
  deliveryDays?: string[];
  bankName?: string;
  upiId?: string;
  group?: string;
  outstandingLimit?: string;
  distributorNotes?: string;
  contacts?: ContactPerson[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DISTRIBUTORS: DistributorRecord[] = [
  { id: "DIST-001", name: "MedLine Pharma", code: "ML-001", type: "Stockist", status: "Active", preferred: true, gstin: "27AABCM1234K1ZX", drugLicense: "MH/DL/2024/00892", drugLicenseType: "Form 20", city: "Mumbai", state: "Maharashtra", contactPerson: "Rajesh Kumar", mobile: "9820044321", paymentTerms: "Credit 30 Days", creditLimit: 200000, creditEnabled: true, expiryReturn: true, balance: -34200, email: "orders@medlinepharma.com", addrLine1: "Shop 12, Pharmacy Lane", area: "Dadar", district: "Mumbai City", pin: "400014", gstType: "Regular", pan: "AABCM1234K", defaultDiscount: "10", defaultScheme: "9+1", defaultFreight: "Included", expiryPolicy: "All Eligible Products", minShelfLife: "6 Months", expiryReturnWindow: "90 Days", returnFreight: "Distributor", nearExpiryReturn: true, expiredReturn: false, creditNoteExpected: true, replacementAllowed: false, orderMethod: "WhatsApp", expectedDelivery: "Next Day", deliveryDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], bankName: "HDFC Bank", outstandingLimit: "150000", minOrderValue: "1000", contacts: [{ id: 1, name: "Rajesh Kumar", designation: "Sales Manager", mobile: "9820044321", email: "rajesh@medlinepharma.com", whatsapp: "9820044321", isPrimary: true }] },
  { id: "DIST-002", name: "GenPharm Ltd", code: "GP-002", type: "Distributor", status: "Active", preferred: true, gstin: "27AACCG5678L2ZY", drugLicense: "MH/DL/2023/01445", drugLicenseType: "Form 21", city: "Pune", state: "Maharashtra", contactPerson: "Anita Sharma", mobile: "9823456789", paymentTerms: "Credit 15 Days", creditLimit: 100000, creditEnabled: true, expiryReturn: true, balance: 0, email: "accounts@genpharm.co.in", addrLine1: "Plot 45, Industrial Area", pin: "411001", gstType: "Regular", defaultDiscount: "8", defaultFreight: "Extra", expiryPolicy: "Selected Products", minShelfLife: "3 Months", expiryReturnWindow: "60 Days", orderMethod: "Email", expectedDelivery: "Next Day", deliveryDays: ["Monday","Wednesday","Friday"], bankName: "ICICI Bank", contacts: [{ id: 1, name: "Anita Sharma", designation: "Key Account Manager", mobile: "9823456789", email: "anita@genpharm.co.in", whatsapp: "9823456789", isPrimary: true }] },
  { id: "DIST-003", name: "PharmaCo Inc", code: "PC-003", type: "Super Stockist", status: "Active", preferred: false, gstin: "29ABCPH9012M3ZW", drugLicense: "KA/DL/2024/00234", drugLicenseType: "Form 20B", city: "Bengaluru", state: "Karnataka", contactPerson: "Suresh Nair", mobile: "9945678901", paymentTerms: "Credit 45 Days", creditLimit: 500000, creditEnabled: true, expiryReturn: false, balance: -18500, email: "suresh@pharmacoinc.com", addrLine1: "No. 78, MG Road", pin: "560001", gstType: "Regular", defaultDiscount: "12", defaultFreight: "Included", expiryPolicy: "No Return", orderMethod: "Portal", expectedDelivery: "2 Days", deliveryDays: ["Tuesday","Thursday","Saturday"], bankName: "Axis Bank", outstandingLimit: "400000" },
  { id: "DIST-004", name: "BioPharm AG", code: "BP-004", type: "C&F", status: "Active", preferred: true, gstin: "07AABCB3456N4ZV", drugLicense: "DL/DL/2024/00567", drugLicenseType: "Form 21B", city: "Delhi", state: "Delhi", contactPerson: "Priya Mehta", mobile: "9811234567", paymentTerms: "Credit 30 Days", creditLimit: 300000, creditEnabled: true, expiryReturn: true, balance: 0, email: "priya@biopharm.in", addrLine1: "A-12, Karol Bagh", pin: "110005", gstType: "Regular", defaultDiscount: "9", defaultScheme: "9+1", expiryPolicy: "All Eligible Products", minShelfLife: "6 Months", returnFreight: "Shared", nearExpiryReturn: true, creditNoteExpected: true, orderMethod: "WhatsApp", expectedDelivery: "Same Day", deliveryDays: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] },
  { id: "DIST-005", name: "RespiCare Ltd", code: "RC-005", type: "Manufacturer Direct", status: "Active", preferred: false, gstin: "24AABCR7890O5ZU", drugLicense: "GJ/DL/2023/00789", drugLicenseType: "Form 20", city: "Ahmedabad", state: "Gujarat", contactPerson: "Vikram Shah", mobile: "9876543210", paymentTerms: "Cash on Delivery", creditLimit: 0, creditEnabled: false, expiryReturn: true, balance: -6200, email: "vikram@respicare.com", addrLine1: "Opp. Civil Hospital", pin: "380001", gstType: "Unregistered", expiryPolicy: "All Eligible Products", minShelfLife: "3 Months", orderMethod: "Phone", expectedDelivery: "3 Days", deliveryDays: ["Monday","Wednesday","Friday"] },
  { id: "DIST-006", name: "Apex Medicals", code: "AM-006", type: "Stockist", status: "Inactive", preferred: false, gstin: "33AABCA2345P6ZT", drugLicense: "TN/DL/2022/01234", drugLicenseType: "Form 20", city: "Chennai", state: "Tamil Nadu", contactPerson: "Karthik Rajan", mobile: "9791234567", paymentTerms: "Credit 30 Days", creditLimit: 80000, creditEnabled: true, expiryReturn: false, balance: 0, email: "karthik@apexmedicals.com", addrLine1: "23 Anna Salai", pin: "600002", gstType: "Regular", expiryPolicy: "No Return", orderMethod: "Email", expectedDelivery: "2 Days", deliveryDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"] },
  { id: "DIST-007", name: "HealthFirst Pharma", code: "HF-007", type: "Distributor", status: "Draft", preferred: false, gstin: "", drugLicense: "MH/DL/2025/00001", drugLicenseType: "Form 21", city: "Nashik", state: "Maharashtra", contactPerson: "Deepak Patil", mobile: "9823300001", paymentTerms: "Credit 30 Days", creditLimit: 0, creditEnabled: false, expiryReturn: false, balance: 0 },
];

// ─── Mock transaction history ─────────────────────────────────────────────────

const MOCK_PO_HISTORY = [
  { poNo: "PO-2026-0155", date: "18 Aug 2026", items: 9, amount: 3650, status: "Partial" },
  { poNo: "PO-2026-0150", date: "26 Jul 2026", items: 8, amount: 2928, status: "Received" },
  { poNo: "PO-2026-0147", date: "13 Jul 2026", items: 15, amount: 5200, status: "Received" },
  { poNo: "PO-2026-0143", date: "16 Jun 2026", items: 7, amount: 2333, status: "Received" },
  { poNo: "PO-2026-0141", date: "30 May 2026", items: 4, amount: 2393, status: "Cancelled" },
];

const MOCK_INVOICES = [
  { invNo: "PINV-2026-0072", poRef: "PO-2026-0155", date: "18 Aug 2026", dueDate: "17 Sep 2026", items: 9, subtotal: 3120, gst: 273, total: 3394, paid: 0, balance: 3394, status: "Unpaid" },
  { invNo: "PINV-2026-0067", poRef: "PO-2026-0150", date: "28 Jul 2026", dueDate: "27 Aug 2026", items: 8, subtotal: 2693, gst: 236, total: 2928, paid: 2928, balance: 0, status: "Paid" },
  { invNo: "PINV-2026-0064", poRef: "PO-2026-0147", date: "15 Jul 2026", dueDate: "14 Aug 2026", items: 15, subtotal: 4782, gst: 418, total: 5200, paid: 5200, balance: 0, status: "Paid" },
  { invNo: "PINV-2026-0060", poRef: "PO-2026-0143", date: "18 Jun 2026", dueDate: "18 Jul 2026", items: 7, subtotal: 2145, gst: 188, total: 2333, paid: 2333, balance: 0, status: "Paid" },
  { invNo: "PINV-2026-0058", poRef: "PO-2026-0141", date: "02 Jun 2026", dueDate: "02 Jul 2026", items: 4, subtotal: 2200, gst: 193, total: 2393, paid: 0, balance: 2393, status: "Unpaid" },
];

const MOCK_RETURNS = [
  { retNo: "PRN-2026-0014", invRef: "PINV-2026-0072", date: "19 Aug 2026", items: 2, reason: "Damaged on arrival", amount: 342, creditNote: "CN-2026-0009", status: "Credit Issued" },
  { retNo: "PRN-2026-0013", invRef: "PINV-2026-0067", date: "14 Aug 2026", items: 1, reason: "Near-expiry batch", amount: 170, creditNote: "CN-2026-0008", status: "Credit Issued" },
  { retNo: "PRN-2026-0011", invRef: "PINV-2026-0064", date: "30 Jul 2026", items: 2, reason: "Wrong quantity received", amount: 220, creditNote: "CN-2026-0007", status: "Credit Issued" },
];

const MOCK_PAYMENTS = [
  { payNo: "PAY-2026-0044", date: "15 Sep 2026", invRef: "PINV-2026-0044", method: "UPI", amount: 25000, type: "Payment", status: "Cleared" },
  { payNo: "PAY-2026-0043", date: "14 Sep 2026", invRef: "PINV-2026-0043", method: "Cash", amount: 12000, type: "Payment", status: "Cleared" },
  { payNo: "PAY-2026-0041", date: "10 Sep 2026", invRef: "PINV-2026-0068", method: "Bank Transfer", amount: 18500, type: "Payment", status: "Cleared" },
  { payNo: "PAY-2026-0039", date: "05 Sep 2026", invRef: "PINV-2026-0067", method: "Bank Transfer", amount: 9800, type: "Payment", status: "Cleared" },
  { payNo: "PAY-2026-0038", date: "03 Sep 2026", invRef: "PINV-2026-0066", method: "Cheque", amount: 22000, type: "Payment", status: "Cleared" },
];

const MOCK_AUDIT = [
  { ts: "14 Jun 2025, 10:42 AM", user: "Rahul M.", action: "Status changed", detail: "Inactive → Active" },
  { ts: "12 Jun 2025, 03:15 PM", user: "Priya S.", action: "PO raised", detail: "PO-2025-0142 for ₹42,300" },
  { ts: "05 Jun 2025, 11:00 AM", user: "Admin", action: "Credit limit updated", detail: "₹1,50,000 → ₹2,00,000" },
  { ts: "28 May 2025, 09:30 AM", user: "Rahul M.", action: "Contact updated", detail: "Mobile number changed" },
  { ts: "01 Jan 2025, 08:00 AM", user: "Admin", action: "Distributor created", detail: "Initial setup" },
];

// ─── Validators ───────────────────────────────────────────────────────────────

function validateGSTIN(v: string) {
  if (!v) return "";
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v) ? "" : "Invalid GSTIN format (e.g. 27AABCM1234K1ZX)";
}
function validatePAN(v: string) {
  if (!v) return "";
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v) ? "" : "Invalid PAN format (e.g. ABCDE1234F)";
}
function validateMobile(v: string) {
  if (!v) return "";
  return /^[6-9][0-9]{9}$/.test(v) ? "" : "Enter valid 10-digit Indian mobile number";
}
function validatePIN(v: string) {
  if (!v) return "";
  return /^[1-9][0-9]{5}$/.test(v) ? "" : "Enter valid 6-digit PIN code";
}
function validateEmail(v: string) {
  if (!v) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter valid email address";
}

// ─── Shared form primitives (purchase-module style) ───────────────────────────

function LocalDropdownSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "8px 34px 8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: "#1A2436", appearance: "none", WebkitAppearance: "none" as const, boxSizing: "border-box" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
        <ChevronDown />
      </span>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return msg ? <div style={{ fontSize: 11, color: "#C62828", marginTop: 3, fontFamily: "Inter" }}>{msg}</div> : null;
}

function FormField({ label, required, children, error, span }: {
  label: string; required?: boolean; children: React.ReactNode; error?: string; span?: number;
}) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#C62828", marginLeft: 2 }}>*</span>}
      </div>
      {children}
      {error && <FieldError msg={error} />}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", border: "1px solid #E8ECF4", overflow: "hidden", width: "fit-content" }}>
      {([true, false] as const).map(opt => (
        <button key={String(opt)} onClick={() => onChange(opt)}
          style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "Inter", background: value === opt ? "#1B6CA8" : "#fff", color: value === opt ? "#fff" : "#9CA3AF" }}>
          {opt ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

function CardSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>{title}</div>
        {action}
      </div>
      <div style={{ padding: "16px" }}>
        {children}
      </div>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>{children}</div>;
}
function Grid3({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px 20px" }}>{children}</div>;
}

const WEEKS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── SCREEN 1: Distributor Master List ───────────────────────────────────────

const DIST_TYPE_OPTIONS = ["Stockist", "Distributor", "Super Stockist", "C&F", "Manufacturer Direct", "Other"];
const PAYMENT_TERMS_OPTS = ["Cash on Delivery", "Credit 7 Days", "Credit 15 Days", "Credit 30 Days", "Credit 45 Days", "Credit 60 Days"];
const STATUS_OPTS = ["Active", "Inactive", "Draft"];

function DistributorMasterList({ distributors, onAdd, onView, onEdit, onDeactivate, onViewWithTab }: {
  distributors: DistributorRecord[];
  onAdd: () => void;
  onView: (d: DistributorRecord) => void;
  onEdit: (d: DistributorRecord) => void;
  onDeactivate: (d: DistributorRecord) => void;
  onViewWithTab: (d: DistributorRecord, tab: DetailTab) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterPayment, setFilterPayment] = useState("All");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(distributors);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const kpis = [
    { label: "Total Distributors", value: distributors.length },
    { label: "Active", value: distributors.filter(d => d.status === "Active").length },
    { label: "Inactive", value: distributors.filter(d => d.status === "Inactive").length },
    { label: "Preferred", value: distributors.filter(d => d.preferred).length },
    { label: "Credit Enabled", value: distributors.filter(d => d.creditEnabled).length },
    { label: "Expiry Return", value: distributors.filter(d => d.expiryReturn).length },
  ];

  const q = search.toLowerCase();
  const filtered = sorted.filter(d => {
    if (q && !d.name.toLowerCase().includes(q) && !d.gstin.toLowerCase().includes(q) &&
        !d.mobile.includes(q) && !d.drugLicense.toLowerCase().includes(q) &&
        !d.city.toLowerCase().includes(q)) return false;
    if (filterStatus !== "All" && d.status !== filterStatus) return false;
    if (filterType !== "All" && d.type !== filterType) return false;
    if (filterPayment !== "All" && d.paymentTerms !== filterPayment) return false;
    return true;
  });

  const anyFilter = !!search || filterStatus !== "All" || filterType !== "All" || filterPayment !== "All";
  function clearFilters() { setSearch(""); setFilterStatus("All"); setFilterType("All"); setFilterPayment("All"); }

  const { pageRows, footerProps } = usePagination(filtered, 10);

  const ACTION_MENU_ITEMS = [
    "View Details", "Edit", "Deactivate",
    "View Purchase History", "View Commercial Terms",
    "View Expiry Policy", "View Audit History",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page header */}
      <div>
        <div style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 800, color: "#0C1B33", lineHeight: 1.2 }}>Distributor Master</div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4, fontFamily: "Inter" }}>Manage distributors, commercial terms, contacts, compliance and purchasing preferences.</div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0C1B33", fontFamily: "Outfit", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5, fontFamily: "Inter", fontWeight: 600, letterSpacing: "0.04em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        {/* Filter row */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search by name, GSTIN, mobile, drug license or city" />
          <FilterDropdown value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTS} allLabel="All Status" />
          <FilterDropdown value={filterType} onChange={setFilterType} options={DIST_TYPE_OPTIONS} allLabel="All Types" />
          <FilterDropdown value={filterPayment} onChange={setFilterPayment} options={PAYMENT_TERMS_OPTS} allLabel="All Terms" />
          {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
          <NewButton label="+ Add Distributor" onClick={onAdd} />
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }} ref={menuRef}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Distributor</Th>
                <Th onSort={() => handleSort("contactPerson")} sortDir={sortCol === "contactPerson" ? sortDir : null}>Contact</Th>
                <Th onSort={() => handleSort("gstin")} sortDir={sortCol === "gstin" ? sortDir : null}>GSTIN</Th>
                <Th onSort={() => handleSort("drugLicense")} sortDir={sortCol === "drugLicense" ? sortDir : null}>Drug License</Th>
                <Th onSort={() => handleSort("city")} sortDir={sortCol === "city" ? sortDir : null}>Location</Th>
                <Th onSort={() => handleSort("paymentTerms")} sortDir={sortCol === "paymentTerms" ? sortDir : null}>Payment Terms</Th>
                <Th onSort={() => handleSort("expiryReturn")} sortDir={sortCol === "expiryReturn" ? sortDir : null}>Expiry Return</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(d => (
                <TableRow key={d.id} onClick={() => onView(d)}>
                  <Td>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      {d.preferred && <span style={{ color: "#F59E0B", fontSize: 13, flexShrink: 0, marginTop: 1 }}>★</span>}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>{d.name}</div>
                        <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", marginTop: 2 }}>{d.code}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, fontFamily: "Inter" }}>{d.type}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{d.contactPerson}</div>
                    <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", marginTop: 2 }}>{d.mobile}</div>
                  </Td>
                  <Td mono color={d.gstin ? "#1A2436" : "#9CA3AF"}>{d.gstin || "—"}</Td>
                  <Td>
                    <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{d.drugLicense}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, fontFamily: "Inter" }}>{d.drugLicenseType}</div>
                  </Td>
                  <Td>
                    <div style={{ fontSize: 13, color: "#1A2436", fontFamily: "Inter", fontWeight: 500 }}>{d.city}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, fontFamily: "Inter" }}>{d.state}</div>
                  </Td>
                  <Td>
                    <div style={{ fontSize: 13, color: "#1A2436", fontFamily: "Inter" }}>{d.paymentTerms}</div>
                    {d.creditEnabled && d.creditLimit > 0 && (
                      <div style={{ fontSize: 11, color: "#1B6CA8", marginTop: 1, fontFamily: "Inter", fontWeight: 600 }}>
                        Limit: ₹{(d.creditLimit / 1000).toFixed(0)}K
                      </div>
                    )}
                  </Td>
                  <Td>
                    <Pill
                      label={d.expiryReturn ? "Supported" : "Not Supported"}
                      color={d.expiryReturn ? "#2E7D32" : "#9CA3AF"}
                      bg={d.expiryReturn ? "#E8F5E9" : "#F5F5F5"}
                    />
                  </Td>
                  <Td><Pill status={d.status} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <button onClick={e => { e.stopPropagation(); onView(d); }}
                        style={{ padding: "5px 12px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>
                        View
                      </button>
                      <button onClick={e => { e.stopPropagation(); onEdit(d); }}
                        style={{ padding: "5px 12px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter" }}>
                        Edit
                      </button>
                      <div style={{ position: "relative" }}>
                        <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === d.id ? null : d.id); }}
                          style={{ padding: "4px 7px", border: "1px solid #E8ECF4", background: "#fff", color: "#6B7280", fontSize: 17, cursor: "pointer", lineHeight: 1, fontFamily: "Inter" }}>
                          ⋮
                        </button>
                        {openMenuId === d.id && (
                          <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 2, background: "#fff", border: "1px solid #E8ECF4", zIndex: 50, minWidth: 190, boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
                            {ACTION_MENU_ITEMS.map(item => {
                              const deactivateLabel = d.status === "Active" ? "Deactivate" : "Activate";
                              const displayLabel = item === "Deactivate" ? deactivateLabel : item;
                              return (
                                <button key={item} onClick={e => {
                                  e.stopPropagation(); setOpenMenuId(null);
                                  if (item === "View Details") onView(d);
                                  else if (item === "Edit") onEdit(d);
                                  else if (item === "Deactivate") onDeactivate(d);
                                  else if (item === "View Purchase History") onViewWithTab(d, "orders");
                                  else if (item === "View Commercial Terms") onViewWithTab(d, "commercial");
                                  else if (item === "View Expiry Policy") onViewWithTab(d, "expiry");
                                  else if (item === "View Audit History") onViewWithTab(d, "audit");
                                }}
                                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", fontSize: 12, color: item === "Deactivate" ? "#C62828" : "#1A2436", cursor: "pointer", fontFamily: "Inter", fontWeight: item === "Deactivate" ? 600 : 400 }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                  {displayLabel}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Td>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <EmptyTableRow colSpan={9} message="No distributors match your filters." />
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

// ─── SCREEN 2: Add Distributor — Full Page ────────────────────────────────────

interface AddDistributorForm {
  name: string; code: string; type: string; status: string; preferred: boolean; group: string;
  companyPhone: string; altPhone: string; whatsapp: string; email: string; website: string;
  contacts: ContactPerson[];
  addrLine1: string; addrLine2: string; area: string; city: string; district: string;
  state: string; pin: string; country: string; billingSameAsBusiness: boolean;
  billAddrLine1: string; billAddrLine2: string; billArea: string;
  billCity: string; billDistrict: string; billState: string; billPin: string;
  gstin: string; gstType: string; pan: string; drugLicense: string;
  drugLicenseType: string; licenseExpiry: string; fssai: string; additionalReg: string;
  paymentTerms: string; creditLimit: string; outstandingLimit: string;
  defaultDiscount: string; defaultScheme: string; productWiseTerms: boolean;
  distributorPricing: boolean; defaultFreight: string; minOrderValue: string; minOrderQty: string;
  expiryPolicy: string; minShelfLife: string; expiryReturnWindow: string;
  returnBeforeExpiry: string; nearExpiryReturn: boolean; expiredReturn: boolean;
  returnFreight: string; creditNoteExpected: boolean; replacementAllowed: boolean;
  medExpiryRules: MedExpiryRule[];
  orderMethod: string; orderConfirmRequired: boolean; expectedDelivery: string;
  deliveryDays: string[]; deliveryTimeFrom: string; deliveryTimeTo: string;
  minOrderValueDelivery: string; freeDeliveryAbove: string;
  partialDelivery: boolean; backorder: boolean; substitution: boolean;
  invoiceFormat: string; invoiceImportEnabled: boolean; invoiceEmail: string;
  prefInvoiceFormat: string; autoInvoiceMatching: boolean; invoiceValidation: boolean;
  bankName: string; accountName: string; accountNumber: string;
  ifsc: string; branch: string; upiId: string; preferredPayment: string;
  priorityRanking: string; isDefault: boolean; allowPO: boolean; supplierConfirmation: boolean;
  priceNegotiation: boolean; schemeNegotiation: boolean; substituteProduct: boolean;
  partialSupply: boolean; purchaseVerification: boolean; physicalVerification: boolean;
  distributorNotes: string; internalRemarks: string; importantInstructions: string;
}

const EMPTY_FORM: AddDistributorForm = {
  name: "", code: "", type: "Stockist", status: "Active", preferred: false, group: "",
  companyPhone: "", altPhone: "", whatsapp: "", email: "", website: "",
  contacts: [{ id: 1, name: "", designation: "", mobile: "", email: "", whatsapp: "", isPrimary: true }],
  addrLine1: "", addrLine2: "", area: "", city: "", district: "", state: "", pin: "", country: "India",
  billingSameAsBusiness: true, billAddrLine1: "", billAddrLine2: "", billArea: "",
  billCity: "", billDistrict: "", billState: "", billPin: "",
  gstin: "", gstType: "Regular", pan: "", drugLicense: "", drugLicenseType: "Form 20",
  licenseExpiry: "", fssai: "", additionalReg: "",
  paymentTerms: "Credit 30 Days", creditLimit: "", outstandingLimit: "",
  defaultDiscount: "", defaultScheme: "", productWiseTerms: false, distributorPricing: false,
  defaultFreight: "Included", minOrderValue: "", minOrderQty: "",
  expiryPolicy: "All Eligible Products", minShelfLife: "6 Months", expiryReturnWindow: "90 Days",
  returnBeforeExpiry: "", nearExpiryReturn: true, expiredReturn: false,
  returnFreight: "Distributor", creditNoteExpected: true, replacementAllowed: false, medExpiryRules: [],
  orderMethod: "WhatsApp", orderConfirmRequired: true, expectedDelivery: "Next Day",
  deliveryDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  deliveryTimeFrom: "09:00", deliveryTimeTo: "18:00", minOrderValueDelivery: "", freeDeliveryAbove: "",
  partialDelivery: true, backorder: false, substitution: false,
  invoiceFormat: "PDF", invoiceImportEnabled: false, invoiceEmail: "", prefInvoiceFormat: "PDF",
  autoInvoiceMatching: false, invoiceValidation: false,
  bankName: "", accountName: "", accountNumber: "", ifsc: "", branch: "", upiId: "", preferredPayment: "Bank Transfer",
  priorityRanking: "", isDefault: false, allowPO: true, supplierConfirmation: true,
  priceNegotiation: false, schemeNegotiation: false, substituteProduct: false, partialSupply: true,
  purchaseVerification: true, physicalVerification: false,
  distributorNotes: "", internalRemarks: "", importantInstructions: "",
};

function recordToForm(d: DistributorRecord): AddDistributorForm {
  return {
    ...EMPTY_FORM,
    name: d.name, code: d.code, type: d.type,
    status: d.status === "Draft" ? "Active" : d.status,
    preferred: d.preferred, group: d.group ?? "",
    companyPhone: d.mobile, email: d.email ?? "", website: d.website ?? "",
    contacts: d.contacts?.length ? d.contacts : [{ id: 1, name: d.contactPerson, designation: "", mobile: d.mobile, email: d.email ?? "", whatsapp: "", isPrimary: true }],
    addrLine1: d.addrLine1 ?? "", addrLine2: d.addrLine2 ?? "",
    area: d.area ?? "", city: d.city, district: d.district ?? "",
    state: d.state, pin: d.pin ?? "", country: "India",
    gstin: d.gstin, gstType: d.gstType ?? "Regular", pan: d.pan ?? "",
    drugLicense: d.drugLicense, drugLicenseType: d.drugLicenseType,
    fssai: d.fssai ?? "", additionalReg: "",
    licenseExpiry: "",
    paymentTerms: d.paymentTerms,
    creditLimit: d.creditLimit > 0 ? String(d.creditLimit) : "",
    outstandingLimit: d.outstandingLimit ?? "",
    defaultDiscount: d.defaultDiscount ?? "",
    defaultScheme: d.defaultScheme ?? "",
    defaultFreight: d.defaultFreight ?? "Included",
    minOrderValue: d.minOrderValue ?? "",
    expiryPolicy: d.expiryPolicy ?? "All Eligible Products",
    minShelfLife: d.minShelfLife ?? "6 Months",
    expiryReturnWindow: d.expiryReturnWindow ?? "90 Days",
    returnFreight: d.returnFreight ?? "Distributor",
    nearExpiryReturn: d.nearExpiryReturn ?? true,
    expiredReturn: d.expiredReturn ?? false,
    creditNoteExpected: d.creditNoteExpected ?? true,
    replacementAllowed: d.replacementAllowed ?? false,
    orderMethod: d.orderMethod ?? "WhatsApp",
    expectedDelivery: d.expectedDelivery ?? "Next Day",
    deliveryDays: d.deliveryDays ?? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    bankName: d.bankName ?? "", upiId: d.upiId ?? "",
    distributorNotes: d.distributorNotes ?? "",
  };
}

function PurchaseInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: type === "number" || type === "date" || type === "time" ? "JetBrains Mono" : "Inter", background: "#fff", boxSizing: "border-box" as const, color: "#1A2436" }}
      onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
      onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
    />
  );
}

function PurchaseTextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: "100%", padding: "8px 10px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const, color: "#1A2436", resize: "vertical" }}
      onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
      onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
    />
  );
}

function AddDistributorPage({ onBack, onSaved, existingDistributors, initialData, onViewExisting, showToast }: {
  onBack: () => void;
  onSaved: (d: DistributorRecord, asDraft: boolean) => void;
  existingDistributors: DistributorRecord[];
  initialData?: DistributorRecord;
  onViewExisting?: (d: DistributorRecord) => void;
  showToast: (message: string, type: "success" | "error") => void;
}) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<AddDistributorForm>(initialData ? recordToForm(initialData) : { ...EMPTY_FORM });
  const [touched, setTouched] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [nextRuleId, setNextRuleId] = useState(1);
  const [nextContactId, setNextContactId] = useState(2);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

  function upd<K extends keyof AddDistributorForm>(key: K, val: AddDistributorForm[K]) {
    setTouched(true);
    if (key === "name" || key === "gstin") setIgnoreDuplicate(false);
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleBack() {
    if (touched) setShowBackConfirm(true);
    else onBack();
  }

  function addContact() {
    setForm(f => ({
      ...f,
      contacts: [...f.contacts, { id: nextContactId, name: "", designation: "", mobile: "", email: "", whatsapp: "", isPrimary: false }],
    }));
    setNextContactId(n => n + 1);
    setTouched(true);
  }

  function updateContact(id: number, key: keyof ContactPerson, val: string | boolean) {
    setForm(f => ({ ...f, contacts: f.contacts.map(c => c.id === id ? { ...c, [key]: val } : c) }));
    setTouched(true);
  }

  function removeContact(id: number) {
    setForm(f => ({ ...f, contacts: f.contacts.filter(c => c.id !== id) }));
    setTouched(true);
  }

  function addMedRule() {
    setForm(f => ({ ...f, medExpiryRules: [...f.medExpiryRules, { id: nextRuleId, medicine: "", minShelfLife: "6 Months", returnAllowed: "Yes", returnWindow: "60 Days", resolution: "Credit Note", notes: "" }] }));
    setNextRuleId(n => n + 1);
    setTouched(true);
  }

  function updateMedRule(id: number, key: keyof MedExpiryRule, val: string) {
    setForm(f => ({ ...f, medExpiryRules: f.medExpiryRules.map(r => r.id === id ? { ...r, [key]: val } : r) }));
    setTouched(true);
  }

  function removeMedRule(id: number) {
    setForm(f => ({ ...f, medExpiryRules: f.medExpiryRules.filter(r => r.id !== id) }));
    setTouched(true);
  }

  function toggleDeliveryDay(day: string) {
    setForm(f => ({
      ...f,
      deliveryDays: f.deliveryDays.includes(day)
        ? f.deliveryDays.filter(d => d !== day)
        : [...f.deliveryDays, day],
    }));
    setTouched(true);
  }

  const otherCodes = existingDistributors.filter(d => d.id !== initialData?.id).map(d => d.code);
  const errors = {
    name: !form.name.trim() ? "Distributor Name is required" : "",
    code: !form.code.trim() ? "Distributor Code is required" : otherCodes.includes(form.code.trim()) ? "Distributor Code already exists" : "",
    gstin: validateGSTIN(form.gstin),
    pan: validatePAN(form.pan),
    companyPhone: validateMobile(form.companyPhone),
    pin: validatePIN(form.pin),
    email: validateEmail(form.email),
  };
  const hasErrors = Object.values(errors).some(e => !!e);
  const draftNameMissing = !form.name.trim();

  const dupDetect = (() => {
    if (!form.name.trim() && !form.gstin.trim()) return null;
    return existingDistributors.find(d =>
      d.id !== initialData?.id && (
        (form.name.trim() && d.name.toLowerCase() === form.name.trim().toLowerCase()) ||
        (form.gstin.trim() && d.gstin && d.gstin === form.gstin.trim())
      )
    ) || null;
  })();

  const checklist = [
    { label: "Basic Information", ok: !!form.name && !!form.code && !!form.type },
    { label: "Contact Information", ok: !!form.companyPhone && !!form.email && !!form.contacts[0]?.name },
    { label: "Address", ok: !!form.addrLine1 && !!form.city && !!form.state && !!form.pin },
    { label: "GST Details", ok: !!form.gstin && !validateGSTIN(form.gstin) },
    { label: "Drug License", ok: !!form.drugLicense },
    { label: "Commercial Terms", ok: !!form.paymentTerms },
    { label: "Expiry Policy", ok: !!form.expiryPolicy },
    { label: "Purchase & Delivery", ok: form.deliveryDays.length > 0 },
    { label: "Invoice Settings", ok: !!form.invoiceFormat },
    { label: "Bank Information", ok: !!form.bankName || !!form.upiId },
    { label: "Internal Notes", ok: true },
  ];

  function handleSave(asDraft = false) {
    if (asDraft && draftNameMissing) { setTouched(true); return; }
    if (!asDraft && hasErrors) {
      setTouched(true);
      showToast("Please fix the required fields before saving.", "error");
      return;
    }
    const id = initialData?.id ?? `DIST-${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`;
    const rec: DistributorRecord = {
      id, name: form.name, code: form.code, type: form.type,
      status: asDraft ? "Draft" : (form.status as "Active" | "Inactive"),
      preferred: form.preferred, gstin: form.gstin,
      drugLicense: form.drugLicense, drugLicenseType: form.drugLicenseType,
      city: form.city, state: form.state,
      contactPerson: form.contacts[0]?.name || "",
      mobile: form.companyPhone, paymentTerms: form.paymentTerms,
      creditLimit: form.creditLimit ? parseInt(form.creditLimit, 10) : 0,
      creditEnabled: !!form.creditLimit && parseInt(form.creditLimit, 10) > 0,
      expiryReturn: form.expiryPolicy !== "No Return",
      balance: initialData?.balance ?? 0,
      email: form.email, website: form.website,
      addrLine1: form.addrLine1, addrLine2: form.addrLine2,
      area: form.area, district: form.district, pin: form.pin,
      gstType: form.gstType, pan: form.pan, fssai: form.fssai,
      defaultDiscount: form.defaultDiscount, defaultScheme: form.defaultScheme,
      defaultFreight: form.defaultFreight, minOrderValue: form.minOrderValue,
      expiryPolicy: form.expiryPolicy, minShelfLife: form.minShelfLife,
      expiryReturnWindow: form.expiryReturnWindow, returnFreight: form.returnFreight,
      nearExpiryReturn: form.nearExpiryReturn, expiredReturn: form.expiredReturn,
      creditNoteExpected: form.creditNoteExpected, replacementAllowed: form.replacementAllowed,
      orderMethod: form.orderMethod, expectedDelivery: form.expectedDelivery,
      deliveryDays: form.deliveryDays, bankName: form.bankName, upiId: form.upiId,
      group: form.group, outstandingLimit: form.outstandingLimit,
      distributorNotes: form.distributorNotes, contacts: form.contacts,
    };
    onSaved(rec, asDraft);
    const msg = asDraft
      ? "Saved as draft"
      : isEdit ? "Distributor updated successfully" : "Distributor saved successfully";
    showToast(msg, "success");
  }

  const primaryContact = form.contacts[0];

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, zIndex: 50, background: "#F0F3F7", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {showBackConfirm && (
        <BackConfirmDialog
          message={draftNameMissing ? "You have unsaved changes. Discard and go back?" : "Save this distributor as a draft before going back?"}
          onCancel={() => setShowBackConfirm(false)}
          onSave={() => {
            if (!draftNameMissing) handleSave(true);
            setShowBackConfirm(false);
            onBack();
          }}
          onDiscard={() => { setShowBackConfirm(false); onBack(); }}
        />
      )}

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={handleBack}
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>Distributor Master</span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>{isEdit ? `Edit — ${initialData.name}` : "Add Distributor"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <GhostBtn onClick={handleBack}>Cancel</GhostBtn>
          <button
            onClick={() => handleSave(true)}
            disabled={draftNameMissing}
            title={draftNameMissing ? "Enter Distributor Name to save as draft" : undefined}
            style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: draftNameMissing ? "#F8FAFC" : "#fff", fontSize: 13, cursor: draftNameMissing ? "not-allowed" : "pointer", color: draftNameMissing ? "#C8D6E5" : "#1A2436", fontFamily: "Inter" }}>
            Save Draft
          </button>
          <PrimaryBtn onClick={() => handleSave(false)}>{isEdit ? "Update Distributor" : "Save Distributor"}</PrimaryBtn>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

        {dupDetect && !ignoreDuplicate && (
          <div style={{ padding: "10px 16px", background: "#FFF3E0", border: "1px solid #FFCC80", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>⚠</span>
            <div style={{ flex: 1, fontSize: 13, color: "#1A2436" }}>
              <span style={{ fontWeight: 700, color: "#E65100" }}>Possible duplicate — </span>
              "{dupDetect.name}" already exists with the same details.
            </div>
            <button onClick={() => onViewExisting?.(dupDetect)} style={{ padding: "5px 12px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter" }}>View Existing</button>
            <button onClick={() => setIgnoreDuplicate(true)} style={{ padding: "5px 12px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 12, color: "#6B7280", cursor: "pointer", fontFamily: "Inter" }}>Continue Anyway</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* LEFT: form sections */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>

            {/* S1: Basic Information */}
            <CardSection title="Basic Information">
              <Grid2>
                <FormField label="Distributor Name" required error={touched ? errors.name : ""}>
                  <PurchaseInput value={form.name} onChange={v => upd("name", v)} placeholder="e.g. MedLine Pharma Pvt. Ltd." />
                </FormField>
                <FormField label="Distributor Code" required error={touched ? errors.code : ""}>
                  <PurchaseInput value={form.code} onChange={v => upd("code", v)} placeholder="e.g. ML-001" />
                </FormField>
                <FormField label="Distributor Type" required>
                  <LocalDropdownSelect value={form.type} onChange={v => upd("type", v)} options={["Stockist", "Distributor", "Super Stockist", "C&F", "Manufacturer Direct", "Other"]} />
                </FormField>
                <FormField label="Distributor Group">
                  <PurchaseInput value={form.group} onChange={v => upd("group", v)} placeholder="Optional group name" />
                </FormField>
                <FormField label="Status">
                  <LocalDropdownSelect value={form.status} onChange={v => upd("status", v)} options={["Active", "Inactive"]} />
                </FormField>
                <FormField label="Preferred Distributor">
                  <Toggle value={form.preferred} onChange={v => upd("preferred", v)} />
                </FormField>
              </Grid2>
            </CardSection>

            {/* S2: Contact Information */}
            <CardSection title="Contact Information">
              <Grid2>
                <FormField label="Company Phone" required error={touched ? errors.companyPhone : ""}>
                  <PurchaseInput value={form.companyPhone} onChange={v => upd("companyPhone", v)} placeholder="10-digit mobile" />
                </FormField>
                <FormField label="Alternate Phone">
                  <PurchaseInput value={form.altPhone} onChange={v => upd("altPhone", v)} placeholder="Optional" />
                </FormField>
                <FormField label="WhatsApp Number">
                  <PurchaseInput value={form.whatsapp} onChange={v => upd("whatsapp", v)} placeholder="10-digit mobile" />
                </FormField>
                <FormField label="Email Address" required error={touched ? errors.email : ""}>
                  <PurchaseInput value={form.email} onChange={v => upd("email", v)} placeholder="orders@distributor.com" type="email" />
                </FormField>
                <FormField label="Website">
                  <PurchaseInput value={form.website} onChange={v => upd("website", v)} placeholder="https://" />
                </FormField>
              </Grid2>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>Contact Persons</div>
                  <button onClick={addContact} style={{ padding: "5px 12px", border: "1px dashed #1B6CA8", background: "#EFF6FF", color: "#1B6CA8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
                    + Add Contact
                  </button>
                </div>
                {form.contacts.map((c, idx) => (
                  <div key={c.id} style={{ border: "1px solid #E8ECF4", padding: "12px 14px", marginBottom: 8, background: c.isPrimary ? "#FAFEFF" : "#FAFBFD" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.isPrimary ? "#1B6CA8" : "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "Inter" }}>
                        {c.isPrimary ? "★ Primary Contact" : `Contact ${idx + 1}`}
                      </span>
                      {!c.isPrimary && (
                        <button onClick={() => removeContact(c.id)} style={{ border: "none", background: "transparent", color: "#C62828", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                      )}
                    </div>
                    <Grid3>
                      <FormField label="Name" required={c.isPrimary}>
                        <PurchaseInput value={c.name} onChange={v => updateContact(c.id, "name", v)} placeholder="Full name" />
                      </FormField>
                      <FormField label="Designation">
                        <PurchaseInput value={c.designation} onChange={v => updateContact(c.id, "designation", v)} placeholder="e.g. Sales Manager" />
                      </FormField>
                      <FormField label="Mobile" required={c.isPrimary}>
                        <PurchaseInput value={c.mobile} onChange={v => updateContact(c.id, "mobile", v)} placeholder="10-digit mobile" />
                      </FormField>
                      <FormField label="Email">
                        <PurchaseInput value={c.email} onChange={v => updateContact(c.id, "email", v)} placeholder="email@example.com" />
                      </FormField>
                      <FormField label="WhatsApp">
                        <PurchaseInput value={c.whatsapp} onChange={v => updateContact(c.id, "whatsapp", v)} placeholder="10-digit mobile" />
                      </FormField>
                    </Grid3>
                  </div>
                ))}
              </div>
            </CardSection>

            {/* S3: Business Address */}
            <CardSection title="Business Address">
              <Grid2>
                <FormField label="Address Line 1" required error={touched ? errors.addrLine1 : ""} span={2}>
                  <PurchaseInput value={form.addrLine1} onChange={v => upd("addrLine1", v)} placeholder="Building / Shop No., Street" />
                </FormField>
                <FormField label="Address Line 2" span={2}>
                  <PurchaseInput value={form.addrLine2} onChange={v => upd("addrLine2", v)} placeholder="Area / Landmark (Optional)" />
                </FormField>
                <FormField label="Area / Locality">
                  <PurchaseInput value={form.area} onChange={v => upd("area", v)} placeholder="Area or locality" />
                </FormField>
                <FormField label="City" required error={touched ? errors.city : ""}>
                  <PurchaseInput value={form.city} onChange={v => upd("city", v)} placeholder="City" />
                </FormField>
                <FormField label="District">
                  <PurchaseInput value={form.district} onChange={v => upd("district", v)} placeholder="District" />
                </FormField>
                <FormField label="State" required error={touched ? errors.state : ""}>
                  <LocalDropdownSelect value={form.state} onChange={v => upd("state", v)} placeholder="Select state" options={INDIAN_STATES} />
                </FormField>
                <FormField label="PIN Code" required error={touched ? errors.pin : ""}>
                  <PurchaseInput value={form.pin} onChange={v => upd("pin", v)} placeholder="6-digit PIN code" />
                </FormField>
                <FormField label="Country">
                  <PurchaseInput value={form.country} onChange={v => upd("country", v)} placeholder="Country" />
                </FormField>
              </Grid2>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="billingSame" checked={form.billingSameAsBusiness}
                  onChange={e => upd("billingSameAsBusiness", e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer" }} />
                <label htmlFor="billingSame" style={{ fontSize: 13, color: "#1A2436", cursor: "pointer", fontFamily: "Inter" }}>
                  Billing Address same as Business Address
                </label>
              </div>
              {!form.billingSameAsBusiness && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #DDE3EC" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12, fontFamily: "Inter" }}>Billing Address</div>
                  <Grid2>
                    <FormField label="Address Line 1" span={2}>
                      <PurchaseInput value={form.billAddrLine1} onChange={v => upd("billAddrLine1", v)} placeholder="Building / Shop No., Street" />
                    </FormField>
                    <FormField label="City">
                      <PurchaseInput value={form.billCity} onChange={v => upd("billCity", v)} placeholder="City" />
                    </FormField>
                    <FormField label="State">
                      <LocalDropdownSelect value={form.billState} onChange={v => upd("billState", v)} placeholder="Select state" options={INDIAN_STATES} />
                    </FormField>
                    <FormField label="PIN Code">
                      <PurchaseInput value={form.billPin} onChange={v => upd("billPin", v)} placeholder="6-digit PIN" />
                    </FormField>
                  </Grid2>
                </div>
              )}
            </CardSection>

            {/* S4: Tax & Regulatory */}
            <CardSection title="Tax & Regulatory Details">
              <Grid2>
                <FormField label="GSTIN" required error={validateGSTIN(form.gstin)}>
                  <PurchaseInput value={form.gstin} onChange={v => upd("gstin", v.toUpperCase())} placeholder="e.g. 27AABCM1234K1ZX" />
                </FormField>
                <FormField label="GST Registration Type">
                  <LocalDropdownSelect value={form.gstType} onChange={v => upd("gstType", v)} options={["Regular", "Composition", "Unregistered", "Other"]} />
                </FormField>
                <FormField label="PAN" error={validatePAN(form.pan)}>
                  <PurchaseInput value={form.pan} onChange={v => upd("pan", v.toUpperCase())} placeholder="e.g. ABCDE1234F" />
                </FormField>
                <FormField label="Drug License No." required error={touched ? errors.drugLicense : ""}>
                  <PurchaseInput value={form.drugLicense} onChange={v => upd("drugLicense", v)} placeholder="e.g. MH/DL/2024/00892" />
                </FormField>
                <FormField label="Drug License Type">
                  <LocalDropdownSelect value={form.drugLicenseType} onChange={v => upd("drugLicenseType", v)} options={["Form 20", "Form 21", "Form 20B", "Form 21B", "Other"]} />
                </FormField>
                <FormField label="License Expiry Date">
                  <PurchaseInput value={form.licenseExpiry} onChange={v => upd("licenseExpiry", v)} type="date" />
                </FormField>
                <FormField label="FSSAI Number">
                  <PurchaseInput value={form.fssai} onChange={v => upd("fssai", v)} placeholder="If applicable" />
                </FormField>
                <FormField label="Additional Registration No.">
                  <PurchaseInput value={form.additionalReg} onChange={v => upd("additionalReg", v)} placeholder="Optional" />
                </FormField>
              </Grid2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                {["Upload License", "Upload GST Certificate", "Upload Other Documents"].map(lbl => (
                  <button key={lbl} style={{ padding: "9px 12px", border: "1px dashed #DDE3EC", background: "#FAFBFD", color: "#6B7280", fontSize: 12, cursor: "pointer", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
                    ⊕ {lbl}
                  </button>
                ))}
              </div>
            </CardSection>

            {/* S5: Commercial Terms */}
            <CardSection title="Commercial Terms">
              <Grid2>
                <FormField label="Default Payment Terms" required>
                  <LocalDropdownSelect value={form.paymentTerms} onChange={v => upd("paymentTerms", v)}
                    options={["Immediate", "Credit 7 Days", "Credit 15 Days", "Credit 30 Days", "Credit 45 Days", "Credit 60 Days", "Custom"]} />
                </FormField>
                <FormField label="Credit Limit (₹)">
                  <PurchaseInput value={form.creditLimit} onChange={v => upd("creditLimit", v)} placeholder="e.g. 200000" type="number" />
                </FormField>
                <FormField label="Outstanding Limit (₹)">
                  <PurchaseInput value={form.outstandingLimit} onChange={v => upd("outstandingLimit", v)} placeholder="e.g. 150000" type="number" />
                </FormField>
                <FormField label="Default Purchase Discount %">
                  <PurchaseInput value={form.defaultDiscount} onChange={v => upd("defaultDiscount", v)} placeholder="e.g. 10" type="number" />
                </FormField>
                <FormField label="Default Scheme">
                  <LocalDropdownSelect value={form.defaultScheme} onChange={v => upd("defaultScheme", v)} placeholder="Select scheme" options={["1+1", "4+1", "9+1", "10+1", "12+1", "15+1"]} />
                </FormField>
                <FormField label="Default Freight">
                  <LocalDropdownSelect value={form.defaultFreight} onChange={v => upd("defaultFreight", v)} options={["Included", "Extra", "Not Applicable"]} />
                </FormField>
                <FormField label="Minimum Order Value (₹)">
                  <PurchaseInput value={form.minOrderValue} onChange={v => upd("minOrderValue", v)} placeholder="e.g. 500" type="number" />
                </FormField>
                <FormField label="Minimum Order Quantity">
                  <PurchaseInput value={form.minOrderQty} onChange={v => upd("minOrderQty", v)} placeholder="e.g. 10" type="number" />
                </FormField>
                <FormField label="Product-wise Commercial Terms">
                  <Toggle value={form.productWiseTerms} onChange={v => upd("productWiseTerms", v)} />
                </FormField>
                <FormField label="Distributor-specific Medicine Pricing">
                  <Toggle value={form.distributorPricing} onChange={v => upd("distributorPricing", v)} />
                </FormField>
              </Grid2>
            </CardSection>

            {/* S6: Expiry & Return Policy */}
            <CardSection title="Expiry & Return Policy">
              <Grid2>
                <FormField label="Expiry Return Policy">
                  <LocalDropdownSelect value={form.expiryPolicy} onChange={v => upd("expiryPolicy", v)}
                    options={["No Return", "Selected Products", "All Eligible Products", "Distributor Policy Based"]} />
                </FormField>
                <FormField label="Minimum Remaining Shelf Life">
                  <LocalDropdownSelect value={form.minShelfLife} onChange={v => upd("minShelfLife", v)} options={["3 Months", "6 Months", "9 Months", "12 Months"]} />
                </FormField>
                <FormField label="Expiry Return Window">
                  <LocalDropdownSelect value={form.expiryReturnWindow} onChange={v => upd("expiryReturnWindow", v)} options={["30 Days", "60 Days", "90 Days", "180 Days"]} />
                </FormField>
                <FormField label="Return Before Expiry (months)">
                  <PurchaseInput value={form.returnBeforeExpiry} onChange={v => upd("returnBeforeExpiry", v)} placeholder="e.g. 3" type="number" />
                </FormField>
                <FormField label="Return Freight">
                  <LocalDropdownSelect value={form.returnFreight} onChange={v => upd("returnFreight", v)} options={["Distributor", "Retailer", "Shared"]} />
                </FormField>
              </Grid2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px 16px", marginTop: 14 }}>
                <FormField label="Allow Near-Expiry Return"><Toggle value={form.nearExpiryReturn} onChange={v => upd("nearExpiryReturn", v)} /></FormField>
                <FormField label="Allow Expired Return"><Toggle value={form.expiredReturn} onChange={v => upd("expiredReturn", v)} /></FormField>
                <FormField label="Credit Note Expected"><Toggle value={form.creditNoteExpected} onChange={v => upd("creditNoteExpected", v)} /></FormField>
                <FormField label="Replacement Allowed"><Toggle value={form.replacementAllowed} onChange={v => upd("replacementAllowed", v)} /></FormField>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>Medicine-Specific Expiry Rules</div>
                  <button onClick={addMedRule} style={{ padding: "5px 12px", border: "1px dashed #1B6CA8", background: "#EFF6FF", color: "#1B6CA8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
                    + Add Rule
                  </button>
                </div>
                {form.medExpiryRules.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" as const, fontFamily: "Inter" }}>No medicine-specific rules added.</div>
                ) : form.medExpiryRules.map(r => (
                  <div key={r.id} style={{ border: "1px solid #E8ECF4", padding: "10px 12px", marginBottom: 8, background: "#FAFBFD" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: "8px 12px", alignItems: "end" }}>
                      <FormField label="Medicine"><PurchaseInput value={r.medicine} onChange={v => updateMedRule(r.id, "medicine", v)} placeholder="Medicine name" /></FormField>
                      <FormField label="Min Shelf Life"><LocalDropdownSelect value={r.minShelfLife} onChange={v => updateMedRule(r.id, "minShelfLife", v)} options={["3 Months", "6 Months", "9 Months", "12 Months"]} /></FormField>
                      <FormField label="Return Allowed"><LocalDropdownSelect value={r.returnAllowed} onChange={v => updateMedRule(r.id, "returnAllowed", v)} options={["Yes", "No"]} /></FormField>
                      <FormField label="Return Window"><LocalDropdownSelect value={r.returnWindow} onChange={v => updateMedRule(r.id, "returnWindow", v)} options={["30 Days", "60 Days", "90 Days"]} /></FormField>
                      <FormField label="Resolution"><LocalDropdownSelect value={r.resolution} onChange={v => updateMedRule(r.id, "resolution", v)} options={["Credit Note", "Replacement"]} /></FormField>
                      <button onClick={() => removeMedRule(r.id)} style={{ border: "none", background: "transparent", color: "#C62828", cursor: "pointer", fontSize: 18, marginBottom: 2 }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </CardSection>

            {/* S7: Purchase & Delivery */}
            <CardSection title="Purchase & Delivery Preferences">
              <Grid2>
                <FormField label="Preferred Order Method">
                  <LocalDropdownSelect value={form.orderMethod} onChange={v => upd("orderMethod", v)} options={["WhatsApp", "Email", "Phone", "Portal", "API", "Other"]} />
                </FormField>
                <FormField label="Order Confirmation Required">
                  <Toggle value={form.orderConfirmRequired} onChange={v => upd("orderConfirmRequired", v)} />
                </FormField>
                <FormField label="Expected Delivery Time">
                  <LocalDropdownSelect value={form.expectedDelivery} onChange={v => upd("expectedDelivery", v)} options={["Same Day", "Next Day", "2 Days", "3 Days", "Custom"]} />
                </FormField>
                <FormField label="Partial Delivery Allowed">
                  <Toggle value={form.partialDelivery} onChange={v => upd("partialDelivery", v)} />
                </FormField>
                <FormField label="Backorder Allowed">
                  <Toggle value={form.backorder} onChange={v => upd("backorder", v)} />
                </FormField>
                <FormField label="Product Substitution Allowed">
                  <Toggle value={form.substitution} onChange={v => upd("substitution", v)} />
                </FormField>
                <FormField label="Min Order Value (₹)">
                  <PurchaseInput value={form.minOrderValueDelivery} onChange={v => upd("minOrderValueDelivery", v)} placeholder="e.g. 500" type="number" />
                </FormField>
                <FormField label="Free Delivery Above (₹)">
                  <PurchaseInput value={form.freeDeliveryAbove} onChange={v => upd("freeDeliveryAbove", v)} placeholder="e.g. 2000" type="number" />
                </FormField>
              </Grid2>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8, fontFamily: "Inter" }}>Delivery Days</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  {WEEKS.map((day, i) => {
                    const active = form.deliveryDays.includes(day);
                    return (
                      <button key={day} onClick={() => toggleDeliveryDay(day)}
                        style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: active ? "none" : "1px solid #E8ECF4", cursor: "pointer", fontFamily: "Inter", background: active ? "#1B6CA8" : "#fff", color: active ? "#fff" : "#9CA3AF" }}>
                        {WEEKS_SHORT[i]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginTop: 14 }}>
                <FormField label="Preferred Delivery Time (From)">
                  <PurchaseInput value={form.deliveryTimeFrom} onChange={v => upd("deliveryTimeFrom", v)} type="time" />
                </FormField>
                <FormField label="Preferred Delivery Time (To)">
                  <PurchaseInput value={form.deliveryTimeTo} onChange={v => upd("deliveryTimeTo", v)} type="time" />
                </FormField>
              </div>
            </CardSection>

            {/* S8: Invoice & Document */}
            <CardSection title="Invoice & Document Settings">
              <Grid2>
                <FormField label="Invoice Format">
                  <LocalDropdownSelect value={form.invoiceFormat} onChange={v => upd("invoiceFormat", v)} options={["PDF", "Excel", "CSV", "Email", "Other"]} />
                </FormField>
                <FormField label="Preferred Invoice Format">
                  <LocalDropdownSelect value={form.prefInvoiceFormat} onChange={v => upd("prefInvoiceFormat", v)} options={["PDF", "CSV", "Excel"]} />
                </FormField>
                <FormField label="Purchase Invoice Email">
                  <PurchaseInput value={form.invoiceEmail} onChange={v => upd("invoiceEmail", v)} placeholder="invoice@distributor.com" type="email" />
                </FormField>
              </Grid2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 16px", marginTop: 14 }}>
                <FormField label="Invoice Import Enabled"><Toggle value={form.invoiceImportEnabled} onChange={v => upd("invoiceImportEnabled", v)} /></FormField>
                <FormField label="Auto Invoice Matching"><Toggle value={form.autoInvoiceMatching} onChange={v => upd("autoInvoiceMatching", v)} /></FormField>
                <FormField label="Auto Invoice Validation"><Toggle value={form.invoiceValidation} onChange={v => upd("invoiceValidation", v)} /></FormField>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8, fontFamily: "Inter" }}>Required Invoice Fields</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  {["Invoice Number", "Invoice Date", "GSTIN", "Product", "Batch", "Expiry", "MRP", "Rate", "Quantity", "Scheme", "GST"].map(f => (
                    <span key={f} style={{ padding: "4px 10px", background: "#EFF6FF", color: "#1B6CA8", fontSize: 11, fontWeight: 600, border: "1px solid #BFDBFE", fontFamily: "Inter" }}>{f}</span>
                  ))}
                </div>
              </div>
            </CardSection>

            {/* S9: Bank & Payment */}
            <CardSection title="Bank & Payment Information">
              <Grid2>
                <FormField label="Bank Name"><PurchaseInput value={form.bankName} onChange={v => upd("bankName", v)} placeholder="e.g. HDFC Bank" /></FormField>
                <FormField label="Account Name"><PurchaseInput value={form.accountName} onChange={v => upd("accountName", v)} placeholder="Account holder name" /></FormField>
                <FormField label="Account Number"><PurchaseInput value={form.accountNumber} onChange={v => upd("accountNumber", v)} placeholder="Account number" /></FormField>
                <FormField label="IFSC Code"><PurchaseInput value={form.ifsc} onChange={v => upd("ifsc", v.toUpperCase())} placeholder="e.g. HDFC0001234" /></FormField>
                <FormField label="Branch"><PurchaseInput value={form.branch} onChange={v => upd("branch", v)} placeholder="Branch name" /></FormField>
                <FormField label="UPI ID"><PurchaseInput value={form.upiId} onChange={v => upd("upiId", v)} placeholder="e.g. distributor@upi" /></FormField>
                <FormField label="Preferred Payment Method">
                  <LocalDropdownSelect value={form.preferredPayment} onChange={v => upd("preferredPayment", v)} options={["Bank Transfer", "UPI", "Cheque", "Cash", "RTGS", "Other"]} />
                </FormField>
              </Grid2>
            </CardSection>

            {/* S10: Purchasing Preferences */}
            <CardSection title="Purchasing Preferences">
              <div style={{ marginBottom: 14, maxWidth: 240 }}>
                <FormField label="Preferred Distributor Ranking">
                  <PurchaseInput value={form.priorityRanking} onChange={v => upd("priorityRanking", v)} placeholder="Manual priority (1 = highest)" type="number" />
                </FormField>
              </div>
              <Grid3>
                {([
                  ["Default Distributor", "isDefault"],
                  ["Allow PO", "allowPO"],
                  ["Distributor Confirmation Required", "supplierConfirmation"],
                  ["Allow Price Negotiation", "priceNegotiation"],
                  ["Allow Scheme Negotiation", "schemeNegotiation"],
                  ["Allow Substitute Product", "substituteProduct"],
                  ["Allow Partial Supply", "partialSupply"],
                  ["Require Purchase Verification", "purchaseVerification"],
                  ["Require Physical Verification", "physicalVerification"],
                ] as [string, keyof AddDistributorForm][]).map(([lbl, key]) => (
                  <FormField key={key} label={lbl}>
                    <Toggle value={!!form[key]} onChange={v => upd(key, v as never)} />
                  </FormField>
                ))}
              </Grid3>
            </CardSection>

            {/* S11: Internal Notes */}
            <CardSection title="Internal Notes">
              <div style={{ padding: "8px 12px", background: "#FFF3E0", border: "1px solid #FFCC80", marginBottom: 14, fontSize: 12, color: "#E65100", fontFamily: "Inter" }}>
                These notes are visible only to authorized pharmacy staff.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormField label="Distributor Notes">
                  <PurchaseTextArea value={form.distributorNotes} onChange={v => upd("distributorNotes", v)} placeholder="General notes about this distributor..." rows={3} />
                </FormField>
                <FormField label="Internal Remarks">
                  <PurchaseTextArea value={form.internalRemarks} onChange={v => upd("internalRemarks", v)} placeholder="Internal remarks for the purchasing team..." rows={3} />
                </FormField>
                <FormField label="Important Instructions">
                  <PurchaseTextArea value={form.importantInstructions} onChange={v => upd("importantInstructions", v)} placeholder="Special instructions, handling notes, or cautions..." rows={3} />
                </FormField>
              </div>
            </CardSection>

            {/* Bottom actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
              <GhostBtn onClick={handleBack}>Cancel</GhostBtn>
              <button
                onClick={() => handleSave(true)}
                disabled={draftNameMissing}
                title={draftNameMissing ? "Enter Distributor Name to save as draft" : undefined}
                style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: draftNameMissing ? "#F8FAFC" : "#fff", fontSize: 13, cursor: draftNameMissing ? "not-allowed" : "pointer", color: draftNameMissing ? "#C8D6E5" : "#1A2436", fontFamily: "Inter" }}>
                Save Draft
              </button>
              <PrimaryBtn onClick={() => handleSave(false)}>{isEdit ? "Update Distributor" : "Save Distributor"}</PrimaryBtn>
            </div>
          </div>

          {/* RIGHT: Summary panel */}
          <div style={{ width: 260, flexShrink: 0, position: "sticky", top: 0 }}>
            <div style={{ background: "#fff", border: "1px solid #E8ECF4", marginBottom: 12 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6" }}>
                <div style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Distributor Setup</div>
              </div>
              <div style={{ padding: "10px 14px" }}>
                {[
                  { label: "Name", value: form.name || "—" },
                  { label: "Code", value: form.code || "—", mono: true },
                  { label: "GSTIN", value: form.gstin || "—", mono: true },
                  { label: "Contact", value: primaryContact?.name || "—" },
                  { label: "City", value: form.city ? `${form.city}, ${form.state}` : "—" },
                  { label: "Payment Terms", value: form.paymentTerms || "—" },
                  { label: "Credit Limit", value: form.creditLimit ? `₹${parseInt(form.creditLimit, 10).toLocaleString("en-IN")}` : "—" },
                  { label: "Expiry Return", value: form.expiryPolicy === "No Return" ? "Not Supported" : "Supported" },
                  { label: "Preferred", value: form.preferred ? "Yes" : "No" },
                  { label: "Status", value: form.status },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #F4F6FA" }}>
                    <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, fontFamily: "Inter" }}>{r.label}</span>
                    <span style={{ fontSize: 11, color: "#1A2436", fontWeight: 600, textAlign: "right" as const, maxWidth: 140, fontFamily: r.mono ? "JetBrains Mono" : "Inter", wordBreak: "break-all" as const }}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6" }}>
                <div style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Setup Checklist</div>
              </div>
              <div style={{ padding: "10px 14px" }}>
                {checklist.map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                    <span style={{ fontSize: 12, color: item.ok ? "#2E7D32" : "#E65100", flexShrink: 0 }}>{item.ok ? "✓" : "⚠"}</span>
                    <span style={{ fontSize: 12, color: item.ok ? "#1A2436" : "#6B7280", fontFamily: "Inter" }}>{item.label}</span>
                  </div>
                ))}
                {hasErrors && touched && (
                  <div style={{ marginTop: 10, padding: "7px 10px", background: "#FFEBEE", border: "1px solid #FFCDD2", fontSize: 11, color: "#C62828", fontWeight: 600, fontFamily: "Inter" }}>
                    Fix required fields before saving.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 3: Distributor Detail Page ────────────────────────────────────────

// ── Date range helpers ──────────────────────────────────────────────────────

type DateRange = "daily" | "weekly" | "monthly" | "all";

const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function parseDate(s: string): Date {
  // Handles "12 Jun 2025" format
  const parts = s.trim().split(" ");
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = MONTHS[parts[1]] ?? 0;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(s);
}

function getDateBounds(range: DateRange, _customFrom: string, _customTo: string): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  if (range === "daily") return { from: today, to: tomorrow };
  if (range === "weekly") {
    const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 7);
    return { from: mon, to: sun };
  }
  if (range === "monthly") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  // "all" — show everything
  return { from: new Date(2000, 0, 1), to: new Date(2099, 0, 1) };
}

function inRange(dateStr: string, from: Date, to: Date): boolean {
  const d = parseDate(dateStr);
  return d >= from && d < to;
}

// ── Shared table helpers ─────────────────────────────────────────────────────

function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textAlign: right ? "right" as const : "left" as const, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: "Inter", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap" as const, background: "#F8FAFC" }}>
      {children}
    </th>
  );
}

// ── Filter bar ──────────────────────────────────────────────────────────────

function HistoryFilterBar({
  dateRange, setDateRange,
  search, setSearch, searchPlaceholder,
  statusFilter, setStatusFilter, statusOptions,
  extra,
}: {
  dateRange: DateRange; setDateRange: (v: DateRange) => void;
  search: string; setSearch: (v: string) => void; searchPlaceholder: string;
  statusFilter: string; setStatusFilter: (v: string) => void; statusOptions: string[];
  extra?: React.ReactNode;
}) {
  const PERIOD_OPTIONS = ["All", "Daily", "Weekly", "Monthly"];
  const periodLabel = dateRange === "all" ? "All" : dateRange.charAt(0).toUpperCase() + dateRange.slice(1);
  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center", background: "#FAFBFD" }}>
      {/* Search — first, same style as master list */}
      <FilterSearch value={search} onChange={setSearch} placeholder={searchPlaceholder} />
      {/* Status dropdown */}
      {statusOptions.length > 0 && (
        <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} allLabel="All Status" />
      )}
      {extra}
      {/* Period dropdown — last */}
      <div style={{ position: "relative" }}>
        <select value={periodLabel} onChange={e => {
          const v = e.target.value;
          setDateRange(v === "All" ? "all" : v.toLowerCase() as DateRange);
        }}
          style={{ padding: "10px 34px 10px 14px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", cursor: "pointer", color: "#2B3A4F", minHeight: 40, appearance: "none", WebkitAppearance: "none" as const }}>
          {PERIOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "inline-flex" }}>
          <ChevronDown />
        </span>
      </div>
      {/* Clear */}
      {(search || statusFilter !== "All" || dateRange !== "all") && (
        <ClearFiltersButton onClick={() => { setSearch(""); setStatusFilter("All"); setDateRange("all"); }} />
      )}
    </div>
  );
}

// ── KPI mini strip ────────────────────────────────────────────────────────────

function MiniKPI({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "11px 14px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color, fontFamily: "Outfit", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", marginTop: 2 }}>{sub}</div>}
      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, fontFamily: "Inter", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>{label}</div>
    </div>
  );
}

// ── Detail modal ────────────────────────────────────────────────────────────

function RecordModal({ title, refNo, onClose, children }: { title: string; refNo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: 680, maxHeight: "88vh", display: "flex", flexDirection: "column", border: "1px solid #E8ECF4", boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{title}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#1B6CA8", marginTop: 2 }}>{refNo}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>View Only</span>
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: "20px" }}>{children}</div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", padding: "7px 0", borderBottom: "1px solid #F4F6FA" }}>
      <span style={{ width: 160, flexShrink: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 600, fontFamily: "Inter" }}>{label}</span>
      <span style={{ flex: 1, fontSize: 13, color: "#1A2436", fontFamily: mono ? "JetBrains Mono" : "Inter" }}>{value || "—"}</span>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", padding: "8px 0", borderBottom: "1px solid #F4F6FA" }}>
      <span style={{ width: 180, flexShrink: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 600, fontFamily: "Inter" }}>{label}</span>
      <span style={{ flex: 1, fontSize: 13, color: "#1A2436", fontFamily: mono ? "JetBrains Mono" : "Inter", wordBreak: "break-all" as const }}>{value || "—"}</span>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4", marginBottom: 12 }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
        <div style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>{title}</div>
      </div>
      <div style={{ padding: "4px 16px 12px" }}>{children}</div>
    </div>
  );
}

function DistributorDetailPage({ distributor, onBack, onEdit, onNavigatePurchases, initialTab }: {
  distributor: DistributorRecord;
  onBack: () => void;
  onEdit: () => void;
  onNavigatePurchases?: (link: PurchasesDeepLink) => void;
  initialTab?: DetailTab;
}) {
  const [tab, setTab] = useState<DetailTab>(initialTab ?? "overview");

  // ── per-tab filter state ────────────────────────────────────────────────
  const [ordDateRange, setOrdDateRange] = useState<DateRange>("all");
  const [ordSearch, setOrdSearch] = useState("");
  const [ordStatus, setOrdStatus] = useState("All");

  const [invDateRange, setInvDateRange] = useState<DateRange>("all");
  const [invSearch, setInvSearch] = useState("");
  const [invStatus, setInvStatus] = useState("All");

  const [retDateRange, setRetDateRange] = useState<DateRange>("all");
  const [retSearch, setRetSearch] = useState("");
  const [retStatus, setRetStatus] = useState("All");

  const [payDateRange, setPayDateRange] = useState<DateRange>("all");
  const [paySearch, setPaySearch] = useState("");
  const [payStatus, setPayStatus] = useState("All");
  const [payMethod, setPayMethod] = useState("All");

  // ── detail modal state ───────────────────────────────────────────────────
  type ModalRecord =
    | { kind: "order"; data: typeof MOCK_PO_HISTORY[0] }
    | { kind: "invoice"; data: typeof MOCK_INVOICES[0] }
    | { kind: "return"; data: typeof MOCK_RETURNS[0] }
    | { kind: "payment"; data: typeof MOCK_PAYMENTS[0] };
  const [modal, setModal] = useState<ModalRecord | null>(null);

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "commercial", label: "Commercial Terms" },
    { id: "expiry", label: "Expiry Policy" },
    { id: "orders", label: "Purchase Orders" },
    { id: "invoices", label: "Invoices" },
    { id: "returns", label: "Returns" },
    { id: "payments", label: "Payments" },
    { id: "audit", label: "Audit History" },
  ];

  const allPOs = MOCK_PO_HISTORY;
  const allInvoices = MOCK_INVOICES;
  const allReturns = MOCK_RETURNS;
  const allPayments = MOCK_PAYMENTS;
  const auditLog = MOCK_AUDIT;

  // ── filtered datasets ───────────────────────────────────────────────────
  const ordBounds = getDateBounds(ordDateRange, "", "");
  const filteredOrders = allPOs.filter(p =>
    inRange(p.date, ordBounds.from, ordBounds.to) &&
    (ordStatus === "All" || p.status === ordStatus) &&
    (!ordSearch || p.poNo.toLowerCase().includes(ordSearch.toLowerCase()))
  );

  const invBounds = getDateBounds(invDateRange, "", "");
  const filteredInvoices = allInvoices.filter(i =>
    inRange(i.date, invBounds.from, invBounds.to) &&
    (invStatus === "All" || i.status === invStatus) &&
    (!invSearch || i.invNo.toLowerCase().includes(invSearch.toLowerCase()) || i.poRef.toLowerCase().includes(invSearch.toLowerCase()))
  );

  const retBounds = getDateBounds(retDateRange, "", "");
  const filteredReturns = allReturns.filter(r =>
    inRange(r.date, retBounds.from, retBounds.to) &&
    (retStatus === "All" || r.status === retStatus) &&
    (!retSearch || r.retNo.toLowerCase().includes(retSearch.toLowerCase()) || r.invRef.toLowerCase().includes(retSearch.toLowerCase()) || r.reason.toLowerCase().includes(retSearch.toLowerCase()))
  );

  const payBounds = getDateBounds(payDateRange, "", "");
  const filteredPayments = allPayments.filter(p =>
    inRange(p.date, payBounds.from, payBounds.to) &&
    (payStatus === "All" || p.status === payStatus) &&
    (payMethod === "All" || p.method === payMethod) &&
    (!paySearch || p.payNo.toLowerCase().includes(paySearch.toLowerCase()) || p.invRef.toLowerCase().includes(paySearch.toLowerCase()))
  );

  // ── aggregates (based on ALL data for top KPIs; filtered for tab KPIs) ──
  const totalPOs = allPOs.length;
  const totalInvoiced = allInvoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = allInvoices.reduce((s, i) => s + i.paid, 0);
  const totalUnpaid = allInvoices.reduce((s, i) => s + i.balance, 0);
  const totalReturns = allReturns.reduce((s, r) => s + r.amount, 0);
  const totalPayments = allPayments.reduce((s, p) => s + p.amount, 0);
  const lastPO = allPOs[0];

  return (
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, zIndex: 50, background: "#F0F3F7", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Detail modals ── */}
      {modal?.kind === "order" && (
        <RecordModal title="Purchase Order — View" refNo={modal.data.poNo} onClose={() => setModal(null)}>
          <ModalField label="PO Number" value={modal.data.poNo} mono />
          <ModalField label="Date" value={modal.data.date} />
          <ModalField label="Items" value={`${modal.data.items} items`} />
          <ModalField label="Amount" value={`₹${modal.data.amount.toLocaleString("en-IN")}`} />
          <ModalField label="Status" value={modal.data.status} />
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1B6CA8", fontFamily: "Inter" }}>
            This is a view-only summary. Full PO details are available in the Purchase Orders module.
          </div>
        </RecordModal>
      )}
      {modal?.kind === "invoice" && (
        <RecordModal title="Purchase Invoice — View" refNo={modal.data.invNo} onClose={() => setModal(null)}>
          <ModalField label="Invoice Number" value={modal.data.invNo} mono />
          <ModalField label="PO Reference" value={modal.data.poRef} mono />
          <ModalField label="Invoice Date" value={modal.data.date} />
          <ModalField label="Due Date" value={modal.data.dueDate} />
          <ModalField label="Items" value={`${modal.data.items} items`} />
          <div style={{ height: 1, background: "#EEF1F6", margin: "10px 0" }} />
          <ModalField label="Subtotal" value={`₹${modal.data.subtotal.toLocaleString("en-IN")}`} />
          <ModalField label="GST" value={`₹${modal.data.gst.toLocaleString("en-IN")}`} />
          <ModalField label="Total" value={`₹${modal.data.total.toLocaleString("en-IN")}`} />
          <ModalField label="Amount Paid" value={`₹${modal.data.paid.toLocaleString("en-IN")}`} />
          <ModalField label="Balance Due" value={modal.data.balance > 0 ? `₹${modal.data.balance.toLocaleString("en-IN")}` : "Nil"} />
          <ModalField label="Status" value={modal.data.status} />
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1B6CA8", fontFamily: "Inter" }}>
            This is a view-only summary. Full invoice details are available in the Purchase Invoices module.
          </div>
        </RecordModal>
      )}
      {modal?.kind === "return" && (
        <RecordModal title="Purchase Return — View" refNo={modal.data.retNo} onClose={() => setModal(null)}>
          <ModalField label="Return Number" value={modal.data.retNo} mono />
          <ModalField label="Invoice Reference" value={modal.data.invRef} mono />
          <ModalField label="Return Date" value={modal.data.date} />
          <ModalField label="Items Returned" value={`${modal.data.items} items`} />
          <ModalField label="Return Reason" value={modal.data.reason} />
          <ModalField label="Return Amount" value={`₹${modal.data.amount.toLocaleString("en-IN")}`} />
          <ModalField label="Credit Note" value={modal.data.creditNote || "Not Issued"} mono />
          <ModalField label="Status" value={modal.data.status} />
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1B6CA8", fontFamily: "Inter" }}>
            This is a view-only summary. Full return details are available in the Purchase Returns module.
          </div>
        </RecordModal>
      )}
      {modal?.kind === "payment" && (
        <RecordModal title="Payment — View" refNo={modal.data.payNo} onClose={() => setModal(null)}>
          <ModalField label="Payment Number" value={modal.data.payNo} mono />
          <ModalField label="Payment Date" value={modal.data.date} />
          <ModalField label="Invoice Reference" value={modal.data.invRef} mono />
          <ModalField label="Payment Method" value={modal.data.method} />
          <ModalField label="Payment Type" value={modal.data.type} />
          <ModalField label="Amount" value={`₹${modal.data.amount.toLocaleString("en-IN")}`} />
          <ModalField label="Status" value={modal.data.status} />
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1B6CA8", fontFamily: "Inter" }}>
            This is a view-only summary. Full payment details are available in the Purchase Payments module.
          </div>
        </RecordModal>
      )}

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack}
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", width: 28, height: 28 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>Distributor Master</span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>{distributor.name}</span>
          <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", background: "#EFF6FF", padding: "2px 8px", border: "1px solid #BFDBFE" }}>{distributor.code}</span>
          <Pill status={distributor.status} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <PrimaryBtn onClick={onEdit}>Edit Distributor</PrimaryBtn>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "0 24px", display: "flex", gap: 0, flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "11px 16px", border: "none", borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent", background: "transparent", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#1B6CA8" : "#6B7280", cursor: "pointer", fontFamily: "Inter", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total POs", value: String(totalPOs), color: "#1B6CA8" },
            { label: "Total Invoiced", value: `₹${totalInvoiced.toLocaleString("en-IN")}`, color: "#1A2436" },
            { label: "Total Paid", value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "#2E7D32" },
            { label: "Outstanding", value: totalUnpaid > 0 ? `₹${totalUnpaid.toLocaleString("en-IN")}` : "Nil", color: totalUnpaid > 0 ? "#C62828" : "#2E7D32" },
            { label: "Credit Limit", value: distributor.creditLimit > 0 ? `₹${distributor.creditLimit.toLocaleString("en-IN")}` : "None", color: "#1A2436" },
            { label: "Total Returns", value: `₹${totalReturns.toLocaleString("en-IN")}`, color: "#E65100" },
            { label: "Total Payments", value: `₹${totalPayments.toLocaleString("en-IN")}`, color: "#1B6CA8" },
            { label: "Last PO", value: lastPO?.date ?? "—", color: "#6B7280" },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "12px 16px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: k.color, fontFamily: "Outfit", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5, fontFamily: "Inter", fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === "overview" && (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DetailCard title="Basic Information">
                <DetailRow label="Distributor Name" value={distributor.name} />
                <DetailRow label="Distributor Code" value={distributor.code} mono />
                <DetailRow label="Distributor Type" value={distributor.type} />
                <DetailRow label="Group" value={distributor.group ?? ""} />
                <DetailRow label="Preferred Distributor" value={distributor.preferred ? "Yes" : "No"} />
                <DetailRow label="Status" value={distributor.status} />
              </DetailCard>

              <DetailCard title="Contact Information">
                <DetailRow label="Company Phone" value={distributor.mobile} mono />
                <DetailRow label="Email" value={distributor.email ?? ""} />
                <DetailRow label="Website" value={distributor.website ?? ""} />
                {distributor.contacts?.map((c, i) => (
                  <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #F4F6FA" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c.isPrimary ? "#1B6CA8" : "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: "Inter", marginBottom: 6 }}>
                      {c.isPrimary ? "★ Primary Contact" : `Contact ${i + 1}`}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px" }}>
                      {[["Name", c.name], ["Designation", c.designation], ["Mobile", c.mobile], ["Email", c.email]].map(([lbl, val]) => (
                        <div key={lbl}>
                          <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>{lbl}</div>
                          <div style={{ fontSize: 12, color: "#1A2436", fontFamily: "Inter", marginTop: 2 }}>{val || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </DetailCard>

              <DetailCard title="Business Address">
                <DetailRow label="Address Line 1" value={distributor.addrLine1 ?? ""} />
                <DetailRow label="Area / Locality" value={distributor.area ?? ""} />
                <DetailRow label="City" value={distributor.city} />
                <DetailRow label="District" value={distributor.district ?? ""} />
                <DetailRow label="State" value={distributor.state} />
                <DetailRow label="PIN Code" value={distributor.pin ?? ""} mono />
                <DetailRow label="Country" value="India" />
              </DetailCard>

              <DetailCard title="Tax & Regulatory Details">
                <DetailRow label="GSTIN" value={distributor.gstin} mono />
                <DetailRow label="GST Registration Type" value={distributor.gstType ?? ""} />
                <DetailRow label="PAN" value={distributor.pan ?? ""} mono />
                <DetailRow label="Drug License No." value={distributor.drugLicense} mono />
                <DetailRow label="Drug License Type" value={distributor.drugLicenseType} />
                <DetailRow label="FSSAI Number" value={distributor.fssai ?? ""} />
              </DetailCard>
            </div>

            {/* Right quick panel */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <div style={{ background: "#fff", border: "1px solid #E8ECF4", marginBottom: 12 }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6" }}>
                  <div style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Quick Info</div>
                </div>
                <div style={{ padding: "10px 14px" }}>
                  {[
                    { label: "Payment Terms", value: distributor.paymentTerms },
                    { label: "Credit Limit", value: distributor.creditLimit > 0 ? `₹${distributor.creditLimit.toLocaleString("en-IN")}` : "None" },
                    { label: "Outstanding", value: distributor.balance < 0 ? `₹${Math.abs(distributor.balance).toLocaleString("en-IN")}` : "Nil" },
                    { label: "Order Method", value: distributor.orderMethod ?? "—" },
                    { label: "Delivery", value: distributor.expectedDelivery ?? "—" },
                    { label: "Expiry Return", value: distributor.expiryReturn ? "Supported" : "Not Supported" },
                    { label: "Last PO", value: lastPO ? `${lastPO.poNo} · ${lastPO.date}` : "—" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #F4F6FA" }}>
                      <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, fontFamily: "Inter" }}>{r.label}</span>
                      <span style={{ fontSize: 11, color: "#1A2436", fontWeight: 600, fontFamily: "Inter", textAlign: "right" as const, maxWidth: 130 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {distributor.deliveryDays && distributor.deliveryDays.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6" }}>
                    <div style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Delivery Days</div>
                  </div>
                  <div style={{ padding: "12px 14px", display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                    {WEEKS.map((day, i) => {
                      const active = distributor.deliveryDays?.includes(day);
                      return (
                        <span key={day} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, fontFamily: "Inter", background: active ? "#1B6CA8" : "#F4F6FA", color: active ? "#fff" : "#9CA3AF" }}>
                          {WEEKS_SHORT[i]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Commercial Terms tab ── */}
        {tab === "commercial" && (
          <div style={{ maxWidth: 720 }}>
            <DetailCard title="Commercial Terms">
              <DetailRow label="Default Payment Terms" value={distributor.paymentTerms} />
              <DetailRow label="Credit Limit" value={distributor.creditLimit > 0 ? `₹${distributor.creditLimit.toLocaleString("en-IN")}` : "None"} />
              <DetailRow label="Outstanding Limit" value={distributor.outstandingLimit ? `₹${parseInt(distributor.outstandingLimit, 10).toLocaleString("en-IN")}` : "—"} />
              <DetailRow label="Default Discount" value={distributor.defaultDiscount ? `${distributor.defaultDiscount}%` : "—"} />
              <DetailRow label="Default Scheme" value={distributor.defaultScheme ?? ""} />
              <DetailRow label="Default Freight" value={distributor.defaultFreight ?? ""} />
              <DetailRow label="Minimum Order Value" value={distributor.minOrderValue ? `₹${distributor.minOrderValue}` : "—"} />
              <DetailRow label="Credit Enabled" value={distributor.creditEnabled ? "Yes" : "No"} />
            </DetailCard>
            <DetailCard title="Purchase & Delivery">
              <DetailRow label="Preferred Order Method" value={distributor.orderMethod ?? ""} />
              <DetailRow label="Expected Delivery" value={distributor.expectedDelivery ?? ""} />
              <DetailRow label="Delivery Days" value={distributor.deliveryDays?.join(", ") ?? ""} />
              <DetailRow label="Bank Name" value={distributor.bankName ?? ""} />
              <DetailRow label="UPI ID" value={distributor.upiId ?? ""} />
            </DetailCard>
          </div>
        )}

        {/* ── Expiry Policy tab ── */}
        {tab === "expiry" && (
          <div style={{ maxWidth: 720 }}>
            <DetailCard title="Expiry & Return Policy">
              <DetailRow label="Expiry Return Policy" value={distributor.expiryPolicy ?? ""} />
              <DetailRow label="Min Remaining Shelf Life" value={distributor.minShelfLife ?? ""} />
              <DetailRow label="Expiry Return Window" value={distributor.expiryReturnWindow ?? ""} />
              <DetailRow label="Return Freight" value={distributor.returnFreight ?? ""} />
              <DetailRow label="Allow Near-Expiry Return" value={distributor.nearExpiryReturn ? "Yes" : "No"} />
              <DetailRow label="Allow Expired Product Return" value={distributor.expiredReturn ? "Yes" : "No"} />
              <DetailRow label="Credit Note Expected" value={distributor.creditNoteExpected ? "Yes" : "No"} />
              <DetailRow label="Replacement Allowed" value={distributor.replacementAllowed ? "Yes" : "No"} />
            </DetailCard>
          </div>
        )}

        {/* ── Purchase Orders tab ── */}
        {tab === "orders" && (() => {
          const fOrdTotal = filteredOrders.reduce((s, p) => s + p.amount, 0);
          const rowStyle = { borderBottom: "1px solid #F4F6FA", cursor: "pointer" as const };
          return (
            <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Purchase Orders</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>All POs raised with {distributor.name}</div>
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{filteredOrders.length} records · ₹{fOrdTotal.toLocaleString("en-IN")}</div>
              </div>
              <HistoryFilterBar
                dateRange={ordDateRange} setDateRange={setOrdDateRange}
                search={ordSearch} setSearch={setOrdSearch} searchPlaceholder="Search PO number…"
                statusFilter={ordStatus} setStatusFilter={setOrdStatus}
                statusOptions={["Received", "Partial", "Cancelled"]}
              />
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <TH>PO Number</TH><TH>Date</TH><TH>Items</TH><TH right>Amount</TH><TH>Status</TH><TH>Action</TH>
                </tr></thead>
                <tbody>
                  {filteredOrders.length === 0
                    ? <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No purchase orders in this period.</td></tr>
                    : filteredOrders.map(po => (
                      <tr key={po.poNo} style={rowStyle}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                        <td style={{ padding: "11px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{po.poNo}</td>
                        <td style={{ padding: "11px 12px", fontSize: 12, fontFamily: "Inter", color: "#1A2436" }}>{po.date}</td>
                        <td style={{ padding: "11px 12px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{po.items}</td>
                        <td style={{ padding: "11px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 700, textAlign: "right" as const }}>₹{po.amount.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "11px 12px" }}>
                          <Pill label={po.status} color={po.status === "Received" ? "#2E7D32" : po.status === "Partial" ? "#E65100" : "#9CA3AF"} bg={po.status === "Received" ? "#E8F5E9" : po.status === "Partial" ? "#FFF3E0" : "#F5F5F5"} />
                        </td>
                        <td style={{ padding: "11px 12px" }}>
                          <button onClick={() => onNavigatePurchases ? onNavigatePurchases({ tab: "orders", id: po.poNo }) : setModal({ kind: "order", data: po })}
                            style={{ padding: "4px 10px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter" }}>View</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#F8FAFC", borderTop: "2px solid #E8ECF4" }}>
                    <td colSpan={3} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, fontFamily: "Inter", color: "#1A2436" }}>Period Total ({filteredOrders.length} POs)</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 800, textAlign: "right" as const }}>₹{fOrdTotal.toLocaleString("en-IN")}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* ── Invoices tab ── */}
        {tab === "invoices" && (() => {
          const fInvTotal = filteredInvoices.reduce((s, i) => s + i.total, 0);
          const fInvPaid = filteredInvoices.reduce((s, i) => s + i.paid, 0);
          const fInvBal = filteredInvoices.reduce((s, i) => s + i.balance, 0);
          const rowStyle = { borderBottom: "1px solid #F4F6FA", cursor: "pointer" as const };
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Purchase Invoices</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>All invoices received from {distributor.name}</div>
                  </div>
                  {fInvBal > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#C62828", background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "4px 12px", fontFamily: "Inter" }}>
                      Outstanding: ₹{fInvBal.toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
                <HistoryFilterBar
                  dateRange={invDateRange} setDateRange={setInvDateRange}
                  search={invSearch} setSearch={setInvSearch} searchPlaceholder="Search invoice or PO no…"
                  statusFilter={invStatus} setStatusFilter={setInvStatus}
                  statusOptions={["Paid", "Unpaid", "Part Paid"]}
                />
                <div style={{ overflowX: "auto" as const }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <TH>Invoice No.</TH><TH>PO Ref</TH><TH>Date</TH><TH>Due Date</TH>
                      <TH right>Subtotal</TH><TH right>GST</TH><TH right>Total</TH><TH right>Paid</TH><TH right>Balance</TH><TH>Status</TH><TH>Action</TH>
                    </tr></thead>
                    <tbody>
                      {filteredInvoices.length === 0
                        ? <tr><td colSpan={11} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No invoices in this period.</td></tr>
                        : filteredInvoices.map(inv => {
                          const sColor = inv.status === "Paid" ? "#2E7D32" : inv.status === "Unpaid" ? "#C62828" : "#E65100";
                          const sBg = inv.status === "Paid" ? "#E8F5E9" : inv.status === "Unpaid" ? "#FFEBEE" : "#FFF3E0";
                          return (
                            <tr key={inv.invNo} style={rowStyle}
                              onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                              onMouseLeave={e => (e.currentTarget.style.background = "")}>
                              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{inv.invNo}</td>
                              <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{inv.poRef}</td>
                              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "Inter", color: "#1A2436" }}>{inv.date}</td>
                              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "Inter", color: inv.balance > 0 ? "#C62828" : "#6B7280" }}>{inv.dueDate}</td>
                              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" as const }}>₹{inv.subtotal.toLocaleString("en-IN")}</td>
                              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", textAlign: "right" as const }}>₹{inv.gst.toLocaleString("en-IN")}</td>
                              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 700, textAlign: "right" as const }}>₹{inv.total.toLocaleString("en-IN")}</td>
                              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#2E7D32", textAlign: "right" as const }}>₹{inv.paid.toLocaleString("en-IN")}</td>
                              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: inv.balance > 0 ? "#C62828" : "#9CA3AF", fontWeight: inv.balance > 0 ? 700 : 400, textAlign: "right" as const }}>
                                {inv.balance > 0 ? `₹${inv.balance.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td style={{ padding: "10px 12px" }}><Pill label={inv.status} color={sColor} bg={sBg} /></td>
                              <td style={{ padding: "10px 12px" }}>
                                <button onClick={() => onNavigatePurchases ? onNavigatePurchases({ tab: "invoices", id: inv.invNo }) : setModal({ kind: "invoice", data: inv })}
                                  style={{ padding: "4px 10px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter" }}>View</button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#F8FAFC", borderTop: "2px solid #E8ECF4" }}>
                        <td colSpan={4} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, fontFamily: "Inter", color: "#1A2436" }}>Period Totals ({filteredInvoices.length})</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", fontWeight: 600, textAlign: "right" as const }}>₹{filteredInvoices.reduce((s, i) => s + i.subtotal, 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280", fontWeight: 600, textAlign: "right" as const }}>₹{filteredInvoices.reduce((s, i) => s + i.gst, 0).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 800, textAlign: "right" as const }}>₹{fInvTotal.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#2E7D32", fontWeight: 700, textAlign: "right" as const }}>₹{fInvPaid.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: fInvBal > 0 ? "#C62828" : "#9CA3AF", fontWeight: 700, textAlign: "right" as const }}>
                          {fInvBal > 0 ? `₹${fInvBal.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Returns tab ── */}
        {tab === "returns" && (() => {
          const fRetTotal = filteredReturns.reduce((s, r) => s + r.amount, 0);
          const rowStyle = { borderBottom: "1px solid #F4F6FA", cursor: "pointer" as const };
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
                  <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Purchase Return History</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>Items returned to {distributor.name}</div>
                </div>
                <HistoryFilterBar
                  dateRange={retDateRange} setDateRange={setRetDateRange}
                  search={retSearch} setSearch={setRetSearch} searchPlaceholder="Search return no, invoice, reason…"
                  statusFilter={retStatus} setStatusFilter={setRetStatus}
                  statusOptions={["Credit Issued", "Pending"]}
                />
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <TH>Return No.</TH><TH>Invoice Ref</TH><TH>Date</TH><TH>Items</TH><TH>Reason</TH><TH right>Amount</TH><TH>Credit Note</TH><TH>Status</TH><TH>Action</TH>
                  </tr></thead>
                  <tbody>
                    {filteredReturns.length === 0
                      ? <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No returns in this period.</td></tr>
                      : filteredReturns.map(ret => {
                        const sColor = ret.status === "Credit Issued" ? "#2E7D32" : "#E65100";
                        const sBg = ret.status === "Credit Issued" ? "#E8F5E9" : "#FFF3E0";
                        return (
                          <tr key={ret.retNo} style={rowStyle}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{ret.retNo}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{ret.invRef}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "Inter", color: "#1A2436" }}>{ret.date}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{ret.items}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "Inter", color: "#1A2436" }}>{ret.reason}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#E65100", fontWeight: 700, textAlign: "right" as const }}>₹{ret.amount.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: ret.creditNote ? "#2E7D32" : "#9CA3AF" }}>{ret.creditNote || "—"}</td>
                            <td style={{ padding: "10px 12px" }}><Pill label={ret.status} color={sColor} bg={sBg} /></td>
                            <td style={{ padding: "10px 12px" }}>
                              <button onClick={() => onNavigatePurchases ? onNavigatePurchases({ tab: "returns", id: ret.retNo }) : setModal({ kind: "return", data: ret })}
                                style={{ padding: "4px 10px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter" }}>View</button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#F8FAFC", borderTop: "2px solid #E8ECF4" }}>
                      <td colSpan={5} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, fontFamily: "Inter", color: "#1A2436" }}>Period Total ({filteredReturns.length} returns)</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#E65100", fontWeight: 800, textAlign: "right" as const }}>₹{fRetTotal.toLocaleString("en-IN")}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ── Payments tab ── */}
        {tab === "payments" && (() => {
          const fPayTotal = filteredPayments.reduce((s, p) => s + p.amount, 0);
          const rowStyle = { borderBottom: "1px solid #F4F6FA", cursor: "pointer" as const };
          const payMethods = ["Bank Transfer", "UPI", "Cheque", "Cash", "RTGS"];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {totalUnpaid > 0 && (
                <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#C62828", fontFamily: "Inter" }}>Outstanding Balance</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "Inter" }}>Pending payment to {distributor.name}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#C62828", fontFamily: "Outfit" }}>₹{totalUnpaid.toLocaleString("en-IN")}</div>
                </div>
              )}
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Payment History</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>All payments made to {distributor.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{filteredPayments.length} records · ₹{fPayTotal.toLocaleString("en-IN")}</div>
                </div>
                <HistoryFilterBar
                  dateRange={payDateRange} setDateRange={setPayDateRange}
                  search={paySearch} setSearch={setPaySearch} searchPlaceholder="Search payment no, invoice…"
                  statusFilter={payStatus} setStatusFilter={setPayStatus}
                  statusOptions={["Cleared", "Adjusted", "Pending"]}
                  extra={
                    <div style={{ position: "relative" }}>
                      <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                        style={{ padding: "6px 28px 6px 10px", border: "1px solid #E8ECF4", fontSize: 12, fontFamily: "Inter", outline: "none", background: "#fff", appearance: "none", WebkitAppearance: "none" as const, color: payMethod === "All" ? "#9CA3AF" : "#1A2436", cursor: "pointer" }}>
                        {["All", ...payMethods].map(m => <option key={m} value={m}>{m === "All" ? "All Methods" : m}</option>)}
                      </select>
                      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "#9CA3AF" }}>▼</span>
                    </div>
                  }
                />
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <TH>Payment No.</TH><TH>Date</TH><TH>Invoice Ref</TH><TH>Method</TH><TH>Type</TH><TH right>Amount</TH><TH>Status</TH><TH>Action</TH>
                  </tr></thead>
                  <tbody>
                    {filteredPayments.length === 0
                      ? <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13, fontFamily: "Inter" }}>No payments in this period.</td></tr>
                      : filteredPayments.map(pay => {
                        const sColor = pay.status === "Cleared" ? "#2E7D32" : pay.status === "Adjusted" ? "#1B6CA8" : "#E65100";
                        const sBg = pay.status === "Cleared" ? "#E8F5E9" : pay.status === "Adjusted" ? "#EFF6FF" : "#FFF3E0";
                        return (
                          <tr key={pay.payNo} style={rowStyle}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{pay.payNo}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "Inter", color: "#1A2436" }}>{pay.date}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{pay.invRef}</td>
                            <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "Inter", color: "#1A2436" }}>{pay.method}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600, color: pay.type === "Advance" ? "#1B6CA8" : pay.type === "Part Payment" ? "#E65100" : "#6B7280" }}>{pay.type}</span>
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#2E7D32", fontWeight: 700, textAlign: "right" as const }}>₹{pay.amount.toLocaleString("en-IN")}</td>
                            <td style={{ padding: "10px 12px" }}><Pill label={pay.status} color={sColor} bg={sBg} /></td>
                            <td style={{ padding: "10px 12px" }}>
                              <button onClick={() => onNavigatePurchases ? onNavigatePurchases({ tab: "payments", id: pay.payNo }) : setModal({ kind: "payment", data: pay })}
                                style={{ padding: "4px 10px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter" }}>View</button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#F8FAFC", borderTop: "2px solid #E8ECF4" }}>
                      <td colSpan={5} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, fontFamily: "Inter", color: "#1A2436" }}>Period Total ({filteredPayments.length})</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#2E7D32", fontWeight: 800, textAlign: "right" as const }}>₹{fPayTotal.toLocaleString("en-IN")}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Ledger balance summary */}
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
                  <div style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Account Balance Summary</div>
                </div>
                <div style={{ padding: "14px 16px", maxWidth: 460 }}>
                  {[
                    { label: "Total Invoiced", value: totalInvoiced, color: "#1A2436", bold: false },
                    { label: "Less: Returns", value: totalReturns, color: "#E65100", bold: false, minus: true },
                    { label: "Net Payable", value: totalInvoiced - totalReturns, color: "#1A2436", bold: true },
                    { label: "Less: Paid", value: totalPayments, color: "#2E7D32", bold: false, minus: true },
                    { label: "Outstanding Balance", value: Math.max(0, totalInvoiced - totalReturns - totalPayments), color: totalUnpaid > 0 ? "#C62828" : "#2E7D32", bold: true },
                  ].map((r, i) => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? "1px solid #F4F6FA" : "none", borderTop: (i === 2 || i === 4) ? "2px solid #E8ECF4" : "none" }}>
                      <span style={{ fontSize: 13, color: "#6B7280", fontFamily: "Inter", fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
                      <span style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: r.color, fontWeight: r.bold ? 800 : 600 }}>
                        {(r as {minus?: boolean}).minus ? "– " : ""}₹{r.value.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Audit History tab ── */}
        {tab === "audit" && (
          <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Audit History</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>All changes and actions recorded for this distributor</div>
            </div>
            <div style={{ padding: "4px 0" }}>
              {auditLog.map((entry, i) => (
                <div key={i} style={{ display: "flex", gap: 16, padding: "12px 16px", borderBottom: "1px solid #F4F6FA", alignItems: "flex-start" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1B6CA8", flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{entry.action}</span>
                      <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{entry.ts}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{entry.detail}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" }}>by {entry.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function Suppliers({ onNavigatePurchases }: { onNavigatePurchases?: (link: PurchasesDeepLink) => void } = {}) {
  const [view, setView] = useState<ScreenView>("list");
  const [distributors, setDistributors] = useState<DistributorRecord[]>(MOCK_DISTRIBUTORS);
  const [selected, setSelected] = useState<DistributorRecord | null>(null);
  const [selectedTab, setSelectedTab] = useState<DetailTab>("overview");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, type: "success" | "error") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  function handleView(d: DistributorRecord) {
    setSelected(d);
    setSelectedTab("overview");
    setView("view");
  }

  function handleViewWithTab(d: DistributorRecord, tab: DetailTab) {
    setSelected(d);
    setSelectedTab(tab);
    setView("view");
  }

  function handleEdit(d?: DistributorRecord) {
    if (d) setSelected(d);
    setView("edit");
  }

  function handleSaved(rec: DistributorRecord, _asDraft: boolean) {
    setDistributors(prev => {
      const idx = prev.findIndex(d => d.id === rec.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = rec; return u; }
      return [rec, ...prev];
    });
    setView("list");
  }

  function handleBackFromAdd() {
    setView("list");
    setSelected(null);
  }

  function handleBackFromDetail() {
    setView("list");
    setSelected(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 1000, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 480, overflow: "hidden", background: toast.type === "success" ? "#2E7D32" : "#C62828", boxShadow: "0 6px 24px rgba(0,0,0,0.22)", animation: "toast-slide-up 0.22s ease-out" }}>
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
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "rgba(255,255,255,0.6)", animation: "toast-progress 2s linear forwards" }} />
            </div>
          </div>
        </div>
      )}
      {view === "list" && (
        <DistributorMasterList
          distributors={distributors}
          onAdd={() => { setSelected(null); setView("add"); }}
          onView={handleView}
          onViewWithTab={handleViewWithTab}
          onEdit={d => { setSelected(d); setView("edit"); }}
          onDeactivate={d => {
            setDistributors(prev => prev.map(x =>
              x.id === d.id
                ? { ...x, status: x.status === "Active" ? "Inactive" : x.status === "Inactive" ? "Active" : x.status }
                : x
            ));
          }}
        />
      )}
      {view === "add" && (
        <AddDistributorPage
          onBack={handleBackFromAdd}
          onSaved={handleSaved}
          existingDistributors={distributors}
          onViewExisting={d => { setSelected(d); setSelectedTab("overview"); setView("view"); }}
          showToast={showToast}
        />
      )}
      {view === "edit" && selected && (
        <AddDistributorPage
          onBack={() => { setView("view"); }}
          onSaved={handleSaved}
          existingDistributors={distributors}
          initialData={selected}
          showToast={showToast}
        />
      )}
      {view === "view" && selected && (
        <DistributorDetailPage
          distributor={selected}
          onBack={handleBackFromDetail}
          onEdit={() => handleEdit(selected)}
          onNavigatePurchases={onNavigatePurchases}
          initialTab={selectedTab}
        />
      )}
    </div>
  );
}
