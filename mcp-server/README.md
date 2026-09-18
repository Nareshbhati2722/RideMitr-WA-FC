# RideMitr WA Agent Builder — MCP server

An MCP server that lets you build and manage RideMitr WA WhatsApp AI agents from
Claude Desktop (or any MCP client). It talks to the RideMitr WA backend's
bearer-authed MCP API (`/api/mcp/v1`).

It exposes **discovery** tools (list your real WhatsApp numbers, AI models,
Google spreadsheets, tabs, media and templates) and **mutation** tools
(create / update / delete agents and tools), plus a `create-ridemitr-wa-agent`
prompt that walks you through the setup questions.

## Install

```bash
cd /root/RIDEMITR_WA/mcp-server
npm install
```

## Configure Claude Desktop

1. In RideMitr WA, go to **Admin Settings → MCP Tools**. Turn on the master
   switch and the capabilities you want, then **Generate key** and copy the
   `fck_live_…` value (shown once).
2. Open Claude Desktop → **Settings → Developer → Edit Config** (or edit the
   file directly):
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3. Add:

```json
{
  "mcpServers": {
    "ridemitr-wa-agents": {
      "command": "node",
      "args": ["/root/RIDEMITR_WA/mcp-server/src/index.js"],
      "env": {
        "RIDEMITR_WA_API_URL": "https://crm.srv879786.hstgr.cloud/api/mcp/v1",
        "RIDEMITR_WA_API_KEY": "fck_live_PASTE_YOUR_KEY"
      }
    }
  }
}
```

4. Fully quit and reopen Claude Desktop. The `ridemitr-wa-agents` tools and the
   `create-ridemitr-wa-agent` prompt will appear.
5. Say *“create a RideMitr WA agent”* — it will ask you the setup questions.

> If Claude Desktop runs on a different machine than the server, point
> `RIDEMITR_WA_API_URL` at the public domain (above). The bearer key works over
> the internet; the RideMitr WA login cookie is not involved.

## Claude Desktop Project

For a dedicated project, use:

**Name:** `RideMitr WA Agent Builder`

**Description:** Build and manage RideMitr WA WhatsApp AI agents through
conversation. I ask what you need, look up your real WhatsApp numbers, AI
models, Google Sheets, media and templates, then create a fully-configured
agent for you — no dashboard required.

**Custom instructions:** see the `create-ridemitr-wa-agent` prompt (the same
guided flow), or copy it from the project plan.

## Develop / debug

```bash
RIDEMITR_WA_API_URL=… RIDEMITR_WA_API_KEY=… npm run inspect   # MCP Inspector
```

## Tools

Discovery: `list_wa_accounts`, `list_models`, `search_spreadsheets`,
`list_sheet_tabs`, `list_media`, `list_templates`, `list_agents`, `get_agent`.

Mutation: `create_agent`, `update_agent`, `add_google_sheets_tool`, `add_tool`,
`update_tool`, `delete_tool`, `delete_agent`.

Each capability is gated by the toggles in **Admin Settings → MCP Tools** — a
disabled capability returns a 403 the assistant will relay.
