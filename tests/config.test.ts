import { describe, expect, test } from "vitest";
import { loadConfig, resolveApiKey } from "../src/config.js";

describe("configuration loading", () => {
  test("loads single provider configuration from environment variables", async () => {
    const config = await loadConfig({
      env: {
        VISUAL_MCP_PROVIDER_NAME: "openai",
        VISUAL_MCP_PROVIDER_TYPE: "openai-chat",
        VISUAL_MCP_MODEL: "gpt-4.1-mini",
        VISUAL_MCP_API_KEY: "secret",
        VISUAL_MCP_BASE_URL: "https://gateway.example/v1",
        VISUAL_MCP_MAX_TOKENS: "800",
        VISUAL_MCP_DETAIL: "high",
        VISUAL_MCP_LANGUAGE: "zh-CN",
        VISUAL_MCP_MAX_IMAGE_BYTES: "1048576"
      }
    });

    expect(config.providerName).toBe("openai");
    expect(config.defaultDetail).toBe("high");
    expect(config.defaultLanguage).toBe("zh-CN");
    expect(config.maxImageBytes).toBe(1048576);
    expect(config.provider).toMatchObject({
      type: "openai-chat",
      model: "gpt-4.1-mini",
      apiKey: "secret",
      baseUrl: "https://gateway.example/v1",
      maxTokens: 800
    });
  });

  test("uses defaults for optional environment variables", async () => {
    const config = await loadConfig({
      env: {
        VISUAL_MCP_PROVIDER_TYPE: "anthropic",
        VISUAL_MCP_MODEL: "claude-sonnet-4-20250514",
        VISUAL_MCP_API_KEY: "secret"
      }
    });

    expect(config.providerName).toBe("default");
    expect(config.defaultDetail).toBe("auto");
    expect(config.defaultLanguage).toBe("auto");
    expect(config.provider).toMatchObject({
      type: "anthropic",
      model: "claude-sonnet-4-20250514",
      apiKey: "secret"
    });
    expect(config.provider.baseUrl).toBeUndefined();
    expect(config.provider.maxTokens).toBeUndefined();
    expect(config.maxImageBytes).toBeUndefined();
  });

  test("rejects missing required provider environment variables", async () => {
    await expect(loadConfig({ env: {} })).rejects.toThrow("Missing required environment variable VISUAL_MCP_PROVIDER_TYPE.");
  });

  test("rejects invalid enum and numeric environment variables", async () => {
    await expect(
      loadConfig({
        env: {
          VISUAL_MCP_PROVIDER_TYPE: "openai-chat",
          VISUAL_MCP_MODEL: "gpt-4.1-mini",
          VISUAL_MCP_API_KEY: "secret",
          VISUAL_MCP_DETAIL: "medium"
        }
      })
    ).rejects.toThrow("VISUAL_MCP_DETAIL must be one of low, high, or auto.");

    await expect(
      loadConfig({
        env: {
          VISUAL_MCP_PROVIDER_TYPE: "openai-chat",
          VISUAL_MCP_MODEL: "gpt-4.1-mini",
          VISUAL_MCP_API_KEY: "secret",
          VISUAL_MCP_MAX_TOKENS: "0"
        }
      })
    ).rejects.toThrow("VISUAL_MCP_MAX_TOKENS must be a positive integer.");
  });

  test("resolves provider API keys from direct provider configuration", () => {
    expect(resolveApiKey({ type: "openai-chat", apiKey: "from-env-config" })).toBe("from-env-config");
  });
});
