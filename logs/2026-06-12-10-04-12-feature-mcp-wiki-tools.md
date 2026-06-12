# Log: MCP-Werkzeuge für Wiki-Seiten (list/get/create/update)

**Datum:** 12.06.26  
**Uhrzeit:** 10:04:12  
**Schritt:** Feature — Wiki-Seiten über den Projekt-Manager-MCP les- und pflegbar machen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der MCP-Server bot bisher keine Wiki-Werkzeuge (weder Lesen noch Schreiben). Diese Lücke war aufgefallen, als eine Benutzerdoku in WIKI-19 abgelegt werden sollte. Da die Wiki-API vollständig vorhanden ist, war — wie zuvor bei den Tags — nur die MCP-Schicht zu ergänzen; **keine** DB-, Schema- oder API-Änderung.

Ergänzt wurden vier MCP-Tools in `apps/mcp-server/src/tools.ts`:
- `list_wiki_pages` — oberste Seiten (`GET /wiki`) bzw. mit `parentId` die direkten Unterseiten (`GET /wiki/:id/children`).
- `get_wiki_page` — einzelne Seite inkl. Inhalt und Version (`GET /wiki/:id`).
- `create_wiki_page` — neue Seite (`POST /wiki`), optional unter einer übergeordneten Seite.
- `update_wiki_page` — versionsgeschützte Aktualisierung (`PATCH /wiki/:id`) über den vorhandenen `updateVersioned`-Helfer, der die aktuelle Version selbst liest; der Aufrufer braucht nur die ID.

`list`/`get` wurden bewusst mit aufgenommen: ohne Lesen ist „Edit" nicht sinnvoll nutzbar (Seite finden, Stand prüfen). `projectId` ist nicht vorgesehen (die API lehnt es ab; Wiki ist nicht projektgebunden).

**Content-Format:** `content` läuft über den vorhandenen `textToHtml`-Helfer (neue Helfer `withHtmlContent`/`withoutIdWithHtmlContent`). Markdown wird zu HTML umgewandelt; bereits vorhandenes HTML bleibt unverändert (`isHtmlContent`). Einschränkung: `textToHtml` kann keine Tabellen — tabellarische Inhalte müssen als HTML übergeben werden (per Unit-Test abgesichert).

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | `WikiPage`-Imports, 3 Wiki-Schemas, Content-Helfer, 4 `defineTool`-Blöcke |
| `apps/mcp-server/src/tools.test.ts` | geändert | Tool-Namen-Contract um 4 Namen erweitert; 5 Verhaltenstests (Markdown→HTML, HTML-Durchreichung, versionierter Update-Patch, list Wurzel/Kinder, get) |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | `WikiPage`-Import; Aufrufe für alle vier neuen Tools inkl. Persistenz- und HTML-Durchreichungsprüfung |
| `docs/MCP-Tools.md` | geändert | `list_wiki_pages`/`get_wiki_page` (lesend), `create_wiki_page` (schreibend), `update_wiki_page` (aktualisieren) |

## Probleme und Abweichungen

- **Infrastruktur-Blocker (kein Code-Fehler):** `tools.integration.test.ts` scheitert lokal weiterhin im `beforeAll` an `createTestDb()` mit `Access denied for user 'root'@'localhost'` — keine erreichbare MySQL-Testdatenbank. Unabhängig von dieser Änderung; der Wiki-Testcode kompiliert (Typecheck grün) und wird erst nach dem DB-Setup ausgeführt.

## Angewendete Testleitplanken / Abdeckung

- Testebene **Unit** (`tools.test.ts`): beobachtbares Verhalten gegen Mock-API-Client — Markdown→HTML-Konvertierung, HTML-Durchreichung (inkl. Tabellen), versionierter `PATCH` mit selbst gelesener `expectedVersion`, `list` mit/ohne `parentId`, `get`.
- Testebene **Integration** (`tools.integration.test.ts`): echter Durchlauf gegen Fastify + Temp-DB inkl. Persistenzprüfung über die Wiki-Ressource — lokal durch fehlende MySQL-Testdatenbank blockiert.
- Ergebnis: Typecheck grün; Unit-Suite grün (69 passed, 1 skipped, davon 5 neue Wiki-Tests); 1 Integrationstest-Datei durch Infrastruktur blockiert.

## Offene Punkte / Folgeaufgaben

- Damit die neuen Tools im laufenden MCP nutzbar sind, muss der MCP-Server neu gebaut und neu gestartet werden (`npm run build -w apps/mcp-server`, danach Client neu verbinden).
- Anschließend kann die bereits erstellte Benutzerdoku (`docs/wiki/WIKI-19-mcp-benutzerhandbuch.md`) über `update_wiki_page` in WIKI-19 geschrieben werden (Tabellen als HTML).
- Integrationstest bei verfügbarer MySQL-Testdatenbank ausführen.
