import { forwardRef, useImperativeHandle } from "react";

export type DeepARBroadcastProcessorHandle = {
  dispose: () => void;
};

export type DeepARBroadcastProcessorProps = {
  rawStream: MediaStream;
  licenseKey: string;
  blurStrength?: number;
  onReady: (mergedStream: MediaStream) => void;
  onError: (message: string) => void;
};

/** Web 実装は DeepARBroadcastProcessor.web.tsx。ネイティブでは未使用（配信画面は Web のみ）。 */
export const DeepARBroadcastProcessor = forwardRef<
  DeepARBroadcastProcessorHandle,
  DeepARBroadcastProcessorProps
>(function DeepARBroadcastProcessor(_props, ref) {
  useImperativeHandle(ref, () => ({ dispose: () => {} }), []);
  return null;
});
