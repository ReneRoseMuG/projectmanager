# Log: Board-Spaltenbreite

**Datum:** 24.05.26  
**Schritt:** Fix — Board-Spaltenbreite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Breite befüllter Statusspalten in der gemeinsamen `ListBoardView` wurde im Board-Modus begrenzt. Nicht kollabierte Board-Spalten behalten ihre Mindestbreite von `17rem`, bekommen aber zusätzlich eine Maximalbreite von `calc((100% - 2rem) / 3)`. Damit entspricht die maximale Einzelspaltenbreite der theoretischen Breite von drei belegten Statusspalten bei `gap-4`. Das vorhandene horizontale Scroll-Verhalten auf schmalen Viewports bleibt erhalten. Die bestehende Kollaps-Logik für leere bekannte Statusspalten wurde nicht erweitert oder umgebaut.

Für die Teständerung wurden die Testentwurfsleitplanken angewendet: Testebene Unit/JSDOM, echte `ListBoardView`-Props und DOM-Assertions, keine DB- oder Dateisystem-Isolation nötig, Handler nur als `vi.fn()`-Doubles. Abgedeckt ist das beobachtbare Layout-Verhalten einer befüllten Spalte mit kollabierter leerer Nachbarspalte.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Maximalbreite für befüllte Board-Statusspalten ergänzt |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Layout-Erwartungen für die neue Maximalbreite ergänzt |
| `logs/2026-05-24-fix-board-spaltenbreite.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der gezielte Test `npm run test -w apps/web -- tests/unit/web/components/ui/ListBoardView.test.tsx -t "kollabiert leere bekannte Board-Spalten"` war grün. Der breitere Lauf `npm run test -w apps/web -- tests/unit/web/components/ui/ListBoardView.test.tsx` hatte 25 grüne und 3 rote Tests. Die roten Tests betreffen bestehende Style-Erwartungen für `ViewToggle`, Spalten-Button und `ActionMenu`, nicht die neue Spaltenbreiten-Änderung; gemäß Repo-Regel wurden diese Fehler nicht eigenständig behoben.

`npm run typecheck -w apps/web` war grün.

## Offene Punkte / Folgeaufgaben

Die drei bestehenden Style-Erwartungen im `ListBoardView`-Test sollten in einem separaten Auftrag gegen die aktuelle Button- und ActionMenu-Gestaltung geprüft und gegebenenfalls aktualisiert werden.
