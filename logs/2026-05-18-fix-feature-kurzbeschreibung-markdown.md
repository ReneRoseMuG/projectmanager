# Log: Feature-Kurzbeschreibung Markdown

**Datum:** 18.05.26  
**Schritt:** Fix — Feature-Kurzbeschreibung Markdown  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die doppelte Anzeige der Feature-Kurzbeschreibung im Kopfbereich der Feature-Detailseite wurde entfernt. Die Kurzbeschreibung steht damit nicht mehr gleichzeitig im Header und im Formularbereich. Zusätzlich wurde die vorhandene Markdown-Unterstützung des TipTap-Editors zentral aktiviert. Der Rich-Text-Editor kann dadurch bestehende Legacy-Markdown-Inhalte beim Öffnen als Editorinhalt rendern, statt Markdown-Zeichen als Rohtext anzuzeigen. HTML-Inhalte bleiben weiterhin als HTML-Inhalte bearbeitbar.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/RichTextEditor.tsx` | geändert | Markdown-Parsing für bestehende Editor-Inhalte aktiviert |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Kurzbeschreibung aus dem Feature-Header entfernt |
| `logs/2026-05-18-fix-feature-kurzbeschreibung-markdown.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Der Build zeigt weiterhin nur die bekannte Vite-Warnung zur Chunkgröße; durch die aktivierte Markdown-Extension ist der gebaute JavaScript-Chunk größer geworden, aber der Build schlägt nicht fehl.

## Offene Punkte / Folgeaufgaben

Keine.
