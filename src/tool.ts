import { callVisionProvider } from "./providers.js";
import type { FetchLike } from "./providers.js";
import { prepareImage } from "./image.js";
import type { DetailLevel, VisualMcpConfig, VisionAnalysis } from "./types.js";

export interface AnalyzeImageArgs {
  path: string;
  question: string;
  model?: string;
  detail?: DetailLevel;
  language?: string;
}

export interface ToolDependencies {
  config: VisualMcpConfig;
  fetchImpl?: FetchLike;
}

interface ToolResult extends Record<string, unknown> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: VisionAnalysis;
  isError?: boolean;
}

function formatAnalysis(analysis: VisionAnalysis): string {
  const parts = [
    analysis.answer,
    analysis.description ? `\nDescription: ${analysis.description}` : "",
    analysis.observations.length ? `\nObservations:\n- ${analysis.observations.join("\n- ")}` : "",
    analysis.ocr_text ? `\nOCR text:\n${analysis.ocr_text}` : "",
    analysis.uncertainties.length ? `\nUncertainties:\n- ${analysis.uncertainties.join("\n- ")}` : "",
    analysis.warnings.length ? `\nWarnings:\n- ${analysis.warnings.join("\n- ")}` : ""
  ];
  return parts.filter(Boolean).join("");
}

export async function analyzeImageTool(args: AnalyzeImageArgs, dependencies: ToolDependencies): Promise<ToolResult> {
  try {
    const providerName = dependencies.config.providerName;
    const baseProvider = dependencies.config.provider;
    const provider = args.model ? { ...baseProvider, model: args.model } : baseProvider;
    const detail = args.detail ?? dependencies.config.defaultDetail ?? "auto";
    const language = args.language ?? dependencies.config.defaultLanguage ?? "auto";
    const image = await prepareImage(args.path, { maxImageBytes: dependencies.config.maxImageBytes });
    const analysis = await callVisionProvider({
      providerName,
      provider,
      image,
      question: args.question,
      detail,
      language,
      fetchImpl: dependencies.fetchImpl
    });

    return {
      content: [{ type: "text", text: formatAnalysis(analysis) }],
      structuredContent: analysis
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: "text", text: `visual-mcp analyze_image failed: ${message}` }]
    };
  }
}
