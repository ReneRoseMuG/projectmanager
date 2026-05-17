# Log: ListBoard Add Buttons

**Datum:** 17.05.26  
**Schritt:** Fix — ListBoard Add Buttons  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die doppelten tababhängigen Aktionsbuttons im Projekt-Detailkopf und direkt unter der Tab-Leiste wurden entfernt. Aufgaben, Features und Backlog öffnen neue Einträge damit wieder über die jeweilige List/Board-Toolbar statt über zusätzliche Textbuttons. Im Projekt-Features-Panel wurde der sichtbare Button „Neues Feature“ durch einen icon-only `+`-Button ersetzt. Der zusätzliche EmptyState-Button „Neues Feature“ wurde entfernt, damit im leeren Features-Tab ebenfalls nur noch der eine `+`-Button der Panel-Toolbar bleibt. Eine Regressionserwartung im bestehenden ProjectFeaturePanel-Test stellt sicher, dass der sichtbare Textbutton nicht zurückkehrt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Doppelte tababhängige Aktionsbuttons entfernt; Task-Create direkt an die ListBoardView gebunden |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Sichtbaren „Neues Feature“-Button auf icon-only `+` umgestellt und EmptyState-Aktion entfernt |
| `apps/web/src/components/ui/__tests__/ProjectFeaturePanel.test.tsx` | geändert | Erwartung ergänzt, dass kein sichtbarer „Neues Feature“-Textbutton erscheint und nur ein Create-Button bleibt |
| `logs/2026-05-17-fix-listboard-add-buttons.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. Der Web-Typecheck wurde mit `npm run typecheck -w apps/web` erfolgreich ausgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
