---
name: project-mobile-first-priority
description: "Public site is being rebuilt phone-first on git branch mobile-first (uncommitted); which pages are done, how to preview, and the conventions in use"
metadata:
  node_type: memory
  type: project
  originSessionId: d48908c4-89eb-42f0-84c8-3e7799b9ed4a
  modified: 2026-11-04T11:50:27.806Z
---

On 2026-11-02 the user decided the public website must become mobile-focused: most visitors are on phones, and the design was PC-first. They want a premium, app-like feel. The plan is `docs/mobile-first-plan.md`, but the user now directs page by page and keeps asking for a "full new premium UI" per page, so the plan's page list is only a guide.

**Why:** the visitor base is mostly mobile, and they judge the old mobile UI as cheap and AI-generated.

**How to apply:** build everything under `src/components/mobile/` (`*M.tsx` components, mounted in each page with `<DesktopOnly>` wrapping the old desktop sections, so `lg`+ stays unchanged). Work is on branch `mobile-first`, nothing committed (user commits via GitHub Desktop). Related: [[feedback-sticky-positioning-bug]], [[project-architecture-two-content-layers]], [[feedback-netlify-no-persistent-disk]].

**Done (phone):** shell (top bar, tab bar, Menu sheet with current-page highlight, dark footer), Home, Projects, project detail (+ blueprints, facts), unit detail (floor-plan card), Contact, Landowners & JV, Services (below the kept hero), About, Construction (overview + per project), Founder (tabs: Founder / Partners / Shareholders / Our team), News (+ article), Gallery (+ swipe in Lightbox), Login. Admin additions: cover/gallery/floor-plan/blueprint uploads, bulk add units, bulk gallery upload, unit status inline, team group select, Website group first in admin nav + dashboard "Website Content" quick actions.

**Not done:** Saved, legal pages, error/not-found/loading polish, reordering of team members, construction data admin (it is a static empty file), the enquiry/partnership forms still send nothing (placeholder `submitEnquiry`).

**Conventions the user reacted to:** dislikes generic/dark "skyline" hero ideas — liked the clean white hero with the hand-holding-house image (`public/login-house.webp`, with a transparent copy-deterrent layer) and the reference app style; wants no fake data (demo data only in local `prisma/dev.db` via `scripts/seed-demo.ts`, which refuses non-SQLite URLs); dev server on port 3000 must be started with `DATABASE_URL=file:./dev.db` (launch config `dev-local`).
