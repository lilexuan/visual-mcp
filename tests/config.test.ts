import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { loadConfig, resolveApiKey } from "../src/config.js";

describe("configuration loading", () => {
  test("merges global and project configuration with project overrides", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-mcp-config-"));
    const home = join(root, "home");
    const project = join(root, "project");
    await mkdir(join(home, ".visual-mcp"), { recursive: true });
    await mkdir(project, { recursive: true });

    await writeFile(
      join(home, ".visual-mcp", "config.json"),
      JSON.stringify({
        defaultProvider: "openai",
        defaultDetail: "low",
        providers: {
          openai: {
            type: "openai-chat",
            model: "gpt-4.1-mini",
            apiKeyEnv: "OPENAI_API_KEY",
            baseUrl: "https://api.openai.com/v1"
          }
        }
      })
    );

    await writeFile(
      join(project, "visual-mcp.config.json"),
      JSON.stringify({
        defaultDetail: "high",
        providers: {
          openai: {
            model: "gpt-4.1",
            baseUrl: "https://gateway.example/v1"
          },
          anthropic: {
            type: "anthropic",
            model: "claude-sonnet-4-20250514",
            apiKey: "plain-secret"
          }
        }
      })
    );

    const config = await loadConfig({ cwd: project, homeDir: home });

    expect(config.defaultProvider).toBe("openai");
    expect(config.defaultDetail).toBe("high");
    expect(config.providers.openai).toMatchObject({
      type: "openai-chat",
      model: "gpt-4.1",
      apiKeyEnv: "OPENAI_API_KEY",
      baseUrl: "https://gateway.example/v1"
    });
    expect(config.providers.anthropic).toMatchObject({
      type: "anthropic",
      apiKey: "plain-secret"
    });
  });

  test("resolves provider API keys from env or plaintext configuration", () => {
    expect(resolveApiKey({ type: "openai-chat", apiKeyEnv: "VISION_KEY" }, { VISION_KEY: "from-env" })).toBe("from-env");
    expect(resolveApiKey({ type: "anthropic", apiKey: "from-config" }, {})).toBe("from-config");
  });
});
