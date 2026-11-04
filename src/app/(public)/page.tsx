import type { Metadata } from "next";
import { Achievements } from "@/components/home/Achievements";
import { CompanyStatement } from "@/components/home/CompanyStatement";
import { FeaturedDevelopment } from "@/components/home/FeaturedDevelopment";
import { Hero } from "@/components/home/Hero";
import { NextExploration } from "@/components/home/NextExploration";
import { OurApproach } from "@/components/home/OurApproach";
import { PortfolioStrip } from "@/components/home/PortfolioStrip";
import { Trust } from "@/components/home/Trust";
import { WhatWeDo } from "@/components/home/WhatWeDo";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { HomeM } from "@/components/mobile/HomeM";
import { projectContentRepository } from "@/features/projectContent/repository";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import { getPropertyListingsAsync } from "@/lib/propertiesAsync";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default async function Home() {
  // A real project for the phone's featured band: the one marked featured, else one under construction, else the first.
  const [projects, listings, settings] = await Promise.all([
    projectContentRepository.list(),
    getPropertyListingsAsync(),
    companySettingsRepository.findById(COMPANY_SETTINGS_ID),
  ]);
  const featured =
    projects.find((p) => p.featured) ?? projects.find((p) => p.status === "ongoing") ?? projects[0];

  return (
    <>
      <HomeM projects={projects} listings={listings} companyName={settings?.displayName || "Shopno Bilash Properties"} />
      <DesktopOnly>
      <Hero />
      <CompanyStatement />
      <OurApproach />
      <WhatWeDo />
      <PortfolioStrip />
      <FeaturedDevelopment project={featured} />
      <Achievements />
      <Trust />
      <NextExploration />
      </DesktopOnly>
    </>
  );
}
