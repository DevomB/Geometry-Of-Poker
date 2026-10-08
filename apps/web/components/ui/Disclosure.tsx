"use client";

import { useState, type ReactNode } from "react";
import { IconChevron } from "@/components/ui/Icons";

/** Collapsible panel section with a consistent header treatment. */
export function Disclosure({
  title,
  meta,
  defaultOpen = false,
  tone,
  children,
}: {
  title: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  tone?: "accent" | "amber" | "sky" | "violet" | "emerald" | "rose";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dot =
    tone === "accent"
      ? "bg-[var(--accent)]"
      : tone === "amber"
        ? "bg-amber-300"
        : tone === "sky"
          ? "bg-sky-300"
          : tone === "violet"
            ? "bg-violet-300"
            : tone === "emerald"
              ? "bg-emerald-300"
              : tone === "rose"
                ? "bg-rose-300"
                : "bg-zinc-500";
  return (
    <section className="gop-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition hover:bg-white/[0.025]"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        <span className="flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
          {title}
        </span>
        {meta && (
          <span className="gop-mono shrink-0 text-[11px] tabular-nums text-[var(--text-tertiary)]">
            {meta}
          </span>
        )}
        <IconChevron
          size={14}
          className={`shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open && <div className="gop-fade-in px-3.5 pb-3.5">{children}</div>}
    </section>
  );
}
