import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as ImagePicker from "expo-image-picker";
import { C } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";

type DMItem = {
  id: number;
  name: string;
  avatar: string | null;
  online: boolean;
  lastMessage: string;
  otherUserId?: number;
};

type ConvMsg = {
  id: number;
  senderId: number | null;
  sender: string;
  text: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function DMChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dmId = parseInt(id ?? "1");
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [input, setInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user } = useAuth();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: dmList = [] } = useQuery<DMItem[]>({
    queryKey: ["/api/dm-messages"],
  });
  const dmInfo = dmList.find((d) => d.id === dmId);

  const { data: messages = [] } = useQuery<ConvMsg[]>({
    queryKey: [`/api/dm-messages/${dmId}/conversation`],
    refetchInterval: 4000,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest("POST", `/api/dm-messages/${dmId}/conversation`, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/dm-messages/${dmId}/conversation`] });
      qc.invalidateQueries({ queryKey: ["/api/dm-messages"] });
    },
  });

  const pickImage = useCallback(async () => {
    setUploadingImage(false);
  }, []);

  const sendMessage = useCallback(() => {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    sendMutation.mutate(msg);
  }, [input]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset + 10 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>

          {dmInfo ? (
            <Pressable style={styles.headerCenter}>
              <View style={styles.avatarWrap}>
                <Image source={dmInfo.avatar ? { uri: dmInfo.avatar } : undefined} style={styles.headerAvatar} contentFit="cover" />
                {dmInfo.online && <View style={styles.onlineDot} />}
              </View>
              <View>
                <Text style={styles.headerName}>{dmInfo.name}</Text>
                <Text style={styles.headerStatus}>
                  {dmInfo.online ? "Online" : "Recently offline"}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.headerCenter} />
          )}

          <Pressable style={styles.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={C.textSec} />
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showAvatar = item.sender === "them" && (prevMsg?.sender !== "them");
            return (
              <View style={[
                styles.msgRow,
                item.sender === "me" ? styles.msgRowMe : styles.msgRowThem,
              ]}>
                {item.sender === "them" && (
                  <View style={styles.avatarSpacer}>
                    {showAvatar && dmInfo?.avatar ? (
                      <Image source={{ uri: dmInfo.avatar }} style={styles.msgAvatar} contentFit="cover" />
                    ) : null}
                  </View>
                )}
                <View style={styles.msgGroup}>
                  <View style={[
                    styles.bubble,
                    item.sender === "me" ? styles.bubbleMe : styles.bubbleThem,
                  ]}>
                    <Text style={[styles.bubbleText, item.sender === "me" && styles.bubbleTextMe]}>
                      {item.text}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, item.sender === "me" && styles.timeTextMe]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: bottomInset + 8 }]}>
          <Pressable style={styles.attachBtn} onPress={pickImage} disabled={uploadingImage}>
            <Ionicons name="image-outline" size={24} color={uploadingImage ? C.accent : C.textSec} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={C.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]}
            onPress={sendMessage}
          >
            <Ionicons name="send" size={15} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: { position: "relative" },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.bg,
  },
  headerName: { color: C.text, fontSize: 15, fontWeight: "700" },
  headerStatus: { color: C.green, fontSize: 11, marginTop: 1 },
  menuBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 2 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowThem: { justifyContent: "flex-start" },
  avatarSpacer: { width: 30, flexShrink: 0 },
  msgAvatar: { width: 28, height: 28, borderRadius: 14 },
  msgGroup: { maxWidth: "72%", gap: 2 },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMe: {
    backgroundColor: C.accent,
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
  },
  bubbleThem: {
    backgroundColor: C.surface2,
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
  },
  bubbleText: { color: C.text, fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  timeText: { color: C.textMuted, fontSize: 10, paddingLeft: 4 },
  timeTextMe: { textAlign: "right", paddingLeft: 0, paddingRight: 4 },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  attachBtn: { paddingBottom: 7 },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: C.surface,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { backgroundColor: C.surface2 },
  bubbleImage: { width: 200, height: 150, borderRadius: 10 },
});
