import { drugs } from "../../data/mockData";

export type SubTab = "overview" | "adjustments" | "batches" | "expiry" | "transfer";

export const TABS: { id: SubTab; label: string; sub: string }[] = [
  { id: "overview", label: "Stock Overview", sub: "Current stock levels" },
  { id: "adjustments", label: "Adjustments", sub: "Write-offs & corrections" },
  { id: "batches", label: "Batch Tracking", sub: "Lot & batch tracking" },
  { id: "expiry", label: "Expiry Management", sub: "Near-expiry alerts" },
  { id: "transfer", label: "Stock Transfer", sub: "Inter-branch transfers" },
];

export const adjustments = [
  { id: "ADJ-2025-0041", date: "2025-07-25", drug: "Paracetamol 500mg", type: "Write-off", qtyBefore: 1250, qty: -50, qtyAfter: 1200, reason: "Expired stock disposal", ref: "ADJ-REF-041", by: "Jane Doe" },
  { id: "ADJ-2025-0040", date: "2025-07-22", drug: "Amoxicillin 500mg", type: "Stock Count", qtyBefore: 218, qty: +22, qtyAfter: 240, reason: "Physical stock count variance", ref: "COUNT-JUL22", by: "Mark Stevens" },
  { id: "ADJ-2025-0039", date: "2025-07-18", drug: "Metformin 1000mg", type: "Damage", qtyBefore: 30, qty: -12, qtyAfter: 18, reason: "Damaged in storage (moisture)", ref: "DMG-039", by: "Anna Kowalski" },
  { id: "ADJ-2025-0038", date: "2025-07-15", drug: "Ciprofloxacin 500mg", type: "Write-off", qtyBefore: 20, qty: -8, qtyAfter: 12, reason: "Near-expiry disposal", ref: "WO-038", by: "Jane Doe" },
  { id: "ADJ-2025-0037", date: "2025-07-10", drug: "Warfarin 5mg", type: "Stock Count", qtyBefore: 10, qty: -4, qtyAfter: 6, reason: "Physical count — missing units", ref: "COUNT-JUL10", by: "Mark Stevens" },
];

export const batches = [
  { id: "BT-2025-0118", drug: "Amoxicillin 500mg", supplier: "MedLine Pharma", received: "2025-07-29", expiry: "2026-08-15", qtyReceived: 500, qtyCurrent: 240, unit: "Capsules", location: "A1-02", status: "Active" },
  { id: "BT-2025-0117", drug: "Metformin 1000mg", supplier: "GenPharm Ltd", received: "2025-07-15", expiry: "2025-12-31", qtyReceived: 200, qtyCurrent: 18, unit: "Tablets", location: "B3-05", status: "Low" },
  { id: "BT-2025-0116", drug: "Insulin Glargine", supplier: "BioPharm AG", received: "2025-07-10", expiry: "2025-10-15", qtyReceived: 60, qtyCurrent: 45, unit: "Vial", location: "COLD-01", status: "Expiring Soon" },
  { id: "BT-2025-0115", drug: "Atorvastatin 20mg", supplier: "MedLine Pharma", received: "2025-07-01", expiry: "2027-01-10", qtyReceived: 600, qtyCurrent: 312, unit: "Tablets", location: "C1-04", status: "Active" },
  { id: "BT-2025-0114", drug: "Warfarin 5mg", supplier: "PharmaCo Inc", received: "2025-06-20", expiry: "2026-04-01", qtyReceived: 100, qtyCurrent: 6, unit: "Tablets", location: "B4-02", status: "Low" },
  { id: "BT-2025-0113", drug: "Ciprofloxacin 500mg", supplier: "PharmaCo Inc", received: "2025-06-15", expiry: "2025-11-20", qtyReceived: 120, qtyCurrent: 12, unit: "Tablets", location: "A1-06", status: "Expiring Soon" },
];

export const expiryItems = [...drugs]
  .map(d => ({ ...d, daysLeft: Math.round((new Date(d.expiry).getTime() - new Date("2025-07-28").getTime()) / 86400000) }))
  .sort((a, b) => a.daysLeft - b.daysLeft);
