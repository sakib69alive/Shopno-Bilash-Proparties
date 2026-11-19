import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CashAccountsAdminExplorer } from "@/components/admin/finance/CashAccountsAdminExplorer";
import { cashAccountRepository } from "@/features/finance/repository";

export default async function AdminCashAccountsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view accounts." />
      </div>
    );
  }

  let accounts;
  try {
    accounts = await cashAccountRepository.list();
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Accounts couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Accounts"}</AdminText>}
        description={<AdminText>{"Internal cash, bank, and mobile-banking records — not a real banking integration, just where money is tagged as moving through."}</AdminText>}
      />
      <div className="p-4 sm:p-6">
        <CashAccountsAdminExplorer accounts={accounts} canManage={hasPermission(user.role, "finance.manage")} />
      </div>
    </>
  );
}
