/**
 * Walk-throughs: Simba takes you to a page, outlines the real button to press, says what to do, and waits for "Next".
 * `find` is a list of words to look for in the text of a visible button, link or heading (first match wins, case does not matter).
 * If nothing matches — a page changed, or the button is behind a menu — the step is still shown as a plain note, never an error.
 */
export interface TourStep {
  /** Open this page first. `{project}`, `{customer}`, `{unit}`, `{sale}`, `{webProject}`, `{webUnit}` become the first real record of that kind; with none, the step is shown without moving. */
  go?: string;
  /** A CSS selector to outline (for something with no fixed name, like the first flat in a list). */
  sel?: string;
  /** A value worth typing here while learning, e.g. a sample name. */
  example?: string;
  /** A sample file to use here — a file name inside /simba-demo/. */
  file?: { name: string; label: string };
  /** Demo mode: type this into the outlined field, or choose the option whose text contains it ("@first" = the first real option). Names carry "Simba Demo" so the demo's records can be found and deleted again. */
  value?: string;
  /** Demo mode: put the sample file (`file`) into the outlined upload field. */
  upload?: boolean;
  /** Demo mode: press the outlined button (for example Create). */
  click?: boolean;
  /** Demo mode: delete the demo record — only a row whose name carries "Simba Demo" is ever pressed. */
  del?: boolean;
  /** Demo mode: ask the server to remove every record marked "Simba Demo" (the safety net at the end of a demo). */
  cleanup?: boolean;
  /** Only in "Do it for me" mode (steps that need the demo records to exist). */
  autoOnly?: boolean;
  /** Milliseconds to stay on this step in autoplay (default 3000). */
  dwell?: number;
  /** A warning shown in red: the thing outlined deletes or cannot be undone. Simba only points at it, never presses it. */
  careful?: string;
  /** An exact link address to outline (used by the full tour so two links with the same name are never mixed up). */
  href?: string;
  find?: string[];
  say: string;
}

export interface Tour {
  id: string;
  title: string;
  startHref: string;
  steps: TourStep[];
}

export const TOURS: Record<string, Tour> = {
  company: {
    id: "company",
    title: "Fill in the company profile",
    startHref: "/admin/settings",
    steps: [
      { find: ["edit"], say: "Press Edit to open the company form." },
      { find: ["logo"], say: "Upload your logo here and set how it shows." },
      { find: ["contact"], say: "Enter phone, WhatsApp, email and address — these appear on the website and on every notice." },
      { find: ["save"], say: "Press Save at the bottom. The red dot on Settings disappears once it is filled." },
    ],
  },
  team: {
    id: "team",
    title: "Add a team member",
    startHref: "/admin/users",
    steps: [
      { find: ["new account", "new user"], say: "Press New Account." },
      { find: ["role"], say: "Choose a role. It decides what this person can see and change." },
      { find: ["save", "create"], say: "Save, then give them their sign-in details." },
    ],
  },
  project: {
    id: "project",
    title: "Create your first project",
    startHref: "/admin/projects",
    steps: [
      { find: ["new project"], say: "Press New Project." },
      { find: ["name"], say: "Type the project's name, then fill the address and city." },
      { find: ["status"], say: "Choose its status (for example Ongoing)." },
      { find: ["save", "create"], say: "Save. You land inside the project, where the tabs are." },
    ],
  },
  structure: {
    id: "structure",
    title: "Build buildings, floors and units",
    startHref: "/admin/projects",
    steps: [
      { find: ["meridian", "residence", "tower", "heights", "view"], say: "Open your project from the list." },
      { find: ["units"], say: "Open the Units tab." },
      { find: ["generate structure", "add building"], say: "Add a building — or use Generate Structure to add all floors and flats at once." },
      { find: ["add floor"], say: "Add floors if you did not generate them." },
      { say: "Open each flat and enter its size, rooms and base price. Without a price, sales and installments cannot work." },
    ],
  },
  plans: {
    id: "plans",
    title: "Upload floor plans",
    startHref: "/admin/client-page",
    steps: [
      { find: ["blueprint / floor plans"], say: "Press this button, choose the project, then Go." },
      { say: "Upload the typical floor drawing, then mark each flat's area on it and Save." },
    ],
  },
  clients: {
    id: "clients",
    title: "Add a customer",
    startHref: "/admin/customers",
    steps: [
      { find: ["new customer"], say: "Press New Customer." },
      { find: ["phone"], say: "Enter their phone — it is used for the client app sign-in." },
      { find: ["save", "create"], say: "Save." },
    ],
  },
  owners: {
    id: "owners",
    title: "Give flats to owners",
    startHref: "/admin/client-page",
    steps: [
      { find: ["give flats to owners"], say: "Press this button, choose the project, then Go." },
      { say: "Drag each flat onto its owner. A flat only shows in someone's app after this." },
    ],
  },
  sales: {
    id: "sales",
    title: "Record a sale",
    startHref: "/admin/sales",
    steps: [
      { find: ["record sale", "new sale"], say: "Open the sale form." },
      { find: ["customer"], say: "Choose the customer." },
      { find: ["unit", "flat"], say: "Choose the flat. Its base price fills in for you." },
      { find: ["record sale", "save"], say: "Save the sale." },
    ],
  },
  installments: {
    id: "installments",
    title: "Set up installments",
    startHref: "/admin/sales/installments",
    steps: [
      { find: ["new"], say: "Press New to add a due payment." },
      { find: ["sale"], say: "Choose the sale (flat and buyer)." },
      { find: ["due"], say: "Enter the due date and the amount." },
      { find: ["save", "create"], say: "Save. Repeat for each due payment." },
    ],
  },
  payments: {
    id: "payments",
    title: "Record a payment",
    startHref: "/admin/sales/payments",
    steps: [
      { find: ["record payment"], say: "Press Record Payment." },
      { find: ["sale", "customer"], say: "Choose who paid and for which sale." },
      { find: ["amount"], say: "Enter the amount, date and method." },
      { find: ["save", "record"], say: "Save. Then send a receipt from Send a notice / receipt." },
    ],
  },
  website: {
    id: "website",
    title: "Fill the public website",
    startHref: "/admin/public-page",
    steps: [
      { find: ["project text & facts"], say: "Start with a project: press this, choose the project, then Go." },
      { find: ["blueprint"], say: "Then its blueprint, photos and map from the buttons nearby." },
      { find: ["write a news article", "news"], say: "Add news and gallery photos from Whole website below." },
      { say: "Open your website in another tab and refresh to check it." },
    ],
  },
  clientApp: {
    id: "clientApp",
    title: "Give a client access to the app",
    startHref: "/admin/client-page",
    steps: [
      { find: ["phone login & whatsapp link"], say: "Press this, choose the client, then Go." },
      { say: "On their profile, turn on their personal link or set a phone login, then press the WhatsApp button to send it." },
    ],
  },
};

/** The one-minute welcome for someone who has never used the panel. */
export const WELCOME_TOUR: Tour = {
  id: "welcome",
  title: "A one-minute tour",
  startHref: "/admin",
  steps: [
    { find: ["dashboard"], say: "Dashboard: today's numbers and urgent things, always live." },
    { find: ["public page"], say: "Public page: a button for every part of the website. Change anything on the site from here." },
    { find: ["client page"], say: "Client page: everything the client app shows — plans, owners, access links." },
    { find: ["money page"], say: "Money page: payments, installments, budgets, expenses and reports. Most used on top." },
    { find: ["record a payment"], say: "Do it now: the jobs you will do most often." },
    { find: ["projects"], say: "Projects: each development, with its buildings, floors and flats inside." },
    { find: ["help & documentation"], say: "Help: the full written guide for every page." },
    { say: "And I am always here, bottom right. Press me for what to do next, what this page is, or to explain anything you click." },
  ],
};
