---
name: feedback-netlify-no-persistent-disk
description: "Netlify (like most serverless hosts) has no persistent disk — this has now broken two separate features (SQLite DB, then file uploads) the same way; check for it whenever adding anything that writes to local disk"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5bcf6674-e22e-4a75-82bd-572e56a6a091
  modified: 2026-09-14T19:03:31.265Z
---

Netlify's serverless functions run in fresh, isolated containers per invocation with no shared writable disk. This has silently broken two unrelated features so far, discovered only after deploying:

1. **The database** — SQLite (`file:./prisma/dev.db`) worked perfectly in local dev but couldn't work at all on Netlify. Fixed by migrating to Neon Postgres (commit `e9aa85a`, 2026-09-14).
2. **File uploads** — `src/lib/fileStorage.ts`'s `saveUploadedFile` wrote directly to `public/uploads/` via `node:fs`. Worked in dev, but every uploaded file (Logo, Founder Portrait, Gallery, Project/Unit/Building photos, Documents, Notification images) silently vanished on Netlify — discovered when a demo project's photos 404'd on the live site. First fix attempt (commit `05d3456`) added `src/lib/uploadStore.ts` picking a backend via `process.env.NETLIFY === "true"` — **this was wrong and confirmed broken live**: uploading a real Founder photo through the admin UI failed with `ENOENT: ... mkdir '/var/task/public'`, because that env var is set at Netlify's build step but isn't present in the deployed Server Action's own runtime. Corrected in commit `c05c572`: every write now *attempts* Netlify Blobs first and only falls back to local disk when Blobs itself throws `MissingBlobsEnvironmentError` (confirmed synchronous, no network call, by calling `@netlify/blobs` directly) — a real attempt, not an environment-variable guess. `write()` returns which backend actually succeeded so the URL (`/api/uploads/...` for Blobs, `/uploads/...` for disk) matches reality.

**Why**: This is a genuine architecture-wide gap category, not a one-off bug — anything writing to local disk with `node:fs` will silently misbehave the moment it's deployed, since local dev never surfaces the problem (real disk, long-running process). `backup.ts`'s full-backup/restore also touched disk directly and needed the same fix, applied in the same commit.

**How to apply**: Before trusting ANY new or existing feature that reads/writes local files (`node:fs`, `path.join(process.cwd(), ...)`) as "done" on this project, ask whether it's been verified against the actual Netlify deployment, not just local `npm run dev` — this class of bug is specifically invisible in local dev by construction. If a new feature needs to persist something server-side, route it through `writeToStore`/`readFromStore`/`removeFromStore`/`listAllStoredFiles`/`readFromBlobStore` (`src/lib/uploadStore.ts`) rather than writing raw `node:fs` calls. Also: **don't trust `process.env.NETLIFY` (or likely any other "am I on Netlify" env-var guess) to reflect what's actually set in a deployed Next.js Server Action/route-handler's runtime** — it may only be present at Netlify's build step. When a library has its own ambient-context detection (like `@netlify/blobs`'s ), prefer a real attempt-then-catch on that library's own error over re-guessing the environment yourself.
