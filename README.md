# visual-mcp

[![CI](https://github.com/lilexuan/visual-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/lilexuan/visual-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-green.svg)](https://modelcontextprotocol.io/)

English | [简体中文](README.zh-CN.md)

`visual-mcp` is a local `stdio` MCP server that lets text-only models analyze explicitly provided local image paths through configurable vision providers.

V1 supports PNG, JPEG, WebP, and non-animated GIF images. It does not read Claude Code's private `image-cache`, and it does not automatically read clipboard images, PDFs, videos, webpages, or screenshots.

## Features

- Local `stdio` MCP server for image analysis.
- Configurable vision providers for OpenAI Chat Completions-compatible APIs, OpenAI Responses API, and Anthropic Messages API.
- Per-request overrides for provider, model, detail level, and output language.
- Structured tool output with readable text, observations, OCR text, warnings, and provider metadata.
- API keys can be loaded from environment variables or local config files.

## Local Development

```powershell
npm install
npm run build
```

The build output is generated in `dist/`. The CLI entry point is:

```text
dist/cli.js
```

During development, Claude Code can run the server directly from the repository:

```json
{
  "mcpServers": {
    "visual-mcp": {
      "command": "node",
      "args": ["C:\\workspace\\visual-mcp\\dist\\cli.js"]
    }
  }
}
```

## Distribute With tgz

If the package is not published to npm yet, you can create a `.tgz` package and share it directly.

Before packing, run the validation commands:

```powershell
npm test
npm run typecheck
npm run build
```

Create the package:

```powershell
npm pack
```

The command creates a file similar to:

```text
visual-mcp-1.0.0.tgz
```

Users can install the package globally:

```powershell
npm install -g .\visual-mcp-1.0.0.tgz
```

After installation, Claude Code can use this configuration:

```json
{
  "mcpServers": {
    "visual-mcp": {
      "command": "visual-mcp"
    }
  }
}
```

opencode can configure the local MCP server under the `mcp` field in `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "visual-mcp": {
      "type": "local",
      "command": ["visual-mcp"],
      "enabled": true
    }
  }
}
```

You can also skip global installation and let Claude Code use the local `.tgz` package through `npx`:

```json
{
  "mcpServers": {
    "visual-mcp": {
      "command": "npx",
      "args": ["-y", "C:\\path\\to\\visual-mcp-1.0.0.tgz"]
    }
  }
}
```

opencode can use the local `.tgz` package through `npx` as well:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "visual-mcp": {
      "type": "local",
      "command": ["npx", "-y", "C:\\path\\to\\visual-mcp-1.0.0.tgz"],
      "enabled": true
    }
  }
}
```

If you want to pass API keys as environment variables when opencode starts the MCP server, add them to `environment`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "visual-mcp": {
      "type": "local",
      "command": ["visual-mcp"],
      "enabled": true,
      "environment": {
        "OPENAI_API_KEY": "sk-...",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

Prefer system environment variables or `~/.visual-mcp/config.json` for personal API settings, so secrets are not written into project config files.

When you create a new package version, users need to reinstall the new `.tgz` file:

```powershell
npm uninstall -g visual-mcp
npm install -g .\visual-mcp-1.0.1.tgz
```

## Configuration Files

Configuration is merged from two locations:

1. Global config: `~/.visual-mcp/config.json`
2. Project config: `visual-mcp.config.json`

Project config overrides global config. See `visual-mcp.config.example.json` for an example.

Use global config for personal API settings:

```powershell
mkdir $HOME\.visual-mcp
notepad $HOME\.visual-mcp\config.json
```

## API Keys

API keys can be configured in two ways: environment variable references or plain-text config values.

### Environment Variables

Environment variables are recommended because they keep secrets out of config files.

Temporary PowerShell values:

```powershell
$env:OPENAI_API_KEY="sk-..."
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

Persist user environment variables:

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-...", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
```

Example config:

```json
{
  "defaultProvider": "openai",
  "defaultDetail": "auto",
  "defaultLanguage": "auto",
  "providers": {
    "openai": {
      "type": "openai-chat",
      "model": "gpt-4.1-mini",
      "baseUrl": "https://api.openai.com/v1",
      "apiKeyEnv": "OPENAI_API_KEY"
    },
    "anthropic": {
      "type": "anthropic",
      "model": "claude-sonnet-4-20250514",
      "apiKeyEnv": "ANTHROPIC_API_KEY"
    }
  }
}
```

### Plain-Text Config

You can also write an API key directly in the config file:

```json
{
  "defaultProvider": "openai",
  "providers": {
    "openai": {
      "type": "openai-chat",
      "model": "gpt-4.1-mini",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-..."
    }
  }
}
```

Plain-text config is convenient but less secure. Keep it only on your own machine, and do not commit it to Git or include it in shared packages.

## Provider Types

`visual-mcp` supports three provider adapters:

- `openai-chat`: OpenAI Chat Completions-compatible APIs
- `openai-responses`: OpenAI Responses API
- `anthropic`: Anthropic Messages API

OpenAI-compatible gateways can set `baseUrl`:

```json
{
  "defaultProvider": "openai",
  "providers": {
    "openai": {
      "type": "openai-chat",
      "model": "your-vision-model",
      "baseUrl": "https://your-gateway.example/v1",
      "apiKeyEnv": "OPENAI_API_KEY"
    }
  }
}
```

## Tool

### `analyze_image`

Input parameters:

- `path`: required local image path.
- `question`: required question or visual task for the vision model.
- `provider`: optional provider override.
- `model`: optional model override.
- `detail`: optional detail level, one of `low`, `high`, or `auto`.
- `language`: optional output language. Defaults to the language of the question.

The tool returns readable text and `structuredContent`:

```json
{
  "answer": "...",
  "description": "...",
  "observations": ["..."],
  "ocr_text": "",
  "uncertainties": [],
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "usage": {},
  "warnings": []
}
```

Example Claude Code prompt:

```text
Use visual-mcp to analyze this image: C:\path\to\image.png. What UI issues are visible?
```

All provider adapters send image content as inline base64/data URLs. The server does not log API keys, image bytes, or base64 payloads.

## Development Commands

```powershell
npm test
npm run typecheck
npm run build
npm pack --dry-run
```
