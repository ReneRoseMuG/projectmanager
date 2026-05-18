# Log: Projekt-Doppelklick Formular

**Datum:** 18.05.26  
**Schritt:** Fix — Projekt-Doppelklick Formular  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Doppelklick auf eine Projektkarte öffnet jetzt denselben Bearbeitungsdialog wie der Edit-Button der Karte. Dafür wurde die direkte Navigation von `ProjectCard` zur Projekt-Detailroute entfernt und durch den bestehenden `onEdit`-Callback ersetzt. Damit bleibt der Nutzer in der Projektübersicht und landet nicht mehr auf der fast leeren Detailseite. In der Listenansicht ist der Icon-Button passend als „Bearbeiten“ beschriftet. Der zugehörige Playwright-Projekttest wurde auf die neue Erwartung umgestellt: Doppelklick bleibt auf `/projects`, öffnet das Projektformular und prüft den vorausgefüllten Projektnamen. Der Web-Typecheck wurde erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Doppelklick nutzt den bestehenden Bearbeiten-Flow statt direkter Navigation |
| `apps/web/e2e/project.spec.ts` | geändert | E2E-Erwartung für Projekt-Doppelklick auf Formularöffnung angepasst |
| `logs/2026-05-18-fix-projekt-doppelklick-formular.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Der vollständige Testlauf nach Abschnitt 13.2 steht noch aus und wird erst nach Nutzerfreigabe ausgeführt.
