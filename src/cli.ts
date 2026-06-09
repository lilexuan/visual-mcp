#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createVisualMcpServer } from "./server.js";

async function main(): Promise<void> {
  const server = createVisualMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`visual-mcp failed to start: ${message}\n`);
  process.exit(1);
});
