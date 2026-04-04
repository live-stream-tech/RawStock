/**
 * Expo config plugin: camera + microphone usage strings for live broadcast (native WebRTC / WHIP).
 * Apply after `npx expo prebuild` for native projects.
 */
const { withInfoPlist, withAndroidManifest } = require("@expo/config-plugins");

const IOS_CAMERA = "ライブ配信でカメラ映像を送るために使用します。";
const IOS_MIC = "ライブ配信で音声を送るために使用します。";

const ANDROID_PERMS = [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
];

function withLiveBroadcastPermissions(config) {
  config = withInfoPlist(config, (configMod) => {
    const p = configMod.modResults;
    if (!p.NSCameraUsageDescription) p.NSCameraUsageDescription = IOS_CAMERA;
    if (!p.NSMicrophoneUsageDescription) p.NSMicrophoneUsageDescription = IOS_MIC;
    return configMod;
  });

  config = withAndroidManifest(config, (configMod) => {
    const manifest = configMod.modResults.manifest;
    if (!Array.isArray(manifest["uses-permission"])) {
      manifest["uses-permission"] = [];
    }
    const list = manifest["uses-permission"];
    const existing = new Set(
      list.map((entry) => entry.$?.["android:name"]).filter(Boolean),
    );
    for (const name of ANDROID_PERMS) {
      if (!existing.has(name)) {
        list.push({ $: { "android:name": name } });
        existing.add(name);
      }
    }
    return configMod;
  });

  return config;
}

module.exports = withLiveBroadcastPermissions;
