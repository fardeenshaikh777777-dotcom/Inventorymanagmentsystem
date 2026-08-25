import type { ReactNode } from "react";

const mk = (node: ReactNode) => {
  const C = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {node}
    </svg>
  );
  return C;
};

export const IcGrid = mk(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>
);

export const IcBox = mk(
  <>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.3 7l8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </>
);

export const IcTrayIn = mk(
  <>
    <path d="M12 3v10" />
    <path d="m8 9 4 4 4-4" />
    <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
  </>
);

export const IcTruck = mk(
  <>
    <path d="M14 17V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2" />
    <path d="M9 17h6" />
    <path d="M19 17h2a1 1 0 0 0 1-1v-3.35a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 7H14" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </>
);

export const IcMap = mk(
  <>
    <path d="M9 3 3.6 5.16a1 1 0 0 0-.6.93v13.4a.5.5 0 0 0 .67.47L9 18l6 3 5.4-2.16a1 1 0 0 0 .6-.93V4.5a.5.5 0 0 0-.67-.47L15 6 9 3z" />
    <path d="M9 3v15" />
    <path d="M15 6v15" />
  </>
);

export const IcFactory = mk(
  <>
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M17 18h1" />
    <path d="M12 18h1" />
    <path d="M7 18h1" />
  </>
);

export const IcChart = mk(
  <>
    <path d="M3 3v18h18" />
    <path d="M7 17v-6" />
    <path d="M12 17V7" />
    <path d="M17 17v-4" />
  </>
);

export const IcBell = mk(
  <>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </>
);

export const IcGear = mk(
  <>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
  </>
);

export const IcSearch = mk(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>
);

export const IcBarcode = mk(
  <>
    <path d="M4 6v12" />
    <path d="M7 6v12" />
    <path d="M10 6v8" />
    <path d="M13 6v12" />
    <path d="M16 6v8" />
    <path d="M20 6v12" />
  </>
);

export const IcChevD = mk(<path d="m6 9 6 6 6-6" />);
export const IcChevR = mk(<path d="m9 6 6 6-6 6" />);
export const IcX = mk(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>
);
export const IcPlus = mk(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
);
export const IcMinus = mk(<path d="M5 12h14" />);
export const IcCheck = mk(<path d="M20 6 9 17l-5-5" />);

export const IcWarn = mk(
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
);

export const IcClock = mk(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
);

export const IcArrowR = mk(
  <>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </>
);

export const IcFilter = mk(<path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />);

export const IcColumns = mk(
  <>
    <rect x="3" y="4" width="18" height="16" rx="1" />
    <path d="M9 4v16" />
    <path d="M15 4v16" />
  </>
);

export const IcDownload = mk(
  <>
    <path d="M12 3v10" />
    <path d="m8 9 4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </>
);

export const IcSwap = mk(
  <>
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </>
);

export const IcPencil = mk(<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />);

export const IcFile = mk(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </>
);

export const IcUser = mk(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </>
);

export const IcRefresh = mk(
  <>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </>
);

export const IcPrinter = mk(
  <>
    <path d="M6 9V3h12v6" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="7" />
  </>
);
