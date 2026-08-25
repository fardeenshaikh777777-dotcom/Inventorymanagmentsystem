import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import { cn } from "./ui";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    num?: boolean; // right-aligned monospace column
    w?: string; // suggested width class
  }
}

function SortIc({ dir }: { dir: false | "asc" | "desc" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-3 w-3 shrink-0 transition-colors", dir ? "text-sig" : "text-faint/50")}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={dir === "asc" ? "m6 14 6-6 6 6" : "m6 10 6 6 6-6"} />
    </svg>
  );
}

interface Props<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  rowKey: (r: T) => string;
  onRow?: (r: T) => void;
  flashKey?: (r: T) => string | null;
  isFlashed?: (key: string) => boolean;
  loading?: boolean;
  empty?: ReactNode;
  initialSort?: SortingState;
  maxH?: string;
  dense?: boolean;
}

export function DataTable<T>({ data, columns, rowKey, onRow, flashKey, isFlashed, loading, empty, initialSort, maxH, dense }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  const colCount = columns.length;

  return (
    <div className="card overflow-hidden">
      <div className="scroll-thin overflow-auto" style={maxH ? { maxHeight: maxH } : undefined}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  const sorted = h.column.getIsSorted();
                  const canSort = h.column.getCanSort();
                  return (
                    <th
                      key={h.id}
                      className={cn(
                        "sticky top-0 z-10 border-b border-line bg-[#fafbfc] px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-mut whitespace-nowrap",
                        meta?.num && "text-right",
                        meta?.w
                      )}
                    >
                      {canSort ? (
                        <button
                          onClick={h.column.getToggleSortingHandler()}
                          className={cn("inline-flex items-center gap-1 uppercase tracking-[0.07em] transition-colors hover:text-ink", sorted && "text-sig")}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <SortIc dir={sorted} />
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, r) => (
                  <tr key={`sk-${r}`} className="border-t border-line">
                    {Array.from({ length: colCount }).map((_, c) => (
                      <td key={c} className="px-3 py-2.5">
                        <div className="skel h-3.5" style={{ width: `${45 + ((r * 13 + c * 29) % 45)}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => {
                  const fk = flashKey?.(row.original) ?? null;
                  return (
                    <tr
                      key={rowKey(row.original)}
                      tabIndex={onRow ? 0 : undefined}
                      onClick={onRow ? () => onRow(row.original) : undefined}
                      onKeyDown={
                        onRow
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onRow(row.original);
                              }
                            }
                          : undefined
                      }
                      className={cn(
                        "border-t border-line align-middle",
                        onRow && "cursor-pointer transition-colors hover:bg-[#f3f6fb] focus-visible:bg-[#f3f6fb]",
                        fk && isFlashed?.(fk) && "row-flash"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn("whitespace-nowrap px-3 align-middle", dense ? "py-1.5" : "py-2", cell.column.columnDef.meta?.num && "text-right")}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && data.length === 0 && empty}
      </div>
    </div>
  );
}
