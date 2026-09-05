import { useState, useMemo } from "react";

export function useTableSort<T extends Record<string, any>>(
  rows: T[],
  defaultCol: string | null = null,
  defaultDir: "asc" | "desc" = "asc"
) {
  const [sortCol, setSortCol] = useState<string | null>(defaultCol);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortCol, sortDir]);

  return { sortCol, sortDir, handleSort, sorted };
}
