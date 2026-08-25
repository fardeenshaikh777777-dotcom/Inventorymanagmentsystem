import { useEffect, useMemo, useState } from "react";
import {
  ALL_BINS,
  ZONES,
  available,
  daysUntil,
  money2,
  num,
  poStatus,
  qty as fmtQty,
  relTime,
  hhmm,
  statusOf,
  supById,
  toCsv,
  downloadText,
  STATUS_META,
} from "../lib/data";
import { useStore } from "../lib/store";
import { Btn, Field, KindTag, SlidePanel, StatusChip, StatusDot, cn, inputCls } from "../components/ui";
import { IcFile, IcPencil, IcSwap, IcTrayIn, IcArrowR } from "../components/icons";

const H = 3600_000;

function ActionForms({ sku }: { sku: string }) {
  const { itemBySku, adjustStock, transferStock, reorder, db, toast } = useStore();
  const item = itemBySku(sku)!;
  const av = available(item);
  const [mode, setMode] = useState<"" | "adj" | "xfer" | "reorder">("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("Cycle count");
  const [q, setQ] = useState("");
  const [toBin, setToBin] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setMode("");
    setDelta("");
    setQ("");
    setToBin("");
    setErr("");
  }, [sku]);

  const pendingPo = db.pos.find((p) => poStatus(p) !== "closed" && p.lines.some((l) => l.sku === sku));
  const lead = supById(item.sup)?.leadDays ?? 10;
  const suggested = Math.max(item.rp * 2 - av, Math.ceil(item.dailyUse * (lead + db.safetyDays)));

  const submitAdj = () => {
    const d = Number(delta);
    if (!delta || !Number.isFinite(d) || d === 0) return setErr("Enter a non-zero quantity, e.g. -2 or +10.");
    if (item.onHand + d < 0) return setErr(`Cannot remove ${Math.abs(d)} — only ${item.onHand} on hand.`);
    adjustStock(sku, d, reason);
    setMode("");
    setErr("");
  };

  const submitXfer = () => {
    const n = Number(q);
    if (!q || !Number.isFinite(n) || n <= 0) return setErr("Enter a quantity above zero.");
    if (n > av) return setErr(`Only ${av} ${item.unit} available to move.`);
    if (!toBin) return setErr("Choose a destination bin.");
    if (toBin === item.bin) return setErr("Destination is the current bin — pick another.");
    transferStock(sku, n, toBin);
    setMode("");
    setErr("");
  };

  const tab = (m: typeof mode, label: string, icon: React.ReactNode) => (
    <Btn
      sm
      variant={mode === m ? "primary" : "ghost"}
      onClick={() => {
        setMode(mode === m ? "" : m);
        setErr("");
      }}
      aria-pressed={mode === m}
    >
      {icon}
      {label}
    </Btn>
  );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {tab("adj", "Adjust", <IcPencil className="h-3.5 w-3.5" />)}
        {tab("xfer", "Transfer", <IcSwap className="h-3.5 w-3.5" />)}
        {tab("reorder", "Reorder", <IcTrayIn className="h-3.5 w-3.5" />)}
      </div>

      {err && <p className="mt-2 rounded border border-crit/30 bg-critwash px-2.5 py-1.5 text-[12px] font-medium text-crit">{err}</p>}

      {mode === "adj" && (
        <div className="anim-rise mt-3 rounded border border-line bg-paper/60 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Quantity (${item.unit})`} hint="Negative removes, positive adds">
              <input className={cn(inputCls, "mono")} value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="numeric" placeholder="e.g. -2" autoFocus />
            </Field>
            <Field label="Reason">
              <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
                {["Cycle count", "Damage", "Scrap", "Data correction", "Found stock"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Btn sm onClick={() => setMode("")}>
              Cancel
            </Btn>
            <Btn sm variant="primary" onClick={submitAdj}>
              Apply adjustment
            </Btn>
          </div>
        </div>
      )}

      {mode === "xfer" && (
        <div className="anim-rise mt-3 rounded border border-line bg-paper/60 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Quantity (${item.unit})`} hint={`${av} available in ${item.bin}`}>
              <input className={cn(inputCls, "mono")} value={q} onChange={(e) => setQ(e.target.value)} inputMode="numeric" placeholder={String(av)} autoFocus />
            </Field>
            <Field label="To bin">
              <select className={cn(inputCls, "mono")} value={toBin} onChange={(e) => setToBin(e.target.value)}>
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
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Btn sm onClick={() => setMode("")}>
              Cancel
            </Btn>
            <Btn sm variant="primary" onClick={submitXfer}>
              Move stock
            </Btn>
          </div>
        </div>
      )}

      {mode === "reorder" && (
        <div className="anim-rise mt-3 rounded border border-line bg-paper/60 p-3">
          <p className="text-[12.5px] leading-relaxed text-mut">
            Raise a draft purchase order for <span className="mono font-semibold text-ink">{fmtQty(suggested)} {item.unit}</span> from{" "}
            <span className="font-semibold text-ink">{supById(item.sup)?.name}</span> ({lead} d lead time + {db.safetyDays} d safety).
          </p>
          {pendingPo && (
            <p className="mono mt-2 inline-flex rounded-sm border border-warn/40 bg-warnwash px-1.5 py-0.5 text-[11px] font-semibold text-warn">
              {pendingPo.id} already pending
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Btn sm onClick={() => setMode("")}>
              Cancel
            </Btn>
            <Btn
              sm
              variant="primary"
              onClick={() => {
                reorder(sku);
                setMode("");
              }}
            >
              Raise draft PO
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemPanel() {
  const { panelSku, closeItem, itemBySku, movementsFor, toast, nav, setInvQuery } = useStore();
  const item = panelSku ? itemBySku(panelSku) : undefined;

  const moves = useMemo(() => (item ? movementsFor(item.sku).slice(0, 8) : []), [item, movementsFor]);

  if (!item) return null;
  const st = statusOf(item);
  const av = available(item);
  const coverDays = item.dailyUse > 0 ? av / item.dailyUse : Infinity;
  const zone = ZONES.find((z) => z.code === item.bin.charAt(0));
  const sup = supById(item.sup);
  const barPct = Math.min(100, (av / Math.max(1, item.rp * 2)) * 100);

  const meta = (label: string, val: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-1.5 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-mut">{label}</span>
      <span className="mono text-[12.5px] text-ink">{val}</span>
    </div>
  );

  return (
    <SlidePanel
      onClose={closeItem}
      header={
        <div className="relative flex-1 pl-3">
          <span className="absolute -left-5 top-[-17px] bottom-[-17px] w-[3px]" style={{ backgroundColor: STATUS_META[st].color }} />
          <div className="flex items-center gap-2">
            <span className="mono text-[12px] font-semibold tracking-wide text-mut">{item.sku}</span>
            <StatusChip status={st} />
          </div>
          <h2 className="mt-1 text-[16px] font-bold leading-snug tracking-tight">{item.name}</h2>
          <p className="mt-0.5 text-[12px] text-mut">
            {item.cat} · bin <span className="mono">{item.bin}</span> · {zone?.name}
          </p>
        </div>
      }
      footer={
        <div className="flex items-center justify-between text-[11.5px] text-mut">
          <span className="mono">Last count {relTime(Date.now() - item.lastCountH * H)}</span>
          <span className="flex items-center gap-1">
            <span className="kbd">Esc</span> close
          </span>
        </div>
      }
    >
      <div className="flex items-end justify-between rounded border border-line bg-paper/50 p-3">
        <button
          className="flex items-center gap-1.5 text-[12px] font-semibold text-sig transition-colors hover:text-sigdark"
          onClick={() => {
            setInvQuery(item.sku);
            closeItem();
            nav("inventory");
          }}
        >
          View in inventory
          <IcArrowR className="h-3.5 w-3.5" />
        </button>
        {item.doc && (
          <button
            className="mono flex items-center gap-1.5 text-[11.5px] text-mut transition-colors hover:text-ink"
            onClick={() => {
              downloadText(item.doc!.replace(".pdf", ".txt"), `FORGELINE IMS — document stub\nSKU: ${item.sku}\nFile: ${item.doc}\nBatch: ${item.batch ?? "-"}\nRetrieved from terminal 04.`);
              toast(`${item.doc} sent to terminal`, "info");
            }}
          >
            <IcFile className="h-3.5 w-3.5" />
            {item.doc}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line">
        {[
          { l: "On hand", v: item.onHand },
          { l: "Allocated", v: item.alloc },
          { l: "Available", v: av, hot: true },
        ].map((c) => (
          <div key={c.l} className="bg-surface px-3 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-mut">{c.l}</p>
            <p className={cn("mono mt-0.5 text-[20px] font-semibold leading-none", c.hot && st !== "ok" ? "text-ink" : "text-ink")} style={c.hot && st !== "ok" ? { color: STATUS_META[st].color } : undefined}>
              {fmtQty(c.v)}
              <span className="ml-1 text-[11px] font-medium text-faint">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-mut">
          <span>
            Reorder point <span className="mono font-semibold text-ink">{fmtQty(item.rp)}</span>
          </span>
          <span>
            Cover{" "}
            <span className="mono font-semibold" style={{ color: STATUS_META[st].color }}>
              {coverDays === Infinity ? "—" : `${coverDays.toFixed(1)} d`}
            </span>
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${barPct}%`, backgroundColor: STATUS_META[st].color }} />
          <span className="absolute inset-y-0 left-1/2 w-px bg-ink/30" title="Reorder point" />
        </div>
      </div>

      <ActionForms sku={item.sku} />

      <h3 className="mb-1 mt-6 text-[11px] font-semibold uppercase tracking-[0.07em] text-mut">Item record</h3>
      <div>
        {meta("Location", `${item.bin} · Zone ${item.bin.charAt(0)}`)}
        {meta("Supplier", `${sup?.name ?? item.sup} · ${sup?.leadDays ?? "—"} d lead`)}
        {meta("Batch / Lot", item.batch ?? "—")}
        {meta(
          "Expiry",
          item.expiry ? (
            <span className={cn(daysUntil(item.expiry) <= 45 && "font-semibold text-warn")}>
              {item.expiry} · {daysUntil(item.expiry)} d
            </span>
          ) : (
            "—"
          )
        )}
        {meta("Unit cost", money2(item.cost))}
        {meta("Value on hand", money2(item.onHand * item.cost))}
        {meta("Daily use", `${fmtQty(item.dailyUse)} ${item.unit}/d`)}
        {meta("Reorder point", `${fmtQty(item.rp)} ${item.unit}`)}
      </div>

      <h3 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.07em] text-mut">Movement history</h3>
      {moves.length === 0 ? (
        <p className="rounded border border-dashed border-linedark px-3 py-4 text-center text-[12px] text-mut">No recorded movements for this SKU yet.</p>
      ) : (
        <ul className="overflow-hidden rounded border border-line">
          {moves.map((m, i) => (
            <li key={m.id} className={cn("flex items-center gap-2.5 px-3 py-2", i > 0 && "border-t border-line/70")}>
              <span className="mono w-[46px] shrink-0 text-[11px] text-faint">{hhmm(m.ts)}</span>
              <KindTag kind={m.kind} />
              <span className="mono w-[72px] shrink-0 text-right text-[12.5px] font-semibold">
                {m.kind === "ADJ" && m.qty > 0 ? "+" : ""}
                {fmtQty(m.qty)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-mut">
                {m.from && m.to ? (
                  <>
                    <span className="mono">{m.from}</span> → <span className="mono">{m.to}</span>
                  </>
                ) : (
                  m.ref
                )}
              </span>
              <span className="mono shrink-0 text-[10.5px] text-faint">{m.user}</span>
            </li>
          ))}
        </ul>
      )}
    </SlidePanel>
  );
}
