import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { prepareImage } from "../src/image.js";

describe("image preparation", () => {
  test("reads supported images as base64 data with a detected mime type", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-mcp-image-"));
    const imagePath = join(root, "sample.png");
    await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: "#336699"
      }
    }).png().toFile(imagePath);

    const image = await prepareImage(imagePath);

    expect(image.mimeType).toBe("image/png");
    expect(image.data).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(image.width).toBe(32);
    expect(image.height).toBe(24);
    expect(image.warnings).toEqual([]);
  });

  test("rejects unsupported file content even when a path is provided", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-mcp-image-"));
    const textPath = join(root, "not-image.txt");
    await writeFile(textPath, "not an image");

    await expect(prepareImage(textPath)).rejects.toThrow(/Unsupported image type/);
  });
});
