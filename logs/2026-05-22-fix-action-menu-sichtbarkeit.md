# Log: Action Menu Sichtbarkeit

**Datum:** 22.05.26  
**Schritt:** Fix — Action Menu Sichtbarkeit  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Ursache für die verschwunden wirkenden Drei-Punkte-Menüs lag in der zentralen `ActionMenu`-Darstellung. Im List-/Board-Refactoring war der Trigger von einer sichtbaren weißen Buttonfläche mit Rand auf transparenten Hintergrund, transparenten Rand und `shadow-none` reduziert worden. Dadurch blieb der Button zwar im DOM und in den Tests erreichbar, war visuell aber nicht mehr zuverlässig als Menü erkennbar. Der Trigger ist jetzt weiterhin kompakt und am Rand ausgerichtet, hat aber wieder sichtbaren Rand, weißen Hintergrund und leichten Schatten. Die Tests prüfen nun explizit, dass die sichtbare Triggerfläche nicht erneut auf transparent und schattenlos zurückfällt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Sichtbare kompakte Triggerfläche für Drei-Punkte-Menü wiederhergestellt |
| `tests/unit/web/components/ui/ActionMenu.test.tsx` | geändert | Test für sichtbare Triggerfläche ergänzt |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Bestehende ActionMenu-Klassenerwartung auf sichtbare Darstellung angepasst |
| `logs/2026-05-22-fix-action-menu-sichtbarkeit.md` | neu | Schritt-Log für den Regressionsfix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Ein erster Testlauf mit dem Dateinamenfilter `ListBoardView.test.tsx` hat ungewollt alle Domänen-Tests mit diesem Namensmuster ausgeführt. Dabei sind separate Empty-State-Fehler in mehreren Domänen-ListBoardViews sichtbar geworden. Diese Fehler betreffen nicht die ActionMenu-Änderung und wurden im laufenden Test-Fix nicht behoben.

## Offene Punkte / Folgeaufgaben

Die Empty-State-Fehler in den Domänen-ListBoardViews sollten separat geprüft werden. Für den ActionMenu-Fix sind die gezielten Tests grün.
