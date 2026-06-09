# visual-mcp

[![CI](https://github.com/lilexuan/visual-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/lilexuan/visual-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-green.svg)](https://modelcontextprotocol.io/)

English | [简体中文](README.zh-CN.md)

`visual-mcp` is a local `stdio` MCP server that lets text-only clients analyze explicitly provided local image paths through one configured vision model provider.

It supports PNG, JPEG, WebP, and non-animated GIF images. It does not read private client caches, clipboard images, PDFs, videos, webpages, screenshots, or any other implicit visual source.

## Features

- Local `stdio` MCP server for explicit local image analysis.
- One provider configured entirely through environment variables.
- Provider adapters for OpenAI Chat Completions-compatible APIs, OpenAI Responses API, and Anthropic Messages API.
- Per-request overrides for model, detail level, and output language.
- Structured tool output with readable text, observations, OCR text, warnings, and provider metadata.

## Install

If the package is available from npm:

```powershell
npm install -g visual-mcp
```

If you are installing from a local package file:

```powershell
npm install -g .\visual-mcp-1.0.1.tgz
```

Claude Code can then start the server with:

```json
{
  "mcpServers": {
    "visual-mcp": {
      "command": "visual-mcp"
    }
  }
}
```

opencode can configure the server under the `mcp` field:

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

You can also run a local `.tgz` package through `npx` without global installation:

```json
{
  "mcpServers": {
    "visual-mcp": {
      "command": "npx",
      "args": ["-y", "C:\\path\\to\\visual-mcp-1.0.1.tgz"]
    }
  }
}
```

For opencode:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "visual-mcp": {
      "type": "local",
      "command": ["npx", "-y", "C:\\path\\to\\visual-mcp-1.0.1.tgz"],
      "enabled": true
    }
  }
}
```

## Configuration

`visual-mcp` is configured with environment variables. There is no provider config file and only one provider is active at a time.

Required variables:

| Variable | Description | Example |
| --- | --- | --- |
| `VISUAL_MCP_PROVIDER_TYPE` | Provider adapter type. | `openai-chat` |
| `VISUAL_MCP_MODEL` | Vision model name. | `gpt-4.1-mini` |
| `VISUAL_MCP_API_KEY` | API key for the configured provider. | `sk-...` |

Optional variables:

| Variable | Description | Default |
| --- | --- | --- |
| `VISUAL_MCP_PROVIDER_NAME` | Name shown in tool output metadata. | `default` |
| `VISUAL_MCP_BASE_URL` | Custom API base URL. Useful for OpenAI-compatible gateways. | OpenAI or Anthropic default |
| `VISUAL_MCP_MAX_TOKENS` | Maximum output tokens. | `1200` |
| `VISUAL_MCP_DETAIL` | Vision detail level: `low`, `high`, or `auto`. | `auto` |
| `VISUAL_MCP_LANGUAGE` | Output language policy. Use `auto` to follow the question language. | `auto` |
| `VISUAL_MCP_MAX_IMAGE_BYTES` | Maximum accepted image size in bytes. | `20971520` |

Temporary PowerShell setup:

```powershell
$env:VISUAL_MCP_PROVIDER_TYPE = "openai-chat"
$env:VISUAL_MCP_MODEL = "gpt-4.1-mini"
$env:VISUAL_MCP_API_KEY = "sk-..."
$env:VISUAL_MCP_BASE_URL = "https://api.openai.com/v1"
```

Persist user environment variables on Windows:

```powershell
[Environment]::SetEnvironmentVariable("VISUAL_MCP_PROVIDER_TYPE", "openai-chat", "User")
[Environment]::SetEnvironmentVariable("VISUAL_MCP_MODEL", "gpt-4.1-mini", "User")
[Environment]::SetEnvironmentVariable("VISUAL_MCP_API_KEY", "sk-...", "User")
```

If you prefer to pass variables from an MCP client config, use the client's environment field. For opencode:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "visual-mcp": {
      "type": "local",
      "command": ["visual-mcp"],
      "enabled": true,
      "environment": {
        "VISUAL_MCP_PROVIDER_TYPE": "openai-chat",
        "VISUAL_MCP_MODEL": "gpt-4.1-mini",
        "VISUAL_MCP_API_KEY": "sk-..."
      }
    }
  }
}
```

Do not commit real API keys. For shared setup notes, use placeholders or an `.env.example` file.

## Provider Types

`VISUAL_MCP_PROVIDER_TYPE` supports:

- `openai-chat`: OpenAI Chat Completions-compatible APIs.
- `openai-responses`: OpenAI Responses API.
- `anthropic`: Anthropic Messages API.

For an OpenAI-compatible gateway, set a custom base URL:

```powershell
$env:VISUAL_MCP_PROVIDER_TYPE = "openai-chat"
$env:VISUAL_MCP_MODEL = "your-vision-model"
$env:VISUAL_MCP_API_KEY = "your-api-key"
$env:VISUAL_MCP_BASE_URL = "https://your-gateway.example/v1"
```

For Anthropic:

```powershell
$env:VISUAL_MCP_PROVIDER_TYPE = "anthropic"
$env:VISUAL_MCP_MODEL = "claude-sonnet-4-20250514"
$env:VISUAL_MCP_API_KEY = "sk-ant-..."
```

## Tool

### `analyze_image`

Input parameters:

- `path`: required local image path.
- `question`: required question or visual task for the vision model.
- `model`: optional model override for this call.
- `detail`: optional detail level, one of `low`, `high`, or `auto`.
- `language`: optional output language. Defaults to following the question language.

The tool returns readable text and `structuredContent`:

```json
{
  "answer": "...",
  "description": "...",
  "observations": ["..."],
  "ocr_text": "",
  "uncertainties": [],
  "provider": "default",
  "model": "gpt-4.1-mini",
  "usage": {},
  "warnings": []
}
```

Example prompt:

```text
Use visual-mcp to analyze this image: C:\path\to\image.png. What UI issues are visible?
```

All provider adapters send image content as inline base64/data URLs. The server does not log API keys, image bytes, or base64 payloads.

## Local Development

```powershell
npm install
npm test
npm run typecheck
npm run build
```

The build output is generated in `dist/`. To run the server directly from a cloned repository:

```powershell
npm run dev
```

When testing a local build from an MCP client, point the client to the built CLI:

```json
{
  "mcpServers": {
    "visual-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\visual-mcp\\dist\\cli.js"]
    }
  }
}
```

## Package Locally

Run the validation commands first:

```powershell
npm test
npm run typecheck
npm run build
```

Create a local package:

```powershell
npm pack
```

For packaging changes, also check the package contents without creating a committed artifact:

```powershell
npm pack --dry-run
```
