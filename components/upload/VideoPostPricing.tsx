import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { C } from "@/constants/colors";

export type VideoFeeType = "free" | "paid";
export type VideoPriceOption = 300 | 500 | 1000 | 2000 | 3000 | 5000;

export const VIDEO_POST_PRICE_OPTIONS: VideoPriceOption[] = [300, 500, 1000, 2000, 3000, 5000];

type Props = {
  fee: VideoFeeType;
  price: VideoPriceOption;
  onFeeChange: (fee: VideoFeeType) => void;
  onPriceChange: (price: VideoPriceOption) => void;
  hint: string;
  freeLabel: string;
  paidLabel: string;
  hasVideo: boolean;
  needsVideoHint: string;
};

export function VideoPostPricing({
  fee,
  price,
  onFeeChange,
  onPriceChange,
  hint,
  freeLabel,
  paidLabel,
  hasVideo,
  needsVideoHint,
}: Props) {
  const disabled = !hasVideo;

  return (
    <View style={[styles.wrap, disabled && styles.wrapMuted]}>
      <Text style={styles.hint}>{hint}</Text>
      {!hasVideo ? <Text style={styles.needsVideo}>{needsVideoHint}</Text> : null}
      <View style={styles.feeRow}>
        <Pressable
          style={[styles.feeBtn, fee === "free" && styles.feeBtnActive, disabled && styles.btnDisabled]}
          onPress={() => !disabled && onFeeChange("free")}
          disabled={disabled}
        >
          <Text style={[styles.feeBtnText, fee === "free" && styles.feeBtnTextActive]}>{freeLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.feeBtn, fee === "paid" && styles.feeBtnActive, disabled && styles.btnDisabled]}
          onPress={() => !disabled && onFeeChange("paid")}
          disabled={disabled}
        >
          <Text style={[styles.feeBtnText, fee === "paid" && styles.feeBtnTextActive]}>{paidLabel}</Text>
        </Pressable>
      </View>
      {hasVideo && fee === "paid" ? (
        <View style={styles.priceRow}>
          {VIDEO_POST_PRICE_OPTIONS.map((p) => (
            <Pressable
              key={p}
              style={[styles.priceBtn, price === p && styles.priceBtnActive]}
              onPress={() => onPriceChange(p)}
            >
              <Text style={[styles.priceBtnText, price === p && styles.priceBtnTextActive]}>🎟{p}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {hasVideo && fee === "paid" ? (
        <Text style={styles.selectedPrice}>🎟{price.toLocaleString()}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: "rgba(0,255,204,0.06)",
    gap: 10,
  },
  wrapMuted: {
    borderColor: C.borderDim,
    backgroundColor: C.surface2,
  },
  hint: { color: C.text, fontSize: 13, fontWeight: "700" },
  needsVideo: { color: C.textMuted, fontSize: 12, lineHeight: 16 },
  feeRow: { flexDirection: "row", gap: 10 },
  feeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderDim,
    alignItems: "center",
    backgroundColor: C.surface,
  },
  feeBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  feeBtnText: { color: C.textSec, fontSize: 14, fontWeight: "700" },
  feeBtnTextActive: { color: "#050505" },
  btnDisabled: { opacity: 0.55 },
  priceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: C.surface,
  },
  priceBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  priceBtnText: { color: C.textSec, fontSize: 13, fontWeight: "700" },
  priceBtnTextActive: { color: "#050505" },
  selectedPrice: { color: C.accent, fontSize: 15, fontWeight: "800", textAlign: "center" },
});
