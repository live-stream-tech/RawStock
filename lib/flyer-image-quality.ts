import { Image as RNImage, Platform } from "react-native";

/**
 * Minimum short edge for an uploaded event-poster screenshot.
 * Full-screen phone captures of ticketing apps or calendars are expected.
 */
export const MIN_SCREENSHOT_SHORT_EDGE_PX = 320;

/** @deprecated Use MIN_SCREENSHOT_SHORT_EDGE_PX */
export const MIN_FLYER_SHORT_EDGE_PX = MIN_SCREENSHOT_SHORT_EDGE_PX;

export function screenshotShortEdge(width: number, height: number): number {
  return Math.min(width, height);
}

/** @deprecated Use screenshotShortEdge */
export function flyerShortEdge(width: number, height: number): number {
  return screenshotShortEdge(width, height);
}

export function assertAnnouncementScreenshotResolutionOk(width: number, height: number): void {
  const short = screenshotShortEdge(width, height);
  if (short < MIN_SCREENSHOT_SHORT_EDGE_PX) {
    throw new Error(
      `Screenshot is too small (short edge ${short}px). Capture the event screen full-screen, then upload again — short edge must be at least ${MIN_SCREENSHOT_SHORT_EDGE_PX}px.`,
    );
  }
}

/** @deprecated Use assertAnnouncementScreenshotResolutionOk */
export function assertFlyerResolutionOk(width: number, height: number): void {
  assertAnnouncementScreenshotResolutionOk(width, height);
}

export async function readImageDimensionsFromFileWeb(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file);
    try {
      return { width: bmp.width, height: bmp.height };
    } finally {
      bmp.close();
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

export async function readImageDimensionsFromUri(uri: string): Promise<{ width: number; height: number }> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return await new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Could not read image dimensions."));
      img.src = uri;
    });
  }
  return await new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error("Could not read image dimensions.")),
    );
  });
}
