import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PlatformPressable } from "@react-navigation/elements";
import { WEB_TAB_BAR_CONTENT_HEIGHT } from "@/constants/layout";
import { C } from "@/constants/colors";
import { MetallicLine } from "@/components/MetallicLine";

type TabBarIconProps = { color: string; size: number; focused: boolean };

const MypageTabBarButton = React.forwardRef<
  React.ComponentRef<typeof PlatformPressable>,
  ComponentProps<typeof PlatformPressable>
>(function MypageTabBarButton(props, ref) {
  const { children, onPressIn, onPressOut, onHoverIn, onHoverOut, style, ...rest } = props;
  const [pressed, setPressed] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const glow = pressed || hovered;

  return (
    <PlatformPressable
      ref={ref}
      {...rest}
      style={style}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onHoverIn={(e) => {
        if (Platform.OS === "web") setHovered(true);
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        if (Platform.OS === "web") setHovered(false);
        onHoverOut?.(e);
      }}
    >
      <View
        style={[
          tabStyles.mypageGlowWrap,
          glow && tabStyles.mypageGlowWrapActive,
          glow && Platform.OS === "android" ? { elevation: 12 } : null,
        ]}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </PlatformPressable>
  );
});

const tabStyles = StyleSheet.create({
  mypageGlowWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    minHeight: 32,
    borderRadius: 20,
  },
  mypageGlowWrapActive: {
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 14,
    ...(Platform.OS === "web"
      ? {
          boxShadow: `0 0 20px 8px rgba(0, 255, 204, 0.5)`,
        }
      : {}),
  },
});

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
          tabBarIcon: ({ color, size }: Pick<TabBarIconProps, "color" | "size">) => (
            <Ionicons name="finger-print" size={size} color={color} />
          ),
          tabBarButton: (props: ComponentProps<typeof PlatformPressable>) => (
            <MypageTabBarButton {...props} />
          ),
        }}
      />
    </Tabs>
  );
}
