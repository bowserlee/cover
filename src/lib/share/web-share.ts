export interface ShareResult {
  method: "share" | "clipboard";
}

export async function nativeShare(text: string): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return { method: "share" };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { method: "share" };
      }
      // Other share failures fall through to clipboard
    }
  }

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined"
  ) {
    await navigator.clipboard.writeText(text);
    return { method: "clipboard" };
  }

  throw new Error("Neither Web Share nor Clipboard API available");
}
