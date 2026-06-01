import { formatCard } from "@/lib/cards/card-picker";

interface CardDisplayProps {
  cards: string[];
  label?: string;
  compact?: boolean;
}

export function CardDisplay({ cards, label, compact }: CardDisplayProps) {
  return (
    <div className={compact ? "inline-flex items-center gap-1" : "space-y-1"}>
      {label && !compact && (
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      )}
      <div className="flex flex-wrap gap-0.5">
        {cards.map((card) => {
          const { rank, symbol, suit } = formatCard(card);
          const color =
            suit === "h" ? "text-rose-400" : suit === "d" ? "text-sky-400" : suit === "c" ? "text-emerald-400" : "text-zinc-100";
          return (
            <span
              key={card}
              className={`inline-flex items-center rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[11px] ${color}`}
              title={label ? `${label}: ${card}` : card}
            >
              {rank}
              {symbol}
            </span>
          );
        })}
      </div>
    </div>
  );
}
