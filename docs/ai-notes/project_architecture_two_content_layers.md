---
name: project-architecture-two-content-layers
description: "Shopno Bilash Properties has two parallel, unlinked data models: internal business records vs. public-facing Website CMS content — know which one a file belongs to before editing"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-14T14:17:56.242Z
---

The app has two separate, NOT foreign-key-linked data layers that both use the word "Project"/"Unit" and can look interchangeable at a glance:

1. **Internal business model** — `src/types/project.ts`, `src/features/projects` (`projectRepository`), plus `Unit`, `Parking`, `Sale`, `OwnerContribution`, etc. This is what Admin's Sales/Finance/Construction/Ownership features actually operate on — real budgets, landowner IDs, ownership records.
2. **Website CMS content** — `src/content/projects.ts`'s `Project` type (lean, display-oriented: name/slug/description/gallery/totalUnits/availableUnits/features, no financial fields), backed by Prisma via `src/features/projectContent/repository.ts` (`projectContentRepository`, keyed by `slug`, not linked to the internal model's `id`). Same pattern exists for Units (`content/units.ts` type + `features/unitContent/repository.ts`) and News (`content/news.ts` + `features/news/repository.ts`).

**Why**: The public marketing site needs richer, hand-edited copy (design philosophy statements, curated photo galleries, marketing-friendly unit-type lists) than raw internal business records carry, and the internal model has budget/landowner fields that must never appear publicly. So CMS content is maintained separately by admin via `/admin/content/projects`, `/admin/content/*` — the repository doc comments openly call this "a known, documented gap," same honesty pattern used for the News CMS.

**How to apply**: Before adding a field or wiring up new public-page data, check whether it belongs on the CMS `Project`/`Unit` type (manually admin-typed, e.g. `totalUnits`/`availableUnits`/the new `totalParkingCar` etc. added 2026-09-14) or the internal business type (derived live from real transactional data, e.g. `Parking.projectId` links to the *internal* project, not the CMS one). Do NOT assume a `projectId`/`slug` on one side resolves to a record on the other — there is no join between them. When the user asks for something to show on the public project page, the CMS layer is almost always the right place, following the same manual-field pattern `totalUnits`/`availableUnits` already established (see `src/components/admin/projectContent/ProjectContentForm.tsx`, `src/features/projectContent/actions.ts`).
