import type { DetailLevel, ProviderConfig, ProviderType, VisualMcpConfig } from "./types.js";

const providerTypes = ["openai-chat", "openai-responses", "anthropic"] as const satisfies readonly ProviderType[];
const detailLevels = ["low", "high", "auto"] as const satisfies readonly DetailLevel[];

export interface LoadConfigOptions {
  env?: NodeJS.ProcessEnv;
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

function optionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function parseProviderType(value: string): ProviderType {
  if ((providerTypes as readonly string[]).includes(value)) {
    return value as ProviderType;
  }
  throw new Error("VISUAL_MCP_PROVIDER_TYPE must be one of openai-chat, openai-responses, or anthropic.");
}

function parseDetail(value: string | undefined): DetailLevel {
  if (!value) {
    return "auto";
  }
  if ((detailLevels as readonly string[]).includes(value)) {
    return value as DetailLevel;
  }
  throw new Error("VISUAL_MCP_DETAIL must be one of low, high, or auto.");
}

function parsePositiveInteger(value: string | undefined, name: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<VisualMcpConfig> {
  const env = options.env ?? process.env;
  const provider: ProviderConfig = {
    type: parseProviderType(requiredEnv(env, "VISUAL_MCP_PROVIDER_TYPE")),
    model: requiredEnv(env, "VISUAL_MCP_MODEL"),
    apiKey: requiredEnv(env, "VISUAL_MCP_API_KEY")
  };
  const baseUrl = optionalEnv(env, "VISUAL_MCP_BASE_URL");
  const maxTokens = parsePositiveInteger(optionalEnv(env, "VISUAL_MCP_MAX_TOKENS"), "VISUAL_MCP_MAX_TOKENS");

  if (baseUrl) {
    provider.baseUrl = baseUrl;
  }
  if (maxTokens) {
    provider.maxTokens = maxTokens;
  }

  return {
    providerName: optionalEnv(env, "VISUAL_MCP_PROVIDER_NAME") ?? "default",
    defaultDetail: parseDetail(optionalEnv(env, "VISUAL_MCP_DETAIL")),
    defaultLanguage: optionalEnv(env, "VISUAL_MCP_LANGUAGE") ?? "auto",
    maxImageBytes: parsePositiveInteger(optionalEnv(env, "VISUAL_MCP_MAX_IMAGE_BYTES"), "VISUAL_MCP_MAX_IMAGE_BYTES"),
    provider
  };
}

export function resolveApiKey(provider: Pick<ProviderConfig, "apiKey" | "type">): string {
  if (provider.apiKey) {
    return provider.apiKey;
  }
  throw new Error(`Missing API key for ${provider.type}. Set VISUAL_MCP_API_KEY.`);
}
