import type { StudioBlock } from "./types";

// Page capacities in A4 CSS px (96 dpi): the room for body content below the letterhead + title block
// (first page) or below the slim running header (later pages), above the footer.
export const FIRST_PAGE_BODY = 770;
export const NEXT_PAGE_BODY = 940;
export const BLOCK_GAP = 22; // between blocks; the renderer uses the same gap

/**
 * Real heights, measured in the browser from an off-screen copy of each block
 * (see `LetterheadPages`). When present they replace the estimates below, so
 * pages fill exactly as far as the content really goes.
 */
export interface Measured {
  heights: number[];
  /** Per table block: header row, each body row, totals row. */
  head: number[];
  rows: number[][];
  foot: number[];
}

// Estimates, used only for the first paint before measuring (and for tests): they err slightly generous.
const LINE = 23;
const CHARS_PER_LINE = 84;
const EST_HEAD = 38;
const EST_ROW = 36;
const EST_FOOT = 42;
const TABLE_WIDTH = 682;

function textLines(text: string, charsPerLine = CHARS_PER_LINE): number {
  return text.split("\n").reduce((sum, part) => sum + Math.max(1, Math.ceil(part.replace(/\*+/g, "").length / charsPerLine)), 0);
}

type TableBlock = Extract<StudioBlock, { type: "table" }>;

function estRowHeight(block: TableBlock, row: Record<string, string>): number {
  if (!block.wrap) return EST_ROW;
  const total = block.columns.reduce((s, c) => s + (c.weight ?? 1), 0);
  let lines = 1;
  for (const c of block.columns) {
    const chars = Math.max(6, Math.floor(((TABLE_WIDTH * (c.weight ?? 1)) / total - 20) / 6.4));
    lines = Math.max(lines, Math.ceil((row[c.key] ?? "").length / chars));
  }
  return Math.max(EST_ROW, lines * 19 + 16);
}

const itemEst = (item: string) => textLines(item, 78) * LINE + 6;

function estBlockHeight(block: StudioBlock): number {
  switch (block.type) {
    case "heading":
      return 34;
    case "subheading":
      return 30;
    case "paragraph":
      return textLines(block.text) * LINE;
    case "note":
      return textLines(block.text, 78) * LINE + 6;
    case "list":
      return block.items.reduce((sum, item) => sum + itemEst(item), 0);
    case "stats":
      return 96;
    case "keyvalue":
      return Math.ceil(block.items.length / 2) * 46;
    case "table":
      return block.rows.length === 0 ? 70 : EST_HEAD + block.rows.reduce((s, r) => s + estRowHeight(block, r), 0) + (block.footer ? EST_FOOT : 0);
    case "signature":
      return 120;
  }
}

/**
 * Page layout: blocks flow top to bottom, each page filled as far as it really
 * goes. A table that does not fit is split across pages (header repeated, the
 * totals row only on the last part); a list is split between items; a heading is
 * never left alone at the bottom of a page; a signature is kept with the block
 * before it, so it never sits alone on a page.
 */
export function paginate(blocks: StudioBlock[], m?: Measured): StudioBlock[][] {
  const pages: StudioBlock[][] = [[]];
  let capacity = FIRST_PAGE_BODY;
  let used = 0;

  const height = (i: number) => m?.heights[i] ?? estBlockHeight(blocks[i]);
  const headOf = (i: number) => m?.head[i] ?? EST_HEAD;
  const footOf = (i: number) => m?.foot[i] ?? EST_FOOT;
  const rowOf = (i: number, r: number, row: Record<string, string>) => m?.rows[i]?.[r] ?? estRowHeight(blocks[i] as TableBlock, row);

  const newPage = () => {
    pages.push([]);
    capacity = NEXT_PAGE_BODY;
    used = 0;
  };
  const place = (block: StudioBlock, h: number) => {
    pages[pages.length - 1].push(block);
    used += h + BLOCK_GAP;
  };
  const pageIsEmpty = () => pages[pages.length - 1].length === 0;
  const fits = (h: number) => used + h <= capacity;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const h = height(i);

    // Keep a heading with whatever follows it.
    if (block.type === "heading" || block.type === "subheading") {
      const next = blocks[i + 1];
      let nextMin = 0;
      if (next) {
        if (next.type === "table") nextMin = headOf(i + 1) + (next.rows.length > 0 ? rowOf(i + 1, 0, next.rows[0]) : 0);
        else nextMin = Math.min(height(i + 1), 80);
      }
      if (used + h + BLOCK_GAP + nextMin > capacity && !pageIsEmpty()) newPage();
      place(block, h);
      continue;
    }

    if (fits(h)) {
      place(block, h);
      continue;
    }

    // A signature that does not fit takes the last block of the page with it, so it is never alone.
    if (block.type === "signature") {
      const page = pages[pages.length - 1];
      const prev = page[page.length - 1];
      if (page.length > 1 && prev && prev.type !== "heading" && prev.type !== "subheading" && prev.type !== "table") {
        page.pop();
        newPage();
        place(prev, estBlockHeight(prev));
        place(block, h);
        continue;
      }
    }

    if (block.type === "table" && block.rows.length > 0) {
      let remaining = block.rows;
      let offset = 0;
      while (remaining.length > 0) {
        const room = capacity - used - headOf(i);
        let fit = 0;
        let acc = 0;
        for (let r = 0; r < remaining.length; r++) {
          const rh = rowOf(i, offset + r, remaining[r]);
          if (acc + rh > room) break;
          acc += rh;
          fit += 1;
        }
        if (fit === remaining.length && block.footer && acc + footOf(i) > room) fit = Math.max(0, fit - 1);
        if (fit < 1) {
          if (pageIsEmpty()) fit = 1;
          else {
            newPage();
            continue;
          }
        }
        const part = remaining.slice(0, fit);
        const partHeight =
          headOf(i) + part.reduce((s, r, k) => s + rowOf(i, offset + k, r), 0) + (fit === remaining.length && block.footer ? footOf(i) : 0);
        remaining = remaining.slice(fit);
        offset += fit;
        const last = remaining.length === 0;
        place({ ...block, rows: part, footer: last ? block.footer : undefined }, partHeight);
        if (!last) newPage();
      }
      continue;
    }

    if (block.type === "list" && block.items.length > 1) {
      let remaining = block.items;
      while (remaining.length > 0) {
        let fit = 0;
        let acc = 0;
        for (const item of remaining) {
          const ih = itemEst(item);
          if (used + acc + ih > capacity) break;
          acc += ih;
          fit += 1;
        }
        if (fit < 1) {
          if (pageIsEmpty()) fit = 1;
          else {
            newPage();
            continue;
          }
        }
        const part = remaining.slice(0, fit);
        remaining = remaining.slice(fit);
        place({ ...block, items: part }, part.reduce((s, it) => s + itemEst(it), 0));
        if (remaining.length > 0) newPage();
      }
      continue;
    }

    if (!pageIsEmpty()) newPage();
    place(block, h);
  }

  return pages.filter((p, idx) => p.length > 0 || idx === 0);
}
