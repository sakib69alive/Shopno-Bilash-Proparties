import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { OwnerDashboard } from "@/components/portal/OwnerDashboard";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import {
  getOwnerUnits,
  getOwnerProjects,
  getOwnerOutstanding,
  getOwnerNextInstallment,
  getOwnerConstructionProgress,
  getOwnerDocuments,
  getOwnerNotifications,
  getOwnerSaleSummaries,
} from "@/features/ownerPortal/queries";

export async function OwnerHomePage({ base }: { base: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const context = resolveOwnerContext(user);
  if (!context) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState
          title="No property linked yet"
          description="Your account isn't connected to a property record yet. Please contact Shopno Bilash Properties Ltd. to complete your setup."
        />
      </div>
    );
  }

  const settings = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);

  const [units, projects, outstanding, nextInstallment, progress, documents, notifications, saleSummaries] = await Promise.all([
    getOwnerUnits(context.ownerType, context.ownerId),
    getOwnerProjects(context.ownerType, context.ownerId),
    getOwnerOutstanding(context.ownerType, context.ownerId),
    getOwnerNextInstallment(context.ownerType, context.ownerId),
    getOwnerConstructionProgress(context.ownerType, context.ownerId),
    getOwnerDocuments(context.ownerType, context.ownerId),
    getOwnerNotifications(context.ownerType, context.ownerId),
    getOwnerSaleSummaries(context.ownerType, context.ownerId),
  ]);

  return (
    <OwnerDashboard
      base={base}
      blueBlueprint={settings?.portalHomeBlueBlueprint !== false}
      contactPhone={settings?.phone || undefined}
      firstName={user.name.split(" ")[0]}
      units={units}
      projects={projects}
      primaryProject={projects.find((p) => p.id === units[0]?.projectId) ?? null}
      outstanding={outstanding}
      nextInstallment={nextInstallment}
      progress={progress}
      documents={documents}
      notifications={notifications}
      saleSummaries={saleSummaries}
    />
  );
}
