import type { Metadata } from "next";
import { FounderHero } from "@/components/founder/FounderHero";
import { FounderStory } from "@/components/founder/FounderStory";
import { FounderStatement } from "@/components/founder/FounderStatement";
import { FounderPrinciples } from "@/components/founder/FounderPrinciples";
import { FounderGallery } from "@/components/founder/FounderGallery";
import { TeamSection } from "@/components/founder/TeamSection";
import { founderProfileRepository, FOUNDER_PROFILE_ID } from "@/features/founderProfile/repository";
import { listTeamMembersOrdered } from "@/features/teamMembers/repository";

export const metadata: Metadata = {
  title: "Founder",
  description: "Meet the owner and founder behind Shopno Bilash Properties.",
};

/**
 * The premium Founder experience — every section reads live from the one
 * admin-edited record, and any section without real content (Story's
 * Journey/Philosophy/Vision beats, Statement, Principles, Gallery) simply
 * doesn't render rather than showing invented copy.
 */
export default async function FounderPage() {
  const profile = await founderProfileRepository.findById(FOUNDER_PROFILE_ID);
  if (!profile) return null;

  const teamMembers = await listTeamMembersOrdered();

  return (
    <>
      <FounderHero profile={profile} />
      <FounderStory profile={profile} />
      <FounderStatement profile={profile} />
      <FounderPrinciples profile={profile} />
      <FounderGallery profile={profile} />
      <TeamSection members={teamMembers} />
    </>
  );
}
