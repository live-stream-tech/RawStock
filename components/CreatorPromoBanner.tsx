import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { ResponsivePromoBanner } from "@/components/ResponsivePromoBanner";

type Props = {
  /** Optional outer spacing (profile vs home use different margins) */
  style?: StyleProp<ViewStyle>;
};

export function CreatorPromoBanner({ style }: Props) {
  return <ResponsivePromoBanner accessibilityLabel="Advertising banner" style={style} />;
}
