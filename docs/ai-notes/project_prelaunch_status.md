---
name: project-prelaunch-status
description: "Shopno Bilash Properties pre-launch status — what's done vs. what blocks going fully live"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-14T19:03:46.428Z
---

User (Akibur Rahman) said on 2026-09-14 he plans to make the site fully public "kalke" (the next day). He stepped away mid-session and asked for everything code-side finished and tested before he's back, with files organized and permission checks handled on my end.

**Done as of 2026-09-14** (commits `73219cc`, `8f81c5a`, `0f3b90c` — see [[feedback_header_contrast_blend_mode]] and [[feedback_cannot_login_to_admin]] for lessons from this stretch):
- Demo/business data fully cleared from the local DB — only real company content remains.
- Dev-login backdoor disabled by default, DB-backed rate limiting, no public "Admin" link, security review done.
- Public site polish: real logo everywhere, momentum scroll, header auto-adapts light/dark text via `data-header-tone="dark"` markers + live geometry checks (`src/components/navigation/Header.tsx`), Our Story timeline + Our Impact stats admin-editable, GrowthPathMotif skyline graphic with a Catmull-Rom growth line.
- New admin-editable "Company Policy" page (`/policy`, numbered auto-numbered rules, `**bold**`-only rich text via `src/components/ui/RichTextArea.tsx`).
- New full Backup & Restore system (`/admin/settings/backup`, `src/lib/backup.ts`) — download all data+images or data-only as a zip; restore replaces DB contents in one transaction and writes files back to `public/uploads/`. Verified via a real round-trip script test.
- New sidebar "missing info" red-dot indicators (`src/lib/adminCompleteness.ts`) — flags nav items whose underlying list/singleton is still empty, e.g. Projects with zero rows, Settings with all four "Our Impact" stats blank.
- New admin-editable footer Contact (address/phone/email/hours) and Follow (6 social platform icons, hand-drawn in `src/components/ui/SocialIcons.tsx` since lucide-react dropped brand icons) — both sections hidden entirely until real values exist, same "never invent" rule as the rest of the footer.
- Admin sidebar/header switched `sticky` → `fixed` positioning (commit `01a116c`) — see [[feedback_sticky_positioning_bug]].
- Site logo made fully admin-editable (commit `4691b84`) — Settings → Logo: upload an image, or switch to "Company Name" text mode; controls public header/footer, login page, admin sidebar, Owner Portal all at once via `src/components/navigation/Logo.tsx`.
- Found and cleared a second, separate layer of demo data that survived the DB-level cleanup: hardcoded arrays in `src/content/projects.ts` (5 fake projects incl. "Meridian Residences"), `content/home.ts` (featured project + stats), `content/news.ts` (5 fake articles, was leaking into the real sitemap.xml), `content/construction.ts` — commit `2729ba3`. These `.ts` files are a separate "Website CMS" content layer (Prisma-backed via `projectContentRepository`/`newsRepository` etc., keyed by slug) distinct from the internal business models (`types/project.ts`, `features/projects`) — see [[project_architecture_two_content_layers]].
- Parking now distinguishes car vs. bike everywhere (commit `83c49ea`): admin bulk-generator has a Type field, admin Parking list has a Type column+filter, Owner Portal shows the correct icon/label per space (was always a generic car icon before), and the public `/projects/[slug]` page shows a car/bike parking availability summary (new admin-settable fields on the Website CMS Project type, same manual pattern as its existing Total/Available Units).
- Deep financial-calculation audit across all of Admin (commit `2e87383`, prompted by explicit user concern about company accounting accuracy): fixed "Actual Cost" summing non-verified expenses/contractor payments, Reports counting cancelled sales, Owner Contributions "Total Payable" not including adjustments (broke Payable−Paid=Outstanding whenever a waiver/discount existed), and relabeled the free-hand `ProjectBudget.actual` field ("Actual (Manual)") since it can diverge from the live-computed figure — see [[feedback_financial_calc_conventions]].

**Done as of 2026-09-15 — site is now LIVE for testing** (see [[deployment_live_test_setup]] for full account/credential details):
- Database migrated from local SQLite to Postgres (Neon free tier) — commit `e9aa85a`. All 17 migrations applied cleanly (one, `add_owner_credential`, needed a `DATETIME`→`TIMESTAMP` fix for Postgres compatibility). Real local data (admin credential, user, settings, founder profile, milestones — every business list was already empty) exported and re-imported with zero loss.
- Pushed to GitHub (`akib239`/`afrinr461-boop` — same account, likely renamed) via the user's GitHub Desktop.
- Deployed to Netlify, connected to the Neon database: **https://shopnobilashproparties.netlify.app** — verified live (homepage, login page, no console errors, DB round-trip confirmed working).
- Admin password reset directly against the Neon `Credential` table (old one's plaintext was unknown) to `[password removed — see the deployment PDF guide]` — user was told to change it after first login.
- A full Bangla PDF guide was generated and sent to the user (`SendUserFile`) covering every account, credential, and step-by-step instructions for buying a domain and scaling the database later — built to be usable without Claude's help. Built via headless Chrome printing a styled HTML file to PDF (`chrome.exe --headless --print-to-pdf`) since no pandoc/wkhtmltopdf was available.
- Admin "Help & Documentation" got a "Copy this guide" print/PDF-export button (commit `955d44f`) — browser-native `window.print()`, no new dependency.
- Demo project "Meridian Residences" populated with realistic, internally-consistent data across every Admin screen (Finance, Units, Owners, Construction) plus 6 real Unsplash photos (hotlinked, not re-uploaded — commit `af31210`) — see [[project_architecture_two_content_layers]] for the two-layer CMS/business-model split this touched.
- **Found and fixed a second Netlify "no persistent disk" bug**: every file upload feature (Logo, Founder Portrait, Gallery, Project/Unit photos, Documents) silently lost files on Netlify the same way SQLite did. Fixed in `src/lib/uploadStore.ts` — see [[feedback_netlify_no_persistent_disk]] for the full story, including a first attempt that was wrong and confirmed broken live before the corrected version (commit `c05c572`) shipped.

**NOT done — still blocks calling it a real public launch**:
1. **No production domain configured** — still on the free `*.netlify.app` subdomain; `NEXT_PUBLIC_SITE_URL` not yet set. Steps are in the PDF guide (and `DEPLOYMENT_GUIDE.md`).
2. Legal pages (Privacy/Terms/etc.) should get a real lawyer's sign-off — content is drafted, not legally reviewed.
3. No SMS/email provider wired up for notifications (deliberate, not a bug).
4. The Neon DB now backing the live test site is the SAME one that would become production — if the user creates test/junk records while testing, those need cleaning (or a fresh Neon project) before calling it official. Flagged in the PDF guide, not yet acted on.

**How to apply**: If the user asks "is the site ready", walk this list — item 1 is the main remaining true blocker. Items in "Done" are genuinely finished and verified live (not just code-complete).
