import React from "react";
import { Platform, Text, View } from "react-native";

/* LPはスタンドアロンHTMLをiframeで表示（親アプリのスタイル干渉を回避） */
const LP_IFRAME_SRC = "/lp-standalone.html";

export function RawstockLpContent() {
  if (Platform.OS !== "web") {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", backgroundColor: "#07090f" }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          LPはWebブラウザでご覧ください。
        </Text>
      </View>
    );
  }

  return (
    <iframe
      src={LP_IFRAME_SRC}
      title="RawStock LP"
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
