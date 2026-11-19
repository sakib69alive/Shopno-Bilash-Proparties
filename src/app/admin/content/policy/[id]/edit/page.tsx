import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PolicyRuleForm } from "@/components/admin/policy/PolicyRuleForm";
import { updatePolicyRule } from "@/features/policyRules/actions";
import { policyRuleRepository } from "@/features/policyRules/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPolicyRulePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit a policy rule." />
      </div>
    );
  }

  const rule = await policyRuleRepository.findById(id);
  if (!rule) notFound();

  const boundAction = updatePolicyRule.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Rule"}</AdminText>}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Company Policy", href: "/admin/content/policy" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <PolicyRuleForm action={boundAction} rule={rule} submitLabel="Save Changes" />
      </div>
    </>
  );
}
