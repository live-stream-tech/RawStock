import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WEB_TAB_BAR_CONTENT_HEIGHT } from "@/constants/layout";
import { C } from "@/constants/colors";
import { MetallicLine } from "@/components/MetallicLine";

export default function TabLayout() {
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: C.tabBg,
          borderTopWidth: 0,
          elevation: 0,
          height: WEB_TAB_BAR_CONTENT_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
          ...(isWeb
            ? {
                maxWidth: 500,
                alignSelf: "center" as const,
                width: "100%",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10000,
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "flame" : "flame-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Districts",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live Cast",
          tabBarIcon: ({ color, size, focused }) => (
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
          tabBarIcon: ({ color, size }) => <Ionicons name="finger-print" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
