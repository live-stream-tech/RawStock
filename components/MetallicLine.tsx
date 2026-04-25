import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  /** Horizontal (default) or vertical orientation */
  vertical?: boolean;
  /** Stroke thickness */
  thickness?: number;
  /** Optional wrapper styles */
  style?: any;
};

const METALLIC_COLORS = ["#00ffcc22", "#00ffcc", "#00ffcccc", "#00ffcc22"] as const;

/**
 * Draw a metallic accent line using a gray→white gradient.
 */
export function MetallicLine({ vertical = false, thickness = 1, style }: Props) {
  const size = thickness;
  return (
    <View style={[vertical ? { width: size } : { height: size }, style]}>
      <LinearGradient
        colors={[...METALLIC_COLORS]}
        locations={[0, 0.35, 0.5, 1]}
        start={vertical ? { x: 0.5, y: 0 } : { x: 0, y: 0.5 }}
        end={vertical ? { x: 0.5, y: 1 } : { x: 1, y: 0.5 }}
        style={[styles.gradient, vertical ? { width: size, minHeight: 20 } : { height: size, minWidth: 20 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
