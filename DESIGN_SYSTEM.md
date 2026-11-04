# Shopno Bilash Properties — Design System

Status: **foundation only**. No Home page, Admin Dashboard, Customer Portal, or Shareholder Portal has been built yet. This document — and the tokens/components it describes — is what every future page and dashboard must build on. Do not introduce new colors, fonts, spacing values, or one-off components without a documented reason; extend this system instead.

---

## 1. Brand philosophy

Shopno Bilash Properties positions as **professional, trustworthy, modern, premium, and transparent** — a serious real estate developer, not a listings template. The visual language borrows the clarity and restraint of premium SaaS and modern architecture portfolios, without copying any specific company's branding.

**Personality:** Trustworthy + Premium + Modern (primary), Warm + Ambitious + Transparent (secondary). Confident, never arrogant.

**Copy voice:** clear, short, human, elegant. No exaggerated claims, no guaranteed-return language, no fake urgency.
- Use: *"Designed for better living."* / *"Built on trust. Designed for the future."*
- Avoid: *"BEST PROPERTY IN BANGLADESH!!!"* / *"100% GUARANTEED PROFIT"*

**Avoid:** heavy gradients, gold/glassmorphism overuse, cartoon illustration, generic template look, excessive rounding, flashing banners.

---

## 2. Color tokens

Defined as CSS custom properties in [`src/app/globals.css`](./src/app/globals.css) and mapped into Tailwind via `@theme inline`, so every token is available as a Tailwind utility (`bg-accent`, `text-fg-muted`, `border-border`, etc.). Dark theme overrides the same variable names under `prefers-color-scheme: dark` and `[data-theme="dark"]` (for a future manual toggle) — components never need theme-specific classes.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAF8F4` (warm ivory) | `#15140F` | Page background |
| `surface` | `#F1EEE6` (light stone) | `#1C1A15` | Secondary background, subtle section fills |
| `surface-raised` | `#FFFFFF` | `#211F19` | Cards/panels above `surface` |
| `fg` | `#1C1B19` (deep charcoal) | `#F3F1EA` | Primary text |
| `fg-muted` | `#6B6660` | `#A8A29A` | Secondary text |
| `fg-subtle` | `#8F897F` | `#7D786F` | Placeholders, hints |
| `border` / `border-strong` | `#E3DDD1` / `#CFC7B7` | `#322F27` / `#453F34` | Hairlines, input borders |
| `accent` / `accent-strong` | `#1F3D33` (deep forest green) | `#5EA083` / `#7FBB9F` | Primary brand, CTAs, links, focus ring |
| `accent-soft` | `#E4EBE6` | `#1E2E27` | Accent-tinted background (selected states) |
| `premium` / `premium-soft` | `#B9A278` (muted champagne) | `#D4BE8E` / `#2A2519` | **Sparing** premium accents only — dividers, premium tags. Never a dominant color. |
| `success` / `success-soft` | `#2F6B4F` | `#4E9D77` | Paid, Completed, Approved, Available |
| `warning` / `warning-soft` | `#A8710F` | `#D6A13C` | Pending, Reserved, Due Soon, Under Review |
| `error` / `error-soft` | `#A83C2E` | `#D9695A` | Overdue, Cancelled, Rejected, Unavailable |
| `info` / `info-soft` | `#3B6E92` | `#6FA8CC` | Ongoing, In Progress, Scheduled |
| `disabled-bg` / `disabled-fg` | `#E7E3DA` / `#A39E95` | `#2A2822` / `#6B665D` | Disabled controls |
| `overlay` | `rgb(28 27 25 / 60%)` | `rgb(0 0 0 / 70%)` | Modal/drawer scrims |

**Do:** use `bg-accent`, `text-error`, etc. **Don't:** write a raw hex value in a component.

**Light/dark direction:** light is primary. Architectural photography, editorial whitespace, and a "transparent, trustworthy" brand read best on a warm-ivory daylight background — dark is a fully-supported secondary mode (automatic via `prefers-color-scheme`, same tokens, no separate design), not an equal 50/50 identity. Don't design a section dark-first.

---

## 3. Typography

**Fonts** (`src/app/layout.tsx`, loaded via `next/font/google`):
- **Display / headings / buttons / nav** — Manrope (`--font-manrope`)
- **Body / forms / numeric data** — Inter (`--font-inter`)
- **Bangla** — Noto Sans Bengali (`--font-noto-sans-bengali`), listed as a fallback after the Latin font in both stacks so mixed English/Bangla copy renders both scripts correctly without a language-specific class.

**Type scale** — one utility class per step (`src/app/globals.css`, `@layer utilities`), bundling family + size + line-height + tracking + weight so components never compose four separate utilities for one heading:

| Class | Size (desktop) | Weight | Notes |
|---|---|---|---|
| `.text-display-xl` | 64px → 40px (`clamp`) | 700 | Hero headlines only |
| `.text-display-l` | 48px → 34px | 700 | |
| `.text-display-m` | 36px → 28px | 700 | |
| `.text-h1` | 32px → 26px | 700 | |
| `.text-h2` | 28px → 22px | 600 | |
| `.text-h3` | 22px | 600 | |
| `.text-h4` | 18px | 600 | |
| `.text-body-lg` | 18px | 400 | |
| `.text-body` | 16px | 400 | Default paragraph |
| `.text-body-sm` | 14px | 400 | |
| `.text-caption` | 12px | 500 | |
| `.text-label` | 13px | 600 | Form labels, eyebrows, badges |
| `.text-button` | 15px | 600 | |
| `.text-nav` | 15px | 500 | |
| `.text-numeric` | 16px | 600 | `tabular-nums` — all currency/financial figures |
| `.text-stat-lg` | 56px → 36px | 700 | Secondary stat callouts (3–4 up in a row) |
| `.text-stat-xl` | 88px → 48px | 700 | Hero-scale single stat (e.g. a "24+ years" moment) |

Display/H1/H2/stat use `clamp()` so they scale continuously between mobile and desktop instead of jumping at breakpoints.

---

## 4. Spacing

8px-based scale: `4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 120, 160`. Tailwind v4's spacing utilities (`p-*`, `gap-*`, `m-*`, `w-*`, …) are generated from a single `--spacing: 0.25rem` multiplier, so every value in the scale (and any multiple of 4px) is already available — e.g. `p-4` = 16px, `p-10` = 40px, `p-30` = 120px, `p-40` = 160px. Never hand-write a pixel value; use the multiplier-based utility.

Side padding (the `--gutter` token, consumed by `<Container>`) is responsive: 16px mobile → 24px tablet (≥768px) → 40px desktop (≥1024px).

**Section rhythm** (vertical, independent of `--gutter`) is a separate token trio consumed by `<Section spacing>`: `sm` 64px→80px, `md` 96px→128px, `lg` 160px→200px (mobile → ≥1024px). Every full-bleed page section should be a `<Section>`, not a hand-picked `py-*` — this is what keeps whitespace between sections consistent site-wide instead of drifting per page.

---

## 5. Grid & containers

- **Desktop** 12-column, **tablet** 8-column, **mobile** 4-column — use Tailwind's `grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12` directly; no custom grid utilities needed.
- Breakpoints are Tailwind's defaults: `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1536.
- Container tokens (`--container-narrow/content/wide` → `max-w-container-*`): narrow 768px (article/long-form), content 1280px (default page width), wide 1440px (hard ceiling for full-bleed sections). Use the [`<Container>`](./src/components/ui/Container.tsx) primitive rather than a raw `max-w-*` + manual padding.

---

## 6. Radius & shadow

- Radius: `sm` 6px, `md` 10px, `lg` 16px, pill = Tailwind's `rounded-full`. Deliberately restrained — this is an architecture brand, not a bubbly consumer app.
- **Phone-layout exception (below `lg`):** the app-style mobile shell and cards in `src/components/mobile/` use two larger radii — `--m-radius-card` 20px and `--m-radius-hero` 28px (plus `rounded-full` pills). The reference for the phone redesign is a rounded, app-like real-estate UI, and 6–16px corners read as a desktop page squeezed onto a phone. These tokens are scoped by name (`--m-*`): only components under `components/mobile/` reference them, so the restrained scale above still governs every desktop (`lg` and up) surface and everything outside the mobile folder. See `docs/mobile-first-plan.md`.
- Shadow: `sm/md/lg/float`, all warm-tinted (`rgb(28 27 25 / …)` in light, near-black in dark) and low-opacity. Never a heavy black shadow. `float` is reserved for genuinely floating UI (open dropdowns/modals), not resting cards.

---

## 7. Motion

- Durations: fast 150ms, base 250ms, slow 400ms. Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.
- `prefers-reduced-motion: reduce` is handled globally in `globals.css` — all animation/transition durations collapse to near-zero. Don't re-implement this per component.
- Avoid parallax, bouncing, and constant/idle motion. Hover/focus transitions and simple fade/slide/scale on entrance are the only patterns to reach for.
- **Scroll reveal:** use `<Reveal>` (`src/components/ui/Reveal.tsx`) — a plain IntersectionObserver + CSS transition (`.reveal` class in `globals.css`), fires once, no animation library. Stagger siblings with its `delay` prop (ms). This is the only entrance-animation primitive; don't hand-roll a second one per page.

---

## 7b. Image direction

No real photography exists yet — this is the treatment contract for when it does. All imagery goes through `<Media>` (below): architectural/construction/interior photography, cinematic and realistic, never generic stock-photo framing. Full-bleed hero and section-background images use `ratio="hero"` or `"wide"`; project/property cards use `"standard"` or `"square"`; portraits/detail shots use `"portrait"`. Text overlaid on a photo always sits on the `overlay` gradient scrim, never raw on the image.

---

## 8. Components (built so far)

All in `src/components/ui/`:

| Component | Notes |
|---|---|
| `Button` | Variants: `primary, secondary, outline, ghost, text, destructive`. Sizes: `sm, md, lg, icon`. Props: `loading`, `iconLeft`, `iconRight`. Built with `class-variance-authority`. |
| `StatusBadge` | Renders from `STATUS_CONFIG` (`src/lib/status.ts`) — every status always pairs an icon with a text label, never color alone. |
| `Card` | Variants: `default` (bordered `surface-raised` + `shadow-sm`), `plain` (no border/shadow), `media` (no padding — for image-led editorial cards). Not every future card needs an identical bordered-rectangle treatment; pick per context. |
| `Input` | Always-visible label (never placeholder-as-label), `error`/`helperText` states, `aria-invalid`/`aria-describedby` wired up. |
| `Container` | Centers content at a given max-width and applies the responsive `--gutter` padding (horizontal only). |
| `Section` | `spacing` (`sm/md/lg`, vertical rhythm via the section-spacing tokens above) + `background` (`bg/surface/transparent`). Pair with `<Container>` inside for horizontal gutters — the two are deliberately separate axes. |
| `Divider` | Hairline `<hr>`, horizontal or vertical, `tone` `default`/`strong`. Use instead of an ad-hoc `border-t`. |
| `Media` | Wraps `next/image`. `ratio` (`hero/wide/standard/square/portrait/auto`) + `radius`, optional bottom gradient `overlay` + `caption` slot for text-on-image legibility. The one place every project/property/gallery photo should go through, so image treatment stays consistent site-wide. |
| `NavLink` | Underline-grows-from-left hover/active state (not a background fill or color-only change) — primitive for the future header/footer nav. |
| `Reveal` | Scroll-triggered fade-up entrance (see Motion above). |

**`src/components/navigation/`** (Step 3 — global header/footer/layout, see that folder's README for the full list): `Header`, `DesktopNav`, `MobileNav`, `NavigationGroup`, `MenuButton`, `Logo`, `Footer`, `Breadcrumbs`, `PageContent`, `HeaderVariantContext`.

**Not yet built** (placeholder `README.md` only, describing intended contents): `forms/`, `property/`, `project/`, `dashboard/`, `finance/`, `documents/`, `feedback/`, `charts/`. Populate these only when the page/portal that needs them is actually being built.

### Status tokens (`src/lib/status.ts`)

Single source of truth mapping a status key → `{ label, tone, icon }`. Tones (`success/warning/error/info/neutral`) resolve to the color-token pairs above. Two additions beyond the prompt's literal examples, made deliberately:
- **`neutral` tone** — for statuses that aren't actually good/bad/urgent (e.g. `Sold`, `Upcoming`). Forcing every status into success/warning/error/info would make routine states (a normal completed sale) look alarming or falsely positive.
- Icons chosen per status avoid a static "spinner" glyph for non-loading states (`Construction` for project *Ongoing*, `RefreshCw` for *In Progress* — not an unanimated `Loader2`, which reads as a broken loading indicator when it doesn't spin).

### Formatting (`src/lib/format.ts`)

- `formatBDT(amount)` → `৳1,25,00,000` — uses `Intl.NumberFormat("en-IN")` for grouping, which produces Bangladesh's lakh/crore digit grouping (verified against the three examples in the brief: 1,25,000 / 12,50,000 / 1,25,00,000).
- `formatNumber`, `formatPercent`, `formatDate` (→ `05 Sep 2026`, built manually rather than via `Intl.DateTimeFormat` locale ordering, to guarantee the exact `DD MMM YYYY` order regardless of runtime locale data).

### i18n scaffolding (`src/locales/`, `src/lib/i18n.ts`)

Dictionary-shaped JSON per locale (`en`, `bn`) with a typed `getDictionary(locale)` accessor. No routing/middleware is wired up yet — that's a decision for whichever prompt builds the first real page (route-based `/bn/...` segments vs. a cookie is still open). Text should be pulled from dictionaries rather than hardcoded as soon as real pages exist.

---

## 9. Accessibility

- Global `:focus-visible` outline uses `accent` at 2px + 2px offset — don't suppress focus rings.
- Status is always icon + label (see above), never color-only.
- `Input` wires `aria-invalid` and `aria-describedby` automatically when `error`/`helperText` is set; label is a real `<label htmlFor>`, never a placeholder substitute.
- `prefers-reduced-motion` respected globally.
- `color-scheme: light dark` set on `<html>` so native form controls/scrollbars match the active theme.

---

## 10. Responsive rules

- Mobile-first. Don't design desktop first and shrink it.
- Data tables: on narrow viewports, prefer responsive stacked cards or a horizontally-scrolling container over shrinking text — this isn't built yet (no tables exist), but any future `DataTable` must follow this rule.
- Touch targets: buttons default to 44px height (`size="md"`) or larger; the `sm` size (36px) is for dense desktop-only UI (e.g. table row actions), not primary mobile actions.

---

## 11. Do / Don't

**Do**
- Use the existing `text-*` typography classes and `bg-*`/`text-*`/`border-*` color utilities.
- Extend `STATUS_CONFIG` when a new status appears, instead of inlining a badge.
- Use `formatBDT`/`formatDate`/`formatPercent` for any number shown to a user.
- Reuse `Button`/`Card`/`Input`/`Container`/`Section`/`Divider`/`Media`/`NavLink`/`Reveal` rather than rebuilding them per page.

**Don't**
- Don't add a new color, font, or one-off spacing value without adding it as a token first.
- Don't make every section a bordered card — use whitespace and typography hierarchy first (section 3 of the brief).
- Don't rely on color alone for status/validation meaning.
- Don't build Home, Admin, Customer Portal, or Shareholder Portal pages under this task — that's explicitly out of scope here.

---

## 12. Technical foundation

- **Framework:** Next.js 16 (App Router) + TypeScript, Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js` needed).
- **Utilities:** `clsx` + `tailwind-merge` (`cn()` in `src/lib/utils.ts`), `class-variance-authority` for variant components, `lucide-react` for icons (one consistent stroke-based icon set, per section 18 of the brief).
- This was a greenfield choice: the project directory was empty at the start of this task (confirmed via `git status`/`ls` before any code was written), so no existing architecture had to be preserved or reconciled.
