import React, { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { saveLoginReturn } from "@/lib/login-return";
import { alertMessage } from "@/lib/alertCompat";
import { C } from "@/constants/colors";
import { navigateToUserOrLiverProfile } from "@/lib/navigate-profile";
import { getTabTopInset, getTabBottomInset, webScrollStyle } from "@/constants/layout";
import { MetallicLine } from "@/components/MetallicLine";

type DMItem = {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  /** Counterpart users.id (0 = operations dummy peer) */
  otherUserId?: number;
};

export default function DMScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset(insets);
  const { user, token, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (user || token) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      saveLoginReturn(window.location.pathname + window.location.search);
    }
    router.replace("/auth/login" as any);
  }, [authLoading, user, token]);

  const { data: dmList = [] } = useQuery<DMItem[]>({
    queryKey: ["/api/dm-messages"],
  });

  function handleComposePress() {
    alertMessage(
      "Start a new DM",
      "Open someone's profile (for example from Live, Live Cast, or your Following list), then tap Message to start a conversation. New threads cannot be created from this list alone.",
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable onPress={handleComposePress} hitSlop={8}>
          <Ionicons name="create-outline" size={22} color={C.text} />
        </Pressable>
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        showsVerticalScrollIndicator={scrollShowsVertical}
      >
        {dmList.map((item, index) => (
          <View
            key={item.id}
            style={[styles.dmItem, index < dmList.length - 1 && styles.dmItemBorder]}
          >
            {item.otherUserId && item.otherUserId > 0 ? (
              <Pressable
                style={styles.avatarContainer}
                onPress={() => navigateToUserOrLiverProfile({ userId: item.otherUserId })}
                hitSlop={4}
              >
                <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
                {item.online && <View style={styles.onlineDot} />}
              </Pressable>
            ) : (
              <View style={styles.avatarContainer}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
                {item.online && <View style={styles.onlineDot} />}
              </View>
            )}

            <Pressable style={styles.content} onPress={() => router.push(`/dm/${item.id}`)}>
              <View style={styles.topRow}>
                <Text style={[styles.name, item.unread > 0 && styles.nameUnread]}>{item.name}</Text>
                <Text style={[styles.time, item.unread > 0 && styles.timeUnread]}>{item.time}</Text>
              </View>
              <View style={styles.bottomRow}>
                <Text
                  style={[styles.lastMessage, item.unread > 0 && styles.lastMessageUnread]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  dmItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dmItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.bg,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: C.textSec,
    fontSize: 15,
    fontWeight: "600",
  },
  nameUnread: {
    color: C.text,
    fontWeight: "700",
  },
  time: {
    color: C.textMuted,
    fontSize: 12,
  },
  timeUnread: {
    color: C.accent,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lastMessage: {
    flex: 1,
    color: C.textMuted,
    fontSize: 13,
  },
  lastMessageUnread: {
    color: C.textSec,
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: C.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
});
