import { useEffect, useRef, useState } from "react";
import { SK } from "../../styles/stock";
import { Pill } from "../shared/Pill";
import { fetchControlledProducts, fetchNarcoticRegister } from "../../lib/stockApi";
import type { ControlledProduct, RegisterMonth } from "../../lib/stockApi";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const errText = (e: unknown) => (e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Something went wrong");

export default function NarcoticRegister() {
  const now = new Date();
  const [products, setProducts] = useState<ControlledProduct[]>([]);
  const [prodState, setProdState] = useState<"loading" | "ready" | "error">("loading");
  const [selId, setSelId] = useState("");
  const [drugOpen, setDrugOpen] = useState(false);
  const [drugSearch, setDrugSearch] = useState("");
  const drugRef = useRef<HTMLInputElement>(null);

  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [year, setYear] = useState(now.getFullYear());
  const [dateOpen, setDateOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());

  const [data, setData] = useState<RegisterMonth | null>(null);
  const [regState, setRegState] = useState<"idle" | "loading" | "error">("idle");
  const [regError, setRegError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    let live = true;
    fetchControlledProducts()
      .then(p => { if (live) { setProducts(p); setProdState("ready"); } })
      .catch(() => { if (live) setProdState("error"); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!selId) { setData(null); setRegState("idle"); return; }
    let live = true;
    setRegState("loading"); setRegError("");
    fetchNarcoticRegister(selId, year, month + 1)
      .then(d => { if (live) { setData(d); setRegState("idle"); } })
      .catch((e: unknown) => { if (live) { setRegError(errText(e)); setRegState("error"); } });
    return () => { live = false; };
  }, [selId, year, month]);

  const sel = products.find(p => p.id === selId);
  const selDrug = sel?.name ?? "";
  const filteredDrugs = products.filter(d => d.name.toLowerCase().includes(drugSearch.toLowerCase()));

  const entries = data?.entries ?? [];
  const openingBalance = data?.opening ?? 0;
  const totalReceipts = data?.receipts ?? 0;
  const totalIssues = data?.issues ?? 0;
  const closingBalance = data?.closing ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Opening Balance", value: String(openingBalance), color: "#1B6CA8" },
          { label: "Total Receipts", value: `+${totalReceipts}`, color: "#2E7D32" },
          { label: "Total Issues", value: `-${totalIssues}`, color: "#C62828" },
          { label: "Closing Balance", value: String(closingBalance), color: "#0C1B33" },
        ].map(k => (
          <div key={k.label} style={{ ...SK.kpiTile, background: "#fff" }}>
            <div style={SK.kpiLabel}>{k.label}</div>
            <div style={SK.kpiValue(k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar: drug dropdown + month picker + print */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>

        <div style={{ position: "relative", flex: "0 0 300px" }}>
          {drugOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => { setDrugOpen(false); setDrugSearch(""); }} />
          )}
          <div
            role="combobox" aria-label="Controlled drug" aria-expanded={drugOpen}
            onClick={() => { setDrugOpen(o => !o); setTimeout(() => drugRef.current?.focus(), 50); }}
            style={{ height: 40, padding: "0 10px", border: "1px solid #DDE3EC", borderRadius: 6, background: drugOpen ? "#fff" : "#F8FAFC", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", boxSizing: "border-box" }}
          >
            {drugOpen ? (
              <input
                ref={drugRef}
                value={drugSearch}
                onChange={e => setDrugSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="Search drug..."
                style={{ flex: 1, border: "none", outline: "none", fontSize: 12, fontFamily: "Inter", color: "#1A2436", background: "transparent" }}
              />
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 12, fontFamily: "Inter", color: sel ? "#1A2436" : "#9CA3AF", fontWeight: sel ? 600 : 400 }}>
                  {sel ? sel.name : "Select drug..."}
                </span>
                {sel && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 5px", borderRadius: 3, background: "#FFEBEE", color: "#C62828" }}>{sel.schedule.replace("Schedule ", "")}</span>}
              </>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M6 9l6 6 6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {drugOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 6, zIndex: 300, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", maxHeight: 260, overflowY: "auto" }}>
              {filteredDrugs.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>
                  {prodState === "loading" ? "Loading…" : prodState === "error" ? "Could not load products"
                    : products.length === 0 ? "No Schedule H1 or X drugs in stock. Set a product's prescription status in Inventory." : "No drugs found"}
                </div>
              ) : filteredDrugs.map(d => (
                <div key={d.id}
                  onMouseDown={() => { setSelId(d.id); setDrugOpen(false); setDrugSearch(""); }}
                  style={{
                    padding: "9px 12px", paddingLeft: selId === d.id ? 9 : 12,
                    borderLeft: selId === d.id ? "3px solid #1B6CA8" : "3px solid transparent",
                    background: selId === d.id ? "#EFF6FF" : "#fff", color: selId === d.id ? "#1B6CA8" : "#1A2436",
                    fontSize: 12, fontFamily: "Inter", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}
                  onMouseEnter={ev => { if (selId !== d.id) ev.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={ev => { if (selId !== d.id) ev.currentTarget.style.background = "#fff"; }}
                >
                  <span>{d.name} <span style={{ color: "#9CA3AF" }}>· {d.stock} in stock</span></span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 4px", borderRadius: 3, background: "#FFEBEE", color: "#C62828" }}>{d.schedule.replace("Schedule ", "")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Month / year picker */}
        <div style={{ position: "relative" }}>
          {dateOpen && <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onMouseDown={() => setDateOpen(false)} />}
          <button
            onClick={() => { setDateOpen(o => !o); setPickerYear(year); }}
            style={{
              height: 40, padding: "0 12px", border: "1px solid #DDE3EC", borderRadius: 6,
              background: dateOpen ? "#EFF6FF" : "#FAFBFD", color: dateOpen ? "#1B6CA8" : "#1A2436",
              fontSize: 12, fontFamily: "Inter", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
              borderColor: dateOpen ? "#1B6CA8" : "#DDE3EC",
            }}
          >
            {MONTHS[month]} {year}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke={dateOpen ? "#1B6CA8" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {dateOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 240, background: "#fff", border: "1px solid #DDE3EC", borderRadius: 8, zIndex: 300, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #EEF1F6" }}>
                <button aria-label="Previous year" onMouseDown={() => setPickerYear(y => y - 1)}
                  style={{ width: 26, height: 26, border: "1px solid #DDE3EC", borderRadius: 5, background: "#F8FAFC", cursor: "pointer" }}>‹</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Outfit" }}>{pickerYear}</span>
                <button aria-label="Next year" onMouseDown={() => setPickerYear(y => y + 1)}
                  style={{ width: 26, height: 26, border: "1px solid #DDE3EC", borderRadius: 5, background: "#F8FAFC", cursor: "pointer" }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "10px 12px 12px" }}>
                {MONTHS.map((m, i) => {
                  const isActive = i === month && pickerYear === year;
                  return (
                    <button key={m}
                      onMouseDown={() => { setMonth(i); setYear(pickerYear); setDateOpen(false); }}
                      style={{ padding: "7px 0", border: "none", borderRadius: 5, cursor: "pointer", background: isActive ? "#1B6CA8" : "transparent", color: isActive ? "#fff" : "#1A2436", fontSize: 12, fontFamily: "Inter", fontWeight: isActive ? 700 : 500 }}
                      onMouseEnter={ev => { if (!isActive) ev.currentTarget.style.background = "#F0F3F7"; }}
                      onMouseLeave={ev => { if (!isActive) ev.currentTarget.style.background = "transparent"; }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={() => { if (!selId) { showToast("Select a drug first"); return; } window.print(); }} style={SK.btnPrimary}>
          Print Register
        </button>
      </div>

      {/* Register table */}
      <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #DDE3EC", overflow: "hidden" }}>
        <div style={SK.cardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={SK.cardHeaderTitle}>{sel ? `${sel.name} — ${sel.schedule} Register` : "Controlled Drug Register"}</span>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 3, background: "#FFEBEE", color: "#C62828", fontFamily: "Inter", letterSpacing: "0.05em" }}>CONTROLLED SUBSTANCE</span>
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Inter" }}>{MONTHS[month]} {year}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFD" }}>
                {["Date", "Time", "Type", "Ref #", "Prescriber", "Patient", "Qty", "Balance", "Signed By"].map(h => (
                  <th key={h} style={SK.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid #F0F3F7" }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{fmtDate(e.at)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>{fmtTime(e.at)}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <Pill
                      label={e.type}
                      bg={e.type === "Receipt" ? "#E8F5E9" : e.type === "Issue" || e.type === "Write-off" ? "#FFEBEE" : "#F0F3F7"}
                      color={e.type === "Receipt" ? "#2E7D32" : e.type === "Issue" || e.type === "Write-off" ? "#C62828" : "#6B7280"}
                    />
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>
                    {e.ref}
                    <div style={{ fontSize: 10, color: "#9CA3AF" }}>Batch {e.batch}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{e.prescriber || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>{e.patient || "—"}</td>
                  <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700, color: e.quantity > 0 ? "#2E7D32" : e.quantity < 0 ? "#C62828" : "#6B7280" }}>
                    {e.quantity > 0 ? `+${e.quantity}` : e.quantity}
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 800, color: "#0C1B33" }}>{e.balance}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280", fontFamily: "Inter" }}>{e.signedBy}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "36px 14px", textAlign: "center", color: regState === "error" ? "#B91C1C" : "#9CA3AF", fontSize: 13 }}>
                    {!selId ? "Select a drug to view its register."
                      : regState === "loading" ? "Loading…"
                      : regState === "error" ? `Could not load the register: ${regError}`
                      : `No entries for ${selDrug} in ${MONTHS[month]} ${year}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 28, left: "var(--sidebar-w, 228px)", right: 0, display: "flex", justifyContent: "center", zIndex: 400, pointerEvents: "none" }}>
          <div style={{ background: "#2E7D32", color: "#fff", padding: "10px 24px", fontSize: 13, fontFamily: "Inter", boxShadow: "0 2px 12px rgba(0,0,0,0.18)", pointerEvents: "auto" }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
