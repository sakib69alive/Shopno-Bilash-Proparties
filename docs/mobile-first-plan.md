# Mobile-first redesign plan

Status: plan only, kichu build hoy nai (2026-11-02).
Plan Opus e lekha, build Sonnet e hobe. Ei file ta porei kaj shuru kora jabe.

## Goal

Website er most visitor mobile user. Site ta PC-first banano, tai phone e stacked desktop layout er moto cheap lage. Public site ta phone er jonno premium ar app-like banate hobe: rounded photo card, swipe rail, bottom tab bar. Reference chilo ekta real estate app screenshot.

Brand change lagbe na. Amader forest green ar ivory reference er color er prai same. Change hobe layout, chobi ar card style.

Desktop (`lg` ar upore) same thakbe.

## Ekhon ki obostha

375x812 e localhost theke measure kora:

| Page | Ekhon koto screen | Target |
|---|---|---|
| `/` | 10.6 | ~4 |
| `/landowners` | 13.6 | ~7 |
| `/about` | 12 | ~5 |
| `/services` | 10.3 | ~5 |
| `/contact` | 5.7, form shuru 1,611px niche | ~2 |
| `/gallery` | 5.5 | data onujayi |
| `/projects` | 5.2, data chara | data onujayi |
| `/construction` | 4 | data onujayi |
| `/properties` | 3.7, data chara | data onujayi |
| `/news` | 3.7 | data onujayi |
| `/saved` | 3.7 | data onujayi |
| `/founder` | 3.2 | data onujayi |

Ei measurement gular kono page e horizontal overflow paoa jay nai.

Measure kora hoy nai: project detail, unit detail, news article (data nai), legal pages, sitemap, login. Egula code pore plan kora, demo data boshanor por screen e check korte hobe. Oi page er plan alpo change hote pare.

Mul somossa:

- **Homepage e chobi nai.** Logo chara kono image nai.
- **Footer stack onek boro.** Closing band 272px + footer 1,327px + links 382px = 1,981px, protita page e 2.4 screen.
- **Page transition slow.** `SitePageLoader.tsx` e protita tap e prai 2.4 second lage (curtain 1100ms, loader 500ms, hold 180ms, fade 600ms).
- **Desktop scale phone e.** 160px section gap, 40px heading, full-width button.
- **Faka jayga.** Home er Track Record 873px jure shudhu "—" dekhay.
- **iOS zoom.** `PropertyFilters.tsx` er input 14px, tai iPhone e focus korle zoom hoy. 16px korte hobe.
- **Gallery swipe nai.** `Lightbox.tsx` e touch swipe er code nai.

## Kothay ar kivabe build hobe

### Branch

- Notun `mobile-first` git branch e kaj hobe. Merge porjonto main site same thakbe.
- Preview route banano hobe na, 20+ page er jonno practical na.
- Phone e same WiFi theke dev server er Network address e test hobe. Chaile Netlify branch deploy o use kora jabe, tobe seta real DB te chole, tai data na thakle empty state dekhabe.
- Commit ar push shudhu user bolle. User GitHub Desktop diye push kore.

### Demo data

- Demo photo ar data shudhu local `prisma/dev.db` te thakbe, live DB te kichu jabe na.
- `.claude/launch.json` e `dev-local` config ache, `prisma/schema.local.prisma` o ache. Shuru korar age check koro local DB kivabe chole.
- Unsplash `next.config.ts` e already allowed.
- Port 3000 e aro ekta dev server cholte pare, shuru korar age dekho.

### Code structure

- Notun shared components: `src/components/mobile/`.
- Page e `MobileOnly` (`lg:hidden`) ar `DesktopOnly` (`hidden lg:block`) wrapper. Current desktop sections DesktopOnly te as-is thakbe.
- Data ar content same source theke ashbe, kichu duplicate hobe na. Public page er data CMS layer theke (`projectContentRepository`, `unitContentRepository`, `getPropertyListingsAsync`).
- `display:none` tree e `priority` image dio na, oita hidden thakleo preload hoy.
- Tablet `lg` er niche, tai mobile design pabe. 768px e alada test koro, rail ar grid thik thake kina.

## Sonnet er jonno rules

- **Fake data na.** Fake rating, stat ba price thakbe na. Data na thakle section lukabe. Stats shudhu real value thakle dekhabe.
- **`position: sticky` na.** Ei environment e bug ache, `fixed` ar manual offset use koro.
- **Token i use koro.** Component e notun hex na. Dark mode e o check koro.
- **Link bhangbe na.** `#enquire`, `/landowners#investment`, `/contact?project=&unit=&type=` kaj korte hobe.
- **`lg` er upore design same thakbe.** Protita dhap e check koro.
- **Existing jinish reuse koro:** `SearchOverlay` ar `useSearch`, `SaveButton`, `Reveal`, `Media`, `Drawer`, `PropertyFilters` er filter logic, `EnquiryForm` er submit logic.
- **Reduced motion** global override already ache, alada kore lagbe na.
- Protita dhap shesh hole thamo, user phone e dekhbe. OK korle porer dhap.

## Design rules

- **Font:** shudhu hero ar lead line e Instrument Serif, baki sob existing Manrope ar Inter. `next/font` diye load, Bangla Noto Sans Bengali te fallback korbe.
- **Radius:** 3 ta size, card 20px, hero 28px, pill full. Mobile component e scoped thakbe, karon `DESIGN_SYSTEM.md` site-wide boro radius mana kore. Reason `DESIGN_SYSTEM.md` e likhe rakho.
- **Type:** section title 18 to 20px, body 14 to 16px, sob input 16px.
- **Motion:** card press e halka scale, `Reveal` diye entrance, tab pill slide. Parallax ba idle animation na.
- **Touch:** sob target 44px er upore, bottom bar e safe-area padding.
- **Low-end Android:** bottom bar e `backdrop-filter` na, solid background.

## Sob page e common shell

- **Home top bar:** logo mark, "Let's find your next home" line, WhatsApp ar Call round button.
- **Inner page top bar:** back button, title, share. `fixed`, solid background. Purono `Header` `lg` er niche lukabe.
- **Bottom tab bar:** Home, Projects, Properties, Saved, Menu. Active tab e green pill. `fixed` with `env(safe-area-inset-bottom)`. Content e same size er bottom padding.
- **Menu:** full-screen `MobileNav` er bodole bottom sheet. About, Services, Founder, Construction, Landowners & JV, Investment, Gallery, News, Enquire, ar `showPublicSignInLink` on thakle Sign In.
- **Detail page action bar:** project ar unit detail e tab bar er jaygay Call, WhatsApp, Enquire. WhatsApp message e project ar unit er naam prefilled.
- **Slim footer:** contact, social ar accordion links, prai 350px. Closing band phone e bad.
- **WhatsApp ar Call button:** `CompanySettings.phone` ar `whatsapp` theke. Set na thakle dekhabe na.

### Global fix

- `SitePageLoader`: phone e curtain bad, 200ms er halka fade. Desktop e same thakbe.
- Skeleton loading: `loading.tsx` e.
- `SmoothScroll`: touch device e Lenis off.
- `src/app/layout.tsx`: `viewport` export e `viewportFit: "cover"`.
- `CookieNotice`: bottom bar er upore uthbe.

### Shared components (`src/components/mobile/`)

`MobileOnly`, `DesktopOnly`, `TopBar`, `BottomTabBar`, `MenuSheet`, `ActionBar`, `MobileFooter`, `PageHeader`, `Rail` (scroll-snap, porer card er kichu ta dekha jabe), `ChipRail`, `SectionHeading` (with "View all"), `PropertyCardM`, `ProjectCardM`, `IconTile`, `StepRail`, `Accordion`, `PhotoPager`, `BottomSheet`, `Skeleton`, `EmptyCard`, `ContactActions`.

## Home page

Reference theke nibo: rounded hero card, search pill, swipe card rail, pill chips, bottom tab bar.

Reference theke nibo na:

- "Good morning" + avatar: public visitor er account nai.
- Bell icon: public notification nai.
- ★ 4.8 (62) rating: amader data te rating nai.
- "New" badge: real status dekhabo.
- Agents, Profile tab.

Order:

1. **Top bar**, upore jemon.
2. **Search pill:** `SearchOverlay` khulbe, filter icon `/properties` e nibe.
3. **Hero card:** photo te green fade, serif e "We shape land. We keep promises.", ivory pill button "Explore projects". Page er h1 eita.
4. **Chips:** All, Apartment, Commercial, Plot. Shudhu je type er real data ache. Reload chara featured rail filter korbe.
5. **Featured properties:** swipe rail ar "View all". Card e photo, status badge, `SaveButton`, naam, price, beds ar baths, location. Price na thakle "Price on request". Spec shudhu je field ache.
6. **Our developments:** boro photo card e project naam, location, status.
7. **What we do:** `capabilities` theke icon tile grid, 1,553px list er bodole.
8. **Landowner card:** dark green banner, `/landowners` e nibe.
9. **Trust:** serif e `trust.statement`, 3 ta choto pillar with icon.
10. **Stats:** shudhu real value thakle.
11. **Closing:** Enquire, Call, WhatsApp card ar slim footer.

Mobile home theke bad: `CompanyStatement`, `OurApproach`, `NextExploration`. Desktop e thakbe.

Project ar unit na thakle featured rail er jaygay "Coming soon" card.

## Baki page

### Properties (`/properties`)

Compact title, search pill, chips, count ("12 available"), filter bottom sheet, boro card list, active filter pill. 0/0/0 stats bad. `PropertyFilters` er input 16px.

### Projects (`/projects`)

Compact title, city ar status chips, boro photo card. 1,434px er approach section phone e bad.

### Project detail (`/projects/[slug]`)

Upore to niche:

1. Swipe photo pager with count ("1/12"), upore back, share, save round button. `min-h-[100svh]` hero bad.
2. Naam, location, status.
3. Fact chips: units, floors, completion year. Shudhu real field.
4. Choto overview with "Read more".
5. Available units rail.
6. Construction progress card, data thakle.
7. "Open in Maps" link, location text diye Google Maps search URL. Fake map na.
8. Gallery ar swipe lightbox.
9. Action bar.

### Unit detail (`/projects/[slug]/units/[unitSlug]`)

Same pattern, plus boro price ba "Price on request", icon spec grid, tap-to-zoom floor plan, related unit rail.

### Contact (`/contact`)

Upore to niche:

1. Serif headline.
2. WhatsApp ar Call boro button.
3. Type chips: existing `contactPaths`, query param thakle pre-select.
4. Form: name, phone, message.
5. Baki field "Add more details" collapse e.
6. Send button.

### Landowners (`/landowners`)

Landowner ar Investor toggle, benefit cards, step rail, FAQ accordion, form. `#investment` link Investor side khulbe.

### Services (`/services`)

Accordion service cards, process step rail, related project, CTA.

### About (`/about`)

Story timeline, vision line, swipe steps, values, team. Faka stats lukano. "Ways to work with" link tile hobe.

### Founder (`/founder`)

Portrait card, quote, story.

### Construction (`/construction`)

Progress card ar update feed.

### Gallery (`/gallery`)

2 column grid, category chips, `Lightbox` e touch swipe add.

### News (`/news`, `/news/[slug]`)

Boro lead card, list, 17px article text, share.

### Saved (`/saved`)

Same card list, empty state with Properties link.

### Legal, sitemap

`/privacy`, `/terms`, `/cookies`, `/disclaimer`, `/policy`, `/sitemap`: shudhu readable text ar spacing.

### Error, not-found, loading

Notun style ar skeleton.

### Scope er baire

- **Owner Portal:** already bottom tab bar ache, shudhu check. `PortalShell.tsx` e `sticky` ekhono ache.
- **Admin:** ei plan e nai.
- **Bangla version:** alada kaj, copy English i thakbe.

## Build er order

Protita dhap shesh hole user phone e dekhbe, OK korle porer ta.

1. **Foundation:** branch, demo data, shared components, top bar, bottom bar, menu, footer, global fix.
2. **Home.**
3. **Taka asha page:** Properties, Projects, dui detail page, Contact.
4. **Boro page gula:** Landowners, Services, About.
5. **Baki page:** Founder, Construction, Gallery, News, Saved.
6. **Shesh dhap:** legal, error, loading, login ar portal check.
7. **QA ar merge:** nicher checklist. User OK korle merge.

## QA checklist

- 320, 360, 390, 430px ar 768px e layout thik, horizontal scroll nai.
- Light ar dark mode.
- Reduced motion.
- Empty state: project, unit, stats, phone, WhatsApp kichu na thakleo page sundor.
- Lighthouse mobile, chobi `sizes` thik.
- `lg` er upore design ager moto.
- Link: `#enquire`, `#investment`, `/contact` query param.
- Rail swipe, bottom sheet, lightbox real touch e.
- `CookieNotice`, `SearchOverlay`, bottom bar er z-index.

## Amar default, user na chaile bodlabe

- **Curtain:** shudhu phone e bad, desktop e thakbe.
- **Enquiry form:** phone required, email optional. Ekhon ulta, form validation o bodlate hobe (`EnquiryForm.tsx` ar tar action).
- **Bottom bar:** sob public page e, detail page e action bar er sathe swap.

## User er kach theke lagbe

- **Real photo:** merge er age, shobcheye age hero ar project cover.
- **Admin settings:** phone ar WhatsApp number.
- **Project ar unit data:** live site e na thakle Projects, Properties ar detail page empty state dekhabe.
