import { useState, useRef, useEffect, useCallback } from "react";

export interface DatePickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export function DatePicker({ value: controlledValue, defaultValue, onChange, disabled = false, style, inputStyle }: DatePickerProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? "");
  const dateStr = isControlled ? (controlledValue ?? "") : internalValue;

  function initYM(ds: string) {
    if (ds) {
      const p = ds.split("-");
      if (p.length === 3 && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))) {
        return { y: parseInt(p[0]), m: parseInt(p[1]) - 1 };
      }
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  }

  const [open, setOpen] = useState(false);
  const init = initYM(dateStr);
  const [viewYear, setViewYear] = useState(init.y);
  const [viewMonth, setViewMonth] = useState(init.m);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dateStr) {
      const p = dateStr.split("-");
      if (p.length === 3 && !isNaN(Number(p[0])) && !isNaN(Number(p[1]))) {
        setViewYear(parseInt(p[0]));
        setViewMonth(parseInt(p[1]) - 1);
      }
    }
  }, [dateStr]);

  const openCalendar = useCallback(() => {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupWidth = 268;
    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 8) left = rect.right - popupWidth;
    setPopupPos({ top: rect.bottom + 6, left: Math.max(8, left) });
    setOpen(o => !o);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function formatDisplay(ds: string) {
    if (!ds) return "";
    const [y, m, d] = ds.split("-");
    if (!y || !m || !d) return "";
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const newVal = `${viewYear}-${m}-${d}`;
    if (!isControlled) setInternalValue(newVal);
    onChange?.(newVal);
    setOpen(false);
  }

  function clearDate() {
    if (!isControlled) setInternalValue("");
    onChange?.("");
    setOpen(false);
  }

  function goToday() {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    const newVal = `${t.getFullYear()}-${m}-${d}`;
    if (!isControlled) setInternalValue(newVal);
    onChange?.(newVal);
    setOpen(false);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = new Date();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const selParts = dateStr ? dateStr.split("-") : null;

  function isSelected(day: number) {
    if (!selParts) return false;
    return parseInt(selParts[0]) === viewYear &&
           parseInt(selParts[1]) - 1 === viewMonth &&
           parseInt(selParts[2]) === day;
  }

  function isTodayCell(day: number) {
    return today.getFullYear() === viewYear &&
           today.getMonth() === viewMonth &&
           today.getDate() === day;
  }

  const iconColor = disabled ? "#C8D6E5" : open ? "#1B6CA8" : "#9CA3AF";

  return (
    <div ref={triggerRef} style={{ position: "relative", ...style }}>
      <div
        onClick={openCalendar}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderRadius: 6,
          border: `1px solid ${open ? "#1B6CA8" : "#E8ECF4"}`,
          fontSize: 13,
          fontFamily: "JetBrains Mono",
          background: disabled ? "#F8FAFC" : "#fff",
          color: dateStr ? (disabled ? "#6B7280" : "#1A2436") : "#9CA3AF",
          cursor: disabled ? "default" : "pointer",
          boxSizing: "border-box" as const,
          userSelect: "none" as const,
          ...inputStyle,
        }}
      >
        <span>{dateStr ? formatDisplay(dateStr) : "DD-MM-YYYY"}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: 6 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" stroke={iconColor} strokeWidth="2" />
          <path d="M3 9h18" stroke={iconColor} strokeWidth="2" />
          <path d="M8 2v4M16 2v4" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {open && !disabled && (
        <div
          ref={popupRef}
          style={{
            position: "fixed",
            top: popupPos.top,
            left: popupPos.left,
            background: "#fff",
            border: "1px solid #E8ECF4",
            borderRadius: 12,
            boxShadow: "0 8px 28px rgba(15, 30, 60, 0.14)",
            padding: "14px 16px 12px",
            zIndex: 9999,
            width: 268,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1A2436", fontFamily: "Inter" }}>
              {MONTHS[viewMonth]}, {viewYear}
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              <button
                onClick={e => { e.stopPropagation(); prevMonth(); }}
                style={{ border: "none", background: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 4, color: "#6B7280", display: "flex", alignItems: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={e => { e.stopPropagation(); nextMonth(); }}
                style={{ border: "none", background: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 4, color: "#6B7280", display: "flex", alignItems: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#9CA3AF", padding: "3px 0", fontFamily: "Inter" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} style={{ height: 32 }} />;
              const sel = isSelected(day);
              const tod = isTodayCell(day);
              return (
                <div
                  key={`d${day}`}
                  onClick={e => { e.stopPropagation(); selectDay(day); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    margin: "1px auto",
                    borderRadius: "50%",
                    fontSize: 13,
                    fontFamily: "Inter",
                    cursor: "pointer",
                    background: sel ? "#BFDBFE" : "transparent",
                    color: sel ? "#1B6CA8" : tod ? "#1B6CA8" : "#1A2436",
                    fontWeight: sel ? 700 : tod ? 600 : 400,
                    outline: tod && !sel ? "1.5px solid #93C5FD" : "none",
                    outlineOffset: -1,
                    boxSizing: "border-box" as const,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#EFF6FF"; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid #EEF1F6" }}>
            <button
              onClick={e => { e.stopPropagation(); clearDate(); }}
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontFamily: "Inter", padding: 0 }}
            >
              Clear
            </button>
            <button
              onClick={e => { e.stopPropagation(); goToday(); }}
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#1B6CA8", fontFamily: "Inter", padding: 0 }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
