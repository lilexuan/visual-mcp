import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ProviderConfig, VisualMcpConfig } from "./types.js";

const GLOBAL_CONFIG_RELATIVE_PATH = join(".visual-mcp", "config.json");
const PROJECT_CONFIG_FILE = "visual-mcp.config.json";

export interface LoadConfigOptions {
  cwd?: string;
  homeDir?: string;
}

const defaultConfig: VisualMcpConfig = {
  defaultProvider: "openai",
  defaultDetail: "auto",
  defaultLanguage: "auto",
  providers: {}
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(path: string): Promise<Partial<T> | undefined> {
  if (!(await pathExists(path))) {
    return undefined;
  }
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as Partial<T>;
}

export function mergeConfig(globalConfig?: Partial<VisualMcpConfig>, projectConfig?: Partial<VisualMcpConfig>): VisualMcpConfig {
  const mergedProviders: Record<string, ProviderConfig> = {};

  for (const [name, provider] of Object.entries(globalConfig?.providers ?? {})) {
    mergedProviders[name] = { ...provider };
  }
  for (const [name, provider] of Object.entries(projectConfig?.providers ?? {})) {
    mergedProviders[name] = { ...(mergedProviders[name] ?? {}), ...provider };
  }

  return {
    ...defaultConfig,
    ...globalConfig,
    ...projectConfig,
    providers: mergedProviders
  };
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<VisualMcpConfig> {
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? homedir();
  const globalPath = join(homeDir, GLOBAL_CONFIG_RELATIVE_PATH);
  const projectPath = join(cwd, PROJECT_CONFIG_FILE);

  const globalConfig = await readJsonFile<VisualMcpConfig>(globalPath);
  const projectConfig = await readJsonFile<VisualMcpConfig>(projectPath);
  const config = mergeConfig(globalConfig, projectConfig);

  if (Object.keys(config.providers).length === 0) {
    throw new Error(`No visual MCP providers configured. Create ${projectPath} or ${globalPath}.`);
  }
  if (!config.providers[config.defaultProvider]) {
    throw new Error(`Default provider "${config.defaultProvider}" is not configured.`);
  }

  return config;
}

export function resolveApiKey(provider: Pick<ProviderConfig, "apiKey" | "apiKeyEnv" | "type">, env: NodeJS.ProcessEnv = process.env): string {
  if (provider.apiKeyEnv) {
    const value = env[provider.apiKeyEnv];
    if (value) {
      return value;
    }
  }
  if (provider.apiKey) {
    return provider.apiKey;
  }
  throw new Error(`Missing API key for ${provider.type}. Set apiKeyEnv or apiKey in configuration.`);
}
