export type SubTab = "staff" | "attendance" | "payroll" | "leave";

export const TABS: { id: SubTab; label: string }[] = [
  { id: "staff", label: "Staff Directory" },
  { id: "attendance", label: "Attendance" },
  { id: "payroll", label: "Payroll" },
  { id: "leave", label: "Leave Management" },
];

export const staff = [
  { id: "EMP-001", name: "Jane Doe", role: "Head Pharmacist", dept: "Pharmacy", phone: "+1 555-801-2200", email: "jane.doe@citycentralpharmacy.com", start: "2018-03-01", salary: 7200, status: "Active", license: "RPH-IL-04421" },
  { id: "EMP-002", name: "Mark Stevens", role: "Pharmacist", dept: "Pharmacy", phone: "+1 555-801-2201", email: "mark.s@citycentralpharmacy.com", start: "2020-06-15", salary: 5800, status: "Active", license: "RPH-IL-05512" },
  { id: "EMP-003", name: "Anna Kowalski", role: "Pharmacy Technician", dept: "Pharmacy", phone: "+1 555-801-2202", email: "anna.k@citycentralpharmacy.com", start: "2021-09-01", salary: 3400, status: "Active", license: "CPhT-IL-1122" },
  { id: "EMP-004", name: "Leo Pham", role: "Cashier", dept: "Sales", phone: "+1 555-801-2203", email: "leo.p@citycentralpharmacy.com", start: "2023-01-10", salary: 2400, status: "Active", license: null },
  { id: "EMP-005", name: "Rachel Hunt", role: "Admin & Billing", dept: "Admin", phone: "+1 555-801-2204", email: "rachel.h@citycentralpharmacy.com", start: "2019-11-20", salary: 3200, status: "Inactive", license: null },
];

export const attendanceData = [
  { id: "EMP-001", name: "Jane Doe", role: "Head Pharmacist", mon: "✓", tue: "✓", wed: "✓", thu: "✓", fri: "✓", sat: "—", sun: "—", hrs: 40, overtime: 0 },
  { id: "EMP-002", name: "Mark Stevens", role: "Pharmacist", mon: "✓", tue: "✓", wed: "✓", thu: "L", fri: "✓", sat: "✓", sun: "—", hrs: 40, overtime: 8 },
  { id: "EMP-003", name: "Anna Kowalski", role: "Pharmacy Tech", mon: "✓", tue: "✓", wed: "A", thu: "✓", fri: "✓", sat: "—", sun: "—", hrs: 32, overtime: 0 },
  { id: "EMP-004", name: "Leo Pham", role: "Cashier", mon: "✓", tue: "✓", wed: "✓", thu: "✓", fri: "✓", sat: "✓", sun: "✓", hrs: 48, overtime: 8 },
  { id: "EMP-005", name: "Rachel Hunt", role: "Admin", mon: "—", tue: "—", wed: "—", thu: "—", fri: "—", sat: "—", sun: "—", hrs: 0, overtime: 0 },
];

export const payrollData = [
  { id: "EMP-001", name: "Jane Doe", role: "Head Pharmacist", base: 7200, allowance: 400, overtime: 0, gross: 7600, tax: 1596, insurance: 380, net: 5624 },
  { id: "EMP-002", name: "Mark Stevens", role: "Pharmacist", base: 5800, allowance: 250, overtime: 580, gross: 6630, tax: 1326, insurance: 295, net: 5009 },
  { id: "EMP-003", name: "Anna Kowalski", role: "Pharmacy Tech", base: 3400, allowance: 150, overtime: 0, gross: 3550, tax: 568, insurance: 159, net: 2823 },
  { id: "EMP-004", name: "Leo Pham", role: "Cashier", base: 2400, allowance: 100, overtime: 400, gross: 2900, tax: 464, insurance: 130, net: 2306 },
];

export const leaveData = [
  { id: "LV-2025-0021", employee: "Mark Stevens", type: "Annual Leave", from: "2025-08-04", to: "2025-08-08", days: 5, status: "Approved", approvedBy: "Jane Doe" },
  { id: "LV-2025-0020", employee: "Anna Kowalski", type: "Sick Leave", from: "2025-07-23", to: "2025-07-23", days: 1, status: "Approved", approvedBy: "Jane Doe" },
  { id: "LV-2025-0019", employee: "Leo Pham", type: "Annual Leave", from: "2025-08-11", to: "2025-08-15", days: 5, status: "Pending", approvedBy: "—" },
  { id: "LV-2025-0018", employee: "Jane Doe", type: "Conference Leave", from: "2025-09-10", to: "2025-09-12", days: 3, status: "Approved", approvedBy: "Self" },
];
