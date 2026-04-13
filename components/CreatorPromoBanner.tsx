import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";

type Props = {
  /** 画面ごとの余白調整（例: Profile は marginTop/MarginBottom が異なる） */
  style?: StyleProp<ViewStyle>;
};

export function CreatorPromoBanner({ style }: Props) {
  const isWeb = Platform.OS === "web";
  const [hireHovered, setHireHovered] = useState(false);
  const [aiHovered, setAiHovered] = useState(false);

  return (
    <View style={[styles.creatorBanner, style]}>
      <View style={styles.creatorBannerText}>
        <Text style={styles.creatorBannerTitle}>Get your live footage edited and published.</Text>
        <Text style={styles.creatorBannerSub}>
          Earn 90% of every sale. Your raw content, professionally packaged.
        </Text>
      </View>
      <View style={styles.creatorBannerBtns}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hire a Creator"
          onHoverIn={isWeb ? () => setHireHovered(true) : undefined}
          onHoverOut={isWeb ? () => setHireHovered(false) : undefined}
          style={({ pressed }) => [
            styles.creatorBtn,
            (pressed || hireHovered) && styles.creatorBtnGlow,
          ]}
          onPress={() => router.push("/find-editor" as any)}
        >
          {({ pressed }) => (
            <Text style={[styles.creatorBtnLabel, (pressed || hireHovered) && styles.creatorBtnLabelGlow]}>
              Hire a Creator
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="AI Edit"
          onHoverIn={isWeb ? () => setAiHovered(true) : undefined}
          onHoverOut={isWeb ? () => setAiHovered(false) : undefined}
          style={({ pressed }) => [
            styles.creatorBtn,
            styles.creatorBtnRow,
            (pressed || aiHovered) && styles.creatorBtnGlow,
          ]}
          onPress={() => router.push("/ai-edit" as any)}
        >
          {({ pressed }) => (
            <>
              <Ionicons name="sparkles-outline" size={12} color={C.text} />
              <Text style={[styles.creatorBtnLabel, (pressed || aiHovered) && styles.creatorBtnLabelGlow]}>
                AI Edit
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  creatorBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 0,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.accent,
    backgroundColor: "rgba(108,92,231,0.07)",
    gap: 12,
  },
  creatorBannerText: { gap: 4 },
  creatorBannerTitle: { color: C.text, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  creatorBannerSub: { color: C.textSec, fontSize: 11, lineHeight: 16 },
  creatorBannerBtns: { flexDirection: "row", gap: 8 },
  creatorBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(232, 228, 220, 0.22)",
    borderRadius: 7,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface2,
  },
  creatorBtnRow: { flexDirection: "row", gap: 5 },
  creatorBtnGlow: {
    backgroundColor: C.surface3,
    borderColor: "rgba(232, 228, 220, 0.35)",
  },
  creatorBtnLabel: { color: C.text, fontSize: 12, fontWeight: "800" },
  creatorBtnLabelGlow: { color: C.text },
});
