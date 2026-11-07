import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Home,
  HardHat,
  Users,
  Receipt,
  Wallet,
  CalendarClock,
  PiggyBank,
  Landmark,
  UserCog,
  MessageSquareText,
  FileText,
  Bell,
  Newspaper,
  Images,
  FileStack,
  BarChart3,
  LineChart,
  Settings,
  ShieldCheck,
  Truck,
  ShoppingCart,
  HandCoins,
  MapPinned,
  History,
  SplitSquareVertical,
  Boxes,
  Warehouse,
  Car,
  CreditCard,
  AlertTriangle,
  BookOpen,
  Milestone,
  ScrollText,
  DatabaseBackup,
  Sparkles,
  Megaphone,
  UserPlus,
} from "lucide-react";
import type { Permission } from "./permissions";

export interface NavItem {
  label: string;
  href: string;
  /** When set, the item is hidden unless the current role has this permission. */
  permission?: Permission;
  icon?: LucideIcon;
  /**
   * The route doesn't exist yet (ARCHITECTURE.md §2 marks it 📋 documented
   * only). Rendered visible-but-disabled with a "Coming soon" affordance
   * rather than either a broken Link or being hidden entirely — the brief
   * for this step is explicit that the full future information
   * architecture should be visible now, just not clickable.
   */
  comingSoon?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Public marketing header (ARCHITECTURE.md §10 Navigation).
 * Kept to 4 always-visible primary items so the header never feels
 * crowded; less-trafficked pages are grouped under `PUBLIC_NAV_MORE`
 * rather than flattened into one long bar (Step 3 brief §2).
 */
export const PUBLIC_NAV_PRIMARY: NavItem[] = [
  { label: "Projects", href: "/projects" },
  { label: "Properties", href: "/properties" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
];

/**
 * No longer a header dropdown — per public-site feedback #3, the desktop
 * "More ▾" button is gone, replaced by a direct link to the new Founder
 * profile page. All five of these routes are still reachable (mobile nav's
 * flat secondary list, and the footer's Explore/Company groups), so
 * nothing here goes dead, it just isn't a top-level desktop item anymore.
 */
export const PUBLIC_NAV_MORE: NavItem[] = [
  { label: "Construction", href: "/construction" },
  { label: "Landowners & JV", href: "/landowners" },
  // Same page as "Landowners & JV" — Step 12 built one unified partnership
  // page with two audiences, deep-linked to its investment section.
  { label: "Investment", href: "/landowners#investment" },
  { label: "Gallery", href: "/gallery" },
  // "Insights" renamed to "News" in Step 13, matching the built page's own
  // "News & Updates" identity.
  { label: "News", href: "/news" },
];

/** Replaces the desktop header's old "More" dropdown trigger. */
export const PUBLIC_NAV_FOUNDER: NavItem = { label: "Founder", href: "/founder" };

export const PUBLIC_PRIMARY_CTA: NavItem = {
  label: "Enquire",
  href: "/contact",
};

/**
 * Chapter 3 — one deliberately small information architecture, shared in
 * shape across all three owner-facing roles (Prompt 1 brief: "do not
 * create unnecessary menu items"). Each role's items point at its own
 * `/portal`, `/portal/shareholder`, `/portal/landowner` base path; the
 * pages behind them are shared components parameterized by `OwnerType`
 * (`features/ownerPortal/queries.ts`), not three separate implementations.
 */
/**
 * No `icon` field, unlike `NavItem` — these cross a Server → Client
 * Component boundary (`portal/layout.tsx` → `PortalShell`) as plain props,
 * and a `LucideIcon` component reference isn't serializable across that
 * boundary. `PortalShell` resolves its own icons client-side, keyed by
 * `label`.
 */
export interface OwnerNavItem {
  label: string;
  href: string;
}

function buildOwnerNav(base: string): OwnerNavItem[] {
  return [
    { label: "Home", href: base },
    { label: "My Property", href: `${base}/property` },
    { label: "Payments", href: `${base}/payments` },
    { label: "Construction", href: `${base}/construction` },
    { label: "Documents", href: `${base}/documents` },
    { label: "Notifications", href: `${base}/notifications` },
    { label: "Profile", href: `${base}/profile` },
  ];
}

/** Customer portal navigation. */
export const PORTAL_NAV: OwnerNavItem[] = buildOwnerNav("/portal");

/** Shareholder portal navigation. */
export const SHAREHOLDER_NAV: OwnerNavItem[] = buildOwnerNav("/portal/shareholder");

/** Landowner portal navigation. */
export const LANDOWNER_NAV: OwnerNavItem[] = buildOwnerNav("/portal/landowner");

/**
 * Admin sidebar, grouped by what the admin is trying to DO rather than by
 * which module the code lives in — the first group holds the jobs done most
 * often (a client paid, send a notice, split a new budget, add a client) so
 * none of them has to be hunted down under Sales / Reports / Finance. Every
 * route still lives at its original URL; only the grouping and wording here
 * changed. Items with no real permission domain are left ungated.
 */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Do it now",
    items: [
      { label: "Record a payment", href: "/admin/sales/payments/new", permission: "finance.manage", icon: Wallet },
      { label: "Send a notice / receipt", href: "/admin/statements", permission: "reports.view", icon: Megaphone },
      { label: "New budget split", href: "/admin/finance/cost-allocations/new", permission: "finance.manage", icon: SplitSquareVertical },
      { label: "Add a client", href: "/admin/customers/new", permission: "customer.create", icon: UserPlus },
    ],
  },
  {
    label: "Clients & partners",
    items: [
      { label: "Clients overview", href: "/admin/clients", permission: "customer.view", icon: Users },
      { label: "Customers", href: "/admin/customers", permission: "customer.view", icon: Users },
      { label: "Shareholders", href: "/admin/shareholders", permission: "shareholder.view", icon: HandCoins },
      { label: "Landowners", href: "/admin/landowners", permission: "landowner.view", icon: MapPinned },
      { label: "Leads / Enquiries", href: "/admin/leads", permission: "lead.view", icon: MessageSquareText },
      { label: "Bookings", href: "/admin/sales/bookings", permission: "sales.view", icon: CalendarClock },
      { label: "Sales", href: "/admin/sales", permission: "sales.view", icon: Receipt },
      { label: "Installments", href: "/admin/sales/installments", permission: "sales.view", icon: CalendarClock },
    ],
  },
  {
    label: "Projects",
    items: [
      { label: "Projects", href: "/admin/projects", permission: "project.view", icon: Building2 },
      { label: "Properties / Units", href: "/admin/properties", permission: "unit.view", icon: Home },
      { label: "Parking", href: "/admin/parking", permission: "parking.view", icon: Car },
      { label: "Construction", href: "/admin/construction", permission: "construction.view", icon: HardHat },
      { label: "Contractors", href: "/admin/construction/contractors", permission: "construction.view", icon: HardHat },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Payments received", href: "/admin/sales/payments", permission: "finance.view", icon: Wallet },
      { label: "Budgets & cost splits", href: "/admin/finance/cost-allocations", permission: "finance.view", icon: SplitSquareVertical },
      { label: "Project Finance", href: "/admin/finance/project-costs", permission: "finance.view", icon: Landmark },
      { label: "Expenses", href: "/admin/finance/expenses", permission: "finance.view", icon: PiggyBank },
      { label: "Accounts", href: "/admin/finance/accounts", permission: "finance.view", icon: CreditCard },
    ],
  },
  {
    label: "Materials",
    items: [
      { label: "Vendors", href: "/admin/procurement", permission: "procurement.view", icon: Truck },
      { label: "Purchases", href: "/admin/procurement/purchases", permission: "procurement.view", icon: ShoppingCart },
      { label: "Materials", href: "/admin/procurement/materials", permission: "procurement.view", icon: Boxes },
      { label: "Stock", href: "/admin/procurement/stock", permission: "procurement.view", icon: Warehouse },
    ],
  },
  {
    label: "Messages & follow-up",
    items: [
      { label: "Notifications", href: "/admin/notifications", permission: "notifications.view", icon: Bell },
      { label: "Reminders", href: "/admin/reminders", permission: "reminders.view", icon: CalendarClock },
      { label: "Alerts", href: "/admin/alerts", permission: "alerts.view", icon: AlertTriangle },
      { label: "Approvals", href: "/admin/approvals", permission: "approvals.view", icon: ShieldCheck },
      { label: "Documents", href: "/admin/documents", permission: "documents.view", icon: FileText },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Reports", href: "/admin/finance/reports", permission: "reports.view", icon: BarChart3 },
      { label: "Sales Overview", href: "/admin/sales/dashboard", permission: "sales.view", icon: LayoutDashboard },
      { label: "Sales Reports", href: "/admin/sales/reports", permission: "reports.view", icon: Receipt },
      { label: "Analytics", href: "/admin/analytics", permission: "reports.view", icon: LineChart },
      { label: "Activity Feed", href: "/admin/activity", permission: "reports.view", icon: History },
    ],
  },
  {
    label: "Website",
    items: [
      { label: "News", href: "/admin/content/news", permission: "content.view", icon: Newspaper },
      { label: "Gallery", href: "/admin/content/gallery", permission: "content.view", icon: Images },
      { label: "Projects", href: "/admin/content/projects", permission: "content.view", icon: Building2 },
      { label: "Properties", href: "/admin/content/properties", permission: "content.view", icon: Home },
      { label: "Founder Profile", href: "/admin/content/founder", permission: "content.view", icon: UserCog },
      { label: "Team & Partners", href: "/admin/content/team", permission: "content.view", icon: Users },
      { label: "Our Story", href: "/admin/content/story", permission: "content.view", icon: Milestone },
      { label: "Pages", href: "/admin/content/pages", permission: "content.view", icon: FileStack },
      { label: "Company Policy", href: "/admin/content/policy", permission: "content.view", icon: ScrollText },
    ],
  },
  {
    label: "Settings & staff",
    items: [
      { label: "Settings", href: "/admin/settings", permission: "settings.manage", icon: Settings },
      { label: "Staff & Users", href: "/admin/users", permission: "users.view", icon: UserCog },
      { label: "Roles / Permissions", href: "/admin/roles", permission: "roles.manage", icon: ShieldCheck },
      { label: "Audit Log", href: "/admin/audit", permission: "audit.view", icon: History },
      { label: "Backup & Restore", href: "/admin/settings/backup", permission: "settings.manage", icon: DatabaseBackup },
      { label: "Blueprint AI", href: "/admin/settings/blueprint-ai", permission: "settings.manage", icon: Sparkles },
    ],
  },
  {
    label: "Help",
    items: [{ label: "Help & Documentation", href: "/admin/help", icon: BookOpen }],
  },
];
