import { SUIT_SYMBOLS } from "@/lib/cards/card-picker";

const SUIT_VAR: Record<string, string> = {
  s: "var(--suit-s)",
  h: "var(--suit-h)",
  d: "var(--suit-d)",
  c: "var(--suit-c)",
};

const SIZES = {
  xs: { w: 22, h: 30, rank: 11, suit: 10 },
  sm: { w: 30, h: 42, rank: 14, suit: 13 },
  md: { w: 40, h: 56, rank: 18, suit: 16 },
  lg: { w: 52, h: 72, rank: 23, suit: 20 },
} as const;

export type PlayingCardSize = keyof typeof SIZES;

export function suitColor(suit: string): string {
  return SUIT_VAR[suit] ?? "var(--suit-s)";
}

/** A four-colour deck card face. `card` is a two-char string like "As" or "Td". */
export function PlayingCard({
  card,
  size = "sm",
  title,
  dimmed,
  className = "",
}: {
  card: string;
  size?: PlayingCardSize;
  title?: string;
  dimmed?: boolean;
  className?: string;
}) {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const dims = SIZES[size];
  return (
    <span
      className={`gop-playing-card ${dimmed ? "opacity-40" : ""} ${className}`}
      style={{ width: dims.w, height: dims.h, color: suitColor(suit) }}
      title={title ?? `${rank}${SUIT_SYMBOLS[suit] ?? suit}`}
      aria-label={`${rank}${SUIT_SYMBOLS[suit] ?? suit}`}
    >
      <span style={{ fontSize: dims.rank, letterSpacing: "-0.02em" }}>
        {rank === "T" ? "10" : rank}
      </span>
      <span style={{ fontSize: dims.suit, marginTop: size === "xs" ? 0 : 1 }}>
        {SUIT_SYMBOLS[suit] ?? suit}
      </span>
    </span>
  );
}

/** Dashed placeholder matching a PlayingCard footprint. */
export function EmptyCardSlot({
  size = "sm",
  active,
  label,
}: {
  size?: PlayingCardSize;
  active?: boolean;
  label?: string;
}) {
  const dims = SIZES[size];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[6px] border border-dashed text-[11px] transition ${
        active
          ? "border-[var(--accent-ring)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border-strong)] bg-white/[0.02] text-[var(--text-muted)]"
      }`}
      style={{ width: dims.w, height: dims.h }}
      aria-hidden="true"
    >
      {label ?? "+"}
    </span>
  );
}

/** Row of card faces, optionally split into hero and board groups. */
export function CardRow({
  cards,
  size = "sm",
  gap = 4,
}: {
  cards: string[];
  size?: PlayingCardSize;
  gap?: number;
}) {
  return (
    <span className="inline-flex flex-wrap items-center" style={{ gap }}>
      {cards.map((card) => (
        <PlayingCard key={card} card={card} size={size} />
      ))}
    </span>
  );
}
