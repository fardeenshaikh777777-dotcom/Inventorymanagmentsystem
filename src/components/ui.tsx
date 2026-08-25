import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { STATUS_META, type StockStatus } from "../lib/data";
import { useStore } from "../lib/store";
import { IcCheck, IcWarn, IcX, IcBell } from "./icons";

export const cn = (...xs: (string | false | undefined | null)[]) => xs.filter(Boolean).join(" ");

/* ---------------- status system (dot · chip · rail) ---------------- */

export function StatusDot({ status, size = "w-2 h-2" }: { status: StockStatus; size?: string }) {
  const c = STATUS_META[status].color;
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full", size)}
      style={{ backgroundColor: c, boxShadow: `0 0 0 3px ${c}1f` }}
      aria-label={STATUS_META[status].label}
    />
  );
}

export function StatusChip({ status, className }: { status: StockStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap", className)} style={{ color: m.color }}>
      <StatusDot status={status} size="w-1.5 h-1.5" />
      {m.label}
    </span>
  );
}

/** 3px left-edge status bar — position inside a `relative` parent */
export function StatusRail({ status }: { status: StockStatus }) {
  return <span className="absolute left-0 top-0 h-full w-[3px] rounded-l" style={{ backgroundColor: STATUS_META[status].color }} />;
}

/* ---------------- movement kind tag -------------------------------- */

const KIND_STYLE: Record<string, string> = {
  IN: "text-ok border-ok/25 bg-okwash",
  OUT: "text-ink border-line bg-paper",
  XFER: "text-sig border-sig/25 bg-sigwash",
  ADJ: "text-mut border-line bg-paper",
};

export function KindTag({ kind }: { kind: "IN" | "OUT" | "XFER" | "ADJ" }) {
  return (
    <span className={cn("mono inline-flex w-[52px] justify-center rounded-sm border px-1 py-0.5 text-[10.5px] font-semibold tracking-wide", KIND_STYLE[kind])}>
      {kind}
    </span>
  );
}

/* ---------------- buttons ------------------------------------------ */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "subtle" | "danger";
  sm?: boolean;
};

export function Btn({ variant = "ghost", sm, className, children, ...rest }: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded font-semibold transition-all duration-150 active:translate-y-px disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
  const size = sm ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-[13px]";
  const v = {
    primary: "bg-sig text-white hover:bg-sigdark shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]",
    ghost: "border border-line bg-surface text-ink hover:border-linedark hover:bg-paper",
    subtle: "text-mut hover:text-ink hover:bg-line/50",
    danger: "border border-crit/35 text-crit hover:bg-critwash",
  }[variant];
  return (
    <button className={cn(base, size, v, className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------------- form primitives ---------------------------------- */

export const inputCls =
  "h-9 w-full rounded border border-line bg-surface px-2.5 text-[13px] text-ink placeholder:text-faint transition-shadow focus:border-sig focus:outline-none focus:ring-2 focus:ring-sig/20";

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.07em] text-mut">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-sig" : "bg-linedark")}
    >
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", on ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

/* ---------------- popover ------------------------------------------ */

export function Pop({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />
      <div className={cn("anim-rise absolute z-40 card p-3 shadow-[0_10px_32px_rgba(27,34,43,0.14)]", className)}>{children}</div>
    </>
  );
}

/* ---------------- slide-in detail panel ----------------------------- */

export function SlidePanel({ header, children, footer, onClose }: { header: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/25 md:hidden" onClick={onClose} aria-hidden />
      <aside
        className="anim-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-line bg-surface shadow-[-16px_0_48px_rgba(27,34,43,0.12)]"
        role="dialog"
        aria-label="Item detail"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">{header}</div>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line bg-paper/60 px-5 py-3">{footer}</div>}
      </aside>
    </>
  );
}

/* ---------------- modal -------------------------------------------- */

export function Modal({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/35" onClick={onClose} aria-hidden />
      <div className="anim-rise card relative w-full max-w-[460px] shadow-[0_24px_64px_rgba(27,34,43,0.25)]" role="dialog" aria-modal>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
          <Btn variant="subtle" sm onClick={onClose} aria-label="Close dialog">
            <IcX className="h-4 w-4" />
          </Btn>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-paper/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- states ------------------------------------------- */

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-linedark text-faint">
        {icon ?? <IcCheck className="h-5 w-5" />}
      </div>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-mut">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-crit/30 bg-critwash text-crit">
        <IcWarn className="h-5 w-5" />
      </div>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-mut">{body}</p>
      {retry && (
        <Btn variant="ghost" className="mt-4" onClick={retry}>
          Retry sync
        </Btn>
      )}
    </div>
  );
}

/* ---------------- misc ---------------------------------------------- */

export function Sparkline({ data, color = "#2C5AA0", w = 96, h = 26 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 5)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity={0.07} stroke="none" />
    </svg>
  );
}

export function ViewHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[17px] font-bold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-[12.5px] text-mut">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Meter({ pct, color }: { pct: number; color?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${p}%`, backgroundColor: color ?? (p > 85 ? "#E0982A" : "#2C5AA0") }} />
    </div>
  );
}

/* ---------------- toasts ------------------------------------------- */

const TOAST_META = {
  ok: { color: "#1F8A5F", icon: <IcCheck className="h-4 w-4" /> },
  err: { color: "#C4432E", icon: <IcWarn className="h-4 w-4" /> },
  warn: { color: "#E0982A", icon: <IcWarn className="h-4 w-4" /> },
  info: { color: "#2C5AA0", icon: <IcBell className="h-4 w-4" /> },
};

export function ToastHost() {
  const { toasts, dropToast } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => {
        const m = TOAST_META[t.kind];
        return (
          <div key={t.id} className="anim-toast card pointer-events-auto relative flex items-start gap-3 overflow-hidden py-3 pl-4 pr-3 shadow-[0_10px_32px_rgba(27,34,43,0.16)]">
            <span className="absolute left-0 top-0 h-full w-[3px]" style={{ backgroundColor: m.color }} />
            <span className="mt-0.5 shrink-0" style={{ color: m.color }}>
              {m.icon}
            </span>
            <p className="mono flex-1 text-[12px] leading-snug text-ink">{t.msg}</p>
            <button className="shrink-0 rounded p-1 text-faint transition-colors hover:bg-paper hover:text-ink" onClick={() => dropToast(t.id)} aria-label="Dismiss notification">
              <IcX className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
