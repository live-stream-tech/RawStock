import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "@/constants/colors";

type Props = {
  /**
   * 下のコンテンツとの間の余白をどれくらい作るか。
   * スクリーン側で paddingTop を合わせる想定。
   */
  height?: number;
};

/**
 * 各画面の上部に入れるネオンステージ背景。
 * 画面幅いっぱいに表示し、下端を暗くグラデーションさせてコンテンツに馴染ませる。
 */
export function TopStageBackground({ height = 28 }: Props) {
  const headerHeight = height;

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      <LinearGradient
        colors={["#050913", "#050913", C.bg]}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#02050A",
  },
  gradient: {
    ...(StyleSheet.absoluteFillObject as any),
  },
});

