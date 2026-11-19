import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { PolicyRuleAdminTable } from "@/components/admin/policy/PolicyRuleAdminTable";
import { listPolicyRulesOrdered } from "@/features/policyRules/repository";

/** List page for the public Company Policy page's numbered rules. */
export default async function AdminPolicyListPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage the Company Policy page." />
      </div>
    );
  }

  const rules = await listPolicyRulesOrdered();
  const canCreate = hasPermission(user.role, "content.create");
  const canDelete = hasPermission(user.role, "content.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Company Policy"}</AdminText>}
        description={<AdminText>{"Numbered rules shown on the public Company Policy page, in the order added."}</AdminText>}
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Company Policy", localize: true }]}
        primaryAction={
          canCreate && (
            <Link href="/admin/content/policy/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Rule"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <PolicyRuleAdminTable rules={rules} canDelete={canDelete} />
      </div>
    </>
  );
}
