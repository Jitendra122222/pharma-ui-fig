export function StatTile({
  label,
  value,
  color,
  sub,
  accentBorder,
  align = "left",
  fontSize,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  sub?: React.ReactNode;
  accentBorder?: boolean;
  align?: "left" | "center";
  fontSize?: number;
}) {
  return (
    <div style={{
      padding: accentBorder ? "16px 20px" : "10px 14px",
      border: "1px solid #E8ECF4",
      borderTop: accentBorder ? `3px solid ${color ?? "#1A2436"}` : undefined,
      background: "#fff",
      textAlign: align,
    }}>
      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: accentBorder ? 8 : 4 }}>{label}</div>
      <div style={{ fontFamily: "Outfit", fontSize: fontSize ?? (accentBorder ? 24 : 18), fontWeight: 700, color: color ?? "#1A2436", letterSpacing: accentBorder ? "-0.02em" : undefined }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
