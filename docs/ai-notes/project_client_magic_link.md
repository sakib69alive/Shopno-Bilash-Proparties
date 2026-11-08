---
name: client-magic-link
description: "Per-client no-login WhatsApp link (/go/<token>) for Customer/Shareholder/Landowner portal — how it's built, what it deliberately doesn't do"
metadata:
  node_type: memory
  type: project
  originSessionId: 850e54dc-ecf6-4d7c-aaef-c4dc2f888bff
  modified: 2026-11-05T07:46:10.446Z
---

Built 2026-11-05 on branch mobile-first (uncommitted at time of writing). Old-generation clients couldn't log into the portal, so admin copies a personal link from the customer list/detail (also shareholders/landowners detail) and sends it on WhatsApp; tapping it signs that phone in for 365 days.

**Design**: link = `/go/<userId>.<HMAC(AUTH_SECRET, userId+portalLinkId)>`. `portalLinkId` lives in `User.data` (no new table, no DB migration). Regenerate = new portalLinkId; turn off = remove it. JWT carries `lk=portalLinkId` and `getCurrentUser` (`src/lib/auth.ts`) rejects the session if it no longer matches, so regenerate/revoke also signs out old devices. Link has only a path — admin UI prepends `window.location.origin`, so a future custom domain needs no code change. Chat-app preview bots (WhatsApp etc.) get a static preview page, no session/count. Only PORTAL_ROLES can ever resolve a link; staff can't.

**Why**: user explicitly asked for it and accepts the tradeoff (anyone holding the link sees that client's data) per [[feedback-security-tradeoffs-owner-vs-admin]]; Admin login untouched.

**How to apply**: if AUTH_SECRET is ever rotated, every link and device session dies — warn the user. Resetting a PIN must not flip a link user to "invited" (it would lock them out; guarded in `resetOwnerPortalAccess`). Code: `src/lib/auth/portalLink.ts`, `src/app/go/[token]/route.ts`, `src/features/users/portalAccessActions.ts`, `src/components/admin/users/PortalLinkControls.tsx`.
