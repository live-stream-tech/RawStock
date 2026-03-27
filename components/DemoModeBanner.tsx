import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDemoMode } from "@/lib/demo-mode";
import { C } from "@/constants/colors";

export function DemoModeBanner() {
  const { isDemoMode } = useDemoMode();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 0 : insets.top;

  if (!isDemoMode) return null;

  return (
    <View style={[styles.banner, { paddingTop: topInset + 6 }]}>
      <Ionicons name="information-circle" size={16} color={C.orange} />
      <Text style={styles.text}>
        Demo mode: All displayed data is placeholder. Broken links and 404s do not occur with real data.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245, 158, 11, 0.3)",
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: C.textSec,
    lineHeight: 18,
  },
});
