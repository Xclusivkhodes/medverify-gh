import { createHash } from "node:crypto";
import sharp from "sharp";

const MAX_EDGE = 1024;
const MAX_BYTES = 5 * 1024 * 1024;

export class ImageReject extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageReject";
  }
}

export type SanitizedImage = {
  dataUrl: string;
  sha256: string;
  width: number;
  height: number;
};

function magicOk(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const head = buf.subarray(0, 5).toString("utf8").toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml") || head.startsWith("<!doc")) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return true;
  return false;
}

/**
 * Check the type, cap the long edge, re-encode as JPEG, and drop EXIF.
 * Sharp strips metadata unless withMetadata() is asked for. rotate() applies
 * orientation first so the pixels stay upright after the EXIF block is gone.
 */
export async function sanitizePackImage(dataUrl: string): Promise<SanitizedImage> {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.trim());
  if (!match) throw new ImageReject("The photo must be an image.");
  if (/svg|xml/i.test(match[1])) throw new ImageReject("That file is not a photo we can read.");
  const raw = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (raw.length === 0 || raw.length > MAX_BYTES) {
    throw new ImageReject("That photo is too large. Try a closer crop of the label.");
  }
  if (!magicOk(raw)) throw new ImageReject("That file is not a photo we can read.");

  try {
    const oriented = sharp(raw, { failOn: "error", limitInputPixels: 20_000_000 }).rotate();
    const meta = await oriented.metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
      throw new ImageReject("That file is not a photo we can read.");
    }
    const bytes = await oriented
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    const out = await sharp(bytes).metadata();
    if (out.exif) throw new ImageReject("The photo still carried location data. Try again.");
    return {
      dataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}`,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width: out.width ?? 0,
      height: out.height ?? 0,
    };
  } catch (error) {
    if (error instanceof ImageReject) throw error;
    throw new ImageReject("That file is not a photo we can read.");
  }
}
