import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test, vi } from "vitest";
import { analyzeImageTool } from "../src/tool.js";

describe("analyze_image tool", () => {
  test("returns both text content and structuredContent for successful analysis", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-mcp-tool-"));
    const imagePath = join(root, "sample.jpg");
    await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: "#ff8800"
      }
    }).jpeg().toFile(imagePath);

    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "It is an orange square.",
                  description: "A small orange image.",
                  observations: ["solid orange color"],
                  ocr_text: "",
                  uncertainties: []
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const result = await analyzeImageTool(
      { path: imagePath, question: "What is in this image?" },
      {
        config: {
          providerName: "openai",
          defaultDetail: "auto",
          provider: {
            type: "openai-chat",
            model: "gpt-4.1-mini",
            apiKey: "secret"
          }
        },
        fetchImpl
      }
    );

    expect(result.isError).toBeUndefined();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("It is an orange square.")
    });
    expect(result.structuredContent).toMatchObject({
      answer: "It is an orange square.",
      provider: "openai",
      model: "gpt-4.1-mini",
      warnings: []
    });
  });
});
