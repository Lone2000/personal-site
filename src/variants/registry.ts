/** Design variants, switched at runtime so all four can be compared side by side.
 *  Each one reads the same copy from src/data/site.ts. Nothing here is content. */

export type VariantId = "current" | "ledger" | "console" | "reel";

export interface VariantMeta {
  id: VariantId;
  /** the name in the switcher */
  name: string;
  /** one line on what the design is arguing for */
  idea: string;
  /** which reading of the résumé it leans on */
  angle: string;
  /** the data-variant value; "current" sets none and keeps the original tokens */
  token: string | null;
}

export const VARIANTS: VariantMeta[] = [
  {
    id: "current",
    name: "Current",
    idea: "Monochrome bento grid with the slot-reel name. What is in the repo today.",
    angle: "Unicorn: creative and operations weighted equally.",
    token: null,
  },
  {
    id: "ledger",
    name: "Ledger",
    idea: "Warm ink on paper. Work is a numbered index that unfolds a row at a time. The chosen direction.",
    angle: "The senior operator who writes specs and signs off releases.",
    token: "ledger",
  },
  {
    id: "console",
    name: "Console",
    idea: "An operator's readout: status header, monospace, work as a sortable table.",
    angle: "I run the work and build the machine.",
    token: "console",
  },
  {
    id: "reel",
    name: "Reel",
    idea: "Full-bleed media. Work is a draggable filmstrip with the poster following the cursor.",
    angle: "Creative developer first, for the Tekavra pitch.",
    token: "reel",
  },
];

export const DEFAULT_VARIANT: VariantId = "ledger";

const KEY = "il.variant";

export function isVariantId(v: string | null): v is VariantId {
  return !!v && VARIANTS.some((x) => x.id === v);
}

/** URL wins (shareable), then the last choice, then the default. */
export function readVariant(): VariantId {
  const q = new URLSearchParams(location.search).get("v");
  if (isVariantId(q)) return q;
  try {
    const saved = localStorage.getItem(KEY);
    if (isVariantId(saved)) return saved;
  } catch {
    /* storage off */
  }
  return DEFAULT_VARIANT;
}

export function saveVariant(id: VariantId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* storage off */
  }
  const url = new URL(location.href);
  if (id === DEFAULT_VARIANT) url.searchParams.delete("v");
  else url.searchParams.set("v", id);
  history.replaceState(null, "", url);
}
