import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Linking,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { C } from "@/constants/colors";
import { TEMP_BANNER_IMAGE_PATH, TEMP_BANNER_TARGET_URL } from "@/constants/bannerLinks";

type Props = {
  /** Optional outer spacing (profile vs home use different margins) */
  style?: StyleProp<ViewStyle>;
};

export function CreatorPromoBanner({ style }: Props) {
  const isWeb = Platform.OS === "web";
  const [hovered, setHovered] = useState(false);

  const openBannerLink = () => {
    void Linking.openURL(TEMP_BANNER_TARGET_URL);
  };

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Sponsored banner"
      onHoverIn={isWeb ? () => setHovered(true) : undefined}
      onHoverOut={isWeb ? () => setHovered(false) : undefined}
      style={({ pressed }) => [styles.creatorBanner, style, (pressed || hovered) && styles.creatorBannerActive]}
      onPress={openBannerLink}
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
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    width: "100%",
    height: 72,
    maxHeight: 76,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  creatorBannerActive: {
    opacity: 0.92,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0a0a0a",
  },
});
