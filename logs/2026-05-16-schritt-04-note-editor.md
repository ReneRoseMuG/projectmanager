# Log: NoteEditor

**Datum:** 16.05.26  
**Schritt:** 4 — NoteEditor-Modal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der NoteEditor wurde auf ein breites XL-Modal mit Violet-Gradient-Header, Meta-Card und eigenem Footer umgestellt. Der Header zeigt Note-ID, Erstelldatum, Wortzähler und Abschnittshinweis. Der Editorbereich ist in eine Kartenfläche eingebettet und behält den vorhandenen RichTextEditor-Datenfluss. Ein Markdown-Export lädt den aktuellen Inhalt als `.md`-Datei herunter.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | NoteEditor auf Studie-2-Editor-Chrome umgestellt |

## Probleme und Abweichungen

Die Notizen speichern weiterhin `contentJson`; deshalb exportiert die Markdown-Funktion den Inhalt als JSON-Codeblock in einer Markdown-Datei. Eine echte Markdown-Konvertierung wäre eine eigene fachliche Erweiterung.

## Offene Punkte / Folgeaufgaben

Notiz-Tagging und echter Markdown-Export können separat ergänzt werden.
