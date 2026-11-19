import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QuickOpenHub, type QuickOption } from "@/components/admin/quickOpen/QuickOpenHub";
import { projectRepository } from "@/features/projects/repository";
import { customerRepository } from "@/features/customers/repository";
import { unitRepository } from "@/features/units/repository";
import { saleRepository } from "@/features/sales/repository";
import { filterToVisibleProjects, filterVisibleProjectsList, getVisibleProjectIds } from "@/lib/projectScope";
import { getMoneyOverview } from "@/features/finance/moneyOverview";
import { MoneyOverview } from "@/components/admin/finance/MoneyOverview";

/** Quick-open board for everything that moves money: payments, installments, budget splits, spending, reports. Most-used buttons come first. */
export default async function AdminMoneyPageHub({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view the money screens." />
      </div>
    );
  }

  const [projects, customers, units, sales] = await Promise.all([
    projectRepository.list(),
    hasPermission(user.role, "customer.view") ? customerRepository.list() : Promise.resolve([]),
    hasPermission(user.role, "unit.view") ? unitRepository.list() : Promise.resolve([]),
    saleRepository.list(),
  ]);

  const visibleProjects = filterVisibleProjectsList(user, projects);
  const { project } = await searchParams;
  const projectId = visibleProjects.some((item) => item.id === project) ? project : undefined;
  const overview = await getMoneyOverview(user, sales, projectId);
  const visibleUnits = filterToVisibleProjects(user, units);
  const visibleSales = filterToVisibleProjects(user, sales);
  const scopedCustomers = new Set([...visibleUnits.map((unit) => unit.customerId), ...visibleSales.map((sale) => sale.customerId)]);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const customerNames = new Map(customers.map((c) => [c.id, c.name]));
  const unitNumbers = new Map(units.map((u) => [u.id, u.unitNumber]));
  const byLabel = (a: QuickOption, b: QuickOption) => a.label.localeCompare(b.label, undefined, { numeric: true });

  const unitOptions: QuickOption[] = visibleUnits
    .map((u) => ({ value: u.id, label: `${projectNames.get(u.projectId) ?? "Project"} · Flat ${u.unitNumber}` }))
    .sort(byLabel);
  const saleOptions: QuickOption[] = (hasPermission(user.role, "sales.view") ? visibleSales : [])
    .map((s) => ({
      value: s.id,
      label: `${projectNames.get(s.projectId) ?? "Project"} · Flat ${unitNumbers.get(s.unitId) ?? "?"} — ${customerNames.get(s.customerId) ?? "customer"}`,
    }))
    .sort(byLabel);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Money page"}</AdminText>} description={<AdminText>{"Review your projects’ finances and open the tools for payments, installments and spending."}</AdminText>}
        primaryAction={<Link href="/admin/finance/calculations" className="bg-accent text-accent-foreground rounded-lg px-4 py-2.5 text-sm font-medium"><AdminText>{"Calculation workspace"}</AdminText></Link>} />
      <MoneyOverview data={overview} projects={visibleProjects.map(({ id, name }) => ({ id, name }))} projectId={projectId} />
      <QuickOpenHub
        board="money"
        role={user.role}
        options={{
          webProject: [],
          webProperty: [],
          project: visibleProjects.map((p) => ({ value: p.id, label: p.name })),
          client: customers.filter((c) => getVisibleProjectIds(user) === "all" || scopedCustomers.has(c.id))
            .map((c) => ({ value: `customer:${c.id}`, label: c.name, kind: "customer" as const })).sort(byLabel),
          unit: unitOptions,
          sale: saleOptions,
        }}
      />
    </>
  );
}
