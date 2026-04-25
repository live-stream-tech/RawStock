import React from "react";
import { Image } from "expo-image";
import { RAWSTOCK_LOGO_URL } from "@/lib/brand";

// Asset is 2048×365px → aspect ratio ~5.61
const ASPECT_RATIO = 2048 / 365;

type Props = {
  /** Logo height (default 36px) */
  height?: number;
};

export function AppLogo({ height = 36 }: Props) {
  return (
    <Image
      source={{ uri: RAWSTOCK_LOGO_URL }}
      style={{ height, width: height * ASPECT_RATIO }}
      contentFit="contain"
    />
  );
}
