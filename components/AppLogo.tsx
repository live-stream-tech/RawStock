import React from "react";
import { Image } from "expo-image";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/M2pBP9b9EdXaS65j3mPhNW/RawStock_logo_3fd8a263.webp";

// 画像の実寸は2048x365px → アスペクト比 約5.61
const ASPECT_RATIO = 2048 / 365;

type Props = {
  /** ロゴの高さ（デフォルト36px） */
  height?: number;
};

export function AppLogo({ height = 36 }: Props) {
  return (
    <Image
      source={{ uri: LOGO_URL }}
      style={{ height, width: height * ASPECT_RATIO }}
      contentFit="contain"
    />
  );
}
