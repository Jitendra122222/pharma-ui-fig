export function EditableChip({
  label,
  value,
  onChange,
  editable,
  color,
  prefix,
  allowNegative,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  editable: boolean;
  color: string;
  prefix?: string;
  allowNegative?: boolean;
}) {
  const displayVal = `${prefix ?? ""}₹${Math.abs(value).toFixed(2)}`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        borderLeft: "1px solid #EEF1F6",
        background: editable ? "#FAFBFD" : undefined,
        flex: "0 0 auto",
        minWidth: 140,
      }}
    >
      <div>
        <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        {editable ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "JetBrains Mono" }}>₹</span>
            <input
              type="number"
              step="0.01"
              value={value === 0 ? "" : value}
              placeholder="0.00"
              onChange={e => {
                const raw = e.target.value;
                if (raw === "" || raw === "-") { onChange?.(0); return; }
                const n = parseFloat(raw);
                if (!isNaN(n)) onChange?.(allowNegative ? n : Math.max(0, n));
              }}
              style={{
                width: 80,
                padding: "3px 6px",
                border: "1px solid #E8ECF4",
                fontSize: 13,
                fontFamily: "JetBrains Mono",
                fontWeight: 500,
                outline: "none",
                background: "#fff",
                color: "#1A2436",
              }}
            />
          </div>
        ) : (
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 500, color }}>{displayVal}</div>
        )}
      </div>
    </div>
  );
}
