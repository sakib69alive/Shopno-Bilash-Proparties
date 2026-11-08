---
name: feedback-cannot-login-to-admin
description: "Claude cannot log into this site's admin panel itself (password entry is prohibited) — how admin features actually got tested this session"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-14T10:44:54.553Z
---

Entering a password to authenticate is prohibited regardless of whose site it is or who owns the credentials — this applies to Shopno Bilash Properties' own `/login` (Staff tab) just as much as any third-party site. This came up repeatedly while building and needing to verify admin-panel-only features (Company Policy CMS, Backup & Restore, sidebar completeness dots, Settings form changes).

**Why:** The safety rules around credential entry make no exception for "it's the user's own site" or "I have the password from an earlier session" — the action itself (typing a password into a login field) is what's disallowed.

**How to apply**: When a change touches something only reachable behind admin login, verify it a different way instead of trying to log in:
- Public-facing output (a page fed by admin-editable data) can be checked directly in the browser with no login needed — this is the preferred path whenever the feature has any public surface.
- Server Actions/repository logic can be exercised directly with a short-lived Node script via `npx tsx some-script.ts`, calling the real `src/features/*/actions.ts` or `src/lib/*.ts` functions against the live dev database — this is how the backup/restore round-trip and the completeness-check logic were actually verified this session. `server-only`-guarded modules (`src/lib/db.ts`, `src/lib/prismaRepository.ts`, etc.) throw when imported this way outside Next's bundler; temporarily commenting out just the `import "server-only";` line, running the test, then reverting that exact line (verified via `git diff` showing zero diff afterward) is the established workaround — never leave that revert undone.
- Always delete the throwaway test script and any test data it inserted once verification is done — don't leave scratch scripts or fake seeded rows in the repo/DB.
- What can't be verified this way (e.g., actually clicking through a new admin form's UI, confirming a button's hover state) should be said plainly rather than implied as tested — tell the user what was and wasn't checked.
