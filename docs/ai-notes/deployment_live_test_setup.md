---
name: deployment-live-test-setup
description: "Accounts/services now backing the live Shopno Bilash Properties test deployment — GitHub, Netlify, Neon — and where their real credentials live"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-15T14:50:18.571Z
---

As of 2026-09-15 the site is live at **https://shopnobilashproparties.netlify.app**, backed by:

- **GitHub**: account `afrinr461-boop` (email `[email removed]`) — same account the repo's `origin` (`akib239/Shopno-Bilash-Proparties`) resolves to, likely a username rename. User pushes via GitHub Desktop (no push access from this machine — see [[reference_github_repo]]).
- **Netlify**: project `shopnobilashproparties`, signed in via the same `[email removed]` (Google or GitHub OAuth). Free tier — no expiry, just usage caps (100GB bandwidth/mo, 300 build min/mo), plenty of headroom for testing.
- **Neon** (Postgres): signed up with the same `[email removed]`, project "Shopno Bilash Properties". Free tier — no expiry, 0.5GB storage, compute auto-suspends when idle (brief cold-start on next request, not data loss).

**Where the real secrets live**: `.env.local` (gitignored, local machine) has `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD_HASH` — the same 4 values are also set in Netlify's Environment Variables (Project configuration → Environment variables). Do not re-paste real secret values into memory files; point to `.env.local` or the PDFs below instead.

**Two Bangla PDFs sent to the user via `SendUserFile` on 2026-09-15**, both meant to be usable without Claude:
1. "Shopno Bilash Properties — সম্পূর্ণ Website ম্যানুয়াল" — every account/credential, hosting/domain/database setup and scaling steps.
2. "Shopno Bilash Properties — কী বদলাতে চাইলে কোথায় যাবেন" — a task-oriented content/feature map (company name, logo, founder, projects, finance, security toggles, etc., each with the exact Admin path), plus a section distinguishing what's admin-editable from what needs a code change (Claude/developer). Built from the same real facts as `src/content/adminGuide.ts` — if that file's content changes significantly, this PDF goes stale and should be regenerated.

Both are static snapshots (not regenerated automatically) — if the user reports something in either PDF is now wrong/missing, rebuild and resend rather than trying to patch the old file.

**Admin login**: `admin@shopnobilash.test`, password was reset directly against the Neon `Credential` row (previous plaintext was lost) — current value is in the PDF guide and `.env.local`'s `ADMIN_BOOTSTRAP_PASSWORD_HASH` corresponds to it. User was told to change it after first login; if they report login failing, the password may have already been changed by them — ask before assuming it's still the reset value.

**How to apply**: When the user asks about hosting, database, domain setup, or "how do I get into admin", point them at the PDF guide first (they were told to keep it somewhere safe) rather than re-deriving everything — but verify current state (e.g. `git remote -v`, Netlify/Neon dashboards if accessible) before trusting old values, since passwords/domains change over time. If they ask to go from this test Neon DB to an "official" one, see the guide's Option A (upgrade in place, recommended) vs Option B (fresh Neon project) — this was left as a user decision, not yet acted on.
