import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { C } from "@/constants/colors";

/** Center header block: thin diagonal "Coming soon" ribbon above the AI Edit title. */
export function AIEditHeaderTitle() {
  return (
    <View style={styles.wrap}>
      <View style={styles.ribbon}>
        <Text style={styles.ribbonText}>Coming soon</Text>
      </View>
      <Text style={styles.title}>AI Edit Assistant</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ribbon: {
    backgroundColor: C.amber,
    paddingVertical: 1,
    paddingHorizontal: 9,
    borderRadius: 2,
    transform: [{ rotate: "-12deg" }],
    marginBottom: 5,
  },
  ribbonText: {
    color: "#0a0a0a",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    textAlign: "center",
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
