import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { canInspectClientPortals } from "@/features/ownerPortal/inspectionAccess";
import { userRepository } from "@/features/users/repository";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PORTAL_ROLES } from "@/config/roles";

const eventLabels: Record<string, string> = {
  visited: "Opened in browser",
  installed: "Browser reported installation",
  standalone_opened: "Opened in app window",
  dismissed: "Dismissed",
  opted_out: "Don't show again",
};

export default async function ClientInstallationsPage() {
  if (!canInspectClientPortals(await getCurrentUser())) notFound();

  const [users, events] = await Promise.all([
    userRepository.list(),
    prisma.portalInstallEvent.findMany({ orderBy: { occurredAt: "desc" } }),
  ]);
  const clients = users.filter((user) => PORTAL_ROLES.includes(user.role)).sort((a, b) => a.name.localeCompare(b.name));
  const eventsByAccount = new Map<string, Map<string, typeof events>>();
  for (const event of events) {
    let account = eventsByAccount.get(event.userId);
    if (!account) {
      account = new Map();
      eventsByAccount.set(event.userId, account);
    }
    const history = account.get(event.deviceId) ?? [];
    history.push(event);
    account.set(event.deviceId, history);
  }

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Client app installations"}</AdminText>} breadcrumbs={[{ label: "Client page", href: "/admin/client-page" }, { label: "Installations", localize: true }]}
        description={<AdminText>{"Installation and prompt history reported by each client's browser or app. One physical device can appear in more than one browser or app profile."}</AdminText>} />
      <div className="space-y-3 p-4 sm:p-6">
        {!clients.length && <p className="text-fg-muted"><AdminText>{"No client portal accounts yet."}</AdminText></p>}
        {clients.map((client) => {
          const devices = [...(eventsByAccount.get(client.id)?.entries() ?? [])];
          return (
            <section key={client.id} className="bg-surface-raised border-border rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-h4">{client.name}</h2>
                  <p className="text-fg-muted text-sm capitalize">{client.role} · {client.status}</p>
                </div>
                <Link prefetch={false} href={`/admin/client-page/inspect/${encodeURIComponent(client.id)}`} className="text-accent min-h-9 text-sm font-medium underline underline-offset-4">
                  <AdminText>{"Inspect portal"}</AdminText>
                </Link>
              </div>
              {devices.length === 0 && <p className="text-fg-muted mt-3 text-sm"><AdminText>{"No device activity observed. Installation status unknown."}</AdminText></p>}
              {devices.map(([id, history], index) => {
                const latest = history[0];
                const installed = history.some((event) => event.kind === "installed");
                const standalone = history.some((event) => event.kind === "standalone_opened");
                const optedOut = history.some((event) => event.kind === "opted_out");
                return (
                  <details key={id} className="border-border mt-3 border-t pt-3 text-sm">
                    <summary className="cursor-pointer">
                      <AdminText>{"Profile "}</AdminText>{index + 1} · {latest.platform} / {latest.browser} · {installed ? "Installation reported" : standalone ? "App window observed" : "Installation unconfirmed"}
                      {optedOut ? " · Prompt turned off" : ""}
                    </summary>
                    <ul className="text-fg-muted mt-2 space-y-1 pl-4">
                      {history.map((event) => <li key={event.id}>{formatDateTime(event.occurredAt)} · {eventLabels[event.kind] ?? event.kind}</li>)}
                    </ul>
                  </details>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
