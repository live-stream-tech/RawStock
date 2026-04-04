import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { C } from "@/constants/colors";
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
};

const PLACEHOLDER = [
  {
    id: "1",
    name: "Alice Ohka",
    avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=100&h=100&fit=crop",
    lastMessage: "Thanks! Looking forward to your next stream too",
    time: "Just now",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "Emily Sensei",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    lastMessage: "Our next lesson is 3/2 at 7 PM. Can't wait!",
    time: "5m ago",
    unread: 1,
    online: true,
  },
  {
    id: "3",
    name: "Rin Hoshizora",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop",
    lastMessage: "I'll send you the reading results via DM",
    time: "12m ago",
    unread: 0,
    online: false,
  },
  {
    id: "4",
    name: "Miku (Counselor)",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    lastMessage: "Thank you for sharing how you feel",
    time: "1h ago",
    unread: 0,
    online: true,
  },
  {
    id: "5",
    name: "Haruka (Chef)",
    avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=100&h=100&fit=crop",
    lastMessage: "Sent you the recipe! Give it a try 🍳",
    time: "3h ago",
    unread: 0,
    online: false,
  },
  {
    id: "6",
    name: "Kenji (Life Coach)",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    lastMessage: "Checked your goal sheet — great progress!",
    time: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: "7",
    name: "Nana (Yoga)",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    lastMessage: "See you in tomorrow's class!",
    time: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: "8",
    name: "Underground Idol Scene",
    avatar: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop",
    lastMessage: "[Notice] Live stream starts tonight at 9 PM",
    time: "2d ago",
    unread: 0,
    online: false,
  },
];

export default function DMScreen() {
  const insets = useSafeAreaInsets();
  const topInset = getTabTopInset(insets);
  const bottomInset = getTabBottomInset();

  const { data: dmList = [] } = useQuery<DMItem[]>({
    queryKey: ["/api/dm-messages"],
  });

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable>
          <Ionicons name="create-outline" size={22} color={C.text} />
        </Pressable>
      </View>
      <MetallicLine thickness={1} style={{ marginHorizontal: 16 }} />

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        showsVerticalScrollIndicator={scrollShowsVertical}
      >
        {dmList.map((item, index) => (
          <Pressable
            key={item.id}
            style={[styles.dmItem, index < dmList.length - 1 && styles.dmItemBorder]}
            onPress={() => router.push(`/dm/${item.id}`)}
          >
            <View style={styles.avatarContainer}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
              {item.online && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.content}>
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
            </View>
          </Pressable>
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
