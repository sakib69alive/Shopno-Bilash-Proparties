import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import type { TeamMember } from "@/types/teamMember";

export interface TeamSectionProps {
  members: TeamMember[];
}

/**
 * The partners/leadership grid shown below the Founder's own profile — a
 * separate, admin-growable list (`TeamMember`), not more fields bolted onto
 * the Founder singleton. Skipped entirely when empty, same "don't pad with
 * invented copy" rule the rest of this page follows. Photo-forward cards,
 * same portrait ratio and hover-reveal language as `FounderGallery`, laid
 * out 1-up on mobile, 2-up on tablet, 3-up from desktop up.
 */
export function TeamSection({ members }: TeamSectionProps) {
  if (members.length === 0) return null;

  return (
    <Section spacing="lg" background="surface">
      <Container>
        <Reveal as="p" className="text-label text-premium mb-3 uppercase">
          Leadership
        </Reveal>
        <Reveal as="h2" className="text-display-m text-fg mb-10 max-w-xl text-balance sm:mb-14">
          The Team Behind Every Project
        </Reveal>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {members.map((member, i) => (
            <Reveal key={member.id} delay={i * 80} className="group">
              <div className="relative mb-5 overflow-hidden rounded-lg">
                <Media
                  ratio="portrait"
                  src={member.photo || "/placeholder-image.png"}
                  alt={member.name}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  className="transition-transform duration-700 ease-[var(--ease-standard)] group-hover:scale-105"
                />
              </div>
              <p className="text-h4 text-fg">{member.name}</p>
              <div className="mt-1.5 flex items-center gap-3">
                <span aria-hidden className="bg-premium h-px w-6" />
                <p className="text-label text-fg-muted uppercase">{member.title}</p>
              </div>
              {member.bio && <p className="text-body-sm text-fg-muted mt-3 leading-relaxed">{member.bio}</p>}
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
