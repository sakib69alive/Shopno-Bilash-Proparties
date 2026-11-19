import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { LeadsAdminExplorer } from "@/components/admin/crm/LeadsAdminExplorer";
import { leadRepository } from "@/features/crm/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject, canAccessProjectOptional, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/**
 * Admin Step 11 — Leads / Enquiries Foundation. Reads `leadRepository`
 * (the internal `types/crm.ts` `Lead` shape). The public contact form
 * still doesn't create real leads (its submit handler is a placeholder) —
 * that's a separate, larger piece of work touching the public site; this
 * step is the admin-side create/edit/delete for leads entered directly.
 */
export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "lead.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Leads." />
      </div>
    );
  }

  let leads, projects;
  try {
    const [allLeads, allProjects] = await Promise.all([leadRepository.list(), projectRepository.list()]);
    leads = allLeads.filter((lead) => canAccessProjectOptional(user, lead.interestedProjectId));
    projects = filterVisibleProjectsList(user, allProjects);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Leads couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "lead.manage");
  const initialProjectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : undefined;

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Leads / Enquiries"}</AdminText>}
        description={<AdminText>{"Everyone who has enquired but hasn't become a customer yet."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/leads/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Lead"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <LeadsAdminExplorer
          leads={leads}
          projects={projects}
          canCreate={canManage}
          canDelete={canManage}
          initialProjectId={initialProjectId}
        />
      </div>
    </>
  );
}
