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
        ],
      },
      {
        label: "Payments",
        href: "/admin/sales/payments",
        permission: "finance.view",
        summary: "Payments received from customers against their sale/contract.",
        details: [
          "Record the amount, method (cash/bank/mobile banking/card), and link it to a customer and project for accurate reporting.",
        ],
      },
      {
        label: "Installments",
        href: "/admin/sales/installments",
        permission: "sales.view",
        summary: "Payment plan schedules — due dates and amounts a customer is expected to pay over time.",
        details: [
          "Status (pending/due-soon/paid/overdue) helps you see at a glance who needs a follow-up call.",
        ],
      },
    ],
  },
  {
    label: "Finance",
    description: "Every taka in and out of the company — expenses, budgets, collections and the material supply chain that feeds them.",
    items: [
      {
        label: "Expenses",
        href: "/admin/finance/expenses",
        permission: "finance.view",
        summary: "General project costs — labour, utilities, permits, site work and anything that isn't a material purchase or a contractor payment.",
        details: [
          "Tag an expense to a project, construction phase, building, vendor, contractor and/or account so it shows up correctly in every report.",
          "Set a Status (Pending/Submitted/Verified/etc.) — anything not yet verified appears in the Approval Queue for review.",
        ],
      },
      {
        label: "Project Finance",
        href: "/admin/finance/project-costs",
        permission: "finance.view",
        summary: "Budget lines per project (and optionally per construction stage) — what you planned to spend vs. what's actually been spent.",
        details: [
          "Set warning/over-budget thresholds (default 80%/100%) — the budget status badge (Under/On/Over Budget) updates automatically as real costs come in.",
          "\"Actual\" here is labelled \"Actual (Manual)\" — you type it in by hand, it isn't calculated. For the real, live-computed actual cost (the true sum of every verified Purchase, Expense and Contractor Payment), check that project's own Reports tab instead — update this field to match if you want the two to agree.",
        ],
      },
      {
        label: "Cost Allocations",
        href: "/admin/finance/cost-allocations",
        permission: "finance.view",
        summary: "How a shared construction cost (e.g. \"Piling — Phase 1\") gets billed back to every unit owner, split by unit size, ratio, tier or a fixed amount.",
        details: [
          "This is the core \"Construction Goal\" system: create an allocation → generate owner contributions → optionally set up an installment plan → collect payments.",
          "Every owner's payable amount, paid amount, and outstanding balance is always derived live from real payments — never a stored, staleable number.",
        ],
      },
      {
        label: "Accounts",
        href: "/admin/finance/accounts",
        permission: "finance.view",
        summary: "Internal cash/bank/mobile-banking records you can tag expenses and payments against — not a real banking integration.",
        details: [
          "Add an account once (e.g. \"Site Cash Box\", \"BRAC Bank — Main\") and it becomes selectable everywhere a payment method is recorded.",
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
          "The \"Visibility\" field controls who can ever see a document — set it to \"Private\" when the document should be visible to the specific owner it belongs to (in the future Owner Portal), or \"Internal\"/\"Restricted\" to keep it admin-only.",
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
          "Total/Available Units and Total/Available Car/Bike Parking are typed in by hand here — they drive the availability summary on the project's public page, but aren't pulled automatically from the real Units/Parking records under Development, so update them yourself as units or spaces sell.",
        ],
      },
      {
        label: "Properties",
        href: "/admin/content/properties",
        permission: "content.view",
        summary: "Public-facing property listings shown on the marketing site's Properties page.",
        details: [],
      },
      {
        label: "News",
        href: "/admin/content/news",
        permission: "content.view",
        summary: "News & Updates articles published on the public website.",
        details: [],
      },
      {
        label: "Gallery",
        href: "/admin/content/gallery",
        permission: "content.view",
        summary: "Photos shown on the public Gallery page — upload, categorize, and optionally link each image to a project.",
        details: ["Use the search and category filter to find an image quickly once the gallery has many entries."],
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
