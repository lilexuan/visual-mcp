# visual-mcp

[English](README.md) | 简体中文

`visual-mcp` 是一个本地 `stdio` MCP 服务器，让只支持文本输入的客户端也可以分析明确传入的本地图片路径。

它支持 PNG、JPEG、WebP 和非动画 GIF。它不会读取客户端私有缓存、剪贴板图片、PDF、视频、网页、屏幕截图或其他隐式视觉来源。

## 功能

- 本地 `stdio` MCP 服务器，用于分析用户明确传入的本地图片。
- 只配置一个 provider，所有配置都通过环境变量提供。
- 支持 OpenAI Chat Completions 兼容接口、OpenAI Responses API 和 Anthropic Messages API。
- 单次调用可以覆盖模型、图片 detail 和输出语言。
- 返回结构化结果，包括文本答案、图片描述、观察点、OCR 文本、警告和 provider 元数据。

## 安装

如果包已经发布到 npm：

```powershell
npm install -g visual-mcp
```

如果你使用本地 `.tgz` 包：

```powershell
npm install -g .\visual-mcp-1.0.1.tgz
```

Claude Code 可以这样启动服务器：

```json
{
  "mcpServers": {
    "visual-mcp": {
      "command": "visual-mcp"
    }
  }
}
```

opencode 可以在 `mcp` 字段下配置：

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

也可以不全局安装，直接通过 `npx` 使用本地 `.tgz` 包：

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

opencode 对应配置：

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

## 配置

`visual-mcp` 只使用环境变量配置。没有 provider 配置文件，同一时间只启用一个 provider。

必填环境变量：

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `VISUAL_MCP_PROVIDER_TYPE` | provider 适配器类型。 | `openai-chat` |
| `VISUAL_MCP_MODEL` | 视觉模型名。 | `gpt-4.1-mini` |
| `VISUAL_MCP_API_KEY` | 当前 provider 的 API key。 | `sk-...` |

可选环境变量：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `VISUAL_MCP_PROVIDER_NAME` | 显示在工具输出元数据里的 provider 名称。 | `default` |
| `VISUAL_MCP_BASE_URL` | 自定义 API 地址，常用于 OpenAI 兼容网关。 | OpenAI 或 Anthropic 默认地址 |
| `VISUAL_MCP_MAX_TOKENS` | 最大输出 token。 | `1200` |
| `VISUAL_MCP_DETAIL` | 图片 detail，可选 `low`、`high`、`auto`。 | `auto` |
| `VISUAL_MCP_LANGUAGE` | 输出语言策略。设置为 `auto` 时跟随问题语言。 | `auto` |
| `VISUAL_MCP_MAX_IMAGE_BYTES` | 允许的最大图片字节数。 | `20971520` |

PowerShell 临时配置：

```powershell
$env:VISUAL_MCP_PROVIDER_TYPE = "openai-chat"
$env:VISUAL_MCP_MODEL = "gpt-4.1-mini"
$env:VISUAL_MCP_API_KEY = "sk-..."
$env:VISUAL_MCP_BASE_URL = "https://api.openai.com/v1"
```

写入 Windows 用户环境变量：

```powershell
[Environment]::SetEnvironmentVariable("VISUAL_MCP_PROVIDER_TYPE", "openai-chat", "User")
[Environment]::SetEnvironmentVariable("VISUAL_MCP_MODEL", "gpt-4.1-mini", "User")
[Environment]::SetEnvironmentVariable("VISUAL_MCP_API_KEY", "sk-...", "User")
```

如果希望 MCP 客户端启动 server 时传入环境变量，可以使用客户端自己的 environment 字段。opencode 示例：

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

不要提交真实 API key。共享配置说明时，请使用占位符或 `.env.example`。

## Provider 类型

`VISUAL_MCP_PROVIDER_TYPE` 支持：

- `openai-chat`：OpenAI Chat Completions 兼容接口。
- `openai-responses`：OpenAI Responses API。
- `anthropic`：Anthropic Messages API。

OpenAI 兼容网关可以设置自定义地址：

```powershell
$env:VISUAL_MCP_PROVIDER_TYPE = "openai-chat"
$env:VISUAL_MCP_MODEL = "your-vision-model"
$env:VISUAL_MCP_API_KEY = "your-api-key"
$env:VISUAL_MCP_BASE_URL = "https://your-gateway.example/v1"
```

Anthropic 示例：

```powershell
$env:VISUAL_MCP_PROVIDER_TYPE = "anthropic"
$env:VISUAL_MCP_MODEL = "claude-sonnet-4-20250514"
$env:VISUAL_MCP_API_KEY = "sk-ant-..."
```

## 工具

### `analyze_image`

输入参数：

- `path`：必填，本地图片路径。
- `question`：必填，希望视觉模型回答的问题或执行的视觉任务。
- `model`：可选，只覆盖本次调用的模型。
- `detail`：可选，`low`、`high` 或 `auto`。
- `language`：可选，输出语言；默认跟随问题语言。

工具会返回可读文本和 `structuredContent`：

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

示例提示：

```text
使用 visual-mcp 分析这张图片：C:\path\to\image.png。里面有哪些 UI 问题？
```

所有 provider adapter 都会以内联 base64/data URL 的形式发送图片内容。服务器不会记录 API key、图片字节或 base64 payload。

## 本地开发

```powershell
npm install
npm test
npm run typecheck
npm run build
```

构建产物会生成到 `dist/`。从克隆仓库直接运行：

```powershell
npm run dev
```

如果要让 MCP 客户端使用本地构建产物，可以指向构建后的 CLI：

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

## 本地打包

先运行验证命令：

```powershell
npm test
npm run typecheck
npm run build
```

创建本地包：

```powershell
npm pack
```

打包相关改动还应检查包内容：

```powershell
npm pack --dry-run
```
