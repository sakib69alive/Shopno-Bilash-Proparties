import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { founderProfileRepository, FOUNDER_PROFILE_ID } from "@/features/founderProfile/repository";

/**
 * The public site's Owner/Founder profile — replaces the header's "More"
 * dropdown (Admin Step, per public-site feedback #3). Singleton, same
 * read-then-edit shape as `/admin/settings`.
 */
export default async function AdminFounderProfilePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view the Founder Profile." />
      </div>
    );
  }

  let profile;
  try {
    profile = await founderProfileRepository.findById(FOUNDER_PROFILE_ID);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="The founder profile couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!profile) notFound();

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Founder Profile"}</AdminText>}
        description={<AdminText>{"The owner/founder photo and bio shown on the public site's profile page."}</AdminText>}
        secondaryActions={
          hasPermission(user.role, "content.update") && (
            <Link href="/admin/content/founder/edit" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil aria-hidden className="size-3.5" />
              <AdminText>{"Edit"}</AdminText>
            </Link>
          )
        }
      />
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[200px_1fr]">
        <div className="border-border bg-surface-raised relative aspect-square w-full overflow-hidden rounded-lg border">
          {profile.photo ? (
            <Image src={profile.photo} alt={profile.name} fill className="object-cover" />
          ) : (
            <div className="text-caption text-fg-subtle flex h-full items-center justify-center uppercase"><AdminText>{"No photo"}</AdminText></div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
            <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Profile"}</AdminText></h2>
            <div>
              <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Name"}</AdminText></p>
              <p className="text-body-sm text-fg mt-0.5">{profile.name}</p>
            </div>
            <div>
              <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Title / Role"}</AdminText></p>
              <p className="text-body-sm text-fg mt-0.5">{profile.title}</p>
            </div>
            {profile.intro && (
              <div>
                <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Hero Intro"}</AdminText></p>
                <p className="text-body-sm text-fg mt-0.5">{profile.intro}</p>
              </div>
            )}
            <div>
              <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Bio"}</AdminText></p>
              <p className="text-body-sm text-fg mt-0.5 whitespace-pre-line">{profile.bio}</p>
            </div>
          </section>

          {profile.statement && (
            <section className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border p-4">
              <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Founder Statement"}</AdminText></h2>
              <p className="text-body-sm text-fg whitespace-pre-line">{profile.statement}</p>
            </section>
          )}

          {(profile.vision || profile.mission || profile.philosophy) && (
            <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Vision & Philosophy"}</AdminText></h2>
              {profile.vision && (
                <div>
                  <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Vision"}</AdminText></p>
                  <p className="text-body-sm text-fg mt-0.5">{profile.vision}</p>
                </div>
              )}
              {profile.mission && (
                <div>
                  <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Mission"}</AdminText></p>
                  <p className="text-body-sm text-fg mt-0.5">{profile.mission}</p>
                </div>
              )}
              {profile.philosophy && (
                <div>
                  <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Philosophy"}</AdminText></p>
                  <p className="text-body-sm text-fg mt-0.5">{profile.philosophy}</p>
                </div>
              )}
            </section>
          )}

          {profile.principles.length > 0 && (
            <section className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border p-4">
              <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Leadership Principles"}</AdminText></h2>
              <ul className="mt-0.5 list-disc pl-4">
                {profile.principles.map((principle) => (
                  <li key={principle} className="text-body-sm text-fg">
                    {principle}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.highlights.length > 0 && (
            <section className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border p-4">
              <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Highlights"}</AdminText></h2>
              <ul className="mt-0.5 list-disc pl-4">
                {profile.highlights.map((highlight) => (
                  <li key={highlight} className="text-body-sm text-fg">
                    {highlight}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.gallery.length > 0 && (
            <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Gallery"}</AdminText></h2>
              <div className="grid grid-cols-3 gap-3">
                {profile.gallery.map((img) => (
                  <div key={img.src} className="flex flex-col gap-1.5">
                    <div className="border-border bg-surface relative aspect-square overflow-hidden rounded-md border">
                      <Image src={img.src} alt={img.caption ?? ""} fill className="object-cover" />
                    </div>
                    {img.caption && <p className="text-caption text-fg-subtle">{img.caption}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Created"}</AdminText></p>
                <p className="text-body-sm text-fg mt-0.5">{formatDate(new Date(profile.createdAt))}</p>
              </div>
              <div>
                <p className="text-caption text-fg-subtle uppercase"><AdminText>{"Last Updated"}</AdminText></p>
                <p className="text-body-sm text-fg mt-0.5">{formatDate(new Date(profile.updatedAt))}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
