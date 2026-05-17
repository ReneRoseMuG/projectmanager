# Log: Feature Rich-Text-Editor

**Datum:** 17.05.26  
**Schritt:** Fix — Feature Rich-Text-Editor  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Feature-Inhalt verwendet jetzt denselben Rich-Text-Editor wie Notizen. Dafür wurde der bestehende `RichTextEditor` so erweitert, dass er neben JSON-Inhalten auch Markdown-Inhalte lesen und zurückgeben kann. Features speichern ihren Inhalt weiterhin als Markdown-String über die vorhandene API, wodurch keine Backend- oder Schemaänderung nötig war. Sowohl das Feature-Detailformular als auch das Feature-Overlayformular nutzen nun diesen Editor.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/RichTextEditor.tsx` | geändert | Markdown-Modus für den Note-Editor ergänzt |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Feature-Inhalt auf `RichTextEditor` umgestellt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Feature-Overlay-Inhalt auf `RichTextEditor` umgestellt |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der Editor ist visuell und funktional derselbe wie bei Notizen, die Persistenz bleibt aber aus Kompatibilitätsgründen Markdown statt JSON. Der Vite-Build meldet weiterhin nur die bekannte Chunk-Size-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
