import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { analyzeImageTool } from "./tool.js";

const detailSchema = z.enum(["low", "high", "auto"]);

export function createVisualMcpServer(): McpServer {
  const server = new McpServer({
    name: "visual-mcp",
    version: "1.0.0"
  });

  server.registerTool(
    "analyze_image",
    {
      title: "Analyze local image",
      description:
        "Analyze a local PNG, JPEG, WebP, or non-animated GIF by sending it to a configured vision model. Use this when a text-only model needs visual understanding from an explicit image path.",
      inputSchema: {
        path: z.string().min(1).describe("Local image path to analyze."),
        question: z.string().min(1).describe("Question or task for the vision model."),
        provider: z.string().optional().describe("Optional configured provider name override."),
        model: z.string().optional().describe("Optional model override for this call."),
        detail: detailSchema.optional().describe("Vision detail level: low, high, or auto."),
        language: z.string().optional().describe("Output language. Defaults to auto, following the question language.")
      },
      outputSchema: {
        answer: z.string(),
        description: z.string(),
        observations: z.array(z.string()),
        ocr_text: z.string(),
        uncertainties: z.array(z.string()),
        provider: z.string(),
        model: z.string(),
        usage: z.unknown().optional(),
        warnings: z.array(z.string())
      }
    },
    async (args) => {
      const config = await loadConfig();
      return analyzeImageTool(args, { config });
    }
  );

  return server;
}
