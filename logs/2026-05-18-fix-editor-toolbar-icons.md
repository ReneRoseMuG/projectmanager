# Log: Editor-Toolbar Icons

**Datum:** 18.05.26  
**Schritt:** Fix — Editor-Toolbar Icons  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Icons und Klickflächen der Rich-Text-Editor-Toolbar wurden zentral vergrößert. Statt kleiner `sm`-Buttons mit 16px-Icons nutzt der Editor jetzt 40px-Toolbarbuttons mit 18px-Icons. Die Änderung sitzt direkt in der gemeinsamen `RichTextEditor`-Basiskomponente und gilt damit für alle Editor-Verwendungen. Zusätzlich wurde der Toolbar-Abstand leicht erhöht, damit die größeren Buttons nicht gedrängt wirken.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/RichTextEditor.tsx` | geändert | Toolbarbuttons und Icons des Editors vergrößert |
| `logs/2026-05-18-fix-editor-toolbar-icons.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
