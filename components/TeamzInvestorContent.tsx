import React from "react";
import { Platform, Text, View } from "react-native";

const TEAMZ_IFRAME_SRC = "/teamz.html";

export function TeamzInvestorContent() {
  if (Platform.OS !== "web") {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", backgroundColor: "#07090f" }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          このページはWebブラウザでご覧ください。
        </Text>
      </View>
    );
  }

  return (
    <iframe
      src={TEAMZ_IFRAME_SRC}
      title="RawStock — Investors & Partners"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
      }}
    />
  );
}
