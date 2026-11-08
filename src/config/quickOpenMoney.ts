import {
  Banknote,
  BarChart3,
  Boxes,
  CalendarClock,
  Compass,
  CreditCard,
  HandCoins,
  HardHat,
  Home,
  Landmark,
  LineChart,
  Megaphone,
  PiggyBank,
  Plus,
  Receipt,
  ShoppingCart,
  SplitSquareVertical,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import type { QuickSection } from "./quickOpen";

/**
 * Everything that moves money in the admin panel, from taking a payment to
 * spending it, in the order the work is usually done: the most-used buttons
 * first, then by project, by flat, by customer, then the rest.
 */
export const MONEY_PAGE_SECTIONS: QuickSection[] = [
  {
    title: "Most used",
    blurb: "The money jobs done every day.",
    items: [
      { id: "m-pay-new", label: "Record a payment", hint: "A client paid — write it down", icon: Wallet, need: "none", href: "/admin/sales/payments/new", permission: "finance.manage" },
      { id: "m-pay-customer", label: "Record a payment from a customer", hint: "Pick the customer, the form opens filled in", icon: Wallet, need: "client", href: "/admin/sales/payments/new?customerId={id}", permission: "finance.manage", customerOnly: true },
      { id: "m-payments", label: "Payments received", hint: "Every payment on record", icon: CreditCard, need: "none", href: "/admin/sales/payments", permission: "finance.view" },
      { id: "m-install", label: "Installments", hint: "Due dates and what is overdue", icon: CalendarClock, need: "none", href: "/admin/sales/installments", permission: "sales.view" },
      { id: "m-install-new", label: "New installment", hint: "Add a due payment to a sale", icon: Plus, need: "sale", href: "/admin/sales/installments/new?saleId={id}", permission: "sales.create" },
      { id: "m-notice", label: "Send a notice / receipt", hint: "Statements & Notices studio", icon: Megaphone, need: "none", href: "/admin/statements", permission: "reports.view" },
      { id: "m-budgets", label: "Budgets & cost splits", hint: "How a project's cost is divided among owners", icon: SplitSquareVertical, need: "none", href: "/admin/finance/cost-allocations", permission: "finance.view" },
      { id: "m-budget-new", label: "New budget split", hint: "Divide a cost across owners", icon: Plus, need: "none", href: "/admin/finance/cost-allocations/new", permission: "finance.manage" },
      { id: "m-expense-new", label: "Add an expense", hint: "Money the company spent", icon: PiggyBank, need: "none", href: "/admin/finance/expenses/new", permission: "finance.manage" },
      { id: "m-clients", label: "Clients overview", hint: "Each client's budget and what they paid", icon: Users, need: "none", href: "/admin/clients", permission: "customer.view" },
    ],
  },
  {
    title: "Money of one project",
    blurb: "Choose the project and you land on its money screen: payments, spending, how it is shared out to flats, or its reports.",
    items: [
      { id: "mp-payments", label: "Payments (project tab)", hint: "What owners paid and what is due in this project", icon: Wallet, need: "project", href: "/admin/projects/{id}/payments", permission: "finance.view" },
      { id: "mp-distribute", label: "Distribute to flats", hint: "Give flats to owners and share the cost out", icon: Compass, need: "project", href: "/admin/projects/{id}/distribute", permission: "unit.view" },
      { id: "mp-expenses", label: "Expenses (project tab)", hint: "What this project spent", icon: PiggyBank, need: "project", href: "/admin/projects/{id}/expenses", permission: "finance.view" },
      { id: "mp-finance", label: "Project finance & budget", hint: "The project's budget and costs", icon: Landmark, need: "project", href: "/admin/finance/project-costs?projectId={id}", permission: "finance.view" },
      { id: "mp-received", label: "Payments received — this project", hint: "The payments list, filtered to the project", icon: CreditCard, need: "project", href: "/admin/sales/payments?projectId={id}", permission: "finance.view" },
      { id: "mp-exp-list", label: "Expenses list — this project", hint: "The expenses list, filtered to the project", icon: PiggyBank, need: "project", href: "/admin/finance/expenses?projectId={id}", permission: "finance.view" },
      { id: "mp-purchases", label: "Materials bought — this project", hint: "Purchases made for the project", icon: ShoppingCart, need: "project", href: "/admin/procurement/purchases?projectId={id}", permission: "procurement.view" },
      { id: "mp-materials", label: "Materials (project tab)", hint: "Materials and stock of the project", icon: Boxes, need: "project", href: "/admin/projects/{id}/materials", permission: "procurement.view" },
      { id: "mp-flats", label: "Flats & prices — this project", hint: "All flats with their prices and status", icon: Home, need: "project", href: "/admin/properties?projectId={id}", permission: "unit.view" },
      { id: "mp-reports", label: "Project reports", hint: "Numbers for this project", icon: BarChart3, need: "project", href: "/admin/projects/{id}/reports", permission: "reports.view" },
    ],
  },
  {
    title: "Money of one flat",
    blurb: "Choose the flat to book it, sell it or open it.",
    items: [
      { id: "mf-booking", label: "Book this flat", hint: "A customer pays a booking amount to hold it", icon: CalendarClock, need: "unit", href: "/admin/sales/bookings/new?unitId={id}", permission: "sales.create" },
      { id: "mf-sale", label: "Sell this flat", hint: "Record the sale with its price", icon: Receipt, need: "unit", href: "/admin/sales/new?unitId={id}", permission: "sales.create" },
      { id: "mf-open", label: "Open this flat", hint: "Its owner, price, parking and history", icon: Home, need: "unit", href: "/admin/properties/{id}", permission: "unit.view" },
    ],
  },
  {
    title: "Money of one customer",
    blurb: "Choose a customer for their payments, notices and profile.",
    items: [
      { id: "mc-pay", label: "Record a payment", hint: "Form opens with the customer filled in", icon: Wallet, need: "client", href: "/admin/sales/payments/new?customerId={id}", permission: "finance.manage", customerOnly: true },
      { id: "mc-notice", label: "Send a notice or receipt", hint: "Studio opens for this customer", icon: Megaphone, need: "client", href: "/admin/statements?customerId={id}", permission: "reports.view", customerOnly: true },
      { id: "mc-profile", label: "Open profile", hint: "Their flats, payments and documents", icon: Users, need: "client", href: "/admin/{path}/{id}" },
    ],
  },
  {
    title: "Selling & installments",
    blurb: "From a booking to a finished sale and its payment plan.",
    items: [
      { id: "ms-bookings", label: "Bookings", hint: "Flats being held for customers", icon: CalendarClock, need: "none", href: "/admin/sales/bookings", permission: "sales.view" },
      { id: "ms-booking-new", label: "New booking", hint: "Hold a flat for a customer", icon: Plus, need: "none", href: "/admin/sales/bookings/new", permission: "sales.create" },
      { id: "ms-sales", label: "Sales", hint: "Which customer bought which flat", icon: Receipt, need: "none", href: "/admin/sales", permission: "sales.view" },
      { id: "ms-sale-new", label: "New sale", hint: "Record a sale", icon: Plus, need: "none", href: "/admin/sales/new", permission: "sales.create" },
      { id: "ms-install-new", label: "New installment (choose the sale later)", hint: "Open the installment form blank", icon: Plus, need: "none", href: "/admin/sales/installments/new", permission: "sales.create" },
      { id: "ms-overview", label: "Sales overview", hint: "Sales dashboard", icon: LineChart, need: "none", href: "/admin/sales/dashboard", permission: "sales.view" },
    ],
  },
  {
    title: "Spending & accounts",
    blurb: "Where company money goes: expenses, materials, vendors and cash accounts.",
    items: [
      { id: "mx-expenses", label: "Expenses", hint: "All expenses", icon: PiggyBank, need: "none", href: "/admin/finance/expenses", permission: "finance.view" },
      { id: "mx-finance", label: "Project finance", hint: "Budgets of every project", icon: Landmark, need: "none", href: "/admin/finance/project-costs", permission: "finance.view" },
      { id: "mx-finance-new", label: "New project budget", hint: "Set a budget for a project", icon: Plus, need: "none", href: "/admin/finance/project-costs/new", permission: "finance.manage" },
      { id: "mx-accounts", label: "Accounts", hint: "Cash and bank accounts", icon: Banknote, need: "none", href: "/admin/finance/accounts", permission: "finance.view" },
      { id: "mx-purchases", label: "Purchases", hint: "Materials bought", icon: ShoppingCart, need: "none", href: "/admin/procurement/purchases", permission: "procurement.view" },
      { id: "mx-purchase-new", label: "New purchase", hint: "Record buying materials", icon: Plus, need: "none", href: "/admin/procurement/purchases/new", permission: "procurement.manage" },
      { id: "mx-vendors", label: "Vendors", hint: "Who you buy from", icon: Truck, need: "none", href: "/admin/procurement", permission: "procurement.view" },
      { id: "mx-materials", label: "Materials", hint: "Materials list", icon: Boxes, need: "none", href: "/admin/procurement/materials", permission: "procurement.view" },
      { id: "mx-stock", label: "Stock", hint: "What is in store", icon: Warehouse, need: "none", href: "/admin/procurement/stock", permission: "procurement.view" },
      { id: "mx-contractors", label: "Contractors", hint: "Builders you pay", icon: HardHat, need: "none", href: "/admin/construction/contractors", permission: "construction.view" },
    ],
  },
  {
    title: "Money reports",
    blurb: "Read the numbers.",
    items: [
      { id: "mr-home", label: "All finance reports", hint: "The reports index", icon: BarChart3, need: "none", href: "/admin/finance/reports", permission: "reports.view" },
      { id: "mr-cash", label: "Cash flow", hint: "Money in and out", icon: LineChart, need: "none", href: "/admin/finance/reports/cash-flow", permission: "reports.view" },
      { id: "mr-cat", label: "Spending by category", hint: "Where the money went", icon: PiggyBank, need: "none", href: "/admin/finance/reports/categories", permission: "reports.view" },
      { id: "mr-contractor", label: "Contractor payments", hint: "What each contractor was paid", icon: HardHat, need: "none", href: "/admin/finance/reports/contractor-payments", permission: "reports.view" },
      { id: "mr-owner", label: "Owner contributions", hint: "What each owner has put in", icon: HandCoins, need: "none", href: "/admin/finance/reports/owner-contributions", permission: "reports.view" },
      { id: "mr-sales", label: "Sales reports", hint: "Sales numbers", icon: Receipt, need: "none", href: "/admin/sales/reports", permission: "reports.view" },
    ],
  },
];
