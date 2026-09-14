import { useState } from "react";
import { suppliers } from "../data/mockData";
import { Th } from "./shared/Th";
import { Pill } from "./shared/Pill";
import { useTableSort } from "./shared/useTableSort";
import {
  DISTRIBUTOR_POLICIES,
  purchaseOrders, purchaseInvoices, purchaseReturns,
  formatDMY, money,
} from "./purchases/purchasesData";

type DrawerTab = "overview" | "po" | "invoice" | "return";

export default function Suppliers() {
  const [selected, setSelected] = useState<typeof suppliers[0] | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const { sortCol, sortDir, handleSort, sorted: sortedRows } = useTableSort(suppliers);

  function openDrawer(s: typeof suppliers[0]) {
    setSelected(s);
    setDrawerTab("overview");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 700, color: "#0C1B33", margin: 0, letterSpacing: "-0.02em" }}>Distributors</h1>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{suppliers.length} active distributors</div>
        </div>
        <button style={{ padding: "8px 16px", border: "none", background: "#1B6CA8", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>+ Add Distributor</button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #DDE3EC" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Supplier ID</Th>
              <Th onSort={() => handleSort("name")} sortDir={sortCol === "name" ? sortDir : null}>Name</Th>
              <Th onSort={() => handleSort("contact")} sortDir={sortCol === "contact" ? sortDir : null}>Contact</Th>
              <Th onSort={() => handleSort("products")} sortDir={sortCol === "products" ? sortDir : null}>Products</Th>
              <Th onSort={() => handleSort("lastOrder")} sortDir={sortCol === "lastOrder" ? sortDir : null}>Last Order</Th>
              <Th onSort={() => handleSort("balance")} sortDir={sortCol === "balance" ? sortDir : null}>Balance</Th>
              <Th onSort={() => handleSort("rating")} sortDir={sortCol === "rating" ? sortDir : null}>Rating</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((s) => (
              <tr
                key={s.id}
                style={{ borderBottom: "1px solid #F0F3F7", cursor: "pointer", background: selected?.id === s.id ? "#EFF6FF" : "transparent" }}
                onMouseEnter={(e) => { if (selected?.id !== s.id) e.currentTarget.style.background = "#F8FAFC"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = selected?.id === s.id ? "#EFF6FF" : "transparent"; }}
              >
                <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8" }}>{s.id}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "#0C1B33", fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "#6B7280" }}>{s.contact}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{s.products}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{s.lastOrder}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "JetBrains Mono", fontWeight: 600, color: s.balance < 0 ? "#C62828" : "#2E7D32" }}>
                  {s.balance < 0 ? `(₹${Math.abs(s.balance).toFixed(2)})` : "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: "#F59E0B", fontSize: 13 }}>{"★".repeat(Math.round(s.rating))}</span>
                    <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{s.rating}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    onClick={() => openDrawer(s)}
                    style={{ padding: "5px 12px", border: "1px solid #1B6CA8", background: selected?.id === s.id ? "#1B6CA8" : "#EFF6FF", fontSize: 11, cursor: "pointer", color: selected?.id === s.id ? "#fff" : "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Distributor Details Drawer ── */}
      {selected && (() => {
        const distPOs = purchaseOrders.filter(o => o.supplier === selected.name);
        const distInvoices = purchaseInvoices.filter(i => i.supplier === selected.name);
        const distReturns = purchaseReturns.filter(r => r.supplier === selected.name);
        const DRAWER_TABS: { id: DrawerTab; label: string; count?: number }[] = [
          { id: "overview", label: "Overview" },
          { id: "po", label: "PO Ordered", count: distPOs.length },
          { id: "invoice", label: "Purchase Invoice", count: distInvoices.length },
          { id: "return", label: "Purchase Return", count: distReturns.length },
        ];
        return (
          <>
            <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.35)", zIndex: 100 }} />
            <aside style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 520, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.10)" }}>

              {/* Drawer header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{selected.contact} · {selected.phone}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button style={{ padding: "7px 14px", border: "none", background: "#1B6CA8", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: "Inter" }}>
                    New Order
                  </button>
                  <button onClick={() => setSelected(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1, padding: "0 2px" }}>×</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
                {DRAWER_TABS.map(t => (
                  <button key={t.id} onClick={() => setDrawerTab(t.id)}
                    style={{
                      padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      fontFamily: "Inter", background: "transparent",
                      color: drawerTab === t.id ? "#1B6CA8" : "#6B7280",
                      borderBottom: drawerTab === t.id ? "2px solid #1B6CA8" : "2px solid transparent",
                      display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                    }}>
                    {t.label}
                    {t.count !== undefined && (
                      <span style={{ padding: "1px 6px", fontSize: 10, fontFamily: "JetBrains Mono", fontWeight: 700, background: drawerTab === t.id ? "#EFF6FF" : "#F0F3F7", color: drawerTab === t.id ? "#1B6CA8" : "#9CA3AF" }}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

                {/* ── Overview tab ── */}
                {drawerTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* KPI strip */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {[
                        { label: "Total Orders", value: String(distPOs.length) },
                        { label: "Total Invoiced", value: money(distInvoices.reduce((s, i) => s + i.total, 0)) },
                        { label: "Returns", value: String(distReturns.length) },
                      ].map(k => (
                        <div key={k.label} style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "12px 14px" }}>
                          <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2436", fontFamily: "JetBrains Mono", marginTop: 3 }}>{k.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Contact info */}
                    <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Contact Information</div>
                      {[
                        { label: "Contact Person", value: selected.contact },
                        { label: "Email", value: selected.email },
                        { label: "Phone", value: selected.phone },
                        { label: "Notify Channel", value: selected.notifyChannel ?? "—" },
                        { label: "Address", value: selected.address },
                        { label: "Products Supplied", value: String(selected.products) },
                        { label: "Rating", value: `${"★".repeat(Math.round(selected.rating))} ${selected.rating}` },
                      ].map(r => (
                        <div key={r.label} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                          <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, minWidth: 130, flexShrink: 0 }}>{r.label}</div>
                          <div style={{ fontSize: 12, color: r.label === "Notify Channel" ? "#1B6CA8" : "#1A2436", fontWeight: r.label === "Notify Channel" ? 600 : 500 }}>{r.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Amount owed */}
                    {selected.balance < 0 && (
                      <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, color: "#C62828", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Amount Owed</div>
                        <div style={{ fontSize: 20, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#C62828" }}>₹{Math.abs(selected.balance).toFixed(2)}</div>
                      </div>
                    )}

                    {/* Business rules */}
                    {(() => {
                      const pol = DISTRIBUTOR_POLICIES[selected.name];
                      const expiryReturnOk = pol ? pol.expiryReturn : true;
                      const damageReturnOk = pol ? pol.damageReturn : true;
                      const rules = [
                        { label: "Payment Terms", value: "Credit 30 Days", highlight: undefined as boolean | undefined },
                        { label: "Min Expiry on Goods", value: pol ? `${pol.minExpiry} from delivery` : "12 months from delivery", highlight: undefined },
                        { label: "Expiry Return Policy", value: expiryReturnOk ? "Allowed" : "Not Allowed", highlight: expiryReturnOk },
                        { label: "Damage Return Policy", value: damageReturnOk ? "Allowed — report within 48 hrs" : "Not Allowed", highlight: damageReturnOk },
                        { label: "Short Expiry Discount", value: pol?.nearExpiryDiscount ?? "—", highlight: undefined },
                        { label: "Return Window", value: pol ? `${pol.returnWindow} from invoice date` : "30 days from invoice date", highlight: undefined },
                        { label: "GST Registration", value: "27AABCM1234K1ZX", highlight: undefined },
                        { label: "Drug License No.", value: "MH/DL/2024/00892", highlight: undefined },
                      ];
                      return (
                        <div style={{ border: "1px solid #EEF1F6" }}>
                          <div style={{ padding: "10px 14px", background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            Business Rules & Terms
                          </div>
                          {rules.map((r, i) => (
                            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: i < rules.length - 1 ? "1px solid #F4F6FA" : undefined, background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                              <span style={{ fontSize: 12, color: "#6B7280" }}>{r.label}</span>
                              <span style={{ fontSize: 12, color: r.highlight === true ? "#2E7D32" : r.highlight === false ? "#C62828" : "#1A2436", fontWeight: 600, textAlign: "right", maxWidth: 220 }}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Delivery & Ordering Schedule */}
                    <div style={{ border: "1px solid #EEF1F6" }}>
                      <div style={{ padding: "10px 14px", background: "#F8FAFC", borderBottom: "1px solid #EEF1F6", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Delivery & Ordering Schedule
                      </div>
                      <div style={{ padding: "14px" }}>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Ordering Days (place PO on these days)</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {["Mon", "Wed", "Fri"].map(d => (
                              <span key={d} style={{ padding: "4px 12px", background: "#EFF6FF", color: "#1B6CA8", fontSize: 12, fontWeight: 700, border: "1px solid #BFDBFE" }}>{d}</span>
                            ))}
                            {["Tue", "Thu", "Sat", "Sun"].map(d => (
                              <span key={d} style={{ padding: "4px 12px", background: "#F8FAFC", color: "#9CA3AF", fontSize: 12, border: "1px solid #EEF1F6" }}>{d}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Delivery Days (expect goods on these days)</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {["Tue", "Thu", "Sat"].map(d => (
                              <span key={d} style={{ padding: "4px 12px", background: "#E8F5E9", color: "#2E7D32", fontSize: 12, fontWeight: 700, border: "1px solid #A5D6A7" }}>{d}</span>
                            ))}
                            {["Mon", "Wed", "Fri", "Sun"].map(d => (
                              <span key={d} style={{ padding: "4px 12px", background: "#F8FAFC", color: "#9CA3AF", fontSize: 12, border: "1px solid #EEF1F6" }}>{d}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {[
                            { label: "Order Cut-off Time", value: "5:00 PM" },
                            { label: "Lead Time", value: "1–2 business days" },
                            { label: "Salesman Name", value: "Rajesh Kumar" },
                            { label: "Salesman Mobile", value: "+91 98200 44321" },
                            { label: "Min Order Value", value: money(500) },
                            { label: "Free Delivery Above", value: money(2000) },
                          ].map(r => (
                            <div key={r.label} style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{r.label}</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436" }}>{r.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* ── PO Ordered tab ── */}
                {drawerTab === "po" && (
                  <div>
                    {distPOs.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>No purchase orders for this distributor</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#F8FAFC" }}>
                            {["PO #", "Date", "Items", "Value", "Status"].map(h => (
                              <th key={h} style={{ padding: "8px 10px", textAlign: h === "Value" || h === "Items" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {distPOs.map(po => (
                            <tr key={po.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{po.id}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(po.date)}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", textAlign: "right" }}>{po.items}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 600, textAlign: "right" }}>{money(po.orderValue)}</td>
                              <td style={{ padding: "9px 10px" }}><Pill status={po.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* ── Purchase Invoice tab ── */}
                {drawerTab === "invoice" && (
                  <div>
                    {distInvoices.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>No invoices for this distributor</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#F8FAFC" }}>
                            {["Invoice #", "Date", "Due", "Total", "Status"].map(h => (
                              <th key={h} style={{ padding: "8px 10px", textAlign: h === "Total" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {distInvoices.map(inv => (
                            <tr key={inv.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{inv.id}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(inv.date)}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(inv.due)}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436", fontWeight: 600, textAlign: "right" }}>{money(inv.total)}</td>
                              <td style={{ padding: "9px 10px" }}><Pill status={inv.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* ── Purchase Return tab ── */}
                {drawerTab === "return" && (
                  <div>
                    {distReturns.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>No returns for this distributor</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#F8FAFC" }}>
                            {["Return #", "Date", "Reason", "Total", "Status"].map(h => (
                              <th key={h} style={{ padding: "8px 10px", textAlign: h === "Total" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #E8ECF4" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {distReturns.map(ret => (
                            <tr key={ret.id} style={{ borderBottom: "1px solid #F4F6FA" }}>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1B6CA8", fontWeight: 600 }}>{ret.id}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{formatDMY(ret.date)}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, color: "#6B7280", maxWidth: 140 }}>{ret.reason}</td>
                              <td style={{ padding: "9px 10px", fontSize: 12, fontFamily: "JetBrains Mono", color: "#C62828", fontWeight: 600, textAlign: "right" }}>-{money(ret.total)}</td>
                              <td style={{ padding: "9px 10px" }}><Pill status={ret.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

              </div>
            </aside>
          </>
        );
      })()}
    </div>
  );
}
