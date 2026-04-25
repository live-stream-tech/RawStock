import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "@/constants/colors";

type Props = {
  /**
   * Vertical space between this gradient and the content below.
   * Screens should match this with their own paddingTop.
   */
  height?: number;
};

/**
 * Neon “stage” header background for tab screens.
 * Full width with a dark fade at the bottom so content blends in.
 */
export function TopStageBackground({ height = 28 }: Props) {
  const headerHeight = height;

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      <LinearGradient
        colors={["#050913", "#050913", C.bg]}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#02050A",
  },
  gradient: {
    ...(StyleSheet.absoluteFillObject as any),
  },
});

