import { useState } from "react";
import { usePrinterSettings } from "./shared/PrinterContext";
import type { PrinterType } from "./shared/PrinterContext";

const sections = ["General", "Users & Roles", "Billing", "Notifications", "Integrations", "Printer", "Backup"];

export default function Settings() {
  const [activeSection, setActiveSection] = useState("General");
  const [saved, setSaved] = useState(false);
  const { settings: printer, updateSettings: updatePrinter } = usePrinterSettings();
  const [printerSaved, setPrinterSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [usersSortCol, setUsersSortCol] = useState<string | null>(null);
  const [usersSortDir, setUsersSortDir] = useState<"asc" | "desc">("asc");
  const handleUsersSort = (col: string) => {
    if (usersSortCol === col) setUsersSortDir(d => d === "asc" ? "desc" : "asc");
    else { setUsersSortCol(col); setUsersSortDir("asc"); }
  };

  const handlePrinterSave = () => {
    setPrinterSaved(true);
    setTimeout(() => setPrinterSaved(false), 2000);
  };

  const handleTestConnection = () => {
    setTestStatus("testing");
    setTimeout(() => {
      setTestStatus(printer.connected ? "ok" : "fail");
      setTimeout(() => setTestStatus("idle"), 3000);
    }, 1200);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const USERS = [
    { name: "Jane Doe", email: "jane.doe@citycentralpharmacy.com", role: "Head Pharmacist", login: "Today 09:12", status: "Active" },
    { name: "Mark Stevens", email: "mark.s@citycentralpharmacy.com", role: "Pharmacist", login: "Today 08:45", status: "Active" },
    { name: "Anna Kowalski", email: "anna.k@citycentralpharmacy.com", role: "Pharmacy Tech", login: "Yesterday", status: "Active" },
    { name: "Leo Pham", email: "leo.p@citycentralpharmacy.com", role: "Cashier", login: "3 days ago", status: "Active" },
    { name: "Rachel Hunt", email: "rachel.h@citycentralpharmacy.com", role: "Admin", login: "2025-07-10", status: "Inactive" },
  ];
  const sortedUsers = usersSortCol
    ? [...USERS].sort((a: any, b: any) => {
        let va = a[usersSortCol]; let vb = b[usersSortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (usersSortDir === "asc" ? -1 : 1) : va > vb ? (usersSortDir === "asc" ? 1 : -1) : 0;
      })
    : USERS;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Settings</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>System configuration</div>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "200px 1fr" }}>
        {/* Side nav */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "8px 0", height: "fit-content" }}>
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              style={{
                width: "100%", padding: "10px 18px", textAlign: "left", border: "none",
                background: activeSection === s ? "#EFF6FF" : "transparent",
                color: activeSection === s ? "#1B6CA8" : "#6B7280",
                fontSize: 13, fontFamily: "Inter", cursor: "pointer",
                borderLeft: activeSection === s ? "2px solid #1B6CA8" : "2px solid transparent",
                fontWeight: activeSection === s ? 500 : 400,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: 24 }}>
          {activeSection === "General" && (
            <div className="flex flex-col gap-6">
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#0C1B33", marginBottom: 16 }}>Pharmacy Information</div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Pharmacy Name", value: "City Central Pharmacy" },
                    { label: "License Number", value: "PH-2024-00142" },
                    { label: "Phone", value: "+1 (555) 800-4200" },
                    { label: "Email", value: "admin@citycentralpharmacy.com" },
                    { label: "Address", value: "400 Main Street, Suite 100" },
                    { label: "City / State / ZIP", value: "Chicago, IL 60601" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{f.label}</label>
                      <input
                        defaultValue={f.value}
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #DDE3EC", paddingTop: 20 }}>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#0C1B33", marginBottom: 16 }}>Tax & Pricing</div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Tax Rate (%)", value: "8.75" },
                    { label: "Default Margin (%)", value: "50" },
                    { label: "Currency", value: "USD" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{f.label}</label>
                      <input
                        defaultValue={f.value}
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #DDE3EC", paddingTop: 20 }}>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#0C1B33", marginBottom: 16 }}>System Preferences</div>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Auto-reorder when stock reaches minimum level", enabled: true },
                    { label: "Send expiry alerts 30 days before expiry date", enabled: true },
                    { label: "Require doctor verification for controlled substances", enabled: true },
                    { label: "Enable insurance billing integration", enabled: false },
                    { label: "Daily sales report via email", enabled: false },
                  ].map((pref) => (
                    <div key={pref.label} className="flex items-center justify-between" style={{ padding: "12px 16px", background: "#F8FAFC" }}>
                      <span style={{ fontSize: 13, color: "#0C1B33" }}>{pref.label}</span>
                      <Toggle defaultOn={pref.enabled} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "Users & Roles" && (
            <div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#0C1B33", marginBottom: 16 }}>Users & Access Control</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th onClick={() => handleUsersSort("name")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Name<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "name" && usersSortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "name" && usersSortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                    <th onClick={() => handleUsersSort("email")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Email<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "email" && usersSortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "email" && usersSortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                    <th onClick={() => handleUsersSort("role")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Role<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "role" && usersSortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "role" && usersSortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                    <th onClick={() => handleUsersSort("login")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Last Login<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "login" && usersSortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "login" && usersSortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                    <th onClick={() => handleUsersSort("status")} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>Status<span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "status" && usersSortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg><svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={usersSortCol === "status" && usersSortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg></span></th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((u) => (
                    <tr key={u.email} style={{ borderBottom: "1px solid #F0F3F7" }}>
                      <td style={{ padding: "11px 14px", fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{u.email}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{u.role}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{u.login}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", background: u.status === "Active" ? "#E8F5E9" : "#F5F5F5", color: u.status === "Active" ? "#2E7D32" : "#9E9E9E" }}>{u.status}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#1B6CA8", cursor: "pointer" }}>Edit</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4">
                <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff" }}>+ Invite User</button>
              </div>
            </div>
          )}

          {activeSection === "Printer" && (
            <div className="flex flex-col gap-6">
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#0C1B33", marginBottom: 4 }}>Printer Configuration</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 20 }}>Configure the printer used for invoices, receipts, labels, and returns.</div>

                {/* Printer Type */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Printer Type</label>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {(["Laser", "DOT", "Thermal"] as PrinterType[]).map((t) => {
                      const active = printer.printerType === t;
                      const icons: Record<PrinterType, string> = { Laser: "🖨️", DOT: "🖨", Thermal: "🧾" };
                      const descs: Record<PrinterType, string> = {
                        Laser: "A4 full-page — invoices & reports",
                        DOT: "A4 dot-matrix — multi-part forms",
                        Thermal: "80mm narrow — POS receipts",
                      };
                      return (
                        <button
                          key={t}
                          onClick={() => updatePrinter({ printerType: t })}
                          style={{
                            padding: "14px 20px", border: active ? "2px solid #1B6CA8" : "1.5px solid #DDE3EC",
                            background: active ? "#EFF6FF" : "#fff", cursor: "pointer", textAlign: "left",
                            minWidth: 180, transition: "all 0.15s",
                          }}
                        >
                          <div style={{ fontSize: 22, marginBottom: 6 }}>{icons[t]}</div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: active ? "#1B6CA8" : "#0C1B33" }}>{t} Printer</div>
                          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{descs[t]}</div>
                          {active && <div style={{ fontSize: 10, color: "#1B6CA8", fontWeight: 700, marginTop: 6, letterSpacing: "0.05em" }}>● SELECTED</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Printer Name */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Printer Name / Model</label>
                  <input
                    value={printer.printerName}
                    onChange={(e) => updatePrinter({ printerName: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box", maxWidth: 380 }}
                  />
                </div>

                {/* Enable / Disable */}
                <div style={{ padding: "14px 16px", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, border: "1px solid #EEF1F6" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>Enable Printer</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Allow the system to send print jobs to this printer.</div>
                  </div>
                  <Toggle defaultOn={printer.enabled} onChange={(v) => updatePrinter({ enabled: v })} />
                </div>

                {/* Connected toggle */}
                <div style={{ padding: "14px 16px", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, border: "1px solid #EEF1F6" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>Printer Connected</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Mark as connected when printer cable/network is active.</div>
                  </div>
                  <Toggle defaultOn={printer.connected} onChange={(v) => updatePrinter({ connected: v })} />
                </div>

                {/* Status summary */}
                <div style={{ padding: "12px 16px", border: "1px solid #DDE3EC", background: "#fff", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Current Printer Status</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: printer.printerType === "Laser" ? "#EFF6FF" : printer.printerType === "DOT" ? "#F0FDF4" : "#FFF7ED", color: printer.printerType === "Laser" ? "#1B6CA8" : printer.printerType === "DOT" ? "#15803D" : "#C2410C", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {printer.printerType}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: printer.enabled ? "#E8F5E9" : "#FEF2F2", color: printer.enabled ? "#2E7D32" : "#C62828", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {printer.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: printer.connected ? "#E8F5E9" : "#FEF2F2", color: printer.connected ? "#2E7D32" : "#C62828", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {printer.connected ? "● Connected" : "○ Disconnected"}
                    </span>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{printer.printerName}</span>
                  </div>
                </div>

                {/* Test connection button */}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    onClick={handleTestConnection}
                    disabled={testStatus === "testing"}
                    style={{ padding: "8px 18px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: testStatus === "testing" ? "not-allowed" : "pointer", color: "#0C1B33", fontFamily: "Inter" }}
                  >
                    {testStatus === "testing" ? "Testing…" : "Test Connection"}
                  </button>
                  {testStatus === "ok" && <span style={{ fontSize: 12, color: "#2E7D32", fontWeight: 600 }}>✓ Printer responded successfully</span>}
                  {testStatus === "fail" && <span style={{ fontSize: 12, color: "#C62828", fontWeight: 600 }}>✗ Printer not responding — check cable/network</span>}
                </div>
              </div>

              {/* Save bar */}
              <div className="flex justify-end mt-2 gap-3" style={{ borderTop: "1px solid #DDE3EC", paddingTop: 20 }}>
                <button style={{ padding: "9px 20px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Discard</button>
                <button
                  onClick={handlePrinterSave}
                  style={{ padding: "9px 24px", border: "none", background: printerSaved ? "#2E7D32" : "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600, transition: "background 0.2s" }}
                >
                  {printerSaved ? "✓ Saved!" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {!["General", "Users & Roles", "Printer"].includes(activeSection) && (
            <div style={{ padding: 60, textAlign: "center", color: "#9CA3AF" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚙</div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, color: "#6B7280" }}>{activeSection} settings coming soon</div>
            </div>
          )}

          {activeSection === "General" && (
            <div className="flex justify-end mt-6 gap-3" style={{ borderTop: "1px solid #DDE3EC", paddingTop: 20 }}>
              <button style={{ padding: "9px 20px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Discard</button>
              <button
                onClick={handleSave}
                style={{ padding: "9px 24px", border: "none", background: saved ? "#2E7D32" : "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600, transition: "background 0.2s" }}
              >
                {saved ? "✓ Saved!" : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ defaultOn, onChange }: { defaultOn: boolean; onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => { setOn(!on); onChange?.(!on); }}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
        background: on ? "#1B6CA8" : "#DDE3EC", position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: on ? 21 : 3, width: 16, height: 16,
          borderRadius: "50%", background: "#fff", transition: "left 0.2s",
        }}
      />
    </button>
  );
}
