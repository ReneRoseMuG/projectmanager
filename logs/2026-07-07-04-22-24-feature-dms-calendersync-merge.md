# Log: DMS in CalendarSync integriert

**Datum:** 07.07.26  
**Uhrzeit:** 04:22:24  
**Schritt:** Feature — DMS-Commits aus work in CalendarSync-Branch integrieren  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die sieben DMS-Commits aus `origin/work` wurden auf dem neuen Integrationsbranch `rescue/dms-into-calendersync` in die aktuelle `implement-calendersync`-Linie gemergt. Die funktionalen Konflikte in der Dokumentvorschau wurden so aufgelöst, dass der bestehende kompakte Hover-Modus erhalten bleibt und die neue große Side-Panel-Vorschau aus der DMS-Linie als Standard genutzt wird. Die DMS-Änderungen an Dokumentliste, Side-Panel, TagPicker, ItemRow, Theme und Tailwind-Konfiguration sind im Merge enthalten. Die Testentwurfsleitplanken wurden angewendet: geprüft wurden Build/Typecheck über alle Workspaces, DMS-API-Integrationstests und gezielte Web-Unit-Tests für TagPicker und ItemRow/ListBoardView. `graphify update .` sollte nach Codeänderungen laufen, ist lokal aber am Graphify/uv-Launcher gescheitert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | DMS-Dokumentseite mit Side-Panel-Layout aus `origin/work` übernommen |
| `apps/web/src/components/attachments/DocumentPreviewBody.tsx` | geändert | Konfliktauflösung: kompakte Hover-Vorschau und große Side-Panel-Vorschau kombiniert |
| `apps/web/src/components/attachments/DocumentSidePanel.tsx` | neu | Wiederverwendbares, kollabierbares DMS-Seitenpanel übernommen |
| `apps/web/src/components/ui/ItemRow.tsx` | geändert | DMS-Row-Interaktion aus `origin/work` übernommen |
| `apps/web/src/components/tags/TagPicker.tsx` | geändert | Dunkle Panel-Variante aus `origin/work` übernommen |
| `apps/api/src/services/attachments.service.ts` | geändert | DMS-Anhangslogik aus `origin/work` übernommen |
| `apps/api/src/services/document.service.ts` | geändert | DMS-Dokumentlogik aus `origin/work` übernommen |
| `tests/integration/api/dms.test.ts` | geändert | DMS-Integrationstest-Erweiterungen aus `origin/work` übernommen |
| `tests/integration/api/documents-list-contracts.test.ts` | geändert | Dokumentlisten-Vertragstest aus `origin/work` übernommen |
| `graphify-out/` | geändert | Konflikte aufgelöst, Regeneration durch lokalen Tooling-Blocker offen |
| `logs/2026-07-07-04-22-24-feature-dms-calendersync-merge.md` | neu | Schritt-Log für die Branch-Integration |

## Probleme und Abweichungen

`graphify update .` konnte nicht ausgeführt werden. Der direkte Aufruf brach mit `uv trampoline failed to canonicalize script path` ab; `uv tool run graphify update .` fand kein installierbares Paket `graphify`. Die Graphify-Dateien wurden deshalb aus dem konfliktfreien Merge-Zwischenstand übernommen, aber nicht neu generiert. Der übrige Merge wurde verifiziert: `npm run build` war grün, die gezielten API-Integrationstests waren grün und die gezielten Web-Unit-Tests waren grün.

## Offene Punkte / Folgeaufgaben

Graphify lokal reparieren und anschließend `graphify update .` erneut ausführen, damit `graphify-out/` garantiert aus dem finalen Merge-Stand neu erzeugt ist.
