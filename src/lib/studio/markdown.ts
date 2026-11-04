import type { StudioBlock } from "./types";

/**
 * Turns pasted text — usually copied from an AI chat, so full of Markdown —
 * into document blocks: # headings, **bold** / *italic* (kept inline in the
 * text and drawn by the renderer), bullet and numbered lists, > quotes and
 * | tables |. Plain text works too: blank lines separate paragraphs.
 */

const stripMarks = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, "$1$2").trim();

function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function parseMarkdownToBlocks(input: string): StudioBlock[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const blocks: StudioBlock[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length > 0) blocks.push({ type: "paragraph", text: para.join("\n") });
    para = [];
  };
  const flushList = () => {
    if (list && list.items.length > 0) blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flush();
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flush();
      continue;
    }

    // Table: a header row followed by a |---| separator row.
    if (line.includes("|") && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      flush();
      const header = splitRow(line).map(stripMarks);
      const aligns = splitRow(lines[i + 1]).map((c) => (c.trim().endsWith(":") ? "right" : "left") as "left" | "right");
      i += 2;
      const rows: Record<string, string>[] = [];
      while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
        const cells = splitRow(lines[i]);
        const row: Record<string, string> = {};
        header.forEach((_, c) => (row[`c${c}`] = stripMarks(cells[c] ?? "")));
        rows.push(row);
        i += 1;
      }
      i -= 1;
      blocks.push({
        type: "table",
        wrap: true,
        columns: header.map((label, c) => ({ key: `c${c}`, label, align: aligns[c] === "right" ? "right" : "left" })),
        rows,
      });
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      flush();
      const text = stripMarks(heading[2]);
      blocks.push(heading[1].length <= 2 ? { type: "heading", text } : { type: "subheading", text });
      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flush();
      const parts = [quote[1]];
      while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) parts.push(lines[++i].replace(/^\s*>\s?/, ""));
      blocks.push({ type: "note", text: parts.join("\n") });
      continue;
    }

    const bullet = line.match(/^\s*(?:[-*•+])\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      flushPara();
      const ordered = !bullet;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1].trim());
      continue;
    }

    // A continuation line indented under a list item belongs to that item.
    if (list && /^\s{2,}\S/.test(line)) {
      list.items[list.items.length - 1] += " " + line.trim();
      continue;
    }

    flushList();
    para.push(line.trim());
  }
  flush();
  return blocks;
}
