import { useState } from "react";

export function usePagination<T>(rows: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize;
  const end = Math.min(safePage * pageSize, total);
  const pageRows = rows.slice(start, end);
  return {
    pageRows,
    footerProps: {
      total,
      page: safePage,
      pageSize,
      totalPages,
      startLabel: total === 0 ? 0 : start + 1,
      endLabel: end,
      onPageChange: (p: number) => setPage(Math.min(Math.max(1, p), totalPages)),
      onPageSizeChange: (n: number) => { setPageSize(n); setPage(1); },
    },
  };
}

export type PaginationFooterProps = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  startLabel: number;
  endLabel: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
};

export function PaginationFooter({
  total, page, pageSize, totalPages, startLabel, endLabel, onPageChange, onPageSizeChange,
}: PaginationFooterProps) {
  const btn = (label: string, target: number, disabled: boolean) => (
    <button
      key={label}
      onClick={() => onPageChange(target)}
      disabled={disabled}
      style={{
        padding: "4px 10px",
        border: "1px solid #E8ECF4",
        background: "#fff",
        cursor: disabled ? "default" : "pointer",
        color: disabled ? "#C8CDD8" : "#1A2436",
        fontSize: 12,
        fontFamily: "Inter",
        minWidth: 28,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{
      padding: "8px 14px",
      borderTop: "1px solid #EEF1F6",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#FAFBFD",
      fontSize: 12,
      color: "#6B7280",
      fontFamily: "Inter",
      flexShrink: 0,
    }}>
      <div>Showing {startLabel}–{endLabel} of {total}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            style={{ padding: "3px 6px", border: "1px solid #E8ECF4", fontSize: 12, background: "#fff", fontFamily: "Inter" }}
          >
            {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {btn("«", 1, page === 1)}
          {btn("‹", page - 1, page === 1)}
          <span style={{ padding: "0 8px", fontFamily: "JetBrains Mono", color: "#1A2436" }}>{page} / {totalPages}</span>
          {btn("›", page + 1, page >= totalPages)}
          {btn("»", totalPages, page >= totalPages)}
        </div>
      </div>
    </div>
  );
}
