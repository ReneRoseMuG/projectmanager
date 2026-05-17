# Log: Design-Review-Befunde

**Datum:** 17.05.26  
**Schritt:** Fix — Design-Review-Befunde  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die im Befundreport genannten UI-Abweichungen wurden korrigiert: Fokuszustände, aktive Tabs, Primary-Button, Modal-Header, SegmentedControl, Labels und Tag-/Farbpaletten nutzen jetzt die vorgesehenen Steel- und Token-Werte. `TaskDetail` verwendet die gemeinsame `Section`-Komponente statt einer lokalen Section-Klasse, und `ItemCard` öffnet nur noch per Doppelklick. `ListBoardView` unterstützt spaltenspezifische Plus-Aktionen; Aufgaben aus einer Kanban-Spalte erhalten den passenden Initialstatus. Für Feature-Details wurden die fehlenden Tabs `Aufgaben` und `Dateien` umgesetzt, inklusive Backend-Routen, Web-API, Hooks und einer SQLite-Migration für Feature-Attachments. Die Design-System-Dokumentation wurde um die Shadow-Tokens ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/*` | geändert | Design-System-Komponenten auf Steel-Fokus, Tokens und Board-Spaltenaktionen korrigiert |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Lokale Section-Klasse entfernt und Fokuszustände angepasst |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Aufgaben- und Dateien-Tab für Features ergänzt |
| `apps/api/src/db/schema.ts` | geändert | `attachments.feature_id` und Owner-Check ergänzt |
| `apps/api/src/db/migrations/0006_dear_kitty_pryde.sql` | neu | SQLite-Migration für Feature-Attachments |
| `apps/api/src/routes/attachments.ts` | geändert | Feature-Attachment-Endpunkte ergänzt |
| `apps/api/src/routes/doc-links.ts` | geändert | Feature-Aufgaben-Endpunkte ergänzt |
| `apps/api/src/services/attachments.service.ts` | geändert | Feature-Attachments gelistet, erstellt und gemappt |
| `apps/api/src/services/doc-links.service.ts` | geändert | Feature-Aufgabenrelationen gelesen und gespeichert |
| `apps/web/src/api/attachments.ts` | geändert | Feature-Attachment-API ergänzt |
| `apps/web/src/api/doc-links.ts` | geändert | Feature-Aufgaben-API ergänzt |
| `apps/web/src/hooks/useAttachments.ts` | geändert | Feature als Attachment-Owner ergänzt |
| `apps/web/src/hooks/useDocLinks.ts` | geändert | Hook für Feature-Aufgabenrelationen ergänzt |
| `packages/shared-types/src/index.ts` | geändert | `Attachment.featureId` ergänzt |
| `docs/design-system.md` | geändert | Shadow-Tokens dokumentiert |
| `apps/api/src/services/wiki-import.service.ts` | geändert | Bestehende Lint-Fehler ohne Verhaltensänderung bereinigt |

## Probleme und Abweichungen

Die von Drizzle erzeugte Migration enthielt nur ein `ADD COLUMN` und hätte die bestehende SQLite-Check-Constraint nicht aktualisiert. Die Migration wurde deshalb manuell als Tabellen-Neuanlage mit vollständigem Owner-Check formuliert und erfolgreich angewendet. `npm run build -w apps/web` meldet weiterhin nur die bekannte Vite-Warnung zu großen Chunks. Die bekannten roten Playwright-/E2E-Tests wurden auf Nutzerwunsch nicht bearbeitet.

## Offene Punkte / Folgeaufgaben

Rote beziehungsweise geskippt bekannte Playwright-/E2E-Tests separat klären.
