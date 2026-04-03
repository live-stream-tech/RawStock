const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// vite-app/ は Vite 用の別アプリ。Expo ビルドでは react-router がなくエラーになるため除外
const projectVitePath = path.resolve(__dirname, "vite-app");
const projectViteRegex = new RegExp(
  "^" + projectVitePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\\\/]"
);
config.resolver.blockList = [
  projectViteRegex,
  ...(config.resolver.blockList ?? []),
];

module.exports = config;
