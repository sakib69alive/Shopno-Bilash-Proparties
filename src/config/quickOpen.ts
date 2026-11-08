import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  Car,
  Compass,
  CreditCard,
  FileStack,
  FileText,
  HardHat,
  HandCoins,
  Home,
  Images,
  LayoutGrid,
  MapPin,
  Megaphone,
  MessageSquareText,
  Milestone,
  Newspaper,
  PhoneCall,
  Palette,
  Plus,
  Receipt,
  ScrollText,
  Share2,
  Sparkles,
  SplitSquareVertical,
  Star,
  UserCog,
  UserPlus,
  Users,
  Video,
  Wallet,
  Frame,
  ImageIcon,
  PenLine,
  CalendarClock,
  Settings,
  BarChart3,
  MapPinned,
  KeyRound,
  Link2,
} from "lucide-react";
import type { Permission } from "./permissions";

/**
 * What a quick button needs picked before it can go anywhere.
 *  - "none"        → goes straight there
 *  - "webProject"  → a project as it appears on the public website (Website → Projects)
 *  - "webProperty" → a property listed on the public website (Website → Properties)
 *  - "project"     → a real project in the business records (Projects)
 *  - "client"      → one customer / shareholder / landowner
 *
 * The two kinds of "project" are separate records in this app on purpose
 * (the website's content is not linked to the internal books), so each
 * button says which one it opens.
 */
export type QuickNeed = "none" | "webProject" | "webProperty" | "project" | "client" | "unit" | "sale";

export interface QuickItem {
  id: string;
  label: string;
  /** One short line shown under the label. */
  hint: string;
  icon: LucideIcon;
  need: QuickNeed;
  /**
   * Where it goes. `{id}` is replaced by the picked record's id.
   * For `need: "client"` use `{path}` for the client's own section
   * (`customers`, `shareholders` or `landowners`) and `{id}` for the record.
   */
  href: string;
  permission?: Permission;
  /** Only makes sense for a customer (shareholders and landowners are not offered it). */
  customerOnly?: boolean;
  /** Lets the admin tick several customers instead of one; `{ids}` in `href` becomes their ids, comma-separated. */
  multi?: boolean;
}

export interface QuickSection {
  title: string;
  /** Plain-words explanation shown above the buttons. */
  blurb: string;
  items: QuickItem[];
}

export const NEED_LABELS: Record<Exclude<QuickNeed, "none">, { question: string; placeholder: string }> = {
  webProject: { question: "Which project (as shown on the public website)?", placeholder: "Choose a project" },
  webProperty: { question: "Which property (as shown on the public website)?", placeholder: "Choose a property" },
  project: { question: "Which project?", placeholder: "Choose a project" },
  client: { question: "Which client?", placeholder: "Choose a client" },
  unit: { question: "Which flat?", placeholder: "Choose a flat" },
  sale: { question: "Which sale (flat and buyer)?", placeholder: "Choose a sale" },
};

/** Everything on the public website that the admin panel controls, grouped by what you are trying to change. */
export const PUBLIC_PAGE_SECTIONS: QuickSection[] = [
  {
    title: "A project's public page",
    blurb: "Pick what you want to change, choose the project, and you land on exactly that part of its page editor.",
    items: [
      { id: "wp-details", label: "Project text & facts", hint: "Name, location, description, units, parking, amenities", icon: PenLine, need: "webProject", href: "/admin/content/projects/{id}/edit", permission: "content.update" },
      { id: "wp-blueprint", label: "Blueprint", hint: "Garage, floor and roof plans + room buttons", icon: Frame, need: "webProject", href: "/admin/content/projects/{id}/edit#blueprints", permission: "content.update" },
      { id: "wp-photos", label: "Cover photo & gallery", hint: "The photos on the Projects list and page", icon: ImageIcon, need: "webProject", href: "/admin/content/projects/{id}/edit#photos", permission: "content.update" },
      { id: "wp-map", label: "Map", hint: "Google Maps link or coordinates", icon: MapPin, need: "webProject", href: "/admin/content/projects/{id}/edit#map", permission: "content.update" },
      { id: "wp-media", label: "Video & 360° tour", hint: "Video and virtual-tour links", icon: Video, need: "webProject", href: "/admin/content/projects/{id}/edit#media", permission: "content.update" },
      { id: "wp-featured", label: "Featured on the website", hint: "Show or hide it as a featured development", icon: Star, need: "webProject", href: "/admin/content/projects/{id}/edit#featured", permission: "content.update" },
      { id: "wp-construction", label: "Construction progress", hint: "Phases and updates shown on the project's construction page", icon: HardHat, need: "project", href: "/admin/projects/{id}/construction", permission: "construction.view" },
      { id: "wp-units", label: "This project's flats", hint: "See and edit the flats listed under it", icon: Home, need: "webProject", href: "/admin/content/properties?project={slug}", permission: "content.view" },
      { id: "wp-bulk-units", label: "Add flats in bulk", hint: "List many flats of one project at once", icon: Plus, need: "webProject", href: "/admin/content/properties/bulk?project={slug}", permission: "content.create" },
    ],
  },
  {
    title: "A property's public page",
    blurb: "A flat or whole building listed on the Properties page.",
    items: [
      { id: "pp-details", label: "Property text & price", hint: "Name, status, beds, baths, area, price, amenities", icon: PenLine, need: "webProperty", href: "/admin/content/properties/{id}/edit", permission: "content.update" },
      { id: "pp-plan", label: "Floor plan", hint: "The blueprint beside beds / baths / size / price + room buttons", icon: Frame, need: "webProperty", href: "/admin/content/properties/{id}/edit#photos-plan", permission: "content.update" },
      { id: "pp-photos", label: "Cover photo & gallery", hint: "Photos on the property page", icon: ImageIcon, need: "webProperty", href: "/admin/content/properties/{id}/edit#photos-plan", permission: "content.update" },
    ],
  },
  {
    title: "Whole website",
    blurb: "Things that are not tied to one project — no choice needed, one click.",
    items: [
      { id: "w-home-logo", label: "Logo & company name", hint: "Header logo and how it shows", icon: Sparkles, need: "none", href: "/admin/settings/edit#logo", permission: "settings.manage" },
      { id: "w-contact", label: "Contact details", hint: "Phone, WhatsApp, email, address, opening hours", icon: PhoneCall, need: "none", href: "/admin/settings/edit#contact", permission: "settings.manage" },
      { id: "w-social", label: "Social media links", hint: "Facebook, Instagram, YouTube and the rest", icon: Share2, need: "none", href: "/admin/settings/edit#social", permission: "settings.manage" },
      { id: "w-impact", label: "“Our Impact” numbers", hint: "The big figures on the home page", icon: BarChart3, need: "none", href: "/admin/settings/edit#impact", permission: "settings.manage" },
      { id: "w-founder", label: "Founder profile", hint: "Photo, message and the Founder page", icon: UserCog, need: "none", href: "/admin/content/founder/edit", permission: "content.update" },
      { id: "w-story", label: "Our Story timeline", hint: "Company milestones", icon: Milestone, need: "none", href: "/admin/content/story", permission: "content.view" },
      { id: "w-story-new", label: "Add a milestone", hint: "A new entry on the timeline", icon: Plus, need: "none", href: "/admin/content/story/new", permission: "content.create" },
      { id: "w-team", label: "Team & partners", hint: "People shown on the About page", icon: Users, need: "none", href: "/admin/content/team", permission: "content.view" },
      { id: "w-team-new", label: "Add a team member", hint: "Add a person or partner", icon: UserPlus, need: "none", href: "/admin/content/team/new", permission: "content.create" },
      { id: "w-pages", label: "Page texts", hint: "About, Services, Landowners, Contact… wording", icon: FileStack, need: "none", href: "/admin/content/pages", permission: "content.view" },
      { id: "w-policy", label: "Company policy", hint: "The rules shown on the Policy page", icon: ScrollText, need: "none", href: "/admin/content/policy", permission: "content.view" },
      { id: "w-policy-new", label: "Add a policy rule", hint: "A new rule on the Policy page", icon: Plus, need: "none", href: "/admin/content/policy/new", permission: "content.create" },
      { id: "w-news", label: "News", hint: "All articles", icon: Newspaper, need: "none", href: "/admin/content/news", permission: "content.view" },
      { id: "w-news-new", label: "Write a news article", hint: "Publish something new", icon: Plus, need: "none", href: "/admin/content/news/new", permission: "content.create" },
      { id: "w-gallery", label: "Gallery", hint: "All photos", icon: Images, need: "none", href: "/admin/content/gallery", permission: "content.view" },
      { id: "w-gallery-add", label: "Add photos to the gallery", hint: "Upload many at once", icon: Plus, need: "none", href: "/admin/content/gallery/bulk", permission: "content.create" },
      { id: "w-projects", label: "All website projects", hint: "Order, add, remove projects on the site", icon: Building2, need: "none", href: "/admin/content/projects", permission: "content.view" },
      { id: "w-project-new", label: "Add a project to the website", hint: "A new public project page", icon: Plus, need: "none", href: "/admin/content/projects/new", permission: "content.create" },
      { id: "w-properties", label: "All website properties", hint: "Flats and buildings listed for sale", icon: Home, need: "none", href: "/admin/content/properties", permission: "content.view" },
      { id: "w-property-new", label: "Add a property", hint: "List one flat or a whole building", icon: Plus, need: "none", href: "/admin/content/properties/new", permission: "content.create" },
      { id: "w-enquiries", label: "Enquiries from the website", hint: "Messages people sent through the contact form", icon: MessageSquareText, need: "none", href: "/admin/leads", permission: "lead.view" },
      { id: "w-content-home", label: "Everything in Website Content", hint: "The full content index", icon: LayoutGrid, need: "none", href: "/admin/content", permission: "content.view" },
    ],
  },
];

/** Everything the client app (the owner portal) shows, and the admin screens that feed it. */
export const CLIENT_PAGE_SECTIONS: QuickSection[] = [
  {
    title: "A project in the client app",
    blurb: "Pick what you want to manage, choose the project, and you land on that tab of the project.",
    items: [
      { id: "cp-plans", label: "Blueprint / floor plans", hint: "Each floor, with every flat marked — the owner's flat lights up", icon: Frame, need: "project", href: "/admin/projects/{id}/floor-plans", permission: "project.update" },
      { id: "cp-distribute", label: "Give flats to owners", hint: "Drag flats onto the owners who bought them", icon: Compass, need: "project", href: "/admin/projects/{id}/distribute", permission: "unit.view" },
      { id: "cp-owners", label: "Owners", hint: "Who owns what in this project", icon: Users, need: "project", href: "/admin/projects/{id}/owners" },
      { id: "cp-units", label: "Flats / units", hint: "Every flat, its size and status", icon: Home, need: "project", href: "/admin/projects/{id}/units", permission: "unit.view" },
      { id: "cp-parking", label: "Parking", hint: "Parking spots and who has them", icon: Car, need: "project", href: "/admin/projects/{id}/parking" },
      { id: "cp-payments", label: "Payments", hint: "What owners paid and what is due", icon: Wallet, need: "project", href: "/admin/projects/{id}/payments", permission: "finance.view" },
      { id: "cp-construction", label: "Construction updates", hint: "Progress owners see on their Construction tab", icon: HardHat, need: "project", href: "/admin/projects/{id}/construction", permission: "construction.view" },
      { id: "cp-documents", label: "Documents", hint: "Papers owners can open and download", icon: FileText, need: "project", href: "/admin/projects/{id}/documents", permission: "documents.view" },
      { id: "cp-reports", label: "Project reports", hint: "Numbers for this project", icon: BarChart3, need: "project", href: "/admin/projects/{id}/reports", permission: "reports.view" },
      { id: "cp-settings", label: "Project settings", hint: "Name, status and details of the project", icon: Settings, need: "project", href: "/admin/projects/{id}/edit", permission: "project.update" },
    ],
  },
  {
    title: "One client",
    blurb: "Choose a customer, shareholder or landowner to reach their profile, app login and the WhatsApp link.",
    items: [
      { id: "c-profile", label: "Open client profile", hint: "Everything about this person", icon: Users, need: "client", href: "/admin/{path}/{id}" },
      { id: "c-link", label: "Phone login & WhatsApp link", hint: "Give or switch off access to the client app", icon: Link2, need: "client", href: "/admin/{path}/{id}", permission: "users.manage" },
      { id: "c-edit", label: "Edit client details", hint: "Name, phone, email, address", icon: PenLine, need: "client", href: "/admin/{path}/{id}/edit" },
      { id: "c-doc", label: "Add a document for them", hint: "A paper they will see in the app — one client or many", icon: FileText, need: "client", href: "/admin/documents/send?ids={ids}", permission: "documents.upload", customerOnly: true, multi: true },
      { id: "c-pay", label: "Record a payment from them", hint: "Customers only — adds to their payment history", icon: Wallet, need: "client", href: "/admin/sales/payments/new?customerId={id}", permission: "finance.manage", customerOnly: true },
      { id: "c-notice", label: "Send a notice or receipt", hint: "Customers only — opens the statement studio for them", icon: Megaphone, need: "client", href: "/admin/statements?customerId={id}", permission: "reports.view", customerOnly: true },
    ],
  },
  {
    title: "All clients & the app",
    blurb: "Things that are not tied to one project or person.",
    items: [
      { id: "g-overview", label: "Clients overview", hint: "Every client, their budget and what they paid", icon: Users, need: "none", href: "/admin/clients", permission: "customer.view" },
      { id: "g-home-look", label: "App home-screen look", hint: "Cream, blue or blue-grid blueprint background", icon: Palette, need: "none", href: "/admin/settings/edit#client-look", permission: "settings.manage" },
      { id: "g-notice", label: "Send a notice / receipt", hint: "Statements & Notices studio", icon: Megaphone, need: "none", href: "/admin/statements", permission: "reports.view" },
      { id: "g-notif-new", label: "Send a notification", hint: "A message that appears in the app", icon: Bell, need: "none", href: "/admin/notifications/new", permission: "notifications.manage" },
      { id: "g-notif", label: "Notifications", hint: "All messages already sent", icon: Bell, need: "none", href: "/admin/notifications", permission: "notifications.view" },
      { id: "g-docs", label: "Documents", hint: "All documents owners can see", icon: FileText, need: "none", href: "/admin/documents", permission: "documents.view" },
      { id: "g-doc-new", label: "Upload a document", hint: "Add a paper for a client or project", icon: Plus, need: "none", href: "/admin/documents/new", permission: "documents.upload" },
      { id: "g-pay-new", label: "Record a payment", hint: "A payment a client made", icon: Wallet, need: "none", href: "/admin/sales/payments/new", permission: "finance.manage" },
      { id: "g-payments", label: "Payments received", hint: "Every payment on record", icon: CreditCard, need: "none", href: "/admin/sales/payments", permission: "finance.view" },
      { id: "g-install", label: "Installments", hint: "Due dates and what is overdue", icon: CalendarClock, need: "none", href: "/admin/sales/installments", permission: "sales.view" },
      { id: "g-budgets", label: "Budgets & cost splits", hint: "What each owner pays towards a project", icon: SplitSquareVertical, need: "none", href: "/admin/finance/cost-allocations", permission: "finance.view" },
      { id: "g-budget-new", label: "New budget split", hint: "Split a cost across owners", icon: Plus, need: "none", href: "/admin/finance/cost-allocations/new", permission: "finance.manage" },
      { id: "g-sales", label: "Sales", hint: "Which client bought which flat", icon: Receipt, need: "none", href: "/admin/sales", permission: "sales.view" },
      { id: "g-customers", label: "Customers", hint: "List of customers", icon: Users, need: "none", href: "/admin/customers", permission: "customer.view" },
      { id: "g-customer-new", label: "Add a client", hint: "A new customer", icon: UserPlus, need: "none", href: "/admin/customers/new", permission: "customer.create" },
      { id: "g-shareholders", label: "Shareholders", hint: "List of shareholders", icon: HandCoins, need: "none", href: "/admin/shareholders", permission: "shareholder.view" },
      { id: "g-shareholder-new", label: "Add a shareholder", hint: "A new shareholder", icon: UserPlus, need: "none", href: "/admin/shareholders/new", permission: "shareholder.manage" },
      { id: "g-landowners", label: "Landowners", hint: "List of landowners", icon: MapPinned, need: "none", href: "/admin/landowners", permission: "landowner.view" },
      { id: "g-landowner-new", label: "Add a landowner", hint: "A new landowner", icon: UserPlus, need: "none", href: "/admin/landowners/new", permission: "landowner.manage" },
      { id: "g-accounts", label: "App logins (staff & users)", hint: "Accounts that can sign in", icon: KeyRound, need: "none", href: "/admin/users", permission: "users.view" },
      { id: "g-bp-ai", label: "Blueprint AI", hint: "Make floor-plan drawings the app can use", icon: Sparkles, need: "none", href: "/admin/settings/blueprint-ai", permission: "settings.manage" },
      { id: "g-bp-control", label: "Blueprint control panel", hint: "Check and fix plan drawings", icon: Frame, need: "none", href: "/admin/settings/blueprint-ai/control", permission: "settings.manage" },
      { id: "g-bp-dist", label: "Blueprint distribution", hint: "Which plans go to which building", icon: LayoutGrid, need: "none", href: "/admin/settings/blueprint-ai/distribution", permission: "settings.manage" },
    ],
  },
];
