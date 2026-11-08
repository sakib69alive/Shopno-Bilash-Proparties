import type { Tour, TourStep } from "./tours";

/**
 * Simba's lessons: pick a job, and Simba opens the real page, outlines every field and button in order — including the delete
 * buttons, which it only points at and explains — and says what to type. Sample files for uploads live in /public/simba-demo/
 * (a tracked folder, so they stay available on the live site and survive "Remove demo data"; see `SAMPLE_FILES`).
 *
 * `find` is matched against the text of what is on the page; a step that cannot find its target is simply shown as a note, so a
 * label that changes later never breaks a lesson.
 */

export interface Lesson extends Tour {
  summary: string;
  minutes: number;
  /** Simba can do it by itself in "Do it for me" mode (it creates records named "Simba Demo …" and deletes them again). */
  doable?: boolean;
}

const DELETE_NOTE = "Delete cannot be undone. Use it only for something added by mistake, and download a backup first if the data matters. I will only point at it — I never press it.";

const sample = (name: string, label: string) => ({ name, label });

function lesson(id: string, title: string, summary: string, minutes: number, steps: TourStep[], doable = false): Lesson {
  return { id, title, summary, minutes, startHref: steps.find((s) => s.go)?.go ?? "/admin", steps, doable };
}

export const LESSONS: Lesson[] = [
  lesson(
    "new-project",
    "Create a new project",
    "Every field of the project form (Simba can fill it in for you), then how to edit and delete a project.",
    5,
    [
      { go: "/admin/projects/new", say: "This is the new-project form. A project is the base of everything — buildings, flats, owners and money all hang under it." },
      { find: ["name"], say: "The project's name, shown in lists, reports and the client app.", example: "Simba Demo Heights", value: "Simba Demo Heights" },
      { find: ["code"], say: "A short unique code, used to tell projects apart.", example: "SD-01", value: "SD-01" },
      { find: ["description"], say: "What the project is, in a few sentences.", value: "Simba Demo Heights is a sample project used to show how a project is created." },
      { find: ["status"], say: "Where the project is now. Reports and the public site read it, so keep it true.", example: "Ongoing", value: "Ongoing" },
      { find: ["sales status"], say: "Whether you are selling yet: Not started, Open or Closed.", example: "Open", value: "Open" },
      { find: ["address"], say: "The full address.", example: "House 12, Road 5, Gulshan 2", value: "House 12, Road 5, Gulshan 2" },
      { find: ["city"], say: "The city.", example: "Dhaka", value: "Dhaka" },
      { find: ["property type"], say: "What kind of project it is.", example: "Residential apartment", value: "Residential apartment" },
      { find: ["buildings"], say: "Summary numbers only (buildings, floors, units, parking). The real buildings, floors and flats are added later in the Units tab.", example: "1", value: "1" },
      { find: ["cover image"], say: "The main picture of the project.", file: sample("sample-cover-photo.webp", "Sample cover photo"), upload: true },
      { find: ["gallery images"], say: "More pictures of the project.", file: sample("sample-gallery-photo.png", "Sample gallery photo"), upload: true },
      { find: ["budget"], say: "Optional: the planned total cost. Real budget lines are added later in Project Finance." },
      { find: ["published"], say: "When on, the project may appear on the public website. Leave it off until the details are ready." },
      { find: ["create project"], say: "Press Create Project. You land inside the new project, where the tabs are.", click: true, dwell: 4500 },
      { go: "/admin/projects/{project}", find: ["edit"], say: "A project's page. Edit reopens the same form to change anything." },
      { find: ["delete"], say: "Deletes the whole project.", careful: DELETE_NOTE },
      { find: ["units"], say: "The tabs run in the order you will use them: Units, Owners, Distribute, Parking, Floor plans, Construction, Payments, Materials, Expenses, Documents, Reports, Settings." },
      { go: "/admin/projects/{demoProject}", find: ["delete"], say: "Now Simba deletes the demo project it just made — and only that one.", del: true, autoOnly: true, dwell: 4500 },
    ],
    true,
  ),
  lesson("structure", "Build buildings, floors and flats", "Generate or add buildings and floors, open a flat, edit it, assign its owner, and how to delete one.", 4, [
    { go: "/admin/projects/{project}/units", say: "The Units tab holds the structure: buildings, each with floors, each floor with flats." },
    { find: ["generate structure"], say: "Creates floors and flats in one go — the quickest way to set up a tall building.", example: "1 building · 10 floors · 4 flats per floor" },
    { find: ["add building"], say: "Adds one building by hand." },
    { find: ["add floor"], say: "Adds one floor to a building." },
    { sel: 'main a[href^="/admin/properties/"]', say: "Each tile is a flat. Click one to open its own page." },
    { go: "/admin/properties/{unit}", find: ["edit"], say: "Edit: the flat's number, size, rooms, facing, price and extra charges.", example: "Base price 6500000" },
    { find: ["owner"], say: "Ownership: give this flat to a customer, shareholder or landowner, or transfer it later. The change is recorded in its history." },
    { find: ["delete"], say: "Deletes this flat.", careful: DELETE_NOTE },
  ]),

  lesson("floor-plans", "Upload floor plans and blueprint types", "Upload the whole-floor drawing, mark every flat on it, check the live preview, and delete a plan.", 5, [
    { go: "/admin/projects/{project}/floor-plans", say: "Floor plans: the whole floor of the building with every flat marked. In the client app the owner's own flat lights up on it." },
    { find: ["upload", "plan"], say: "Upload the architect's whole-floor drawing. Layout only: no background colour or border.", file: sample("real-typical-floor.svg", "Sample typical floor (SVG)") },
    { find: ["which floor uses which plan"], say: "Say which floors use this plan. Leave it empty for the typical plan; use 0 for the ground floor." },
    { find: ["draw as"], say: "Choose how to mark a flat on the drawing." },
    { find: ["shape"], say: "Draw the flat's outline, then name it exactly like its unit number, for example 1A." },
    { find: ["live preview"], say: "The live preview shows how the owner's Home card will look, with their flat selected.", example: "Pick a flat, then Turn left / Turn right until it stands upright" },
    { find: ["save"], say: "Save. Nothing is stored until you press it." },
    { find: ["delete", "remove"], say: "Removes a plan from the project.", careful: DELETE_NOTE },
    { go: "/admin/projects/{project}/edit", find: ["blueprint"], say: "On the project's own Edit page you can add Blueprint types: a flat design that repeats on every floor.", file: sample("plan-3bed.svg", "Sample 3-bedroom plan") },
  ]),

  lesson(
    "customer",
    "Add a customer and give app access",
    "Every customer field (Simba can fill it in), then their profile: edit, delete, and the personal link or phone login for the client app.",
    4,
    [
      { go: "/admin/customers/new", say: "The new-customer form." },
      { find: ["name"], say: "Their full name.", example: "Simba Demo Rahim", value: "Simba Demo Rahim" },
      { find: ["email"], say: "Their email.", example: "simba.demo@example.com", value: "simba.demo@example.com" },
      { find: ["phone"], say: "Their phone. It is also what the client app login uses.", example: "01700000000", value: "01700000000" },
      { find: ["status"], say: "Active for a current customer.", value: "@first" },
      { find: ["alternate phone"], say: "A second number, optional." },
      { find: ["nid", "passport"], say: "Identity number, optional." },
      { find: ["present address"], say: "Where they live now, optional." },
      { find: ["permanent address"], say: "Home address, optional." },
      { find: ["notes"], say: "Anything worth remembering, optional." },
      { find: ["create customer"], say: "Press Create Customer.", click: true, dwell: 4500 },
      { go: "/admin/customers/{customer}", find: ["edit"], say: "A customer's profile. Edit changes the details above." },
      { find: ["delete"], say: "Deletes this customer.", careful: DELETE_NOTE },
      { find: ["whatsapp", "login link", "link"], say: "Their personal no-login link for the client app: copy it or send it on WhatsApp. You can switch it off or make a new one at any time." },
      { find: ["portal access", "phone login", "pin"], say: "Or give them a phone and PIN login instead of the link." },
      { go: "/admin/customers/{demoCustomer}", find: ["delete"], say: "Now Simba deletes the demo customer it just made — and only that one.", del: true, autoOnly: true, dwell: 4500 },
    ],
    true,
  ),
  lesson("owners", "Give flats to owners", "Drag flats onto their owners, then check the result. Without this, no one sees a flat in the app.", 3, [
    { go: "/admin/projects/{project}/distribute", say: "Distribute: this is where a flat gets its owner." },
    { sel: "main", say: "Choose the owner, then drag a flat onto them (or tap to assign). A flat can have one owner at a time." },
    { go: "/admin/projects/{project}/owners", say: "Owners: check who owns what and what each has paid. To change an owner later, use Distribute or open the flat." },
  ]),

  lesson("money", "Record a sale, installments and payments", "From the sale form to the installment plan, a payment, and a receipt — with delete explained.", 6, [
    { go: "/admin/sales/new", say: "Record Sale: a sale ties a customer to a flat at an agreed price." },
    { find: ["unit"], say: "Choose the flat. Its base price fills in for you." },
    { find: ["customer"], say: "Choose the buyer." },
    { find: ["sale date"], say: "The date it was agreed." },
    { find: ["base price"], say: "The flat's reference price.", example: "6500000" },
    { find: ["floor premium"], say: "Optional extra for a good floor." },
    { find: ["parking price"], say: "Optional price of a parking spot sold with it." },
    { find: ["additional charges"], say: "Optional extras (utility connection, for example)." },
    { find: ["discount amount"], say: "Optional discount in taka.", example: "100000" },
    { find: ["payment terms"], say: "Optional note on how they will pay." },
    { find: ["record sale"], say: "Press Record Sale." },
    { go: "/admin/sales/installments/new", say: "Installments: each due payment, with a date, so the system knows what is upcoming and what is overdue." },
    { find: ["which flat sale"], say: "Choose the sale (flat and buyer) this installment belongs to." },
    { find: ["installment number"], say: "1 for the first, 2 for the second…", example: "1" },
    { find: ["amount"], say: "How much is due.", example: "500000" },
    { find: ["due date"], say: "When it is due." },
    { find: ["schedule installment"], say: "Press Schedule Installment. Repeat for each due payment." },
    { go: "/admin/sales/payments/new", say: "Record Payment: money a client actually paid." },
    { find: ["customer"], say: "Who paid." },
    { find: ["which flat"], say: "Which flat the payment is for." },
    { find: ["amount"], say: "How much they paid.", example: "500000" },
    { find: ["method"], say: "Cash, bank, bKash… as they paid." },
    { find: ["category"], say: "What the payment is for (booking, installment…)." },
    { find: ["receipt"], say: "Your receipt number, optional." },
    { find: ["record payment"], say: "Press Record Payment. It updates what they have paid and what is left, and shows in their app." },
    { go: "/admin/sales/payments", find: ["delete"], say: "On the payments list each row has a delete button.", careful: DELETE_NOTE },
    { go: "/admin/statements", say: "Statements & Notices: make a receipt or notice on the letterhead and send it to the client." },
  ]),

  lesson(
    "website-project",
    "Put a project on the website, with blueprints",
    "Every field of the website project form, the three blueprints, photos, map, Featured — Simba can do it and then delete it.",
    6,
    [
      { go: "/admin/content/projects/new", say: "The website project form. This is the page visitors see; it is separate from the business record of the project." },
      { find: ["name"], say: "The public name.", example: "Simba Demo Heights", value: "Simba Demo Heights" },
      { find: ["display location"], say: "The area shown to visitors.", example: "Gulshan 2, Dhaka", value: "Gulshan 2, Dhaka" },
      { find: ["city"], say: "The city.", example: "Dhaka", value: "Dhaka" },
      { find: ["project type"], say: "Residential, commercial, mixed…", value: "@first" },
      { find: ["status"], say: "Upcoming, ongoing or completed.", value: "@first" },
      { find: ["short description"], say: "One or two sentences for the project list.", example: "A calm, well-planned apartment building in the heart of Gulshan.", value: "A calm, well-planned apartment building in the heart of Gulshan." },
      { find: ["description"], say: "The full text on the project's own page.", value: "Simba Demo Heights is a sample project used to show how the website looks once a project is added." },
      { find: ["completion year"], say: "When it will be ready.", example: "2027", value: "2027" },
      { find: ["total units"], say: "Counts shown on the page. Available units are counted from the real flats once you add them.", value: "40" },
      { find: ["features"], say: "Amenities, separated by commas.", example: "Rooftop garden, Lift, Generator, CCTV", value: "Rooftop garden, Lift, Generator, CCTV" },
      { find: ["google maps"], say: "The map: paste the Google Maps embed code, link or coordinates." },
      { find: ["cover photo"], say: "The main picture.", file: sample("sample-cover-photo.webp", "Sample cover photo"), upload: true },
      { find: ["gallery"], say: "More photos for the project page.", file: sample("sample-gallery-photo.png", "Sample gallery photo"), upload: true },
      { find: ["video"], say: "A video link and/or a 360° tour link, optional." },
      { find: ["garage blueprint"], say: "The garage plan. Upload the layout drawing only; mark rooms if you want room buttons.", file: sample("building-garage.svg", "Sample garage blueprint"), upload: true },
      { find: ["floor blueprint"], say: "A typical floor, shown second in the swipeable set.", file: sample("building-floor.svg", "Sample floor blueprint"), upload: true },
      { find: ["roof blueprint"], say: "The roof plan, shown last.", file: sample("building-roof.svg", "Sample roof blueprint"), upload: true },
      { find: ["featured"], say: "When on, the project leads the public Projects page." },
      { find: ["publish project"], say: "Save at the bottom. The website updates straight away.", click: true, dwell: 4500 },
      { go: "/admin/content/projects", find: ["delete"], say: "On the projects list, each row has a delete button that removes it from the website.", careful: DELETE_NOTE },
      { find: ["delete"], say: "Now Simba deletes the demo project it just made — and only that one.", del: true, autoOnly: true, dwell: 4500 },
    ],
    true,
  ),
  lesson(
    "website-property",
    "List a flat on the website",
    "Choose flat or whole building, fill the details and price, add photos and the floor plan — Simba can do it and then delete it.",
    4,
    [
      { go: "/admin/content/properties/new", say: "A property is one flat (or a whole building) for sale on the public Properties page." },
      { find: ["what is for sale"], say: "A flat, or the whole building sold as one." },
      { find: ["name"], say: "The listing name.", example: "Simba Demo Flat A-1", value: "Simba Demo Flat A-1" },
      { find: ["project"], say: "Which website project it belongs to.", value: "@first" },
      { find: ["unit number"], say: "The flat number.", example: "A-1", value: "A-1" },
      { find: ["unit type"], say: "What kind of unit it is.", example: "Apartment", value: "Apartment" },
      { find: ["status"], say: "Available, reserved or sold.", value: "@first" },
      { find: ["short description"], say: "One line for the listing.", value: "A bright three-bedroom flat with two balconies." },
      { find: ["description"], say: "The full text on the flat's own page.", value: "Simba Demo Flat A-1 is a sample listing used to show how a property page looks." },
      { find: ["bedrooms"], say: "Beds, baths and balconies.", example: "3 bed · 3 bath · 2 balconies", value: "3" },
      { find: ["price"], say: "The asking price. Leave it blank to show Price on request.", example: "৳1.2 Crore", value: "৳1.2 Crore" },
      { find: ["cover photo"], say: "The main picture.", file: sample("sample-cover-photo.webp", "Sample cover photo"), upload: true },
      { find: ["floor plan"], say: "The flat's own plan beside beds, baths, size and price. You can mark rooms for room buttons.", file: sample("plan-3bed-detailed.svg", "Sample 3-bedroom plan (detailed)"), upload: true },
      { find: ["publish"], say: "Save at the bottom.", click: true, dwell: 4500 },
      { go: "/admin/content/properties", find: ["delete"], say: "Each row has a delete button that removes the listing from the website.", careful: DELETE_NOTE },
      { find: ["delete"], say: "Now Simba deletes the demo listing it just made — and only that one.", del: true, autoOnly: true, dwell: 4500 },
    ],
    true,
  ),
  lesson(
    "news-gallery",
    "Publish news and gallery photos",
    "The news form field by field (Simba can publish and delete a demo article), bulk photo upload, and deleting.",
    3,
    [
      { go: "/admin/content/news/new", say: "A news article for the public News page." },
      { find: ["title"], say: "The headline.", example: "Simba Demo: foundation laid", value: "Simba Demo: foundation laid" },
      { find: ["category"], say: "What kind of news it is.", value: "@first" },
      { find: ["date"], say: "The date shown on the article.", value: "2026-11-10" },
      { find: ["excerpt"], say: "The short summary shown in the list.", value: "A sample article that shows how news looks on the website." },
      { find: ["content"], say: "The full article.", value: "This is a sample article written by Simba to show how news is published. It will be deleted at the end of the demo." },
      { find: ["cover image"], say: "The picture at the top.", file: sample("sample-cover-photo.webp", "Sample cover photo"), upload: true },
      { find: ["related project"], say: "Optional: link it to a project." },
      { find: ["featured"], say: "Show it at the top." },
      { find: ["publish article"], say: "Press Publish Article.", click: true, dwell: 4500 },
      { go: "/admin/content/news", find: ["delete"], say: "Each article has a delete button.", careful: DELETE_NOTE },
      { find: ["delete"], say: "Now Simba deletes the demo article it just made — and only that one.", del: true, autoOnly: true, dwell: 4500 },
      { go: "/admin/content/gallery/bulk", find: ["photos"], say: "Add many gallery photos at once.", file: sample("sample-gallery-photo.png", "Sample gallery photo") },
      { find: ["category"], say: "Group the photos (construction, handover…)." },
      { find: ["date"], say: "Optional date." },
      { find: ["related project"], say: "Optional project they belong to." },
      { go: "/admin/content/gallery", find: ["delete"], say: "Photos can be removed one by one.", careful: DELETE_NOTE },
    ],
    true,
  ),
  lesson("budget", "Project budget and cost split", "Set planned amounts, record what was spent, and split a shared cost among owners.", 4, [
    { go: "/admin/finance/project-costs/new", say: "A budget line is a planned amount for a category of cost." },
    { find: ["project"], say: "Which project." },
    { find: ["category"], say: "What the money is for.", example: "Structure" },
    { find: ["budgeted"], say: "The planned amount.", example: "5000000" },
    { find: ["actual"], say: "A hand-typed actual, optional. The real actual comes from recorded expenses." },
    { find: ["warning threshold"], say: "Optional: warn me when spending reaches this percentage.", example: "80" },
    { find: ["save", "create", "add"], say: "Save the budget line." },
    { go: "/admin/finance/project-costs", find: ["delete"], say: "Each budget line has a delete button.", careful: DELETE_NOTE },
    { go: "/admin/finance/cost-allocations/new", say: "A cost split decides how much of a shared cost each owner pays and when. You get a preview before anything is saved." },
    { find: ["project"], say: "Choose the project the cost is for." },
    { find: ["save", "create"], say: "Check the preview carefully, then save." },
  ]),

  lesson("expenses-materials", "Record expenses and buy materials", "Expense form, vendors, materials and purchases, with deleting.", 5, [
    { go: "/admin/finance/expenses/new", say: "An expense is money the company spent." },
    { find: ["project"], say: "Which project it belongs to." },
    { find: ["description"], say: "What was bought or paid.", example: "Cement — 200 bags" },
    { find: ["amount"], say: "How much.", example: "180000" },
    { find: ["date"], say: "When it was paid." },
    { find: ["account"], say: "Which cash or bank account it came from." },
    { find: ["vendor"], say: "Who was paid, optional." },
    { find: ["record expense"], say: "Press Record Expense." },
    { go: "/admin/finance/expenses", find: ["delete"], say: "Each expense has a delete button.", careful: DELETE_NOTE },
    { go: "/admin/procurement", find: ["add vendor", "new"], say: "Vendors are the people and shops you buy from." },
    { go: "/admin/procurement/materials", find: ["add material", "new"], say: "Materials are what you buy: cement, rod, bricks…" },
    { go: "/admin/procurement/purchases/new", say: "A purchase records buying materials from a vendor for a project." },
    { find: ["record purchase"], say: "Press Record Purchase, then receive the items when they arrive." },
    { go: "/admin/procurement/purchases", find: ["delete"], say: "A purchase can be deleted.", careful: DELETE_NOTE },
  ]),

  lesson("construction", "Construction phases and progress", "Add a phase, track progress and dates, and delete one.", 3, [
    { go: "/admin/construction/new", say: "A phase is one stage of construction, like foundation or structure." },
    { find: ["project"], say: "Which project." },
    { find: ["phase name"], say: "The stage's name.", example: "Foundation" },
    { find: ["order"], say: "Where it comes in the sequence.", example: "1" },
    { find: ["status"], say: "Not started, in progress, completed…" },
    { find: ["planned start"], say: "When it should start." },
    { find: ["planned target"], say: "When it should end. Past this date and not done, it counts as delayed." },
    { find: ["progress"], say: "How far along it is. Owners see this in the app.", example: "40" },
    { find: ["add phase"], say: "Press Add Phase." },
    { go: "/admin/construction", find: ["delete"], say: "Phases can be deleted from their page.", careful: DELETE_NOTE },
  ]),

  lesson("staff", "Add a staff member and set a role", "Create an account, choose what that person can do, and remove one.", 3, [
    { go: "/admin/users/new", say: "Each person who works in the panel gets their own account." },
    { find: ["name"], say: "Their name.", example: "Sales Manager" },
    { find: ["email"], say: "Their sign-in email." },
    { find: ["phone"], say: "Optional phone." },
    { find: ["role"], say: "What they may see and change. See Roles / Permissions for exactly what each role allows." },
    { find: ["status"], say: "Active lets them sign in; suspend to lock them out without deleting." },
    { find: ["create", "save", "add"], say: "Save. Then give them their sign-in details." },
    { go: "/admin/roles", say: "Roles / Permissions: a read-only list of what every role can do." },
    { go: "/admin/users", find: ["delete"], say: "Accounts can be deleted from the list.", careful: DELETE_NOTE },
  ]),

  lesson("safety", "Backup, restore and remove demo data", "Keep your data safe, bring it back, and start clean.", 3, [
    { go: "/admin/settings/backup", say: "Backup & Restore: your safety net." },
    { find: ["full backup"], say: "Everything, including every uploaded picture and document. Larger file." },
    { find: ["data only"], say: "Every record without images. Smaller and faster." },
    { find: ["restore"], say: "Restore replaces ALL current data with a backup file. Anything added since is lost.", careful: "Use only if something went badly wrong, and only with the right backup file." },
    { go: "/admin/settings/demo-data", say: "Remove demo data: clears the practice data so you can start with your real business. Super Admin only." },
    { find: ["backup"], say: "Download a backup first. This cannot be undone." },
    { find: ["remove all demo data"], say: "The red button stays locked until you tick the box and type the phrase.", careful: "This removes real records. Press it only when you are ready to start fresh." },
  ]),
];

/**
 * The whole-panel demo: Simba creates a sample project, a budget line, an expense, a construction phase, a customer, a website project
 * with blueprints, a website listing and a news article — and then deletes every one of them again, newest first, and finally sweeps
 * up anything left. Every record is named "Simba Demo …". It runs by itself, a new step every 3 seconds, and can be paused at any time.
 */
const pressNote = "Simba presses this itself.";

const FULL_DEMO_STEPS: TourStep[] = [
  { go: "/admin", say: "This demo runs the real panel from start to finish: it adds sample records, shows each page, then deletes everything it added. Pause any time." },
  // 1. project
  { go: "/admin/projects/new", say: "1/8 · A new project. Simba types each field." },
  { find: ["name"], say: "Name of the project.", value: "Simba Demo Heights" },
  { find: ["code"], say: "A unique code.", value: "SD-01" },
  { find: ["description"], say: "What the project is.", value: "A sample project created by Simba for the demo." },
  { find: ["status"], say: "Its status.", value: "Ongoing" },
  { find: ["sales status"], say: "Whether it is being sold yet.", value: "Open" },
  { find: ["address"], say: "The address.", value: "House 12, Road 5, Gulshan 2" },
  { find: ["city"], say: "The city.", value: "Dhaka" },
  { find: ["property type"], say: "The kind of project.", value: "Residential apartment" },
  { find: ["cover image"], say: "A cover picture.", file: sample("sample-cover-photo.webp", "Sample cover photo"), upload: true },
  { find: ["create project"], say: "Create Project. " + pressNote, click: true, dwell: 4500 },
  // 2. budget
  { go: "/admin/finance/project-costs/new", say: "2/8 · A budget line for that project: planned money for one kind of cost." },
  { find: ["project"], say: "Simba picks the demo project.", value: "Simba Demo" },
  { find: ["category"], say: "What the money is for.", value: "Simba Demo Structure" },
  { find: ["budgeted"], say: "The planned amount.", value: "5000000" },
  { find: ["add", "save", "create"], say: "Save the budget line. " + pressNote, click: true, dwell: 4000 },
  // 3. expense
  { go: "/admin/finance/expenses/new", say: "3/8 · An expense: real money spent on the project." },
  { find: ["project"], say: "The demo project again.", value: "Simba Demo" },
  { find: ["description"], say: "What was bought.", value: "Simba Demo cement, 200 bags" },
  { find: ["amount"], say: "How much.", value: "180000" },
  { find: ["date"], say: "When.", value: "2026-11-10" },
  { find: ["record expense"], say: "Record Expense. " + pressNote, click: true, dwell: 4000 },
  // 4. construction
  { go: "/admin/construction/new", say: "4/8 · A construction phase: what owners see as progress." },
  { find: ["project"], say: "The demo project.", value: "Simba Demo" },
  { find: ["phase name"], say: "The stage.", value: "Simba Demo Foundation" },
  { find: ["order"], say: "Its place in the sequence.", value: "1" },
  { find: ["status"], say: "Where it stands.", value: "@first" },
  { find: ["progress"], say: "How far along.", value: "40" },
  { find: ["add phase"], say: "Add Phase. " + pressNote, click: true, dwell: 4000 },
  // 5. customer
  { go: "/admin/customers/new", say: "5/8 · A customer, who could later own a flat and sign in to the client app." },
  { find: ["name"], say: "Their name.", value: "Simba Demo Rahim" },
  { find: ["email"], say: "Their email.", value: "simba.demo@example.com" },
  { find: ["phone"], say: "Their phone.", value: "01700000000" },
  { find: ["status"], say: "Active.", value: "@first" },
  { find: ["create customer"], say: "Create Customer. " + pressNote, click: true, dwell: 4500 },
  // 6. website project
  { go: "/admin/content/projects/new", say: "6/8 · The same project on the public website, with its three blueprints." },
  { find: ["name"], say: "Public name.", value: "Simba Demo Heights" },
  { find: ["display location"], say: "Area shown to visitors.", value: "Gulshan 2, Dhaka" },
  { find: ["city"], say: "City.", value: "Dhaka" },
  { find: ["project type"], say: "Type.", value: "@first" },
  { find: ["status"], say: "Status.", value: "@first" },
  { find: ["short description"], say: "One line for the list.", value: "A calm, well-planned apartment building in Gulshan." },
  { find: ["description"], say: "The full text.", value: "Simba Demo Heights is a sample project used to show how the website looks." },
  { find: ["cover photo"], say: "Cover photo.", file: sample("sample-cover-photo.webp", "Sample cover photo"), upload: true },
  { find: ["garage blueprint"], say: "Garage blueprint.", file: sample("building-garage.svg", "Sample garage blueprint"), upload: true },
  { find: ["floor blueprint"], say: "Floor blueprint.", file: sample("building-floor.svg", "Sample floor blueprint"), upload: true },
  { find: ["roof blueprint"], say: "Roof blueprint.", file: sample("building-roof.svg", "Sample roof blueprint"), upload: true },
  { find: ["publish project"], say: "Publish Project. " + pressNote, click: true, dwell: 5000 },
  // 7. website property
  { go: "/admin/content/properties/new", say: "7/8 · A flat listed for sale on the website." },
  { find: ["name"], say: "Listing name.", value: "Simba Demo Flat A-1" },
  { find: ["project"], say: "Its project.", value: "@first" },
  { find: ["unit type"], say: "Kind of unit.", value: "Apartment" },
  { find: ["status"], say: "Status.", value: "@first" },
  { find: ["short description"], say: "One line.", value: "A bright three-bedroom flat with two balconies." },
  { find: ["description"], say: "Full text.", value: "Simba Demo Flat A-1 is a sample listing used to show a property page." },
  { find: ["floor plan"], say: "The flat's plan.", file: sample("plan-3bed-detailed.svg", "Sample 3-bedroom plan"), upload: true },
  { find: ["publish"], say: "Publish. " + pressNote, click: true, dwell: 4500 },
  // 8. news
  { go: "/admin/content/news/new", say: "8/8 · A news article." },
  { find: ["title"], say: "Headline.", value: "Simba Demo: foundation laid" },
  { find: ["category"], say: "Category.", value: "@first" },
  { find: ["date"], say: "Date.", value: "2026-11-10" },
  { find: ["excerpt"], say: "Summary.", value: "A sample article that shows how news looks." },
  { find: ["content"], say: "Full text.", value: "A sample article written by Simba. It is deleted at the end of the demo." },
  { find: ["publish article"], say: "Publish Article. " + pressNote, click: true, dwell: 4500 },
  // clean-up: newest first
  { go: "/admin/content/news", find: ["delete"], say: "Now the clean-up. First the demo article — only the row named Simba Demo.", del: true, dwell: 4000 },
  { go: "/admin/content/properties", find: ["delete"], say: "The demo website listing.", del: true, dwell: 4000 },
  { go: "/admin/content/projects", find: ["delete"], say: "The demo website project.", del: true, dwell: 4000 },
  { go: "/admin/customers/{demoCustomer}", find: ["delete"], say: "The demo customer.", del: true, dwell: 4000 },
  { go: "/admin/construction", find: ["delete"], say: "The demo construction phase.", del: true, dwell: 4000 },
  { go: "/admin/finance/expenses", find: ["delete"], say: "The demo expense.", del: true, dwell: 4000 },
  { go: "/admin/finance/project-costs", find: ["delete"], say: "The demo budget line.", del: true, dwell: 4000 },
  { go: "/admin/projects/{demoProject}", find: ["delete"], say: "Finally the demo project itself.", del: true, dwell: 4500 },
  { go: "/admin/projects", say: "A last sweep removes anything left over that is named Simba Demo, so nothing stays behind.", cleanup: true, dwell: 4000 },
  { say: "Done. You watched a project, money, construction, a customer and the website being filled in — and removed again. Real records were never touched." },
];

export const FULL_DEMO: Lesson = {
  id: "full-demo",
  title: "Watch Simba run the whole panel",
  summary: "Adds a sample project, budget, expense, construction phase, customer, website project and listing, and news — then deletes them all.",
  minutes: 6,
  startHref: "/admin",
  steps: FULL_DEMO_STEPS,
  doable: true,
};

export interface SampleFile {
  name: string;
  label: string;
  /** Where to use it. */
  use: string;
}

/** Practice files, kept in /public/simba-demo/ so they are always there (the uploads folder is not stored in the repository). */
export const SAMPLE_FILES: SampleFile[] = [
  { name: "sample-cover-photo.webp", label: "Cover photo", use: "Project or property cover photo, news cover" },
  { name: "sample-gallery-photo.png", label: "Gallery photo", use: "Project gallery, Gallery page" },
  { name: "sample-logo.webp", label: "Logo", use: "Settings → Logo" },
  { name: "sample-portrait.jpg", label: "Portrait photo", use: "Founder profile, team member" },
  { name: "building-garage.svg", label: "Garage blueprint", use: "Website project → Garage blueprint" },
  { name: "building-floor.svg", label: "Floor blueprint", use: "Website project → Floor blueprint" },
  { name: "building-roof.svg", label: "Roof blueprint", use: "Website project → Roof blueprint" },
  { name: "plan-2bed.svg", label: "2-bedroom flat plan", use: "Property floor plan, blueprint type" },
  { name: "plan-3bed.svg", label: "3-bedroom flat plan", use: "Property floor plan, blueprint type" },
  { name: "plan-3bed-detailed.svg", label: "3-bedroom flat plan (detailed)", use: "Property floor plan with room buttons" },
  { name: "plan-commercial.svg", label: "Commercial unit plan", use: "Commercial property floor plan" },
  { name: "plan-plot.svg", label: "Plot outline", use: "Plot or land listing" },
  { name: "real-typical-floor.svg", label: "Real typical floor (whole floor)", use: "Project → Floor plans" },
  { name: "real-ground-floor.svg", label: "Real ground floor", use: "Project → Floor plans (ground floor)" },
];
