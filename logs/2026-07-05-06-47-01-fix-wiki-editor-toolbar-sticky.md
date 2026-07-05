# Log: Wiki Editor Toolbar Sticky

**Datum:** 05.07.26  
**Uhrzeit:** 06:47:01  
**Schritt:** Fix — Wiki Editor Toolbar Sticky  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die TipTap-Toolbar im Fill-Layout des gemeinsamen RichText-Editors bleibt nun außerhalb des eigentlichen Editor-Scrollbereichs. Dafür scrollt nicht mehr der gesamte Editor-Wrapper, sondern nur noch `EditorContent`; Toolbar und Editor-Inhalt bleiben im selben Rahmen, während die Werkzeugleiste sichtbar bleibt. Der Wiki-Editor nutzt dieses Fill-Layout bereits, daher war keine Sonderlogik in `WikiPageForm` nötig. Der Eingriff ist bewusst auf die Scroll-Klassen des Shared-Editors und den bestehenden Unit-Test begrenzt.

Bei der Teständerung wurden die Testentwurfsleitplanken angewendet. Testebene ist Unit/Web mit jsdom und gemocktem TipTap-Editor; bewiesen wird das beobachtbare Klassenverhalten für `fill=true`, ohne echte API-, Datenbank- oder Dateisystemdaten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Fill-Layout scrollt nur noch `EditorContent`, nicht den Toolbar-Wrapper |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Regressionstest für getrennten Toolbar-/Content-Scroll aktualisiert |
| `logs/2026-07-05-06-47-01-fix-wiki-editor-toolbar-sticky.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Die Skill-Referenz `projekt-manager-planungsleitplanken/references/ui-guidelines.md` war lokal nicht vorhanden. Die relevante UI-Lektüre erfolgte stattdessen gezielt über `docs/design-leitfaden.md`.

Vom ursprünglichen Plan wurde bewusst enger abgewichen: `WikiPageForm` musste nicht geändert werden, weil die bestehende Wiki-Nutzung bereits `fill` setzt. Der Fix liegt daher ausschließlich im gemeinsamen RichText-Fill-Layout.

## Offene Punkte / Folgeaufgaben

Keine.
