/**
 * Web: LP is the canonical site from https://github.com/live-stream-tech/rawstock-lp
 * (embedded iframe; see components/RawstockLpContent.tsx and lib/rawstockLpSite.ts).
 */
import { RawstockLpContent } from "@/components/RawstockLpContent";
import { View } from "react-native";

export default function LpScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#07090f" }}>
      <RawstockLpContent />
    </View>
  );
}
