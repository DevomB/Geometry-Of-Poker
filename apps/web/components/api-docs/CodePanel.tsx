"use client";

import { useState } from "react";

export function CodePanel({
  label,
  code,
  language = "json",
}: {
  label: string;
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#050508] shadow-inner">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </span>
        <div className="flex items-center gap-3">
          <span className="gop-mono text-[10px] uppercase text-zinc-600">{language}</span>
          <button
            type="button"
            onClick={copy}
            className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="gop-mono overflow-x-auto p-4 text-[12px] leading-6 text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ParamTable({
  rows,
}: {
  rows: {
    name: string;
    type: string;
    required?: boolean;
    description: string;
  }[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Field</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="hidden px-4 py-3 font-semibold sm:table-cell">Required</th>
            <th className="px-4 py-3 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row) => (
            <tr key={row.name} className="align-top">
              <td className="gop-mono px-4 py-3 text-cyan-200/90">{row.name}</td>
              <td className="gop-mono px-4 py-3 text-zinc-500">{row.type}</td>
              <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                {row.required ? "yes" : "no"}
              </td>
              <td className="px-4 py-3 text-zinc-400">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusTable({
  rows,
}: {
  rows: { status: string; code: string; meaning: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Code</th>
            <th className="px-4 py-3 font-semibold">Meaning</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row) => (
            <tr key={`${row.status}-${row.code}`}>
              <td className="gop-mono px-4 py-3 text-zinc-300">{row.status}</td>
              <td className="gop-mono px-4 py-3 text-amber-200/90">{row.code}</td>
              <td className="px-4 py-3 text-zinc-400">{row.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn";
  children: React.ReactNode;
}) {
  const styles =
    tone === "warn"
      ? "border-amber-400/25 bg-amber-500/[0.06] text-amber-100/90"
      : "border-cyan-400/25 bg-cyan-500/[0.06] text-cyan-100/90";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${styles}`}>{children}</div>
  );
}
