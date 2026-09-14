export type SubTab = "claims" | "submit" | "providers" | "eligibility";

export const TABS: { id: SubTab; label: string }[] = [
  { id: "claims", label: "Claims" },
  { id: "submit", label: "Submit Claim" },
  { id: "providers", label: "Providers" },
  { id: "eligibility", label: "Eligibility Check" },
];

export const claims = [
  { id: "CLM-2025-0088", patient: "Margaret Thompson", patientId: "P-001", provider: "BlueCross BlueShield", invoice: "SINV-2025-0221", rx: "RX-20250728-001", date: "2025-07-28", submitted: "2025-07-28", amount: 20.28, approved: 16.22, copay: 4.06, status: "Approved" },
  { id: "CLM-2025-0087", patient: "David Okafor", patientId: "P-004", provider: "Aetna", invoice: "SINV-2025-0220", rx: "RX-20250727-001", date: "2025-07-27", submitted: "2025-07-27", amount: 37.85, approved: 0, copay: 0, status: "Pending" },
  { id: "CLM-2025-0086", patient: "James Whitfield", patientId: "P-006", provider: "Medicare Part D", invoice: "SINV-2025-0218", rx: "RX-20250726-001", date: "2025-07-26", submitted: "2025-07-26", amount: 18.16, approved: 9.08, copay: 9.08, status: "Partial" },
  { id: "CLM-2025-0085", patient: "Robert Kiefer", patientId: "P-002", provider: "UnitedHealthcare", invoice: "SINV-2025-0214", rx: "RX-20250722-002", date: "2025-07-22", submitted: "2025-07-22", amount: 19.20, approved: 0, copay: 0, status: "Rejected" },
  { id: "CLM-2025-0084", patient: "Sofia Lindqvist", patientId: "P-007", provider: "Cigna", invoice: "SINV-2025-0215", rx: "RX-20250723-001", date: "2025-07-23", submitted: "2025-07-23", amount: 18.63, approved: 18.63, copay: 0, status: "Paid" },
  { id: "CLM-2025-0083", patient: "Marcus Adeyemi", patientId: "P-008", provider: "BlueCross BlueShield", invoice: "SINV-2025-0212", rx: "RX-20250720-001", date: "2025-07-20", submitted: "2025-07-20", amount: 26.40, approved: 26.40, copay: 0, status: "Paid" },
];

export const providers = [
  { id: "INS-001", name: "BlueCross BlueShield", type: "Private", contracts: 142, claimsThisMonth: 28, paidAmt: 842.20, avgDays: 3.2, status: "Active" },
  { id: "INS-002", name: "Aetna", type: "Private", contracts: 98, claimsThisMonth: 15, paidAmt: 620.00, avgDays: 4.1, status: "Active" },
  { id: "INS-003", name: "UnitedHealthcare", type: "Private", contracts: 76, claimsThisMonth: 12, paidAmt: 441.80, avgDays: 5.5, status: "Active" },
  { id: "INS-004", name: "Medicare Part D", type: "Government", contracts: 210, claimsThisMonth: 42, paidAmt: 1820.40, avgDays: 6.8, status: "Active" },
  { id: "INS-005", name: "Medicaid", type: "Government", contracts: 88, claimsThisMonth: 18, paidAmt: 540.00, avgDays: 8.2, status: "Active" },
  { id: "INS-006", name: "Cigna", type: "Private", contracts: 54, claimsThisMonth: 9, paidAmt: 318.90, avgDays: 3.8, status: "Active" },
];
