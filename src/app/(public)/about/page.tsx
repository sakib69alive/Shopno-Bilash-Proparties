import type { Metadata } from "next";
import { AboutM } from "@/components/mobile/AboutM";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { BusinessModels } from "@/components/about/BusinessModels";
import { Closing } from "@/components/about/Closing";
import { Expertise } from "@/components/about/Expertise";
import { Impact } from "@/components/about/Impact";
import { Intro } from "@/components/about/Intro";
import { OurStory } from "@/components/about/OurStory";
import { Process } from "@/components/about/Process";
import { Values } from "@/components/about/Values";
import { Vision } from "@/components/about/Vision";
import { listMilestonesSorted } from "@/features/companyMilestones/repository";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import type { Statistic } from "@/content/home";

export const metadata: Metadata = {
  title: "About",
  description:
    "Who Shopno Bilash Properties is, what we believe, how we work, and why buyers, landowners and investors can trust what we build.",
};

export default async function AboutPage() {
  const [milestones, settings] = await Promise.all([
    listMilestonesSorted(),
    companySettingsRepository.findById(COMPANY_SETTINGS_ID),
  ]);

  const impactStats: Statistic[] = [
    { label: "Ongoing Developments", value: settings?.impactOngoingDevelopments ?? null },
    { label: "Development Area", value: settings?.impactDevelopmentAreaAcres ?? null, suffix: " acres" },
    { label: "Locations", value: settings?.impactLocations ?? null },
    { label: "Landowner Partnerships", value: settings?.impactLandownerPartnerships ?? null },
  ];

  return (
    <>
      <AboutM milestones={milestones} stats={impactStats} />
      <DesktopOnly>
      <Intro />
      <OurStory milestones={milestones} />
      <Vision />
      <Process />
      <BusinessModels />
      <Values />
      <Expertise />
      <Impact stats={impactStats} />
      <Closing />
      </DesktopOnly>
    </>
  );
}
