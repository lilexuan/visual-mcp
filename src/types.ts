export type ProviderType = "openai-chat" | "openai-responses" | "anthropic";
export type DetailLevel = "low" | "high" | "auto";

export interface ProviderConfig {
  type: ProviderType;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
}

export interface VisualMcpConfig {
  providerName: string;
  provider: ProviderConfig;
  defaultDetail?: DetailLevel;
  defaultLanguage?: string;
  maxImageBytes?: number;
}

export interface VisionAnalysis extends Record<string, unknown> {
  answer: string;
  description: string;
  observations: string[];
  ocr_text: string;
  uncertainties: string[];
  provider: string;
  model: string;
  usage?: unknown;
  warnings: string[];
}
