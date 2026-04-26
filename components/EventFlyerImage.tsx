import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image, type ImageProps } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { resolvePublicMediaUri } from "@/lib/resolve-public-media-uri";
import { C } from "@/constants/colors";

type Props = {
  uri: string | null | undefined;
  /** If the primary image fails (expired URL, etc.), try this (e.g. community thumbnail). */
  fallbackUri?: string | null;
  style?: ImageProps["style"];
  contentFit?: ImageProps["contentFit"];
  contentPosition?: ImageProps["contentPosition"];
  recyclingKey?: string;
  cachePolicy?: ImageProps["cachePolicy"];
};

function trimMedia(s: string | null | undefined): string {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * Event announcement image with resolved URL (native-safe), optional fallback URL, then a styled placeholder.
 */
export function EventFlyerImage({
  uri,
  fallbackUri,
  style,
  contentFit = "cover",
  contentPosition,
  recyclingKey,
  cachePolicy = "memory-disk",
}: Props) {
  const primary = trimMedia(uri);
  const fallback = trimMedia(fallbackUri);

  const [tier, setTier] = useState<0 | 1 | 2>(() => {
    if (primary) return 0;
    if (fallback) return 1;
    return 2;
  });
  const [didLoad, setDidLoad] = useState(false);

  useEffect(() => {
    if (primary) setTier(0);
    else if (fallback) setTier(1);
    else setTier(2);
  }, [primary, fallback]);

  const sourceUri = useMemo(() => {
    if (tier === 0 && primary) return resolvePublicMediaUri(primary);
    if (tier === 1 && fallback) return resolvePublicMediaUri(fallback);
    return null;
  }, [tier, primary, fallback]);

  useEffect(() => {
    setDidLoad(false);
  }, [sourceUri]);

  useEffect(() => {
    if (!sourceUri || didLoad || tier >= 2) return;
    const t = setTimeout(() => {
      if (tier === 0 && fallback) setTier(1);
      else setTier(2);
    }, 7000);
    return () => clearTimeout(t);
  }, [sourceUri, didLoad, tier, fallback]);

  const imageKey = `${recyclingKey ?? "flyer"}-${tier}-${sourceUri?.slice(0, 48) ?? ""}`;

  if (tier >= 2 || !sourceUri) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="image-outline" size={32} color={C.textMuted} />
        <Text style={styles.placeholderLabel}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      key={imageKey}
      recyclingKey={imageKey}
      source={{ uri: sourceUri }}
      style={style}
      contentFit={contentFit}
      contentPosition={contentPosition}
      cachePolicy={cachePolicy}
      onLoad={() => setDidLoad(true)}
      onError={() => {
        if (tier === 0 && fallback) setTier(1);
        else setTier(2);
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: C.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderDim,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  placeholderLabel: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
