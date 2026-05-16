# Log: MarkdownEditor-Wrapper

**Datum:** 16.05.26  
**Schritt:** 5 — MarkdownEditor-Wrapper  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der MarkdownEditor wurde optisch auf den Studie-2-Wrapper umgestellt, ohne die Tiptap-Logik oder die Editor-Commands zu verändern. Die äußere Hülle nutzt nun eine 1,5px-Border, `rounded-xl`, Focus-Ring und einen ruhigen weißen Hintergrund. Die Toolbar hat einen Steel-50-Hintergrund, Border-Bottom und visuelle Gruppen-Trenner für Formatierung, Headings, Listen und Undo/Redo. Der Editor-Inhalt wurde auf eine ProseMirror-Fläche mit größeren Innenabständen und Steel-100-Inline-Code-Boxen umgestellt. Ein neuer Footer zeigt Wort- und Abschnittszahl sowie den statischen Hinweis „Markdown". `npm run lint -w apps/web` wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/MarkdownEditor.tsx` | geändert | Studie-2-Wrapper, Toolbar-Gruppen und Statistik-Footer ergänzt |

## Probleme und Abweichungen

`Designstudie-2/Feature.html` ist lokal nicht verfügbar, daher konnte kein Browservergleich mit dem Feature-Mockup stattfinden. Die Tiptap-Toolbar-Icons wurden bewusst nicht ausgetauscht oder erweitert, weil das laut Auftrag out-of-scope ist.

## Offene Punkte / Folgeaufgaben

Wiki- und Notes-Editor werden im finalen Smoke-Check mitgeprüft, weil der Wrapper global wirkt.
