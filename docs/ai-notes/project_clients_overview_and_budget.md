---
name: clients-overview-budget-zoom
description: "Clients overview page, \"budget on top\" tick, partial installments, ZoomPan viewer — where each lives and the non-obvious rules"
metadata:
  node_type: memory
  type: project
  originSessionId: f1f390a3-54d5-43aa-97fe-657f011f869e
  modified: 2026-11-06T16:09:22.603Z
---

Added 2026-11-06 (branch mobile-first, uncommitted):
- `/admin/clients` (ClientsOverview + ClientPanel): projects with client-name chips, extra section picked by hand (`Customer.inExtraSection`, client shown ONLY there), titles in CompanySettings (`clientsOverviewTitle/ExtraTitle`). Panel: link controls, planned payment (`Customer.plannedPayment`, plan only, changes no balance), message + document send, live activity (`User.lastSeenAt` written by portal layout at most every 2 min; notification `readAt` = "Seen"). Panel refreshes every 15 s. Backup picks it all up automatically (walks every Prisma model).
- Budget split (SplitPlanner): tick "Keep everyone else's amount — add extra on top" → `computeSplitOnTop`; `generateContributions(..., onTop)` raises `totalAmount`, stores `originalAmount` + per-owner `baseAmount`; allocation page shows planned vs now.
- Installments: money is paid against the sale, not an installment, so `allocateInstallments` (lib/installmentStatus.ts) fills them in due order → status "partial", `paidAmount`/`remaining`.
- `components/plan/ZoomPan.tsx`: pinch zoom by growing layout size (sharp text), `data-no-swipe` + pan touch-action stops page-swipe. Used in Lightbox, client flat page card + fullscreen, Home fullscreen.

**Why:** user asked for these on 2026-11-06; "meradinan" in their message probably meant a project name like "Meridian" — titles are editable.
**How to apply:** the browser pane is shared with the user — their clicks can navigate it mid-test, so do UI checks in single JS calls.
