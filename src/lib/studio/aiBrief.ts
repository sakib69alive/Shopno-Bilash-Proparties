import type { StudioLetterhead } from "./types";

/**
 * The instructions that go to an AI together with the blank letterhead: where
 * the writing area is, how it should look, and how to hand the text back so it
 * can be pasted straight into Statements & Notices. Measurements are those of
 * the pad the Studio draws (A4, 794 × 1123 px at 96 dpi = 0.2646 mm per px).
 */
export function padBrief(l: StudioLetterhead): string {
  const contact = [l.address, l.phone, l.email, l.website].filter(Boolean).join(" · ");
  return `I am attaching the blank letterhead of ${l.name} (A4 portrait, PDF or image). I will tell you what the document must say; you write it on this letterhead.

THE LETTERHEAD
- Page: A4 portrait, 210 × 297 mm.
- Header (already printed, do not change it): forest-green band across the top with a short champagne segment at the left, the logo and "${l.name}" at the top left${contact ? `, contact lines at the top right (${contact})` : ""}, then a thin rule.
- Footer (already printed): a thin rule with "${l.name}" at the bottom left.
- Writing area: left and right margin 15 mm; start about 42 mm from the top; stop about 275 mm from the top (above the footer). Never write over the header or the footer.

STYLE
- Text colour #1c1b19, body text about 10.5 pt in a clean sans-serif, line height about 1.6.
- Section headings in small capitals with letter-spacing, in forest green #1f3d33; sub-headings in the same green.
- Accent colour champagne #b9a278 (thin lines, bullets). Tables: header row filled forest green with white text, thin light borders.
- Amounts in Bangladeshi taka as ৳ with lakh/crore grouping (for example ৳14,50,000). Dates like 15 December 2026.

HOW TO ANSWER (pick what I ask for)
1. If I ask for a finished file: give me the document on this letterhead, ready to print or send.
2. Otherwise reply in plain Markdown so I can paste it into the website's "Statements & Notices" editor: **bold** with **double asterisks**, headings with ## and ###, bullet lists with "- ", numbered lists with "1.", quotes with "> ", and tables with | pipes |. Use "Dear …" and a short closing only when the document needs them. Do not add a title, date or letterhead text yourself — the website adds those.

WHAT TO WRITE
(describe the document here, with names, dates, amounts and any details)`;
}
