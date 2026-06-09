import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createVisualMcpServer } from "../src/server.js";

describe("MCP server integration", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    vi.unstubAllGlobals();
  });

  test("lists and calls analyze_image over an MCP transport", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-mcp-integration-"));
    const imagePath = join(root, "sample.png");
    await sharp({
      create: {
        width: 12,
        height: 12,
        channels: 3,
        background: "#123456"
      }
    }).png().toFile(imagePath);
    await writeFile(
      join(root, "visual-mcp.config.json"),
      JSON.stringify({
        defaultProvider: "openai",
        providers: {
          openai: {
            type: "openai-chat",
            model: "gpt-4.1-mini",
            apiKey: "plain-secret"
          }
        }
      })
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    answer: "A blue square.",
                    description: "A small blue square image.",
                    observations: ["solid color"],
                    ocr_text: "",
                    uncertainties: []
                  })
                }
              }
            ]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    process.chdir(root);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createVisualMcpServer();
    const client = new Client({ name: "test-client", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("analyze_image");

    const result = await client.callTool({
      name: "analyze_image",
      arguments: {
        path: imagePath,
        question: "What is shown?"
      }
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      answer: "A blue square.",
      provider: "openai"
    });

    await client.close();
    await server.close();
  });
});
