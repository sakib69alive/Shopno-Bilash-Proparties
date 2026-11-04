"use client";

import type { RouteTitleData } from "@/lib/routeTitles";
import type { CompanySettings } from "@/types/settings";
import { BottomTabBar } from "./BottomTabBar";
import { MenuSheet } from "./MenuSheet";
import { TopBar } from "./TopBar";

/** The phone chrome — top bar, bottom tab bar and the Menu sheet — mounted once by the public layout. All of it is hidden from `lg` up, where `Header` takes over. */
export function MobileShell({
  settings,
  routeTitleData,
}: {
  settings: CompanySettings | null;
  routeTitleData: RouteTitleData;
}) {
  return (
    <>
      <TopBar settings={settings} routeTitleData={routeTitleData} />
      <BottomTabBar />
      <MenuSheet />
    </>
  );
}
