export interface InventoryProduct {
  id: number; name: string; category: string; manufacturer: string;
  stock: number; minStock: number; unit: string; price: number; cost: number;
  expiry: string; supplier: string; location: string; status: string;
  batchId: string; lastMove: string; schedule?: "H";
}
export const products: InventoryProduct[] = [];

export type PaymentTerms = "Cash Only" | "Net 15" | "Net 30" | "Net 60";

export interface Patient {
  id: string; name: string; dob: string; gender: string; phone: string;
  bloodGroup: string; allergies: string[]; lastVisit: string; prescriptions: number;
  balance: number; creditLimit: number; paymentTerms: PaymentTerms; creditEnabled: boolean;
  conditions: string[]; currentMedications: string[];
}
export const patients: Patient[] = [];

export const prescriptions = [
  { id: "RX-20250728-001", patient: "Margaret Thompson", patientId: "P-001", doctor: "Dr. Sarah Chen", date: "2025-07-28", status: "Dispensed", items: [{ drug: "Amoxicillin 500mg", qty: 21, days: 7 }, { drug: "Paracetamol 500mg", qty: 30, days: 10 }], total: 20.25 },
  { id: "RX-20250728-002", patient: "Robert Kiefer", patientId: "P-002", doctor: "Dr. Ahmed Hassan", date: "2025-07-28", status: "Pending", items: [{ drug: "Metformin 1000mg", qty: 60, days: 30 }], total: 19.20 },
  { id: "RX-20250727-001", patient: "David Okafor", patientId: "P-004", doctor: "Dr. Maria Santos", date: "2025-07-27", status: "Dispensed", items: [{ drug: "Amlodipine 5mg", qty: 30, days: 30 }, { drug: "Atorvastatin 20mg", qty: 30, days: 30 }], total: 37.80 },
  { id: "RX-20250727-002", patient: "Elena Vasquez", patientId: "P-005", doctor: "Dr. Sarah Chen", date: "2025-07-27", status: "Dispensed", items: [{ drug: "Sertraline 50mg", qty: 30, days: 30 }], total: 26.40 },
  { id: "RX-20250726-001", patient: "James Whitfield", patientId: "P-006", doctor: "Dr. Ahmed Hassan", date: "2025-07-26", status: "Partial", items: [{ drug: "Warfarin 5mg", qty: 30, days: 30 }, { drug: "Lisinopril 10mg", qty: 30, days: 30 }], total: 44.70 },
  { id: "RX-20250725-001", patient: "Amara Nwosu", patientId: "P-003", doctor: "Dr. Maria Santos", date: "2025-07-25", status: "Dispensed", items: [{ drug: "Salbutamol Inhaler", qty: 1, days: 30 }], total: 8.50 },
  { id: "RX-20250724-001", patient: "Marcus Adeyemi", patientId: "P-008", doctor: "Dr. Sarah Chen", date: "2025-07-24", status: "Cancelled", items: [{ drug: "Ciprofloxacin 500mg", qty: 14, days: 7 }], total: 16.80 },
  { id: "RX-20250723-001", patient: "Sofia Lindqvist", patientId: "P-007", doctor: "Dr. Ahmed Hassan", date: "2025-07-23", status: "Dispensed", items: [{ drug: "Omeprazole 20mg", qty: 30, days: 30 }], total: 18.60 },
];

export const suppliers = [
  { id: "22546341-f55e-4b88-818b-25bdfb119c53", name: "MedLine Pharma", contact: "John Harrison", email: "orders@medlinepharma.com", phone: "+1 (800) 555-1200", address: "2400 Industrial Blvd, Chicago, IL 60601", products: 145, lastOrder: "2025-07-20", balance: -3420.00, status: "Active", rating: 4.8, notifyChannel: "Email" as const },
  { id: "d8a654cb-6ee4-49c6-8535-340db198a5ee", name: "GenPharm Ltd", contact: "Lisa Nakamura", email: "supply@genpharm.co", phone: "+1 (800) 555-3400", address: "88 Pharma Way, Boston, MA 02101", products: 82, lastOrder: "2025-07-15", balance: 0.00, status: "Active", rating: 4.5, notifyChannel: "WhatsApp" as const },
  { id: "711ed9d9-2b63-4eed-86b4-4eb67644d68f", name: "PharmaCo Inc", contact: "Carlos Rivera", email: "b2b@pharmacoinc.com", phone: "+1 (800) 555-5600", address: "1200 Health Drive, Dallas, TX 75201", products: 210, lastOrder: "2025-07-22", balance: -1850.00, status: "Active", rating: 4.2, notifyChannel: "WhatsApp" as const },
  { id: "fd9f298c-1fd4-47b2-8120-7099f784196f", name: "BioPharm AG", contact: "Inga Müller", email: "orders@biopharm.ag", phone: "+49 30 555 7800", address: "Hauptstraße 45, 10115 Berlin, Germany", products: 38, lastOrder: "2025-07-08", balance: 0.00, status: "Active", rating: 4.9, notifyChannel: "Email" as const },
  { id: "e81914a4-96cb-4853-a58b-25215191bb60", name: "RespiCare Ltd", contact: "Priya Sharma", email: "sales@respicare.co.uk", phone: "+44 20 7946 0000", address: "12 Medical Quarter, London EC1A 1BB", products: 24, lastOrder: "2025-06-30", balance: -620.00, status: "Active", rating: 4.6, notifyChannel: "Email" as const },
];

export const purchaseOrders = [
  { id: "PO-2025-0142", supplier: "MedLine Pharma", date: "2025-07-22", expected: "2025-07-29", status: "Delivered", items: 8, total: 2840.50 },
  { id: "PO-2025-0141", supplier: "GenPharm Ltd", date: "2025-07-18", expected: "2025-07-25", status: "In Transit", items: 4, total: 1280.00 },
  { id: "PO-2025-0140", supplier: "PharmaCo Inc", date: "2025-07-15", expected: "2025-07-22", status: "Delivered", items: 12, total: 4120.75 },
  { id: "PO-2025-0139", supplier: "BioPharm AG", date: "2025-07-10", expected: "2025-07-24", status: "Pending Approval", items: 3, total: 6840.00 },
  { id: "PO-2025-0138", supplier: "RespiCare Ltd", date: "2025-07-08", expected: "2025-07-15", status: "Delivered", items: 2, total: 620.00 },
  { id: "PO-2025-0137", supplier: "MedLine Pharma", date: "2025-07-04", expected: "2025-07-11", status: "Delivered", items: 15, total: 5200.00 },
];

export const salesData = [
  { month: "Feb", revenue: 28400, cost: 14200, profit: 14200 },
  { month: "Mar", revenue: 31200, cost: 15600, profit: 15600 },
  { month: "Apr", revenue: 29800, cost: 14900, profit: 14900 },
  { month: "May", revenue: 34500, cost: 17250, profit: 17250 },
  { month: "Jun", revenue: 38200, cost: 19100, profit: 19100 },
  { month: "Jul", revenue: 41800, cost: 20900, profit: 20900 },
];

export const categoryData = [
  { name: "Antibiotics", value: 22 },
  { name: "Antidiabetics", value: 18 },
  { name: "Antihypertensives", value: 16 },
  { name: "Analgesics", value: 14 },
  { name: "Statins", value: 12 },
  { name: "Other", value: 18 },
];

export const recentTransactions = [
  { id: "TXN-8821", time: "14:32", patient: "Margaret Thompson", items: 2, total: 20.25, method: "Card" },
  { id: "TXN-8820", time: "13:58", patient: "Walk-in Customer", items: 1, total: 8.50, method: "Cash" },
  { id: "TXN-8819", time: "13:21", patient: "David Okafor", items: 3, total: 37.80, method: "Insurance" },
  { id: "TXN-8818", time: "12:47", patient: "Elena Vasquez", items: 1, total: 26.40, method: "Card" },
  { id: "TXN-8817", time: "12:10", patient: "Walk-in Customer", items: 4, total: 12.80, method: "Cash" },
];

export const dailySalesData = [
  { hour: "08:00", sales: 3 }, { hour: "09:00", sales: 8 }, { hour: "10:00", sales: 12 },
  { hour: "11:00", sales: 15 }, { hour: "12:00", sales: 9 }, { hour: "13:00", sales: 7 },
  { hour: "14:00", sales: 18 }, { hour: "15:00", sales: 22 }, { hour: "16:00", sales: 14 },
  { hour: "17:00", sales: 11 }, { hour: "18:00", sales: 6 }, { hour: "19:00", sales: 2 },
];
