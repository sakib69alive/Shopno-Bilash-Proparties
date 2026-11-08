---
name: project-simba-admin-helper
description: "Simba, the preloaded (non-AI) admin guide mascot, plus Remove-demo-data page and the Public/Client/Money quick-open hubs"
metadata:
  node_type: memory
  type: project
  originSessionId: c3e64630-b8de-4ed5-8724-d00692f3e90e
  modified: 2026-11-07T18:48:00.352Z
---

Admin panel has quick-open hubs (/admin/public-page, /client-page, /money-page; config in src/config/quickOpen*.ts, guides in quickOpenGuides.ts) and "Simba", a PC-only floating guide (src/components/admin/simba/, data in src/content/simba/, live status API /api/admin/simba reading src/features/simba/status.ts). Simba is NOT a real AI: preloaded text + live DB counts. Features: 0-100% setup journey, per-project checklist, "Explain what I click" mode (dictionary + page helper text), error watcher on role=alert, FAQ. Image at public/simba.webp. Remove-demo-data lives at /admin/settings/demo-data (Super Admin only, typed phrase REMOVE ALL DATA, src/lib/demoData.ts).

Later additions: Today tab + red badge (src/features/simba/attention.ts: overdue installments, reminders, leads, data warnings, backup age — backup downloads are now audit-logged as system.backup.download), Ask tab (search over all text), walk-throughs + welcome tour (src/content/simba/tours.ts, SimbaTour.tsx), pre-save notices (invalid required field, money field of 0).

Learn tab: 14 hands-on lessons (src/content/simba/lessons.ts) that open real pages and outline every field/button incl. delete (only pointed at, never pressed), with sample values and practice files in public/simba-demo/ (tracked folder; public/uploads is gitignored). A lesson step's `go` supports {project}/{customer}/{unit}… resolved from /api/admin/simba `ids`. Full tour (every sidebar option) is built from ADMIN_NAV_GROUPS and navigates per step.

**Why:** user wants any new admin to be able to run the whole system alone.
**How to apply:** when adding a new admin page/feature, also add it to src/content/simba/journey.ts / knowledge.ts (PAGE_EXTRAS, ELEMENT_HELP) and the guide so Simba stays complete. Related: [[project-clients-overview-and-budget]].
