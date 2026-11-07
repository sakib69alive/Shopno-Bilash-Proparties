import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { logoutAction } from "@/lib/auth/actions";
import { findOwnerCredentialsByPhone } from "@/lib/auth/ownerCredentials";
import { getOwnerUnits } from "@/features/ownerPortal/queries";
import { projectRepository } from "@/features/projects/repository";
import { ChangePinForm } from "@/components/portal/ChangePinForm";
import { PortalLookPicker } from "@/components/portal/PortalLookPicker";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import { Button } from "@/components/ui/Button";
import type { UserStatus } from "@/types/user";

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Active",
  invited: "Pending Activation",
  suspended: "Suspended",
  disabled: "Deactivated",
};

/** Prompt 1's explicit "My Profile" requirements: identity, status, connected properties, PIN change, logout — nothing the backend can't actually back (no fake "log out all devices"). */
export async function OwnerProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Clients who come in through their personal link never set a PIN — nothing to change for them.
  const hasPin = user.phone ? Boolean(await findOwnerCredentialsByPhone(user.phone)) : false;

  const context = resolveOwnerContext(user);
  const units = context ? await getOwnerUnits(context.ownerType, context.ownerId) : [];
  const projects = units.length > 0 ? await projectRepository.list() : [];
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const settings = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);
  const look = user.portalLook ?? settings?.portalHomeLook ?? "grid";

  const initials = user.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 pb-16 sm:gap-8 sm:p-6 lg:p-10">
      <div className="flex items-center gap-4">
        <span className="bg-accent text-accent-foreground text-h3 flex size-16 shrink-0 items-center justify-center rounded-full shadow-sm">
          {initials}
        </span>
        <div>
          <p className="text-label text-fg-subtle uppercase">Profile</p>
          <h1 className="text-display-m text-fg mt-1">{user.name}</h1>
        </div>
      </div>

      <div className="border-border bg-surface-raised rounded-2xl border p-6 shadow-sm sm:p-7">
        <p className="text-h4 text-fg mb-4">Account</p>
        <div className="grid grid-cols-1 gap-y-4 text-body-sm sm:grid-cols-2">
          <div>
            <p className="text-caption text-fg-subtle uppercase">Phone</p>
            <p className="text-body text-fg mt-0.5 font-medium">{user.phone ?? "—"}</p>
          </div>
          {user.email && !user.email.endsWith("@portal.invalid") && (
            <div>
              <p className="text-caption text-fg-subtle uppercase">Email</p>
              <p className="text-body text-fg mt-0.5 font-medium">{user.email}</p>
            </div>
          )}
          <div>
            <p className="text-caption text-fg-subtle uppercase">Status</p>
            <span className="bg-accent-soft text-accent text-label mt-1 inline-flex items-center rounded-full px-3 py-1 uppercase">
              {STATUS_LABEL[user.status]}
            </span>
          </div>
        </div>
      </div>

      <div className="border-border bg-surface-raised rounded-2xl border p-6 shadow-sm sm:p-7">
        <p className="text-h4 text-fg mb-4">Connected Properties</p>
        {units.length === 0 ? (
          <p className="text-body-sm text-fg-muted">No property is linked to your account yet.</p>
        ) : (
          <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
            {units.map((unit) => (
              <li key={unit.id} className="text-body-sm text-fg flex items-center justify-between px-4 py-3">
                <span>
                  {projectsById.get(unit.projectId)?.name ?? "—"} · Unit {unit.unitNumber}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-border bg-surface-raised rounded-2xl border p-6 shadow-sm sm:p-7">
        <p className="text-h4 text-fg">Appearance</p>
        <p className="text-body-sm text-fg-muted mt-1 mb-4">How your floor plan looks on the Home screen.</p>
        <PortalLookPicker initial={look} />
      </div>

      {hasPin && (
        <div className="border-border bg-surface-raised rounded-2xl border p-6 shadow-sm sm:p-7">
          <p className="text-h4 text-fg mb-4">Security</p>
          <ChangePinForm />
        </div>
      )}

      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Log Out
        </Button>
      </form>
    </div>
  );
}
