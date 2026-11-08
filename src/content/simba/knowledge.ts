/**
 * Everything Simba knows beyond the Admin Guide (`content/adminGuide.ts`, which already explains every sidebar page in depth):
 *  - PAGE_EXTRAS: pages the guide does not cover (project workspace tabs, the quick pages, forms).
 *  - ELEMENT_HELP: what a clicked button / switch / field means, matched on its on-screen label.
 *  - PROBLEMS: what to do when an error shows up, matched on the error text.
 *  - FAQ: the questions people ask most.
 * All of it is plain preloaded text — Simba is not an AI and never calls one.
 */

export interface PageExtra {
  /** Matches the page address (no query string). */
  test: RegExp;
  title: string;
  about: string;
  steps: string[];
  /** Things worth checking before leaving the page. */
  check?: string[];
}

export const PAGE_EXTRAS: PageExtra[] = [
  {
    test: /^\/admin\/public-page$/,
    title: "Public page — quick buttons for the website",
    about: "One button for every part of the public website. Press a button, choose the project or property if it asks, then Go — you land on the exact screen (and the exact box) that changes it.",
    steps: ["Find the button for what you want to change (use the search box if the list is long).", "Press it. A panel opens: the left side asks which project or property, the right side explains the job step by step.", "Press Go (or Open). Change it there and save."],
    check: ["Open the website in another tab and refresh to see the result.", "Website projects and your business-record projects are two separate lists — the buttons say which one they use."],
  },
  {
    test: /^\/admin\/client-page$/,
    title: "Client page — quick buttons for the client app",
    about: "One button for everything the client app shows: each project's plans, owners, payments, construction and documents, and each client's access link.",
    steps: ["Press a button for the job.", "Choose the project (and, if you like, a flat or customer of that project in the shortcut box).", "Press Go."],
    check: ["The shortcut box skips the project tab and opens a flat or customer's own page instead.", "To give a client access, use One client → Phone login & WhatsApp link."],
  },
  {
    test: /^\/admin\/money-page$/,
    title: "Money page — quick buttons for money",
    about: "Every money job in one place, with the most used on top: record a payment, installments, budget splits, expenses, sales and reports.",
    steps: ["Start with Most used for daily work.", "Use the project / flat / customer sections when you know who or what it is for.", "Press the button, choose, then Go."],
    check: ["Record a payment only after the sale and its installments exist.", "A budget split shows a preview first — read it before saving."],
  },
  {
    test: /^\/admin\/clients$/,
    title: "Clients overview",
    about: "Every client in one table with their budget, what they have paid and what is left. Use it to see who needs a reminder.",
    steps: ["Search or sort to find a client.", "Open a client to see their flats and payments.", "Use the tick for the split planner and partial installments where offered."],
  },
  {
    test: /^\/admin\/projects\/[^/]+$/,
    title: "Project dashboard",
    about: "The front page of one project: its numbers at a glance. Every tab above (Units, Owners, Distribute, Parking, Floor plans, Construction, Payments, Materials, Expenses, Documents, Reports, Settings) works only on this project.",
    steps: ["Read the numbers to see where the project stands.", "Open the tabs in order: Units → Floor plans → Distribute → Payments.", "Open Simba's \"This project\" tab to see exactly what is still missing."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/units$/,
    title: "Project → Units",
    about: "All the buildings, floors and flats of this project. This is where the structure is built.",
    steps: ["Add a building first, then its floors (use the bulk structure generator for a tall building).", "Add the flats on each floor, or generate many.", "Open each flat to enter size, rooms, base price and extra charges."],
    check: ["Every flat needs a price before sales and installments make sense.", "Do not worry about a perfect floor count: the count is a summary, the real floors are what you add here."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/owners$/,
    title: "Project → Owners",
    about: "Who owns what in this project — customers, shareholders and landowners — with what each has paid.",
    steps: ["Read who owns which flats.", "Open an owner to see their money in detail.", "To change who owns a flat, use Distribute or open the unit."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/distribute$/,
    title: "Project → Distribute",
    about: "Drag flats onto owners. This is how a flat gets an owner, and it is what makes the flat appear in that person's client app.",
    steps: ["Choose the owner on the right.", "Drag a flat onto them (or tap to assign).", "Check the result on the Owners tab."],
    check: ["A flat can have only one owner at a time.", "Changing an owner later is a transfer — it is recorded in the flat's history."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/parking$/,
    title: "Project → Parking",
    about: "Parking spots of this project and who has them.",
    steps: ["Add spots one by one or generate many.", "Assign a spot to a flat.", "Owners see their parking in the app."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/floor-plans$/,
    title: "Project → Floor plans",
    about: "The whole-floor drawings of the building with every flat marked. In the client app the owner's own flat lights up on it.",
    steps: ["Upload the architect's whole floor drawing (JPG, PNG, WEBP or SVG).", "Say which floors use it (leave Floors empty for the typical plan).", "Mark each flat's area, name the rooms if you want room buttons, then Save.", "Use the live preview to check how the Home card will look."],
    check: ["Upload only the layout: no background colour or border.", "Marked flat names must match the unit numbers exactly."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/construction$/,
    title: "Project → Construction",
    about: "Phases, tasks and progress of this project. Owners see this progress in the app.",
    steps: ["Add each phase with start and target dates.", "Add tasks, contractors and costs under a phase.", "Update the progress % and add photos as work moves on."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/payments$/,
    title: "Project → Payments",
    about: "What owners paid for this project and what is still due.",
    steps: ["Review who has paid and who is late.", "Record a new payment from here or from Record a payment.", "Send a reminder or receipt from Send a notice / receipt."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/materials$/,
    title: "Project → Materials",
    about: "Materials bought and used for this project.",
    steps: ["Record purchases and usage.", "Watch low-stock warnings.", "Open a purchase to receive items."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/expenses$/,
    title: "Project → Expenses",
    about: "What this project has spent.",
    steps: ["Add an expense with category and account.", "Attach a receipt if you have one.", "Compare with the budget on Project Finance."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/documents$/,
    title: "Project → Documents",
    about: "Papers for this project that owners can open and download.",
    steps: ["Upload a document and choose who can see it.", "Replace an old one with a new version.", "Remove papers that are no longer valid."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/reports$/,
    title: "Project → Reports",
    about: "Numbers for this one project.",
    steps: ["Pick the report.", "Read or export it."],
  },
  {
    test: /^\/admin\/projects\/[^/]+\/(edit|settings)$/,
    title: "Project → Settings",
    about: "The project's own record: name, address, status, blueprint types and publishing.",
    steps: ["Change the details.", "Add blueprint types (a design that repeats on every floor).", "Press Save."],
  },
  {
    test: /^\/admin\/settings\/blueprint-ai\/control$/,
    title: "Blueprint control panel",
    about: "For each website project: replace its plans, edit the room buttons and choose what the website shows.",
    steps: ["Pick a project at the top.", "Press a plan (Garage, Floor, Roof) to edit it.", "Use Save for the setting you changed — each box has its own Save button."],
    check: ["Turning something off only hides it from visitors. Nothing is deleted."],
  },
  {
    test: /^\/admin\/settings\/blueprint-ai\/distribution$/,
    title: "Blueprint distribution",
    about: "Decide how each plan is placed for clients, and preview how a flat looks in the client app.",
    steps: ["Pick the project and plan.", "Choose which picture to change (My Property page or Home card).", "Use zoom, shift and turn, then Save."],
  },
  {
    test: /^\/admin\/settings\/demo-data$/,
    title: "Remove demo data",
    about: "Clears the practice data so you can start with your real business. This cannot be undone, so download a backup first.",
    steps: ["Download a backup from Backup & Restore.", "Choose what to remove.", "Type the confirmation phrase and press the red button."],
    check: ["Sign-in accounts, company settings, page wording and the audit log are always kept."],
  },
  {
    test: /^\/admin\/content\/projects\/[^/]+\/edit$/,
    title: "Website project editor",
    about: "The public page of one project: text, photos, map, video, blueprints and the Featured switch. Press Save at the bottom — the website updates straight away.",
    steps: ["Edit the text and facts at the top.", "Add the map link, photos, and the building blueprints.", "Turn Featured on if it should lead the Projects page, then Save."],
  },
  {
    test: /^\/admin\/content\/properties\/[^/]+\/edit$/,
    title: "Website property editor",
    about: "The public page of one flat or whole building for sale: details, price, photos and floor plan.",
    steps: ["Choose a flat or whole building and the project.", "Fill the details and price (blank price shows Price on request).", "Add photos and the floor plan, then Save."],
  },
  {
    test: /\/new$/,
    title: "Adding something new",
    about: "A blank form. Fill the fields marked as required, then press the Save / Create button at the bottom.",
    steps: ["Fill every required field (marked with a star or the word required).", "Optional fields can stay empty and be filled later.", "Press Save. If a red message appears, read it, fix that field and press Save again."],
  },
  {
    test: /\/edit$/,
    title: "Editing",
    about: "The same form as when it was created, with the saved values filled in.",
    steps: ["Change only what you need.", "Press Save.", "Pressing Back without saving throws your changes away."],
  },
];

export interface ElementHelp {
  /** Matched (case-insensitive) against the clicked thing's label. */
  re: RegExp;
  title: string;
  what: string;
  careful?: string;
  tip?: string;
}

export const ELEMENT_HELP: ElementHelp[] = [
  { re: /^(save|save changes|update)\b|^save /i, title: "Save", what: "Stores what you typed. Nothing you changed is kept until you press it.", tip: "If a red message appears after pressing, read it — it names the field that needs fixing." },
  { re: /^(create|submit|publish)\b/i, title: "Create / Publish", what: "Makes the new record from the form and puts it in the list.", tip: "Required fields must be filled first, or a red message will tell you which." },
  { re: /^add\b/i, title: "Add", what: "Starts adding one more. It usually opens a small form or panel; nothing is saved until you press the save or create button inside it." },
  { re: /^(cancel|back|close|discard)\b/i, title: "Cancel / Back / Close", what: "Leaves without saving. Anything typed in the form is thrown away." },
  { re: /(delete|remove|revoke|turn off|disable)/i, title: "Delete / Remove", what: "Takes something away.", careful: "This usually cannot be undone. Make sure it is the right one — if unsure, download a backup first (Settings → Backup & Restore)." },
  { re: /^edit\b/i, title: "Edit", what: "Opens the same form with the saved values so you can change them." },
  { re: /^new\b/i, title: "New", what: "Opens a blank form to add one more." },
  { re: /^go$/i, title: "Go", what: "Takes you to the screen you chose in the box beside it." },
  { re: /^open$/i, title: "Open", what: "Takes you straight to the screen described beside it." },
  { re: /search/i, title: "Search", what: "Type part of a name, number or phone to find a project, flat, client or lead anywhere in the panel." },
  { re: /^(sign out|log ?out)/i, title: "Sign out", what: "Ends your session on this computer. Do it when you leave a shared computer." },
  { re: /notifications/i, title: "Notifications bell", what: "Shows the newest alerts for you. Open one to go to the thing it is about." },
  { re: /zoom/i, title: "Zoom", what: "Makes a plan or picture bigger or smaller. It changes only how it looks while you work." },
  { re: /turn (left|right)|rotate/i, title: "Turn left / right", what: "Turns the flat's drawing a quarter turn. Use it when a flat was drawn sideways so it stands upright on the client's Home card.", tip: "Fine angle turns it by a small amount. Reset puts it back." },
  { re: /fine angle/i, title: "Fine angle", what: "Turns the drawing by a few degrees, for a plan that was drawn slightly crooked." },
  { re: /shift (left|up)/i, title: "Shift", what: "Moves the picture inside its frame so the important part sits in the middle." },
  { re: /reset/i, title: "Reset", what: "Puts the settings beside it back to normal. Nothing in the file itself is changed." },
  { re: /featured/i, title: "Featured", what: "When on, the project leads the public Projects page as a featured development." },
  { re: /blueprint|floor plan/i, title: "Blueprint / floor plan", what: "The drawing of the building or flat. Upload only the layout — no background colour or border. JPG, PNG, WEBP or SVG all work.", tip: "Mark the rooms on it to give visitors and clients room buttons." },
  { re: /enlarge|full screen/i, title: "Enlarge button", what: "When on, visitors can open a plan full screen. When off, the plan still shows but cannot be opened bigger." },
  { re: /shown on website|show .* website|show this plan/i, title: "Show on the website", what: "A switch for visitors only. Off hides it from the public site; the file stays saved and you can turn it back on." },
  { re: /backup/i, title: "Backup", what: "Downloads a copy of everything in the system to your computer. Do this before any big change." },
  { re: /restore/i, title: "Restore", what: "Replaces everything with a backup file.", careful: "Anything added since that backup is lost. Use only if something went badly wrong." },
  { re: /record a payment/i, title: "Record a payment", what: "Writes down money a client paid. It updates what they have paid and what is left, and shows in their app." },
  { re: /notice|receipt|statement/i, title: "Notices & receipts", what: "Makes a paper (notice, receipt, statement) on the company letterhead to send to a client." },
  { re: /distribute/i, title: "Distribute", what: "Gives flats to owners. A flat shows in someone's client app only after this." },
  { re: /export|download/i, title: "Export / Download", what: "Saves the data or file to your computer. It does not change anything in the system." },
  { re: /filter|sort|view/i, title: "Filter / Sort", what: "Changes only which rows you see and in what order. Nothing is changed or deleted." },
  { re: /next|previous|page \d/i, title: "Pagination", what: "Moves between pages of a long list." },
  { re: /whatsapp|link/i, title: "Link / WhatsApp", what: "A personal link that opens the client app with no sign-in. Copy it or send it on WhatsApp. You can turn it off any time." },
  { re: /status/i, title: "Status", what: "Tells everyone where this stands (for example Ongoing, Completed, Pending). Reports and the public site read it, so keep it true." },
  { re: /price|amount|total/i, title: "Money field", what: "Type numbers only. Totals are worked out by the system, so do not type a total yourself unless the field asks for it." },
];

export interface ProblemHelp {
  re: RegExp;
  title: string;
  fix: string[];
}

export const PROBLEMS: ProblemHelp[] = [
  { re: /required|can.?t be empty|must (not )?be (blank|empty)|fill in|enter a|please (enter|choose|select)/i, title: "A required field is empty", fix: ["Find the field the message names (or any field marked required) and fill it.", "Press Save again."] },
  { re: /already (exists|used|in use|registered|taken)|duplicate|unique/i, title: "That already exists", fix: ["Search for it first — it may already be saved. Open that one instead of adding a new one.", "If it is truly different, change the name, number or code so it is unique, then Save."] },
  { re: /permission|forbidden|not allowed|not authori[sz]ed|not assigned/i, title: "You do not have permission", fix: ["Your role cannot do this. Ask a Super Admin to change your role (Staff & Users) or do it for you.", "If it says the project is not assigned to you, ask for access to that project."] },
  { re: /not found|no longer exists|doesn.?t exist|404/i, title: "It could not be found", fix: ["It may have been deleted or the link is old. Go back to the list and open it again.", "If it should exist, check Audit Log to see who removed it."] },
  { re: /too large|file size|max(imum)? size|exceeds|over \d+ ?mb/i, title: "The file is too big", fix: ["Make the picture or file smaller (resize or compress it) and upload again.", "For plans, an SVG is light — prefer it over a heavy photo."] },
  { re: /image|upload|file type|unsupported|format/i, title: "The file could not be used", fix: ["Use JPG, PNG, WEBP or SVG for pictures and plans.", "If it still fails, export the picture again from the original and retry."] },
  { re: /invalid|not valid|malformed|valid (email|phone|number|date|url)/i, title: "Something is typed in the wrong form", fix: ["Check phone numbers (01XXXXXXXXX), emails, dates and links.", "Numbers should have no letters or commas."] },
  { re: /couldn.?t reach|network|offline|failed to fetch|timeout|try again/i, title: "The connection failed", fix: ["Check your internet and press the button again.", "Do not press it many times — check the list first in case it was already saved."] },
  { re: /exceed|more than|greater than|insufficient|over budget|not enough/i, title: "A number is too big", fix: ["Check the amount against what is available (stock, balance, unit price, remaining due).", "Reduce it, or fix the earlier record that it is compared with."] },
  { re: /sale|installment|payment/i, title: "A money record has a problem", fix: ["Check the sale exists and its price is set.", "Record installments before payments, and use the same customer on all of them."] },
  { re: /something went wrong|unexpected|error/i, title: "Something unexpected went wrong", fix: ["Refresh the page and try once more.", "If it happens again, note what you pressed, then check Audit Log to see whether anything was saved.", "Download a backup if the data matters before trying again."] },
];

export interface FaqItem {
  q: string;
  a: string[];
  href?: string;
  hrefLabel?: string;
}

export const FAQ: FaqItem[] = [
  { q: "I pressed Save and nothing happened", a: ["Look for a red message near the top or beside a field — it says what to fix.", "Scroll up: the message may be above the part you are looking at.", "Fix it and press Save again."] },
  { q: "I deleted something by mistake", a: ["Deleted items cannot be brought back one by one.", "If you have a recent backup, Restore brings the system back to that moment — but it also removes everything added after it.", "So: download a backup before big clean-ups."], href: "/admin/settings/backup", hrefLabel: "Open Backup & Restore" },
  { q: "The website does not show my change", a: ["Make sure you pressed Save.", "Refresh the website page (Ctrl + F5).", "Check the item is switched on (Featured / Shown on website) and published."], href: "/admin/public-page", hrefLabel: "Open Public page" },
  { q: "A client cannot see their flat in the app", a: ["The flat must have an owner (Project → Distribute).", "The client needs access: a personal link or a phone login.", "If they see an old version, ask them to reopen the app."], href: "/admin/client-page", hrefLabel: "Open Client page" },
  { q: "The numbers on the dashboard look wrong", a: ["Numbers are worked out live from records, so a wrong number means a record is missing or wrong.", "Check the sale price, installments and payments of that client.", "Pending or rejected items are not counted until they are verified."], href: "/admin/money-page", hrefLabel: "Open Money page" },
  { q: "How do I remove the practice data?", a: ["Download a backup first.", "Open Remove demo data and follow the steps."], href: "/admin/settings/demo-data", hrefLabel: "Open Remove demo data" },
  { q: "I added a flat but cannot find it", a: ["Flats live under a project's Units tab.", "A flat for the website is a separate record (Public page → A property's public page)."], href: "/admin/projects", hrefLabel: "Open Projects" },
  { q: "Another admin cannot manage things", a: ["Give them the role that fits their job (Staff & Users). Roles control what each person can see and change.", "Tell them to press the Simba button on any page — it explains the page and the next step."], href: "/admin/users", hrefLabel: "Open Staff & Users" },
  { q: "A picture will not upload", a: ["Use JPG, PNG, WEBP or SVG.", "Make it smaller if it is very large.", "Plans: upload the layout drawing only, with no background."] },
  { q: "I forgot where something is", a: ["Use the search bar at the very top for projects, flats, owners and leads.", "Public page, Client page and Money page have a button for every job."] },
];
