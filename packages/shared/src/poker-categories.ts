import categoriesJson from "./hand-categories.json" with { type: "json" };

/** Canonical hand-category labels from poker-calculations (API order). */
export const HAND_CATEGORY_LABELS = categoriesJson.labels as readonly string[];

const ALIASES: Record<string, string> = categoriesJson.aliases;

/** Category label → channel index (0–9). Unknown labels map to 0 (high card). */
export const CATEGORY_INDEX: Record<string, number> = Object.fromEntries(
  HAND_CATEGORY_LABELS.map((label, index) => [label, index]),
);

for (const [alias, canonical] of Object.entries(ALIASES)) {
  const index = CATEGORY_INDEX[canonical];
  if (index !== undefined) {
    CATEGORY_INDEX[alias] = index;
  }
}

/** Channel index → canonical category label. */
export const INDEX_CATEGORY: Record<number, string> = Object.fromEntries(
  HAND_CATEGORY_LABELS.map((label, index) => [index, label]),
) as Record<number, string>;

export function categoryIndexForLabel(label: string): number {
  return CATEGORY_INDEX[label] ?? 0;
}

export function canonicalCategoryLabel(label: string): string {
  const resolved = ALIASES[label] ?? label;
  return HAND_CATEGORY_LABELS.includes(resolved) ? resolved : label;
}
