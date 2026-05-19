# Log: RichText-Auswahl-Toolbar

**Datum:** 20.05.26  
**Schritt:** Fix — RichText-Auswahl-Toolbar  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die zusätzliche kleine Editor-Bar, die beim Markieren von Text im Inline-Rich-Text-Editor erschien, wurde entfernt. Dafür wurden die TipTap-Komponenten `BubbleMenu` und `FloatingMenu` aus `RichTextInlineField` entfernt, sodass im Edit-Modus nur noch die feste, vollständige Editor-Toolbar sichtbar bleibt. Die bestehende Bearbeitungslogik, Fokussetzung, Blur-Speicherung und Escape-Rücknahme bleiben unverändert. Der vorhandene Komponententest wurde ergänzt, damit die zusätzliche Auswahl- oder Floating-Bar nicht wieder eingeführt wird.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Bubble- und Floating-Menü aus dem Inline-Editor entfernt |
| `apps/web/src/components/ui/__tests__/rich-text-inline-field.test.tsx` | geändert | Testabsicherung ergänzt, dass nur die feste Toolbar gerendert wird |
| `logs/2026-05-20-fix-richtext-auswahl-toolbar.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
