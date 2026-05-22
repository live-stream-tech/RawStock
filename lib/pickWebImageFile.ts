/**
 * Open the native file picker on web. Keeps the input in the DOM until the user
 * chooses or cancels (immediate removeChild breaks the dialog on some browsers).
 */
export function pickWebImageFile(): Promise<File | null> {
  if (typeof document === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.opacity = "0";

    const finish = (file: File | null) => {
      input.remove();
      resolve(file);
    };

    input.addEventListener("change", () => {
      finish(input.files?.[0] ?? null);
    });
    input.addEventListener("cancel", () => finish(null));

    document.body.appendChild(input);
    input.click();
  });
}
