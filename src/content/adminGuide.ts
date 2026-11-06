import type { Permission } from "@/config/permissions";

export interface GuideItem {
  label: string;
  href: string;
  permission?: Permission;
  summary: string;
  details: string[];
}

export interface GuideGroup {
  label: string;
  description: string;
  items: GuideItem[];
}

/**
 * The single source of truth for the in-app Admin Guide (`/admin/help`).
 * Deliberately a plain data file, not auto-generated from `ADMIN_NAV_GROUPS`
 * — the nav only has room for a label/icon/href, this needs real written
 * instructions per page, so it's maintained by hand alongside it. Keep the
 * `label`/`href`/`permission` values here in sync with `config/navigation.ts`
 * whenever a page is added, renamed, or moved.
 */
export const ADMIN_GUIDE: GuideGroup[] = [
  {
    label: "Overview",
    description: "Your starting point every time you sign in — a live, company-wide snapshot, never a fixed report.",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        summary: "The company-wide command center — every number here is computed live from real records (units, sales, payments, expenses…) every time you load the page, never a fixed report or a typed-in figure.",
        details: [
          "\"Urgent\" and \"Today\" at the top show your most time-sensitive Alerts and Reminders — click through to act on them immediately.",
          "Every KPI card is clickable — it takes you straight to the underlying list or report (e.g. click \"Outstanding\" to see exactly which owners owe money).",
          "Recent Activity shows the latest real actions across the whole system; Quick Actions gives one-click shortcuts to the most common tasks.",
          "A small red dot on a sidebar item (Projects, Sales, Settings, etc.) means that section is still empty or missing key info — it disappears the moment you add something there, so it's a running checklist of what's left to set up, not an alert about a problem.",

          "COMPANY OVERVIEW — Total Projects: every project you can see, with the subtext splitting it into Active (status Ongoing or Ready) and Completed. Total Units: every unit across those projects, split into Assigned (has an owner) and Available. Total Owners: the number of distinct people/entities (customers, shareholders, landowners combined) who currently own something — an owner counted once even if they hold several units. Parking: total parking spaces, with how many are currently Assigned (anything not left as \"Available\").",

          "FINANCIAL OVERVIEW — Expected Collections: the total amount owners are expected to pay in total across every cost-allocation goal set up for their projects (adjustments/waivers already included). Collected: how much of that has actually been paid. Outstanding: Expected minus Collected — every contribution not yet fully paid, whether or not it's overdue yet. Overdue Amount: the stricter subset of Outstanding that's specifically past its due date — this is why Overdue is always ≤ Outstanding, never more. Project Expenses / Material Cost / Contractor Cost: real money spent, summed only from Expenses/Purchases/Contractor Payments marked verified or completed (a pending or rejected one never inflates these). Budget vs Actual compares the total planned Budget against this same real Actual figure — not the hand-typed \"Actual (Manual)\" field you may see on an individual Project Finance budget line, which can drift from this real number if it's never updated to match.",

          "CONSTRUCTION — Active Projects: projects currently Ongoing (Ready/Upcoming/Completed don't count here). Overall Progress: the average of every project's own overall construction progress %. Delayed Stages: phases past their target date that aren't marked completed or cancelled. Upcoming Milestones: due within the next 30 days. Overdue Tasks: the same \"past target date, not done\" rule, applied to individual tasks instead of whole phases.",

          "SALES — Active Leads: every lead not yet closed Won or Lost (mirrors the Sales Dashboard). Active Bookings: Reserved/Booked/Confirmed bookings only. Completed Sales: finalized, non-cancelled transactions. Pending Sales: sales still Pending or Confirmed. Available Units: unsold units with Available status — this exact same number also appears under Company Overview, folded into Total Units' \"assigned · available\" subtext, so don't expect it to look like a separate new figure. Sales Value: total price of every non-cancelled sale.",

          "INVENTORY — Low Stock / Out of Stock: current stock compared against each material's own threshold (or the company-wide default in Settings → Regional & Defaults if that material has none set). Recent Purchases / Recent Usage: both scoped to just the last 7 days — a purchase/usage from 8+ days ago won't show here even though it's still in the full Procurement records.",

          "DOCUMENTS & ALERTS — Total Documents: every document on file, regardless of status. Expiring Soon / Expired: driven by each document's own expiry date. Critical/High/Medium/Low: the same underlying alerts feeding the \"Urgent\" banner at the very top of this page, just totalled by severity — Critical+High here should always match what \"Urgent\" is drawing from.",
        ],
      },
    ],
  },
  {
    label: "Development",
    description: "The physical structure of your business: Projects contain Buildings, Buildings contain Floors, Floors contain Units — plus Parking and Construction tracking.",
    items: [
      {
        label: "Projects",
        href: "/admin/projects",
        permission: "project.view",
        summary: "The top-level container for everything — a real estate development (e.g. \"Silver Oak Residency\").",
        details: [
          "Create a project first with its address, land info, and building/unit/parking counts before adding anything underneath it.",
          "Each project has its own workspace (tabs for Units, Owners, Parking, Construction, Payments, Materials, Reports, Settings) — everything you do inside a project stays scoped to it.",
          "Publish a project (toggle \"isPublished\") to make it visible on the public website; unpublished projects stay internal-only.",
          "BLUEPRINT TYPES (on the project's Edit page): most buildings repeat a few flat designs. Add each design once — a name, the flat code that repeats on every floor (for example A for 1A, 2A, 3A…) and the blueprint image — and every matching flat shows that blueprint automatically, in the owner's portal too. Change a type's image later and all its flats update at once; nothing is copied onto each flat.",
          "Blueprints can be an image (JPG, PNG, WEBP) or an SVG — either works. Upload only the layout drawing: no background, border or page colour. SVG files are cleaned on upload (anything that could run code is removed; the drawing itself is unchanged).",
        ],
      },
      {
        label: "Properties / Units",
        href: "/admin/properties",
        permission: "unit.view",
        summary: "Every individual flat/unit across every project — the actual sellable inventory.",
        details: [
          "A unit belongs to one Building and one Floor within a Project — set its size, bedrooms/bathrooms, pricing and status here.",
          "Unit status (Available, Reserved, Booked, Under Agreement, Sold, Transferred, On Hold, etc.) drives what you can do with it elsewhere — e.g. only \"Available\" units can be booked or sold.",
          "Each unit's own page has tabs for Ownership, Sales & Bookings, Parking, Documents and Financial history — the complete record for that one unit.",
          "BLUEPRINT of a flat (Design section of its Edit page): by default it uses its project's blueprint type, matched automatically by the flat code (3A → the type with code A). You can pick a different type from the list, or upload a CUSTOM blueprint for this one flat — a custom one always wins. Tick \\\"Remove the custom blueprint\\\" to go back to the type. The unit's page says which one is in use.",
          "Bulk Structure Generator (a project's Units tab): creates floors and flats in one go, numbered like 1A, 2A, 3A… — exactly the pattern blueprint types match on.",
        ],
      },
      {
        label: "Parking",
        href: "/admin/parking",
        permission: "parking.view",
        summary: "Parking spaces — a completely independent entity from units, not automatically tied to any flat.",
        details: [
          "A parking space can be unassigned, assigned to the same owner as a unit, or assigned to a totally different person — it never auto-follows unit ownership.",
          "Every space has a Type — Car, Bike, or Reserved/Visitor — shown as a column and filterable in the list, and with its own icon everywhere it's shown (this list, the Owner Portal, the public project page's availability summary).",
          "Bulk-generate parking spaces for a project instead of adding them one by one — set a Type there too if the whole batch is one kind (run the generator twice, with different prefixes, for a mixed car+bike batch).",
        ],
      },
      {
        label: "Construction",
        href: "/admin/construction",
        permission: "construction.view",
        summary: "Construction stages (phases) for every project — from land & design through handover.",
        details: [
          "Each phase has a status, planned/actual dates, progress %, an assigned contractor, and estimated vs. actual cost — the Actual Cost is always the real sum of purchases, expenses and contractor payments tagged to that phase, never a typed-in guess.",
          "Add Tasks under a phase for day-to-day work items, and Milestones for major checkpoints (e.g. \"Foundation Complete\").",
          "Use \"Delayed only\" filter to instantly see which stages are behind schedule.",
        ],
      },
      {
        label: "Contractors",
        href: "/admin/construction/contractors",
        permission: "construction.view",
        summary: "The contractors/crews doing the actual construction work, and their payment history.",
        details: [
          "A contractor can be assigned to multiple phases across multiple projects — assignment history is preserved even after reassignment.",
          "Record a payment to a contractor from their page or from the phase they're working on; every payment is traceable back to its phase and project.",
        ],
      },
    ],
  },
  {
    label: "Sales",
    description: "The customer-facing side of the business — from a first enquiry all the way to a completed sale and ownership.",
    items: [
      {
        label: "Dashboard",
        href: "/admin/sales/dashboard",
        permission: "sales.view",
        summary: "A sales-team-focused view: pipeline, follow-ups, bookings and conversion — separate from the main company dashboard.",
        details: [
          "Today's/Overdue/Upcoming Follow-ups: leads with a scheduled next-contact date, split by whether that date is today, already passed, or within the next 7 days — a lead marked Won or Lost never appears here.",
          "Active Leads: every lead not yet closed as Won or Lost. Site Visits: leads currently at the \"Site Visit\" pipeline stage specifically.",
          "Active Bookings: bookings in the Reserved/Booked/Confirmed state — a Cancelled or Converted booking doesn't count. Available/Sold Units count real Unit records by their current status.",
          "Pending Sales: sales still Pending or Confirmed (not yet Completed or Cancelled). Total Sales Value sums every sale's price except cancelled ones.",
          "Conversion Rate = Won leads ÷ (Won + Lost leads), as a percentage — a lead still open in the pipeline doesn't affect this number either way; it shows \"—\" until at least one lead has actually closed.",
        ],
      },
      {
        label: "Customers",
        href: "/admin/customers",
        permission: "customer.view",
        summary: "Buyer/prospect records — not automatically the same as \"Owner\" until they actually own a unit.",
        details: [
          "A customer can have Leads, Bookings, Sales, Units and Payments linked to them — their own page ties all of it together.",
          "Status (Active/Inactive/Archived) is for your own record-keeping, not a login account — see Users for portal access.",
          "Client login link: every row has a link button (and a WhatsApp button), and the customer's own page has a \"Client link\" box. Press Copy link and send it to the client on WhatsApp — when they tap it their portal opens with no phone number or PIN, and that phone stays signed in for a year. Each client's link is different. The same works for Shareholders and Landowners.",
          "\"Make a new link\" cancels the old one and signs out every phone that used it (use it if the link went to the wrong person or a phone was lost). \"Turn link off\" just cancels it. Opening a link yourself in your normal browser signs you out of Admin there, so test it in a private window.",
          "The link only contains a path, never the domain: when you buy your own domain, open Admin on the new domain and copy the links from there. Keep the AUTH_SECRET setting unchanged on the host, because every link and signed-in phone depends on it.",
        ],
      },
      {
        label: "Bookings",
        href: "/admin/sales/bookings",
        permission: "sales.view",
        summary: "A temporary reservation on a unit before a sale is finalized — booking a unit sets it to \"Reserved\", it cannot be double-booked.",
        details: [
          "Convert a booking straight into a Sale with one click — the price and customer carry over automatically.",
          "Cancelling a booking always requires a reason and keeps the booking record as history — it never disappears, it just releases the unit back to Available.",
        ],
      },
      {
        label: "Sales",
        href: "/admin/sales",
        permission: "sales.view",
        summary: "Confirmed transactions — a unit sold to a customer, with a full price breakdown.",
        details: [
          "Base price, floor premium, parking price, additional charges and discount are all recorded separately — the final sale price is calculated from them, never typed in directly.",
          "Recording a sale marks the unit \"Sold\" and creates the ownership record — this is the moment a Customer effectively becomes an Owner of that unit.",
          "A sale's own page shows: PAYMENTS RECEIVED (sale price, received, remaining, % paid and every payment with date, purpose, method, reference and receipt no.), INSTALLMENTS (each with its status as of today), and two controls — Change the price and On the owner's portal.",
          "CHANGE THE PRICE: if the agreed price goes up or down after the sale (a discount, extra parking…), add a change with an amount and a reason. The original agreed price is never altered; each change is kept as a dated line (and can be removed), and the customer's remaining balance follows the new price. The owner sees the changes listed on their portal.",
          "ON THE OWNER'S PORTAL: the Hide from owner / Show to owner button switches that flat's price, payments and balance on or off for the owner, instantly and as often as you like. While hidden, the owner sees only a note to contact the office and no figures are sent to their page. It is ON by default.",
        ],
      },
      {
        label: "Payments",
        href: "/admin/sales/payments",
        permission: "finance.view",
        summary: "Payments received from customers against their sale/contract.",
        details: [
          "Record the amount, method (cash/bank/mobile banking/card), and link it to a customer and project for accurate reporting.",
          "Choose WHICH FLAT the payment is for (the field appears once a customer is chosen). That is what lets the sale page and the owner's portal show Paid / Remaining per flat. The easiest way: open the sale and press Record payment — customer and flat are filled in for you.",
          "After you save a payment you land on its page, where Create receipt opens Statements & Notices with that payment's receipt ready: the amount received now, the total paid so far, the estimated remaining and the list of payments up to that receipt.",
        ],
      },
      {
        label: "Installments",
        href: "/admin/sales/installments",
        permission: "sales.view",
        summary: "Payment plan schedules — due dates and amounts a customer is expected to pay over time.",
        details: [
          "Status (pending/due-soon/paid/overdue) helps you see at a glance who needs a follow-up call.",
          "Each installment belongs to a flat sale — choose it in \\\"Which flat sale is this installment for?\\\" (or press Add installment on the sale's own page). The owner then sees every installment on their portal with its live status: Paid, Overdue (past its due date), Due soon (within 7 days) or Upcoming. The status follows the calendar by itself; you only mark an installment Paid when it is paid.",
        ],
      },
    ],
  },
  {
    label: "Finance",
    description: "Every taka in and out of the company — expenses, budgets, collections and the material supply chain that feeds them.",
    items: [
      {
        label: "Budgets & cost splits",
        href: "/admin/finance/cost-allocations",
        permission: "finance.view",
        summary: "Use this when the company needs to collect money from the owners of a project — piling, foundation, lift, anything shared. You say how much is needed and who pays; the system works out each person's share, sends it to their app with the last date, and keeps track of who has paid.",
        details: [
          "WHEN TO USE IT — Whenever one cost has to be shared between the owners of a project (customers, shareholders and landowners who hold flats). It is NOT for money a customer pays for buying their flat — that is \"Payments received\" under Sales. Think of it this way: Payments received = the price of the flat. Budgets & cost splits = extra shared construction costs billed to owners.",

          "THE WHOLE JOB IN 5 STEPS — (1) Sidebar → \"New budget split\" and answer 4 questions. (2) On the next screen choose which flats pay and how much each pays — you see the result live. (3) Press \"Save & send to clients\": every owner gets their amount and last date in their app. (4) As money arrives, press \"Record Payment\" on that owner's card. (5) When 100% is collected, press \"Mark Completed\"; press \"Archive\" to hide an old budget from the active list.",

          "BEFORE YOU START — The flats must already have owners. Go to the project → Distribute tab and hand the flats to owners (customers who bought are already there). A flat with no owner is skipped: the company is treated as paying for its own unsold flats. If a flat's size is wrong, you can fix it on the screen in step 2 (see the pencil below).",

          "STEP 1: THE NEW BUDGET FORM — \"Which project?\" (the project whose owners will pay). \"What is this payment for?\" (the name owners will see, e.g. Piling — Phase 1). \"Total money to collect (৳)\" (the whole amount that must be collected from all owners together). \"Last date to pay\" (shown to owners as the deadline; after this date unpaid amounts are Overdue). Press \"Next: choose who pays\". Nothing is sent yet — the budget is saved as a Draft.",

          "STEP 1: \"MORE OPTIONS\" (you can ignore these) — Category (defaults to the name). Date of this budget (defaults to today). Late fine: either a flat taka amount or a percent of what is still unpaid, charged only after the last date (0 = no fine). \"How is it divided?\": \"Pick flats — you choose who pays and how\" (recommended, described below), \"Everyone by area, automatically\", \"Predefined unit ratio\", \"Tiered groups\". \"Also bill parking\": adds a parking amount box on the next screen.",

          "STEP 2: THE DRAFT PAGE — At the top a blue line repeats what you are collecting, for what, in which project and by when, and says nothing is sent until you press Save. Below it is the planner. Left side = your choices. Right side = the live result.",

          "STEP 2 · \"1 — Which flats pay?\" — Every owned flat is a card showing the flat number, owner's name, size (sqft) and what it will pay. Dark green = pays. White = left out. Tap a card to include/leave it out. Buttons above: \"All flats\", \"None\", and \"Every A flat\", \"Every B flat\"… (picks that position on every floor). Tap a floor's heading (\"FLOOR 3 · tap to select all\") to switch the whole floor on or off. Use this to bill only some floors or flats — for example only the flats that are above a certain floor.",

          "STEP 2 · \"2 — Should everyone pay the same?\" — \"Yes — same for every flat\": the amount is divided equally by the number of flats, whatever the size. \"No — bigger flat pays more\": the amount is divided by sqft, so a 4,000 sqft flat pays four times a 1,000 sqft flat. If you choose \"same for every flat\" and the sizes are very different, a yellow warning tells you that small flats then pay much more per sqft.",

          "STEP 2 · THE PENCIL ON EACH FLAT — Press the small pencil to open that flat's box right under its floor. (a) \"Size (sqft)\": type the real size. It changes the sums immediately and is SAVED ON THE FLAT as soon as you click out of the box, so every future budget uses the corrected size too (\"Back to …\" restores the old size). (b) \"How much should this flat pay?\": \"More by %\" (e.g. 10 = pays 10% more than its normal share), \"More by ৳\" (pays that many taka more), \"Exactly ৳\" (pays exactly this amount), \"Exactly % of total\" (pays that percent of the whole budget). Type a minus number for LESS. Press \"Set\". The other flats automatically cover the difference so the total stays correct. \"Back to automatic\" removes your change. Changed flats show a yellow pencil and a yellow chip appears under \"3\".",

          "STEP 2 · PARKING (optional) — Shown when parking spaces exist. Type one amount in \"Same amount for every parking space\" or fill each space. Parking is billed ON TOP of the flat share, only to the owner who holds that space, and is added to that owner's single bill. Leave empty to bill no parking.",

          "STEP 2 · THE LIVE RESULT (right side) — \"What happens now\": one sentence, e.g. ৳40,00,000 is divided between 40 flats; on average each flat pays about ৳1,00,000. \"Each flat pays\": every flat with its amount and a bar (green = automatic, yellow = you changed it); click a row to open its pencil box. \"Each owner pays\": the total per owner (an owner with two flats pays for both) with the flats and sqft behind it. Green message \"Correct — adds up to the total\" = ready. A red message means something must be fixed, for example \"fixed amounts add up to more than the total\" or \"nobody is left to cover the difference\" — change a flat to \"Back to automatic\".",

          "STEP 2 · ROUNDING — Every amount is a whole taka. If dividing leaves 1–2 taka over, they are added to the largest flat that you did not set by hand, so the total is always exactly what you typed.",

          "STEP 3 · \"SAVE & SEND TO CLIENTS\" — This is the only button that makes it real, and it can be done ONCE per budget. It: (1) creates one bill per owner (an owner with several flats gets one combined bill, with the flat-by-flat split kept inside); owners who would pay ৳0 get no bill; (2) sends each owner who has an app account a notification — \"New payment due … you need to pay ৳X by <date> (N days from now)\" — and the amount also appears in their Payments page; (3) shows a green banner: how many were sent and how many owners \"have no app access yet\". For those, open Customers and copy that person's link (the link icon) and send it on WhatsApp. If any flat size was changed, the new size is saved. Check the live result carefully first: there is no \"undo\"; mistakes after saving are corrected with Adjustments (below).",

          "THE OTHER WAYS TO DIVIDE — \"Everyone by area, automatically\": each owner pays in proportion to the total sqft of their flats; you see a preview table and press \"Confirm & Generate\". \"Predefined unit ratio\": each flat's own allocation ratio decides the share (flats without one fall back to area). \"Tiered groups\": every flat starts from an equal share; you make named groups (tiers) and push a group up or down by a percent or taka amount; the other flats absorb the difference; if every flat is inside an adjusted tier and the changes do not add back to the total you get an error. These three have no flat-picking screen. For most jobs use \"Pick flats\".",

          "AFTER YOU SAVE — Collection Dashboard: Target (what you typed), Allocated (what owners were billed, after any adjustments), Collected (money actually received), Outstanding (Allocated minus Collected — includes not-yet-due), Collection % (Collected ÷ Allocated), and counts of Fully Paid, Partial and Unpaid owners. All of these are recalculated from the real payments every time you open the page — never typed in.",

          "INSTALLMENT PLAN (optional, after saving) — If owners may pay in parts, press the plan form: add rows, each with a Label (e.g. First half), a Mode (percent or fixed amount) and a Due date. If you use percentages they must add up to exactly 100. The plan is applied to every owner (their share is cut into the same parts). Only ONE plan per budget; it cannot be deleted once any payment has been recorded against it. When a plan exists, Record Payment asks which installment the money is for.",

          "OWNER CARDS: WHAT EVERY BUTTON DOES — Search box: find an owner or flat. Status filter: All / Paid / Partially Paid / Pending / Overdue (use it for \"who has not paid\"). Each card shows: Units, Sqft and share %, Payable, Paid, Outstanding, Fine (only if overdue), Total Due, Due Date, the unit breakdown, and any adjustments. \"Record Payment\": fields are Installment (only if a plan exists), Amount (cannot be more than what is outstanding), Date, Method (Cash, Bank Transfer, Cheque, Mobile Banking, Card), Reference (e.g. cheque number), Receipt Number. Saving it lowers Outstanding and the owner sees it in their app. \"Add Adjustment\": Type — Discount, Waiver, Additional Charge, Correction or Refund; Amount (type a positive number; discount, waiver and refund automatically REDUCE what the owner owes, the others add); Reason (required). The original bill is never changed — the adjustment is added next to it, so there is always a record.",

          "STATUS WORDS — Pending: nothing paid, not yet late. Partially Paid: some paid, not yet late. Paid: nothing outstanding. Overdue: something is outstanding and the last date has passed. FINE: only when Overdue. Fine = the flat taka amount you set, or the percent of what is still outstanding. \"Total Due\" = Outstanding + Fine. The fine is shown on the card but is not added into the dashboard's Outstanding or Collected figures. All of this is worked out live from today's date — nothing needs updating.",

          "THE BADGE AT THE TOP — Draft (not saved yet), Upcoming (budget date in the future), Active (nothing collected yet), Partially funded, Fully funded (100% collected), Completed, Archived, Cancelled. \"Mark Completed\" appears only at 100% — closing the books is your decision, it never happens by itself. \"Archive\" hides the budget from the active list at any time.",

          "OVERDUE NOTICES — Sidebar → Reports → Owner contributions → \"Send Overdue Notices\" (shown only if something is overdue and you may manage notifications). It sends each owner with an overdue bill a notification with the amount, the original date and the fine. Pressing it again never double-sends: a bill that already got an overdue notice is skipped.",

          "GOOD HABITS — Give flats their owners first (Distribute tab). Check flat sizes once. Choose the sharing rule in step 2 before using pencils. Use pencils only for real exceptions. Press Save only when the green \"Correct\" message shows. Send the app link to owners who have none, otherwise they never see the amount.",
        ],
      },
      {
        label: "Project Finance",
        href: "/admin/finance/project-costs",
        permission: "finance.view",
        summary: "Your PLAN for spending on a project: budget lines (for the whole project or for one construction stage) that you compare against what was really spent. It is about the company's own costs — not about money collected from owners (that is Budgets & cost splits).",
        details: [
          "THE IDEA — A budget line says: \"For Materials in Meridian Residences we plan to spend ৳50,00,000.\" You can make one line per category, and optionally tie a line to one construction stage. The page then shows how much of each line has been used and warns you before it is overspent.",

          "THE LIST — Columns: Category, Project, Budgeted (what you planned), Actual (Manual) (a number YOU type — see the warning below), Variance, Status, Date. Search by category and filter by project above the table. Variance = Actual − Budgeted: a positive number means overspent, a negative number means money still unused. The pencil edits a line; the bin deletes it (it asks first).",

          "NEW BUDGET LINE — Fields: Project (required). Construction Stage (optional — leave empty for a whole-project line). Category (e.g. Materials, Labor, Permits). Budgeted (BDT) — the planned amount, must be above 0. Actual — Manual Entry (BDT). Date. Reference (optional, e.g. approval memo number). Warning Threshold % and Over Threshold % (optional): see Status below.",

          "STATUS: UNDER / ON / OVER BUDGET — Used % = Actual ÷ Budgeted × 100. Under Budget: used % is below the Warning Threshold (default 80). On Budget (a caution): used % is at or above the Warning Threshold but below the Over Threshold. Over Budget: used % is at or above the Over Threshold (default 100). So \"On Budget\" here means \"you are close to the limit\", not \"all fine\". Change the two thresholds on a line if you want an earlier or later warning.",

          "IMPORTANT: \"ACTUAL (MANUAL)\" IS NOT AUTOMATIC — The Actual figure on a budget line is typed by you and does not update by itself, so Status on this page is only as good as that number. The real, live figure is calculated elsewhere: it is the sum of (a) material Purchases that are not cancelled, (b) Expenses whose status is blank, Verified or Completed, and (c) Contractor Payments with the same status rule. You find it on the project's Reports tab and in the dashboard's \"Budget vs Actual\". If you want a budget line to agree with reality, copy that live number into Actual (Manual).",

          "A NOTE ON ADJUSTMENTS — A refund or discount added to an expense (see Expenses) is shown on that expense's own page as \"Net\", but the live Actual cost above still uses the expense's ORIGINAL amount. Keep that in mind when comparing numbers.",
        ],
      },
      {
        label: "Expenses",
        href: "/admin/finance/expenses",
        permission: "finance.view",
        summary: "Every general cost of a project that is not a material purchase and not a contractor payment: labour, utilities, permits, transport, site work, office, legal fees and so on. Each expense is one record: what, how much, when, for which project.",
        details: [
          "THE LIST — Search by description or category; filter by project. Columns: Description (click to open), Project, Category, Amount, Date. Pencil = edit. Bin = delete (asks first; a deleted expense is gone, but the Audit Log remembers that it was deleted). \"New Expense\" adds one.",

          "THE FORM, FIELD BY FIELD — Project (required). Construction Phase (optional; pick the stage this cost belongs to, so that stage's cost is correct). Building (optional). Description (required, at least 3 letters — what was bought or paid for). Category (required; suggestions: Construction, Labour, Contractor, Material, Equipment, Machinery, Transport, Site Work, Utilities, Office, Staff, Travel, Professional, Legal/Government, Miscellaneous — you may type your own). Subcategory (optional, e.g. Cement, Rebar). Amount (BDT, above 0). Date. Payment Method (optional: Cash, Bank Transfer, Cheque, bKash, Nagad, Rocket, Card, Other). Account (optional — which cash box/bank/mobile account the money came from; set these up under Accounts). Vendor (optional — who was paid). Contractor (optional — only a tag to remember which contractor's crew this was for; it does NOT make this a contractor payment). Status (optional, see below). Reference (optional, e.g. invoice number).",

          "STATUS DECIDES WHETHER IT COUNTS — Draft, Pending, Submitted, Verified, Completed, Cancelled, Rejected. Only an expense with NO status, or Verified, or Completed counts toward the project's real cost, the dashboard and the reports. Draft, Pending, Submitted, Rejected and Cancelled are ignored in those totals, so an unconfirmed or declined cost never makes the project look more expensive than it is. Expenses waiting as Pending or Submitted also appear in the Approvals page, where a manager can mark them Verified or Rejected.",

          "THE EXPENSE PAGE — Shows the project, amount, category, date, payment method, status, vendor, contractor, account and reference. Buttons: \"Edit\" and \"Delete\". Section \"Adjustments / Refunds\": use it when a supplier gives money back or you must correct a cost WITHOUT changing the original record. Type — Discount, Waiver, Additional Charge, Correction, Refund, Reversal or Transfer Adjustment. Amount — type a positive number; Discount, Waiver, Refund and Reversal automatically reduce the cost, the others add. Reason (required). Once an adjustment exists, the page shows \"Net (after adjustments)\".",

          "WHICH SCREEN FOR WHICH MONEY — Expense: general costs (this page). Purchases: buying materials (Materials group; also counts as material cost). Contractor payments: paying a contractor (Construction → Contractors). Payments received: a customer paying for a flat (Sales). Budgets & cost splits: collecting a shared cost from owners. Putting a cost on the wrong screen is the most common mistake — a contractor payment entered as an expense will not show in the contractor's totals.",
        ],
      },
      {
        label: "Accounts",
        href: "/admin/finance/accounts",
        permission: "finance.view",
        summary: "A simple list of the places your money moves through — a cash box, a bank account, a bKash number — so that each expense can say which one it came from. It is a record you keep, not a connection to any real bank.",
        details: [
          "WHAT IT IS FOR — Create each account once (for example \"Site Cash Box\", \"BRAC Bank — Main\", \"Company bKash\"). After that it appears in the Account dropdown when you record an expense or a contractor payment. This lets you later see which account was used for which cost.",

          "ADD ACCOUNT — Press \"Add Account\" and fill: Name (required, e.g. Site Cash Box), Type (Cash, Bank or Mobile Banking), Account Number (optional), Bank Name (optional), Notes (optional). Press \"Add Account\" again to save; \"Cancel\" closes the form.",

          "THE TABLE — Name, Type, Account No., Bank, Status. The Status chip is a button: click it to switch an account between Active and Inactive. Use Inactive for an account you no longer use. The bin deletes an account, but only if nothing was ever recorded against it; otherwise you get a message to retire it (make it Inactive) instead, so old records never lose their account.",

          "WHAT IT DOES NOT DO — It does not connect to a bank or bKash, it does not show a balance, and the details of an existing account cannot be edited from this screen. If you typed a name wrongly, add the correct account and make the wrong one Inactive. Only people allowed to manage finance can add, change or delete accounts.",
        ],
      },
      {
        label: "Vendors",
        href: "/admin/procurement",
        permission: "procurement.view",
        summary: "Material suppliers — where you buy construction materials from.",
        details: ["Each vendor's page shows their full purchase history for quick reference when negotiating or reordering."],
      },
      {
        label: "Purchases",
        href: "/admin/procurement/purchases",
        permission: "procurement.view",
        summary: "Material purchase orders — what was ordered, from whom, at what price.",
        details: [
          "A purchase's receiving status (Ordered/Partially Received/Fully Received) is tracked separately from payment — record what actually arrives on the Stock page.",
        ],
      },
      {
        label: "Materials",
        href: "/admin/procurement/materials",
        permission: "procurement.view",
        summary: "The material catalog (cement, rebar, tiles, etc.) — categories, units of measure, and reference pricing.",
        details: ["Set a low-stock threshold per material per project so Alerts can warn you before you run out."],
      },
      {
        label: "Stock",
        href: "/admin/procurement/stock",
        permission: "procurement.view",
        summary: "The real-time inventory ledger: opening stock + received − used − wastage +/− adjustments = current stock.",
        details: [
          "Every stock change is a traceable movement record, never a silent edit to a running total — use the Ledger view to see the full before/after history for any material.",
        ],
      },
    ],
  },
  {
    label: "Partners",
    description: "The two other kinds of unit owner besides a regular Customer — investors and the landowners who contributed the original land.",
    items: [
      {
        label: "Shareholders",
        href: "/admin/shareholders",
        permission: "shareholder.view",
        summary: "Investors who hold a shareholding and may be allocated units directly rather than buying them.",
        details: ["A shareholder's own page shows their holdings, allocated units, and construction-contribution obligations, same as a Customer's."],
      },
      {
        label: "Landowners",
        href: "/admin/landowners",
        permission: "landowner.view",
        summary: "The original land owners in a joint-venture project, with a formal Agreement defining their unit allocation.",
        details: [
          "An Agreement records the landowner's share of the project; Allocations then assign specific units to them under that agreement.",
        ],
      },
    ],
  },
  {
    label: "Operations",
    description: "The day-to-day admin workflow — staff, leads, documents, and the systems that keep everyone informed and accountable.",
    items: [
      {
        label: "Employees",
        href: "/admin/users",
        permission: "users.view",
        summary: "Staff and portal accounts with access to this system (same page as Users under System — one account list, not two).",
        details: ["See \"Users\" below for the full picture, including roles and project-level access."],
      },
      {
        label: "Leads / Enquiries",
        href: "/admin/leads",
        permission: "lead.view",
        summary: "Potential customers, from first contact through the sales pipeline (New → Contacted → Qualified → Site Visit → Negotiation → Booking → Won/Lost).",
        details: [
          "Set Source (Website, Referral, Walk-in, etc.), Priority, and a Next Follow-up date — overdue/today follow-ups surface automatically on the Sales Dashboard and the Alerts page.",
        ],
      },
      {
        label: "Documents",
        href: "/admin/documents",
        permission: "documents.view",
        summary: "File storage attached to any record — a project, unit, owner, vendor, or transaction.",
        details: [
          "Set an expiry date on documents that need renewal (agreements, licenses) so Alerts can warn you before they lapse.",
          "SENDING A FILE TO A CLIENT: add a document, choose Owner Type = Customer (or Shareholder / Landowner), pick the person by NAME, keep Visibility on \\\"Show to the client in their portal\\\" and upload the PDF or image (PDF, JPG, PNG, WEBP, DOC, DOCX, up to 15MB). It appears under Documents in that person's portal straight away. \\\"Staff only\\\" and \\\"Restricted\\\" keep a file out of the portal.",
        ],
      },
      {
        label: "Notifications",
        href: "/admin/notifications",
        permission: "notifications.view",
        summary: "Direct, per-user notification records — create one manually to alert a specific staff member about something.",
        details: [
          "Set a category and priority so the recipient can tell at a glance how urgent it is; mark as read or archive once handled.",
          "This is different from Alerts (below), which are computed automatically from real data, not created by hand.",
        ],
      },
      {
        label: "Activity Feed",
        href: "/admin/activity",
        permission: "reports.view",
        summary: "A friendly, readable timeline of who did what, when, and on which project — the human-readable version of the Audit Log.",
        details: ["Good for a quick \"what happened today\" check without needing the Audit Log's full filtering power."],
      },
      {
        label: "Alerts",
        href: "/admin/alerts",
        permission: "alerts.view",
        summary: "Live issues automatically detected from real data — overdue installments, delayed construction, low stock, expiring documents, stale leads, and more.",
        details: [
          "Nothing here is stored or can go stale — every alert is recomputed the moment you open the page, and disappears on its own once the underlying issue is resolved.",
          "Priority (Critical/High/Medium/Low) tells you what actually needs attention first — not everything is treated as an emergency.",
        ],
      },
      {
        label: "Reminders",
        href: "/admin/reminders",
        permission: "reminders.view",
        summary: "Custom, admin-created reminders for anything the system can't detect automatically — a call to make, a deadline to remember.",
        details: [
          "Optionally tie a reminder to a project and assign it to a specific staff member; mark it Complete or Dismiss it once it's no longer needed.",
        ],
      },
      {
        label: "Approvals",
        href: "/admin/approvals",
        permission: "approvals.view",
        summary: "One queue for everything currently waiting on a yes/no decision — ownership transfers, expense verification, and contractor payment verification.",
        details: ["Approve or reject directly from the list — approving an ownership transfer actually executes it; rejecting an expense/payment marks it rejected without deleting it."],
      },
    ],
  },
  {
    label: "Website",
    description: "What the public marketing website (shopnobilash.com) actually shows to visitors — kept separate from your internal admin data.",
    items: [
      {
        label: "Projects",
        href: "/admin/content/projects",
        permission: "content.view",
        summary: "The public-facing description, photos and highlights for each project — separate from the internal Project record under Development.",
        details: [
          "Add or edit a project here: cover photo, a gallery (also use it for photos of the ongoing building), and three blueprints — Garage, Floor and Roof — each as an image or SVG. On the phone they show as a swipeable set in that order.",
          "LOCATION MAP — the \"Google Maps link\" box puts a real, live map in the project page's Location section, plus an \"Open in Google Maps\" button for directions. In Google Maps open the project's exact spot → Share → \"Embed a map\" → Copy HTML, and paste it into the box (you can also paste a normal Google Maps link, a maps.app.goo.gl share link, or coordinates like 23.7925, 90.4078). Links that cannot be shown inside the page (the short share links) still give the Open button. Leave the box empty and the plain placeholder stays. Nothing here costs money or needs an API key.",
          "The number of available flats is counted from the real unit records of the project (add the flats under Website → Properties, or in bulk). The \\\"Available Units (fallback)\\\" number is used only until the first unit is added. Parking counts are still typed by hand.",
        ],
      },
      {
        label: "Properties",
        href: "/admin/content/properties",
        permission: "content.view",
        summary: "Public-facing property listings shown on the marketing site's Properties page.",
        details: [
          "Each flat has a cover photo, a photo gallery and a floor-plan blueprint (image or SVG, layout drawing only — no background).",
          "Add many flats at once with Bulk add: pick the project, then type the floors and the flats per floor (for example floors 1–8, flats A–D). Every flat is created and can be edited later. The table lets you filter by project, change a flat's status in place and delete several selected flats together.",
        ],
      },
      {
        label: "News",
        href: "/admin/content/news",
        permission: "content.view",
        summary: "News & Updates articles published on the public website.",
        details: [
          "Create a new article with a cover photo and extra photos, a category, a related project and a Featured switch (a featured article is the lead story on the News page).",
          "News is the first item of the Website group in the sidebar, so it is quick to add an update right after something happens.",
        ],
      },
      {
        label: "Gallery",
        href: "/admin/content/gallery",
        permission: "content.view",
        summary: "Photos shown on the public Gallery page — upload, categorize, and optionally link each image to a project.",
        details: [
          "Use the search and category filter to find an image quickly once the gallery has many entries.",
          "Bulk add: choose many photos at once, pick a category (and a project if they belong to one) and add them in one go — useful for progress photos of a building.",
        ],
      },
      {
        label: "Pages",
        href: "/admin/content/pages",
        permission: "content.view",
        summary: "The four static legal pages (Privacy Policy, Terms & Conditions, Property Disclaimer, Cookie Policy).",
        details: ["This is a fixed set of pages — you edit their content here, you can't add or delete a legal page."],
      },
      {
        label: "Founder Profile",
        href: "/admin/content/founder",
        permission: "content.view",
        summary: "The owner/founder photo and bio shown on the public Founder page — a single profile, not a list.",
        details: [
          "Name, title, hero intro and bio are required; Founder Statement, Vision/Mission/Philosophy, Leadership Principles, Highlights and a photo Gallery are all optional and only appear on the public page when filled in.",
          "There's one record for the whole site (like Settings) — Edit updates it in place rather than creating a new one.",
        ],
      },
      {
        label: "Team & Partners",
        href: "/admin/content/team",
        permission: "content.view",
        summary: "Partners and leadership shown in a grid alongside the Founder on the public Founder page — a list, so add as many as the company actually has.",
        details: [
          "Each entry needs a Name and a Title/Role; Photo and a short Bio are optional. Without a photo, the public grid falls back to a placeholder image rather than hiding the card.",
          "Entries publish in the order you added them, same as Company Policy rules — to reorder, delete and re-add in the order you want.",
          "This is separate from Founder Profile: Founder Profile is the one owner/founder's full page (hero, story, statement), while Team & Partners is everyone else shown alongside them.",
          "Each person has a Group: Partner, Shareholder or Employee. The public Founder page shows them under separate headings, so partners, shareholders and employees are easy to tell apart.",
        ],
      },
      {
        label: "Our Story",
        href: "/admin/content/story",
        permission: "content.view",
        summary: "The milestone timeline on the public About page — each entry is one dated chapter of the company's history.",
        details: [
          "Every entry needs a Year, an Icon, a Title and a short Summary (always shown on the public timeline); Details is optional longer text shown only behind that entry's \"Read More\" — leave it empty and that link simply won't appear.",
          "Entries are ordered automatically by Year (oldest first) wherever they're added from — you don't drag or manually reorder them.",
          "With zero entries, the public page falls back to a plain narrative paragraph instead of showing an empty timeline — add your first entry here to replace it.",
        ],
      },
      {
        label: "Company Policy",
        href: "/admin/content/policy",
        permission: "content.view",
        summary: "Numbered company-policy rules shown on the public /policy page — separate from Pages' Privacy/Terms/Disclaimer/Cookie policies.",
        details: [
          "Each rule has its own short Title (shown as a heading) plus a Rule Text body — \"Rule 1\", \"Rule 2\" etc. is generated automatically from each rule's position in the list, so you never type the number yourself.",
          "In the Rule Text box: select text and press Bold (or type ** on both sides of a phrase) to make that specific phrase bold. Press Enter for a plain new line, leave a blank line to start a new paragraph, or click List to turn the current line into a bullet point (type lines starting with \"- \" directly, or use the toolbar button).",
          "Rules always publish in the order you added them — to reorder, delete and re-add in the order you want.",
          "With zero rules, the public page shows a brief \"not published yet\" placeholder instead of an empty page.",
          "This page starts out with generic draft policy text (Pricing, Booking & Payment, Cancellations, Handover, Communication, Governing Law, Changes to this Policy) — a working starting point, not reviewed legal language. Have a lawyer review and edit/replace this content before relying on it.",
        ],
      },
    ],
  },
  {
    label: "Reports",
    description: "Read-only, drill-down views for when you need more than the dashboard's headline numbers.",
    items: [
      {
        label: "Statements & Notices",
        href: "/admin/statements",
        permission: "reports.view",
        summary: "Branded PDF and image documents on your company letterhead — notices, payment receipts, client statements, project summaries and daily reports — made in a minute and sent anywhere.",
        details: [
          "Pick the document type on the left; the letterhead page appears on the right and updates LIVE as you type or change a choice. Download PDF, Download image, or Copy image (paste it straight into WhatsApp Web or an email). Nothing is saved on the site.",
          "NOTICE: choose a template (meetings, new installment, payment reminder, piling work, floor casting / dhalai, progress update, cost update, handover, price change, work order, safety, holiday and more) and fill in just the name, date, amount… or choose Custom and write your own. A field left empty shows as [Label] in the text, and the PDF / image / copy buttons stay locked until nothing is left blank.",
          "Text pasted from an AI chat keeps its formatting: **bold**, # headings, - bullet lists, 1. numbered lists, > quotes and | tables |. The small toolbar above the text box inserts the same marks (Bold, Italic, Heading, lists, Quote, Table).",
          "SIGNATURE is optional: press Add signature to add a signature line with a name and role; Remove takes it off.",
          "PAYMENT RECEIPT: pick the customer and the payment (newest first). The receipt shows the amount received now (also in words), the total paid so far, the estimated remaining and every payment up to that receipt. It is also one click away from a payment's own page (Create receipt).",
          "CLIENT STATEMENT: one customer's flats with price, paid, remaining, any price changes and every payment. PROJECT SUMMARY: money received and spent on a project (expenses, material purchases, contractor payments, by category), optionally for a date range. DAILY REPORT: one day's money in and out, for all projects or one.",
          "BLANK LETTERHEAD FOR AN AI: download the empty pad (PDF or image) and press Copy AI instructions. Give both to Claude or any AI together with what the document must say; it writes on the pad, or answers in Markdown that you paste back into a Notice here.",
        ],
      },
      {
        label: "Reports",
        href: "/admin/finance/reports",
        permission: "reports.view",
        summary: "The main financial/operational report hub — a top-level summary page, plus drill-down reports for Owner Contributions, Category, Contractor Payments and Monthly Cash Flow.",
        details: [
          "Every report drills down to the individual transactions behind the total — a number is never a dead end.",
          "The summary page's Sales/Finance cards (Payments Received, Expenses, Outstanding, Contractor Payments) and Construction Cost cards (Material Cost, Total Budget, Actual Construction Cost, Budget Variance) are computed the same way as the main Dashboard's Financial Overview — expenses/contractor payments only count once verified or completed, cancelled sales are excluded. Actual Construction Cost is Material + Expenses + Contractor Cost combined; Budget Variance is that figure minus Total Budget (red/over when actual has overtaken budget).",
        ],
      },
      {
        label: "Sales Reports",
        href: "/admin/sales/reports",
        permission: "reports.view",
        summary: "Unit Inventory by status, Leads/Conversion funnel, and Salesperson Performance.",
        details: ["Sales and Bookings themselves are already full searchable lists — use the Sales/Bookings pages directly for those."],
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        permission: "reports.view",
        summary: "Real distribution breakdowns — units/leads/customers/sales/bookings/construction/parking by status.",
        details: ["No web-traffic or marketing analytics — this is business-data distributions only, all real, never a sample chart."],
      },
    ],
  },
  {
    label: "Owner Portal",
    description: "What your customers, shareholders and landowners see when they sign in with their phone number and PIN — and which admin screens feed each part of it.",
    items: [
      {
        label: "Owner Portal overview",
        href: "/login",
        summary: "A private area for each owner: their flat's blueprint, payments, installments, construction progress, documents and notifications. It is built for phones first.",
        details: [
          "SIGN IN: Login page → Property Owner → phone number. The first time, the owner sets a 4-digit PIN; after that the phone number and PIN are enough. The phone number must be the one saved on the owner's record.",
          "HOME: the owner's flat — number, beds, baths, size, facing and the blueprint (tap it to open it full screen). Below it: Payments (paid, remaining, last payment, next installment with its status), Construction progress, Documents and Notifications.",
          "The blueprint comes from the flat's blueprint type or its custom blueprint (Development → Projects / Properties).",
          "PAYMENTS: the flat's price, what has been paid, what is left, the installments with live status, any price changes and every payment received with date, method, reference, receipt no. and the balance after it. It comes from Sales → Payments and Installments, and the on/off switch on the sale's page controls whether the owner sees it.",
          "DOCUMENTS: files added under Operations → Documents for that person with Visibility set to show in the portal.",
          "To check what an owner sees, sign in with their phone number — the portal only ever shows that owner's own data.",
        ],
      },
    ],
  },
  {
    label: "System",
    description: "Platform-level configuration — who can access what, and how the company itself is set up.",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        permission: "settings.manage",
        summary: "Company profile (logo, name, contact info, hours, social media), platform defaults (date format, time zone, low-stock threshold, reminder lead time), and the public site's \"Our Impact\" stats.",
        details: [
          "The Logo section controls the logo shown everywhere on the whole platform — public header/footer, login page, Admin sidebar, and Owner Portal, all at once. Upload a new image any time to replace it (a transparent-background PNG/WEBP works best); the previous logo file is deleted automatically once replaced.",
          "\"Logo Display\" is a separate choice from the uploaded file: set it to \"Company Name\" to show your company name as plain text everywhere instead of an image, for when you don't have a finished logo image ready yet — switch it back to \"Image\" once you do, no re-upload needed if a logo is already on file.",
          "Address/Phone/WhatsApp Number/Email/Website/Hours feed the public footer's \"Contact\" column directly — each one only appears there once you fill it in, nothing is ever shown as a placeholder. Phone, WhatsApp and Email are tap/click-to-contact links; WhatsApp specifically needs the country code with no spaces or symbols (e.g. 8801XXXXXXXXX) since it becomes a wa.me chat link.",
          "The Social Media URL fields (Instagram, Facebook, TikTok, X, Threads, Pinterest, YouTube, LinkedIn) each show an icon in the public footer's \"Follow\" column, but only for the platforms you actually fill in — leave one blank and its icon simply doesn't appear.",
          "The \"Public 'Our Impact' Stats\" section (Ongoing Developments, Development Area, Locations, Landowner Partnerships) feeds the stat row on the public About page directly — leave a field blank to show an honest \"—\" placeholder there instead of a fabricated zero.",
          "The Security section's \"Require PIN for Property Owner login\" switch is on by default — turn it off only if you've decided a Property Owner can be signed in with just their registered phone number, no PIN, because some owners find a PIN confusing. Off means anyone who knows an owner's phone number can see that owner's own portal data too, so treat it as a deliberate tradeoff, not a convenience default. Flip it back on any time — nothing is deleted, PIN checking just resumes. This never touches Staff/Admin login, which always requires a password.",
          "\"Show a Sign In link on the public website\" is off by default — the login page has no link anywhere on the public site until you turn this on, so Property Owners/Staff need to bookmark /login themselves. Turn it on to add a visible \"Sign In\" link to the public header (desktop) and menu (mobile) for anyone who can't type a URL; turn it back off any time, in one click, if it ever feels like unwanted attention.",
          "Also links to your personal Notification Preferences — control which alert categories and channels reach you.",
        ],
      },
      {
        label: "Users",
        href: "/admin/users",
        permission: "users.view",
        summary: "Every staff and portal account, their Role, Status, and which Projects they can see.",
        details: [
          "A staff role (other than Super Admin/Managing Director) only ever sees the projects explicitly assigned to them — this is how project-level data isolation is enforced.",
          "Status: Active, Invited, Suspended or Disabled — suspending an account blocks sign-in without deleting their history.",
        ],
      },
      {
        label: "Roles / Permissions",
        href: "/admin/roles",
        permission: "roles.manage",
        summary: "What each role (Finance Manager, Sales Manager, Construction Manager, etc.) is allowed to view, create, edit or approve.",
        details: ["Permissions are enforced on the server for every action, not just by hiding buttons — a role without a permission genuinely cannot perform that action, even by URL."],
      },
      {
        label: "Audit Log",
        href: "/admin/audit",
        permission: "audit.view",
        summary: "The complete, permanent, append-only record of every important action in the system — who, what, when, and on which project.",
        details: [
          "Nothing here can ever be edited or deleted — this is the system's legal/compliance record, distinct from the friendlier Activity Feed.",
          "Filter by entity, project, or date range; every Entity ID is shortened for readability but the full ID is always available on hover.",
        ],
      },
      {
        label: "Backup & Restore",
        href: "/admin/settings/backup",
        permission: "settings.manage",
        summary: "Download a full copy of everything in this system (or just the data, without images) to your own device, and restore from one if something ever goes wrong.",
        details: [
          "\"Full Backup\" includes every record plus every uploaded photo/document — the complete picture, larger file. \"Data Only\" is every record and number with no images — small and fast, good for a quick, frequent backup.",
          "A backup covers everything: projects, units, sales, payments, expenses, owners, documents, and every piece of public-site content editable from this admin panel (Our Story, Founder Profile, Team & Partners, Company Policy, News, Gallery, Settings, all of it).",
          "Restoring replaces ALL current data with the backup's contents — anything added or changed since that backup was taken is lost, and this can't be undone. It requires typing a confirmation phrase on purpose, so it can never happen by a stray click.",
          "A restored backup's files go back to exactly the same place they came from automatically — there's nothing to sort or place by hand.",
        ],
      },
    ],
  },
];
