import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronDown, formatDMY } from "./Icons";

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Date range",
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const label = from && to
    ? `${formatDMY(from)} – ${formatDMY(to)}`
    : from
    ? `From ${formatDMY(from)}`
    : to
    ? `Until ${formatDMY(to)}`
    : placeholder;

  const active = !!from || !!to;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          border: "1px solid #EDF0F5",
          background: "#fff",
          fontSize: 13,
          fontFamily: "Inter",
          cursor: "pointer",
          color: active ? "#2B3A4F" : "#8A94A8",
          whiteSpace: "nowrap",
          minHeight: 40,
        }}
      >
        <CalendarIcon />
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ marginLeft: 6, display: "inline-flex" }}><ChevronDown /></span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff", border: "1px solid #EDF0F5", zIndex: 200, boxShadow: "0 10px 32px rgba(15, 30, 60, 0.10)", padding: 16, minWidth: 340 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#8A94A8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>From</div>
              <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#8A94A8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>To</div>
              <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #EDF0F5", fontSize: 13, outline: "none", fontFamily: "Inter", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F3F8" }}>
            {[
              { label: "Last 7 days", from: "2026-08-08", to: "2026-08-15" },
              { label: "This month", from: "2026-08-01", to: "2026-08-31" },
              { label: "Last month", from: "2026-07-01", to: "2026-07-31" },
              { label: "This year", from: "2026-01-01", to: "2026-12-31" },
            ].map(preset => (
              <button key={preset.label} onClick={() => { onChange(preset.from, preset.to); setOpen(false); }}
                style={{ padding: "5px 12px", border: "1px solid #EDF0F5", background: "#F8FAFC", fontSize: 11, cursor: "pointer", color: "#4A5875", fontFamily: "Inter", fontWeight: 500 }}>
                {preset.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button onClick={() => onChange("", "")}
              style={{ padding: "7px 14px", border: "1px solid #EDF0F5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6B7280", fontFamily: "Inter" }}>
              Clear
            </button>
            <button onClick={() => setOpen(false)}
              style={{ padding: "7px 18px", border: "none", background: "#1B6CA8", fontSize: 12, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
