# Production preparation

## Phase 1: Existing system and implementation plan

The repository already contains a public marketing site, a staff admin panel and an authenticated owner portal for customers, shareholders and landowners. The portal uses existing role-linked records and shared read queries. The current manifest launches the marketing homepage. The Client Page hub links to management tools, and the Clients page already tracks account activity. Neither implements device installation analytics or a staff inspection session.

| Phase | Reuse | Change and acceptance check |
| --- | --- | --- |
| 2. Client app | Portal shell, login, owner queries, document visibility and audit logging | Installable client manifest; browser-supported prompt and device-local snooze/opt-out; append-only device event history shown to authorized staff; inspect dashboard and documents as staff with server authorization and no client-state mutations. Check separate accounts, projects, device contexts and normal browser login. |
| 3. Finance | Money Page, project cost explorer, expense and account screens, sales payments and installment pages, allocation tools, Cash Flow, Categories, Contractor Payments and Owner Contributions reports | Audit each view against the source transactions. Separate budget remaining from cash balance, reconcile actual costs and finalized receipts, show due obligations and explain definitions. Add an independent saved calculator, with preview and explicit confirmation before posting through the existing transaction rules. |
| 4. Installments | Sales contract installments; construction goal schedules and owner contribution obligations | Extend the project contribution flow without changing sales contract debts. Resolve selected owners and flats against the project on the server. Compare against live budget, preview allocations, make confirmation idempotent and persist the plan atomically. Keep amounts exact and reconcile to the project's contribution business rules. |
| 5. Assistant | Simba, existing permission and project scope helpers, shared finance calculators | Add a finance panel driven by the active tab and explicit row selection. Load only authorized data server-side, show calculations and missing inputs, and hand off any proposed write to the normal confirmation flow. |
| 6. Production hardening | Signed sessions, role checks, project scope, private file route, rate limiting, backup and deployment guides | Review source for access boundaries, inputs, dependencies, secret handling and recovery. Fix issues and verify defensive behavior in an isolated environment. Record findings, fixes and deployment checks. |

The schema stores most entities as an ID and a JSON record in PostgreSQL. The local launch uses a separate SQLite schema. Keep schema changes in sync and use the existing repository boundary. For concurrent multi-record writes, a sequence of repository calls is insufficient: the installment flow currently creates its schedule and obligations in separate writes after a duplicate check.

Dashboard figures need a common definition across pages. The project cost calculator already combines purchases, expenses and contractor payments with status rules. The category report currently sums raw expenses, and the project payments tab sums recorded payments without checking status. The cash-flow report's sources also differ from the project cost calculator. These differences must be reconciled with the business meaning of each figure before using them in a new dashboard or assistant. Preserve the manually entered budget actual as a separately labeled reference.

Private document access needs an ownership check at the download endpoint in addition to the portal list. The generic document permission is granted to portal roles, while the owner query already has the required owner and unit visibility filters. A read-only inspection must keep the staff identity and reuse only explicitly authorized owner reads. The normal portal layout writes last-seen activity and must not be mounted in inspection mode.

Installation status is an observation, not a complete device inventory. Only a browser install event or observed standalone launch can confirm it. Safari may use a separate storage context for the installed app. Keep histories honest about unknown status and avoid fingerprinting to link storage contexts.

Baseline verification: source and route inventory reviewed. The locked npm dependencies were installed from an existing local cache after registry access failed.

## Phase 2: Client app implementation status

- The portal links to its own app manifest and icons. The app launch endpoint uses the current session and redirects each client role to its normal portal home.
- The install card offers the native browser prompt when available, or Safari Home Screen steps on supported Apple mobile browsers. Later and Close wait seven days. Don't show again persists in the browser profile. No portal pages or private documents are cached for offline use.
- Client page → App installations & inspection shows observed visits, browser installation signals, standalone launches and prompt choices. Unknown devices and profiles stay unknown. The same device may have several profiles, and the browser does not reliably report uninstallation.
- Portfolio-wide staff with the required permissions can inspect an owner dashboard summary and the same document list the owner sees. Viewing uses the staff identity and writes a staff audit event. Private document access checks owner and unit assignment, and legacy document URLs go through the same protected handler.
- Install history adds the `PortalInstallEvent` PostgreSQL migration and corresponding local SQLite schema model. Apply the schema update before running the portal against a test database, then regenerate the Prisma Client for that database. Production deployment requires its normal PostgreSQL migration workflow.

TypeScript and lint checks passed for the changed code. The manifest parsed, and the icon route rendered both expected PNG sizes. The earlier production build could not download the existing Google Fonts.

Follow-up on the running local server: added the missing SQLite event table and index. Verified the signed-out staff redirect, staff and owner test sign-ins, portal manifest, app launch redirect, and analytics display for two observed browser profiles. Opened the read-only client dashboard and its shared demo document. The inspection audit entries were recorded. Notification, document, payment, and installment rows were identical before and after inspection and opening the demo document. The demo document uses a sample asset and does not establish protected-file coverage.

An isolated browser test simulated the browser install event. Later set a seven-day cooldown and suppressed the card after reload. An expired cooldown allowed the card to return, and Don't show again suppressed it after reload. Both choices reached the local install history. A synthetic non-public document loaded through the protected upload route as its owner and as permitted staff. The test route, document and simulated install events were removed afterward.

Actual native installation and standalone launch still need verification on supported desktop and Android/iOS devices. The production PostgreSQL migration has not been applied. The user authorized moving on to Phase 3.

## Phase 3: Finance audit and implementation

| Area | Existing source and audit result | Phase 3 handling |
| --- | --- | --- |
| Money Page | The shortcuts were useful but there was no opening summary. | Kept the shortcuts and added project-scoped budget, costs, receipts, outstanding, supplier bills, due dates, recent activity and cost categories. |
| Project Costs and Reports | Actual costs use materials orders, expenses and contractor payments. Manually entered budget actuals are separate, and expense adjustments were missing from several summary totals. | Apply posted-status and cost-adjustment rules in the project cost summary, Money Page and company report. Keep existing manual figures. |
| Expenses and Categories | Expense details contain drafts, approvals and adjustments. Category totals previously included all statuses. | Keep drill-down rows and sum only recognized costs plus their adjustments. |
| Customer Payments and Installments | Payments are recorded receipts. Sale-linked schedules and project contribution schedules use different balance rules. | Show receipts and per-sale outstanding alongside construction contributions. Keep the two installment types distinct and use their existing payment rules. |
| Cost Allocations and Owner Contributions | Generated goals represent live obligations; draft and cancelled goals are not collectible. | Exclude draft and cancelled goals from outstanding. Keep the allocation and payment workflows. |
| Accounts, Cash Flow and Procurement | Accounts tag expenses and contractor payments, but there is no reconciled balance. A partially paid materials purchase has a status without an exact balance. | Explain those limits, display known unpaid supplier bills, flag partially paid purchases and retain the monthly comparison of recorded receipts and posted expenses. |
| Contractor Payments report | This records payments and their individual statuses. | Keep the detailed report; exclude non-posted records from recognized cost and cash-flow totals. |

The calculation workspace stores personal drafts with revision checks. A draft can use quantities or weighted splits, be reopened, edited or copied, and be reviewed in the existing expense form. Saving or previewing a draft creates no expense. A confirmed project expense uses the current saved amount and a stable reference to keep a second confirmation from posting it twice.

Added a dedicated calculation table and the PostgreSQL migration. Applied the matching table locally. Browser verified save, copy, reopening an edited ratio split, expense review without posting, explicit posting, updated project-filtered totals and duplicate prevention. Synthetic records were cleaned up. Production migration and deployment remain pending.

## Phase 4: Project installment allocation

- Open a project goal with generated contributions under **Budgets & cost splits → Installment Plan**. The custom form finds members by name or flat and combines multiple selected flats for the same owner into one obligation. Suggested amounts use the saved flat shares and unscheduled owner balance. Admins can edit or remove rows. A zero amount creates no charge.
- The live comparison uses remaining project budget (saved budget minus recognized costs). Over-budget collections have an explicit confirmation label. A member's installment amount is capped by their adjusted, unpaid and unscheduled contribution because collecting an installment does not create a new debt.
- The server builds the preview and rechecks the current budget, balances and schedule during confirmation. A transaction writes the installment, owner obligations, and audit entry together. Goal-scoped schedule IDs and duplicate name/date checks prevent repeated posting. Payment recording now validates the goal, member and installment link. Existing percentage/fixed schedules and sale installments remain available, and partially scheduled contributions retain their unscheduled balances on the Money Page.
- Uses the existing JSON-backed tables with optional fields for custom schedules and selected flats. No new migration. Local browser and SQLite verified a multi-flat owner counted once, a two-member preview before any write, the exact over-budget warning, and one saved schedule with two obligations and an audit entry. Test records were removed.

## Phase 5: Finance Assistant

- The existing Simba Guide opens in Finance mode on Money Page and the finance, receipt and installment screens, including with the backtick shortcut outside editable fields. There is no separate launcher. The mode matches the active page, project filter and selected row, with live database reads while open. Simba's ordinary guidance stays available.
- Explains recorded budget, costs, receipts, overdue entries, owner and sale installments, expense adjustments, reports and saved calculation drafts. What-if amounts compare against remaining budget and estimate a selected member’s share using the saved ratio. Unlinked installment balances and unreconciled bank balances are identified as unavailable.
- Finance and project permissions are enforced on every assistant request. The panel can open existing forms after review. It has no posting action and requires no migration.
- Local browser verified a project budget and over-budget calculation, a selected expense, a selected member's installment context and ratio estimate, review handoff, and closing the panel. Temporary test records were removed.
