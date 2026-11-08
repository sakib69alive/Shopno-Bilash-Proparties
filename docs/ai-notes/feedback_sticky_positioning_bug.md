---
name: feedback-sticky-positioning-bug
description: This environment/browser stack has a reproducible position:sticky compositor bug — always use position:fixed with manual offset compensation instead
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-14T14:17:45.109Z
---

`position: sticky` reliably misbehaves in this specific environment — a sticky-positioned element (e.g. a sidebar or header) can visually collapse or jump during scroll instead of sticking correctly. This has been hit and fixed at least three times in this codebase: the public site's `Header.tsx`, then `AdminSidebar.tsx`/`AdminHeader.tsx` (commit `01a116c`).

**Why:** Not a CSS logic bug in the app's own code — it's a reproducible compositor quirk in this environment/browser stack. The first attempted fix at the admin sidebar (splitting "Help" into its own flex region) did NOT fix it, because the real symptom was the whole `<aside>` collapsing, not just one child scrolling away — sticky itself was the problem, not the layout structure around it.

**How to apply**: If the user reports a fixed-position UI element (sidebar, header, toolbar) "collapsing", "jumping", or "scrolling away" when it shouldn't, check whether it uses `position: sticky` before investigating anything else. The fix is always: switch to `position: fixed`, then compensate manually in the parent/content column with padding/margin equal to the fixed element's size (e.g. `lg:pl-64` for a 256px sidebar, `pt-16` for a 64px header) since a fixed element no longer occupies space in normal flow. `PortalShell.tsx`'s `<aside>`/`<header>` still use `sticky` as of 2026-09-14 and were deliberately left untouched (out of scope at the time) — a known latent risk if that page is ever reported broken the same way.
