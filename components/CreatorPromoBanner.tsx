import React from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { TEMP_BANNER_ASPECT, TEMP_BANNER_IMAGE_PATH, getBannerTargetRoute } from "@/constants/bannerLinks";

type Props = {
  /** Optional outer spacing (profile vs home use different margins) */
  style?: StyleProp<ViewStyle>;
};

export function CreatorPromoBanner({ style }: Props) {
  return (
    <Pressable
      accessibilityLabel="Advertising banner"
      accessibilityRole="link"
      onPress={() => router.push(getBannerTargetRoute() as any)}
      style={[styles.creatorBanner, style]}
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
  creatorBanner: {
    alignSelf: "stretch",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    aspectRatio: TEMP_BANNER_ASPECT,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0a0a0a",
  },
});
