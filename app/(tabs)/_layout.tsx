import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, NativeTabTrigger } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { MetallicLine } from "@/components/MetallicLine";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabTrigger name="index">
        <NativeTabTrigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        <NativeTabTrigger.Label>Top</NativeTabTrigger.Label>
      </NativeTabTrigger>
      <NativeTabTrigger name="community">
        <NativeTabTrigger.Icon sf={{ default: "map", selected: "map.fill" }} />
        <NativeTabTrigger.Label>Districts</NativeTabTrigger.Label>
      </NativeTabTrigger>
      <NativeTabTrigger name="live">
        <NativeTabTrigger.Icon sf={{ default: "antenna.radiowaves.left.and.right", selected: "antenna.radiowaves.left.and.right" }} />
        <NativeTabTrigger.Label>Live Cast</NativeTabTrigger.Label>
      </NativeTabTrigger>
      <NativeTabTrigger name="profile">
        <NativeTabTrigger.Icon sf={{ default: "person", selected: "person.fill" }} />
        <NativeTabTrigger.Label>Mypage</NativeTabTrigger.Label>
      </NativeTabTrigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : C.tabBg,
          borderTopWidth: 0,
          elevation: 0,
          ...(isWeb ? { height: 60 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={StyleSheet.absoluteFill}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: C.tabBg }]} />
              <MetallicLine thickness={1} style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
            </View>
          ) : null,
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="finger-print" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
