import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { salesData, categoryData } from "../data/mockData";

const monthlyRx = [
  { month: "Feb", filled: 312, cancelled: 18 },
  { month: "Mar", filled: 348, cancelled: 12 },
  { month: "Apr", filled: 289, cancelled: 22 },
  { month: "May", filled: 401, cancelled: 8 },
  { month: "Jun", filled: 442, cancelled: 15 },
  { month: "Jul", filled: 387, cancelled: 11 },
];

const topDrugs = [
  { name: "Paracetamol 500mg", units: 4200, revenue: 336 },
  { name: "Metformin 1000mg", units: 1840, revenue: 589 },
  { name: "Amlodipine 5mg", units: 1620, revenue: 729 },
  { name: "Atorvastatin 20mg", units: 1340, revenue: 1045 },
  { name: "Sertraline 50mg", units: 980, revenue: 862 },
];

export default function Reports() {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortedTopDrugs = sortCol
    ? [...topDrugs].sort((a: any, b: any) => {
        let va = a[sortCol]; let vb = b[sortCol];
        if (va == null) return 1; if (vb == null) return -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
      })
    : topDrugs;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Reports & Analytics</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Period: February – July 2025</div>
        </div>
        <div className="flex gap-2">
          <select style={{ padding: "8px 12px", border: "1px solid #DDE3EC", fontSize: 13, outline: "none", fontFamily: "Inter", background: "#fff" }}>
            <option>Last 6 Months</option>
            <option>This Year</option>
            <option>Custom Range</option>
          </select>
          <button style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>Export PDF</button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "6M Revenue", value: "₹203,900", change: "+12.4%", up: true },
          { label: "6M Profit", value: "₹101,950", change: "+11.8%", up: true },
          { label: "Margin", value: "50.0%", change: "+0.3pp", up: true },
          { label: "Total Rx Filled", value: "2,179", change: "+8.2%", up: true },
          { label: "New Patients", value: "34", change: "-3", up: false },
        ].map((k) => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#0C1B33", marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: k.up ? "#2E7D32" : "#C62828", fontWeight: 500 }}>{k.change}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "3fr 2fr" }}>
        {/* Revenue bar */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33", marginBottom: 4 }}>Monthly Revenue vs Profit</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>Grouped bar chart</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={2} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <CartesianGrid vertical={false} stroke="#F0F3F7" />
              <Tooltip contentStyle={{ border: "1px solid #DDE3EC", borderRadius: 0, fontSize: 12 }} formatter={(v: number) => [`₹${v.toLocaleString()}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#1B6CA8" radius={0} />
              <Bar dataKey="profit" name="Profit" fill="#00ACC1" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rx line */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33", marginBottom: 4 }}>Prescriptions</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>Filled vs cancelled</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyRx} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <CartesianGrid vertical={false} stroke="#F0F3F7" />
              <Tooltip contentStyle={{ border: "1px solid #DDE3EC", borderRadius: 0, fontSize: 12 }} />
              <Line type="monotone" dataKey="filled" name="Filled" stroke="#2E7D32" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#C62828" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Top drugs table */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #DDE3EC", fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33" }}>Top Selling Drugs</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th onClick={() => handleSort("name")} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>
                  Drug
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "name" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "name" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th onClick={() => handleSort("units")} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>
                  Units Sold
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "units" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "units" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
                <th onClick={() => handleSort("revenue")} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDE3EC", cursor: "pointer", userSelect: "none" as const }}>
                  Revenue
                  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1.5, marginLeft: 4, lineHeight: 1 }}>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "revenue" && sortDir === "asc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" style={{ display: "block" }} fill={sortCol === "revenue" && sortDir === "desc" ? "#1B6CA8" : "#C8CDD8"}><path d="M3 4L0 0H6L3 4Z" /></svg>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTopDrugs.map((d, i) => (
                <tr key={d.name} style={{ borderBottom: "1px solid #F0F3F7" }}>
                  <td style={{ padding: "11px 16px" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#9CA3AF", width: 16 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, color: "#0C1B33", fontWeight: 500 }}>{d.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{d.units.toLocaleString()}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1B6CA8" }}>₹{d.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Category distribution */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33", marginBottom: 4 }}>Sales by Drug Category</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>% share of total sales</div>
          <div className="flex flex-col gap-3">
            {categoryData.map((c, i) => {
              const COLORS = ["#1B6CA8", "#00ACC1", "#2E7D32", "#E65100", "#7B1FA2", "#37474F"];
              return (
                <div key={c.name}>
                  <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                    <span style={{ color: "#0C1B33" }}>{c.name}</span>
                    <span style={{ fontFamily: "JetBrains Mono", color: "#6B7280" }}>{c.value}%</span>
                  </div>
                  <div style={{ height: 6, background: "#F0F3F7" }}>
                    <div style={{ height: "100%", width: `${c.value}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
