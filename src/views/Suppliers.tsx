import { useMemo, useState } from "react";
import { SUPPLIERS, etaLabel, num, poStatus, qty as fmtQty, statusOf, available } from "../lib/data";
import { useStore } from "../lib/store";
import { Btn, EmptyState, Meter, StatusDot, cn } from "../components/ui";
import { IcFactory, IcPhone } from "../components/icons-extra";

export default function Suppliers() {
  const { db, ready, openItem, setRecvPoId, nav } = useStore();
  const [sel, setSel] = useState<string | null>(null);

  const stats = useMemo(
    () =>
      SUPPLIERS.map((s) => {
        const skus = db.items.filter((i) => i.sup === s.id);
        const openPos = db.pos.filter((p) => p.sup === s.id && poStatus(p) !== "closed");
        const value = skus.reduce((a, i) => a + i.onHand * i.cost, 0);
        return { s, skus, openPos, value };
      }),
    [db]
  );

  const current = stats.find((x) => x.s.id === sel) ?? null;

  if (!ready) {
    return (
      <div className="anim-rise space-y-4">
        <div className="skel h-[300px]" />
        <div className="skel h-[200px]" />
      </div>
    );
  }

  return (
    <div className="anim-rise">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold leading-tight tracking-tight">Suppliers</h1>
          <p className="mt-0.5 text-[12.5px] text-mut">{SUPPLIERS.length} active vendors · lead times drive the reorder engine</p>
        </div>
      </div>

      <section className="card overflow-hidden" aria-label="Supplier list">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["Code", "Supplier", "Contact", "Phone", "Lead", "On-time", "Open POs", "SKUs", "Stock value"].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      "sticky top-0 border-b border-line bg-[#fafbfc] px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-mut",
                      i >= 4 && "text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map(({ s, skus, openPos, value }) => (
                <tr
                  key={s.id}
                  tabIndex={0}
                  onClick={() => setSel(sel === s.id ? null : s.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(sel === s.id ? null : s.id))}
                  className={cn("cursor-pointer border-t border-line transition-colors hover:bg-[#f3f6fb] focus-visible:bg-[#f3f6fb]", sel === s.id && "bg-sigwash/50")}
                  aria-pressed={sel === s.id}
                >
                  <td className="mono px-3 py-2.5 text-[12px] font-semibold">{s.id}</td>
                  <td className="px-3 py-2.5 font-semibold">{s.name}</td>
                  <td className="px-3 py-2.5 text-mut">{s.contact}</td>
                  <td className="mono px-3 py-2.5 text-[12px] text-mut">{s.phone}</td>
                  <td className="mono px-3 py-2.5 text-right">{s.leadDays} d</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center justify-end gap-2">
                      <span className="w-16">
                        <Meter pct={s.onTime} color={s.onTime >= 95 ? "#1F8A5F" : s.onTime >= 90 ? "#2C5AA0" : "#E0982A"} />
                      </span>
                      <span className="mono w-[38px] text-right text-[12px]">{s.onTime}%</span>
                    </span>
                  </td>
                  <td className="mono px-3 py-2.5 text-right">
                    {openPos.length > 0 ? <span className="font-semibold text-sig">{openPos.length}</span> : <span className="text-faint">0</span>}
                  </td>
                  <td className="mono px-3 py-2.5 text-right">{skus.length}</td>
                  <td className="mono px-3 py-2.5 text-right text-mut">${num(Math.round(value))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {current ? (
        <div className="anim-rise mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Supplier detail">
          <section className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold tracking-tight">{current.s.name}</h2>
                <p className="mono mt-0.5 text-[11.5px] text-faint">{current.s.id}</p>
              </div>
              <span className="mono rounded border border-line bg-paper px-2 py-1 text-[11px] text-mut">{current.s.leadDays} d lead time</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
              <p className="rounded border border-line bg-paper/60 px-3 py-2">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.07em] text-mut">Contact</span>
                <span className="font-semibold">{current.s.contact}</span>
              </p>
              <p className="rounded border border-line bg-paper/60 px-3 py-2">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.07em] text-mut">Phone</span>
                <span className="mono font-semibold">{current.s.phone}</span>
              </p>
            </div>
            <h3 className="mb-2 mt-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mut">Supplied SKUs · {current.skus.length}</h3>
            {current.skus.length === 0 ? (
              <p className="text-[12px] text-mut">No SKUs linked to this supplier.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {current.skus.map((i) => {
                  const st = statusOf(i);
                  return (
                    <button
                      key={i.sku}
                      onClick={() => openItem(i.sku)}
                      className="group flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1 transition-all hover:border-sig/50 hover:bg-sigwash/50"
                      title={`${i.name} · ${fmtQty(available(i))} ${i.unit} available`}
                    >
                      <StatusDot status={st} size="w-1.5 h-1.5" />
                      <span className="mono text-[11px] font-semibold group-hover:text-sig">{i.sku}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card" aria-label="Order history">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[13.5px] font-bold tracking-tight">Order history</h2>
            </header>
            {db.pos.filter((p) => p.sup === current.s.id).length === 0 ? (
              <EmptyState icon={<IcFactory className="h-5 w-5" />} title="No purchase orders" body={`Nothing has been ordered from ${current.s.name} in this terminal's history.`} />
            ) : (
              <ul>
                {db.pos
                  .filter((p) => p.sup === current.s.id)
                  .map((p) => {
                    const st = poStatus(p);
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-2.5 last:border-0">
                        <StatusDot status={st === "overdue" ? "crit" : st === "closed" ? "ok" : st === "partial" ? "low" : "ok"} />
                        <span className="mono text-[12.5px] font-bold">{p.id}</span>
                        <span className="mono text-[11.5px] text-mut">
                          {p.lines.length} line{p.lines.length > 1 ? "s" : ""}
                        </span>
                        <span className="mono ml-auto text-[11.5px] text-faint">{st === "closed" ? "received" : etaLabel(p.etaDays)}</span>
                        <span
                          className={cn(
                            "mono rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                            st === "overdue" ? "border-crit/30 bg-critwash text-crit" : st === "closed" ? "border-ok/30 bg-okwash text-ok" : "border-line bg-paper text-mut"
                          )}
                        >
                          {st}
                        </span>
                        {st !== "closed" && (
                          <Btn
                            sm
                            onClick={() => {
                              setRecvPoId(p.id);
                              nav("receiving");
                            }}
                          >
                            Receive
                          </Btn>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-dashed border-linedark px-4 py-3 text-[12.5px] text-mut">
          <IcPhone className="h-4 w-4 text-faint" />
          Select a supplier row to see contacts, linked SKUs and order history.
        </p>
      )}
    </div>
  );
}
