import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";
import { webScrollStyle } from "@/constants/layout";
import { AppLogo } from "@/components/AppLogo";
import { getCommunityDefaultAssets } from "@/lib/community-default-assets";

export default function CreateCommunityScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    stationId?: string;
    stationName?: string;
    stationCategory?: string;
  }>();
  const linkedStationName = (params.stationName ?? "").trim();
  const linkedStationCategory = (params.stationCategory ?? "").trim() || "General";

  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);

  async function pickImage(kind: "banner" | "icon") {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          if (kind === "banner") setBannerUri(url);
          else setIconUri(url);
        }
      };
      input.click();
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your media library to select images");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
      aspect: kind === "banner" ? [16, 9] : [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      if (kind === "banner") setBannerUri(result.assets[0].uri);
      else setIconUri(result.assets[0].uri);
    }
  }

  const canSubmit = name.trim().length > 0 && description.trim().length >= 10;

  function openConsentModal() {
    if (!canSubmit || creating) return;
    setConsentAgreed(false);
    setShowConsentModal(true);
  }

  async function handleCreate() {
    if (!canSubmit || creating || !consentAgreed) return;
    setShowConsentModal(false);
    setCreating(true);

    try {
      const primaryCategory = linkedStationCategory;
      const defaults = getCommunityDefaultAssets(primaryCategory);
      const bannerUrl = bannerUri ?? defaults.bannerUrl;
      const iconUrl = iconUri ?? defaults.iconUrl;

      const res = await apiRequest("POST", "/api/communities", {
        name: name.trim(),
        description: description.trim(),
        bannerUrl,
        iconUrl,
        categories: [primaryCategory],
        primaryCategory,
      });
      const newCommunity = await res.json();

      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });

      // Navigate immediately without relying on Alert (web fallback).
      if (newCommunity?.id != null) {
        router.replace(`/community/${newCommunity.id}`);
      } else {
        router.replace("/community");
      }
      Alert.alert("Community Created", "Your community is live. You can access it from the home and post screens.");
    } catch (e: any) {
      const msg =
        e?.message && typeof e.message === "string"
          ? e.message
          : "Failed to create community. Please try again later.";
      Alert.alert("Error", msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <AppLogo height={36} />
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { flex: 1 }]}>Create Community</Text>
      </View>

      <ScrollView
        style={webScrollStyle(styles.scroll)}
        showsVerticalScrollIndicator={scrollShowsVertical}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner image */}
        <View style={styles.section}>
          <Text style={styles.label}>Banner Image (optional)</Text>
          <Pressable style={styles.bannerPicker} onPress={() => pickImage("banner")}>
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={styles.bannerPreview} contentFit="cover" />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image-outline" size={32} color={C.accent} />
                <Text style={styles.bannerPlaceholderText}>Tap to select image</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Icon image */}
        <View style={styles.section}>
          <Text style={styles.label}>Icon Image (optional)</Text>
          <Pressable style={styles.iconPicker} onPress={() => pickImage("icon")}>
            {iconUri ? (
              <Image source={{ uri: iconUri }} style={styles.iconPreview} contentFit="cover" />
            ) : (
              <View style={styles.iconPlaceholderInner}>
                <Ionicons name="person-circle-outline" size={32} color={C.accent} />
                <Text style={styles.iconPlaceholderText}>Tap to select</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Community name */}
        <View style={styles.section}>
          {linkedStationName ? (
            <View style={styles.stationLinkBox}>
              <Ionicons name="git-network-outline" size={14} color={C.accent} />
              <Text style={styles.stationLinkText}>
                Linked to Official Station: {linkedStationName}
              </Text>
            </View>
          ) : null}
          <Text style={styles.label}>
            Community Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Underground Idol Fan Club"
            placeholderTextColor={C.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
          <Text style={styles.charCount}>{name.length}/40</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>At least 10 characters</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe who this community is for, what content you share, and any community rules."
            placeholderTextColor={C.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            maxLength={800}
          />
          <Text
            style={[
              styles.charCount,
              description.trim().length < 10 && description.length > 0 && { color: C.live },
            ]}
          >
            {description.length}/800 ({description.trim().length} chars)
          </Text>
        </View>

        {/* Consent confirmation modal */}
        <Modal visible={showConsentModal} transparent animationType="fade">
          <Pressable style={styles.consentModalOverlay} onPress={() => setShowConsentModal(false)}>
            <Pressable style={styles.consentModalBox} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.consentModalTitle}>Before You Create</Text>
              <Text style={styles.consentModalIntro}>Please read and agree to the following terms.</Text>
              <View style={styles.consentBullets}>
                <Text style={styles.consentBullet}>· Banner ad revenue settings follow current platform policy</Text>
                <Text style={styles.consentBullet}>· Community management settings follow current platform rules</Text>
                <Text style={styles.consentBullet}>· If 50% of members vote no-confidence, the admin is replaced</Text>
                <Text style={styles.consentBullet}>· A new admin is elected from moderators (or all members if no mods exist)</Text>
                <Text style={styles.consentBullet}>· Moderators are appointed by the admin</Text>
              </View>
              <Pressable
                style={styles.consentCheckRow}
                onPress={() => setConsentAgreed((a) => !a)}
              >
                <View style={[styles.consentCheckbox, consentAgreed && styles.consentCheckboxChecked]}>
                  {consentAgreed && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.consentCheckLabel}>I agree to the above</Text>
              </Pressable>
              <View style={styles.consentModalActions}>
                <Pressable style={styles.consentCancelBtn} onPress={() => setShowConsentModal(false)}>
                  <Text style={styles.consentCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.consentConfirmBtn, !consentAgreed && styles.consentConfirmBtnDisabled]}
                  disabled={!consentAgreed}
                  onPress={handleCreate}
                >
                  <Text style={styles.consentConfirmText}>Agree & Create</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Create button */}
        <View style={[styles.submitSection, { paddingBottom: bottomInset + 24 }]}>
          <Pressable
            style={[styles.submitBtn, (!canSubmit || creating) && styles.submitBtnDisabled]}
            disabled={!canSubmit || creating}
            onPress={openConsentModal}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
            )}
            <Text style={styles.submitBtnText}>
              {creating ? "Creating..." : "Create Community"}
            </Text>
          </Pressable>
          {!canSubmit && (
            <Text style={styles.submitHint}>
              Enter a community name and description (at least 10 characters)
            </Text>
          )}
        </View>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  stationLinkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  stationLinkText: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  label: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  required: {
    color: C.live,
  },
  hint: {
    color: C.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  bannerPicker: {
    height: 170,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  bannerPreview: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerPlaceholderText: {
    color: C.textMuted,
    fontSize: 13,
  },
  iconPicker: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPreview: {
    width: "100%",
    height: "100%",
  },
  iconPlaceholderInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconPlaceholderText: {
    color: C.textMuted,
    fontSize: 11,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },
  textarea: {
    height: 120,
    textAlignVertical: "top",
  },
  charCount: {
    color: C.textMuted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  submitSection: {
    marginHorizontal: 16,
    marginTop: 28,
    alignItems: "center",
    gap: 10,
  },
  submitBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitBtnDisabled: {
    backgroundColor: C.surface3,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  submitHint: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: "center",
  },

  consentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  consentModalBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  consentModalTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  consentModalIntro: {
    color: C.textSec,
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  consentBullets: { gap: 10, marginBottom: 20 },
  consentBullet: {
    color: C.textSec,
    fontSize: 13,
    lineHeight: 20,
  },
  consentCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  consentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  consentCheckboxChecked: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  consentCheckLabel: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  consentModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  consentCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  consentCancelText: { color: C.textSec, fontSize: 14, fontWeight: "700" },
  consentConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
  },
  consentConfirmBtnDisabled: { backgroundColor: C.surface3, opacity: 0.8 },
  consentConfirmText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});

