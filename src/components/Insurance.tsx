import { useState } from "react";

type SubTab = "claims" | "submit" | "providers" | "eligibility";

const TABS: { id: SubTab; label: string }[] = [
  { id: "claims", label: "Claims" },
  { id: "submit", label: "Submit Claim" },
  { id: "providers", label: "Providers" },
  { id: "eligibility", label: "Eligibility Check" },
];

function Th({ children, right, center, sortDir, onSort }: { children: React.ReactNode; right?: boolean; center?: boolean; sortDir?: "asc" | "desc" | null; onSort?: () => void; }) {
  return (
    <th onClick={onSort} style={{ padding: "10px 14px", textAlign: right ? "right" : center ? "center" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #EEF1F6", whiteSpace: "nowrap", background: "#FAFBFD", cursor: onSort ? "pointer" : "default", userSelect: onSort ? "none" : "auto" }}>
      {onSort ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {children}
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, lineHeight: 1 }}>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
            <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
          </span>
        </span>
      ) : children}
    </th>
  );
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", color, background: bg, whiteSpace: "nowrap" }}>{label}</span>;
}

const claims = [
  { id: "CLM-2025-0088", patient: "Margaret Thompson", patientId: "P-001", provider: "BlueCross BlueShield", invoice: "SINV-2025-0221", rx: "RX-20250728-001", date: "2025-07-28", submitted: "2025-07-28", amount: 20.28, approved: 16.22, copay: 4.06, status: "Approved" },
  { id: "CLM-2025-0087", patient: "David Okafor", patientId: "P-004", provider: "Aetna", invoice: "SINV-2025-0220", rx: "RX-20250727-001", date: "2025-07-27", submitted: "2025-07-27", amount: 37.85, approved: 0, copay: 0, status: "Pending" },
  { id: "CLM-2025-0086", patient: "James Whitfield", patientId: "P-006", provider: "Medicare Part D", invoice: "SINV-2025-0218", rx: "RX-20250726-001", date: "2025-07-26", submitted: "2025-07-26", amount: 18.16, approved: 9.08, copay: 9.08, status: "Partial" },
  { id: "CLM-2025-0085", patient: "Robert Kiefer", patientId: "P-002", provider: "UnitedHealthcare", invoice: "SINV-2025-0214", rx: "RX-20250722-002", date: "2025-07-22", submitted: "2025-07-22", amount: 19.20, approved: 0, copay: 0, status: "Rejected" },
  { id: "CLM-2025-0084", patient: "Sofia Lindqvist", patientId: "P-007", provider: "Cigna", invoice: "SINV-2025-0215", rx: "RX-20250723-001", date: "2025-07-23", submitted: "2025-07-23", amount: 18.63, approved: 18.63, copay: 0, status: "Paid" },
  { id: "CLM-2025-0083", patient: "Marcus Adeyemi", patientId: "P-008", provider: "BlueCross BlueShield", invoice: "SINV-2025-0212", rx: "RX-20250720-001", date: "2025-07-20", submitted: "2025-07-20", amount: 26.40, approved: 26.40, copay: 0, status: "Paid" },
];

const providers = [
  { id: "INS-001", name: "BlueCross BlueShield", type: "Private", contracts: 142, claimsThisMonth: 28, paidAmt: 842.20, avgDays: 3.2, status: "Active" },
  { id: "INS-002", name: "Aetna", type: "Private", contracts: 98, claimsThisMonth: 15, paidAmt: 620.00, avgDays: 4.1, status: "Active" },
  { id: "INS-003", name: "UnitedHealthcare", type: "Private", contracts: 76, claimsThisMonth: 12, paidAmt: 441.80, avgDays: 5.5, status: "Active" },
  { id: "INS-004", name: "Medicare Part D", type: "Government", contracts: 210, claimsThisMonth: 42, paidAmt: 1820.40, avgDays: 6.8, status: "Active" },
  { id: "INS-005", name: "Medicaid", type: "Government", contracts: 88, claimsThisMonth: 18, paidAmt: 540.00, avgDays: 8.2, status: "Active" },
  { id: "INS-006", name: "Cigna", type: "Private", contracts: 54, claimsThisMonth: 9, paidAmt: 318.90, avgDays: 3.8, status: "Active" },
];

// ─── Claims ───────────────────────────────────────────────────────────────────

function Claims() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const filtered = claims.filter(c =>
    (c.patient.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === "All" || c.status === statusFilter)
  );

  const sortedRows = sortCol
    ? [...filtered].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : filtered;
  const totalClaimed = claims.reduce((s, c) => s + c.amount, 0);
  const totalApproved = claims.reduce((s, c) => s + c.approved, 0);
  const totalPending = claims.filter(c => c.status === "Pending").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Claimed", value: `₹${totalClaimed.toFixed(2)}`, color: "#1B6CA8" },
          { label: "Approved / Paid", value: `₹${totalApproved.toFixed(2)}`, color: "#2E7D32" },
          { label: "Pending Review", value: `₹${totalPending.toFixed(2)}`, color: "#F57F17" },
          { label: "Rejection Rate", value: `${((claims.filter(c => c.status === "Rejected").length / claims.length) * 100).toFixed(0)}%`, color: "#C62828" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E8ECF4", borderTop: `3px solid ${k.color}`, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "Outfit", fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 10 }}>
          <input type="text" placeholder="Search by patient or claim ID..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter" }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff" }}>
            {["All", "Pending", "Approved", "Partial", "Paid", "Rejected"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Claim #</Th>
            <Th onSort={() => handleSort("patient")} sortDir={sortCol === "patient" ? sortDir : null}>Patient</Th>
            <Th onSort={() => handleSort("provider")} sortDir={sortCol === "provider" ? sortDir : null}>Provider</Th>
            <Th onSort={() => handleSort("invoice")} sortDir={sortCol === "invoice" ? sortDir : null}>Invoice</Th>
            <Th onSort={() => handleSort("rx")} sortDir={sortCol === "rx" ? sortDir : null}>Rx Ref</Th>
            <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
            <Th onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Billed</Th>
            <Th onSort={() => handleSort("approved")} sortDir={sortCol === "approved" ? sortDir : null}>Approved</Th>
            <Th onSort={() => handleSort("copay")} sortDir={sortCol === "copay" ? sortDir : null}>Copay</Th>
            <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(c => {
              const st = { Approved: { bg: "#E8F5E9", color: "#2E7D32" }, Paid: { bg: "#E8F5E9", color: "#2E7D32" }, Pending: { bg: "#FFF8E1", color: "#F57F17" }, Partial: { bg: "#E3F2FD", color: "#1B6CA8" }, Rejected: { bg: "#FFEBEE", color: "#C62828" } }[c.status] ?? { bg: "#F5F5F5", color: "#9E9E9E" };
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{c.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436", whiteSpace: "nowrap" }}>{c.patient}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>{c.provider}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{c.invoice}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{c.rx}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.date}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#1A2436" }}>₹{c.amount.toFixed(2)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: "#2E7D32" }}>{c.approved > 0 ? `₹${c.approved.toFixed(2)}` : "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: c.copay > 0 ? "#E65100" : "#9CA3AF" }}>{c.copay > 0 ? `₹${c.copay.toFixed(2)}` : "—"}</td>
                  <td style={{ padding: "11px 14px" }}><Pill label={c.status} bg={st.bg} color={st.color} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Submit Claim ─────────────────────────────────────────────────────────────

function SubmitClaim() {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return (
    <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
      <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>Claim Submitted</div>
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>CLM-2025-0089 submitted to BlueCross BlueShield · Awaiting response</div>
      <div className="flex gap-3 justify-center">
        <button onClick={() => setSubmitted(false)} style={{ padding: "9px 20px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436" }}>New Claim</button>
        <button style={{ padding: "9px 20px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff" }}>View Claims</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 22 }}>
        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436", marginBottom: 16 }}>Claim Information</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Patient", type: "select", opts: ["Margaret Thompson (P-001)", "Robert Kiefer (P-002)", "David Okafor (P-004)", "James Whitfield (P-006)"] },
            { label: "Insurance Provider", type: "select", opts: providers.map(p => p.name) },
            { label: "Member ID / Policy #", type: "text", ph: "e.g. BCB-1234567890" },
            { label: "Group #", type: "text", ph: "e.g. GRP-88420" },
            { label: "Rx / Prescription", type: "select", opts: ["RX-20250728-001", "RX-20250727-001", "RX-20250727-002"] },
            { label: "Invoice Reference", type: "select", opts: ["SINV-2025-0221", "SINV-2025-0220", "SINV-2025-0219"] },
            { label: "Date of Service", type: "date", val: "2025-07-28" },
            { label: "Prescribing Doctor NPI", type: "text", ph: "10-digit NPI number" },
            { label: "Diagnosis Code (ICD-10)", type: "text", ph: "e.g. J06.9" },
          ].map((f: any) => (
            <div key={f.label}>
              <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{f.label}</label>
              {f.type === "select" ? (
                <select style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}>
                  <option value="">— Select —</option>
                  {f.opts.map((o: string) => <option key={o}>{o}</option>)}
                </select>
              ) : f.type === "date" ? (
                <input type="date" defaultValue={f.val} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              ) : (
                <input type="text" placeholder={f.ph} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 22 }}>
        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436", marginBottom: 16 }}>Drug Details</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <thead><tr>{["NDC Code", "Drug Name", "Qty", "Days Supply", "DAW Code", "Amount Billed", "Copay"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #F4F6FA" }}>
              {["0093-0058-01", "Amoxicillin 500mg Caps", "21", "7", "0 - No substitution", "₹17.85", "₹3.00"].map((v, i) => (
                <td key={i} style={{ padding: "8px 14px" }}>
                  <input defaultValue={v} style={{ width: "100%", padding: "7px 10px", border: "1px solid #E8ECF4", fontSize: 12, outline: "none", fontFamily: i <= 1 ? "JetBrains Mono" : "Inter" }} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 14px", fontSize: 12, color: "#92400E", marginBottom: 16 }}>
          ⚠ Verify patient eligibility before submitting. Incorrect claims may result in rejection and delays.
        </div>
        <div className="flex justify-end gap-3">
          <button style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Check Eligibility</button>
          <button style={{ padding: "9px 18px", border: "1px solid #E8ECF4", background: "#fff", fontSize: 13, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Save Draft</button>
          <button onClick={() => setSubmitted(true)} style={{ padding: "9px 24px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Submit Claim</button>
        </div>
      </div>
    </div>
  );
}

// ─── Providers ────────────────────────────────────────────────────────────────

function Providers() {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortedRows = sortCol
    ? [...providers].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : providers;
  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Insurance Providers</div>
          <button style={{ padding: "7px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Add Provider</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>ID</Th>
            <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Provider Name</Th>
            <Th onSort={() => handleSort("type")} sortDir={sortCol === "type" ? sortDir : null}>Type</Th>
            <Th onSort={() => handleSort("contracts")} sortDir={sortCol === "contracts" ? sortDir : null}>Active Contracts</Th>
            <Th onSort={() => handleSort("claimsThisMonth")} sortDir={sortCol === "claimsThisMonth" ? sortDir : null}>Claims This Month</Th>
            <Th onSort={() => handleSort("paidAmt")} sortDir={sortCol === "paidAmt" ? sortDir : null}>Paid Amount</Th>
            <Th onSort={() => handleSort("avgDays")} sortDir={sortCol === "avgDays" ? sortDir : null}>Avg Turnaround</Th>
            <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
          </tr></thead>
          <tbody>
            {sortedRows.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F4F6FA", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F7F9FC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{p.id}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{p.name}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: p.type === "Government" ? "#E3F2FD" : "#F0F0F0", color: p.type === "Government" ? "#1B6CA8" : "#6B7280" }}>{p.type}</span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436" }}>{p.contracts}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", textAlign: "right", color: "#1A2436" }}>{p.claimsThisMonth}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 700, textAlign: "right", color: "#2E7D32" }}>₹{p.paidAmt.toFixed(2)}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", color: p.avgDays > 6 ? "#E65100" : "#6B7280" }}>{p.avgDays}d</td>
                <td style={{ padding: "12px 14px" }}><Pill label={p.status} bg="#E8F5E9" color="#2E7D32" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Eligibility ──────────────────────────────────────────────────────────────

function Eligibility() {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 22 }}>
        <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436", marginBottom: 16 }}>Patient Eligibility Check</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Insurance Provider", type: "select", opts: providers.map(p => p.name) },
            { label: "Member ID", type: "text", ph: "e.g. BCB-1234567890" },
            { label: "Date of Service", type: "date", val: "2025-07-28" },
            { label: "Patient First Name", type: "text", ph: "First name" },
            { label: "Patient Last Name", type: "text", ph: "Last name" },
            { label: "Date of Birth", type: "date", val: "1958-03-14" },
          ].map((f: any) => (
            <div key={f.label}>
              <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{f.label}</label>
              {f.type === "select" ? (
                <select style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff", boxSizing: "border-box" as const }}>
                  {f.opts.map((o: string) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type} defaultValue={f.val} placeholder={f.ph} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" as const }} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setChecked(true)} style={{ padding: "9px 24px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>Check Eligibility</button>
        </div>
      </div>

      {checked && (
        <div style={{ background: "#fff", border: "2px solid #2E7D32", padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✓</div>
            <div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#2E7D32" }}>Patient Eligible</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>Real-time verification via BlueCross BlueShield · 28 Jul 2025 14:32</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Member Name", value: "Margaret A. Thompson" },
              { label: "Member ID", value: "BCB-1234567890" },
              { label: "Group #", value: "GRP-88420" },
              { label: "Plan Name", value: "BlueCross PPO Gold" },
              { label: "Coverage Effective", value: "2025-01-01" },
              { label: "Coverage Ends", value: "2025-12-31" },
              { label: "Rx Coverage", value: "Tier 1–3 Covered" },
              { label: "Generic Copay", value: "₹5.00" },
              { label: "Brand Copay", value: "₹30.00" },
              { label: "Deductible", value: "₹500 / ₹500 met" },
              { label: "OOP Maximum", value: "₹2,000 / ₹420 met" },
              { label: "Prior Auth Required", value: "No" },
            ].map(r => (
              <div key={r.label} style={{ background: "#F8FFFE", padding: "10px 14px", border: "1px solid #C8E6C9" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: "#1A2436", fontWeight: 600 }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Insurance() {
  const [tab, setTab] = useState<SubTab>("claims");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#1A2436", margin: 0, letterSpacing: "-0.02em" }}>Insurance & Claims</h1>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Claims management · Provider contracts · Eligibility verification</div>
      </div>
      <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "10px 22px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "Inter", fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#1B6CA8" : "#9CA3AF", borderBottom: tab === t.id ? "2px solid #1B6CA8" : "2px solid transparent", marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "claims" && <Claims />}
      {tab === "submit" && <SubmitClaim />}
      {tab === "providers" && <Providers />}
      {tab === "eligibility" && <Eligibility />}
    </div>
  );
}
