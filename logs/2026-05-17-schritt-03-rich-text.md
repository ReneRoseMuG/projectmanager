# Log: Rich-Text

**Datum:** 17.05.26  
**Schritt:** 3 — RichTextEditor konsolidieren (TipTap)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`RichTextEditor` wurde durch eine einheitliche TipTap-Komponente ersetzt, die HTML-Strings als Speicherformat verwendet. Die neue Komponente unterstützt `toolbar="full"` und `toolbar="minimal"`; die minimale Toolbar zeigt nur Fett, Kursiv und Link, die volle Toolbar ergänzt Unterstreichen, H2, H3, Listen, Blockquote, Code und Bild. `MarkdownEditor.tsx` wurde entfernt und alle aktuellen Importe wurden auf `RichTextEditor` umgestellt. Feature-, Use-Case- und Wiki-Inhaltsfelder nutzen jetzt den HTML-Editor; Feature-Kurzbeschreibungen wurden ebenfalls auf die minimale Toolbar umgestellt. Bei bisherigen Markdown-/Legacy-Inhalten wurden TODO-Kommentare für spätere Inhaltsmigration ergänzt, ohne DB-Feldtypen zu ändern. Für Notizen bleibt das bestehende `contentJson`-API-Feld erhalten, speichert aber neuen Editor-Inhalt als `{ html }`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/RichTextEditor.tsx` | geändert | Einheitlicher HTML-basierter TipTap-Editor (91 Zeilen) |
| `apps/web/src/components/ui/MarkdownEditor.tsx` | gelöscht | Alte Markdown-Komponente entfernt |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Beschreibung und Inhalt auf neuen `RichTextEditor` umgestellt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Beschreibung und Inhalt auf neuen `RichTextEditor` umgestellt |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Note-Editor auf HTML-basierten `RichTextEditor` umgestellt |
| `apps/web/src/components/usecases/UseCaseDetail.tsx` | geändert | Inhalt auf neuen `RichTextEditor` umgestellt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Inhalt auf neuen `RichTextEditor` umgestellt |
| `apps/web/src/components/wiki/WikiPageDetail.tsx` | geändert | Inhalt auf neuen `RichTextEditor` umgestellt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Inhalt und Vorschau auf HTML umgestellt |
| `logs/2026-05-17-schritt-03-rich-text.md` | neu | Schritt-Log für Schritt 3 |
| `logs/README.md` | geändert | Log-Index um Schritt 3 ergänzt |

## Probleme und Abweichungen

Die TipTap-Abhängigkeiten waren bereits im Web-Workspace vorhanden, daher musste kein neues TipTap-Paket installiert werden. Die bestehende Notizen-API erwartet weiterhin `contentJson`; zur Vermeidung einer Schemaänderung wird neuer HTML-Inhalt dort als JSON-Objekt `{ html: string }` abgelegt. Bestehende ProseMirror-JSON-Notizen werden bestmöglich als Plain-Text-HTML extrahiert; eine vollständige Datenmigration bleibt eine spätere Aufgabe.

## Offene Punkte / Folgeaufgaben

Bestehende Markdown-Inhalte in Feature-, Use-Case- und Wiki-Feldern sollten später per separatem Migrationsauftrag nach HTML konvertiert werden.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `rg -n "MarkdownEditor" apps/web/src` | ✅ Keine Treffer |
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npm run build -w apps/web` | ✅ Erfolgreich, mit bestehender Vite-Warnung zu großen Chunks |
