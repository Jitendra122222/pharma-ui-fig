import { useState, useEffect } from "react";
import { drugs } from "../../data/mockData";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { useTableSort } from "../shared/useTableSort";
import { usePagination, PaginationFooter } from "../shared/usePagination";

type InvStatus = "Open" | "In Progress" | "Pending Approval" | "Approved" | "Rejected" | "Adjusted";
type InvPriority = "High" | "Medium" | "Low";

interface Investigation {
  id: string;
  drugId: number;
  drugName: string;
  reportedDate: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  priority: InvPriority;
  currentStep: number;
  status: InvStatus;
  assignedTo: string;
  reportedBy: string;
  reason?: string;
  reasonNotes?: string;
  adjustmentRef?: string;
}

const STEPS = [
  "Stock Difference",
  "Identify Transaction",
  "Batch Investigation",
  "Location Investigation",
  "User / Action Investigation",
  "Reason",
  "Approval",
  "Adjustment",
];

const ROOT_CAUSES = [
  "Damaged / Broken",
  "Expired Disposal",
  "Unrecorded Sale",
  "Wrong Batch Booked",
  "Wrong Location",
  "Purchase Entry Error",
  "Transfer Not Recorded",
  "Theft / Pilferage",
  "Other",
];

const EVIDENCE_TYPES = [
  "Physical Evidence",
  "System Logs",
  "Witness Account",
  "CCTV / Footage",
  "No Evidence",
];

const MOCK_TRANSACTIONS = [
  { date: "2026-09-22", type: "Sale", ref: "INV-2026-2341", qty: -4, user: "Cashier A" },
  { date: "2026-09-20", type: "Sale", ref: "INV-2026-2318", qty: -2, user: "Cashier B" },
  { date: "2026-09-18", type: "GRN", ref: "GRN-2026-0421", qty: 60, user: "Store Manager" },
  { date: "2026-09-15", type: "Adjustment", ref: "ADJ-2026-0041", qty: -3, user: "Pharmacist" },
  { date: "2026-09-12", type: "Transfer", ref: "TR-2026-0087", qty: -10, user: "Admin" },
  { date: "2026-09-10", type: "Sale", ref: "INV-2026-2198", qty: -6, user: "Cashier A" },
];

const MOCK_BATCHES = [
  { idx: 0, batch: "BT-2026-0118", received: "2026-07-29", expiry: "2027-08-15", expectedQty: 240, location: "A1-02" },
  { idx: 1, batch: "BT-2026-0112", received: "2026-05-15", expiry: "2027-06-20", expectedQty: 120, location: "A1-03" },
  { idx: 2, batch: "BT-2026-0098", received: "2026-03-10", expiry: "2027-04-01", expectedQty: 60, location: "A1-02" },
];

const MOCK_LOCATIONS = [
  { idx: 0, location: "A1-02", description: "Main Dispensary Shelf A", expectedQty: 180 },
  { idx: 1, location: "A1-03", description: "Main Dispensary Shelf A", expectedQty: 80 },
  { idx: 2, location: "STORE-B", description: "Storage Room B", expectedQty: 160 },
];

const MOCK_USER_ACTIONS = [
  { idx: 0, datetime: "2026-09-22 14:23", user: "Cashier A", action: "Sale Recorded", ref: "INV-2026-2341", qty: -4 },
  { idx: 1, datetime: "2026-09-20 10:15", user: "Cashier B", action: "Sale Recorded", ref: "INV-2026-2318", qty: -2 },
  { idx: 2, datetime: "2026-09-18 09:00", user: "Store Manager", action: "GRN Posted", ref: "GRN-2026-0421", qty: 60 },
  { idx: 3, datetime: "2026-09-15 16:45", user: "Pharmacist", action: "Stock Adjustment", ref: "ADJ-2026-0041", qty: -3 },
  { idx: 4, datetime: "2026-09-12 11:30", user: "Admin", action: "Transfer Posted", ref: "TR-2026-0087", qty: -10 },
];

const SEED: Investigation[] = [
  {
    id: "INV-2026-0001", drugId: 1, drugName: "Amoxicillin 500mg",
    reportedDate: "2026-09-15", systemQty: 380, physicalQty: 374, variance: -6,
    priority: "High", currentStep: 7, status: "Pending Approval",
    assignedTo: "Dr. R. Sharma", reportedBy: "Cashier",
    reason: "Damaged / Broken", reasonNotes: "Found damaged units on shelf B2 during monthly count",
  },
  {
    id: "INV-2026-0002", drugId: 3, drugName: "Paracetamol 500mg",
    reportedDate: "2026-09-18", systemQty: 1200, physicalQty: 1195, variance: -5,
    priority: "Medium", currentStep: 3, status: "In Progress",
    assignedTo: "Mark Stevens", reportedBy: "Staff",
  },
  {
    id: "INV-2026-0003", drugId: 5, drugName: "Metformin 1000mg",
    reportedDate: "2026-09-10", systemQty: 30, physicalQty: 33, variance: 3,
    priority: "Low", currentStep: 8, status: "Approved",
    assignedTo: "Admin", reportedBy: "Admin",
    reason: "Purchase Entry Error", reasonNotes: "Extra units from last GRN not recorded in system",
  },
  {
    id: "INV-2026-0004", drugId: 7, drugName: "Atorvastatin 20mg",
    reportedDate: "2026-09-20", systemQty: 312, physicalQty: 305, variance: -7,
    priority: "High", currentStep: 1, status: "Open",
    assignedTo: "Unassigned", reportedBy: "Pharmacist",
  },
  {
    id: "INV-2026-0005", drugId: 11, drugName: "Warfarin 5mg",
    reportedDate: "2026-08-25", systemQty: 10, physicalQty: 8, variance: -2,
    priority: "Medium", currentStep: 8, status: "Adjusted",
    assignedTo: "Jane Doe", reportedBy: "Jane Doe",
    reason: "Unrecorded Sale", reasonNotes: "Manual counter sale not recorded in POS",
    adjustmentRef: "ADJ-2026-0042",
  },
];

interface AuditEvent {
  id: string;
  caseId: string;
  drugName: string;
  datetime: string;
  actor: string;
  action: string;
  fromStep?: string;
  toStep?: string;
  detail?: string;
  eventType: "opened" | "progressed" | "decision" | "evidence" | "adjusted" | "closed";
}

const AUDIT_TRAIL: AuditEvent[] = [
  { id: "AE-001", caseId: "INV-2026-0001", drugName: "Amoxicillin 500mg", datetime: "2026-09-15 08:12", actor: "Cashier", action: "Case Opened", toStep: "Stock Difference", detail: "Physical count: 374, System: 380, Variance: -6", eventType: "opened" },
  { id: "AE-002", caseId: "INV-2026-0001", drugName: "Amoxicillin 500mg", datetime: "2026-09-15 09:30", actor: "Dr. R. Sharma", action: "Case Assigned", detail: "Priority set to High", eventType: "decision" },
  { id: "AE-003", caseId: "INV-2026-0001", drugName: "Amoxicillin 500mg", datetime: "2026-09-15 10:15", actor: "Dr. R. Sharma", action: "Step Advanced", fromStep: "Stock Difference", toStep: "Identify Transaction", eventType: "progressed" },
  { id: "AE-004", caseId: "INV-2026-0001", drugName: "Amoxicillin 500mg", datetime: "2026-09-16 09:14", actor: "Jane Doe", action: "Evidence Added", detail: "Physical Evidence: damage_shelf_b2.jpg", eventType: "evidence" },
  { id: "AE-005", caseId: "INV-2026-0002", drugName: "Paracetamol 500mg", datetime: "2026-09-18 11:00", actor: "Staff", action: "Case Opened", toStep: "Stock Difference", detail: "Physical count: 1195, System: 1200, Variance: -5", eventType: "opened" },
  { id: "AE-006", caseId: "INV-2026-0001", drugName: "Amoxicillin 500mg", datetime: "2026-09-16 14:30", actor: "Mark Stevens", action: "Evidence Added", detail: "System Logs: pos_log_sep.csv", eventType: "evidence" },
  { id: "AE-007", caseId: "INV-2026-0001", drugName: "Amoxicillin 500mg", datetime: "2026-09-17 09:00", actor: "Dr. R. Sharma", action: "Step Advanced", fromStep: "Batch Investigation", toStep: "Location Investigation", eventType: "progressed" },
  { id: "AE-008", caseId: "INV-2026-0002", drugName: "Paracetamol 500mg", datetime: "2026-09-18 14:00", actor: "Mark Stevens", action: "Step Advanced", fromStep: "Stock Difference", toStep: "Identify Transaction", eventType: "progressed" },
  { id: "AE-009", caseId: "INV-2026-0001", drugName: "Amoxicillin 500mg", datetime: "2026-09-18 10:30", actor: "Dr. R. Sharma", action: "Reason Recorded", detail: "Root cause: Damaged / Broken", eventType: "decision" },
  { id: "AE-010", caseId: "INV-2026-0003", drugName: "Metformin 1000mg", datetime: "2026-09-10 08:45", actor: "Admin", action: "Case Opened", toStep: "Stock Difference", detail: "Physical count: 33, System: 30, Variance: +3", eventType: "opened" },
  { id: "AE-011", caseId: "INV-2026-0001", drugName: "Amoxicillin 500mg", datetime: "2026-09-19 15:00", actor: "Dr. R. Sharma", action: "Submitted for Approval", fromStep: "Reason", toStep: "Approval", eventType: "decision" },
  { id: "AE-012", caseId: "INV-2026-0003", drugName: "Metformin 1000mg", datetime: "2026-09-11 10:00", actor: "Admin", action: "Adjustment Applied", detail: "ADJ-2026-0039 — +3 units recorded", eventType: "adjusted" },
  { id: "AE-013", caseId: "INV-2026-0004", drugName: "Atorvastatin 20mg", datetime: "2026-09-20 09:20", actor: "Pharmacist", action: "Case Opened", toStep: "Stock Difference", detail: "Physical count: 305, System: 312, Variance: -7", eventType: "opened" },
  { id: "AE-014", caseId: "INV-2026-0005", drugName: "Warfarin 5mg", datetime: "2026-08-25 11:00", actor: "Jane Doe", action: "Case Opened", toStep: "Stock Difference", detail: "Physical count: 8, System: 10, Variance: -2", eventType: "opened" },
  { id: "AE-015", caseId: "INV-2026-0005", drugName: "Warfarin 5mg", datetime: "2026-08-27 16:00", actor: "Jane Doe", action: "Adjustment Applied", detail: "ADJ-2026-0042 — -2 units recorded. Case closed.", eventType: "adjusted" },
];

function statusPillProps(s: InvStatus): { bg: string; color: string } {
  const m: Record<InvStatus, { bg: string; color: string }> = {
    "Open": { bg: "#EFF6FF", color: "#1B6CA8" },
    "In Progress": { bg: "#FFF3E0", color: "#E65100" },
    "Pending Approval": { bg: "#FFF8E1", color: "#F57F17" },
    "Approved": { bg: "#E8F5E9", color: "#2E7D32" },
    "Rejected": { bg: "#FFEBEE", color: "#C62828" },
    "Adjusted": { bg: "#F3E5F5", color: "#6A1B9A" },
  };
  return m[s] ?? { bg: "#F5F5F5", color: "#9CA3AF" };
}

function priorityPillProps(p: InvPriority): { bg: string; color: string } {
  const m: Record<InvPriority, { bg: string; color: string }> = {
    "High": { bg: "#FFEBEE", color: "#C62828" },
    "Medium": { bg: "#FFF3E0", color: "#E65100" },
    "Low": { bg: "#E8F5E9", color: "#2E7D32" },
  };
  return m[p];
}

function txTypeColor(type: string): { bg: string; color: string } {
  if (type === "Sale") return { bg: "#FFEBEE", color: "#C62828" };
  if (type === "GRN") return { bg: "#E8F5E9", color: "#2E7D32" };
  if (type === "Transfer") return { bg: "#EFF6FF", color: "#1B6CA8" };
  if (type === "Adjustment") return { bg: "#FFF3E0", color: "#E65100" };
  return { bg: "#F5F5F5", color: "#9CA3AF" };
}

const FL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "#9CA3AF", marginBottom: 5, display: "block",
};

const inputSty: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #DDE3EC",
  fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff",
  boxSizing: "border-box",
};

const STATUS_FILTERS: string[] = ["All", "Open", "In Progress", "Pending Approval", "Approved", "Rejected", "Adjusted"];

export default function StockInvestigation() {
  const [cases, setCases] = useState<Investigation[]>(SEED);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerStep, setDrawerStep] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [invSearch, setInvSearch] = useState("");
  const [showAuditReplay, setShowAuditReplay] = useState(false);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayRunning, setReplayRunning] = useState(false);

  // Form state
  const [drugId, setDrugId] = useState(drugs[0]?.id ?? 0);
  const [physQty, setPhysQty] = useState("");
  const [countDate, setCountDate] = useState("2026-09-24");
  const [reportedBy, setReportedBy] = useState("Staff");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<InvPriority>("Medium");
  const [step2Notes, setStep2Notes] = useState("");
  const [step2Sel, setStep2Sel] = useState<number[]>([]);
  const [step3Notes, setStep3Notes] = useState("");
  const [step3Qty, setStep3Qty] = useState<Record<number, string>>({});
  const [step4Notes, setStep4Notes] = useState("");
  const [step4Qty, setStep4Qty] = useState<Record<number, string>>({});
  const [step5Notes, setStep5Notes] = useState("");
  const [step5Suspects, setStep5Suspects] = useState<number[]>([]);
  const [reason, setReason] = useState("");
  const [evidenceType, setEvidenceType] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [approverName, setApproverName] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [evidenceRecords, setEvidenceRecords] = useState<{ id: string; type: string; desc: string; file?: string; addedBy: string; addedAt: string }[]>([
    { id: "EV-001", type: "Physical Evidence", desc: "Photographs of damaged shelf B2 units (3 capsule strips)", file: "damage_shelf_b2.jpg", addedBy: "Jane Doe", addedAt: "2026-09-16 09:14" },
    { id: "EV-002", type: "System Logs", desc: "POS transaction log export for Sept 10–22", file: "pos_log_sep.csv", addedBy: "Mark Stevens", addedAt: "2026-09-17 14:30" },
  ]);
  const [evType, setEvType] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evFile, setEvFile] = useState("");

  const { sortCol, sortDir, handleSort, sorted: sortedAll } = useTableSort(cases);
  const displayRows = (statusFilter === "All" ? sortedAll : sortedAll.filter(c => c.status === statusFilter))
    .filter(c => !invSearch || c.id.toLowerCase().includes(invSearch.toLowerCase()) || c.drugName.toLowerCase().includes(invSearch.toLowerCase()) || c.assignedTo.toLowerCase().includes(invSearch.toLowerCase()));
  const { pageRows: invPageRows, footerProps: invFooterProps } = usePagination(displayRows, 10);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  useEffect(() => {
    if (!replayRunning) return;
    if (replayIdx >= AUDIT_TRAIL.length - 1) { setReplayRunning(false); return; }
    const t = setTimeout(() => setReplayIdx(i => i + 1), 800);
    return () => clearTimeout(t);
  }, [replayRunning, replayIdx]);

  const currentDrug = drugs.find(d => d.id === drugId) ?? drugs[0];
  const sysQty = currentDrug?.stock ?? 0;
  const parsedPhys = physQty === "" ? null : parseInt(physQty, 10);
  const liveVariance = parsedPhys !== null && !isNaN(parsedPhys) ? parsedPhys - sysQty : null;

  const activeCase = cases.find(c => c.id === activeId);

  function resetForm() {
    setDrugId(drugs[0]?.id ?? 0);
    setPhysQty("");
    setCountDate("2026-09-24");
    setReportedBy("Staff");
    setAssignedTo("");
    setPriority("Medium");
    setStep2Notes("");
    setStep2Sel([]);
    setStep3Notes("");
    setStep3Qty({});
    setStep4Notes("");
    setStep4Qty({});
    setStep5Notes("");
    setStep5Suspects([]);
    setReason("");
    setEvidenceType("");
    setReasonNotes("");
    setApproverName("");
    setApprovalNotes("");
  }

  function openNewCase() {
    resetForm();
    setActiveId(null);
    setDrawerStep(1);
    setOpen(true);
  }

  function openCase(inv: Investigation) {
    setDrugId(inv.drugId);
    setPhysQty(String(inv.physicalQty));
    setCountDate(inv.reportedDate);
    setReportedBy(inv.reportedBy);
    setAssignedTo(inv.assignedTo);
    setPriority(inv.priority);
    setReason(inv.reason ?? "");
    setReasonNotes(inv.reasonNotes ?? "");
    setStep2Notes("");
    setStep2Sel([]);
    setStep3Notes("");
    setStep3Qty({});
    setStep4Notes("");
    setStep4Qty({});
    setStep5Notes("");
    setStep5Suspects([]);
    setApproverName("");
    setApprovalNotes("");
    setActiveId(inv.id);
    setDrawerStep(Math.min(inv.currentStep, 8));
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
    setActiveId(null);
  }

  function nextStep() {
    if (drawerStep === 1) {
      const physNum = parseInt(physQty, 10);
      const varVal = isNaN(physNum) ? 0 : physNum - sysQty;
      const newStatus: InvStatus = "In Progress";
      if (activeId === null) {
        const newId = `INV-2026-${String(cases.length + 6).padStart(4, "0")}`;
        const newCase: Investigation = {
          id: newId,
          drugId,
          drugName: currentDrug?.name ?? "Unknown",
          reportedDate: countDate,
          systemQty: sysQty,
          physicalQty: isNaN(physNum) ? 0 : physNum,
          variance: varVal,
          priority,
          currentStep: 2,
          status: newStatus,
          assignedTo: assignedTo || "Unassigned",
          reportedBy,
        };
        setCases(cs => [newCase, ...cs]);
        setActiveId(newId);
      } else {
        setCases(cs => cs.map(c => c.id === activeId ? { ...c, currentStep: 2, status: newStatus } : c));
      }
    } else {
      const nextStepNum = Math.min(drawerStep + 1, 8);
      setCases(cs => cs.map(c => c.id === activeId ? { ...c, currentStep: nextStepNum } : c));
    }
    setDrawerStep(s => Math.min(s + 1, 8));
  }

  function prevStep() {
    setDrawerStep(s => Math.max(s - 1, 1));
  }

  function handleApprove() {
    setCases(cs => cs.map(c => c.id === activeId
      ? { ...c, status: "Approved", currentStep: 8, reason, reasonNotes }
      : c));
    setDrawerStep(8);
  }

  function handleReject() {
    setCases(cs => cs.map(c => c.id === activeId ? { ...c, status: "Rejected" } : c));
    closeDrawer();
  }

  function handlePostAdjustment() {
    const adjRef = `ADJ-2026-${String(42 + cases.length).padStart(4, "0")}`;
    setCases(cs => cs.map(c => c.id === activeId ? { ...c, status: "Adjusted", adjustmentRef: adjRef, currentStep: 8 } : c));
    closeDrawer();
  }

  const openCount = cases.filter(c => c.status === "Open").length;
  const inProgressCount = cases.filter(c => c.status === "In Progress").length;
  const pendingCount = cases.filter(c => c.status === "Pending Approval").length;
  const adjustedCount = cases.filter(c => c.status === "Adjusted").length;

  // ── Step content helpers ─────────────────────────────────────────────────────

  function step3Variance(expectedQty: number, idx: number) {
    const v = parseInt(step3Qty[idx] ?? "", 10);
    if (isNaN(v)) return null;
    return v - expectedQty;
  }

  function step4Variance(expectedQty: number, idx: number) {
    const v = parseInt(step4Qty[idx] ?? "", 10);
    if (isNaN(v)) return null;
    return v - expectedQty;
  }

  function varBadge(val: number | null) {
    if (val === null) return <span style={{ color: "#9CA3AF", fontSize: 13 }}>—</span>;
    const s = val < 0 ? { bg: "#FFEBEE", c: "#C62828" } : val > 0 ? { bg: "#E8F5E9", c: "#2E7D32" } : { bg: "#F5F5F5", c: "#6B7280" };
    return (
      <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, background: s.bg, color: s.c, padding: "2px 7px", borderRadius: 2 }}>
        {val > 0 ? `+${val}` : val}
      </span>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>


      {/* Variance Resolution Center */}
      {(() => {
        const resolved = cases.filter(c => c.status === "Adjusted" || c.status === "Approved");
        const totalQtyAdj = resolved.reduce((s, c) => s + Math.abs(c.variance), 0);
        const rootCauseCounts: Record<string, number> = {};
        resolved.forEach(c => {
          if (c.reason) rootCauseCounts[c.reason] = (rootCauseCounts[c.reason] ?? 0) + 1;
        });
        const topCause = Object.entries(rootCauseCounts).sort((a, b) => b[1] - a[1])[0];
        const rejectedCount = cases.filter(c => c.status === "Rejected").length;
        const resolutionRate = cases.length > 0 ? Math.round(((resolved.length) / cases.length) * 100) : 0;

        return (
          <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Variance Resolution Center</div>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>{resolved.length} of {cases.length} cases resolved</span>
            </div>
            {/* Resolution metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid #EEF1F6" }}>
              {[
                { label: "Resolution Rate", value: `${resolutionRate}%`, color: resolutionRate >= 60 ? "#2E7D32" : "#E65100" },
                { label: "Total Qty Adjusted", value: totalQtyAdj.toString(), color: "#1B6CA8" },
                { label: "Top Root Cause", value: topCause ? topCause[0].replace(" / ", "/") : "—", color: "#1A2436", small: true },
                { label: "Rejected", value: rejectedCount.toString(), color: rejectedCount > 0 ? "#C62828" : "#9CA3AF" },
              ].map((k, i) => (
                <div key={k.label} style={{ padding: "12px 16px", borderRight: i < 3 ? "1px solid #EEF1F6" : "none" }}>
                  <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5 }}>{k.label}</div>
                  <div style={{ fontFamily: (k as any).small ? "Inter" : "JetBrains Mono", fontSize: (k as any).small ? 12 : 18, fontWeight: 700, color: k.color, lineHeight: 1.2 }}>{k.value}</div>
                </div>
              ))}
            </div>
            {/* Root cause breakdown */}
            {Object.keys(rootCauseCounts).length > 0 && (
              <div style={{ padding: "12px 18px 14px", borderBottom: "1px solid #EEF1F6" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Root Cause Breakdown</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {Object.entries(rootCauseCounts).sort((a, b) => b[1] - a[1]).map(([cause, count]) => {
                    const pct = Math.round((count / resolved.length) * 100);
                    return (
                      <div key={cause} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 12, color: "#6B7280", minWidth: 180 }}>{cause}</div>
                        <div style={{ flex: 1, height: 6, background: "#F0F3F7", position: "relative" as const }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "#1B6CA8" }} />
                        </div>
                        <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 700, minWidth: 28, textAlign: "right" as const }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Recent resolutions */}
            <div style={{ padding: "12px 18px 14px" }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Recent Resolutions</div>
              {resolved.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {resolved.slice(0, 3).map(c => {
                    const sc = statusPillProps(c.status);
                    return (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "#F8FAFC", border: "1px solid #EEF1F6", borderRadius: 4 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2436", marginBottom: 3 }}>{c.drugName}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                            {c.reason ?? "No root cause recorded"}
                            {c.adjustmentRef && <span style={{ fontFamily: "JetBrains Mono", color: "#6B7280", marginLeft: 8 }}>{c.adjustmentRef}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" as const, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <Pill label={c.status} bg={sc.bg} color={sc.color} />
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: c.variance < 0 ? "#C62828" : "#2E7D32" }}>{c.variance > 0 ? `+${c.variance}` : c.variance}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center" as const, padding: "10px 0" }}>No resolved cases yet.</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Table card */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", borderRadius: 6, border: "1px solid #E8ECF4", padding: "10px 12px", flex: "0 0 260px", minHeight: 40, boxSizing: "border-box" as const }}>
            <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={invSearch} onChange={e => setInvSearch(e.target.value)} placeholder="Search cases..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#0C1B33", fontFamily: "Inter", width: "100%" }} />
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                style={{
                  padding: "5px 11px", border: `1px solid ${statusFilter === f ? "#1B6CA8" : "#DDE3EC"}`,
                  background: statusFilter === f ? "#1B6CA8" : "#fff",
                  color: statusFilter === f ? "#fff" : "#6B7280",
                  fontSize: 11, cursor: "pointer", fontFamily: "Inter", fontWeight: 600,
                }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => { setShowAuditReplay(true); setReplayIdx(0); setReplayRunning(false); }}
              style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#0C1B33", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Audit Trail
            </button>
            <button onClick={openNewCase}
              style={{ padding: "7px 14px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              + New Investigation
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Case #</Th>
              <Th onSort={() => handleSort("drugName")} sortDir={sortCol === "drugName" ? sortDir : null}>Drug</Th>
              <Th onSort={() => handleSort("reportedDate")} sortDir={sortCol === "reportedDate" ? sortDir : null}>Reported</Th>
              <Th onSort={() => handleSort("variance")} sortDir={sortCol === "variance" ? sortDir : null}>Variance</Th>
              <Th onSort={() => handleSort("priority")} sortDir={sortCol === "priority" ? sortDir : null}>Priority</Th>
              <Th onSort={() => handleSort("currentStep")} sortDir={sortCol === "currentStep" ? sortDir : null}>Stage</Th>
              <Th onSort={() => handleSort("assignedTo")} sortDir={sortCol === "assignedTo" ? sortDir : null}>Assigned To</Th>
              <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {invPageRows.map(inv => {
              const sc = statusPillProps(inv.status);
              const pc = priorityPillProps(inv.priority);
              return (
                <tr key={inv.id} style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{inv.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{inv.drugName}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{inv.reportedDate}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 2, background: inv.variance < 0 ? "#FFEBEE" : inv.variance > 0 ? "#E8F5E9" : "#F5F5F5", color: inv.variance < 0 ? "#C62828" : inv.variance > 0 ? "#2E7D32" : "#6B7280" }}>
                      {inv.variance > 0 ? `+${inv.variance}` : inv.variance}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}><Pill label={inv.priority} bg={pc.bg} color={pc.color} /></td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{STEPS[inv.currentStep - 1]}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#1A2436" }}>{inv.assignedTo}</td>
                  <td style={{ padding: "11px 14px" }}><Pill label={inv.status} bg={sc.bg} color={sc.color} /></td>
                  <td style={{ padding: "11px 14px" }}>
                    <button onClick={() => openCase(inv)}
                      style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600 }}>
                      {inv.status === "Open" || inv.status === "In Progress" ? "Investigate" : "View"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {invPageRows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "36px 14px", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                  No investigations found for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <PaginationFooter {...invFooterProps} />
      </div>

      {/* ── Investigation Drawer ─────────────────────────────────────────────── */}
      {open && (
        <>
          <div onClick={closeDrawer}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100 }} />
          <aside style={{ position: "fixed", right: 0, top: 50, bottom: 0, width: 580, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", borderLeft: "1px solid #DDE3EC", boxShadow: "-4px 0 24px rgba(0,0,0,0.14)" }}>
            {/* Drawer header */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#9CA3AF", marginBottom: 3 }}>
                  {activeId ?? "New Investigation"}
                </div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>
                  {activeCase ? activeCase.drugName : (currentDrug?.name ?? "Select Drug")}
                </div>
                {activeCase && (
                  <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                    <Pill label={activeCase.status} {...statusPillProps(activeCase.status)} />
                    <Pill label={activeCase.priority} {...priorityPillProps(activeCase.priority)} />
                  </div>
                )}
              </div>
              <button onClick={closeDrawer}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 24, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            {/* Step indicator */}
            <div style={{ padding: "12px 22px", borderBottom: "1px solid #EEF1F6", background: "#FAFBFD", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Step {drawerStep} of 8
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1B6CA8" }}>
                  {STEPS[drawerStep - 1]}
                </div>
              </div>
              {/* Mini step segments */}
              <div style={{ display: "flex", gap: 3 }}>
                {STEPS.map((s, i) => (
                  <div key={s} title={s}
                    style={{ flex: 1, height: 4, borderRadius: 2, background: i + 1 <= drawerStep ? "#1B6CA8" : "#E8ECF4", transition: "background 0.2s" }} />
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>

              {/* ── Step 1: Stock Difference ── */}
              {drawerStep === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={FL}>Drug / Item</label>
                    <select value={drugId}
                      onChange={e => { setDrugId(parseInt(e.target.value)); setPhysQty(""); }}
                      style={{ ...inputSty, cursor: "pointer" }}>
                      {drugs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={FL}>System Quantity</label>
                      <input value={sysQty} readOnly
                        style={{ ...inputSty, background: "#F8FAFC", color: "#6B7280", cursor: "not-allowed" }} />
                    </div>
                    <div>
                      <label style={FL}>Physical Quantity</label>
                      <input type="number" value={physQty}
                        onChange={e => setPhysQty(e.target.value)}
                        placeholder="Enter counted qty"
                        style={inputSty} />
                    </div>
                  </div>
                  {liveVariance !== null && (
                    <div style={{ padding: "14px 18px", border: `1px solid ${liveVariance < 0 ? "#FFCDD2" : liveVariance > 0 ? "#A5D6A7" : "#DDE3EC"}`, background: liveVariance < 0 ? "#FFEBEE" : liveVariance > 0 ? "#E8F5E9" : "#F5F5F5" }}>
                      <label style={FL}>Variance</label>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 28, fontWeight: 700, color: liveVariance < 0 ? "#C62828" : liveVariance > 0 ? "#2E7D32" : "#6B7280", marginBottom: 4 }}>
                        {liveVariance > 0 ? `+${liveVariance}` : liveVariance}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>
                        {liveVariance < 0
                          ? `${Math.abs(liveVariance)} unit${Math.abs(liveVariance) !== 1 ? "s" : ""} missing from physical count`
                          : liveVariance > 0
                          ? `${liveVariance} surplus unit${liveVariance !== 1 ? "s" : ""} found in physical count`
                          : "No variance — counts match"}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={FL}>Date of Count</label>
                      <input type="date" value={countDate} onChange={e => setCountDate(e.target.value)} style={inputSty} />
                    </div>
                    <div>
                      <label style={FL}>Reported By</label>
                      <input value={reportedBy} onChange={e => setReportedBy(e.target.value)} style={inputSty} />
                    </div>
                  </div>
                  <div>
                    <label style={FL}>Assign To</label>
                    <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Staff member name" style={inputSty} />
                  </div>
                  <div>
                    <label style={FL}>Priority</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["High", "Medium", "Low"] as InvPriority[]).map(p => {
                        const pc = priorityPillProps(p);
                        const active = priority === p;
                        return (
                          <button key={p} onClick={() => setPriority(p)}
                            style={{ padding: "7px 20px", border: `2px solid ${active ? pc.color : "#DDE3EC"}`, background: active ? pc.bg : "#fff", color: active ? pc.color : "#6B7280", fontSize: 13, cursor: "pointer", fontFamily: "Inter", fontWeight: 700 }}>
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Identify Transaction ── */}
              {drawerStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 13, color: "#1B6CA8" }}>
                    Review recent transactions for <strong>{activeCase?.drugName ?? currentDrug?.name}</strong>. Check any that may have contributed to the variance.
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["", "Date", "Type", "Reference", "Qty", "User"].map(h => (
                          <th key={h} style={{ padding: "7px 10px", background: "#F8FAFC", borderBottom: "1px solid #E8ECF4", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_TRANSACTIONS.map((tx, i) => {
                        const tc = txTypeColor(tx.type);
                        const checked = step2Sel.includes(i);
                        return (
                          <tr key={i} onClick={() => setStep2Sel(s => checked ? s.filter(x => x !== i) : [...s, i])}
                            style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer", background: checked ? "#F0F6FF" : "transparent" }}
                            onMouseEnter={e => { if (!checked) e.currentTarget.style.background = "#F7F9FC"; }}
                            onMouseLeave={e => { if (!checked) e.currentTarget.style.background = "transparent"; }}>
                            <td style={{ padding: "9px 10px" }}>
                              <div style={{ width: 14, height: 14, border: `2px solid ${checked ? "#1B6CA8" : "#DDE3EC"}`, background: checked ? "#1B6CA8" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {checked && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                              </div>
                            </td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280" }}>{tx.date}</td>
                            <td style={{ padding: "9px 10px" }}><span style={{ padding: "2px 8px", background: tc.bg, color: tc.color, fontSize: 11, fontWeight: 700, borderRadius: 2 }}>{tx.type}</span></td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#1B6CA8", fontSize: 11 }}>{tx.ref}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontWeight: 700, color: tx.qty < 0 ? "#C62828" : "#2E7D32" }}>{tx.qty > 0 ? `+${tx.qty}` : tx.qty}</td>
                            <td style={{ padding: "9px 10px", color: "#1A2436" }}>{tx.user}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {step2Sel.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "#FFF3E0", border: "1px solid #FFCC80", fontSize: 12, color: "#E65100" }}>
                      {step2Sel.length} transaction{step2Sel.length !== 1 ? "s" : ""} flagged as potentially related
                    </div>
                  )}
                  <div>
                    <label style={FL}>Investigation Notes</label>
                    <textarea value={step2Notes} onChange={e => setStep2Notes(e.target.value)}
                      placeholder="Record observations from transaction review..."
                      rows={3}
                      style={{ ...inputSty, resize: "vertical" as const }} />
                  </div>
                </div>
              )}

              {/* ── Step 3: Batch Investigation ── */}
              {drawerStep === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 13, color: "#1B6CA8" }}>
                    Verify physical quantity per batch. Enter actual counted units for each batch below.
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Batch #", "Received", "Expiry", "Location", "System Qty", "Physical Qty", "Variance"].map(h => (
                          <th key={h} style={{ padding: "7px 10px", background: "#F8FAFC", borderBottom: "1px solid #E8ECF4", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: h === "System Qty" || h === "Variance" ? "right" : "left", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_BATCHES.map(b => {
                        const v = step3Variance(b.expectedQty, b.idx);
                        return (
                          <tr key={b.batch} style={{ borderBottom: "1px solid #F4F6FA" }}>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8" }}>{b.batch}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.received}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280" }}>{b.expiry}</td>
                            <td style={{ padding: "9px 10px", color: "#1A2436" }}>{b.location}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436", fontWeight: 700 }}>{b.expectedQty}</td>
                            <td style={{ padding: "9px 10px" }}>
                              <input type="number" value={step3Qty[b.idx] ?? ""}
                                onChange={e => setStep3Qty(q => ({ ...q, [b.idx]: e.target.value }))}
                                placeholder="—"
                                style={{ width: 80, padding: "5px 8px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none", boxSizing: "border-box" as const }} />
                            </td>
                            <td style={{ padding: "9px 10px", textAlign: "right" }}>{varBadge(v)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div>
                    <label style={FL}>Batch Investigation Notes</label>
                    <textarea value={step3Notes} onChange={e => setStep3Notes(e.target.value)}
                      placeholder="Observations from batch-level count..."
                      rows={3}
                      style={{ ...inputSty, resize: "vertical" as const }} />
                  </div>
                </div>
              )}

              {/* ── Step 4: Location Investigation ── */}
              {drawerStep === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 13, color: "#1B6CA8" }}>
                    Count stock at each storage location. Misplacement is a common cause of discrepancies.
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Location", "Description", "Expected Qty", "Physical Qty", "Difference"].map(h => (
                          <th key={h} style={{ padding: "7px 10px", background: "#F8FAFC", borderBottom: "1px solid #E8ECF4", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: h === "Expected Qty" || h === "Difference" ? "right" : "left", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_LOCATIONS.map(loc => {
                        const v = step4Variance(loc.expectedQty, loc.idx);
                        return (
                          <tr key={loc.location} style={{ borderBottom: "1px solid #F4F6FA" }}>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontSize: 12, fontWeight: 700, color: "#1A2436" }}>{loc.location}</td>
                            <td style={{ padding: "9px 10px", color: "#6B7280" }}>{loc.description}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", textAlign: "right", fontWeight: 700, color: "#1A2436" }}>{loc.expectedQty}</td>
                            <td style={{ padding: "9px 10px" }}>
                              <input type="number" value={step4Qty[loc.idx] ?? ""}
                                onChange={e => setStep4Qty(q => ({ ...q, [loc.idx]: e.target.value }))}
                                placeholder="—"
                                style={{ width: 80, padding: "5px 8px", borderRadius: 6, border: "1px solid #DDE3EC", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none", boxSizing: "border-box" as const }} />
                            </td>
                            <td style={{ padding: "9px 10px", textAlign: "right" }}>{varBadge(v)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div>
                    <label style={FL}>Location Investigation Notes</label>
                    <textarea value={step4Notes} onChange={e => setStep4Notes(e.target.value)}
                      placeholder="Note any misplaced stock or location anomalies..."
                      rows={3}
                      style={{ ...inputSty, resize: "vertical" as const }} />
                  </div>
                </div>
              )}

              {/* ── Step 5: User / Action Investigation ── */}
              {drawerStep === 5 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 13, color: "#1B6CA8" }}>
                    Review user actions logged against this drug. Mark any suspect entries.
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["", "Date & Time", "User", "Action", "Reference", "Qty"].map(h => (
                          <th key={h} style={{ padding: "7px 10px", background: "#F8FAFC", borderBottom: "1px solid #E8ECF4", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_USER_ACTIONS.map(ua => {
                        const suspect = step5Suspects.includes(ua.idx);
                        return (
                          <tr key={ua.idx}
                            onClick={() => setStep5Suspects(s => suspect ? s.filter(x => x !== ua.idx) : [...s, ua.idx])}
                            style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer", background: suspect ? "#FFF3E0" : "transparent" }}
                            onMouseEnter={e => { if (!suspect) e.currentTarget.style.background = "#F7F9FC"; }}
                            onMouseLeave={e => { if (!suspect) e.currentTarget.style.background = "transparent"; }}>
                            <td style={{ padding: "9px 10px" }}>
                              <div style={{ width: 14, height: 14, border: `2px solid ${suspect ? "#E65100" : "#DDE3EC"}`, background: suspect ? "#FFF3E0" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {suspect && <span style={{ color: "#E65100", fontSize: 10, lineHeight: 1 }}>!</span>}
                              </div>
                            </td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", color: "#6B7280", fontSize: 11 }}>{ua.datetime}</td>
                            <td style={{ padding: "9px 10px", fontWeight: 600, color: "#1A2436" }}>{ua.user}</td>
                            <td style={{ padding: "9px 10px", color: "#6B7280" }}>{ua.action}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontSize: 11, color: "#1B6CA8" }}>{ua.ref}</td>
                            <td style={{ padding: "9px 10px", fontFamily: "JetBrains Mono", fontWeight: 700, color: ua.qty < 0 ? "#C62828" : "#2E7D32" }}>{ua.qty > 0 ? `+${ua.qty}` : ua.qty}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {step5Suspects.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "#FFF3E0", border: "1px solid #FFCC80", fontSize: 12, color: "#E65100" }}>
                      {step5Suspects.length} action{step5Suspects.length !== 1 ? "s" : ""} flagged as suspect
                    </div>
                  )}
                  <div>
                    <label style={FL}>User Investigation Notes</label>
                    <textarea value={step5Notes} onChange={e => setStep5Notes(e.target.value)}
                      placeholder="Record findings from user action review..."
                      rows={3}
                      style={{ ...inputSty, resize: "vertical" as const }} />
                  </div>
                </div>
              )}

              {/* ── Step 6: Reason ── */}
              {drawerStep === 6 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={FL}>Root Cause</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 6, border: "1px solid #DDE3EC" }}>
                      {ROOT_CAUSES.map(rc => (
                        <div key={rc} onClick={() => setReason(rc)}
                          style={{ padding: "11px 14px", cursor: "pointer", background: reason === rc ? "#EFF6FF" : "#fff", borderLeft: `3px solid ${reason === rc ? "#1B6CA8" : "transparent"}`, display: "flex", alignItems: "center", gap: 10 }}
                          onMouseEnter={e => { if (reason !== rc) e.currentTarget.style.background = "#F7F9FC"; }}
                          onMouseLeave={e => { if (reason !== rc) e.currentTarget.style.background = "#fff"; }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${reason === rc ? "#1B6CA8" : "#DDE3EC"}`, background: reason === rc ? "#1B6CA8" : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {reason === rc && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
                          </div>
                          <span style={{ fontSize: 13, color: reason === rc ? "#1B6CA8" : "#1A2436", fontWeight: reason === rc ? 600 : 400 }}>{rc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={FL}>Evidence Type</label>
                    <select value={evidenceType} onChange={e => setEvidenceType(e.target.value)}
                      style={{ ...inputSty, cursor: "pointer" }}>
                      <option value="">— Select evidence type —</option>
                      {EVIDENCE_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={FL}>Detailed Notes</label>
                    <textarea value={reasonNotes} onChange={e => setReasonNotes(e.target.value)}
                      placeholder="Describe the root cause in detail..."
                      rows={4}
                      style={{ ...inputSty, resize: "vertical" as const }} />
                  </div>

                  {/* Evidence Viewer */}
                  <div style={{ borderRadius: 6, border: "1px solid #E8ECF4", overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAFBFD" }}>
                      <span style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Evidence Viewer</span>
                      <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{evidenceRecords.length} record{evidenceRecords.length !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Add evidence form */}
                    <div style={{ padding: "12px 14px", borderBottom: "1px solid #EEF1F6", background: "#fff" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                        <div>
                          <label style={{ ...FL, marginBottom: 4 }}>Evidence Type</label>
                          <select value={evType} onChange={e => setEvType(e.target.value)}
                            style={{ ...inputSty, fontSize: 12 }}>
                            <option value="">— Select type —</option>
                            {EVIDENCE_TYPES.map(et => <option key={et}>{et}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ ...FL, marginBottom: 4 }}>Filename / Reference</label>
                          <input value={evFile} onChange={e => setEvFile(e.target.value)}
                            placeholder="e.g. photo.jpg or log.csv"
                            style={{ ...inputSty, fontSize: 12 }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ ...FL, marginBottom: 4 }}>Description</label>
                        <input value={evDesc} onChange={e => setEvDesc(e.target.value)}
                          placeholder="Brief description of the evidence..."
                          style={{ ...inputSty, fontSize: 12 }} />
                      </div>
                      {/* File drop zone */}
                      <div style={{ border: "2px dashed #DDE3EC", borderRadius: 4, padding: "10px 14px", textAlign: "center" as const, background: "#F8FAFC", marginBottom: 8, cursor: "pointer" }}>
                        <div style={{ fontSize: 12, color: "#9CA3AF" }}>Drop a file here or <span style={{ color: "#1B6CA8", fontWeight: 600, cursor: "pointer" }}>browse</span></div>
                        <div style={{ fontSize: 10, color: "#C0C8D4", marginTop: 3 }}>PDF, JPEG, PNG, CSV — max 10MB</div>
                      </div>
                      <button
                        onClick={() => {
                          if (!evType && !evDesc) return;
                          const id = `EV-${String(evidenceRecords.length + 1).padStart(3, "0")}`;
                          setEvidenceRecords(r => [...r, { id, type: evType || "Physical Evidence", desc: evDesc || "No description", file: evFile || undefined, addedBy: "Current User", addedAt: "2026-09-27 " + new Date().toTimeString().slice(0, 5) }]);
                          setEvType(""); setEvDesc(""); setEvFile("");
                        }}
                        style={{ padding: "7px 16px", border: "none", borderRadius: 4, background: "#1B6CA8", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "Inter", fontWeight: 600 }}>
                        + Add Evidence
                      </button>
                    </div>

                    {/* Evidence list */}
                    {evidenceRecords.length > 0 ? evidenceRecords.map((ev, i, arr) => {
                      const typeColor: Record<string, { bg: string; color: string }> = {
                        "Physical Evidence": { bg: "#E8F5E9", color: "#2E7D32" },
                        "System Logs": { bg: "#EFF6FF", color: "#1B6CA8" },
                        "Witness Account": { bg: "#FFF3E0", color: "#E65100" },
                        "CCTV / Footage": { bg: "#F3E5F5", color: "#7B1FA2" },
                        "No Evidence": { bg: "#F5F5F5", color: "#9CA3AF" },
                      };
                      const tc = typeColor[ev.type] ?? { bg: "#F0F3F7", color: "#6B7280" };
                      return (
                        <div key={ev.id} style={{ padding: "11px 14px", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{ev.id}</span>
                              <span style={{ fontSize: 10, padding: "1px 7px", background: tc.bg, color: tc.color, fontWeight: 700 }}>{ev.type}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#1A2436", marginBottom: 3 }}>{ev.desc}</div>
                            {ev.file && (
                              <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#1B6CA8", display: "flex", alignItems: "center", gap: 4 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                                {ev.file}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                            <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{ev.addedAt}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>by {ev.addedBy}</div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{ padding: "16px 14px", fontSize: 12, color: "#9CA3AF", textAlign: "center" as const }}>No evidence records added yet.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 7: Approval ── */}
              {drawerStep === 7 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Summary card */}
                  <div style={{ borderRadius: 6, border: "1px solid #E8ECF4", background: "#FAFBFD" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEF1F6", fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Investigation Summary</div>
                    <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        ["Case ID", activeCase?.id ?? "New"],
                        ["Drug", activeCase?.drugName ?? currentDrug?.name],
                        ["System Qty", String(activeCase?.systemQty ?? sysQty)],
                        ["Physical Qty", String((activeCase?.physicalQty ?? physQty) || "—")],
                        ["Variance", activeCase ? (activeCase.variance > 0 ? `+${activeCase.variance}` : String(activeCase.variance)) : liveVariance !== null ? (liveVariance > 0 ? `+${liveVariance}` : String(liveVariance)) : "—"],
                        ["Priority", activeCase?.priority ?? priority],
                        ["Reported By", activeCase?.reportedBy ?? reportedBy],
                        ["Assigned To", (activeCase?.assignedTo ?? assignedTo) || "Unassigned"],
                        ["Root Cause", reason || "—"],
                        ["Evidence", evidenceType || "—"],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
                          <div style={{ fontSize: 13, color: "#1A2436", fontFamily: k === "Variance" || k === "System Qty" || k === "Physical Qty" ? "JetBrains Mono" : "Inter", fontWeight: k === "Variance" ? 700 : 400 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {reasonNotes && (
                      <div style={{ padding: "0 14px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Notes</div>
                        <div style={{ fontSize: 13, color: "#6B7280", fontStyle: "italic" }}>{reasonNotes}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={FL}>Approver Name</label>
                    <input value={approverName} onChange={e => setApproverName(e.target.value)}
                      placeholder="Manager / Pharmacist name"
                      style={inputSty} />
                  </div>
                  <div>
                    <label style={FL}>Approval Notes</label>
                    <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)}
                      placeholder="Comments for the approval decision..."
                      rows={3}
                      style={{ ...inputSty, resize: "vertical" as const }} />
                  </div>
                  <div style={{ padding: "12px 16px", background: "#FFFDE7", border: "1px solid #FFF176", fontSize: 13, color: "#F57F17" }}>
                    Use the Approve or Reject buttons below to finalise this investigation.
                  </div>
                </div>
              )}

              {/* ── Step 8: Adjustment ── */}
              {drawerStep === 8 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {(activeCase?.status === "Adjusted") ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ padding: "16px 18px", background: "#E8F5E9", border: "1px solid #A5D6A7", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 20, color: "#2E7D32" }}>✓</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#2E7D32" }}>Adjustment Posted</div>
                          <div style={{ fontSize: 12, color: "#388E3C", marginTop: 2 }}>Reference: <span style={{ fontFamily: "JetBrains Mono" }}>{activeCase.adjustmentRef}</span></div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[
                          ["Adjustment Ref", activeCase.adjustmentRef ?? "—"],
                          ["Drug", activeCase.drugName],
                          ["Qty Change", activeCase.variance > 0 ? `+${activeCase.variance}` : String(activeCase.variance)],
                          ["Reason", activeCase.reason ?? "—"],
                        ].map(([k, v]) => (
                          <div key={k} style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #E8ECF4", background: "#fff" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                            <div style={{ fontSize: 13, color: "#1A2436", fontFamily: k === "Qty Change" || k === "Adjustment Ref" ? "JetBrains Mono" : "Inter", fontWeight: k === "Qty Change" ? 700 : 400 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : activeCase?.status === "Rejected" ? (
                    <div style={{ padding: "16px 18px", background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#C62828", fontSize: 13 }}>
                      This investigation was rejected. No adjustment will be posted.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 13, color: "#1B6CA8" }}>
                        Review the pre-filled adjustment details and click Post Adjustment to reconcile the stock.
                      </div>
                      {[
                        { label: "Drug / Item", value: activeCase?.drugName ?? currentDrug?.name, readOnly: true },
                        { label: "Adjustment Type", value: "Stock Count", readOnly: true },
                        { label: "Qty Change", value: activeCase ? (activeCase.variance > 0 ? `+${activeCase.variance}` : String(activeCase.variance)) : liveVariance !== null ? (liveVariance > 0 ? `+${liveVariance}` : String(liveVariance)) : "", readOnly: true },
                        { label: "Reason", value: reason || activeCase?.reason || "—", readOnly: true },
                        { label: "Reference #", value: `INV-ADJ-${activeCase?.id ?? "NEW"}`, readOnly: false },
                      ].map(f => (
                        <div key={f.label}>
                          <label style={FL}>{f.label}</label>
                          <input value={f.value} readOnly={f.readOnly}
                            style={{ ...inputSty, background: f.readOnly ? "#F8FAFC" : "#fff", color: f.readOnly ? "#6B7280" : "#1A2436", cursor: f.readOnly ? "not-allowed" : "text" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: "14px 22px", borderTop: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <button onClick={prevStep} disabled={drawerStep === 1}
                style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: drawerStep === 1 ? "#F9FAFB" : "#fff", fontSize: 13, cursor: drawerStep === 1 ? "default" : "pointer", color: drawerStep === 1 ? "#D1D5DB" : "#1A2436", fontFamily: "Inter" }}>
                ← Back
              </button>
              <button onClick={closeDrawer}
                style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
                {activeCase?.status === "Adjusted" || activeCase?.status === "Rejected" ? "Close" : "Save Draft"}
              </button>
              {drawerStep < 7 && (
                <button onClick={nextStep}
                  style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  Next →
                </button>
              )}
              {drawerStep === 7 && activeCase?.status !== "Approved" && activeCase?.status !== "Rejected" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleReject}
                    style={{ padding: "9px 18px", border: "1px solid #FFCDD2", background: "#FFEBEE", fontSize: 13, cursor: "pointer", color: "#C62828", fontFamily: "Inter", fontWeight: 600 }}>
                    Reject
                  </button>
                  <button onClick={handleApprove}
                    style={{ padding: "9px 22px", border: "none", background: "#2E7D32", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                    Approve
                  </button>
                </div>
              )}
              {drawerStep === 8 && activeCase?.status !== "Adjusted" && activeCase?.status !== "Rejected" && (
                <button onClick={handlePostAdjustment}
                  style={{ padding: "9px 22px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                  Post Adjustment
                </button>
              )}
            </div>
          </aside>
        </>
      )}
      {/* Audit Trail Modal */}
      {showAuditReplay && (() => {
        const visibleEvents = AUDIT_TRAIL.slice(0, replayIdx + 1);
        const EVENT_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
          "opened":     { bg: "#EFF6FF", color: "#1B6CA8", icon: "+" },
          "progressed": { bg: "#E8F5E9", color: "#2E7D32", icon: "→" },
          "decision":   { bg: "#FFF3E0", color: "#E65100", icon: "!" },
          "evidence":   { bg: "#F3E5F5", color: "#7B1FA2", icon: "#" },
          "adjusted":   { bg: "#E8F5E9", color: "#1B6CA8", icon: "✓" },
          "closed":     { bg: "#F0F3F7", color: "#6B7280", icon: "■" },
        };
        const caseSummary: Record<string, typeof visibleEvents> = {};
        visibleEvents.forEach(e => {
          if (!caseSummary[e.caseId]) caseSummary[e.caseId] = [];
          caseSummary[e.caseId].push(e);
        });
        return (
          <>
            <div onClick={() => { setShowAuditReplay(false); setReplayRunning(false); }}
              style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.6)", zIndex: 200 }} />
            <div style={{ position: "fixed", top: "5%", left: "50%", transform: "translateX(-50%)", width: "min(900px, 92vw)", maxHeight: "88vh", background: "#fff", borderRadius: 8, border: "1px solid #DDE3EC", zIndex: 201, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Modal header */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B6CA8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#0C1B33" }}>Stock Audit Replay</span>
                  <span style={{ fontSize: 11, padding: "1px 7px", background: "#EFF6FF", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontWeight: 700 }}>{AUDIT_TRAIL.length} events</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => { setReplayIdx(0); setReplayRunning(false); }}
                    style={{ padding: "5px 10px", border: "1px solid #DDE3EC", borderRadius: 4, background: "#F8FAFC", fontSize: 11, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
                    Reset
                  </button>
                  <button onClick={() => setReplayRunning(v => !v)}
                    style={{ padding: "5px 14px", border: "none", borderRadius: 4, background: replayRunning ? "#E65100" : "#1B6CA8", fontSize: 11, cursor: "pointer", color: "#fff", fontWeight: 700, minWidth: 60, fontFamily: "Inter" }}>
                    {replayRunning ? "Pause" : replayIdx === AUDIT_TRAIL.length - 1 ? "Replay" : "Play"}
                  </button>
                  <button onClick={() => { setShowAuditReplay(false); setReplayRunning(false); }}
                    style={{ padding: "5px 9px", border: "1px solid #DDE3EC", borderRadius: 4, background: "#F8FAFC", fontSize: 16, cursor: "pointer", color: "#6B7280", lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", marginBottom: 5 }}>
                  <span>Event {replayIdx + 1} of {AUDIT_TRAIL.length}</span>
                  <span style={{ fontFamily: "JetBrains Mono" }}>{AUDIT_TRAIL[replayIdx]?.datetime}</span>
                </div>
                <div style={{ height: 4, background: "#EEF1F6", borderRadius: 2 }}>
                  <div style={{ height: 4, width: `${((replayIdx + 1) / AUDIT_TRAIL.length) * 100}%`, background: "#1B6CA8", borderRadius: 2, transition: "width 0.4s ease" }} />
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Left: Timeline feed */}
                <div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Event Timeline</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {visibleEvents.slice().reverse().map((ev, i, arr) => {
                      const es = EVENT_STYLE[ev.eventType] ?? EVENT_STYLE["opened"];
                      const isLatest = i === 0;
                      return (
                        <div key={ev.id} style={{ display: "flex", gap: 10, padding: "9px 10px", background: isLatest ? "#F0F9FF" : "transparent", borderBottom: i < arr.length - 1 ? "1px solid #F4F6FA" : "none", transition: "background 0.3s" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                            <span style={{ width: 22, height: 22, borderRadius: "50%", background: es.bg, color: es.color, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{es.icon}</span>
                            {i < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 10, background: "#EEF1F6", marginTop: 2 }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2436" }}>{ev.action}</span>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#9CA3AF", flexShrink: 0 }}>{ev.datetime.split(" ")[0]}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#1B6CA8" }}>{ev.caseId}</span>
                              {" — "}{ev.drugName}
                            </div>
                            {ev.detail && <div style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic" as const }}>{ev.detail}</div>}
                            {ev.fromStep && ev.toStep && (
                              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                                {ev.fromStep} <span style={{ color: "#00ACC1" }}>→</span> {ev.toStep}
                              </div>
                            )}
                            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>by {ev.actor}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Per-case summary */}
                <div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Case Activity Summary</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(caseSummary).map(([caseId, events]) => {
                      const last = events[events.length - 1];
                      const uniqueActors = [...new Set(events.map(e => e.actor))];
                      const hasEvidence = events.some(e => e.eventType === "evidence");
                      const hasDecision = events.some(e => e.eventType === "decision");
                      return (
                        <div key={caseId} style={{ padding: "11px 14px", border: "1px solid #E8ECF4", borderRadius: 5, background: "#FAFBFD" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <div>
                              <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, fontWeight: 700, color: "#1B6CA8" }}>{caseId}</span>
                              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{last.drugName}</div>
                            </div>
                            <span style={{ fontSize: 10, padding: "2px 7px", background: "#EFF6FF", color: "#1B6CA8", fontFamily: "JetBrains Mono", fontWeight: 700 }}>{events.length} events</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
                            Last: <span style={{ color: "#1A2436", fontWeight: 600 }}>{last.action}</span> by {last.actor}
                          </div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                            {hasEvidence && <span style={{ fontSize: 9, padding: "2px 7px", background: "#F3E5F5", color: "#7B1FA2", fontWeight: 700 }}>Evidence</span>}
                            {hasDecision && <span style={{ fontSize: 9, padding: "2px 7px", background: "#FFF3E0", color: "#E65100", fontWeight: 700 }}>Decision</span>}
                            <span style={{ fontSize: 9, padding: "2px 7px", background: "#EFF6FF", color: "#1B6CA8", fontWeight: 700 }}>{uniqueActors.length} actor{uniqueActors.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
