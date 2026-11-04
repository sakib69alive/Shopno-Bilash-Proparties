/**
 * The document model behind Statements & Notices. A document is a title plus
 * an ordered list of simple blocks; the letterhead renderer lays the blocks
 * out on A4 pages. Everything is plain, serialisable data (strings, numbers),
 * so a server action can build it from real records and the browser can draw
 * and export it.
 */

export interface StudioColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Relative width weight; defaults to 1. */
  weight?: number;
}

export type StudioBlock =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  /** `text` may carry **bold** and *italic* marks; the renderer draws them. */
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "stats"; items: { label: string; value: string; note?: string; tone?: "default" | "positive" | "negative" }[] }
  | { type: "keyvalue"; items: { label: string; value: string }[] }
  | {
      type: "table";
      columns: StudioColumn[];
      rows: Record<string, string>[];
      /** A closing row, e.g. totals. */
      footer?: Record<string, string>;
      /** Shown instead of the table when there are no rows. */
      emptyText?: string;
      /** Let long cell text wrap onto several lines (pasted tables) instead of being cut with an ellipsis. */
      wrap?: boolean;
    }
  | { type: "note"; text: string }
  | { type: "signature"; name?: string; role?: string };

export interface StudioDocument {
  /** Small caps line above the title, e.g. "Payment statement". */
  kind: string;
  title: string;
  subtitle?: string;
  /** Already formatted for display. */
  date: string;
  /** Reference number printed top right, e.g. "SBP-ST-20261104-01". */
  reference: string;
  blocks: StudioBlock[];
}

export interface StudioLetterhead {
  name: string;
  logo?: string;
  logoMode?: "image" | "name";
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

/** A4 at 96 dpi. The export scales these up, so layout is always measured in these units. */
export const PAGE_W = 794;
export const PAGE_H = 1123;
