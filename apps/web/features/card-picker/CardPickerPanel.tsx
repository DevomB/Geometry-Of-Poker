"use client";

import { useMemo, useState } from "react";
import {
  RANKS,
  SUITS,
  SUIT_SYMBOLS,
  HAND_SCENARIO_PRESETS,
  cardKey,
  cardsUsed,
  emptyPickerState,
  inferredStreet,
  nextTargetZone,
  pickerReady,
  placeCardInZone,
  presetToPickerState,
  validateCardPicker,
  removeCard,
  type CardPickerState,
  type PickerTarget,
} from "@/lib/cards/card-picker";
import {
  computeStateCombinatorics,
  formatBigInt,
} from "@/lib/poker/combinatorics";
import { useViewerStore } from "@/stores/viewer-store";
import { EmptyCardSlot, PlayingCard, suitColor } from "@/components/ui/PlayingCard";
import type { ApiErrorResponse, ProjectResponse, Street } from "@geometry-of-poker/shared";

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

  const loadPreset = (presetId: string) => {
    const preset = HAND_SCENARIO_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setPicker(presetToPickerState(preset));
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

  const removeFromDead = (i: number) => {
    setPicker((p) => {
      const deadCards = [...p.deadCards];
      deadCards[i] = null;
      return { ...p, deadCards };
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
    const deadCards = picker.deadCards.filter(Boolean) as string[];
    const validation = validateCardPicker(picker, inferred);
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
          deadCards,
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
        deadCards: projection.state.deadCards,
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
    <section aria-label="Manual hand input" className="space-y-5">
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="gop-eyebrow">Quick scenarios</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {HAND_SCENARIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadPreset(preset.id)}
              className="group rounded-[12px] border border-[var(--border-subtle)] bg-white/[0.02] p-2.5 text-left transition hover:border-[var(--accent-ring)] hover:bg-white/[0.04]"
              title={preset.detail}
            >
              <span className="block text-[12.5px] font-medium text-[var(--text-primary)]">
                {preset.label}
              </span>
              <span className="mt-2 flex items-center">
                {preset.hero.map((card, i) => (
                  <span key={card} className={i > 0 ? "-ml-2" : ""}>
                    <PlayingCard card={card} size="xs" />
                  </span>
                ))}
                {preset.board.map((card, i) => (
                  <span key={card} className={i === 0 ? "ml-1.5" : "-ml-2"}>
                    <PlayingCard card={card} size="xs" />
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="gop-card space-y-3 p-3.5" role="group" aria-label="Selected cards">
        <div className="flex items-center justify-between">
          <h3 className="gop-eyebrow">Your hand</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              inferred
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "bg-white/[0.05] text-[var(--text-tertiary)]"
            }`}
          >
            {inferred ? STREET_LABEL[inferred] : "Incomplete"}
          </span>
        </div>
        <SlotsRow
          label="Hero"
          hint="2 cards"
          slots={picker.hero.map((card, i) => ({ card, key: `hero-${i}` }))}
          onClickSlot={(i) => removeFromHero(i as 0 | 1)}
          isActive={activeTarget === "hero"}
          onSetActive={() => setTarget("hero")}
          accent="cyan"
        />
        <SlotsRow
          label="Board"
          hint="0, 3, 4 or 5"
          slots={picker.board.map((card, i) => ({ card, key: `board-${i}` }))}
          onClickSlot={(i) => removeFromBoard(i)}
          isActive={activeTarget === "board"}
          onSetActive={() => setTarget("board")}
          accent="amber"
        />
        <SlotsRow
          label="Dead"
          hint="optional"
          slots={picker.deadCards
            .map((card, i) => ({ card, key: `dead-${i}`, index: i }))
            .filter((slot, i, all) => slot.card !== null || i === all.findIndex((s) => s.card === null))}
          onClickSlot={(i) => removeFromDead(i)}
          isActive={activeTarget === "dead"}
          onSetActive={() => setTarget("dead")}
          accent="rose"
          small
        />
      </div>

      <div aria-label="Card grid">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="gop-eyebrow">
            Deck · placing into{" "}
            <span
              className={
                activeTarget === "hero"
                  ? "text-[var(--accent)]"
                  : activeTarget === "board"
                    ? "text-amber-300"
                    : "text-rose-300"
              }
            >
              {activeTarget}
            </span>
          </h3>
          <span className="gop-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
            {52 - used.size} left
          </span>
        </div>
        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[3px]" role="grid">
          {SUITS.map((suit) =>
            RANKS.map((rank) => {
              const card = cardKey(rank, suit);
              const usedHere = picker.hero.includes(card)
                ? "hero"
                : picker.board.includes(card)
                  ? "board"
                  : picker.deadCards.includes(card)
                    ? "dead"
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
                  className={`relative flex h-[34px] flex-col items-center justify-center rounded-[4px] text-[10.5px] font-bold leading-none transition ${
                    usedHere
                      ? "bg-white/[0.03] opacity-30 ring-1 ring-inset " +
                        (usedHere === "hero"
                          ? "ring-[var(--accent)]"
                          : usedHere === "board"
                            ? "ring-amber-300"
                            : "ring-rose-300")
                      : "bg-[var(--card-face)] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_2px_4px_-2px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 hover:shadow-[0_6px_12px_-4px_rgba(0,0,0,0.7)]"
                  }`}
                  style={{ color: usedHere ? "var(--text-tertiary)" : suitColor(suit) }}
                  title={`${rank}${SUIT_SYMBOLS[suit]}${usedHere ? " · click to remove" : ""}`}
                >
                  <span>{rank}</span>
                  <span className="mt-[1px] text-[10px]">{SUIT_SYMBOLS[suit]}</span>
                </button>
              );
            }),
          )}
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--text-tertiary)]">
          Click a card to place it, click a placed card to remove it. Street is inferred from
          the board.
        </p>
      </div>

      {errors.length > 0 && (
        <ul
          role="alert"
          className="space-y-0.5 rounded-[12px] border border-rose-500/30 bg-rose-950/30 p-3 text-[12px] text-rose-200"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {ready && inferred && <PickerCombinatoricsPreview picker={picker} />}

      <div className="sticky -bottom-4 -mx-5 -mb-4 flex gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-glass-strong)] px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting || !ready}
          className="gop-btn gop-btn-primary h-10 flex-1"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Projecting…" : "Project onto manifold"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={used.size === 0 || isSubmitting}
          className="gop-btn h-10"
        >
          Clear
        </button>
      </div>
    </section>
  );
}

function PickerCombinatoricsPreview({ picker }: { picker: CardPickerState }) {
  const hero = picker.hero.filter(Boolean) as [string, string];
  const board = picker.board.filter(Boolean) as string[];
  const deadCards = picker.deadCards.filter(Boolean) as string[];
  const math = computeStateCombinatorics({ hero, board, deadCards });

  return (
    <div className="gop-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="gop-eyebrow">Combinatorics preview</h3>
        <span className="gop-mono text-[11px] text-emerald-300/80">
          {math.remainingCards} live cards
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
        <PreviewRow label="Villain hands" value={formatBigInt(math.legalVillainHands)} />
        <PreviewRow label="Runouts/villain" value={formatBigInt(math.publicRunoutsAfterVillain)} />
        <PreviewRow label="Terminal leaves" value={formatBigInt(math.terminalLeaves)} />
        <PreviewRow label="Runout cards" value={String(math.runoutCardsToRiver)} />
        {deadCards.length > 0 && (
          <PreviewRow label="Dead cards" value={String(deadCards.length)} />
        )}
        {deadCards.length > 0 && (
          <PreviewRow
            label="Removed leaves"
            value={formatBigInt(math.removedTerminalLeavesByDeadCards)}
          />
        )}
        {deadCards.length > 0 && (
          <PreviewRow
            label="Removed states"
            value={formatBigInt(math.removedStreetStatesByDeadCards)}
          />
        )}
        {deadCards.length > 0 && math.terminalLeafFractionOfNoDead !== null && (
          <PreviewRow
            label="Leaf fraction"
            value={formatPercent(math.terminalLeafFractionOfNoDead)}
          />
        )}
        {deadCards.length > 0 && math.streetStateFractionOfNoDead !== null && (
          <PreviewRow
            label="Street fraction"
            value={formatPercent(math.streetStateFractionOfNoDead)}
          />
        )}
        {math.nextStreetPublicContinuations !== null && (
          <PreviewRow
            label="Next street"
            value={formatBigInt(math.nextStreetPublicContinuations)}
          />
        )}
      </dl>
    </div>
  );
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[var(--text-tertiary)]">{label}</dt>
      <dd className="gop-mono truncate text-right tabular-nums text-[var(--text-primary)]">
        {value}
      </dd>
    </>
  );
}

function SlotsRow({
  label,
  hint,
  slots,
  onClickSlot,
  isActive,
  onSetActive,
  accent,
  small,
}: {
  label: string;
  hint: string;
  slots: { card: string | null; key: string; index?: number }[];
  onClickSlot: (i: number) => void;
  isActive: boolean;
  onSetActive: () => void;
  accent: "cyan" | "amber" | "rose";
  small?: boolean;
}) {
  const accentText =
    accent === "cyan"
      ? "text-[var(--accent)]"
      : accent === "amber"
        ? "text-amber-300"
        : "text-rose-300";
  const accentRing =
    accent === "cyan"
      ? "ring-[var(--accent-ring)] bg-[var(--accent-soft)]"
      : accent === "amber"
        ? "ring-amber-300/35 bg-amber-400/[0.07]"
        : "ring-rose-300/35 bg-rose-400/[0.07]";
  const size = small ? "xs" : "sm";
  return (
    <div
      className={`flex items-center gap-3 rounded-[10px] px-2 py-1.5 transition ${
        isActive ? `ring-1 ${accentRing}` : ""
      }`}
    >
      <button
        type="button"
        onClick={onSetActive}
        aria-pressed={isActive}
        className="w-14 shrink-0 text-left"
        title={`Place next cards into ${label.toLowerCase()}`}
      >
        <span
          className={`block text-[12.5px] font-medium ${
            isActive ? accentText : "text-[var(--text-secondary)]"
          }`}
        >
          {label}
        </span>
        <span className="block text-[10.5px] text-[var(--text-tertiary)]">{hint}</span>
      </button>
      <div className="flex flex-wrap gap-1">
        {slots.map(({ card, key, index }, i) =>
          card ? (
            <button
              key={key}
              type="button"
              onClick={() => onClickSlot(index ?? i)}
              className="transition hover:-translate-y-0.5"
              aria-label={`Remove ${card} from ${label}`}
              title="Click to remove"
            >
              <PlayingCard card={card} size={size} />
            </button>
          ) : (
            <button
              key={key}
              type="button"
              onClick={onSetActive}
              aria-label={`${label} slot ${i + 1} empty`}
            >
              <EmptyCardSlot size={size} active={isActive && slots.findIndex((s) => !s.card) === i} />
            </button>
          ),
        )}
      </div>
    </div>
  );
}
