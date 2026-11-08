---
name: blueprint-ai-rules
description: Floor-plan SVG rules + admin Blueprint AI page; real architect plans must be copied FAITHFULLY (structure, pillars, lettering) — never simplified
metadata:
  node_type: memory
  type: project
  originSessionId: f1f390a3-54d5-43aa-97fe-657f011f869e
  modified: 2026-11-06T12:03:15.395Z
---

Admin → Settings → Blueprint AI (`/admin/settings/blueprint-ai`) holds master prompts (copy a drawing / edit existing) and an in-browser SVG checker. Rules live in `src/lib/blueprintSvg.ts` (`BLUEPRINT_SVG_LIMITS`, `checkBlueprintSvg`) and the prompt text in `src/content/blueprintAiGuide.ts`; both read the same numbers. `saveUploadedFile(file, subdir, { blueprint: true })` refuses hard-rule violations.

**Faithful-copy rule (user, 2026-11-06):** the user's real architect drawings (PDF/CAD) carry the building's real structure — columns, parking bays, lift/stair cores, plot boundary, dimension lines, hatching, cars — and real lettering (room names, sizes). A first version dropped all that ("no text, no dimension lines, simplify furniture") and the user rejected it: "structure/design must not be changed, details must stay". So the prompts now start with a GOLDEN RULE: copy, never redesign; lettering is converted to outlined glyphs in ONE filled `<path>` (never `<text>`); one ink; ≤2 filled paths; ~5 merged paths total. Limits raised: recommended 400 KB, max 1 MB (faithful plans are 250–800 KB).

**How the demo plans were made:** PDFs have pure vector paths (text already outlined). Pipeline (scratchpad, not in repo): pdfjs-dist operator list → collect path items → rotate sideways sheets upright → group by line width (heavy/mid/thin strokes) + fills (lettering) → relative commands, quadratic glyph curves. Output `public/uploads/demo/real-{ground,typical}-floor.svg`; seed `scripts/seed-demo-real-plan.ts` (demo project "Shopno Heights", portal unit 1A + public `/projects/shopno-heights`).

**Why the old rules existed:** a hand-made 19 KB SVG (600 elements, `<text>`, white strokes faking door gaps) showed torn noise on the user's Android phone in the owner portal card (CSS invert + mix-blend-screen + pinch-zoom). The exact GPU cause was never confirmed; the faithful 800 KB plan has not been tested on a real phone yet — if it glitches, check with the checker and consider trimming glyph/hatch detail, not structure.
