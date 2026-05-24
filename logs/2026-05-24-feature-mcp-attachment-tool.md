# Log: MCP Attachment Tool

**Datum:** 24.05.26  
**Schritt:** Feature — MCP Attachment Tool  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der MCP-Server hat das neue Tool `add_attachment_to_parent` erhalten. Das Tool hängt Base64-codierte Dateiinhalte über die bestehenden Attachment-Upload-Routen an Projekte, Meilensteine, Aufgaben, Features oder Tickets. Dafür wurde der MCP-API-Client um eine Multipart-POST-Methode ergänzt, ohne die bestehenden JSON-Methoden zu verändern. Das Tool akzeptiert `parentType`, `parentId`, `fileName`, `contentBase64` und optional `mimetype`; ein lokaler Dateipfad wird nicht gelesen. Die MCP-Übersicht wurde auf den Stand 24.05.26 gebracht und nennt das neue Tool samt unterstützter Parent-Typen.

Der Testentwurfs-Skill wurde angewendet. Betroffen sind Unit-Tests für Toolregistrierung, Pfadbildung und Multipart-Form sowie ein Integrationstest über den MCP-Transport gegen eine echte Fastify-App mit isolierter Temp-SQLite-DB und Temp-Upload-Verzeichnis. Bewiesen wird, dass der Upload ein echtes Attachment erzeugt, die Datei im isolierten Upload-Verzeichnis liegt und der Parent das Attachment per API wieder auflistet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/api-client.ts` | geändert | Multipart-POST für FormData ergänzt |
| `apps/mcp-server/src/tools.ts` | geändert | `add_attachment_to_parent` inklusive Schema, Base64-Decoding und Parent-Pfadlogik ergänzt |
| `apps/mcp-server/src/tools.test.ts` | geändert | Unit-Tests für Toolliste, Parent-Pfade, FormData und ungültige Parent-Typen ergänzt |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | Echter MCP-Upload gegen isolierte Test-App und Temp-Upload-Verzeichnis ergänzt |
| `docs/MCP-Tools.md` | geändert | Tool-Übersicht und unterstützte Parent-Typen aktualisiert |
| `logs/2026-05-24-feature-mcp-attachment-tool.md` | neu | Schritt-Log angelegt |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der erste MCP-Build zeigte einen TypeScript-Typfehler, weil `Blob` den Node-`Buffer` in dieser Konfiguration nicht direkt als `BlobPart` akzeptiert. Die lokale Umwandlung wurde auf ein echtes `ArrayBuffer` umgestellt. Danach waren Build und MCP-Tests grün.

## Offene Punkte / Folgeaufgaben

Keine.
