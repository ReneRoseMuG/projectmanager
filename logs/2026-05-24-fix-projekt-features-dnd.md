# Log: Projekt-Features-DnD

**Datum:** 24.05.26  
**Schritt:** Fix — Projekt-Details-Tab Features DnD  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Projekt-Details-Tab „Features“ wurde die fehlende Statuswechsel-Verdrahtung ergänzt. `ProjectFeaturePanel` nimmt jetzt optional einen Statuswechsel-Handler an und reicht ihn an die gemeinsame `ListBoardView` weiter, wodurch Drag-and-Drop im Kanban-Board aktiviert wird. `ProjectForm` nutzt dafür den bestehenden `useFeatures().updateFeature`-Flow mit `expectedVersion`, analog zur globalen Feature-Übersicht. Bei Fehlern wird der bestehende Toast-Fehlerpfad genutzt und der Fehler weitergereicht. API, Berechtigungen, Datenmodell und Relation-Handling wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Optionalen Statuswechsel-Handler an `ListBoardView` weitergereicht |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Statuswechsel für Projekt-Features über bestehenden Feature-Update-Flow ergänzt |
| `tests/unit/web/components/ui/ProjectFeaturePanel.test.tsx` | geändert | Regressionstest für aktiviertes DnD bei Statuswechsel-Handler ergänzt |
| `logs/2026-05-24-fix-projekt-features-dnd.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken und Testebenen

Der Testentwurfs-Skill wurde angewendet. Betroffen ist die Web-Unit-Testebene mit echten Feature-Fixtures und dem bestehenden Catalog-Hook-Mock. Abgedeckt ist das beobachtbare Verhalten, dass `ProjectFeaturePanel` bei übergebenem Statuswechsel-Handler DnD im Board aktiviert.
