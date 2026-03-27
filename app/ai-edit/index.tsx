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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { C } from "@/constants/colors";

export default function AIEditIndexScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { videoUrl: initialVideoUrl } = useLocalSearchParams<{ videoUrl?: string }>();
  const { user, requireAuth } = useAuth();

  const [videoUrl, setVideoUrl] = useState(initialVideoUrl ?? "");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!requireAuth("AI Edit Assistant")) return;
    if (!videoUrl.trim()) {
      Alert.alert("Missing Input", "Please enter a video URL.");
      return;
    }
    if (!prompt.trim()) {
      Alert.alert("Missing Input", "Please enter editing instructions.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/ai-edit/jobs", {
        videoUrl: videoUrl.trim(),
        prompt: prompt.trim(),
      });
      const data = (await res.json()) as { id: number; status: string };
      router.replace(`/ai-edit/${data.id}`);
    } catch (e: any) {
      Alert.alert("Error", "Failed to create job. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Edit Assistant</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={C.accent} />
            <Text style={styles.heroBadgeText}>Powered by Claude AI</Text>
          </View>
          <Text style={styles.heroTitle}>AI generates your{"\n"}edit plan automatically</Text>
          <Text style={styles.heroSub}>
            Just enter a video URL and your editing instructions — Claude will suggest cuts, timestamps, and direction notes in structured JSON.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Video URL *</Text>
            <TextInput
              style={styles.input}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://... (YouTube, R2, cloud storage, etc.)"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Editing Instructions *</Text>
            <TextInput
              style={[styles.input, styles.inputTall]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. Highlight the best 3 minutes of the guitar solo. Focus on the most exciting moments."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.examplesCard}>
          <Text style={styles.examplesTitle}>Prompt Examples</Text>
          {[
            "Highlight the best 3 minutes of the guitar solo",
            "Swap the opening and ending with the most exciting scenes",
            "Use lots of crowd reaction shots to capture the live energy",
            "Add a title card with the song name and performer at the start",
          ].map((ex) => (
            <Pressable
              key={ex}
              style={styles.exampleChip}
              onPress={() => setPrompt(ex)}
            >
              <Ionicons name="arrow-forward-circle-outline" size={14} color={C.accent} />
              <Text style={styles.exampleText}>{ex}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.submitBtn, (!videoUrl.trim() || !prompt.trim() || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!videoUrl.trim() || !prompt.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name="sparkles" size={16} color="#000" />
          )}
          <Text style={styles.submitBtnText}>
            {loading ? "Submitting..." : "Generate Edit Plan"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", color: C.text, fontSize: 16, fontWeight: "700" },
  scroll: { flex: 1 },
  hero: { margin: 16, marginBottom: 12, gap: 8 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.accent + "22",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  heroBadgeText: { color: C.accent, fontSize: 11, fontWeight: "700" },
  heroTitle: { color: C.text, fontSize: 24, fontWeight: "800", lineHeight: 32 },
  heroSub: { color: C.textSec, fontSize: 13, lineHeight: 20 },
  form: { marginHorizontal: 16, gap: 14, marginBottom: 16 },
  field: { gap: 6 },
  label: { color: C.textSec, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  input: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
  },
  inputTall: { minHeight: 110, textAlignVertical: "top" },
  examplesCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderDim,
    gap: 8,
    marginBottom: 20,
  },
  examplesTitle: { color: C.textSec, fontSize: 12, fontWeight: "700", marginBottom: 2 },
  exampleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  exampleText: { color: C.textSec, fontSize: 13, flex: 1 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    marginHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },
});
