import { PlayingCard } from "@/components/ui/PlayingCard";

interface CardDisplayProps {
  cards: string[];
  label?: string;
  compact?: boolean;
}

export function CardDisplay({ cards, label, compact }: CardDisplayProps) {
  return (
    <div className={compact ? "inline-flex items-center gap-1" : "space-y-1.5"}>
      {label && !compact && (
        <span className="block text-[11px] text-[var(--text-tertiary)]">{label}</span>
      )}
      <div className="flex flex-wrap gap-1">
        {cards.map((card) => (
          <PlayingCard
            key={card}
            card={card}
            size={compact ? "xs" : "sm"}
            title={label ? `${label}: ${card}` : card}
          />
        ))}
      </div>
    </div>
  );
}
