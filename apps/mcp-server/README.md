# Projekt Manager MCP Server

Der MCP-Server stellt eine nicht-destruktive v1-Toolschicht für Claude Desktop und remote MCP-Clients bereit. Er greift nicht direkt auf die Datenbank zu, sondern nutzt die bestehende Projekt-Manager-API mit `x-api-key`.

## Umgebungsvariablen

- `PROJECT_MANAGER_API_BASE_URL`: API-Basis, Standard `http://localhost:3001/api`
- `PROJECT_MANAGER_API_KEY`: API-Key der Projekt-Manager-API, Pflicht
- `MCP_HTTP_HOST`: HTTP-Host, Standard `127.0.0.1`
- `MCP_HTTP_PORT`: HTTP-Port, Standard `3010`
- `MCP_HTTP_PATH`: MCP-Pfad, Standard `/mcp`
- `MCP_HTTP_BEARER_TOKEN`: Bearer-Token für den HTTP-Transport, Pflicht für `start:http`

## Start

```bash
npm run build -w apps/mcp-server
npm run start:stdio -w apps/mcp-server
npm run start:http -w apps/mcp-server
```

`start:stdio` ist für lokale Desktop-Clients wie Claude Desktop gedacht. `start:http` stellt einen Streamable-HTTP-Endpunkt für remote MCP-Clients bereit.

HTTP-Clients müssen `Authorization: Bearer <MCP_HTTP_BEARER_TOKEN>` senden. Der MCP-Server verwendet dieses Token nur zum Schutz des MCP-Endpunkts; für die Projekt-Manager-API wird weiterhin `PROJECT_MANAGER_API_KEY` als `x-api-key` genutzt.
