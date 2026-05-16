import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

/**
 * Web-only traffic & performance metrics (Vercel dashboard).
 * Enable “Web Analytics” on the Vercel project after deploy.
 */
export function WebVercelAnalytics() {
  const pathname = usePathname();

  if (Platform.OS !== "web") {
    return null;
  }

  const route = pathname ?? null;

  return (
    <>
      <Analytics route={route} framework="expo-router" />
      <SpeedInsights route={route} />
    </>
  );
}
