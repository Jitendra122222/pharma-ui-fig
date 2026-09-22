import { useState } from "react";
import { Th } from "../shared/Th";
import { providers } from "./insuranceData";

export default function SubmitClaim() {
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
