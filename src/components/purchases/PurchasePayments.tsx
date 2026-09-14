import { useState, useMemo } from "react";
import { suppliers } from "../../data/mockData";
import { Pill } from "../shared/Pill";
import { Th } from "../shared/Th";
import { usePagination, PaginationFooter } from "../shared/usePagination";
import { useTableSort } from "../shared/useTableSort";
import { DateRangePicker } from "../shared/DateRangePicker";
import {
  purchasePayments, purchaseInvoices, formatDMY, money,
  PAY_METHODS, BANK_ACCOUNTS, TODAY,
} from "./purchasesData";
import {
  Td, TableRow, FieldLabel, TextInput, DropdownSelect, PrimaryBtn, GhostBtn, Modal,
  FilterSearch, FilterDropdown, ClearFiltersButton, NewButton, EmptyTableRow,
} from "./purchasesShared";

function PurchasePaymentList({ onRecord }: { onRecord: () => void }) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => purchasePayments.filter(p => {
    const q = search.trim().toLowerCase();
    const mSearch = !q || p.id.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q) || p.invoiceRef.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q);
    const mSupplier = supplierFilter === "All" || p.supplier === supplierFilter;
    const mMethod = methodFilter === "All" || p.method === methodFilter;
    const mStatus = statusFilter === "All" || p.status === statusFilter;
    const mFrom = !fromDate || p.date >= fromDate;
    const mTo = !toDate || p.date <= toDate;
    return mSearch && mSupplier && mMethod && mStatus && mFrom && mTo;
  }), [search, supplierFilter, methodFilter, statusFilter, fromDate, toDate]);

  const { sortCol, sortDir, handleSort, sorted } = useTableSort(filtered);
  const { pageRows, footerProps } = usePagination(sorted, 10);
  const anyFilter = search || fromDate || toDate || supplierFilter !== "All" || methodFilter !== "All" || statusFilter !== "All";
  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setSupplierFilter("All"); setMethodFilter("All"); setStatusFilter("All"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E8ECF4" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6" }}>
          <div style={{ fontFamily: "Outfit", fontSize: 15, fontWeight: 700, color: "#1A2436" }}>Purchase Payments</div>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEF1F6", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSearch value={search} onChange={setSearch} placeholder="Search payment no, distributor, invoice, ref..." />
          <DateRangePicker from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          <FilterDropdown value={supplierFilter} onChange={setSupplierFilter} options={suppliers.map(s => s.name)} allLabel="All Distributors" />
          <FilterDropdown value={methodFilter} onChange={setMethodFilter} options={PAY_METHODS} allLabel="All Methods" />
          <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={["Cleared", "Pending", "Failed"]} allLabel="All Status" />
          {anyFilter && <ClearFiltersButton onClick={clearFilters} />}
          <div style={{ marginLeft: "auto" }}>
            <NewButton label="+ Record Payment" onClick={onRecord} />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th onSort={() => handleSort("id")} sortDir={sortCol === "id" ? sortDir : null}>Payment #</Th>
                <Th onSort={() => handleSort("supplier")} sortDir={sortCol === "supplier" ? sortDir : null}>Distributor</Th>
                <Th onSort={() => handleSort("invoiceRef")} sortDir={sortCol === "invoiceRef" ? sortDir : null}>Invoice</Th>
                <Th onSort={() => handleSort("date")} sortDir={sortCol === "date" ? sortDir : null}>Date</Th>
                <Th onSort={() => handleSort("method")} sortDir={sortCol === "method" ? sortDir : null}>Method</Th>
                <Th onSort={() => handleSort("bank")} sortDir={sortCol === "bank" ? sortDir : null}>Bank / Ref</Th>
                <Th right onSort={() => handleSort("amount")} sortDir={sortCol === "amount" ? sortDir : null}>Amount</Th>
                <Th right onSort={() => handleSort("balanceAfter")} sortDir={sortCol === "balanceAfter" ? sortDir : null}>Balance After</Th>
                <Th onSort={() => handleSort("status")} sortDir={sortCol === "status" ? sortDir : null}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(p => (
                <TableRow key={p.id}>
                  <Td mono color="#1B6CA8" bold>{p.id}</Td>
                  <Td bold>{p.supplier}</Td>
                  <Td mono color="#9CA3AF">{p.invoiceRef}</Td>
                  <Td mono>{formatDMY(p.date)}</Td>
                  <Td>{p.method}</Td>
                  <Td mono>{p.bank} · {p.ref}</Td>
                  <Td mono right bold color="#2E7D32">{money(p.amount)}</Td>
                  <Td mono right color={p.balanceAfter > 0 ? "#C62828" : "#9CA3AF"}>{p.balanceAfter > 0 ? money(p.balanceAfter) : "—"}</Td>
                  <Td><Pill status={p.status} /></Td>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <EmptyTableRow colSpan={9} message="No payments match your filters." />
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter {...footerProps} />
      </div>
    </div>
  );
}

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const [supplier, setSupplier] = useState("");
  const eligibleInvoices = supplier ? purchaseInvoices.filter(i => i.supplier === supplier && i.balance > 0) : [];
  return (
    <Modal title="Record Purchase Payment" onClose={onClose} width={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><FieldLabel>Distributor</FieldLabel><DropdownSelect value={supplier} onChange={setSupplier} options={suppliers.map(s => s.name)} placeholder="— Select —" /></div>
          <div><FieldLabel>Invoice</FieldLabel><DropdownSelect options={eligibleInvoices.map(i => `${i.id} — ${money(i.balance)} due`)} placeholder={supplier ? "— Select invoice —" : "Pick a distributor first"} /></div>
          <div><FieldLabel>Payment Date</FieldLabel><TextInput type="date" defaultValue={TODAY} /></div>
          <div><FieldLabel>Amount (₹)</FieldLabel><TextInput type="number" placeholder="0.00" /></div>
          <div><FieldLabel>Payment Method</FieldLabel><DropdownSelect options={PAY_METHODS} placeholder="— Select method —" /></div>
          <div><FieldLabel>Bank Account</FieldLabel><DropdownSelect options={BANK_ACCOUNTS} placeholder="— Select account —" /></div>
          <div><FieldLabel>Reference / Cheque #</FieldLabel><TextInput placeholder="e.g. TRF-0001 or CHQ-00422" /></div>
          <div><FieldLabel>Remarks</FieldLabel><TextInput placeholder="Optional" /></div>
        </div>
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 14px", fontSize: 12, color: "#92400E" }}>
          Posting will update the invoice balance and distributor account ledger.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onClose}>Post Payment</PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

export default function PurchasePayments() {
  const [recordOpen, setRecordOpen] = useState(false);
  return (
    <>
      <PurchasePaymentList onRecord={() => setRecordOpen(true)} />
      {recordOpen && <RecordPaymentModal onClose={() => setRecordOpen(false)} />}
    </>
  );
}
