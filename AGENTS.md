# AGENTS.md

This file gives coding agents the repository-specific context needed to work on `visual-mcp`.

## Project Overview

`visual-mcp` is a TypeScript MCP server that runs over local `stdio`. It exposes an `analyze_image` tool so text-only clients can explicitly pass a local image path to a single environment-configured vision model provider.

The server intentionally analyzes only explicitly provided local image paths. Do not add behavior that reads private client caches, clipboard content, PDFs, videos, webpages, screenshots, or other implicit visual sources unless the project requirements change.

## Repository Layout

- `src/cli.ts`: CLI entry point.
- `src/server.ts`: MCP server setup.
- `src/tool.ts`: `analyze_image` tool schema and orchestration.
- `src/config.ts`: environment variable config loading and validation.
- `src/providers.ts`: provider adapters.
- `src/image.ts`: local image validation and encoding.
- `src/types.ts`: shared TypeScript types.
- `tests/`: Vitest coverage for config, image handling, MCP behavior, providers, and tool behavior.
- `.env.example`: example environment variable provider config.

## Development Commands

Run these from the repository root:

```powershell
npm install
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

Use `npm run dev` for local development against `src/cli.ts`.

## Coding Guidelines

- Keep the server local-first and explicit-input-only.
- Preserve the current provider adapter boundary instead of mixing provider-specific details into tool orchestration.
- Keep config examples free of real secrets. Use `VISUAL_MCP_API_KEY` placeholders only.
- Do not commit generated artifacts such as `dist/`, `.tgz` packages, local `.env` files, local config files, or dependency folders.
- Prefer focused tests for changes in `tests/`, especially for environment config validation, image validation, provider payload construction, and tool output shape.

## Documentation Guidelines

- `README.md` is the default English README.
- `README.zh-CN.md` is the Simplified Chinese README.
- Keep examples valid for Windows PowerShell unless a section explicitly covers another shell.
- Update both READMEs when user-facing behavior, configuration, commands, or distribution steps change.

## Pull Request Checklist

Before opening a PR, verify the relevant checks:

```powershell
npm test
npm run typecheck
npm run build
```

For packaging-related changes, also run:

```powershell
npm pack --dry-run
```
