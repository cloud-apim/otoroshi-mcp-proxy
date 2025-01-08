# Otoroshi MCP local proxy

## Configure Claude Desktop

- Locate your config file:
  ```
  Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
  Windows: %APPDATA%\Claude\claude_desktop_config.json
  Linux: ~/.config/Claude/claude_desktop_config.json
  ```
- Add otoroshi configuration:
  ```json
  {
    "mcpServers": {
      "otoroshi-mcp-proxy": {
        "command": "npx",
        "args": ["-y", "github:cloud-apim/otoroshi-mcp-proxy"],
        "env": {
          "OTOROSHI_ENDPOINT": "http://mcp.oto.tools:9999/rpc",
          "OTOROSHI_TOKEN": "otoapk_apki_aaaabbbbbccccyyyy_c0d6b8a3dec46307bf0939ea8862eb62d8"
        }
      }
    }
  }
