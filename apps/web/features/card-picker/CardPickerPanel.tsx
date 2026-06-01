"use client";

import { useState } from "react";
import {
  RANKS,
  SUITS,
  SUIT_COLORS,
  emptyPickerState,
  cardsUsed,
  cardKey,
  pickerToInput,
  type CardPickerState,
} from "@/lib/cards/card-picker";
import { validateHandInput } from "@/lib/cards/validate-hand";
import { useViewerStore } from "@/stores/viewer-store";
import type { ApiErrorResponse, ProjectResponse } from "@geometry-of-poker/shared";

type SlotTarget = { zone: "hero"; index: 0 | 1 } | { zone: "board"; index: number };

export function CardPickerPanel() {
  const street = useViewerStore((s) => s.street);
  const setManualMarker = useViewerStore((s) => s.setManualMarker);
  const selectPoint = useViewerStore((s) => s.selectPoint);
  const dataset = useViewerStore((s) => s.dataset);

  const [picker, setPicker] = useState<CardPickerState>(emptyPickerState());
  const [activeSlot, setActiveSlot] = useState<SlotTarget | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const used = cardsUsed(picker);
  const boardSlots = street === "preflop" ? 0 : street === "flop" ? 3 : street === "turn" ? 4 : 5;

  const placeCard = (rank: string, suit: string) => {
    if (!activeSlot) return;
    const card = cardKey(rank, suit);
    if (used.has(card)) return;

    setPicker((prev) => {
      const next = { ...prev, hero: [...prev.hero] as CardPickerState["hero"], board: [...prev.board] };
      if (activeSlot.zone === "hero") next.hero[activeSlot.index] = card;
      else next.board[activeSlot.index] = card;
      return next;
    });
    setActiveSlot(null);
    setErrors([]);
  };

  const clearPicker = () => {
    setPicker(emptyPickerState());
    setActiveSlot(null);
    setErrors([]);
  };

  const submit = async () => {
    const { hero, board, expectedBoard } = pickerToInput(picker, street);
    const validation = validateHandInput(hero as [string, string], board, street);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    if (board.length !== expectedBoard) {
      setErrors([`Board must have ${expectedBoard} cards for ${street}.`]);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    try {
      const heroCards = validation.normalizedState!.heroHoleCards;
      const boardCards = validation.normalizedState!.communityCards;

      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero: heroCards, board: boardCards, street }),
      });
      const data = (await res.json()) as ProjectResponse | ApiErrorResponse;
      if (!res.ok) {
        const error = (data as ApiErrorResponse).error;
        throw new Error(error?.message ?? "Projection failed");
      }

      const projection = data as ProjectResponse;
      const neighborIds = projection.nearestNeighbors.map((neighbor) => neighbor.id);
      const neighborDistances = projection.nearestNeighbors.map((neighbor) => neighbor.distance);

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
      });

      if (dataset && neighborIds[0]) {
        const idx = dataset.idToIndex.get(neighborIds[0]);
        if (idx !== undefined) selectPoint(idx, true);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : String(err)]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="border-t border-white/10 pt-4">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        Manual hand input
      </h2>
      <p className="mb-2 text-[10px] text-zinc-500">
        Select a slot, then pick cards. Street: <span className="capitalize text-zinc-300">{street}</span>
      </p>

      <div className="mb-2 space-y-2">
        <SlotRow
          label="Hero"
          slots={[
            { card: picker.hero[0], target: { zone: "hero", index: 0 } },
            { card: picker.hero[1], target: { zone: "hero", index: 1 } },
          ]}
          activeSlot={activeSlot}
          onSelect={setActiveSlot}
          onClear={(t) => {
            setPicker((p) => {
              const hero = [...p.hero] as CardPickerState["hero"];
              if (t.zone === "hero") hero[t.index] = null;
              return { ...p, hero };
            });
          }}
        />
        {boardSlots > 0 && (
          <SlotRow
            label="Board"
            slots={Array.from({ length: boardSlots }, (_, i) => ({
              card: picker.board[i] ?? null,
              target: { zone: "board" as const, index: i },
            }))}
            activeSlot={activeSlot}
            onSelect={setActiveSlot}
            onClear={(t) => {
              setPicker((p) => {
                const board = [...p.board];
                if (t.zone === "board") board[t.index] = null;
                return { ...p, board };
              });
            }}
          />
        )}
      </div>

      {activeSlot && (
        <div className="mb-2 rounded border border-white/10 bg-black/40 p-2">
          <p className="mb-1 text-[10px] text-zinc-500">Pick a card</p>
          <div className="grid grid-cols-4 gap-0.5">
            {RANKS.map((rank) =>
              SUITS.map((suit) => {
                const card = cardKey(rank, suit);
                const disabled = used.has(card);
                return (
                  <button
                    key={card}
                    type="button"
                    disabled={disabled}
                    onClick={() => placeCard(rank, suit)}
                    className={`rounded px-1 py-0.5 font-mono text-[10px] ${
                      disabled
                        ? "cursor-not-allowed opacity-20"
                        : `${SUIT_COLORS[suit]} hover:bg-white/10`
                    }`}
                  >
                    {rank}
                    {suit}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="mb-2 space-y-0.5 text-[11px] text-rose-400">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="flex-1 rounded bg-emerald-700/80 px-2 py-1.5 text-xs font-medium hover:bg-emerald-600/80 disabled:opacity-50"
        >
          {isSubmitting ? "Projecting…" : "Project into geometry"}
        </button>
        <button
          type="button"
          onClick={clearPicker}
          className="rounded border border-white/10 px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/5"
        >
          Clear
        </button>
      </div>
    </section>
  );
}

function SlotRow({
  label,
  slots,
  activeSlot,
  onSelect,
  onClear,
}: {
  label: string;
  slots: { card: string | null; target: SlotTarget }[];
  activeSlot: SlotTarget | null;
  onSelect: (t: SlotTarget) => void;
  onClear: (t: SlotTarget) => void;
}) {
  const isActive = (t: SlotTarget) =>
    activeSlot &&
    activeSlot.zone === t.zone &&
    activeSlot.index === t.index;

  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-1">
        {slots.map(({ card, target }) => (
          <button
            key={`${target.zone}-${target.index}`}
            type="button"
            onClick={() => onSelect(target)}
            onContextMenu={(e) => {
              e.preventDefault();
              onClear(target);
            }}
            className={`min-w-[2.5rem] rounded border px-2 py-1 font-mono text-xs ${
              isActive(target)
                ? "border-emerald-400/60 bg-emerald-950/40"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
            title="Right-click to clear"
          >
            {card ?? "—"}
          </button>
        ))}
      </div>
    </div>
  );
}
