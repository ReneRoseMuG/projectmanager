# Log: Wiki Verwandte Seiten Lint-Nachtrag

**Datum:** 28.05.26  
**Uhrzeit:** 17:12:54  
**Schritt:** Nachtrag — Wiki Verwandte Seiten Lint  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Nach dem erfolgreichen Web-Testlauf wurde zusätzlich `npm run lint -w apps/web` ausgeführt. Der Lintlauf hat nicht bestanden, der gemeldete Fehler liegt aber außerhalb der für TKT-33 geänderten Dateien. Deshalb wurde keine Korrektur vorgenommen und der Befund separat dokumentiert. Die Ticketänderung an der Wiki-Suche bleibt durch die grünen Unit- und Web-Tests abgesichert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-28-17-12-54-nachtrag-wiki-verwandte-seiten-lint.md` | neu | Nachtrag zum fehlgeschlagenen Web-Lint |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

`npm run lint -w apps/web` schlägt mit `@typescript-eslint/no-unused-vars` in `apps/web/src/hooks/useStatusCascadeWorkflow.tsx:51` fehl, weil `_statusSortOrder` nicht verwendet wird. Dieser Befund betrifft keine Datei aus dem TKT-33-Fix und wurde nicht eigenständig korrigiert.

## Offene Punkte / Folgeaufgaben

Den bestehenden Lintfehler in `apps/web/src/hooks/useStatusCascadeWorkflow.tsx` in einem separaten Auftrag bereinigen.
