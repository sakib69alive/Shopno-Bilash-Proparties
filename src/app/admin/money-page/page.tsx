import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QuickOpenHub, type QuickOption } from "@/components/admin/quickOpen/QuickOpenHub";
import { projectRepository } from "@/features/projects/repository";
import { customerRepository } from "@/features/customers/repository";
import { unitRepository } from "@/features/units/repository";
import { saleRepository } from "@/features/sales/repository";
import { filterVisibleProjectsList } from "@/lib/projectScope";

/** Quick-open board for everything that moves money: payments, installments, budget splits, spending, reports. Most-used buttons come first. */
export default async function AdminMoneyPageHub() {
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
    hasPermission(user.role, "sales.view") ? saleRepository.list() : Promise.resolve([]),
  ]);

  const visibleProjects = filterVisibleProjectsList(user, projects);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const customerNames = new Map(customers.map((c) => [c.id, c.name]));
  const unitNumbers = new Map(units.map((u) => [u.id, u.unitNumber]));
  const byLabel = (a: QuickOption, b: QuickOption) => a.label.localeCompare(b.label, undefined, { numeric: true });

  const unitOptions: QuickOption[] = units
    .map((u) => ({ value: u.id, label: `${projectNames.get(u.projectId) ?? "Project"} · Flat ${u.unitNumber}` }))
    .sort(byLabel);
  const saleOptions: QuickOption[] = sales
    .map((s) => ({
      value: s.id,
      label: `${projectNames.get(s.projectId) ?? "Project"} · Flat ${unitNumbers.get(s.unitId) ?? "?"} — ${customerNames.get(s.customerId) ?? "customer"}`,
    }))
    .sort(byLabel);

  return (
    <>
      <AdminPageHeader title="Money page" description="Payments, installments, how money is shared out to flats, and spending — pick a job and it takes you straight there." />
      <QuickOpenHub
        board="money"
        role={user.role}
        options={{
          webProject: [],
          webProperty: [],
          project: visibleProjects.map((p) => ({ value: p.id, label: p.name })),
          client: customers.map((c) => ({ value: `customer:${c.id}`, label: c.name, kind: "customer" as const })).sort(byLabel),
          unit: unitOptions,
          sale: saleOptions,
        }}
      />
    </>
  );
}
