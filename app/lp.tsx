/**
 * Web: the visible LP is loaded from `public/lp-standalone.html` (iframe in RawstockLpContent).
 * Edit that file (and deploy) to change production /lp — not this screen’s wrapper alone.
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
