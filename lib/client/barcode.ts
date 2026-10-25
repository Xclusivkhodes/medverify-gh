/** Decode a GS1 DataMatrix or other barcode on the phone. No network. */

export async function decodeBarcode(dataUrl: string): Promise<string | null> {
  if (typeof window === "undefined" || !dataUrl.startsWith("data:image/")) return null;
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const result = await reader.decodeFromImageElement(image);
    const text = result.getText().replace(/\s+/g, " ").trim();
    return text || null;
  } catch {
    return null;
  }
}
