export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", borderBottom: "2px solid #EEF1F6", flexShrink: 0 }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "10px 22px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "Inter",
            fontWeight: active === t.id ? 700 : 400,
            color: active === t.id ? "#1B6CA8" : "#9CA3AF",
            borderBottom: active === t.id ? "2px solid #1B6CA8" : "2px solid transparent",
            marginBottom: -2,
            whiteSpace: "nowrap",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
