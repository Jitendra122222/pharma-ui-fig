import { useState } from "react";
import { providers } from "./insuranceData";

export default function Eligibility() {
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
