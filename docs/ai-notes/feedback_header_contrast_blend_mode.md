---
name: feedback-header-contrast-blend-mode
description: "mix-blend-mode does not work to auto-invert a fixed header's text against scrolled page content"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-14T10:44:43.700Z
---

`mix-blend-mode: difference` on the public site's fixed header's nav text, meant to auto-invert (white over dark sections, dark over light sections) with zero manual tracking, does NOT work — and this was not caught by code review or a quick look, only by the user reporting real breakage (text invisible over light sections) after it shipped.

**Why:** A `position: fixed` element is always its own stacking context. A blend mode set on its children can only blend against other content painted inside that same fixed box — never the actual page content scrolling behind it. The nav text just stayed a flat, unchanging white regardless of what was underneath. This is a genuine, non-obvious CSS limitation, not a bug in the implementation.

**How to apply**: If asked to make a `position: fixed` element auto-contrast against arbitrary scrolled content again (here or another project), don't reach for `mix-blend-mode` — it looks like the right tool but silently doesn't work for this specific case. The working approach used instead: mark actual dark regions in the DOM with a data attribute (`data-header-tone="dark"` in `src/components/navigation/Header.tsx`), then on scroll check via `getBoundingClientRect()` whether any such marked element's rect currently covers a fixed sample point near the header — geometry-based, not hit-testing (`elementFromPoint`/`elementsFromPoint` silently skip `pointer-events: none` elements, which is exactly how partial-dark scrims like `FounderHero`'s top gradient are usually marked, so hit-testing missed them too).
