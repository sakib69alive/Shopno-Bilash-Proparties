# AI notes — read this first

These files are the project's working notes: what has been built, the rules that must not be broken, and how the owner likes to work.
They were written by Claude while building the site and are copied here so they live in git and in any zip/backup of the project.

**Real passwords, e-mail addresses and keys are NOT in these files.** The live secrets are in `.env.local` (never committed) and in the
deployment PDF guide the owner keeps. `MEMORY.md` is the index; each other file is one topic.

## Giving the project to an AI (Claude, ChatGPT, anything)

Paste or upload this, then your request:

> Read `ARCHITECTURE.md`, `README.md` and every file in `docs/ai-notes/` first (start with `MEMORY.md`). They hold rules that are not obvious from the code.
> Then do the task below and verify it works before saying it is done.

## Putting them back into Claude's own memory (after a new computer or a wiped folder)

Copy every `*.md` file from this folder into:

`C:\Users\<you>\.claude\projects\E--website-Shopno-Bilash-Proparties\memory\`

(The folder name is the project path with `:` and `\` turned into `-`. Open the project once in Claude Code and it creates the folder.)

## Rules that bite most often

- `position: sticky` is broken in this environment — use `fixed` with a manual offset.
- Netlify has no persistent disk — anything that writes files goes through `src/lib/uploadStore.ts`.
- Local testing: start the dev server with `DATABASE_URL=file:./dev.db` and `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true` (launch config `dev-local`); the login page then has "(dev)" buttons.
- Owner Portal sign-in is deliberately simpler than Admin; keep Admin security maximal — do not mix the two.
- The public website content (CMS) and the internal business records are two separate, unlinked models.
