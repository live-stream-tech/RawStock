import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AuthGuard, useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";
import { EnneagramChart, ENNEAGRAM_TYPES } from "@/components/EnneagramChart";

const DEFAULT_ENNEAGRAM = [6, 5, 7, 4, 8, 5, 6, 4, 7];

export default function AccountEditScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { user, updateProfile } = useAuth();
  const needsSetup = !!(user && ["LINEユーザー", "Googleユーザー", "ユーザー", "Google User", "User"].includes((user.displayName ?? user.name ?? "").trim()));

  const [name, setName] = useState(user?.name ?? user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? user?.profileImageUrl ?? "");
  const [spotifyUrl, setSpotifyUrl] = useState(user?.spotifyUrl ?? "");
  const [appleMusicUrl, setAppleMusicUrl] = useState(user?.appleMusicUrl ?? "");
  const [bandcampUrl, setBandcampUrl] = useState(user?.bandcampUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(user?.instagramUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(user?.youtubeUrl ?? "");
  const [xUrl, setXUrl] = useState(user?.xUrl ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [enneagramScores, setEnneagramScores] = useState<number[]>(DEFAULT_ENNEAGRAM);
  const [pinnedCommunityIds, setPinnedCommunityIds] = useState<number[]>([]);

  const { data: myCommunities = [] } = useQuery<{ id: number; name: string; thumbnail: string; category: string }[]>({
    queryKey: ["/api/communities/me"],
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      setName(user.name ?? user.displayName ?? "");
      setBio(user.bio ?? "");
      setAvatar(user.avatar ?? user.profileImageUrl ?? "");
      setSpotifyUrl(user.spotifyUrl ?? "");
      setAppleMusicUrl(user.appleMusicUrl ?? "");
      setBandcampUrl(user.bandcampUrl ?? "");
      setInstagramUrl(user.instagramUrl ?? "");
      setYoutubeUrl(user.youtubeUrl ?? "");
      setXUrl(user.xUrl ?? "");
      setPhoneNumber(user.phoneNumber ?? "");
      if (user.enneagramScores && user.enneagramScores.length === 9) {
        setEnneagramScores(user.enneagramScores);
      }
      if (user.pinnedCommunityIds && user.pinnedCommunityIds.length > 0) {
        setPinnedCommunityIds(user.pinnedCommunityIds);
      }
    }
  }, [user]);

  function togglePinnedCommunity(id: number) {
    setPinnedCommunityIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  function changeEnneagramScore(index: number, delta: number) {
    setEnneagramScores((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, Math.min(10, next[index] + delta));
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your display name");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        avatar: avatar.trim() || null,
        spotifyUrl: spotifyUrl.trim() || null,
        appleMusicUrl: appleMusicUrl.trim() || null,
        bandcampUrl: bandcampUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        youtubeUrl: youtubeUrl.trim() || null,
        xUrl: xUrl.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        enneagramScores,
        pinnedCommunityIds,
      });
      Alert.alert("Saved", "Your profile has been updated", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Please try again later");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {needsSetup && (
            <View style={styles.setupBanner}>
              <Ionicons name="information-circle" size={20} color={C.accent} />
              <Text style={styles.setupBannerText}>
                Welcome! Please set up your profile before continuing.
              </Text>
            </View>
          )}
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Basic Info</Text>

          <Text style={styles.label}>Display Name</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your display name"
              placeholderTextColor={C.textMuted}
              maxLength={30}
            />
          </View>

          <Text style={styles.label}>Bio</Text>
          <View style={[styles.inputRow, styles.inputRowMultiline]}>
            <Ionicons name="text-outline" size={18} color={C.textMuted} style={{ marginTop: 2 }} />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Write a bio"
              placeholderTextColor={C.textMuted}
              multiline
              maxLength={200}
            />
          </View>

          <Text style={styles.label}>Avatar URL (optional)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="image-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={avatar}
              onChangeText={setAvatar}
              placeholder="https://..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarPreview} contentFit="cover" />
          ) : null}

          <Text style={styles.sectionTitle}>Social & Channels (Public)</Text>
          <Text style={styles.sectionHint}>Shown as icons on your profile</Text>

          <Text style={styles.label}>Instagram</Text>
          <View style={styles.inputRow}>
            <Ionicons name="logo-instagram" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={instagramUrl}
              onChangeText={setInstagramUrl}
              placeholder="https://www.instagram.com/..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <Text style={styles.label}>YouTube</Text>
          <View style={styles.inputRow}>
            <Ionicons name="logo-youtube" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              placeholder="https://www.youtube.com/@..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <Text style={styles.label}>X (Twitter)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="logo-twitter" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={xUrl}
              onChangeText={setXUrl}
              placeholder="https://x.com/..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <Text style={styles.sectionTitle}>Music Links (Public)</Text>
          <Text style={styles.sectionHint}>Music service links shown on your profile</Text>

          <Text style={styles.label}>Spotify</Text>
          <View style={styles.inputRow}>
            <Ionicons name="musical-notes-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={spotifyUrl}
              onChangeText={setSpotifyUrl}
              placeholder="https://open.spotify.com/..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <Text style={styles.label}>Apple Music</Text>
          <View style={styles.inputRow}>
            <Ionicons name="musical-notes-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={appleMusicUrl}
              onChangeText={setAppleMusicUrl}
              placeholder="https://music.apple.com/..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <Text style={styles.label}>Bandcamp</Text>
          <View style={styles.inputRow}>
            <Ionicons name="musical-notes-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={bandcampUrl}
              onChangeText={setBandcampUrl}
              placeholder="https://...bandcamp.com/..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <Text style={styles.sectionTitle}>Account Info (Private)</Text>
          <Text style={styles.sectionHint}>For verification only. Not visible to other users.</Text>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="e.g. +1 234 567 8900"
              placeholderTextColor={C.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.sectionTitle}>Public Profile</Text>
          <Text style={styles.sectionHint}>Visible to other users</Text>

          <Text style={styles.label}>Enneagram</Text>
          <View style={styles.enneagramWrap}>
            <EnneagramChart scores={enneagramScores} />
            <View style={styles.enneagramControls}>
              {ENNEAGRAM_TYPES.map((t, i) => (
                <View key={i} style={styles.enneagramRow}>
                  <View style={[styles.enneagramDot, { backgroundColor: t.color }]} />
                  <Text style={styles.enneagramLabel}>{t.label}</Text>
                  <Pressable style={styles.enneagramBtn} onPress={() => changeEnneagramScore(i, -1)}>
                    <Ionicons name="remove" size={14} color={C.text} />
                  </Pressable>
                  <Text style={styles.enneagramValue}>{enneagramScores[i]}</Text>
                  <Pressable style={styles.enneagramBtn} onPress={() => changeEnneagramScore(i, 1)}>
                    <Ionicons name="add" size={14} color={C.text} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.label}>Featured Communities (up to 4)</Text>
          <Text style={styles.sectionHint}>Select up to 4 communities to feature on your profile</Text>
          {myCommunities.length === 0 ? (
            <Text style={styles.hintText}>You haven't joined any communities yet</Text>
          ) : (
            <View style={styles.pinnedList}>
              {myCommunities.map((c) => {
                const isSelected = pinnedCommunityIds.includes(c.id);
                const canSelect = isSelected || pinnedCommunityIds.length < 4;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.pinnedItem, isSelected && styles.pinnedItemSelected]}
                    onPress={() => canSelect && togglePinnedCommunity(c.id)}
                    disabled={!canSelect}
                  >
                    <Image source={{ uri: c.thumbnail }} style={styles.pinnedThumb} contentFit="cover" />
                    <View style={styles.pinnedInfo}>
                      <Text style={styles.pinnedName} numberOfLines={1}>{c.name}</Text>
                      <Text style={styles.pinnedCategory} numberOfLines={1}>{c.category}</Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={C.accent} />
                    ) : (
                      <View style={styles.pinnedCheckEmpty} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  setupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(6,199,85,0.12)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(6,199,85,0.25)",
  },
  setupBannerText: { flex: 1, color: C.text, fontSize: 13, lineHeight: 18 },
  sectionTitle: { color: C.text, fontSize: 14, fontWeight: "700", marginBottom: 4, marginTop: 16 },
  sectionHint: { color: C.textMuted, fontSize: 11, marginBottom: 12 },
  label: { color: C.textSec, fontSize: 12, fontWeight: "600", marginTop: 14, marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  inputRowMultiline: { alignItems: "flex-start", paddingVertical: 12 },
  input: { flex: 1, color: C.text, fontSize: 14, paddingVertical: 2 },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  avatarPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: 12,
    borderWidth: 2,
    borderColor: C.accent,
    alignSelf: "center",
  },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 28 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  cancelText: { color: C.textSec, fontSize: 14, fontWeight: "700" },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  enneagramWrap: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: "center",
  },
  enneagramControls: { marginTop: 12, width: "100%", gap: 6 },
  enneagramRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  enneagramDot: { width: 8, height: 8, borderRadius: 4 },
  enneagramLabel: { flex: 1, color: C.text, fontSize: 12 },
  enneagramBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  enneagramValue: { width: 20, textAlign: "center", color: C.text, fontSize: 13, fontWeight: "700" },
  hintText: { color: C.textMuted, fontSize: 13, marginTop: 8 },
  pinnedList: { marginTop: 8, gap: 8 },
  pinnedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  pinnedItemSelected: { borderColor: C.accent },
  pinnedThumb: { width: 48, height: 36, borderRadius: 6 },
  pinnedInfo: { flex: 1, marginLeft: 12 },
  pinnedName: { color: C.text, fontSize: 13, fontWeight: "600" },
  pinnedCategory: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  pinnedCheckEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border },
});
