# Log: MCP-Tools für Tags (list_tags, add_tags_to_parent, remove_tags_from_parent)

**Datum:** 12.06.26  
**Uhrzeit:** 09:06:42  
**Schritt:** Feature — Tag-Verwaltung über den Projekt-Manager-MCP verfügbar machen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der MCP-Server bot bisher keine Möglichkeit, Items mit Tags zu versehen oder Tags zu entfernen, obwohl die API (`routes/tags.ts`, `tags.service.ts`) das vollständig kann. Die Lücke lag ausschließlich im MCP-Server; daher war **keine** DB-Migration, Schema- oder API-Änderung nötig.

Ergänzt wurden drei neue MCP-Tools in `apps/mcp-server/src/tools.ts`:
- `list_tags` — liest alle Tags (`GET /tags`) inkl. Name, Farbe und Nutzungszahlen.
- `add_tags_to_parent` — versieht Projekt/Meilenstein/Aufgabe/Ticket mit Tags **per Name**; unbekannte Namen werden automatisch als neuer Tag angelegt (`POST /tags`).
- `remove_tags_from_parent` — entfernt benannte Tags vom Träger; nicht zugewiesene/unbekannte Namen werden idempotent übergangen und im Ergebnis ausgewiesen.

Da die API set-basiert ist (`PUT /{owner}/:id/tags` ersetzt die komplette Liste), sind Hinzufügen/Entfernen über read-modify-write umgesetzt — analog zum bestehenden `link_feature_to_parent`. Die aktuellen Tags werden aus dem Detail-DTO des Trägers gelesen (alle vier Owner-DTOs liefern `tags: Tag[]`). Ohne tatsächliche Änderung wird kein `PUT` abgesetzt, um Journal-Rauschen zu vermeiden. Ein `CONFLICT` beim Anlegen (z. B. abweichende Groß-/Kleinschreibung) wird abgefangen und auf den vorhandenen Tag zurückgeführt.

Design-Entscheidungen wurden vorab mit dem Nutzer abgestimmt: Tag-Bezug per Name mit Auto-Anlage; Tool-Umfang Hinzufügen/Entfernen/Auflisten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | `Tag`-Import, `TagParentType`, Schemas (`tagParentSchema`, `tagMutationSchema`), Helper (`tagOwnerPath`, `resolveTagsByName`, `addTagsToParent`, `removeTagsFromParent`), 3 neue `defineTool`-Blöcke |
| `apps/mcp-server/src/tools.test.ts` | geändert | Tool-Namen-Contract um 3 Namen erweitert; `TagMutationResult`-Typ; 5 neue Verhaltenstests (Auto-Anlage, Idempotenz add/remove, notPresent, list_tags) |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | `Tag`-Import; je ein Aufruf von `list_tags`/`add_tags_to_parent`/`remove_tags_from_parent` mit Persistenz-Verifikation (Pflicht durch `executedTools`-Vollständigkeitsvergleich) |

## Probleme und Abweichungen

- **Infrastruktur-Blocker (kein Code-Fehler):** `tools.integration.test.ts` scheitert lokal bereits im `beforeAll` an `createTestDb()`/`truncateAll` mit `Access denied for user 'root'@'localhost' (using password: NO)` — es fehlt eine erreichbare MySQL-Testdatenbank. Das ist unabhängig von dieser Änderung (betrifft das DB-Setup, nicht die Tag-Logik). Der erweiterte Integrationstest kompiliert (Typecheck grün), konnte mangels MySQL aber nicht ausgeführt werden.

## Angewendete Testleitplanken / Abdeckung

- Testebene **Unit** (`tools.test.ts`): beobachtbares Verhalten gegen einen Mock-API-Client — Namensauflösung, Auto-Anlage fehlender Tags (`POST /tags`), korrekte `PUT`-Vereinigung beim Hinzufügen, Filterung beim Entfernen, Idempotenz ohne `PUT`, Meldung unbekannter Namen, `GET /tags`.
- Testebene **Integration** (`tools.integration.test.ts`): erweitert um echten Durchlauf gegen Fastify + Temp-DB mit Persistenz-Prüfung über das Task-DTO — lokal durch fehlende MySQL-Testdatenbank blockiert.
- Ergebnis: Typecheck grün; Unit-Suite grün (64 passed, 1 skipped); 1 Integrationstest-Datei durch Infrastruktur blockiert.

## Offene Punkte / Folgeaufgaben

- Integrationstest bei verfügbarer MySQL-Testdatenbank ausführen, um den End-to-End-Pfad der drei Tags-Tools zu bestätigen.
- Optional: MCP-Tool-Dokumentation/README um die drei neuen Tools ergänzen (nicht beauftragt).
- Optional: `add`/`remove` zusätzlich für numerische Tag-IDs öffnen (derzeit bewusst nur Namen).
