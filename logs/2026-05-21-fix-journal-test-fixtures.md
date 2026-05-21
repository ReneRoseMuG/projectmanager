# Log: Journal-Test-Fixtures

**Datum:** 21.05.26  
**Schritt:** Fix — Journal-Test-Fixtures  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der vollständige Testlauf wurde seriell ausgeführt und die roten Web-Unit-Tests wurden ausschließlich in Test- und Fixture-Code korrigiert. Die Formular-Tests rendern ihre fachlichen Komponenten weiterhin ohne echten Auth-/Query-Kontext; dafür mocken sie die neue Journal-Permission-Abfrage testnah auf `false`, damit die bestehenden Tests ihr ursprüngliches Prüfziel behalten. Der gemeinsame Owner-Form-Testhelper wurde entsprechend ergänzt, sodass Projekt-, Feature-, Use-Case- und Task-Formular-Tests denselben isolierten Kontext verwenden. Der TLDraw-Node-Test wurde auf einen zuverlässig aufgelösten Mock umgestellt, weil `@tldraw/tldraw` zur Laufzeit aus dem Paket unter `apps/web/node_modules` re-exportiert wird und jsdom sonst echtes TLDraw mit fehlenden Browser-APIs lädt. Produktionscode wurde in diesem Schritt nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Permission-Mock für formularbezogene Unit-Tests ergänzt |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Journal-Permission-Abfrage testnah gemockt |
| `tests/unit/web/components/calendar/EventForm.test.tsx` | geändert | Journal-Permission-Abfrage testnah gemockt |
| `tests/unit/web/components/backlog/BacklogItemForm.test.tsx` | geändert | Journal-Permission-Abfrage testnah gemockt |
| `tests/unit/web/components/wiki/WikiPageDetail.test.tsx` | geändert | Journal-Permission-Abfrage testnah gemockt |
| `tests/unit/web/components/ui/tldraw-node.test.tsx` | geändert | TLDraw-Mock auf real aufgelöste ESM-Pfade erweitert und Komponentenimport dynamisiert |
| `logs/2026-05-21-fix-journal-test-fixtures.md` | neu | Schritt-Log für den Test-/Fixture-Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. Die Korrekturen liegen ausschließlich in Tests und Test-Fixtures. Die React-Router-Future-Flag-Warnungen erscheinen weiterhin im Web-Testlauf, blockieren aber keine Tests.

## Offene Punkte / Folgeaufgaben

Keine.
