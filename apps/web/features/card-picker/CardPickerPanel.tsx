"use client";

import { useMemo, useState } from "react";
import {
  RANKS,
  SUITS,
  SUIT_SYMBOLS,
  cardKey,
  cardsUsed,
  emptyPickerState,
  inferredStreet,
  nextTargetZone,
  pickerReady,
  placeCardInZone,
  removeCard,
  type CardPickerState,
  type PickerTarget,
} from "@/lib/cards/card-picker";
import { validateHandInput } from "@/lib/cards/validate-hand";
import { useViewerStore } from "@/stores/viewer-store";
import type { ApiErrorResponse, ProjectResponse, Street } from "@geometry-of-poker/shared";

const SUIT_TONE: Record<string, string> = {
  s: "text-zinc-100",
  c: "text-emerald-300",
  h: "text-rose-300",
  d: "text-sky-300",
};

const STREET_LABEL: Record<Street, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

export function CardPickerPanel() {
  const street = useViewerStore((s) => s.street);
  const setStreet = useViewerStore((s) => s.setStreet);
  const setManualMarker = useViewerStore((s) => s.setManualMarker);
  const clearSelection = useViewerStore((s) => s.clearSelection);

  const [picker, setPicker] = useState<CardPickerState>(emptyPickerState());
  const [target, setTarget] = useState<PickerTarget | "auto">("auto");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const used = useMemo(() => cardsUsed(picker), [picker]);
  const heroFilled = picker.hero.filter(Boolean).length;
  const boardFilled = picker.board.filter(Boolean).length;
  const inferred = inferredStreet(picker);
  const ready = pickerReady(picker);

  const activeTarget: PickerTarget =
    target === "auto" ? nextTargetZone(picker) : target;

  const handleCardClick = (card: string) => {
    if (used.has(card)) {
      setPicker((prev) => removeCard(prev, card));
      setErrors([]);
      return;
    }
    setPicker((prev) => placeCardInZone(prev, card, activeTarget));
    setErrors([]);
  };

  const clearAll = () => {
    setPicker(emptyPickerState());
    setTarget("auto");
    setErrors([]);
  };

  const removeFromHero = (i: 0 | 1) => {
    setPicker((p) => {
      const hero = [...p.hero] as [string | null, string | null];
      hero[i] = null;
      return { ...p, hero };
    });
  };

  const removeFromBoard = (i: number) => {
    setPicker((p) => {
      const board = [...p.board];
      board[i] = null;
      return { ...p, board };
    });
  };

  const submit = async () => {
    if (!ready || !inferred) {
      const msgs: string[] = [];
      if (heroFilled !== 2) msgs.push("Pick exactly two hero cards.");
      if (![0, 3, 4, 5].includes(boardFilled))
        msgs.push("Board must have 0, 3, 4, or 5 cards.");
      setErrors(msgs);
      return;
    }
    const hero = picker.hero.filter(Boolean) as [string, string];
    const board = picker.board.filter(Boolean) as string[];
    const validation = validateHandInput(hero, board);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: validation.normalizedState!.heroHoleCards,
          board: validation.normalizedState!.communityCards,
          street: inferred,
        }),
      });
      const data = (await res.json()) as ProjectResponse | ApiErrorResponse;
      if (!res.ok) {
        const error = (data as ApiErrorResponse).error;
        throw new Error(error?.message ?? `Projection failed (${res.status})`);
      }

      const projection = data as ProjectResponse;
      const neighborIds = projection.nearestNeighbors.map((n) => n.id);
      const neighborDistances = projection.nearestNeighbors.map((n) => n.distance);

      if (street !== inferred) setStreet(inferred);

      setManualMarker({
        id: `manual-${Date.now()}`,
        hero: projection.state.hero,
        board: projection.state.board,
        position: [
          projection.projectedPoint.x,
          projection.projectedPoint.y,
          projection.projectedPoint.z,
        ],
        method: projection.projectionMethod,
        neighborIds,
        neighborDistances,
        clusterId:
          typeof projection.metrics.clusterId === "number"
            ? projection.metrics.clusterId
            : null,
        features: projection.metrics,
        warnings: projection.warnings,
      });
      clearSelection();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : String(err)]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="picker-heading"
      className="border-t border-[var(--border-subtle)] pt-4"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2
          id="picker-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500"
        >
          Manual hand input
        </h2>
        {inferred && (
          <span className="gop-mono rounded border border-[var(--border-subtle)] bg-white/[0.02] px-1.5 py-0.5 text-[10px] text-zinc-400">
            {STREET_LABEL[inferred]}
          </span>
        )}
      </div>

      <p className="mb-3 text-[10px] text-zinc-500">
        Click cards to place them. Selected cards toggle off on click. Street is
        inferred from the number of board cards.
      </p>

      <div className="mb-3 space-y-2" role="group" aria-label="Selected cards">
        <SlotsRow
          label="Hero"
          maxFilled={2}
          filled={heroFilled}
          slots={picker.hero.map((card, i) => ({ card, key: `hero-${i}` }))}
          onClickSlot={(i) => removeFromHero(i as 0 | 1)}
          isActive={activeTarget === "hero"}
          onSetActive={() => setTarget("hero")}
          accent="cyan"
        />
        <SlotsRow
          label="Board"
          maxFilled={5}
          filled={boardFilled}
          slots={picker.board.map((card, i) => ({ card, key: `board-${i}` }))}
          onClickSlot={(i) => removeFromBoard(i)}
          isActive={activeTarget === "board"}
          onSetActive={() => setTarget("board")}
          accent="amber"
        />
      </div>

      <div
        className="mb-3 rounded border border-[var(--border-subtle)] bg-black/30 p-2"
        aria-label="Card grid"
      >
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Deck</span>
          <span className="gop-mono text-zinc-400">{used.size}/52</span>
        </div>
        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[3px]" role="grid">
          {SUITS.map((suit) =>
            RANKS.map((rank) => {
              const card = cardKey(rank, suit);
              const taken = used.has(card);
              const usedHere = picker.hero.includes(card)
                ? "hero"
                : picker.board.includes(card)
                  ? "board"
                  : null;
              return (
                <button
                  key={card}
                  type="button"
                  role="gridcell"
                  aria-label={`${rank} of ${SUIT_SYMBOLS[suit]} ${
                    usedHere ? `(in ${usedHere})` : "available"
                  }`}
                  onClick={() => handleCardClick(card)}
                  className={`relative flex h-7 flex-col items-center justify-center gop-mono rounded text-[9px] leading-none transition ${
                    usedHere === "hero"
                      ? "border border-cyan-300/50 bg-cyan-500/15 ring-1 ring-cyan-300/30"
                      : usedHere === "board"
                        ? "border border-amber-300/50 bg-amber-500/15 ring-1 ring-amber-300/30"
                        : "border border-[var(--border-subtle)] bg-white/[0.02] hover:border-[var(--border-strong)] hover:bg-white/[0.06]"
                  } ${taken && !usedHere ? "cursor-not-allowed opacity-25" : ""} ${SUIT_TONE[suit]}`}
                  disabled={taken && !usedHere}
                  title={`${rank}${SUIT_SYMBOLS[suit]}`}
                >
                  <span className="text-[10px] font-semibold">{rank}</span>
                  <span className="text-[10px]">{SUIT_SYMBOLS[suit]}</span>
                </button>
              );
            }),
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[9px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm border border-cyan-300/60 bg-cyan-500/20" />
            hero
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm border border-amber-300/60 bg-amber-500/20" />
            board
          </span>
          <span className="ml-auto">click again to remove</span>
        </div>
      </div>

      {errors.length > 0 && (
        <ul
          role="alert"
          className="mb-2 space-y-0.5 rounded border border-rose-500/30 bg-rose-950/20 p-2 text-[11px] text-rose-200"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting || !ready}
          className="flex-1 rounded border border-cyan-300/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Projecting..." : "Project hand"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={used.size === 0 || isSubmitting}
          className="rounded border border-[var(--border-default)] px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-30"
        >
          Clear
        </button>
      </div>

    </section>
  );
}

function SlotsRow({
  label,
  filled,
  maxFilled,
  slots,
  onClickSlot,
  isActive,
  onSetActive,
  accent,
}: {
  label: string;
  filled: number;
  maxFilled: number;
  slots: { card: string | null; key: string }[];
  onClickSlot: (i: number) => void;
  isActive: boolean;
  onSetActive: () => void;
  accent: "cyan" | "amber";
}) {
  const accentBorder = accent === "cyan" ? "border-cyan-300/40" : "border-amber-300/40";
  const accentRing = accent === "cyan" ? "ring-cyan-300/40" : "ring-amber-300/40";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={onSetActive}
          className={`text-[10px] uppercase tracking-[0.18em] transition ${
            isActive ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
          }`}
          aria-pressed={isActive}
        >
          {label}{" "}
          <span className="gop-mono ml-1 tabular-nums text-zinc-500">
            {filled}/{maxFilled}
          </span>
        </button>
      </div>
      <div className={`flex flex-wrap gap-1 rounded border p-1 transition ${
        isActive ? `${accentBorder} bg-white/[0.03] ring-1 ${accentRing}` : "border-[var(--border-subtle)] bg-transparent"
      }`}>
        {slots.map(({ card, key }, i) => {
          const suit = card ? card.slice(-1) : null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onClickSlot(i)}
              disabled={!card}
              className={`gop-mono min-w-[2.4rem] rounded border px-2 py-1 text-xs transition ${
                card
                  ? `border-[var(--border-default)] bg-white/[0.05] hover:bg-white/[0.1] ${
                      suit ? SUIT_TONE[suit] : ""
                    }`
                  : "border-dashed border-[var(--border-subtle)] text-zinc-600"
              }`}
              aria-label={card ? `Remove ${card} from ${label}` : `${label} slot ${i + 1} empty`}
              title={card ? "Click to remove" : "Empty slot"}
            >
              {card ? (
                <>
                  {card.slice(0, -1)}
                  {SUIT_SYMBOLS[suit ?? ""] ?? ""}
                </>
              ) : (
                "-"
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
