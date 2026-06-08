import Link from "next/link";
import type { ReactNode } from "react";
import { slugifyHeading } from "@/lib/research/docs";

interface MarkdownContentProps {
  markdown: string;
}

type Block =
  | { kind: "heading"; level: number; text: string; id: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; language: string; text: string }
  | { kind: "quote"; text: string }
  | { kind: "table"; rows: string[][] };

export function MarkdownContent({ markdown }: MarkdownContentProps) {
  return (
    <div className="space-y-5 text-sm leading-7 text-zinc-300">
      {parseBlocks(markdown).map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  const headingIds = new Map<string, number>();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === "" || line.trim() === "---") {
      i++;
      continue;
    }

    const codeMatch = line.match(/^```(\w+)?/);
    if (codeMatch) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        code.push(lines[i]!);
        i++;
      }
      blocks.push({ kind: "code", language: codeMatch[1] ?? "text", text: code.join("\n") });
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const text = heading[2]!.trim();
      const base = slugifyHeading(text);
      const count = headingIds.get(base) ?? 0;
      headingIds.set(base, count + 1);
      blocks.push({
        kind: "heading",
        level: heading[1]!.length,
        text,
        id: count === 0 ? base : `${base}-${count + 1}`,
      });
      i++;
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith(">")) {
        quote.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", text: quote.join(" ") });
      continue;
    }

    if (isTableStart(lines, i)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]!)) {
        if (!isTableSeparator(lines[i]!)) rows.push(splitTableRow(lines[i]!));
        i++;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const items: string[] = [];
      const orderedList = Boolean(ordered);
      while (i < lines.length) {
        const item = lines[i]!.match(orderedList ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]!.trim());
        i++;
      }
      blocks.push({ kind: "list", ordered: orderedList, items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !lines[i]!.match(/^(#{1,4})\s+/) &&
      !lines[i]!.match(/^```/) &&
      !lines[i]!.match(/^\s*[-*]\s+/) &&
      !lines[i]!.match(/^\s*\d+\.\s+/) &&
      !isTableStart(lines, i)
    ) {
      paragraph.push(lines[i]!.trim());
      i++;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderBlock(block: Block, index: number) {
  if (block.kind === "heading") {
    if (block.level === 1) return null;
    const Tag = `h${Math.min(block.level, 3)}` as "h2" | "h3";
    return (
      <Tag
        key={index}
        id={block.id}
        className={
          block.level === 2
            ? "border-t border-white/10 pt-8 text-lg font-semibold tracking-tight text-zinc-100"
            : "pt-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500"
        }
      >
        {renderInline(block.text)}
      </Tag>
    );
  }

  if (block.kind === "paragraph") {
    return <p key={index}>{renderInline(block.text)}</p>;
  }

  if (block.kind === "quote") {
    return (
      <blockquote
        key={index}
        className="border-l-2 border-cyan-300/40 bg-cyan-950/10 px-4 py-3 text-zinc-300"
      >
        {renderInline(block.text)}
      </blockquote>
    );
  }

  if (block.kind === "code") {
    return (
      <pre
        key={index}
        className="overflow-x-auto rounded border border-white/10 bg-black/40 p-4 text-xs leading-6 text-cyan-100"
      >
        <code>{block.text}</code>
      </pre>
    );
  }

  if (block.kind === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag
        key={index}
        className={`space-y-1 pl-5 text-zinc-400 ${block.ordered ? "list-decimal" : "list-disc"}`}
      >
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
  }

  return (
    <div key={index} className="overflow-x-auto rounded border border-white/10">
      <table className="w-full min-w-[520px] border-collapse text-left text-xs">
        <tbody>
          {block.rows.map((row, rowIndex) => {
            const Cell = rowIndex === 0 ? "th" : "td";
            return (
              <tr key={`${rowIndex}-${row.join("|")}`} className="border-b border-white/10 last:border-0">
                {row.map((cell) => (
                  <Cell
                    key={cell}
                    className={
                      rowIndex === 0
                        ? "bg-white/[0.04] px-3 py-2 font-medium text-zinc-200"
                        : "px-3 py-2 text-zinc-400"
                    }
                  >
                    {renderInline(cell)}
                  </Cell>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`${match.index}-code`} className="rounded bg-white/[0.06] px-1 py-0.5 text-cyan-100">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${match.index}-strong`} className="font-semibold text-zinc-100">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      nodes.push(renderLink(link[1]!, link[2]!, match.index));
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderLink(label: string, href: string, key: number) {
  const docMatch = href.match(/^\.\/(.+)\.md(#.*)?$/);
  const normalizedHref = docMatch ? `/research/${docMatch[1]}${docMatch[2] ?? ""}` : href;
  const className = "text-cyan-300/80 underline decoration-cyan-300/30 underline-offset-4 hover:text-cyan-200";

  if (normalizedHref.startsWith("/")) {
    return (
      <Link key={`${key}-link`} href={normalizedHref} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a key={`${key}-link`} href={normalizedHref} className={className}>
      {label}
    </a>
  );
}

function isTableStart(lines: string[], index: number) {
  return isTableRow(lines[index] ?? "") && isTableSeparator(lines[index + 1] ?? "");
}

function isTableRow(line: string) {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isTableSeparator(line: string) {
  return /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(line);
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}
