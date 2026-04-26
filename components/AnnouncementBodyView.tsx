import React from "react";
import { View, Text, StyleSheet, Linking, Platform } from "react-native";
import { C } from "@/constants/colors";
import {
  parseAnnouncementStructuredLines,
  sortAnnouncementFields,
  splitTextWithUrls,
} from "@/lib/announcement-body-format";

type Props = {
  text: string;
  /** full = thread modal; compact = board cards / feed snippets */
  variant: "full" | "compact";
  /** When set, clamps the prose block (after fields in compact). */
  proseNumberOfLines?: number;
  /** In compact mode, max label:value rows before prose (default 4). */
  maxCompactFields?: number;
};

function LinkedLine({
  content,
  baseStyle,
  linkStyle,
  numberOfLines,
}: {
  content: string;
  baseStyle: object;
  linkStyle: object;
  numberOfLines?: number;
}) {
  const parts = splitTextWithUrls(content);
  const hasUrl = parts.some((p) => p.kind === "url");
  if (!hasUrl) {
    return (
      <Text style={baseStyle} numberOfLines={numberOfLines}>
        {content}
      </Text>
    );
  }
  return (
    <Text style={baseStyle} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.kind === "url" ? (
          <Text
            key={i}
            style={linkStyle}
            onPress={() => {
              void Linking.openURL(p.value).catch(() => {});
            }}
          >
            {p.value}
          </Text>
        ) : (
          <Text key={i}>{p.value}</Text>
        ),
      )}
    </Text>
  );
}

export function AnnouncementBodyView({ text, variant, proseNumberOfLines, maxCompactFields = 4 }: Props) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;

  const { fields, proseLines } = parseAnnouncementStructuredLines(trimmed);
  const sorted = sortAnnouncementFields(fields);
  const proseJoined = proseLines.join("\n\n").trim();

  if (variant === "compact") {
    const showFields = sorted.slice(0, Math.max(0, maxCompactFields));
    return (
      <View style={styles.compactRoot}>
        {showFields.map((f) => (
          <View key={`${f.key}-${f.label}`} style={styles.compactRow}>
            <Text style={styles.compactLabel}>{f.label}</Text>
            <LinkedLine
              content={f.value}
              baseStyle={styles.compactValue}
              linkStyle={styles.link}
              numberOfLines={2}
            />
          </View>
        ))}
        {proseJoined ? (
          <LinkedLine
            content={proseJoined}
            baseStyle={styles.compactProse}
            linkStyle={styles.link}
            numberOfLines={proseNumberOfLines}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.fullRoot}>
      {sorted.map((f) => (
        <View key={`${f.key}-${f.label}`} style={styles.fullFieldBlock}>
          <Text style={styles.fullLabel}>{f.label}</Text>
          <LinkedLine content={f.value} baseStyle={styles.fullValue} linkStyle={styles.link} />
        </View>
      ))}
      {proseLines.map((line, i) => (
        <View key={`prose-${i}`} style={styles.fullProseBlock}>
          <LinkedLine content={line} baseStyle={styles.fullProse} linkStyle={styles.link} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRoot: { gap: 6 },
  compactRow: { gap: 2 },
  compactLabel: {
    color: C.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  compactValue: { color: C.textSec, fontSize: 12, lineHeight: 16 },
  compactProse: { color: C.textSec, fontSize: 12, lineHeight: 17, marginTop: 4 },
  fullRoot: { gap: 14 },
  fullFieldBlock: { gap: 4 },
  fullLabel: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  fullValue: { color: C.text, fontSize: 14, lineHeight: 21 },
  fullProseBlock: { marginTop: 2 },
  fullProse: { color: C.textSec, fontSize: 14, lineHeight: 22 },
  link: {
    color: C.accent,
    textDecorationLine: Platform.OS === "web" ? "underline" : "none",
    fontWeight: "600",
  },
});
