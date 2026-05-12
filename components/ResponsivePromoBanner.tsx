import React from "react";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  PROMO_BANNER_BORDER_COLOR,
  TEMP_BANNER_ASPECT,
  TEMP_BANNER_IMAGE_PATH,
  getBannerTargetRoute,
} from "@/constants/bannerLinks";

type Props = {
  style?: StyleProp<ViewStyle>;
  communityId?: number | null;
  accessibilityLabel?: string;
};

export function ResponsivePromoBanner({
  style,
  communityId,
  accessibilityLabel = "Advertising banner",
}: Props) {
  const { width } = useWindowDimensions();
  const maxBannerWidth = Math.min(Math.max(width - 32, 0), 1240);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="link"
      onPress={() => router.push(getBannerTargetRoute(communityId) as any)}
      style={[
        styles.banner,
        {
          maxWidth: maxBannerWidth || undefined,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: TEMP_BANNER_IMAGE_PATH }}
        style={styles.bannerImage}
        contentFit="contain"
        contentPosition="center"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    alignSelf: "center",
    aspectRatio: TEMP_BANNER_ASPECT,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: PROMO_BANNER_BORDER_COLOR,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0a0a0a",
  },
});
