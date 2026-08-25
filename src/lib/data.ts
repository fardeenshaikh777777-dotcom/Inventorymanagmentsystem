/* ------------------------------------------------------------------ */
/*  Forgeline IMS — domain model + seed data                           */
/* ------------------------------------------------------------------ */

export type StockStatus = "ok" | "low" | "crit";
export type ViewId =
  | "dashboard"
  | "inventory"
  | "receiving"
  | "shipments"
  | "locations"
  | "suppliers"
  | "reports"
  | "alerts"
  | "settings";

export interface Item {
  sku: string;
  name: string;
  cat: string;
  unit: string;
  onHand: number;
  alloc: number;
  rp: number; // reorder point
  bin: string;
  sup: string;
  batch?: string;
  expiry?: string; // ISO date
  cost: number;
  dailyUse: number;
  variance?: number; // last cycle-count discrepancy
  doc?: string;
  lastCountH: number; // hours since last verified count
}

export interface Movement {
  id: string;
  ts: number;
  sku: string;
  kind: "IN" | "OUT" | "XFER" | "ADJ";
  qty: number;
  from?: string;
  to?: string;
  user: string;
  ref: string;
}

export interface PoLine {
  sku: string;
  ord: number;
  rcv: number;
}
export interface PurchaseOrder {
  id: string;
  sup: string;
  etaDays: number; // offset from today; negative = overdue
  lines: PoLine[];
  draft?: boolean;
}

export interface PickLine {
  sku: string;
  req: number;
  pick: number;
}
export interface PickList {
  id: string;
  dest: string;
  dueDays: number;
  prio: "HIGH" | "MED" | "LOW";
  lines: PickLine[];
  status: "open" | "shipped";
}

export interface Transfer {
  id: string;
  sku: string;
  qty: number;
  from: string;
  to: string;
  ts: number;
  status: "open" | "done";
  user: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  leadDays: number;
  onTime: number; // %
}

export interface UserRec {
  id: string;
  name: string;
  initials: string;
  role: "admin" | "supervisor" | "clerk" | "viewer";
  active: boolean;
}

export interface Alert {
  id: string;
  sev: "crit" | "warn" | "info";
  kind: "stock" | "receipt" | "expiry" | "count";
  title: string;
  sku?: string;
  poId?: string;
  detail: string;
}

export interface Db {
  items: Item[];
  movements: Movement[];
  pos: PurchaseOrder[];
  picks: PickList[];
  transfers: Transfer[];
  users: UserRec[];
  categories: string[];
  units: string[];
  safetyDays: number;
  alertLevel: "crit" | "critlow";
}

/* ---------------- status derivation (the one signal system) ------- */

export const available = (it: Item) => Math.max(0, it.onHand - it.alloc);

export const statusOf = (it: Item): StockStatus => {
  const av = it.onHand - it.alloc;
  if (av <= 0) return "crit";
  if (av <= it.rp) return "low";
  return "ok";
};

export const STATUS_META: Record<StockStatus, { label: string; color: string; rank: number }> = {
  ok: { label: "In Stock", color: "#1F8A5F", rank: 0 },
  low: { label: "Low Stock", color: "#E0982A", rank: 1 },
  crit: { label: "Critical", color: "#C4432E", rank: 2 },
};

export const worst = (list: StockStatus[]): StockStatus =>
  list.includes("crit") ? "crit" : list.includes("low") ? "low" : "ok";

/* ---------------- zones / bins ------------------------------------- */

export interface Zone {
  code: string;
  name: string;
  cap: number;
}

export const ZONES: Zone[] = [
  { code: "A", name: "Raw Steel Yard", cap: 48 },
  { code: "B", name: "Small Parts & Fasteners", cap: 96 },
  { code: "C", name: "MRO & Tooling Stores", cap: 60 },
  { code: "D", name: "Electrical & Controls", cap: 40 },
  { code: "E", name: "Finished Goods", cap: 36 },
  { code: "F", name: "Chemicals & Paint", cap: 24 },
];

export const binZone = (bin: string) => bin.charAt(0);

export const binsForZone = (zone: string) =>
  Array.from({ length: 24 }, (_, i) => `${zone}-${String(Math.floor(i / 4) + 1).padStart(2, "0")}-${(i % 4) + 1}`);

export const ALL_BINS = ZONES.flatMap((z) => binsForZone(z.code));

/* ---------------- suppliers ---------------------------------------- */

export const SUPPLIERS: Supplier[] = [
  { id: "SUP-01", name: "Ryerson Metals", contact: "D. Kowalski", phone: "+1 312 555 0184", leadDays: 12, onTime: 94 },
  { id: "SUP-02", name: "FastenPro Industrial", contact: "S. Ahmed", phone: "+1 216 555 0142", leadDays: 6, onTime: 97 },
  { id: "SUP-03", name: "BearingPoint Drives", contact: "L. Moreau", phone: "+1 704 555 0117", leadDays: 9, onTime: 91 },
  { id: "SUP-04", name: "NordLub Chemicals", contact: "K. Jensen", phone: "+1 414 555 0163", leadDays: 7, onTime: 96 },
  { id: "SUP-05", name: "Helios Controls", contact: "P. Nakamura", phone: "+1 408 555 0129", leadDays: 15, onTime: 88 },
  { id: "SUP-06", name: "Apex Tooling", contact: "M. Silva", phone: "+1 978 555 0171", leadDays: 10, onTime: 93 },
];

export const supName = (id: string) => SUPPLIERS.find((s) => s.id === id)?.name ?? id;
export const supById = (id: string) => SUPPLIERS.find((s) => s.id === id);

/* ---------------- seed items --------------------------------------- */

const H = 3600_000;
const D = 24 * H;
const now = Date.now();
const daysFromNow = (d: number) => new Date(now + d * D).toISOString().slice(0, 10);

const it = (
  sku: string,
  name: string,
  cat: string,
  unit: string,
  onHand: number,
  alloc: number,
  rp: number,
  bin: string,
  sup: string,
  cost: number,
  dailyUse: number,
  lastCountH: number,
  extra: Partial<Item> = {}
): Item => ({ sku, name, cat, unit, onHand, alloc, rp, bin, sup, cost, dailyUse, lastCountH, ...extra });

export const SEED_ITEMS: Item[] = [
  it("STL-1045-12MM", "1045 Steel Plate 12 mm", "Raw Steel", "EA", 42, 10, 20, "A-01-2", "SUP-01", 118.0, 4, 26, { batch: "H4482", doc: "mill-cert-H4482.pdf" }),
  it("STL-A36-6MM", "A36 Steel Sheet 6 mm", "Raw Steel", "EA", 12, 8, 16, "A-01-5", "SUP-01", 74.5, 6, 51, { batch: "H4517" }),
  it("STL-4140-RD50", "4140 Alloy Round 50 mm", "Raw Steel", "M", 160, 40, 60, "A-03-1", "SUP-01", 9.2, 22, 12, { batch: "H4390" }),
  it("AL-6061-25", "6061 Aluminium Plate 25 mm", "Raw Steel", "EA", 8, 2, 10, "A-02-3", "SUP-01", 96.4, 2, 74, { batch: "A2211" }),
  it("SS-304-2B", "304 Stainless Sheet 2B 1.5 mm", "Raw Steel", "EA", 0, 0, 8, "A-02-6", "SUP-01", 89.0, 3, 96, { batch: "S1187" }),
  it("FST-M8X30-ZN", "Hex Bolt M8×30 Zinc", "Fasteners", "PK", 26, 6, 12, "B-11-2", "SUP-02", 11.8, 5, 8, {}),
  it("FST-M10-NUT", "Nyloc Nut M10", "Fasteners", "PK", 9, 4, 10, "B-11-4", "SUP-02", 6.4, 4, 33, {}),
  it("FST-M8-WASH", "Flat Washer M8", "Fasteners", "PK", 41, 0, 15, "B-11-5", "SUP-02", 3.1, 6, 18, { variance: -2 }),
  it("FST-M12X60-88", "Hex Bolt M12×60 Gr 8.8", "Fasteners", "PK", 0, 0, 8, "B-12-1", "SUP-02", 17.6, 3, 120, {}),
  it("FST-RIV-48", "Blind Rivet 4.8×12", "Fasteners", "PK", 18, 2, 10, "B-12-6", "SUP-02", 8.9, 2, 55, {}),
  it("BRG-6204-2RS", "Ball Bearing 6204-2RS", "Bearings & Drives", "EA", 34, 8, 16, "C-04-2", "SUP-03", 12.4, 6, 15, {}),
  it("BRG-6310-C3", "Ball Bearing 6310-C3", "Bearings & Drives", "EA", 6, 6, 8, "C-04-5", "SUP-03", 38.7, 2, 40, {}),
  it("VLT-B34", "V-Belt B34", "Bearings & Drives", "EA", 22, 3, 10, "C-05-1", "SUP-03", 14.2, 1, 66, {}),
  it("CHN-12B-1", "Roller Chain 12B-1", "Bearings & Drives", "M", 45, 10, 20, "C-05-4", "SUP-03", 21.5, 3, 29, {}),
  it("SEAL-HYD-40", "Hydraulic Seal Kit 40 mm", "MRO Consumables", "EA", 7, 2, 6, "C-07-2", "SUP-03", 44.0, 1, 48, {}),
  it("HYD-OIL-46", "Hydraulic Oil ISO VG46", "MRO Consumables", "L", 210, 0, 120, "F-01-1", "SUP-04", 4.6, 18, 20, { batch: "L2311", doc: "sds-vg46.pdf", variance: 6 }),
  it("GR-EP2", "Grease Cartridge EP-2", "MRO Consumables", "EA", 14, 0, 12, "C-07-5", "SUP-04", 7.8, 2, 84, {}),
  it("GLV-NIT-L", "Nitrile Gloves L", "MRO Consumables", "BOX", 3, 1, 6, "C-09-3", "SUP-02", 9.5, 2, 38, {}),
  it("WLD-ER70S-12", "MIG Wire ER70S-6 1.2 mm", "MRO Consumables", "EA", 19, 5, 10, "C-08-1", "SUP-06", 32.0, 3, 57, { batch: "W88231" }),
  it("INS-CNMG-120408", "Carbide Insert CNMG 120408", "Tooling & Inserts", "PK", 11, 4, 8, "C-02-4", "SUP-06", 68.0, 2, 22, {}),
  it("INS-TNMG-160404", "Carbide Insert TNMG 160404", "Tooling & Inserts", "PK", 8, 2, 3, "C-02-5", "SUP-06", 61.5, 1, 70, {}),
  it("DRB-HSS-13", "HSS Drill Bit 13 mm", "Tooling & Inserts", "EA", 26, 0, 10, "C-02-8", "SUP-06", 11.2, 1, 92, {}),
  it("PLC-S7-DI16", "PLC Digital Input Module 16 ch", "Electrical & Controls", "EA", 4, 1, 2, "D-01-2", "SUP-05", 412.0, 0.2, 130, { doc: "manual-di16.pdf" }),
  it("VFD-2K2", "Variable Freq. Drive 2.2 kW", "Electrical & Controls", "EA", 3, 1, 1, "D-01-5", "SUP-05", 588.0, 0.1, 150, {}),
  it("PRX-M12-PNP", "Proximity Sensor M12 PNP", "Electrical & Controls", "EA", 0, 0, 6, "D-02-3", "SUP-05", 46.8, 1, 61, {}),
  it("CNT-24VDC", "Contactor 24 VDC 25 A", "Electrical & Controls", "EA", 9, 2, 4, "D-02-6", "SUP-05", 74.3, 0.5, 45, {}),
  it("WIRE-CU-6", "Copper Busbar 6 mm", "Electrical & Controls", "M", 75, 20, 30, "D-03-1", "SUP-05", 12.9, 4, 17, {}),
  it("SOLV-IPA-5", "Isopropyl Alcohol 5 L", "Chemicals & Paint", "EA", 16, 2, 8, "F-02-2", "SUP-04", 18.4, 1, 36, { batch: "C1187", expiry: daysFromNow(38) }),
  it("PAINT-RAL7035", "2K Paint RAL 7035 5 L", "Chemicals & Paint", "EA", 6, 1, 4, "F-02-4", "SUP-04", 52.0, 0.5, 78, { batch: "P0912", expiry: daysFromNow(160) }),
  it("THNR-10L", "Paint Thinner 10 L", "Chemicals & Paint", "EA", 11, 0, 6, "F-02-6", "SUP-04", 26.5, 0.5, 59, { batch: "T3302", expiry: daysFromNow(220) }),
  it("CLNT-SYN-20", "Synthetic Coolant 20 L", "Chemicals & Paint", "EA", 3, 3, 4, "F-03-1", "SUP-04", 96.0, 1, 25, { batch: "C4410", expiry: daysFromNow(21) }),
  it("PLT-STR-160", "Steel Strap 16 mm", "MRO Consumables", "COIL", 9, 1, 5, "B-14-2", "SUP-02", 38.0, 0.5, 104, {}),
];

/* ---------------- purchase orders ---------------------------------- */

export const SEED_POS: PurchaseOrder[] = [
  {
    id: "PO-2214",
    sup: "SUP-01",
    etaDays: -2,
    lines: [
      { sku: "STL-1045-12MM", ord: 40, rcv: 0 },
      { sku: "SS-304-2B", ord: 12, rcv: 0 },
    ],
  },
  {
    id: "PO-2218",
    sup: "SUP-02",
    etaDays: 1,
    lines: [
      { sku: "FST-M8X30-ZN", ord: 30, rcv: 10 },
      { sku: "FST-M12X60-88", ord: 20, rcv: 0 },
      { sku: "FST-M10-NUT", ord: 24, rcv: 0 },
    ],
  },
  {
    id: "PO-2221",
    sup: "SUP-03",
    etaDays: 3,
    lines: [
      { sku: "BRG-6310-C3", ord: 12, rcv: 0 },
      { sku: "VLT-B34", ord: 10, rcv: 4 },
    ],
  },
  {
    id: "PO-2209",
    sup: "SUP-04",
    etaDays: -6,
    lines: [{ sku: "HYD-OIL-46", ord: 200, rcv: 200 }],
  },
];

export const poStatus = (po: PurchaseOrder): "closed" | "partial" | "open" | "overdue" | "draft" => {
  if (po.draft) return "draft";
  const done = po.lines.every((l) => l.rcv >= l.ord);
  if (done) return "closed";
  if (po.etaDays < 0) return "overdue";
  return po.lines.some((l) => l.rcv > 0) ? "partial" : "open";
};

/* ---------------- pick lists / transfers --------------------------- */

export const SEED_PICKS: PickList[] = [
  {
    id: "PK-108",
    dest: "Line 2 — Assembly",
    dueDays: 0,
    prio: "HIGH",
    status: "open",
    lines: [
      { sku: "BRG-6204-2RS", req: 8, pick: 0 },
      { sku: "SEAL-HYD-40", req: 6, pick: 0 },
      { sku: "FST-M8X30-ZN", req: 20, pick: 0 },
    ],
  },
  {
    id: "PK-109",
    dest: "CNC Shop — Bay 3",
    dueDays: 1,
    prio: "MED",
    status: "open",
    lines: [
      { sku: "INS-CNMG-120408", req: 6, pick: 4 },
      { sku: "CLNT-SYN-20", req: 2, pick: 0 },
    ],
  },
  {
    id: "PK-110",
    dest: "Maintenance Shop",
    dueDays: 2,
    prio: "LOW",
    status: "open",
    lines: [
      { sku: "HYD-OIL-46", req: 40, pick: 0 },
      { sku: "GR-EP2", req: 6, pick: 0 },
    ],
  },
  {
    id: "PK-105",
    dest: "Line 1 — Machining",
    dueDays: -1,
    prio: "MED",
    status: "shipped",
    lines: [
      { sku: "DRB-HSS-13", req: 10, pick: 10 },
      { sku: "WLD-ER70S-12", req: 4, pick: 4 },
    ],
  },
];

export const SEED_TRANSFERS: Transfer[] = [
  { id: "TR-51", sku: "STL-4140-RD50", qty: 20, from: "A-03-1", to: "E-02-1", ts: now - 3 * H, status: "open", user: "J. Reyes" },
  { id: "TR-52", sku: "BRG-6204-2RS", qty: 6, from: "C-04-2", to: "E-01-3", ts: now - 6 * H, status: "open", user: "M. Okafor" },
  { id: "TR-48", sku: "HYD-OIL-46", qty: 60, from: "F-01-1", to: "C-06-2", ts: now - 30 * H, status: "done", user: "J. Reyes" },
];

/* ---------------- movements ---------------------------------------- */

let mvSeed = 0;
const mv = (hAgo: number, sku: string, kind: Movement["kind"], qty: number, ref: string, user: string, from?: string, to?: string): Movement => ({
  id: `MV-${String(900 - mvSeed++).padStart(4, "0")}`,
  ts: now - hAgo * H,
  sku,
  kind,
  qty,
  ref,
  user,
  from,
  to,
});

export const SEED_MOVEMENTS: Movement[] = [
  mv(0.4, "FST-M8X30-ZN", "OUT", 4, "PK-108", "M. Okafor", "B-11-2", "Line 2"),
  mv(1.1, "BRG-6204-2RS", "XFER", 6, "TR-52", "M. Okafor", "C-04-2", "E-01-3"),
  mv(1.8, "STL-4140-RD50", "XFER", 20, "TR-51", "J. Reyes", "A-03-1", "E-02-1"),
  mv(2.6, "INS-CNMG-120408", "OUT", 2, "PK-109", "J. Reyes", "C-02-4", "CNC Shop"),
  mv(3.4, "STL-1045-12MM", "OUT", 3, "WO-8841", "R. Vance", "A-01-2", "Line 1"),
  mv(4.2, "HYD-OIL-46", "ADJ", 6, "Cycle count", "R. Vance", "F-01-1"),
  mv(5.0, "WLD-ER70S-12", "OUT", 2, "WO-8837", "M. Okafor", "C-08-1", "Weld Cell"),
  mv(6.5, "FST-M8-WASH", "ADJ", -2, "Cycle count", "R. Vance", "B-11-5"),
  mv(8.0, "VLT-B34", "IN", 4, "PO-2221", "J. Reyes", "Dock 1", "C-05-1"),
  mv(9.5, "CHN-12B-1", "OUT", 5, "WO-8829", "M. Okafor", "C-05-4", "Maintenance"),
  mv(11.0, "PLC-S7-DI16", "IN", 1, "PO-2196", "J. Reyes", "Dock 2", "D-01-2"),
  mv(13.5, "SS-304-2B", "OUT", 6, "WO-8820", "R. Vance", "A-02-6", "Line 3"),
  mv(16.0, "FST-M8X30-ZN", "IN", 10, "PO-2218", "M. Okafor", "Dock 1", "B-11-2"),
  mv(20.0, "GR-EP2", "OUT", 3, "WO-8812", "J. Reyes", "C-07-5", "Maintenance"),
  mv(24.0, "WIRE-CU-6", "OUT", 12, "WO-8805", "M. Okafor", "D-03-1", "Panel Shop"),
  mv(27.0, "SOLV-IPA-5", "IN", 8, "PO-2201", "J. Reyes", "Dock 2", "F-02-2"),
  mv(31.0, "BRG-6310-C3", "OUT", 2, "WO-8798", "R. Vance", "C-04-5", "Line 2"),
  mv(36.0, "AL-6061-25", "OUT", 2, "WO-8790", "M. Okafor", "A-02-3", "CNC Shop"),
  mv(41.0, "HYD-OIL-46", "IN", 200, "PO-2209", "J. Reyes", "Dock 1", "F-01-1"),
  mv(46.0, "CNT-24VDC", "OUT", 1, "WO-8784", "R. Vance", "D-02-6", "Panel Shop"),
  mv(52.0, "STL-A36-6MM", "OUT", 8, "WO-8780", "M. Okafor", "A-01-5", "Line 1"),
  mv(58.0, "THNR-10L", "IN", 6, "PO-2201", "J. Reyes", "Dock 2", "F-02-6"),
];

/* ---------------- users -------------------------------------------- */

export const SEED_USERS: UserRec[] = [
  { id: "U-01", name: "A. Whitfield", initials: "AW", role: "admin", active: true },
  { id: "U-02", name: "R. Vance", initials: "RV", role: "supervisor", active: true },
  { id: "U-03", name: "M. Okafor", initials: "MO", role: "clerk", active: true },
  { id: "U-04", name: "J. Reyes", initials: "JR", role: "clerk", active: true },
  { id: "U-05", name: "T. Lindqvist", initials: "TL", role: "supervisor", active: false },
  { id: "U-06", name: "D. Chen", initials: "DC", role: "viewer", active: true },
];

export const CATEGORIES = [
  "Raw Steel",
  "Fasteners",
  "Bearings & Drives",
  "MRO Consumables",
  "Tooling & Inserts",
  "Electrical & Controls",
  "Chemicals & Paint",
];

export const UNITS = ["EA", "PK", "BOX", "L", "KG", "M", "COIL"];

/* ---------------- alerts ------------------------------------------- */

export const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / D);

export function buildAlerts(db: Db, dismissed: Set<string>): Alert[] {
  const out: Alert[] = [];
  const push = (a: Alert) => {
    if (!dismissed.has(a.id)) out.push(a);
  };

  for (const i of db.items) {
    const s = statusOf(i);
    if (s === "crit")
      push({ id: `crit-${i.sku}`, sev: "crit", kind: "stock", sku: i.sku, title: `${i.sku} is out of stock`, detail: `Available 0 ${i.unit} · reorder point ${i.rp} ${i.unit} · bin ${i.bin}` });
    else if (s === "low" && db.alertLevel === "critlow")
      push({ id: `low-${i.sku}`, sev: "warn", kind: "stock", sku: i.sku, title: `${i.sku} below reorder point`, detail: `Available ${available(i)} ${i.unit} · reorder at ${i.rp} ${i.unit} · bin ${i.bin}` });
    if (i.expiry) {
      const d = daysUntil(i.expiry);
      if (d <= 45)
        push({ id: `exp-${i.sku}`, sev: d <= 21 ? "crit" : "warn", kind: "expiry", sku: i.sku, title: `Batch ${i.batch ?? "—"} expires in ${d} d`, detail: `${i.sku} · ${i.name} · use ${i.onHand} ${i.unit} before ${i.expiry}` });
    }
    if (i.variance)
      push({ id: `cnt-${i.sku}`, sev: "warn", kind: "count", sku: i.sku, title: `Count discrepancy on ${i.sku}`, detail: `Last cycle count ${i.variance > 0 ? "+" : ""}${i.variance} ${i.unit} vs system · verify bin ${i.bin}` });
  }

  for (const po of db.pos) {
    if (poStatus(po) === "overdue")
      push({ id: `po-${po.id}`, sev: "crit", kind: "receipt", poId: po.id, title: `${po.id} is ${Math.abs(po.etaDays)} d overdue`, detail: `${supName(po.sup)} · ${po.lines.length} line${po.lines.length > 1 ? "s" : ""} waiting at dock` });
  }

  const order = { crit: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.sev] - order[b.sev]);
}

/* ---------------- formatting --------------------------------------- */

export const num = (n: number) => n.toLocaleString("en-US");
export const qty = (n: number) => (Number.isInteger(n) ? num(n) : n.toFixed(1));
export const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const money2 = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const hhmm = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

export const relTime = (ts: number) => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export const datePlus = (days: number) => {
  const d = new Date(Date.now() + days * D);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
};

export const etaLabel = (days: number) => {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${Math.abs(days)} d overdue`;
  return datePlus(days);
};

/* ---------------- search + csv ------------------------------------- */

export function matchItem(i: Item, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  return (
    i.sku.toLowerCase().includes(s) ||
    i.name.toLowerCase().includes(s) ||
    i.bin.toLowerCase().includes(s) ||
    (i.batch ?? "").toLowerCase().includes(s)
  );
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const toCsv = (rows: (string | number)[][]) =>
  rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

/* ---------------- chart series (deterministic) ---------------------- */

export function flowSeries(days: number) {
  const out: { day: string; inQty: number; outQty: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = days - i;
    const inQty = Math.round(46 + 30 * Math.sin(t / 2.6) + 14 * Math.sin(t / 1.3) + (t % 7 === 3 ? 38 : 0));
    const outQty = Math.round(40 + 26 * Math.sin(t / 3.1 + 1) + 12 * Math.cos(t / 1.7));
    out.push({ day: datePlus(-i), inQty: Math.max(8, inQty), outQty: Math.max(6, outQty) });
  }
  return out;
}
