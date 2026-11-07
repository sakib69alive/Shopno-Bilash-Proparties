import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ClientsOverview, type ClientRow } from "@/components/admin/clients/ClientsOverview";
import { customerRepository } from "@/features/customers/repository";
import { saleRepository } from "@/features/sales/repository";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { userRepository } from "@/features/users/repository";
import { notificationRepository } from "@/features/notifications/repository";
import { customerPaymentRepository } from "@/features/finance/repository";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import { toPortalAccessView } from "@/features/users/portalAccessView";
import { summarizeSale } from "@/lib/salePayments";

export const dynamic = "force-dynamic";

/**
 * Every client on one page: the big title, then each project with its clients' names, then an extra section the Admin fills by hand
 * (for example people who invested in several flats — they are shown only there, not again under the projects). Pressing a name opens
 * that client's panel: their link, what they are expected to pay and when, sending a document or message, and whether they have seen it.
 */
export default async function AdminClientsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "customer.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Clients." />
      </div>
    );
  }

  let rows: ClientRow[];
  let projectOrder: { id: string; name: string }[];
  let settings;
  try {
    const [customers, sales, projects, units, users, notifications, payments] = await Promise.all([
      customerRepository.list(),
      saleRepository.list(),
      projectRepository.list(),
      unitRepository.list(),
      userRepository.list(),
      notificationRepository.list(),
      customerPaymentRepository.list(),
    ]);
    settings = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);
    projectOrder = projects.map((p) => ({ id: p.id, name: p.name }));

    // Give every client their own colour number, once, in order — so a colour is never shared and never changes.
    let nextTint = customers.reduce((max, c) => Math.max(max, (c.tintIndex ?? -1) + 1), 0);
    for (const c of customers.filter((x) => x.tintIndex === undefined).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) {
      c.tintIndex = nextTint++;
      try {
        await customerRepository.update(c.id, { tintIndex: c.tintIndex });
      } catch {
        // the colour still shows this visit; it is saved next time
      }
    }

    rows = customers
      .filter((c) => c.status !== "archived")
      .map((c) => {
        const own = sales.filter((s) => s.customerId === c.id && s.status !== "cancelled");
        const account = c.userId ? (users.find((u) => u.id === c.userId) ?? null) : null;
        const lastMessage = account
          ? notifications.filter((n) => n.recipientUserId === account.id && n.actorUserId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
          : undefined;
        return {
          id: c.id,
          tint: c.tintIndex ?? 0,
          name: c.name,
          phone: c.phone,
          hasAccount: !!account,
          link: toPortalAccessView(account)?.link,
          projectIds: [...new Set([...own.map((s) => s.projectId), ...units.filter((u) => u.customerId === c.id).map((u) => u.projectId)])],
          flats: [
            ...units
              .filter((u) => u.customerId === c.id && !own.some((s) => s.unitId === u.id))
              .map((u) => ({
                unitId: u.id,
                saleId: "",
                sizeSqft: u.sizeSqft,
                hideMoney: false,
                hidePlan: !!u.hidePlanFromOwner,
                hideConstruction: !!u.hideConstructionFromOwner,
                unit: u.unitNumber,
                projectName: projects.find((p) => p.id === u.projectId)?.name ?? "—",
                price: 0,
                paid: 0,
                remaining: 0,
              })),
            ...own.map((s) => {
            const summary = summarizeSale(s, own, payments);
            const unitRow = units.find((u) => u.id === s.unitId);
            return {
              unitId: s.unitId,
              saleId: s.id,
              sizeSqft: unitRow?.sizeSqft ?? 0,
              hideMoney: !!s.hideFromOwner,
              hidePlan: !!unitRow?.hidePlanFromOwner,
              hideConstruction: !!unitRow?.hideConstructionFromOwner,
              unit: unitRow?.unitNumber ?? "—",
              projectName: projects.find((p) => p.id === s.projectId)?.name ?? "—",
              price: summary.price,
              paid: summary.paid,
              remaining: summary.remaining,
            };
          }),
          ],
          plan: c.plannedPayment ? { amount: c.plannedPayment.amount, date: c.plannedPayment.date, note: c.plannedPayment.note } : undefined,
          inExtra: !!c.inExtraSection,
          lastSeenAt: account?.lastSeenAt ?? account?.lastLoginAt,
          lastMessage: lastMessage ? { title: lastMessage.title, createdAt: lastMessage.createdAt, readAt: lastMessage.readAt } : undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Clients couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title="Clients" description="Everyone who has bought with us, by project — press a name for their link, payment plan and messages." />
      <div className="p-4 sm:p-6">
        <ClientsOverview
          rows={rows}
          projects={projectOrder}
          title={settings?.clientsOverviewTitle ?? "Our Clients"}
          extraTitle={settings?.clientsExtraTitle ?? "Invested in more than one flat"}
          canEdit={hasPermission(user.role, "customer.update")}
          canSendDocument={hasPermission(user.role, "documents.upload")}
          canManageLinks={hasPermission(user.role, "users.manage")}
        />
      </div>
    </>
  );
}
