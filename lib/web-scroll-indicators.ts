import { Platform } from "react-native";

/**
 * react-native-web applies `scrollbar-width: none` when either scroll axis flag is false.
 * Keep native hidden; on web, show native scrollbars by forcing both flags true.
 */
export const scrollShowsVertical = Platform.OS === "web";
export const scrollShowsHorizontal = Platform.OS === "web";
