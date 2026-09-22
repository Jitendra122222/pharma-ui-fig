import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { salesData, categoryData, recentTransactions, dailySalesData, drugs } from "../data/mockData";

const PIE_COLORS = ["#1B6CA8", "#00ACC1", "#2E7D32", "#E65100", "#7B1FA2", "#37474F"];

const KPI = ({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) => (
  <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
    <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
    <div style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 700, color, marginBottom: 4, letterSpacing: "-0.02em" }}>{value}</div>
    <div style={{ fontSize: 12, color: "#6B7280" }}>{sub}</div>
  </div>
);

const lowStockItems = drugs.filter(d => d.status === "Low Stock" || d.status === "Out of Stock");

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Dashboard</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Monday, 28 July 2025 · Today's Overview</div>
        </div>
        <div className="flex gap-2">
          <button style={{ padding: "8px 16px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 13, cursor: "pointer", color: "#0C1B33" }}>
            Export Report
          </button>
          <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter" }}>
            New Sale
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Today's Revenue" value="₹4,182" sub="↑ 8.4% vs yesterday" color="#1B6CA8" />
        <KPI label="Prescriptions Filled" value="47" sub="12 pending · 2 partial" color="#0C1B33" />
        <KPI label="Items Low / Out" value="5" sub="3 low stock · 2 out of stock" color="#C62828" />
        <KPI label="Active Patients" value="128" sub="8 new this week" color="#2E7D32" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Revenue chart */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33" }}>Revenue & Profit</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>6-month trend</div>
            </div>
            <div className="flex gap-4" style={{ fontSize: 12 }}>
              <span style={{ color: "#1B6CA8" }}>● Revenue</span>
              <span style={{ color: "#00ACC1" }}>● Profit</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={salesData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B6CA8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B6CA8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ACC1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00ACC1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ border: "1px solid #DDE3EC", borderRadius: 0, fontSize: 12 }}
                formatter={(v) => [`₹${(v as number).toLocaleString()}`, ""]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#1B6CA8" strokeWidth={2} fill="url(#rev)" />
              <Area type="monotone" dataKey="profit" stroke="#00ACC1" strokeWidth={2} fill="url(#prof)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33", marginBottom: 4 }}>Sales by Category</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Current month</div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={2} stroke="#fff">
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ border: "1px solid #DDE3EC", borderRadius: 0, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-2">
            {categoryData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between" style={{ fontSize: 11, color: "#6B7280" }}>
                <span className="flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, background: PIE_COLORS[i], display: "inline-block" }} />
                  {c.name}
                </span>
                <span style={{ fontFamily: "JetBrains Mono", color: "#0C1B33" }}>{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {/* Hourly sales */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33", marginBottom: 4 }}>Hourly Sales</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Today's transactions</div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={dailySalesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis hide />
              <Tooltip contentStyle={{ border: "1px solid #DDE3EC", borderRadius: 0, fontSize: 11 }} />
              <Bar dataKey="sales" fill="#1B6CA8" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent transactions */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33", marginBottom: 14 }}>Recent Sales</div>
          <div className="flex flex-col gap-3">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <div style={{ fontSize: 12, color: "#0C1B33", fontWeight: 500 }}>{t.patient}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "JetBrains Mono" }}>{t.id} · {t.time}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 500, color: "#0C1B33" }}>₹{t.total.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>{t.method}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div style={{ background: "#fff", border: "1px solid #DDE3EC", padding: "20px 22px" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 600, color: "#0C1B33", marginBottom: 14 }}>Stock Alerts</div>
          <div className="flex flex-col gap-3">
            {lowStockItems.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <div>
                  <div style={{ fontSize: 12, color: "#0C1B33", fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{d.location}</div>
                </div>
                <div className="text-right">
                  <div
                    style={{
                      fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 600,
                      color: d.status === "Out of Stock" ? "#C62828" : "#E65100",
                      padding: "2px 8px",
                      background: d.status === "Out of Stock" ? "#FFEBEE" : "#FFF3E0",
                    }}
                  >
                    {d.stock === 0 ? "OUT" : d.stock + " left"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
