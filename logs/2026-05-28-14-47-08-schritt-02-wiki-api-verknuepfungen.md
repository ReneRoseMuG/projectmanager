# Log: Wiki-API-Verknüpfungen

**Datum:** 28.05.26  
**Uhrzeit:** 14:47:08  
**Schritt:** 2 — Wiki-API für Verknüpfungen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Wiki-API unterstützt nun Attachments, Aufgaben, Tickets und verwandte Wiki-Seiten als Unterressourcen. Relationen werden normalisiert gespeichert, bidirektional gelesen und gegen Selbstrelationen sowie Duplikate validiert. Wiki-Seiten können offene Root-Tasks und Root-Tickets unabhängig von Projektkontexten verknüpfen; bestehende Projekt-/Feature-/Use-Case-Workflows bleiben unverändert. Die kanonischen `/api/wiki/:id/...`-Routen und die Alias-Routen unter `/api/wiki-pages/:id/...` wurden registriert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/wiki.service.ts` | geändert | Wiki-Relationen, Counts und Detail-Summaries ergänzt |
| `apps/api/src/services/attachments.service.ts` | geändert | WikiPage als Attachment-Owner ergänzt |
| `apps/api/src/services/tasks.service.ts` | geändert | WikiPage als Task-Owner und kontextfreies Linking ergänzt |
| `apps/api/src/services/tickets.service.ts` | geändert | WikiPage als Ticket-Owner und kontextfreies Linking ergänzt |
| `apps/api/src/routes/wiki.ts` | geändert | Relation-Endpunkte und Alias-Routen ergänzt |
| `apps/api/src/routes/tasks.ts` | geändert | Wiki-Task-Link-Endpunkte ergänzt |
| `apps/api/src/routes/tickets.ts` | geändert | Wiki-Ticket-Link-Endpunkte ergänzt |
| `apps/api/src/routes/attachments.ts` | geändert | Wiki-Attachment-Endpunkte ergänzt |
| `apps/api/src/services/content.service.ts` | geändert | Alte Dateifallbacks entfernt; DB-Content ist alleinige Quelle |
| `apps/api/src/services/features.service.ts` | geändert | `contentPath` aus DTO/Service-Cleanup entfernt |
| `apps/api/src/services/use-cases.service.ts` | geändert | `contentPath` aus DTO/Service-Cleanup entfernt |
| `apps/api/src/services/doc-links.service.ts` | geändert | Feature-Mapping ohne `contentPath` |
| `apps/api/src/services/wiki-import.service.ts` | geändert | Import-Persistenz ohne `contentPath` |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
