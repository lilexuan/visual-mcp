# visual-mcp

[English](README.md) | 简体中文

`visual-mcp` 是一个本地 `stdio` MCP 服务器，用来让不支持视觉输入的文本模型，通过可配置的多模态模型分析显式传入的本地图片路径。

V1 支持 PNG、JPEG、WebP 和非动画 GIF。它不会读取 Claude Code 的私有 `image-cache`，也不会自动读取剪贴板图片、PDF、视频、网页或屏幕截图。

## 本地开发

```powershell
npm install
npm run build
```

构建产物会生成到 `dist/`。CLI 入口是：

```text
dist/cli.js
```

开发时可以在 Claude Code 中直接从仓库运行：

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

## 使用 tgz 分发

如果暂时不发布到 npm，可以把项目打包成 `.tgz` 文件发给别人。

打包前建议先运行验证：

```powershell
npm test
npm run typecheck
npm run build
```

生成 tgz：

```powershell
npm pack
```

命令会在当前目录生成类似这样的文件：

```text
visual-mcp-1.0.0.tgz
```

把这个 `.tgz` 文件发给使用者。使用者可以全局安装：

```powershell
npm install -g .\visual-mcp-1.0.0.tgz
```

安装后，Claude Code 可以这样配置：

```json
{
  "mcpServers": {
    "visual-mcp": {
      "command": "visual-mcp"
    }
  }
}
```

opencode 可以在 `opencode.jsonc` 的 `mcp` 字段下配置本地 MCP 服务器。全局安装 `.tgz` 后可以这样配置：

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

也可以不全局安装，直接让 Claude Code 通过 `npx` 使用本地 tgz：

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

opencode 也可以通过 `npx` 直接使用本地 `.tgz`：

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

如果希望把 API key 作为 opencode 启动 MCP server 时的环境变量传入，也可以放在 `environment` 里：

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

更推荐把 API key 配在系统环境变量或 `~/.visual-mcp/config.json` 中，避免把密钥写进 opencode 项目配置。

如果后续重新打包了新版本，使用者需要重新安装新的 `.tgz`：

```powershell
npm uninstall -g visual-mcp
npm install -g .\visual-mcp-1.0.1.tgz
```

## 配置文件

配置会从两个位置合并：

1. 全局配置：`~/.visual-mcp/config.json`
2. 项目配置：`visual-mcp.config.json`

项目配置会覆盖全局配置。示例见 `visual-mcp.config.example.json`。

推荐使用全局配置保存个人 API 设置：

```powershell
mkdir $HOME\.visual-mcp
notepad $HOME\.visual-mcp\config.json
```

## 配置 API Key

API key 支持两种方式：环境变量引用和明文配置。

### 方式一：环境变量

推荐使用环境变量，避免把密钥写入配置文件。

PowerShell 临时设置：

```powershell
$env:OPENAI_API_KEY="sk-..."
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

写入用户环境变量：

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-...", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
```

配置文件示例：

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

### 方式二：明文配置

也可以直接把 API key 写在配置文件里：

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

明文配置更方便，但安全性更低。请只把它放在自己的机器上，不要提交到 Git 仓库，也不要打包发给别人。

## Provider 类型

支持三种 provider adapter：

- `openai-chat`：兼容 OpenAI Chat Completions 的接口
- `openai-responses`：OpenAI Responses API
- `anthropic`：Anthropic Messages API

OpenAI 兼容网关可以配置 `baseUrl`：

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

## 工具

### `analyze_image`

输入参数：

- `path`：本地图片路径，必填
- `question`：希望视觉模型回答的问题或执行的视觉任务，必填
- `provider`：可选，覆盖默认 provider
- `model`：可选，覆盖默认 model
- `detail`：可选，`low`、`high` 或 `auto`
- `language`：可选，输出语言；默认跟随问题语言

工具会返回可读文本和 `structuredContent`：

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

Claude Code 中的示例提示：

```text
使用 visual-mcp 分析这张图片：C:\path\to\image.png。里面有哪些 UI 问题？
```

所有 provider adapter 都会以内联 base64/data URL 的形式发送图片内容。服务器不会记录 API key、图片字节内容或 base64 payload。

## 开发命令

```powershell
npm test
npm run typecheck
npm run build
npm pack --dry-run
```
