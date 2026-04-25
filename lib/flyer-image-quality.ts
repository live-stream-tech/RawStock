import { Image as RNImage, Platform } from "react-native";

/** Short edge must be at least this (discourages tiny screenshots / chat captures). */
export const MIN_FLYER_SHORT_EDGE_PX = 720;

export function flyerShortEdge(width: number, height: number): number {
  return Math.min(width, height);
}

export function assertFlyerResolutionOk(width: number, height: number): void {
  const short = flyerShortEdge(width, height);
  if (short < MIN_FLYER_SHORT_EDGE_PX) {
    throw new Error(
      `Image is too small (short edge ${short}px). Download an official flyer from the promoter or venue and upload that. Screenshots are not recommended (use at least ${MIN_FLYER_SHORT_EDGE_PX}px on the short edge).`,
    );
  }
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
