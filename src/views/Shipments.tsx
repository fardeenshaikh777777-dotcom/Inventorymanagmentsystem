import { useMemo, useState } from "react";
import { ALL_BINS, ZONES, available, etaLabel, qty as fmtQty, statusOf } from "../lib/data";
import { useStore } from "../lib/store";
import { Btn, EmptyState, Meter, StatusDot, cn, inputCls } from "../components/ui";
import { IcCheck, IcChevR, IcSwap, IcTruck, IcWarn } from "../components/icons";

export default function Shipments() {
  const { db, ready, shipTab, setShipTab, pickUnits, shipPick, transferStock, markTransfer, itemBySku, hasFlash, openItem } = useStore();

  const [selId, setSelId] = useState<string | null>(null);
  const [pickQty, setPickQty] = useState<Record<string, string>>({});
  const [pickErr, setPickErr] = useState<Record<string, string>>({});
  const [confirmPartial, setConfirmPartial] = useState(false);

  const [tSku, setTSku] = useState("");
  const [tQty, setTQty] = useState("");
  const [tBin, setTBin] = useState("");
  const [tErr, setTErr] = useState("");

  const sorted = useMemo(
    () =>
      [...db.picks].sort((a, b) => {
        if (a.status !== b.status) return a.status === "open" ? -1 : 1;
        return a.dueDays - b.dueDays;
      }),
    [db.picks]
  );

  const pick = db.picks.find((p) => p.id === selId) ?? sorted.find((p) => p.status === "open") ?? sorted[0] ?? null;

  const doPick = (sku: string, req: number, already: number) => {
    if (!pick) return;
    const item = itemBySku(sku);
    const av = item ? available(item) : 0;
    const n = Number(pickQty[sku]);
    if (!pickQty[sku] || !Number.isInteger(n) || n <= 0) return setPickErr((e) => ({ ...e, [sku]: "Whole number above zero." }));
    if (n > req - already) return setPickErr((e) => ({ ...e, [sku]: `Only ${fmtQty(req - already)} left to pick.` }));
    if (n > av) return setPickErr((e) => ({ ...e, [sku]: `Only ${fmtQty(av)} available in ${item?.bin}.` }));
    setPickErr((e) => ({ ...e, [sku]: "" }));
    setPickQty((m) => ({ ...m, [sku]: "" }));
    pickUnits(pick.id, sku, n);
  };

  const submitTransfer = () => {
    const item = itemBySku(tSku);
    if (!item) return setTErr("Choose a SKU to move.");
    const n = Number(tQty);
    const av = available(item);
    if (!tQty || !Number.isInteger(n) || n <= 0) return setTErr("Enter a whole number above zero.");
    if (n > av) return setTErr(`Only ${fmtQty(av)} ${item.unit} available in ${item.bin}.`);
    if (!tBin) return setTErr("Choose a destination bin.");
    if (tBin === item.bin) return setTErr("Destination is the current bin — pick another.");
    transferStock(tSku, n, tBin);
    setTSku("");
    setTQty("");
    setTBin("");
    setTErr("");
  };

  if (!ready) {
    return (
      <div className="anim-rise grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="skel h-[480px] lg:col-span-4" />
        <div className="skel h-[480px] lg:col-span-8" />
      </div>
    );
  }

  const openCount = db.picks.filter((p) => p.status === "open").length;
  const openXfers = db.transfers.filter((t) => t.status === "open");

  return (
    <div className="anim-rise">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Shipments · Stock-out</h1>
          <p className="mt-0.5 text-[12.5px] text-mut">
            {openCount} open pick list{openCount === 1 ? "" : "s"} · {openXfers.length} transfer{openXfers.length === 1 ? "" : "s"} in flight
          </p>
        </div>
        <div className="flex rounded border border-line bg-surface p-0.5" role="tablist" aria-label="Shipments tabs">
          {(
            [
              { id: "picks", label: "Pick lists", icon: <IcTruck className="h-3.5 w-3.5" /> },
              { id: "transfer", label: "Transfers", icon: <IcSwap className="h-3.5 w-3.5" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={shipTab === t.id}
              onClick={() => setShipTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                shipTab === t.id ? "bg-sig text-white shadow-sm" : "text-mut hover:text-ink"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {shipTab === "picks" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="card self-start lg:col-span-4" aria-label="Pick list queue">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[13.5px] font-bold tracking-tight">Pick queue</h2>
            </header>
            <ul>
              {sorted.map((p) => {
                const totalReq = p.lines.reduce((a, l) => a + l.req, 0);
                const totalPick = p.lines.reduce((a, l) => a + l.pick, 0);
                const active = pick?.id === p.id;
                return (
                  <li key={p.id} className="border-b border-line/70 last:border-0">
                    <button
                      onClick={() => {
                        setSelId(p.id);
                        setConfirmPartial(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f3f6fb] focus-visible:bg-[#f3f6fb]",
                        active && "bg-sigwash/50 hover:bg-sigwash/50",
                        p.status === "shipped" && "opacity-55"
                      )}
                      aria-pressed={active}
                    >
                      <StatusDot status={p.status === "shipped" ? "ok" : p.dueDays <= 0 ? "low" : "ok"} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="mono text-[13px] font-bold">{p.id}</span>
                          <span
                            className={cn(
                              "mono rounded-sm border px-1 py-px text-[9.5px] font-bold tracking-wide",
                              p.prio === "HIGH" ? "border-crit/30 bg-critwash text-crit" : p.prio === "MED" ? "border-warn/40 bg-warnwash text-warn" : "border-line bg-paper text-mut"
                            )}
                          >
                            {p.prio}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-mut">{p.dest}</span>
                        <span className="mt-1.5 block">
                          <Meter pct={(totalPick / totalReq) * 100} color={p.status === "shipped" ? "#1F8A5F" : undefined} />
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={cn("mono block text-[11px]", p.status === "shipped" ? "font-semibold text-ok" : p.dueDays <= 0 ? "font-semibold text-warn" : "text-faint")}>
                          {p.status === "shipped" ? "shipped" : etaLabel(p.dueDays)}
                        </span>
                        <span className="mono block text-[10.5px] text-faint">
                          {fmtQty(totalPick)}/{fmtQty(totalReq)}
                        </span>
                      </span>
                      <IcChevR className={cn("h-4 w-4 shrink-0 text-faint", active && "text-sig")} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card self-start lg:col-span-8" aria-label="Pick list detail">
            {!pick ? (
              <EmptyState icon={<IcTruck className="h-5 w-5" />} title="No pick lists" body="Production orders will raise pick lists here when they reserve stock." />
            ) : (
              <>
                <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                  <span className="mono text-[15px] font-bold">{pick.id}</span>
                  <span className="text-[13px] text-mut">{pick.dest}</span>
                  {pick.status === "open" && (
                    <span className={cn("mono rounded-sm border px-1.5 py-0.5 text-[10.5px] font-semibold", pick.dueDays <= 0 ? "border-warn/40 bg-warnwash text-warn" : "border-line bg-paper text-mut")}>
                      due {etaLabel(pick.dueDays)}
                    </span>
                  )}
                  {pick.status === "shipped" && (
                    <span className="mono rounded-sm border border-ok/30 bg-okwash px-1.5 py-0.5 text-[10.5px] font-semibold uppercase text-ok">shipped</span>
                  )}
                </header>

                <ul>
                  {pick.lines.map((l) => {
                    const item = itemBySku(l.sku);
                    const remaining = l.req - l.pick;
                    const av = item ? available(item) : 0;
                    const done = remaining <= 0;
                    return (
                      <li key={l.sku} className={cn("border-b border-line/70 px-4 py-3 last:border-0", done && "bg-okwash/30", hasFlash(l.sku) && "row-flash")}>
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusDot status={item ? statusOf(item) : "crit"} />
                          <button className="mono text-[12.5px] font-bold transition-colors hover:text-sig" onClick={() => openItem(l.sku)}>
                            {l.sku}
                          </button>
                          <span className="min-w-0 flex-1 truncate text-[12px] text-mut">{item?.name}</span>
                          <span className="mono text-[11.5px] text-faint">{item?.bin}</span>
                          <span className="mono text-[12px]">
                            <span className="font-semibold">{fmtQty(l.pick)}</span>
                            <span className="text-faint"> / {fmtQty(l.req)}</span>
                            <span className="ml-1 text-[10.5px] text-faint">{item?.unit}</span>
                          </span>
                        </div>
                        {pick.status === "open" && !done && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 pl-5">
                            <input
                              className={cn(inputCls, "mono w-[104px]", pickErr[l.sku] && "border-crit focus:border-crit focus:ring-crit/20")}
                              value={pickQty[l.sku] ?? ""}
                              inputMode="numeric"
                              placeholder={`≤ ${fmtQty(Math.min(remaining, av))}`}
                              onChange={(e) => setPickQty((m) => ({ ...m, [l.sku]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && doPick(l.sku, l.req, l.pick)}
                              aria-label={`Pick quantity for ${l.sku}`}
                            />
                            <Btn sm onClick={() => doPick(l.sku, l.req, l.pick)}>
                              Pick
                            </Btn>
                            <Btn
                              sm
                              variant="subtle"
                              onClick={() => {
                                const max = Math.min(remaining, av);
                                setPickQty((m) => ({ ...m, [l.sku]: String(max) }));
                                setPickErr((e) => ({ ...e, [l.sku]: "" }));
                              }}
                            >
                              Max {fmtQty(Math.min(remaining, av))}
                            </Btn>
                            {av < remaining && (
                              <span className="flex items-center gap-1 text-[11.5px] font-medium text-warn">
                                <IcWarn className="h-3.5 w-3.5" />
                                {fmtQty(av)} available — will ship short
                              </span>
                            )}
                            {pickErr[l.sku] && <span className="text-[11.5px] font-medium text-crit">{pickErr[l.sku]}</span>}
                          </div>
                        )}
                        {pick.status === "open" && done && (
                          <p className="mt-1.5 flex items-center gap-1 pl-5 text-[11.5px] font-semibold text-ok">
                            <IcCheck className="h-3.5 w-3.5" />
                            Fully picked
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {pick.status === "open" && (
                  <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/60 px-4 py-3">
                    <span className="mono text-[11.5px] text-mut">
                      {pick.lines.filter((l) => l.pick >= l.req).length}/{pick.lines.length} lines picked · shorts recorded on ship
                    </span>
                    <div className="flex gap-2">
                      <Btn
                        variant={confirmPartial ? "danger" : "ghost"}
                        disabled={pick.lines.every((l) => l.pick === 0)}
                        onClick={() => {
                          if (confirmPartial) {
                            shipPick(pick.id);
                            setConfirmPartial(false);
                          } else setConfirmPartial(true);
                        }}
                      >
                        {confirmPartial ? "Confirm partial ship?" : "Ship partial"}
                      </Btn>
                      <Btn
                        variant="primary"
                        disabled={!pick.lines.every((l) => l.pick >= l.req)}
                        onClick={() => {
                          shipPick(pick.id);
                          setConfirmPartial(false);
                        }}
                      >
                        <IcTruck className="h-4 w-4" />
                        Ship complete
                      </Btn>
                    </div>
                  </footer>
                )}
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="card self-start p-4 lg:col-span-5" aria-label="New transfer">
            <h2 className="text-[13.5px] font-bold tracking-tight">New transfer</h2>
            <p className="mt-0.5 text-[12px] text-mut">Move available stock between bins. Logged instantly to the audit trail.</p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-mut">SKU</span>
                <select className={cn(inputCls, "mono")} value={tSku} onChange={(e) => setTSku(e.target.value)}>
                  <option value="">Select SKU…</option>
                  {db.items.map((i) => (
                    <option key={i.sku} value={i.sku}>
                      {i.sku} — {i.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-mut">Quantity</span>
                  <input className={cn(inputCls, "mono")} value={tQty} onChange={(e) => setTQty(e.target.value)} inputMode="numeric" placeholder={tSku ? String(available(itemBySku(tSku)!)) : "—"} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-mut">From</span>
                  <div className={cn(inputCls, "mono flex items-center bg-paper text-mut")}>{tSku ? itemBySku(tSku)?.bin : "—"}</div>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-mut">To bin</span>
                <select className={cn(inputCls, "mono")} value={tBin} onChange={(e) => setTBin(e.target.value)}>
                  <option value="">Select destination…</option>
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
              </label>
              {tErr && <p className="rounded border border-crit/30 bg-critwash px-2.5 py-1.5 text-[12px] font-medium text-crit">{tErr}</p>}
              <Btn variant="primary" className="w-full" onClick={submitTransfer}>
                <IcSwap className="h-4 w-4" />
                Move stock
              </Btn>
            </div>
          </section>

          <section className="card self-start lg:col-span-7" aria-label="Transfer log">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[13.5px] font-bold tracking-tight">Transfer log</h2>
            </header>
            {db.transfers.length === 0 ? (
              <EmptyState icon={<IcSwap className="h-5 w-5" />} title="No transfers recorded" body="Inter-zone moves will appear here with their status." />
            ) : (
              <ul>
                {db.transfers.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-2.5 last:border-0">
                    <span className={cn("mono w-[56px] text-[12px] font-bold", t.status === "open" ? "text-warn" : "text-faint")}>{t.id}</span>
                    <button className="mono text-[12.5px] font-semibold transition-colors hover:text-sig" onClick={() => openItem(t.sku)}>
                      {t.sku}
                    </button>
                    <span className="mono text-[12px] text-mut">×{fmtQty(t.qty)}</span>
                    <span className="mono text-[12px] text-mut">
                      {t.from} <span className="text-faint">→</span> {t.to}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      {t.status === "open" ? (
                        <Btn sm onClick={() => markTransfer(t.id)}>
                          <IcCheck className="h-3.5 w-3.5" />
                          Confirm arrival
                        </Btn>
                      ) : (
                        <span className="mono rounded-sm border border-ok/30 bg-okwash px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ok">done</span>
                      )}
                      <span className="mono text-[10.5px] text-faint">{t.user}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
