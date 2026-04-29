import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { C } from "@/constants/colors";

type Props = {
  /** Optional outer spacing (profile vs home use different margins) */
  style?: StyleProp<ViewStyle>;
};

export function CreatorPromoBanner({ style }: Props) {
  return (
    <View
      accessibilityLabel="広告募集中バナー"
      style={[styles.creatorBanner, style]}
    >
      <View style={styles.bannerInner}>
        <Text style={styles.bannerText}>広告募集中</Text>
      </View>
    </View>
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
  bannerInner: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});
