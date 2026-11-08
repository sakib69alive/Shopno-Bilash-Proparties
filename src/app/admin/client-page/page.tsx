import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QuickOpenHub, type QuickOption } from "@/components/admin/quickOpen/QuickOpenHub";
import { projectRepository } from "@/features/projects/repository";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository } from "@/features/shareholders/repository";
import { landownerRepository } from "@/features/landowners/repository";
import { unitRepository } from "@/features/units/repository";
import { filterVisibleProjectsList } from "@/lib/projectScope";

/** Quick-open board for everything the client app (owner portal) shows: pick a button, pick a project or client if asked, land on the exact screen. */
export default async function AdminClientPageHub() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "project.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage the client app." />
      </div>
    );
  }

  const canSeeCustomers = hasPermission(user.role, "customer.view");
  const canSeeShareholders = hasPermission(user.role, "shareholder.view");
  const canSeeLandowners = hasPermission(user.role, "landowner.view");

  const canSeeUnits = hasPermission(user.role, "unit.view");

  const [projects, units, customers, shareholders, landowners] = await Promise.all([
    projectRepository.list(),
    canSeeUnits || canSeeCustomers ? unitRepository.list() : Promise.resolve([]),
    canSeeCustomers ? customerRepository.list() : Promise.resolve([]),
    canSeeShareholders ? shareholderRepository.list() : Promise.resolve([]),
    canSeeLandowners ? landownerRepository.list() : Promise.resolve([]),
  ]);

  const byName = (a: QuickOption, b: QuickOption) => a.label.localeCompare(b.label);
  const client: QuickOption[] = [
    ...customers
      .map((c) => ({
        value: `customer:${c.id}`,
        label: c.name,
        kind: "customer" as const,
        projectIds: Array.from(new Set(units.filter((u) => u.customerId === c.id).map((u) => u.projectId))),
      }))
      .sort(byName),
    ...shareholders.map((c) => ({ value: `shareholder:${c.id}`, label: c.name, kind: "shareholder" as const })).sort(byName),
    ...landowners.map((c) => ({ value: `landowner:${c.id}`, label: c.name, kind: "landowner" as const })).sort(byName),
  ];

  // Optional shortcut after picking a project: that project's flats, and the customers who own them.
  const customerNames = new Map(customers.map((c) => [c.id, c.name]));
  const jump: Record<string, QuickOption[]> = {};
  for (const unit of units) {
    const list = (jump[unit.projectId] ??= []);
    const owner = unit.customerId ? customerNames.get(unit.customerId) : undefined;
    list.push({ value: `unit:${unit.id}`, label: `Flat ${unit.unitNumber}${owner ? ` — ${owner}` : ""}` });
  }
  for (const unit of units) {
    if (!unit.customerId || !customerNames.has(unit.customerId)) continue;
    const value = `customer:${unit.customerId}`;
    const list = jump[unit.projectId];
    if (!list.some((o) => o.value === value)) list.push({ value, label: `${customerNames.get(unit.customerId)} — customer` });
  }
  for (const list of Object.values(jump)) {
    list.sort((a, b) => {
      const aUnit = a.value.startsWith("unit:") ? 0 : 1;
      const bUnit = b.value.startsWith("unit:") ? 0 : 1;
      return aUnit - bUnit || a.label.localeCompare(b.label, undefined, { numeric: true });
    });
  }

  return (
    <>
      <AdminPageHeader title="Client page" description="Pick what you want to manage in the client app — it takes you straight to the right screen." />
      <QuickOpenHub
        board="client"
        jump={jump}
        role={user.role}
        options={{
          webProject: [],
          webProperty: [],
          project: filterVisibleProjectsList(user, projects).map((p) => ({ value: p.id, label: p.name })),
          client,
        }}
      />
    </>
  );
}
