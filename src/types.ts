export type ProviderType = "openai-chat" | "openai-responses" | "anthropic";
export type DetailLevel = "low" | "high" | "auto";

export interface ProviderConfig {
  type: ProviderType;
  model?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  maxTokens?: number;
}

export interface VisualMcpConfig {
  defaultProvider: string;
  defaultDetail?: DetailLevel;
  defaultLanguage?: string;
  maxImageBytes?: number;
  providers: Record<string, ProviderConfig>;
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
