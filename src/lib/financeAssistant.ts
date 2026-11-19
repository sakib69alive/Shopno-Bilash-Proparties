export type FinanceSelection = { kind: "expense" | "member" | "installment" | "payment" | "budget" | "account" | "goal"; id: string };

export function financePage(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "admin") return null;
  if (parts.length === 2 && parts[1] === "money-page") return { tab: "overview" } as const;
  const projectTabs = { finance: "budget", expenses: "expense", payments: "payment", reports: "report" } as const;
  if (parts[1] === "projects" && parts.length === 4 && Object.hasOwn(projectTabs, parts[3])) {
    return { tab: projectTabs[parts[3] as keyof typeof projectTabs], projectId: parts[2] };
  }
  const finance = {
    "project-costs": "budget", expenses: "expense", "cost-allocations": "goal",
    accounts: "account", calculations: "calculation", reports: "report",
  } as const;
  const sales = { installments: "installment", payments: "payment" } as const;
  if (parts.length < 3 || parts.length > 5 || (parts.length === 5 && parts[4] !== "edit")) return null;
  const tab = parts[1] === "finance" && Object.hasOwn(finance, parts[2]) ? finance[parts[2] as keyof typeof finance]
    : parts[1] === "sales" && Object.hasOwn(sales, parts[2]) ? sales[parts[2] as keyof typeof sales] : null;
  if (!tab) return null;
  return { tab, id: parts[3] === "new" ? undefined : parts[3] };
}

export interface FinanceAssistantContext {
  title: string;
  projectName?: string;
  facts: { label: string; value: string; basis?: string }[];
  notes?: string[];
  links?: { label: string; href: string }[];
  availableBudget?: number;
  contributionRatio?: number;
}
