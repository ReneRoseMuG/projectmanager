# Log: Board-Spaltenhöhe

**Datum:** 22.05.26  
**Schritt:** Fix — Board-Spaltenhöhe  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsame Board-Darstellung nutzt für statusgruppierte Board-Spalten nun eine mitwachsende Mindesthöhe. Die ursprüngliche Logik, Spalten mindestens auf den verfügbaren Bereich auszudehnen, bleibt erhalten. Dafür wurde im Board-Raster die harte `h-full`-Höhe entfernt und durch `min-height: max(30rem, 100%)` ersetzt. Die einzelnen Status-Sections verwenden `h-fit` mit `min-h-full` statt `h-full`, sodass sie die verfügbare Höhe ausfüllen, bei vielen Karten aber nach unten wachsen können. Die Änderung bleibt auf das Frontend-Layout der bestehenden `ListBoardView` beschränkt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Board-Statusspalten von harter Vollhöhe auf mitwachsende Mindesthöhe umgestellt |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Regressionstest für mitwachsende Board-Mindesthöhe ergänzt |
| `logs/2026-05-22-fix-board-spaltenhöhe.md` | neu | Schritt-Log für den Board-Layout-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine. Der gezielte Unit-Test `npm run test -w apps/web -- tests/unit/web/components/ui/ListBoardView.test.tsx` lief erfolgreich mit 24 bestandenen Tests.

## Offene Punkte / Folgeaufgaben

Der vollständige Testlauf nach Abschnitt 12 und eine mögliche `docs/`-Prüfung stehen gemäß Abschluss-Workflow noch zur Nutzerentscheidung aus.
