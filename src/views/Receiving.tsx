import { useEffect, useMemo, useRef, useState } from "react";
import { binsForZone, binZone, etaLabel, poStatus, qty as fmtQty, supName, type PurchaseOrder } from "../lib/data";
import { useStore } from "../lib/store";
import { Btn, EmptyState, StatusDot, cn, inputCls } from "../components/ui";
import { IcBarcode, IcCheck, IcChevR, IcTrayIn, IcWarn, IcX } from "../components/icons";

const statusChip = (s: ReturnType<typeof poStatus>) => {
  const map: Record<string, string> = {
    overdue: "border-crit/30 bg-critwash text-crit",
    open: "border-line bg-paper text-mut",
    partial: "border-warn/40 bg-warnwash text-warn",
    closed: "border-ok/30 bg-okwash text-ok",
    draft: "border-sig/30 bg-sigwash text-sig",
  };
  return map[s];
};

export default function Receiving() {
  const { db, ready, recvPoId, setRecvPoId, receiveLine, itemBySku, hasFlash, toast } = useStore();

  const sorted = useMemo(() => {
    const rankPo = (p: PurchaseOrder) => {
      const s = poStatus(p);
      if (s === "overdue") return 0;
      if (s === "open" || s === "partial") return 1;
      if (s === "draft") return 2;
      return 3;
    };
    return [...db.pos].sort((a, b) => rankPo(a) - rankPo(b) || a.etaDays - b.etaDays);
  }, [db.pos]);

  const [selId, setSelId] = useState<string | null>(null);
  const [scan, setScan] = useState("");
  const [scanErr, setScanErr] = useState("");
  const [scanSwitch, setScanSwitch] = useState<string | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
  const [binMap, setBinMap] = useState<Record<string, string>>({});
  const [lineErr, setLineErr] = useState<Record<string, string>>({});
  const [flashRow, setFlashRow] = useState<string | null>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recvPoId) {
      setSelId(recvPoId);
      setRecvPoId(null);
    }
  }, [recvPoId, setRecvPoId]);

  useEffect(() => {
    if (!selId && sorted.length) {
      const first = sorted.find((p) => poStatus(p) !== "closed");
      setSelId((first ?? sorted[0]).id);
    }
  }, [sorted, selId]);

  const po = db.pos.find((p) => p.id === selId) ?? null;
  const poSt = po ? poStatus(po) : null;

  const focusLine = (sku: string) => {
    setFlashRow(sku);
    setTimeout(() => setFlashRow(null), 1300);
    setTimeout(() => qtyRefs.current[sku]?.focus(), 60);
  };

  const resolveScan = () => {
    const q = scan.trim().toLowerCase();
    setScanErr("");
    setScanSwitch(null);
    if (!q || !po) return;
    const line = po.lines.find((l) => l.sku.toLowerCase() === q) ?? po.lines.find((l) => l.sku.toLowerCase().includes(q));
    if (line) {
      const remaining = line.ord - line.rcv;
      if (remaining <= 0) {
        setScanErr(`${line.sku} is already fully received on ${po.id}.`);
      } else {
        setQtyMap((m) => ({ ...m, [line.sku]: m[line.sku] ?? String(remaining) }));
        focusLine(line.sku);
      }
    } else {
      const other = db.pos.find((p) => p.id !== po.id && poStatus(p) !== "closed" && p.lines.some((l) => l.sku.toLowerCase().includes(q)));
      if (other) {
        setScanErr(`${q.toUpperCase()} isn't on ${po.id} — it's expected on ${other.id}.`);
        setScanSwitch(other.id);
      } else if (db.items.some((i) => i.sku.toLowerCase().includes(q))) {
        setScanErr(`${q.toUpperCase()} exists in inventory but isn't on any open PO. Use Adjust for unplanned stock.`);
      } else {
        setScanErr(`No SKU matches “${scan}”. Check the label and scan again.`);
      }
    }
    setScan("");
  };

  const receive = (sku: string) => {
    if (!po) return;
    const line = po.lines.find((l) => l.sku === sku)!;
    const remaining = line.ord - line.rcv;
    const item = itemBySku(sku);
    const bin = binMap[sku] ?? item?.bin ?? "A-01-1";
    const raw = qtyMap[sku];
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n <= 0) return setLineErr((e) => ({ ...e, [sku]: "Enter a whole number above zero." }));
    if (n > remaining) return setLineErr((e) => ({ ...e, [sku]: `Only ${fmtQty(remaining)} remaining on this line.` }));
    setLineErr((e) => ({ ...e, [sku]: "" }));
    setQtyMap((m) => ({ ...m, [sku]: "" }));
    receiveLine(po.id, sku, n, bin);
  };

  const receiveAll = () => {
    if (!po) return;
    let count = 0;
    po.lines.forEach((l) => {
      const remaining = l.ord - l.rcv;
      if (remaining > 0) {
        const bin = binMap[l.sku] ?? itemBySku(l.sku)?.bin ?? "A-01-1";
        receiveLine(po.id, l.sku, remaining, bin);
        count++;
      }
    });
    if (count === 0) toast("Nothing left to receive on this PO", "info");
  };

  if (!ready) {
    return (
      <div className="anim-rise grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="skel h-[480px] lg:col-span-4" />
        <div className="skel h-[480px] lg:col-span-8" />
      </div>
    );
  }

  return (
    <div className="anim-rise">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Receiving · Stock-in</h1>
          <p className="mt-0.5 text-[12.5px] text-mut">Scan a line item at the dock, confirm quantity and bin, post the receipt.</p>
        </div>
        <span className="mono rounded border border-line bg-surface px-2.5 py-1.5 text-[11.5px] text-mut">
          Dock 1 · {sorted.filter((p) => poStatus(p) !== "closed").length} open POs
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* PO queue */}
        <section className="card self-start lg:col-span-4" aria-label="Purchase order queue">
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-[13.5px] font-bold tracking-tight">Expected deliveries</h2>
          </header>
          <ul>
            {sorted.map((p) => {
              const s = poStatus(p);
              const got = p.lines.reduce((a, l) => a + Math.min(1, l.rcv / l.ord), 0);
              const active = p.id === selId;
              return (
                <li key={p.id} className="border-b border-line/70 last:border-0">
                  <button
                    onClick={() => setSelId(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f3f6fb] focus-visible:bg-[#f3f6fb]",
                      active && "bg-sigwash/50 hover:bg-sigwash/50"
                    )}
                    aria-pressed={active}
                  >
                    <StatusDot status={s === "overdue" ? "crit" : s === "closed" ? "ok" : s === "partial" ? "low" : "ok"} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="mono text-[13px] font-bold">{p.id}</span>
                        <span className={cn("mono rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase", statusChip(s))}>{s}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-mut">{supName(p.sup)}</span>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-sig transition-[width] duration-500" style={{ width: `${(got / p.lines.length) * 100}%` }} />
                      </span>
                    </span>
                    <span className={cn("mono shrink-0 text-[11px]", s === "overdue" ? "font-semibold text-crit" : "text-faint")}>{s === "closed" ? "done" : etaLabel(p.etaDays)}</span>
                    <IcChevR className={cn("h-4 w-4 shrink-0 text-faint", active && "text-sig")} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* PO detail */}
        <section className="card lg:col-span-8" aria-label="Purchase order detail">
          {!po ? (
            <EmptyState
              icon={<IcTrayIn className="h-5 w-5" />}
              title="No open purchase orders"
              body="The dock queue is clear. Raise a draft PO from any item's Reorder action and it will appear here."
            />
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                <span className="mono text-[15px] font-bold">{po.id}</span>
                <span className="text-[13px] text-mut">{supName(po.sup)}</span>
                <span className={cn("mono rounded-sm border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase", statusChip(poSt!))}>{poSt}</span>
                {poSt !== "closed" && (
                  <span className={cn("mono ml-auto text-[11.5px]", poSt === "overdue" ? "font-semibold text-crit" : "text-faint")}>ETA {etaLabel(po.etaDays)}</span>
                )}
              </header>

              {poSt === "closed" ? (
                <EmptyState
                  icon={<IcCheck className="h-5 w-5 text-ok" />}
                  title={`${po.id} fully received`}
                  body="Every line on this purchase order is booked into stock. Pick the next delivery from the queue."
                />
              ) : (
                <>
                  {/* scan box */}
                  <div className="border-b border-line bg-paper/50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <IcBarcode className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sig" />
                        <input
                          ref={scanRef}
                          className={cn(inputCls, "mono pl-9 font-medium")}
                          placeholder={`Scan or type a SKU on ${po.id}, then Enter`}
                          value={scan}
                          onChange={(e) => setScan(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && resolveScan()}
                          aria-label="Scan SKU on purchase order"
                          autoFocus
                        />
                        <span className="kbd absolute right-2 top-1/2 hidden -translate-y-1/2 sm:block">Enter</span>
                      </div>
                      <Btn variant="primary" onClick={resolveScan} disabled={!scan.trim()}>
                        Locate line
                      </Btn>
                    </div>
                    {scanErr && (
                      <p className="anim-rise mt-2 flex flex-wrap items-center gap-2 rounded border border-crit/30 bg-critwash px-2.5 py-1.5 text-[12px] font-medium text-crit">
                        <IcWarn className="h-3.5 w-3.5 shrink-0" />
                        {scanErr}
                        {scanSwitch && (
                          <button
                            className="rounded border border-crit/40 px-2 py-0.5 font-semibold transition-colors hover:bg-crit hover:text-white"
                            onClick={() => {
                              setSelId(scanSwitch);
                              setScanErr("");
                              setScanSwitch(null);
                            }}
                          >
                            Switch to {scanSwitch}
                          </button>
                        )}
                        <button className="ml-auto text-crit/70 transition-colors hover:text-crit" onClick={() => setScanErr("")} aria-label="Dismiss">
                          <IcX className="h-3.5 w-3.5" />
                        </button>
                      </p>
                    )}
                  </div>

                  {/* lines */}
                  <ul>
                    {po.lines.map((l) => {
                      const item = itemBySku(l.sku);
                      const remaining = l.ord - l.rcv;
                      const done = remaining <= 0;
                      const bin = binMap[l.sku] ?? item?.bin ?? "A-01-1";
                      const zoneBins = binsForZone(binZone(bin));
                      return (
                        <li key={l.sku} className={cn("relative border-b border-line/70 px-4 py-3 last:border-0", done && "bg-okwash/30", flashRow === l.sku && "row-flash", hasFlash(l.sku) && "row-flash")}>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="flex w-[34px] items-center">
                              {done ? (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok text-white">
                                  <IcCheck className="h-3 w-3" />
                                </span>
                              ) : (
                                <StatusDot status="ok" />
                              )}
                            </span>
                            <span className="min-w-[190px]">
                              <span className="mono block text-[12.5px] font-bold">{l.sku}</span>
                              <span className="block max-w-[240px] truncate text-[11.5px] text-mut">{item?.name ?? "Unknown SKU"}</span>
                            </span>
                            <span className="mono ml-auto flex items-center gap-3 text-[12px]">
                              <span className="text-mut">
                                ord <span className="font-semibold text-ink">{fmtQty(l.ord)}</span>
                              </span>
                              <span className="text-mut">
                                rcv <span className="font-semibold text-ok">{fmtQty(l.rcv)}</span>
                              </span>
                              <span className="text-mut">
                                rem <span className={cn("font-semibold", done ? "text-faint" : "text-crit")}>{fmtQty(remaining)}</span>
                              </span>
                              <span className="text-[10.5px] text-faint">{item?.unit}</span>
                            </span>
                          </div>

                          {!done && (
                            <div className="mt-2.5 flex flex-wrap items-start gap-2 pl-[34px]">
                              <label className="block">
                                <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.07em] text-mut">Put-away bin</span>
                                <select className={cn(inputCls, "mono w-[124px]")} value={bin} onChange={(e) => setBinMap((m) => ({ ...m, [l.sku]: e.target.value }))}>
                                  {zoneBins.map((b) => (
                                    <option key={b} value={b}>
                                      {b}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.07em] text-mut">Qty to receive</span>
                                <input
                                  ref={(el) => {
                                    qtyRefs.current[l.sku] = el;
                                  }}
                                  className={cn(inputCls, "mono w-[110px]", lineErr[l.sku] && "border-crit focus:border-crit focus:ring-crit/20")}
                                  value={qtyMap[l.sku] ?? ""}
                                  inputMode="numeric"
                                  placeholder={String(remaining)}
                                  onChange={(e) => setQtyMap((m) => ({ ...m, [l.sku]: e.target.value }))}
                                  onKeyDown={(e) => e.key === "Enter" && receive(l.sku)}
                                />
                              </label>
                              <div className="flex items-end">
                                <Btn variant="primary" onClick={() => receive(l.sku)}>
                                  <IcTrayIn className="h-4 w-4" />
                                  Receive
                                </Btn>
                              </div>
                              {lineErr[l.sku] && (
                                <p className="mt-5 w-full pl-0 text-[11.5px] font-medium text-crit sm:mt-6 sm:w-auto sm:pl-1">{lineErr[l.sku]}</p>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <footer className="flex items-center justify-between border-t border-line bg-paper/60 px-4 py-3">
                    <span className="mono text-[11.5px] text-mut">
                      {po.lines.filter((l) => l.rcv >= l.ord).length}/{po.lines.length} lines complete
                    </span>
                    <Btn variant="ghost" onClick={receiveAll}>
                      <IcCheck className="h-4 w-4" />
                      Receive all remaining
                    </Btn>
                  </footer>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
