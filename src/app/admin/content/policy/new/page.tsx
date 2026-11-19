import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PolicyRuleForm } from "@/components/admin/policy/PolicyRuleForm";
import { createPolicyRule } from "@/features/policyRules/actions";

export default async function NewPolicyRulePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a policy rule." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Rule"}</AdminText>}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Company Policy", href: "/admin/content/policy" },
          { label: "New", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <PolicyRuleForm action={createPolicyRule} submitLabel="Publish Rule" />
      </div>
    </>
  );
}
