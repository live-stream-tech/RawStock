import { Slot } from "expo-router";

/**
 * Flat layout (no nested stack). On web, a Stack kept both upload screens in the DOM;
 * the inactive screen's full-screen layer blocked all taps on /upload/work.
 */
export default function UploadLayout() {
  return <Slot />;
}
