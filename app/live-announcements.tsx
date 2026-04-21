import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
import { getTabTopInset, getTabBottomInset } from "@/constants/layout";
import { GlobalLiveAnnouncementsFeed } from "@/components/GlobalLiveAnnouncementsFeed";

export default function LiveAnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset(insets);
  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + webTop + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Global live feed</Text>
        <View style={{ width: 40 }} />
      </View>
      <GlobalLiveAnnouncementsFeed bottomInset={bottomInset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: C.text, fontSize: 17, fontWeight: "800" },
});
