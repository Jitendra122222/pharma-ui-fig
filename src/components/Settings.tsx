import { useState } from "react";
import { S } from "../styles/common";
import { ST } from "../styles/settings";
import { usePrinterSettings } from "./shared/PrinterContext";
import type { PrinterType } from "./shared/PrinterContext";
import type { StorageType } from "./stock/stockData";

const sections = ["General", "Users & Roles", "Billing", "Notifications", "Integrations", "Printer", "Storage & Location", "Backup"];

interface SettingsProps {
  storageType: StorageType;
  onStorageTypeChange: (t: StorageType) => void;
}

export default function Settings({ storageType, onStorageTypeChange }: SettingsProps) {
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

  const [localStorageType, setLocalStorageType] = useState<StorageType>(storageType);
  const [storageSaved, setStorageSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleStorageSave = () => {
    onStorageTypeChange(localStorageType);
    setStorageSaved(true);
    setTimeout(() => setStorageSaved(false), 2000);
  };

  const STORAGE_OPTIONS: { id: StorageType; label: string; desc: string; detail: string }[] = [
    { id: "alphabetical", label: "Alphabetical", desc: "A → Z by product name", detail: "Bins are assigned based on the first letter of the drug name. Easy to find any product without memorising shelf codes." },
    { id: "company",      label: "By Company",   desc: "Grouped by manufacturer", detail: "All products from the same manufacturer are stored together. Ideal when you receive stock from a small set of suppliers." },
    { id: "category",     label: "By Category",  desc: "Grouped by drug category", detail: "Antibiotics, Antidiabetics, etc. share bins. Best when staff think in therapeutic categories." },
    { id: "custom",       label: "Custom / Manual", desc: "You assign each bin yourself", detail: "No automatic suggestion. You choose the target bin every time you move or receive stock. Full manual control." },
  ];

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
          <h1 style={S.pageTitle}>Settings</h1>
          <div style={{ ...S.mutedText, marginTop: 2 }}>System configuration</div>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "200px 1fr" }}>
        {/* Side nav */}
        <div style={ST.sideNav}>
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              style={ST.navBtn(activeSection === s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={ST.contentCard}>
          {activeSection === "General" && (
            <div className="flex flex-col gap-6">
              <div>
                <div style={ST.sectionTitle}>Pharmacy Information</div>
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
                      <label style={ST.formLabel}>{f.label}</label>
                      <input
                        defaultValue={f.value}
                        style={ST.formInput}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={ST.saveBar}>
                <div style={ST.sectionTitle}>Tax & Pricing</div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Tax Rate (%)", value: "8.75" },
                    { label: "Default Margin (%)", value: "50" },
                    { label: "Currency", value: "USD" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label style={ST.formLabel}>{f.label}</label>
                      <input
                        defaultValue={f.value}
                        style={ST.formInput}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={ST.saveBar}>
                <div style={ST.sectionTitle}>System Preferences</div>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Auto-reorder when stock reaches minimum level", enabled: true },
                    { label: "Send expiry alerts 30 days before expiry date", enabled: true },
                    { label: "Require doctor verification for controlled substances", enabled: true },
                    { label: "Enable insurance billing integration", enabled: false },
                    { label: "Daily sales report via email", enabled: false },
                  ].map((pref) => (
                    <div key={pref.label} className="flex items-center justify-between" style={ST.prefRow}>
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
              <div style={ST.sectionTitle}>Users & Access Control</div>
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
                      <td style={ST.tdName}>{u.name}</td>
                      <td style={ST.tdMuted}>{u.email}</td>
                      <td style={ST.tdMuted}>{u.role}</td>
                      <td style={ST.tdMuted}>{u.login}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", background: u.status === "Active" ? "#E8F5E9" : "#F5F5F5", color: u.status === "Active" ? "#2E7D32" : "#9E9E9E" }}>{u.status}</span>
                      </td>
                      <td style={ST.tdEdit}>Edit</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4">
                <button style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff" }}>+ Invite User</button>
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
                  <label style={ST.formLabel}>Printer Name / Model</label>
                  <input
                    value={printer.printerName}
                    onChange={(e) => updatePrinter({ printerName: e.target.value })}
                    style={{ ...ST.formInput, maxWidth: 380 }}
                  />
                </div>

                {/* Enable / Disable */}
                <div style={{ ...ST.printerToggleRow, marginBottom: 12 }}>
                  <div>
                    <div style={ST.printerToggleTitle}>Enable Printer</div>
                    <div style={ST.printerToggleSub}>Allow the system to send print jobs to this printer.</div>
                  </div>
                  <Toggle defaultOn={printer.enabled} onChange={(v) => updatePrinter({ enabled: v })} />
                </div>

                {/* Connected toggle */}
                <div style={{ ...ST.printerToggleRow, marginBottom: 20 }}>
                  <div>
                    <div style={ST.printerToggleTitle}>Printer Connected</div>
                    <div style={ST.printerToggleSub}>Mark as connected when printer cable/network is active.</div>
                  </div>
                  <Toggle defaultOn={printer.connected} onChange={(v) => updatePrinter({ connected: v })} />
                </div>

                {/* Status summary */}
                <div style={ST.statusBox}>
                  <div style={ST.statusBoxLabel}>Current Printer Status</div>
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
                    style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: testStatus === "testing" ? "not-allowed" : "pointer", color: "#0C1B33", fontFamily: "Inter" }}
                  >
                    {testStatus === "testing" ? "Testing…" : "Test Connection"}
                  </button>
                  {testStatus === "ok" && <span style={{ fontSize: 12, color: "#2E7D32", fontWeight: 600 }}>✓ Printer responded successfully</span>}
                  {testStatus === "fail" && <span style={{ fontSize: 12, color: "#C62828", fontWeight: 600 }}>✗ Printer not responding — check cable/network</span>}
                </div>
              </div>

              {/* Save bar */}
              <div className="flex justify-end mt-2 gap-3" style={ST.saveBar}>
                <button style={{ padding: "9px 20px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Discard</button>
                <button
                  onClick={handlePrinterSave}
                  style={{ padding: "9px 24px", border: "none", background: printerSaved ? "#2E7D32" : "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600, transition: "background 0.2s" }}
                >
                  {printerSaved ? "✓ Saved!" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeSection === "Storage & Location" && (
            <div className="flex flex-col gap-6">
              <div>
                <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600, color: "#0C1B33", marginBottom: 4 }}>Storage Organisation Type</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>
                  This setting controls how the system suggests bin locations when you move or receive stock.
                  Applied pharmacy-wide — set it once and the Locations tab uses it automatically.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {STORAGE_OPTIONS.map(opt => {
                  const active = localStorageType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setLocalStorageType(opt.id)}
                      style={{
                        textAlign: "left", padding: "16px 18px", borderRadius: 8, cursor: "pointer",
                        border: active ? "2px solid #1B6CA8" : "1.5px solid #DDE3EC",
                        background: active ? "#EFF6FF" : "#fff",
                        transition: "border 0.15s, background 0.15s",
                        display: "flex", flexDirection: "column", gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", border: active ? "5px solid #1B6CA8" : "2px solid #DDE3EC",
                          background: active ? "#fff" : "#F8FAFC", display: "inline-block", flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#1B6CA8" : "#0C1B33", fontFamily: "Inter" }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" }}>{opt.desc}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Inter", lineHeight: 1.5, paddingLeft: 28 }}>{opt.detail}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", borderRadius: 6, padding: "12px 16px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>
                <span style={{ fontWeight: 600, color: "#1A2436" }}>Current setting: </span>
                {STORAGE_OPTIONS.find(o => o.id === storageType)?.label ?? storageType}
                {localStorageType !== storageType && (
                  <span style={{ marginLeft: 8, color: "#E65100", fontWeight: 600 }}>
                    {" "}&rarr; will change to {STORAGE_OPTIONS.find(o => o.id === localStorageType)?.label}
                  </span>
                )}
              </div>

              <div style={{ background: "#FFF3E0", border: "1px solid #FFB74D", borderRadius: 6, padding: "10px 16px", fontSize: 12, color: "#E65100", fontFamily: "Inter" }}>
                Changing storage type affects bin suggestions in the Locations tab. Existing stock placement is not moved automatically.
              </div>

              <div className="flex justify-end gap-3" style={ST.saveBar}>
                <button
                  onClick={() => setLocalStorageType(storageType)}
                  style={{ padding: "9px 20px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}
                >
                  Discard
                </button>
                <button
                  onClick={handleStorageSave}
                  disabled={localStorageType === storageType}
                  style={{
                    padding: "9px 24px", border: "none", borderRadius: 6, fontSize: 13,
                    cursor: localStorageType === storageType ? "default" : "pointer",
                    fontWeight: 600, color: "#fff", transition: "background 0.2s",
                    background: storageSaved ? "#2E7D32" : localStorageType === storageType ? "#A0AEC0" : "#1B6CA8",
                  }}
                >
                  {storageSaved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {!["General", "Users & Roles", "Printer", "Storage & Location"].includes(activeSection) && (
            <div style={{ padding: 60, textAlign: "center", color: "#9CA3AF" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚙</div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, color: "#6B7280" }}>{activeSection} settings coming soon</div>
            </div>
          )}

          {activeSection === "General" && (
            <div className="flex justify-end mt-6 gap-3" style={ST.saveBar}>
              <button style={{ padding: "9px 20px", borderRadius: 6, border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Discard</button>
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
