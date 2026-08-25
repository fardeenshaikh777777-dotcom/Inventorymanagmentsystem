import { useEffect, useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import {
  ALL_BINS,
  ZONES,
  available,
  binZone,
  downloadText,
  matchItem,
  money,
  num,
  qty as fmtQty,
  relTime,
  statusOf,
  supName,
  toCsv,
  type Item,
  type StockStatus,
} from "../lib/data";
import { EMPTY_FILTERS, useStore, type InvFilters, type SavedView } from "../lib/store";
import { DataTable } from "../components/table";
import { Btn, EmptyState, Field, Modal, Pop, StatusDot, cn, inputCls } from "../components/ui";
import { IcChevD, IcColumns, IcDownload, IcFilter, IcPlus, IcPrinter, IcSearch, IcSwap, IcPencil, IcX } from "../components/icons";

const H = 3600_000;
const rank = (s: StockStatus) => (s === "crit" ? 2 : s === "low" ? 1 : 0);
const colH = createColumnHelper<Item>();

const ALL_COLS: { id: string; label: string; locked?: boolean }[] = [
  { id: "sku", label: "SKU" },
  { id: "name", label: "Name" },
  { id: "cat", label: "Category" },
  { id: "onHand", label: "On Hand" },
  { id: "alloc", label: "Allocated" },
  { id: "avail", label: "Available" },
  { id: "rp", label: "Reorder Pt" },
  { id: "bin", label: "Bin" },
  { id: "sup", label: "Supplier" },
  { id: "value", label: "Value" },
  { id: "lastCount", label: "Last Count" },
];

export default function Inventory() {
  const store = useStore();
  const { db, ready, openItem, hasFlash, invQuery, setInvQuery, invPreset, setInvPreset, savedViews, addSavedView, removeSavedView, toast } = store;

  const [f, setF] = useState<InvFilters>(EMPTY_FILTERS);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [vis, setVis] = useState<Record<string, boolean>>({ alloc: false, lastCount: false, value: true });
  const [popCols, setPopCols] = useState(false);
  const [popSave, setPopSave] = useState(false);
  const [viewName, setViewName] = useState("");
  const [bulk, setBulk] = useState<"" | "xfer" | "adj">("");
  const [bulkBin, setBulkBin] = useState("");
  const [bulkDelta, setBulkDelta] = useState("");
  const [bulkReason, setBulkReason] = useState("Cycle count");
  const [bulkErr, setBulkErr] = useState("");

  useEffect(() => {
    if (invQuery) {
      setF((p) => ({ ...p, q: invQuery }));
      setInvQuery("");
    }
  }, [invQuery, setInvQuery]);

  useEffect(() => {
    if (invPreset) {
      setF(invPreset);
      setInvPreset(null);
    }
  }, [invPreset, setInvPreset]);

  const filtered = useMemo(
    () =>
      db.items.filter((i) => {
        if (f.q && !matchItem(i, f.q)) return false;
        if (f.cat && i.cat !== f.cat) return false;
        if (f.zone && binZone(i.bin) !== f.zone) return false;
        if (f.status && statusOf(i) !== f.status) return false;
        if (f.sup && i.sup !== f.sup) return false;
        return true;
      }),
    [db.items, f]
  );

  const activeFilters = (f.q ? 1 : 0) + (f.cat ? 1 : 0) + (f.zone ? 1 : 0) + (f.status ? 1 : 0) + (f.sup ? 1 : 0);
  const allSel = filtered.length > 0 && filtered.every((i) => sel.has(i.sku));

  const toggle = (sku: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(sku)) n.delete(sku);
      else n.add(sku);
      return n;
    });

  const exportCsv = (rows: Item[], name: string) => {
    const csv = toCsv([
      ["SKU", "Name", "Category", "On Hand", "Allocated", "Available", "Reorder Point", "Unit", "Bin", "Supplier", "Unit Cost", "Value", "Status"],
      ...rows.map((i) => [i.sku, i.name, i.cat, i.onHand, i.alloc, available(i), i.rp, i.unit, i.bin, supName(i.sup), i.cost.toFixed(2), (i.onHand * i.cost).toFixed(2), statusOf(i)]),
    ]);
    downloadText(name, csv);
    toast(`Exported ${rows.length} rows → ${name}`);
  };

  const runBulkXfer = () => {
    if (!bulkBin) return setBulkErr("Choose a destination bin.");
    const targets = db.items.filter((i) => sel.has(i.sku));
    targets.forEach((i) => available(i) > 0 && store.transferStock(i.sku, available(i), bulkBin));
    toast(`Moved ${targets.length} SKUs to ${bulkBin}`);
    setSel(new Set());
    setBulk("");
    setBulkBin("");
    setBulkErr("");
  };

  const runBulkAdj = () => {
    const d = Number(bulkDelta);
    if (!bulkDelta || !Number.isFinite(d) || d === 0) return setBulkErr("Enter a non-zero quantity to apply.");
    const targets = db.items.filter((i) => sel.has(i.sku));
    targets.forEach((i) => store.adjustStock(i.sku, d, bulkReason));
    setSel(new Set());
    setBulk("");
    setBulkDelta("");
    setBulkErr("");
  };

  const columns = useMemo(() => {
    const show = (id: string) => vis[id] !== false;
    const defs: ColumnDef<Item, unknown>[] = [
      colH.display({
        id: "sel",
        enableSorting: false,
        meta: { w: "w-[38px]" },
        header: () => (
          <input
            type="checkbox"
            checked={allSel}
            onChange={() => setSel(allSel ? new Set() : new Set(filtered.map((i) => i.sku)))}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select all rows"
            className="h-3.5 w-3.5 cursor-pointer accent-[#2C5AA0]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={sel.has(row.original.sku)}
            onChange={() => toggle(row.original.sku)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${row.original.sku}`}
            className="h-3.5 w-3.5 cursor-pointer accent-[#2C5AA0]"
          />
        ),
      }),
      colH.accessor((i) => statusOf(i), {
        id: "status",
        enableSorting: true,
        sortingFn: (a, b) => rank(a.getValue("status")) - rank(b.getValue("status")),
        meta: { w: "w-[52px]" },
        header: "St",
        cell: ({ getValue }) => (
          <span className="flex items-center" title={getValue()}>
            <StatusDot status={getValue()} />
          </span>
        ),
      }) as ColumnDef<Item, unknown>,
    ];

    if (show("sku"))
      defs.push(
        colH.accessor("sku", {
          header: "SKU",
          cell: ({ getValue }) => <span className="mono text-[12.5px] font-semibold">{getValue()}</span>,
        }) as ColumnDef<Item, unknown>
      );
    if (show("name"))
      defs.push(
        colH.accessor("name", {
          header: "Name",
          cell: ({ getValue }) => <span className="block max-w-[240px] truncate">{getValue()}</span>,
        }) as ColumnDef<Item, unknown>
      );
    if (show("cat"))
      defs.push(
        colH.accessor("cat", {
          header: "Category",
          cell: ({ getValue }) => <span className="text-[12px] text-mut">{getValue()}</span>,
        }) as ColumnDef<Item, unknown>
      );
    if (show("onHand"))
      defs.push(
        colH.accessor("onHand", {
          header: "On Hand",
          meta: { num: true },
          cell: ({ getValue, row }) => (
            <span className="mono text-[12.5px]">
              {fmtQty(getValue())} <span className="text-[10px] text-faint">{row.original.unit}</span>
            </span>
          ),
        }) as ColumnDef<Item, unknown>
      );
    if (show("alloc"))
      defs.push(
        colH.accessor("alloc", {
          header: "Alloc",
          meta: { num: true },
          cell: ({ getValue }) => <span className="mono text-[12.5px] text-mut">{fmtQty(getValue())}</span>,
        }) as ColumnDef<Item, unknown>
      );
    if (show("avail"))
      defs.push(
        colH.accessor((i) => available(i), {
          id: "avail",
          header: "Avail",
          meta: { num: true },
          cell: ({ getValue, row }) => {
            const s = statusOf(row.original);
            return (
              <span className="mono text-[12.5px] font-bold" style={{ color: s === "ok" ? "#1B222B" : s === "low" ? "#B26E12" : "#C4432E" }}>
                {fmtQty(getValue())}
              </span>
            );
          },
        }) as ColumnDef<Item, unknown>
      );
    if (show("rp"))
      defs.push(
        colH.accessor("rp", {
          header: "RP",
          meta: { num: true },
          cell: ({ getValue }) => <span className="mono text-[12.5px] text-mut">{fmtQty(getValue())}</span>,
        }) as ColumnDef<Item, unknown>
      );
    if (show("bin"))
      defs.push(
        colH.accessor("bin", {
          header: "Bin",
          cell: ({ getValue }) => <span className="mono text-[12px]">{getValue()}</span>,
        }) as ColumnDef<Item, unknown>
      );
    if (show("sup"))
      defs.push(
        colH.accessor((i) => supName(i.sup), {
          id: "sup",
          header: "Supplier",
          cell: ({ getValue }) => <span className="text-[12px] text-mut">{getValue()}</span>,
        }) as ColumnDef<Item, unknown>
      );
    if (show("value"))
      defs.push(
        colH.accessor((i) => i.onHand * i.cost, {
          id: "value",
          header: "Value",
          meta: { num: true },
          cell: ({ getValue }) => <span className="mono text-[12px] text-mut">{money(getValue())}</span>,
        }) as ColumnDef<Item, unknown>
      );
    if (show("lastCount"))
      defs.push(
        colH.accessor("lastCountH", {
          id: "lastCount",
          header: "Counted",
          cell: ({ getValue }) => <span className="mono text-[11.5px] text-faint">{relTime(Date.now() - getValue() * H)}</span>,
        }) as ColumnDef<Item, unknown>
      );
    return defs;
  }, [vis, sel, allSel, filtered]);

  const applyView = (v: SavedView) => setF(v.f);

  return (
    <div className="anim-rise">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Inventory</h1>
          <p className="mt-0.5 text-[12.5px] text-mut">
            <span className="mono font-semibold text-ink">{num(filtered.length)}</span> of {num(db.items.length)} SKUs shown · every quantity is live
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Btn onClick={() => setPopCols(!popCols)} aria-expanded={popCols}>
              <IcColumns className="h-4 w-4" />
              Columns
              <IcChevD className="h-3.5 w-3.5 text-faint" />
            </Btn>
            <Pop open={popCols} onClose={() => setPopCols(false)} className="right-0 top-[42px] w-[210px]">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut">Visible columns</p>
              <ul className="space-y-1">
                {ALL_COLS.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12.5px] transition-colors hover:bg-paper">
                      <input
                        type="checkbox"
                        checked={vis[c.id] !== false}
                        onChange={() => setVis((v) => ({ ...v, [c.id]: v[c.id] === false }))}
                        className="h-3.5 w-3.5 accent-[#2C5AA0]"
                      />
                      {c.label}
                    </label>
                  </li>
                ))}
              </ul>
            </Pop>
          </div>
          <Btn onClick={() => exportCsv(filtered, "forgeline-inventory.csv")}>
            <IcDownload className="h-4 w-4" />
            Export CSV
          </Btn>
          <div className="relative">
            <Btn variant="primary" onClick={() => setPopSave(!popSave)} aria-expanded={popSave}>
              <IcPlus className="h-4 w-4" />
              Save view
            </Btn>
            <Pop open={popSave} onClose={() => setPopSave(false)} className="right-0 top-[42px] w-[240px]">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut">Save current filters as view</p>
              <input
                className={inputCls}
                placeholder="e.g. Zone F chemicals"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && viewName.trim()) {
                    addSavedView(viewName.trim(), f);
                    setViewName("");
                    setPopSave(false);
                  }
                }}
                autoFocus
              />
              <Btn
                variant="primary"
                sm
                className="mt-2 w-full"
                disabled={!viewName.trim()}
                onClick={() => {
                  addSavedView(viewName.trim(), f);
                  setViewName("");
                  setPopSave(false);
                }}
              >
                Save view
              </Btn>
            </Pop>
          </div>
        </div>
      </div>

      {/* saved views */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut">Views</span>
        {savedViews.map((v) => (
          <span key={v.id} className="group inline-flex items-center overflow-hidden rounded border border-line bg-surface transition-colors hover:border-sig/50">
            <button className="px-2.5 py-1 text-[12px] font-medium text-ink transition-colors group-hover:text-sig" onClick={() => applyView(v)}>
              {v.name}
            </button>
            <button
              className="border-l border-line px-1.5 py-1 text-faint transition-colors hover:bg-critwash hover:text-crit"
              onClick={() => removeSavedView(v.id)}
              aria-label={`Delete view ${v.name}`}
            >
              <IcX className="h-3 w-3" />
            </button>
          </span>
        ))}
        {activeFilters > 0 && (
          <button className="inline-flex items-center gap-1 rounded border border-sig/40 bg-sigwash px-2.5 py-1 text-[12px] font-semibold text-sig transition-colors hover:bg-sig/15" onClick={() => setF(EMPTY_FILTERS)}>
            Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
            <IcX className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* filter bar */}
      <div className="card mb-3 flex flex-wrap items-center gap-2 p-2.5">
        <div className="relative min-w-[220px] flex-1">
          <IcSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            className={cn(inputCls, "mono pl-8")}
            placeholder="Filter by SKU, name, bin, batch…"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            aria-label="Filter inventory"
          />
        </div>
        <select className={cn(inputCls, "w-[168px]")} value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} aria-label="Filter by category">
          <option value="">All categories</option>
          {db.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className={cn(inputCls, "w-[150px] mono")} value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} aria-label="Filter by zone">
          <option value="">All zones</option>
          {ZONES.map((z) => (
            <option key={z.code} value={z.code}>
              Zone {z.code} — {z.name}
            </option>
          ))}
        </select>
        <select className={cn(inputCls, "w-[132px]")} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as InvFilters["status"] })} aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="crit">Critical</option>
        </select>
        <select className={cn(inputCls, "w-[160px]")} value={f.sup} onChange={(e) => setF({ ...f, sup: e.target.value })} aria-label="Filter by supplier">
          <option value="">All suppliers</option>
          {Array.from(new Set(db.items.map((i) => i.sup))).map((s) => (
            <option key={s} value={s}>
              {supName(s)}
            </option>
          ))}
        </select>
      </div>

      {/* bulk action bar */}
      {sel.size > 0 && (
        <div className="anim-rise card mb-3 flex flex-wrap items-center gap-2 border-sig/40 bg-sigwash/60 px-3 py-2">
          <span className="mono text-[12.5px] font-bold text-sig">{sel.size} selected</span>
          <span className="mx-1 h-4 w-px bg-sig/25" />
          <Btn sm onClick={() => exportCsv(db.items.filter((i) => sel.has(i.sku)), "forgeline-selection.csv")}>
            <IcDownload className="h-3.5 w-3.5" />
            Export
          </Btn>
          <Btn sm onClick={() => setBulk("xfer")}>
            <IcSwap className="h-3.5 w-3.5" />
            Transfer
          </Btn>
          <Btn sm onClick={() => setBulk("adj")}>
            <IcPencil className="h-3.5 w-3.5" />
            Adjust
          </Btn>
          <Btn
            sm
            onClick={() => {
              toast(`Sent ${sel.size} bin labels to Zebra ZT-411`, "info");
              setSel(new Set());
            }}
          >
            <IcPrinter className="h-3.5 w-3.5" />
            Print labels
          </Btn>
          <Btn sm variant="subtle" className="ml-auto" onClick={() => setSel(new Set())}>
            <IcX className="h-3.5 w-3.5" />
            Clear
          </Btn>
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(i) => i.sku}
        onRow={(i) => openItem(i.sku)}
        flashKey={(i) => i.sku}
        isFlashed={hasFlash}
        loading={!ready}
        initialSort={[{ id: "status", desc: true }]}
        maxH="calc(100vh - 348px)"
        empty={
          <EmptyState
            icon={<IcFilter className="h-5 w-5" />}
            title="No items match these filters"
            body={`Nothing in Plant 2 matches the current combination. Clear filters to see all ${num(db.items.length)} SKUs.`}
            action={
              <Btn variant="primary" onClick={() => setF(EMPTY_FILTERS)}>
                Clear filters
              </Btn>
            }
          />
        }
      />

      {bulk === "xfer" && (
        <Modal
          title={`Transfer ${sel.size} SKUs`}
          onClose={() => setBulk("")}
          footer={
            <>
              <Btn onClick={() => setBulk("")}>Cancel</Btn>
              <Btn variant="primary" onClick={runBulkXfer}>
                <IcSwap className="h-4 w-4" />
                Move available stock
              </Btn>
            </>
          }
        >
          <p className="mb-3 text-[12.5px] text-mut">Moves each selected SKU's full available quantity to one destination bin. Transfers are logged per SKU.</p>
          <Field label="Destination bin">
            <select className={cn(inputCls, "mono")} value={bulkBin} onChange={(e) => setBulkBin(e.target.value)} autoFocus>
              <option value="">Select bin…</option>
              {ZONES.map((z) => (
                <optgroup key={z.code} label={`Zone ${z.code} — ${z.name}`}>
                  {ALL_BINS.filter((b) => b.startsWith(z.code)).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          {bulkErr && <p className="mt-2 text-[12px] font-medium text-crit">{bulkErr}</p>}
        </Modal>
      )}

      {bulk === "adj" && (
        <Modal
          title={`Adjust ${sel.size} SKUs`}
          onClose={() => setBulk("")}
          footer={
            <>
              <Btn onClick={() => setBulk("")}>Cancel</Btn>
              <Btn variant="primary" onClick={runBulkAdj}>
                <IcPencil className="h-4 w-4" />
                Apply to all
              </Btn>
            </>
          }
        >
          <p className="mb-3 text-[12.5px] text-mut">Applies the same quantity delta to every selected SKU. Each adjustment is written to the audit log.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Delta (±)">
              <input className={cn(inputCls, "mono")} value={bulkDelta} onChange={(e) => setBulkDelta(e.target.value)} inputMode="numeric" placeholder="e.g. -1" autoFocus />
            </Field>
            <Field label="Reason">
              <select className={inputCls} value={bulkReason} onChange={(e) => setBulkReason(e.target.value)}>
                {["Cycle count", "Damage", "Scrap", "Data correction"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
          {bulkErr && <p className="mt-2 text-[12px] font-medium text-crit">{bulkErr}</p>}
        </Modal>
      )}
    </div>
  );
}
