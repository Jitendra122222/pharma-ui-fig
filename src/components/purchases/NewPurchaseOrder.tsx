import { useState, useMemo, useRef, useEffect } from "react";
import { suppliers } from "../../data/mockData";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import { DateRangePicker } from "../shared/DateRangePicker";
import { SearchIcon, ChevronDown } from "../shared/Icons";
import PrintDialog from "../shared/PrintDialog";
import type { PrintJobType } from "../shared/PrintDialog";
import {
  type POLine, type PurchaseOrderRecord, type MedCatalogItem, type MedRec,
  type DistributorPolicy, type DrugWithParsed, type RecommendedQtyResult, type DistributorFormData,
  TODAY, purchaseOrders, purchaseInvoices, purchaseReturns, MEDICINE_RECS, DISTRIBUTOR_POLICIES,
  PO_MOCK_LINES, PO_PRICE_HISTORY, SUPPLIER_COMPARISON,
  WAREHOUSES, PAYMENT_TERMS_OPTIONS, CANCEL_REASONS,
  formatDMY, money, newEmptyPOLine, parseSchemeFree, calcEffectiveCost,
  calcMarginPct, poStatusStepIndex, calcRecommendedQty,
  PO_MED_CATALOG,
} from "./purchasesData";
import {
  Td, TableRow, FieldLabel, TextInput, DropdownSelect, PrimaryBtn, GhostBtn, Modal,
  FilterSearch, NewButton, BackConfirmDialog, HorizontalStepper,
  EmptyTableRow, EmptyListPlaceholder, DrawerStepFooter, BarcodeIcon,
  AddMedicineDrawer, MedicineNameCell, MedicineMapModal, PurchaseLineItemsTable,
  AddDistributorDrawer, DistributorSearch, DistributorDrawer,
  POLineSearch, EditableChip,
} from "./purchasesShared";
// ─── Purchase Order workspace ─────────────────────────────────────────────────


function OrderQtyBreakdown({
  line,
  distributorName,
  onUse,
  onClose,
}: {
  line: POLine;
  distributorName?: string;
  onUse: () => void;
  onClose: () => void;
}) {
  const rec = calcRecommendedQty(line.medicineName, line.currentStock, distributorName);
  const need = rec.expectedSales + rec.safetyStock + rec.pendingOrders + rec.expiryLoss;
  const have = rec.usableStock + rec.stockOnPO + rec.branchStock;
  const rowStyle = (color: string): React.CSSProperties => ({
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    fontSize: 12, padding: "3px 0", color,
  });
  const labelStyle: React.CSSProperties = { color: "#6B7280", fontSize: 11 };
  const valStyle = (color: string): React.CSSProperties => ({ fontFamily: "JetBrains Mono", fontWeight: 700, color });
  return (
    <div style={{ position: "absolute", top: 28, left: 0, width: 300, background: "#fff", border: "1px solid #E8ECF4", zIndex: 400, boxShadow: "0 8px 28px rgba(0,0,0,0.14)", padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2436" }}>How Sugg Qty was calculated</div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      {/* What you need */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>What you need</div>
      <div style={rowStyle("#2E7D32")}>
        <span>Expected Sales <span style={labelStyle}>({rec.avgSalesPerDay}/day × {rec.leadTime + rec.coverageDays} days)</span></span>
        <span style={valStyle("#2E7D32")}>{Math.ceil(rec.expectedSales)}</span>
      </div>
      <div style={rowStyle("#2E7D32")}>
        <span>Safety Stock</span>
        <span style={valStyle("#2E7D32")}>{rec.safetyStock}</span>
      </div>
      {rec.pendingOrders > 0 && (
        <div style={rowStyle("#2E7D32")}>
          <span>Pending Orders</span>
          <span style={valStyle("#2E7D32")}>{rec.pendingOrders}</span>
        </div>
      )}
      {rec.expiryLoss > 0 && (
        <div style={rowStyle("#E65100")}>
          <span>Expiry Write-off <span style={labelStyle}>(no return policy)</span></span>
          <span style={valStyle("#E65100")}>+{rec.expiryLoss}</span>
        </div>
      )}
      <div style={{ borderTop: "1px solid #F0F3F7", margin: "6px 0", display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#2E7D32" }}>=  Total Need</span>
        <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 12, color: "#2E7D32" }}>{Math.ceil(need)}</span>
      </div>

      {/* What you have */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, marginTop: 8 }}>What you already have</div>
      <div style={rowStyle("#E65100")}>
        <span>Usable Stock <span style={labelStyle}>({line.currentStock}{rec.nearExpiryQty > 0 ? ` − ${rec.nearExpiryQty} near-expiry` : ""})</span></span>
        <span style={valStyle("#E65100")}>−{rec.usableStock}</span>
      </div>
      {rec.stockOnPO > 0 && (
        <div style={rowStyle("#E65100")}>
          <span>Stock on PO</span>
          <span style={valStyle("#E65100")}>−{rec.stockOnPO}</span>
        </div>
      )}
      {rec.branchStock > 0 && (
        <div style={rowStyle("#E65100")}>
          <span>Other Branches</span>
          <span style={valStyle("#E65100")}>−{rec.branchStock}</span>
        </div>
      )}
      <div style={{ borderTop: "1px solid #F0F3F7", margin: "6px 0", display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#E65100" }}>=  Total Have</span>
        <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 12, color: "#E65100" }}>−{have}</span>
      </div>

      {/* Result */}
      <div style={{ background: "#EFF6FF", border: "1px solid #DBEAFE", padding: "10px 12px", marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#1B6CA8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Recommended Qty</div>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: "#1B6CA8", marginTop: 2 }}>{rec.qty}</div>
        </div>
        <button onClick={onUse}
          style={{ padding: "7px 14px", border: "none", background: "#1B6CA8", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "Inter", cursor: "pointer" }}>
          Use
        </button>
      </div>
    </div>
  );
}

function NewPurchaseOrder({
  onBack,
  initialData,
  defaultViewMode = false,
  createData,
}: {
  onBack: (result?: { type: "success" | "error"; message: string }) => void;
  initialData?: PurchaseOrderRecord;
  defaultViewMode?: boolean;
  createData?: { supplier: string; warehouse: string; expectedDelivery: string; paymentTerms: string };
}) {
  const [editOverride, setEditOverride] = useState(false);
  const isView = defaultViewMode && !editOverride;
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const poId = initialData?.id ?? `PO-2026-${String(Math.floor(Math.random() * 900) + 100).padStart(4, "0")}`;
  const nextLineId = useRef(200);

  type WsTab = "overview" | "items" | "suppliers" | "supply" | "invoice" | "timeline";
  const [detailTab, setDetailTab] = useState<WsTab>("overview");
  const [supplier, setSupplier] = useState(createData?.supplier ?? initialData?.supplier ?? "");
  const [supplierList, setSupplierList] = useState(suppliers.map(s => s.name));
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [orderDate, setOrderDate] = useState(initialData?.date ?? TODAY);
  const [expectedDelivery, setExpectedDelivery] = useState(createData?.expectedDelivery ?? initialData?.expectedDelivery ?? "");
  const [warehouse, setWarehouse] = useState(createData?.warehouse ?? initialData?.warehouse ?? "Main Warehouse");
  const [paymentTerms, setPaymentTerms] = useState(createData?.paymentTerms ?? initialData?.paymentTerms ?? "Credit 30 Days");
  const [reference, setReference] = useState(initialData?.reference ?? "");
  const [poStatus, setPoStatus] = useState(initialData?.status ?? "Draft");
  const [lineSearch, setLineSearch] = useState("");
  const [showApprovalDrawer, setShowApprovalDrawer] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showComparisonFor, setShowComparisonFor] = useState<string | null>(null);
  const [showPriceHistoryFor, setShowPriceHistoryFor] = useState<string | null>(null);
  const [showRecommendFor, setShowRecommendFor] = useState<string | null>(null);
  const [showBreakdownFor, setShowBreakdownFor] = useState<number | null>(null);
  const [showMedDetails, setShowMedDetails] = useState<string | null>(null);
  const [showDistributorDrawer, setShowDistributorDrawer] = useState(false);
  const [showEditDistributor, setShowEditDistributor] = useState(false);
  const [distDrawerTab, setDistDrawerTab] = useState<"overview" | "po" | "invoice" | "return">("overview");
  const [cancelReason, setCancelReason] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [sendEmail, setSendEmail] = useState("procurement@medline.in");
  const [sendWhatsApp, setSendWhatsApp] = useState("");
  const [saved, setSaved] = useState<false | "draft" | "submitted">(false);
  const [showAddMedDrawer, setShowAddMedDrawer] = useState(false);
  const [addMedInitialName, setAddMedInitialName] = useState("");
  const [poCashDiscount, setPoCashDiscount] = useState(0);
  const [poAdjustment, setPoAdjustment] = useState(0);

  const [poLines, setPoLines] = useState<POLine[]>(() => {
    const seed = PO_MOCK_LINES[poId];
    if (seed) return seed;
    return [newEmptyPOLine(nextLineId.current++)];
  });

  const filledLines = poLines.filter(l => l.medicineName.trim() !== "");

  function updatePOLine(id: number, field: keyof POLine, value: string | number) {
    setPoLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      updated.freeQty = parseSchemeFree(updated.scheme, updated.orderQty);
      return updated;
    }));
  }

  function deletePOLine(id: number) {
    setPoLines(prev => {
      const filtered = prev.filter(l => l.id !== id);
      if (!filtered.some(l => !l.medicineName)) return [newEmptyPOLine(nextLineId.current++), ...filtered];
      return filtered;
    });
  }

  // Re-calc suggested qty for all filled lines when distributor changes (policy affects expiryLoss)
  useEffect(() => {
    setPoLines(prev => prev.map(l => {
      if (!l.medicineName.trim()) return l;
      const rec = calcRecommendedQty(l.medicineName, l.currentStock, supplier);
      return { ...l, suggestedQty: rec.qty };
    }));
  }, [supplier]);

  const poSubtotal = filledLines.reduce((s, l) => s + l.orderQty * l.purchaseRate, 0);
  const poSchemeAmt = filledLines.reduce((s, l) => s + l.freeQty * l.purchaseRate, 0);
  const poTax = filledLines.reduce((s, l) => s + l.orderQty * l.purchaseRate * (l.gst / 100), 0);
  const poPreRound = poSubtotal - poCashDiscount + poTax + poAdjustment;
  const poRoundOff = Math.round(poPreRound) - poPreRound;
  const total = poPreRound + poRoundOff;

  const DETAIL_TABS: { id: WsTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "items", label: "Items" },
    { id: "suppliers", label: "Distributors" },
    { id: "supply", label: "Supply" },
    { id: "invoice", label: "Invoice" },
    { id: "timeline", label: "Timeline" },
  ];

  const relatedInvoices = purchaseInvoices.filter(inv => inv.poRef === poId);

  // ── Supplier Comparison Drawer ──────────────────────────────────────────────
  function SupplierComparisonDrawer({ medicine, onClose }: { medicine: string; onClose: () => void }) {
    const comparisons = SUPPLIER_COMPARISON[medicine] ?? [
      { supplier: "MedLine Pharma", rate: 25.00, scheme: "10+1", disc: 2, availability: "Available", score: 91 },
      { supplier: "GenPharm Ltd", rate: 24.50, scheme: "5+1", disc: 0, availability: "Available", score: 95 },
      { supplier: "Medico Pharma", rate: 24.00, scheme: "10+1", disc: 1, availability: "Partial", score: 84 },
    ];
    const best = [...comparisons].sort((a, b) => b.score - a.score)[0];
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.4)", zIndex: 100 }} />
        <aside style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 480, background: "#fff", border: "1px solid #E8ECF4", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.10)" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>Distributor Comparison</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{medicine}</div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
            {comparisons.map((c, i) => {
              const effCost = calcEffectiveCost(c.rate, c.scheme, 100);
              const margin = calcMarginPct(30, effCost);
              const isRecommended = c.supplier === best.supplier;
              return (
                <div key={i} style={{ border: isRecommended ? "1px solid #1B6CA8" : "1px solid #E8ECF4", marginBottom: 10, padding: "14px 16px", background: isRecommended ? "#F0F6FF" : "#fff" }}>
                  {isRecommended && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#1B6CA8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                      Recommended — Highest Score
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1A2436" }}>{c.supplier}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: c.availability === "Available" ? "#E8F5E9" : "#FFF3E0", color: c.availability === "Available" ? "#2E7D32" : "#E65100" }}>{c.availability}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Rate", value: money(c.rate) },
                      { label: "Scheme", value: c.scheme || "—" },
                      { label: "Discount", value: `${c.disc}%` },
                      { label: "Eff. Cost", value: money(effCost) },
                      { label: "Exp. Margin", value: `${margin.toFixed(1)}%` },
                      { label: "Score", value: String(c.score) },
                    ].map(item => (
                      <div key={item.label} style={{ background: "#F8FAFC", padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436", fontFamily: "JetBrains Mono", marginTop: 2 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => { setSupplier(c.supplier); onClose(); }}
                      style={{ width: "100%", padding: "8px 0", border: isRecommended ? "none" : "1px solid #E8ECF4", background: isRecommended ? "#1B6CA8" : "#fff", color: isRecommended ? "#fff" : "#1A2436", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter" }}>
                      Select Distributor
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </>
    );
  }

  // ── Price History Tooltip ───────────────────────────────────────────────────
  function PriceHistoryPanel({ medicine, onClose }: { medicine: string; onClose: () => void }) {
    const history = PO_PRICE_HISTORY[medicine] ?? [];
    const currentRate = filledLines.find(l => l.medicineName === medicine)?.purchaseRate ?? 0;
    const lastRate = history[0]?.rate ?? currentRate;
    const pctChange = lastRate > 0 ? ((currentRate - lastRate) / lastRate) * 100 : 0;
    return (
      <div style={{ position: "absolute", top: 32, left: 0, width: 280, background: "#fff", border: "1px solid #E8ECF4", zIndex: 300, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Price History</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 18 }}>×</button>
        </div>
        {history.length > 0 ? (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", padding: "4px 0", textAlign: "left" }}>Distributor</th>
                  <th style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", padding: "4px 0", textAlign: "right" }}>Rate</th>
                  <th style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", padding: "4px 0", textAlign: "right" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #F4F6FA" }}>
                    <td style={{ fontSize: 12, padding: "6px 0", color: "#1A2436" }}>{h.supplier}</td>
                    <td style={{ fontSize: 12, padding: "6px 0", color: "#1A2436", textAlign: "right", fontFamily: "JetBrains Mono" }}>{money(h.rate)}</td>
                    <td style={{ fontSize: 12, padding: "6px 0", color: "#9CA3AF", textAlign: "right", fontFamily: "JetBrains Mono" }}>{formatDMY(h.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 12, padding: "8px 10px", background: pctChange < 0 ? "#E8F5E9" : "#FFEBEE", color: pctChange < 0 ? "#2E7D32" : "#C62828", fontWeight: 600 }}>
              Current rate is {Math.abs(pctChange).toFixed(1)}% {pctChange < 0 ? "lower" : "higher"} than last purchase
            </div>
          </>
        ) : (
          <div style={{ color: "#9CA3AF", fontSize: 12, padding: "10px 0" }}>No purchase history available.</div>
        )}
      </div>
    );
  }

  if (saved) {
    return (
      <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, background: "#F0F3F7", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: 60, textAlign: "center", minWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 20, fontWeight: 700, color: "#1A2436", marginBottom: 8 }}>
            {saved === "submitted" ? "PO Submitted for Approval" : "Purchase Order Saved as Draft"}
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 24, fontFamily: "JetBrains Mono" }}>
            {poId} · {saved === "submitted" ? "Pending manager approval" : "Draft — not yet submitted"}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <GhostBtn onClick={onBack}>Back to Purchases</GhostBtn>
            <PrimaryBtn onClick={onBack}>New Purchase Order</PrimaryBtn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    {/* ── Back confirm dialog ── */}
    {showBackConfirm && (
      <BackConfirmDialog
        message="Save changes to this purchase order as a draft before going back?"
        onCancel={() => setShowBackConfirm(false)}
        onSave={() => { setSaved("draft"); setShowBackConfirm(false); setEditOverride(false); }}
        onDiscard={() => { setShowBackConfirm(false); if (defaultViewMode) { setEditOverride(false); } else { onBack(); } }}
      />
    )}
    <div style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 0, zIndex: 50, background: "#F0F3F7", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Header bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8ECF4", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              onClick={() => !isView ? setShowBackConfirm(true) : onBack()}
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}
              onMouseEnter={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = "1"; }}
              onMouseLeave={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = "0"; }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#1A2436" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1A2436", color: "#fff", fontSize: 11, fontFamily: "Inter", fontWeight: 600, padding: "3px 8px", whiteSpace: "nowrap", pointerEvents: "none", opacity: 0, transition: "opacity 0.15s", zIndex: 10 }}>
              Back
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Purchases</span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", fontFamily: "Inter" }}>
            {isView ? poId : "New Purchase Order"}
          </span>
          {isView && <Pill status={poStatus} />}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isView ? (
            <>
              {poStatus !== "Cancelled" && poStatus !== "Completed" && (
                <PrimaryBtn onClick={() => setEditOverride(true)}>Edit</PrimaryBtn>
              )}
              <GhostBtn onClick={() => {}}>Print</GhostBtn>
              {(poStatus === "Approved" || poStatus === "Sent") && (
                <GhostBtn onClick={() => setShowSendModal(true)}>Send to Distributor</GhostBtn>
              )}
              {poStatus !== "Cancelled" && poStatus !== "Completed" && (
                <button onClick={() => setShowCancelModal(true)}
                  style={{ padding: "9px 18px", border: "1px solid #FFCDD2", background: "#fff", fontSize: 13, cursor: "pointer", color: "#C62828", fontFamily: "Inter" }}>
                  Cancel PO
                </button>
              )}
            </>
          ) : defaultViewMode ? (
            <>
              <GhostBtn onClick={() => setEditOverride(false)}>Cancel Edit</GhostBtn>
              <PrimaryBtn onClick={() => { setSaved("draft"); setEditOverride(false); }}>Save Changes</PrimaryBtn>
            </>
          ) : (
            <>
              <GhostBtn onClick={() => setSaved("draft")}>Save Draft</GhostBtn>
              <GhostBtn onClick={() => {}}>Print</GhostBtn>
              <PrimaryBtn disabled={!supplier.trim() || filledLines.length === 0} onClick={() => setShowApprovalDrawer(true)}>Submit for Approval</PrimaryBtn>
            </>
          )}
        </div>
      </div>


      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: 20, paddingBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Order header fields ── */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "16px 20px", flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 14 }}>
            <div>
              <FieldLabel>Distributor</FieldLabel>
              {isView ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", padding: "9px 0" }}>{supplier || "—"}</div>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <DistributorSearch
                    selected={supplier}
                    onSelect={setSupplier}
                    distributors={supplierList}
                    onAdd={() => setShowAddSupplier(true)}
                  />
                  {supplier && (
                    <button onClick={() => setShowDistributorDrawer(true)} style={{ padding: "8px 12px", border: "1px solid #1B6CA8", background: "#EFF6FF", fontSize: 11, cursor: "pointer", color: "#1B6CA8", fontFamily: "Inter", fontWeight: 600, whiteSpace: "nowrap" }}>Details</button>
                  )}
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Expected Delivery</FieldLabel>
              {isView
                ? <div style={{ fontSize: 13, fontFamily: "JetBrains Mono", color: "#1A2436", padding: "9px 0" }}>{formatDMY(expectedDelivery)}</div>
                : <TextInput type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} />
              }
            </div>
            <div>
              <FieldLabel>Warehouse</FieldLabel>
              {isView
                ? <div style={{ fontSize: 13, color: "#1A2436", padding: "9px 0" }}>{warehouse}</div>
                : <DropdownSelect value={warehouse} onChange={setWarehouse} options={WAREHOUSES} />
              }
            </div>
            <div>
              <FieldLabel>Payment Terms</FieldLabel>
              {isView
                ? <div style={{ fontSize: 13, color: "#1A2436", padding: "9px 0" }}>{paymentTerms}</div>
                : <DropdownSelect value={paymentTerms} onChange={setPaymentTerms} options={PAYMENT_TERMS_OPTIONS} />
              }
            </div>
            <div>
              <FieldLabel>Reference</FieldLabel>
              {isView
                ? <div style={{ fontSize: 13, color: "#9CA3AF", padding: "9px 0" }}>{reference || "—"}</div>
                : <TextInput value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" />
              }
            </div>
          </div>
        </div>

        {/* ── Return policy warnings ── */}
        {supplier && DISTRIBUTOR_POLICIES[supplier] && (!DISTRIBUTOR_POLICIES[supplier].expiryReturn || !DISTRIBUTOR_POLICIES[supplier].damageReturn) && (
          <div style={{ background: "#FFF3E0", border: "1px solid #FFB74D", padding: "10px 16px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {!DISTRIBUTOR_POLICIES[supplier].expiryReturn && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#E65100" }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>Warning:</span>
                <span>{supplier} does not accept expiry returns — near-expiry stock cannot be returned. Recommended qty has been adjusted to account for write-off.</span>
              </div>
            )}
            {!DISTRIBUTOR_POLICIES[supplier].damageReturn && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#E65100" }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>Warning:</span>
                <span>{supplier} does not accept damage returns — inspect all goods carefully on arrival.</span>
              </div>
            )}
          </div>
        )}

        {/* ── Suppliers tab ── */}
        {detailTab === "suppliers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Selected supplier card */}
            {supplier ? (
              <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2436" }}>{supplier}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Selected distributor</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!isView && <GhostBtn onClick={() => setShowComparisonFor(filledLines[0]?.medicineName ?? "Paracetamol 500mg")}>Change Distributor</GhostBtn>}
                  </div>
                </div>
                {(() => {
                  const policy = DISTRIBUTOR_POLICIES[supplier];
                  const tiles = [
                    { label: "Min Expiry", value: policy?.minExpiry ?? "12 months", ok: undefined as boolean | undefined },
                    { label: "Expiry Return", value: policy ? (policy.expiryReturn ? "Allowed" : "Not Allowed") : "—", ok: policy?.expiryReturn },
                    { label: "Damage Return", value: policy ? (policy.damageReturn ? "Allowed" : "Not Allowed") : "—", ok: policy?.damageReturn },
                    { label: "Default Scheme", value: "10 + 1", ok: undefined },
                    { label: "Payment Terms", value: paymentTerms, ok: undefined },
                    { label: "Return Window", value: policy?.returnWindow ?? "30 days", ok: undefined },
                    { label: "Min Order Value", value: "₹5,000", ok: undefined },
                    { label: "Lead Time", value: "2-3 Days", ok: undefined },
                    { label: "Credit Limit", value: "₹2,00,000", ok: undefined },
                  ];
                  return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {tiles.map(t => (
                    <div key={t.label} style={{ border: "1px solid #E8ECF4", padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.ok === true ? "#2E7D32" : t.ok === false ? "#C62828" : "#1A2436", marginTop: 3 }}>{t.value}</div>
                    </div>
                  ))}
                </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "32px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#9CA3AF" }}>No distributor selected. Choose a distributor from the header.</div>
              </div>
            )}

            {/* Alternative suppliers comparison */}
            <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Alternative Distributors</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Ranked by best overall score</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Distributor</Th>
                    <Th right>Avg Rate</Th>
                    <Th>Scheme</Th>
                    <Th>Lead Time</Th>
                    <Th>Rating</Th>
                    <Th>Availability</Th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.filter(s => s.name !== supplier).slice(0, 4).map(s => (
                    <TableRow key={s.id} onClick={() => !isView && setSupplier(s.name)}>
                      <Td bold>{s.name}</Td>
                      <Td mono right>—</Td>
                      <Td>10 + 1</Td>
                      <Td>2-3 Days</Td>
                      <Td mono>{s.rating} / 5</Td>
                      <Td><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#E8F5E9", color: "#2E7D32" }}>Available</span></Td>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Supply tab ── */}
        {detailTab === "supply" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { label: "Ordered", value: String(initialData?.items ?? filledLines.length), color: "#1A2436" },
                { label: "Confirmed", value: String(initialData?.items ?? 0), color: "#1B6CA8" },
                { label: "Supplied", value: String(initialData?.received ?? 0), color: "#2E7D32" },
                { label: "Pending", value: String(initialData?.pending ?? filledLines.length), color: (initialData?.pending ?? filledLines.length) > 0 ? "#C62828" : "#9CA3AF" },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{kpi.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color, fontFamily: "JetBrains Mono", marginTop: 4 }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436" }}>Per-line Supply Status</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <Th>Medicine</Th>
                      <Th right>Ordered</Th>
                      <Th right>Confirmed</Th>
                      <Th right>Supplied</Th>
                      <Th right>Pending</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filledLines.map(l => {
                      const supplied = isView ? Math.floor(l.orderQty * ((initialData?.received ?? 0) / Math.max(initialData?.items ?? 1, 1))) : 0;
                      const pending = l.orderQty - supplied;
                      return (
                        <TableRow key={l.id}>
                          <Td bold>{l.medicineName}</Td>
                          <Td mono right>{l.orderQty}</Td>
                          <Td mono right>{l.orderQty}</Td>
                          <Td mono right color={supplied > 0 ? "#2E7D32" : "#9CA3AF"}>{supplied}</Td>
                          <Td mono right bold={pending > 0} color={pending > 0 ? "#C62828" : "#9CA3AF"}>{pending}</Td>
                          <Td><Pill status={pending === 0 ? "Completed" : supplied > 0 ? "Partially Received" : "Pending"} /></Td>
                        </TableRow>
                      );
                    })}
                    {filledLines.length === 0 && (
                      <EmptyTableRow colSpan={6} message="No items added to this PO yet." />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Invoice tab ── */}
        {detailTab === "invoice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {relatedInvoices.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "32px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", marginBottom: 6 }}>No Invoice Uploaded</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>Upload the distributor invoice to match against this PO and trigger payment processing.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <FieldLabel>Invoice Number</FieldLabel>
                    <TextInput placeholder="INV-XXXX" />
                  </div>
                  <div>
                    <FieldLabel>Invoice Date</FieldLabel>
                    <TextInput type="date" />
                  </div>
                  <div>
                    <FieldLabel>Invoice Amount</FieldLabel>
                    <TextInput placeholder="0.00" />
                  </div>
                </div>
                <PrimaryBtn onClick={() => {}}>Upload Invoice</PrimaryBtn>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436" }}>PO–Invoice Matching</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <Th>Invoice #</Th>
                      <Th>Date</Th>
                      <Th right>PO Value</Th>
                      <Th right>Invoice Total</Th>
                      <Th right>Variance</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedInvoices.map(inv => {
                      const variance = inv.total - (initialData?.orderValue ?? total);
                      return (
                        <TableRow key={inv.id}>
                          <Td mono bold color="#1B6CA8">{inv.id}</Td>
                          <Td mono>{formatDMY(inv.date)}</Td>
                          <Td mono right>{money(initialData?.orderValue ?? total)}</Td>
                          <Td mono right>{money(inv.total)}</Td>
                          <Td mono right bold color={Math.abs(variance) > 50 ? "#C62828" : "#2E7D32"}>
                            {variance > 0 ? "+" : ""}{money(variance)}
                          </Td>
                          <Td><Pill status={inv.status} /></Td>
                        </TableRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Timeline tab ── */}
        {detailTab === "timeline" && (
          <div style={{ background: "#fff", border: "1px solid #E8ECF4", padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2436", marginBottom: 16 }}>Event Timeline</div>
            {[
              { date: formatDMY(initialData?.date ?? TODAY), event: "Purchase Order Created", user: "Amit", desc: `PO created for ${supplier || "distributor"}`, color: "#1B6CA8" },
              ...(poStatus !== "Draft" ? [{ date: formatDMY(initialData?.date ?? TODAY), event: "Submitted for Approval", user: "Amit", desc: "Sent to manager for approval", color: "#E65100" }] : []),
              ...(["Approved", "Sent", "Partially Received", "Completed"].includes(poStatus) ? [{ date: formatDMY(initialData?.date ?? TODAY), event: "Approved", user: "Manager", desc: "PO approved and ready to send", color: "#2E7D32" }] : []),
              ...(["Sent", "Partially Received", "Completed"].includes(poStatus) ? [{ date: formatDMY(initialData?.date ?? TODAY), event: "Sent to Distributor", user: "Amit", desc: `PO sent via email to ${supplier}`, color: "#1B6CA8" }] : []),
              ...(relatedInvoices.map(inv => ({ date: formatDMY(inv.date), event: `Invoice Received — ${inv.id}`, user: "System", desc: `${money(inv.total)} · ${inv.status}`, color: "#6B7280" }))),
              ...(["Partially Received", "Completed"].includes(poStatus) ? [{ date: formatDMY(expectedDelivery), event: "GRN Initiated", user: "Warehouse", desc: "Goods received and verification started", color: "#6B7280" }] : []),
              ...(poStatus === "Partially Received" ? [{ date: formatDMY(expectedDelivery), event: "Partially Received", user: "Warehouse", desc: `${initialData?.received ?? 0} of ${initialData?.items ?? 0} items verified`, color: "#E65100" }] : []),
              ...(poStatus === "Completed" ? [{ date: formatDMY(expectedDelivery), event: "PO Completed", user: "System", desc: "All items received and verified", color: "#2E7D32" }] : []),
            ].map((evt, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 16, marginBottom: 4 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: evt.color, flexShrink: 0, marginTop: 4 }} />
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: "#EEF1F6", marginTop: 4, minHeight: 28 }} />}
                </div>
                <div style={{ paddingBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{evt.event}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }}>{evt.desc}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontFamily: "JetBrains Mono" }}>{evt.date} · {evt.user}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Items ── */}
        <div style={{ background: "#fff", border: "1px solid #E8ECF4", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Line Items</span>
                <span style={{ padding: "2px 10px", background: "#E0F7FA", color: "#00838F", fontSize: 12, fontWeight: 700, fontFamily: "Inter" }}>
                  {filledLines.length} items
                </span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 172 }} />
                  <col style={{ width: 78 }} />
                  <col style={{ width: 64 }} />
                  <col style={{ width: 84 }} />
                  <col style={{ width: 82 }} />
                  <col style={{ width: 82 }} />
                  <col style={{ width: 76 }} />
                  <col style={{ width: 76 }} />
                  <col style={{ width: 62 }} />
                  <col style={{ width: 82 }} />
                  <col style={{ width: 76 }} />
                  <col style={{ width: 92 }} />
                  {!isView && <col style={{ width: 36 }} />}
                </colgroup>
                <thead>
                  <tr>
                    <Th>Medicine</Th>
                    <Th>Pack</Th>
                    <Th right>Stock</Th>
                    <Th right>Avg Sales</Th>
                    <Th right tooltip={{ formula: "Sugg Qty = (Avg Daily Sales × Cover Days)\n           + Safety Stock\n           − Current Stock\n           − Stock on PO", example: "40/day × 30d + 20 − 120 − 0 = 1,130" }}>Sugg Qty</Th>
                    <Th right>Order Qty</Th>
                    <Th right>Rate</Th>
                    <Th>Scheme</Th>
                    <Th right>Free</Th>
                    <Th right tooltip={{ formula: "Eff Cost = (Qty × Rate) ÷ (Qty + Free)", example: "(400 × ₹1.80) ÷ (400 + 40) = ₹1.64" }}>Eff Cost</Th>
                    <Th right tooltip={{ formula: "Margin % = (MRP − Eff Cost) ÷ MRP × 100", example: "(₹3.50 − ₹1.64) ÷ ₹3.50 × 100 = 53.2%" }}>Margin</Th>
                    <Th right tooltip={{ formula: "Total = Order Qty × Rate\n(before free goods)", example: "400 × ₹1.80 = ₹720.00" }}>Total</Th>
                    {!isView && <Th center></Th>}
                  </tr>
                </thead>
                <tbody>
                  {poLines.filter(l => !lineSearch || l.medicineName.toLowerCase().includes(lineSearch.toLowerCase())).map(l => {
                    const effCost = calcEffectiveCost(l.purchaseRate, l.scheme, l.orderQty);
                    const margin = calcMarginPct(l.mrp, effCost);
                    const lineTotal = l.orderQty * l.purchaseRate;
                    const isEmpty = !l.medicineName.trim();
                    return (
                      <tr key={l.id} style={{ borderBottom: "1px solid #F4F6FA", background: isEmpty ? "#FAFBFD" : "transparent" }}>
                        <td style={{ padding: "8px 10px", position: "relative", overflow: isEmpty ? "visible" : "hidden" }}>
                          {isEmpty ? (
                            <POLineSearch
                              onSelect={m => {
                                const rec = calcRecommendedQty(m.name, m.totalQty, supplier);
                                setPoLines(prev => prev.map(pl => pl.id === l.id ? {
                                  ...pl,
                                  medicineName: m.name,
                                  pack: m.pack,
                                  currentStock: m.totalQty,
                                  mrp: m.price,
                                  purchaseRate: m.cost,
                                  gst: m.gst,
                                  suggestedQty: rec.qty,
                                  avgSales: `${rec.avgSalesPerDay}/day`,
                                  stockOnPO: rec.stockOnPO,
                                  pendingOrders: rec.pendingOrders,
                                  branchStock: rec.branchStock,
                                  nearExpiryQty: rec.nearExpiryQty,
                                  safetyStock: rec.safetyStock,
                                } : pl));
                                if (!poLines.some(pl => pl.id !== l.id && !pl.medicineName.trim())) {
                                  setPoLines(prev => [newEmptyPOLine(nextLineId.current++), ...prev]);
                                }
                              }}
                              onAddMedicine={q => { setAddMedInitialName(q); setShowAddMedDrawer(true); }}
                            />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button onClick={() => setShowMedDetails(l.medicineName)}
                                style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontSize: 13, fontWeight: 600, fontFamily: "Inter", textAlign: "left" }}>
                                {l.medicineName}
                              </button>
                              {MEDICINE_RECS[l.medicineName]?.length > 0 && (
                                <button
                                  onClick={() => setShowRecommendFor(l.medicineName)}
                                  title="Distributor Recommendations"
                                  style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "#0D9488", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "Inter", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1 }}>
                                  R
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.pack || "—"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", color: l.currentStock < 20 ? "#E65100" : "#6B7280" }}>{isEmpty ? "—" : l.currentStock}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{l.avgSales || "—"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", position: "relative" }}>
                          {l.suggestedQty > 0 ? (
                            <button
                              onClick={() => setShowBreakdownFor(showBreakdownFor === l.id ? null : l.id)}
                              title="Click to see qty breakdown"
                              style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: "#1B6CA8", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600 }}>
                              {l.suggestedQty}
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#9CA3AF" }}>—</span>
                          )}
                          {showBreakdownFor === l.id && (
                            <OrderQtyBreakdown
                              line={l}
                              distributorName={supplier}
                              onUse={() => {
                                setPoLines(prev => prev.map(pl => pl.id === l.id ? { ...pl, orderQty: pl.suggestedQty } : pl));
                                setShowBreakdownFor(null);
                              }}
                              onClose={() => setShowBreakdownFor(null)}
                            />
                          )}
                        </td>
                        <td style={{ padding: "4px 8px" }}>
                          {isView ? (
                            <span style={{ display: "block", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>{l.orderQty}</span>
                          ) : (
                            <input type="number" value={l.orderQty || ""} min={0}
                              onChange={e => updatePOLine(l.id, "orderQty", parseInt(e.target.value) || 0)}
                              style={{ width: "100%", padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none", boxSizing: "border-box" }}
                              onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                              onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                          )}
                        </td>
                        <td style={{ padding: "4px 8px" }}>
                          {isView ? (
                            <span style={{ display: "block", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{money(l.purchaseRate)}</span>
                          ) : (
                            <input type="number" value={l.purchaseRate || ""} min={0} step={0.01}
                              onChange={e => updatePOLine(l.id, "purchaseRate", parseFloat(e.target.value) || 0)}
                              style={{ width: "100%", padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, fontFamily: "JetBrains Mono", textAlign: "right", outline: "none", boxSizing: "border-box" }}
                              onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                              onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                          )}
                        </td>
                        <td style={{ padding: "4px 8px" }}>
                          {isView ? (
                            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: l.scheme ? "#1B6CA8" : "#9CA3AF" }}>{l.scheme || "—"}</span>
                          ) : (
                            <input value={l.scheme} placeholder="10+1"
                              onChange={e => updatePOLine(l.id, "scheme", e.target.value)}
                              style={{ width: "100%", padding: "5px 6px", border: "1px solid #E8ECF4", fontSize: 12, fontFamily: "JetBrains Mono", outline: "none", boxSizing: "border-box" }}
                              onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                              onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")} />
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", color: l.freeQty > 0 ? "#2E7D32" : "#9CA3AF", fontWeight: l.freeQty > 0 ? 700 : 400 }}>{l.freeQty > 0 ? `+${l.freeQty}` : "—"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>
                          <button onClick={() => setShowPriceHistoryFor(l.medicineName)}
                            style={{ border: "none", background: "transparent", padding: 0, cursor: isEmpty ? "default" : "pointer", color: "#1A2436", fontFamily: "JetBrains Mono", fontSize: 12 }}>
                            {isEmpty ? "—" : money(effCost)}
                          </button>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: margin < 15 ? "#C62828" : margin > 25 ? "#2E7D32" : "#E65100" }}>
                          {isEmpty ? "—" : `${margin.toFixed(1)}%`}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: "#1A2436" }}>
                          {isEmpty ? "—" : money(lineTotal)}
                        </td>
                        {!isView && (
                          <td style={{ padding: "8px 4px", textAlign: "center" }}>
                            {!isEmpty && (
                              <button onClick={() => deletePOLine(l.id)}
                                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 16, padding: "0 4px", lineHeight: 1 }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#C62828")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}>×</button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* ── Add Medicine Drawer ── */}
      {showAddMedDrawer && (
        <AddMedicineDrawer
          initialName={addMedInitialName}
          onClose={() => setShowAddMedDrawer(false)}
          onSaved={name => {
            setPoLines(prev => {
              const emptyLine = prev.find(l => !l.medicineName.trim());
              if (emptyLine) {
                return prev.map(l => l.id === emptyLine.id ? { ...l, medicineName: name } : l);
              }
              return prev;
            });
            setShowAddMedDrawer(false);
          }}
        />
      )}

      {/* ── Distributor Details Drawer ── */}
      {showDistributorDrawer && (() => {
        const distInfo = suppliers.find(s => s.name === supplier);
        const distPOs = purchaseOrders.filter(o => o.supplier === supplier);
        const distInvoices = purchaseInvoices.filter(i => i.supplier === supplier);
        const distReturns = purchaseReturns.filter(r => r.supplier === supplier);
        const DIST_TABS: { id: typeof distDrawerTab; label: string; count?: number }[] = [
          { id: "overview", label: "Overview" },
          { id: "po", label: "PO Ordered", count: distPOs.length },
          { id: "invoice", label: "Purchase Invoice", count: distInvoices.length },
          { id: "return", label: "Purchase Return", count: distReturns.length },
        ];
        return (
          <>
            <div onClick={() => setShowDistributorDrawer(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,22,44,0.35)", zIndex: 100 }} />
            <aside style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: 520, background: "#fff", zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.10)" }}>
              {/* Drawer header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 700, color: "#1A2436" }}>{supplier || "Distributor"}</div>
                  {distInfo && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{distInfo.contact} · {distInfo.phone}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setShowEditDistributor(true)}
                    style={{ padding: "7px 14px", border: "1px solid #DDE3EC", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#1A2436", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 1.5a1.414 1.414 0 0 1 2 2L4 11H1.5V8.5L9.5 1.5Z" stroke="#1A2436" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Edit Distributor
                  </button>
                  <button onClick={() => setShowDistributorDrawer(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 22, lineHeight: 1, padding: "0 2px" }}>×</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #EEF1F6", flexShrink: 0 }}>
                {DIST_TABS.map(t => (
                  <button key={t.id} onClick={() => setDistDrawerTab(t.id)}
                    style={{
                      padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      fontFamily: "Inter", background: "transparent",
                      color: distDrawerTab === t.id ? "#1B6CA8" : "#6B7280",
                      borderBottom: distDrawerTab === t.id ? "2px solid #1B6CA8" : "2px solid transparent",
                      display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                    }}>
                    {t.label}
                    {t.count !== undefined && (
                      <span style={{ padding: "1px 6px", fontSize: 10, fontFamily: "JetBrains Mono", fontWeight: 700, background: distDrawerTab === t.id ? "#EFF6FF" : "#F0F3F7", color: distDrawerTab === t.id ? "#1B6CA8" : "#9CA3AF" }}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

                {/* ── Overview tab ── */}
                {distDrawerTab === "overview" && (
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
                    {distInfo && (
                      <div style={{ background: "#F8FAFC", border: "1px solid #EEF1F6", padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Contact Information</div>
                        {[
                          { label: "Contact Person", value: distInfo.contact },
                          { label: "Email", value: distInfo.email },
                          { label: "Phone", value: distInfo.phone },
                          { label: "Notify Channel", value: distInfo.notifyChannel ?? "—" },
                          { label: "Address", value: distInfo.address },
                          { label: "Rating", value: `${"★".repeat(Math.round(distInfo.rating))} ${distInfo.rating}` },
                        ].map(r => (
                          <div key={r.label} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, minWidth: 110, flexShrink: 0 }}>{r.label}</div>
                            <div style={{ fontSize: 12, color: r.label === "Notify Channel" ? "#1B6CA8" : "#1A2436", fontWeight: r.label === "Notify Channel" ? 600 : 500 }}>{r.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Business rules */}
                    {(() => {
                      const pol = DISTRIBUTOR_POLICIES[supplier];
                      const expiryReturnValue = pol ? (pol.expiryReturn ? "Allowed" : "Not Allowed") : "Allowed";
                      const damageReturnValue = pol ? (pol.damageReturn ? "Allowed — report within 48 hrs" : "Not Allowed") : "Allowed — report within 48 hrs";
                      const expiryReturnOk = pol ? pol.expiryReturn : true;
                      const damageReturnOk = pol ? pol.damageReturn : true;
                      const rules = [
                        { label: "Payment Terms", value: "Credit 30 Days", highlight: undefined as boolean | undefined },
                        { label: "Min Expiry on Goods", value: pol ? `${pol.minExpiry} from delivery` : "12 months from delivery", highlight: undefined },
                        { label: "Expiry Return Policy", value: expiryReturnValue, highlight: expiryReturnOk },
                        { label: "Damage Return Policy", value: damageReturnValue, highlight: damageReturnOk },
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
                        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: i < 7 ? "1px solid #F4F6FA" : undefined, background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>{r.label}</span>
                          <span style={{ fontSize: 12, color: r.highlight === true ? "#2E7D32" : r.highlight === false ? "#C62828" : "#1A2436", fontWeight: 600, textAlign: "right", maxWidth: 220 }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                      );
                    })()}

                    {/* Delivery & ordering schedule */}
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
                {distDrawerTab === "po" && (
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
                {distDrawerTab === "invoice" && (
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
                {distDrawerTab === "return" && (
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

      {/* ── Add New Distributor Drawer ── */}
      {showAddSupplier && (
        <AddDistributorDrawer
          onClose={() => setShowAddSupplier(false)}
          onSaved={name => { setSupplierList(prev => [...prev, name]); setSupplier(name); }}
        />
      )}

      {/* ── Edit Distributor Drawer ── */}
      {showEditDistributor && (() => {
        const distInfo = suppliers.find(s => s.name === supplier);
        const prefill: Partial<DistributorFormData> = distInfo ? {
          name: distInfo.name,
          contactPerson: distInfo.contact,
          email: distInfo.email,
          phone: distInfo.phone,
          addressLine1: distInfo.address,
          paymentTerms: paymentTerms,
        } : { name: supplier };
        return (
          <AddDistributorDrawer
            initialData={prefill}
            onClose={() => setShowEditDistributor(false)}
            onSaved={name => { setSupplierList(prev => prev.includes(name) ? prev : [...prev, name]); setShowEditDistributor(false); }}
          />
        );
      })()}

      {/* ── Supplier Comparison Drawer ── */}
      {showComparisonFor && (
        <SupplierComparisonDrawer medicine={showComparisonFor} onClose={() => setShowComparisonFor(null)} />
      )}

      {/* ── Approval Modal ── */}
      {showApprovalDrawer && (
        <Modal title="Submit for Approval" onClose={() => setShowApprovalDrawer(false)} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "PO Total", value: money(total) },
                { label: "Items", value: String(filledLines.length) },
                { label: "Distributor", value: supplier || "—" },
                { label: "Expected Margin", value: "—" },
              ].map(item => (
                <div key={item.label} style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{item.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2436", fontFamily: "JetBrains Mono", marginTop: 3 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div>
              <FieldLabel>Approver</FieldLabel>
              <DropdownSelect value="Manager" onChange={() => {}} options={["Manager", "Senior Manager", "Finance Head"]} />
            </div>
            <div>
              <FieldLabel>Reason / Note (Optional)</FieldLabel>
              <textarea value={approvalReason} onChange={e => setApprovalReason(e.target.value)}
                placeholder="Add a note for the approver..."
                style={{ width: "100%", minHeight: 90, padding: "10px 12px", border: "1px solid #E8ECF4", fontSize: 13, outline: "none", fontFamily: "Inter", resize: "vertical", boxSizing: "border-box" as const }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1B6CA8")}
                onBlur={e => (e.currentTarget.style.borderColor = "#E8ECF4")}
              />
            </div>
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <GhostBtn onClick={() => setShowApprovalDrawer(false)}>Cancel</GhostBtn>
              <div style={{ flex: 1 }}>
                <PrimaryBtn onClick={() => {
                  const distInfo = suppliers.find(s => s.name === supplier);
                  const channel = distInfo?.notifyChannel ?? "Email";
                  const sent = Math.random() > 0.2;
                  setPoStatus("Pending Approval");
                  setShowApprovalDrawer(false);
                  if (sent) {
                    const msg = channel === "WhatsApp"
                      ? `WhatsApp message sent successfully to ${supplier}`
                      : `Email sent successfully to ${supplier}`;
                    onBack({ type: "success", message: msg });
                  } else {
                    const err = channel === "WhatsApp"
                      ? `Failed to send WhatsApp message to ${supplier}. Please try again.`
                      : `Failed to send email to ${supplier}. Please check the address and retry.`;
                    onBack({ type: "error", message: err });
                  }
                }}>
                  Send
                </PrimaryBtn>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Send to Distributor Modal ── */}
      {showSendModal && (
        <Modal title="Send Purchase Order" onClose={() => setShowSendModal(false)} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "12px 14px", marginBottom: 4 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Sending</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2436", marginTop: 2 }}>{poId} · {supplier}</div>
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="supplier@example.com" />
            </div>
            <div>
              <FieldLabel>WhatsApp (Optional)</FieldLabel>
              <TextInput value={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF4", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#6B7280" }}>Download PDF copy</span>
              <button style={{ border: "1px solid #E8ECF4", background: "#fff", padding: "6px 14px", fontSize: 12, cursor: "pointer", color: "#1A2436", fontFamily: "Inter" }}>Download</button>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <GhostBtn onClick={() => setShowSendModal(false)}>Cancel</GhostBtn>
              <PrimaryBtn onClick={() => { setPoStatus("Sent"); setShowSendModal(false); }}>Send PO</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Distributor Recommendation Panel ── */}
      {showRecommendFor && (() => {
        const recs = MEDICINE_RECS[showRecommendFor] ?? [];
        const bestScore = recs.length > 0 ? Math.max(...recs.map(r => r.score)) : 0;
        return (
          <>
            <div onClick={() => setShowRecommendFor(null)}
              style={{ position: "fixed", top: 50, left: "var(--sidebar-w, 228px)", right: 0, bottom: 76, background: "rgba(10,22,44,0.25)", zIndex: 60 }} />
            <div style={{ position: "fixed", left: "var(--sidebar-w, 228px)", right: 0, bottom: 76, zIndex: 61, background: "#fff", borderTop: "2px solid #E8ECF4", display: "flex", flexDirection: "column", maxHeight: 340, boxShadow: "0 -6px 24px rgba(0,0,0,0.10)" }}>
              {/* Header */}
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #EEF1F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#0D9488", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "Inter" }}>R</span>
                  </div>
                  <span style={{ fontFamily: "Outfit", fontSize: 14, fontWeight: 700, color: "#1A2436" }}>Distributor Recommendations</span>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>— {showRecommendFor} · {recs.length} suppliers compared</span>
                </div>
                <button onClick={() => setShowRecommendFor(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", fontSize: 20, lineHeight: 1 }}>×</button>
              </div>

              {/* Table */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
                {recs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>No recommendation data available for this medicine.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        {["Distributor", "Purchase Rate", "MRP", "Scheme", "Eff Cost", "Margin", "Expiry Return", "Return Period", "Damage Return", "Min Expiry", "Availability", "Score", ""].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: h === "Purchase Rate" || h === "MRP" || h === "Eff Cost" || h === "Margin" || h === "Score" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #E8ECF4", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#F8FAFC", zIndex: 1 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recs.map((rec, i) => {
                        const isBest = rec.score === bestScore;
                        const effCost = calcEffectiveCost(rec.rate, rec.scheme, 10);
                        const margin = calcMarginPct(rec.mrp, effCost);
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #F4F6FA", background: isBest ? "#F0FDF4" : "transparent" }}>
                            <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2436" }}>{rec.supplier}</span>
                                {isBest && <span style={{ padding: "1px 7px", background: "#DCFCE7", color: "#166534", fontSize: 10, fontWeight: 700 }}>Best</span>}
                              </div>
                            </td>
                            <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 600, color: "#1A2436" }}>{money(rec.rate)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", color: "#6B7280" }}>{money(rec.mrp)}</td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: rec.scheme ? "#1B6CA8" : "#9CA3AF", fontWeight: rec.scheme ? 600 : 400 }}>{rec.scheme || "—"}</td>
                            <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", color: "#1A2436" }}>{money(effCost)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: margin > 25 ? "#2E7D32" : margin > 15 ? "#E65100" : "#C62828" }}>{margin.toFixed(1)}%</td>
                            <td style={{ padding: "9px 12px" }}>
                              <span style={{ padding: "2px 8px", fontSize: 11, fontWeight: 700, background: rec.expiryAllowed ? "#E8F5E9" : "#FFEBEE", color: rec.expiryAllowed ? "#2E7D32" : "#C62828" }}>
                                {rec.expiryAllowed ? "Allowed" : "Not Allowed"}
                              </span>
                            </td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: rec.expiryAllowed ? "#1A2436" : "#9CA3AF" }}>{rec.expiryReturnPeriod}</td>
                            <td style={{ padding: "9px 12px" }}>
                              <span style={{ padding: "2px 8px", fontSize: 11, fontWeight: 700, background: rec.damageReturn ? "#E8F5E9" : "#FFEBEE", color: rec.damageReturn ? "#2E7D32" : "#C62828" }}>
                                {rec.damageReturn ? "Allowed" : "Not Allowed"}
                              </span>
                            </td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: "#6B7280" }}>{rec.minExpiry}</td>
                            <td style={{ padding: "9px 12px" }}>
                              <span style={{ padding: "2px 8px", fontSize: 11, fontWeight: 700, background: rec.availability === "Available" ? "#EFF6FF" : "#FFF3E0", color: rec.availability === "Available" ? "#1B6CA8" : "#E65100" }}>
                                {rec.availability}
                              </span>
                            </td>
                            <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700, color: isBest ? "#2E7D32" : "#1A2436" }}>{rec.score}</td>
                            <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                              <button
                                onClick={() => {
                                  setPoLines(prev => {
                                    const filtered = prev.filter(pl => pl.medicineName !== showRecommendFor);
                                    if (filtered.some(pl => !pl.medicineName.trim())) return filtered;
                                    return [newEmptyPOLine(nextLineId.current++), ...filtered];
                                  });
                                  setShowRecommendFor(null);
                                }}
                                style={{ padding: "5px 12px", border: "none", background: "#1B6CA8", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Inter", whiteSpace: "nowrap" }}>
                                + Add to PO
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Price History Overlay ── */}
      {showPriceHistoryFor && (
        <>
          <div onClick={() => setShowPriceHistoryFor(null)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 200 }}>
            <PriceHistoryPanel medicine={showPriceHistoryFor} onClose={() => setShowPriceHistoryFor(null)} />
          </div>
        </>
      )}

      {/* ── Cancel PO Modal ── */}
      {showCancelModal && (
        <Modal title="Cancel Purchase Order?" onClose={() => setShowCancelModal(false)} width={440}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "#C62828", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Warning</div>
              <div style={{ fontSize: 13, color: "#1A2436", marginTop: 4 }}>This will cancel <strong>{poId}</strong>. This action cannot be undone.</div>
            </div>
            <div>
              <FieldLabel>Cancellation Reason</FieldLabel>
              <DropdownSelect value={cancelReason} onChange={setCancelReason} options={CANCEL_REASONS} placeholder="Select reason..." />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <GhostBtn onClick={() => setShowCancelModal(false)}>Keep PO</GhostBtn>
              <button onClick={() => { setPoStatus("Cancelled"); setShowCancelModal(false); }}
                style={{ padding: "9px 18px", border: "none", background: "#C62828", fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "Inter", fontWeight: 600 }}>
                Cancel PO
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── PO Summary Footer ── */}
      <div style={{ flexShrink: 0, borderTop: "2px solid #E8ECF4", background: "#fff", display: "flex", alignItems: "stretch", minHeight: 76, boxShadow: "0 -4px 16px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "stretch", flex: 1, flexWrap: "nowrap", overflowX: "auto" }}>
          <EditableChip label="Cash Discount" value={poCashDiscount} onChange={setPoCashDiscount} editable prefix="-" />
          <EditableChip label="Adjustment" value={poAdjustment} onChange={setPoAdjustment} editable allowNegative />
          {[
            { label: "Items", val: String(filledLines.length), muted: true },
            { label: "Subtotal", val: money(poSubtotal), muted: true },
            { label: "Scheme Amount", val: `-${money(poSchemeAmt)}`, color: "#2E7D32" },
            { label: "GST / Tax", val: money(poTax), muted: true },
            { label: "Round Off", val: `${poRoundOff >= 0 ? "" : "-"}₹${Math.abs(poRoundOff).toFixed(2)}`, muted: true },
            { label: "Total", val: money(total), bold: true, highlight: true },
            { label: "Avg Margin", val: `${filledLines.length > 0 ? (filledLines.reduce((s, l) => s + calcMarginPct(l.mrp, calcEffectiveCost(l.purchaseRate, l.scheme, l.orderQty)), 0) / filledLines.length).toFixed(1) : "0"}%`, color: "#2E7D32" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", padding: "0 16px", borderLeft: "1px solid #EEF1F6", flex: "1 1 0", minWidth: 110 }}>
              <div>
                <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{s.label}</div>
                <div style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: s.bold ? 15 : 13,
                  fontWeight: s.bold ? 700 : 500,
                  color: s.color ?? (s.muted ? "#6B7280" : "#1A2436"),
                  background: s.highlight ? "#EFF6FF" : undefined,
                  padding: s.highlight ? "2px 6px" : undefined,
                  display: "inline-block",
                  whiteSpace: "nowrap",
                }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    </>
  );
}

export default NewPurchaseOrder;
