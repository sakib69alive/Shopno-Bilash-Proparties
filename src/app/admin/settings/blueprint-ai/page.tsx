import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BlueprintAiPanel } from "@/components/admin/blueprintAi/BlueprintAiPanel";
import { BlueprintAiTabs } from "@/components/admin/blueprintAi/BlueprintAiTabs";

/**
 * The hand-off between an admin and an AI for floor plans: the master prompts (draw a plan from a picture / change an
 * existing plan), what the AI may and may not do, and a checker that says whether a returned SVG will draw cleanly on
 * phones. Gated on `settings.manage`, like the rest of system configuration.
 */
export default async function AdminBlueprintAiPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "settings.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to open the blueprint AI instructions." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Blueprint AI"
        description="Master prompts for turning an architect's picture into a phone-ready floor plan with an AI, and a checker for the result."
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Blueprint AI" }]}
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <BlueprintAiTabs active="prompts" />
        <BlueprintAiPanel />
      </div>
    </>
  );
}
