import { readFile } from "node:fs/promises";
import sharp from "sharp";

export interface PreparedImage {
  data: string;
  mimeType: string;
  width?: number;
  height?: number;
  bytes: number;
  warnings: string[];
}

export interface PrepareImageOptions {
  maxImageBytes?: number;
  maxDimension?: number;
}

const DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2048;

function detectMimeType(buffer: Buffer): string | undefined {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  const gifHeader = buffer.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return "image/gif";
  }
  return undefined;
}

function outputFormatForMime(mimeType: string): "png" | "jpeg" | "webp" | undefined {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpeg";
  if (mimeType === "image/webp") return "webp";
  return undefined;
}

export async function prepareImage(path: string, options: PrepareImageOptions = {}): Promise<PreparedImage> {
  const warnings: string[] = [];
  const original = await readFile(path);
  const mimeType = detectMimeType(original);
  if (!mimeType) {
    throw new Error("Unsupported image type. Supported types: PNG, JPEG, WebP, non-animated GIF.");
  }

  const metadata = await sharp(original, { animated: false }).metadata();
  if (mimeType === "image/gif" && metadata.pages && metadata.pages > 1) {
    throw new Error("Unsupported image type: animated GIFs are not supported.");
  }

  const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  let output: Buffer<ArrayBufferLike> = original;
  let outputMimeType = mimeType;

  const needsResize = Boolean(metadata.width && metadata.height && Math.max(metadata.width, metadata.height) > maxDimension);
  if (original.byteLength > maxImageBytes || needsResize) {
    const format = outputFormatForMime(mimeType) ?? "png";
    output = await sharp(original, { animated: false })
      .rotate()
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .toFormat(format)
      .toBuffer();
    outputMimeType = mimeType === "image/gif" ? "image/png" : mimeType;
    warnings.push("Image was resized or re-encoded before sending to the vision provider.");
  }

  return {
    data: output.toString("base64"),
    mimeType: outputMimeType,
    width: metadata.width,
    height: metadata.height,
    bytes: output.byteLength,
    warnings
  };
}
