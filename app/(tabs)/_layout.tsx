import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WEB_TAB_BAR_CONTENT_HEIGHT } from "@/constants/layout";
import { C } from "@/constants/colors";
import { MetallicLine } from "@/components/MetallicLine";

type TabBarIconProps = { color: string; size: number; focused: boolean };

export default function TabLayout() {
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  /** PWA / standalone sometimes under-reports bottom inset; keep a minimum so the bar clears the home indicator. */
  const bottomPad = Math.max(insets.bottom, isWeb ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          position: isWeb ? ("fixed" as const) : "absolute",
          backgroundColor: C.tabBg,
          borderTopWidth: 0,
          elevation: 0,
          height: WEB_TAB_BAR_CONTENT_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
          ...(isWeb
            ? {
                maxWidth: 500,
                width: "100%",
                marginHorizontal: "auto",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 100000,
                boxSizing: "border-box" as const,
              }
            : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.tabBg }]} />
            <MetallicLine thickness={1} style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Top",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Ionicons name={focused ? "flame" : "flame-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Districts",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live Cast",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Ionicons name={focused ? "headset" : "headset-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dm"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Mypage",
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="finger-print" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
