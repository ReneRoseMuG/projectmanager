# Log: RichTextInlineField

**Datum:** 19.05.26  
**Schritt:** Feature — RichTextInlineField  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die bisherigen dauerhaft sichtbaren Rich-Text-Editoren im Web-Frontend wurden durch die neue kontrollierte Komponente `RichTextInlineField` ersetzt. Die Komponente rendert HTML zunächst als stille Leseansicht, aktiviert TipTap erst im Editiermodus, zeigt BubbleMenu und FloatingMenu kontextsensitiv und übernimmt Änderungen beim Blur in den jeweiligen Formular-State. Die vollständige Migrations-Inventur wurde am Anfang der neuen Komponentendatei dokumentiert; der neu hinzugekommene Meilenstein ist mit `milestone-description` enthalten. `RichTextEditor.tsx` wurde nach Abschluss aller Migrationen gelöscht. Backend, API, Shared Types und Datenbankschema wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | neu | Inline-Rich-Text-Basiskomponente mit Inventur, TipTap, BubbleMenu und FloatingMenu |
| `apps/web/src/lib/html-utils.ts` | neu | Gemeinsame HTML-Leerprüfung `hasVisibleHtmlContent` |
| `apps/web/src/components/ui/RichTextEditor.tsx` | gelöscht | Alte Rich-Text-Komponente entfernt |
| `apps/web/src/styles.css` | geändert | ProseMirror-Fokus, Mindesthöhe und Placeholder-Regeln ergänzt |
| `apps/web/src/components/**` | geändert | 17 Rich-Text-Verwendungsstellen inklusive Milestone migriert |
| `apps/web/src/components/**/__tests__/*` | geändert/neu | Komponenten- und Formular-Integrationstests für Rich-Text-Felder ergänzt |
| `apps/web/e2e/*.spec.ts` und `apps/web/e2e/domain-test-utils.ts` | geändert | Playwright-Selektoren auf `testIdPrefix`-Konvention umgestellt |
| `apps/web/package.json` und `package-lock.json` | geändert | Fehlende TipTap-Direktabhängigkeiten ergänzt |

## Probleme und Abweichungen

Der Auftrag nannte `client/src` und `index.css`; im aktuellen Repository liegen die entsprechenden Dateien unter `apps/web/src` und `apps/web/src/styles.css`. Die im Auftrag genannte Funktion `hasVisibleDescriptionContent` und die Datei `project-article-description-renderer.tsx` existieren im aktuellen Stand nicht, daher gab es dort keine Verschiebung. TipTap war bereits vorhanden; ergänzt wurden nur die fehlenden direkten Pakete `@tiptap/extension-text-align` und `@tiptap/pm`. Beim ersten Playwright-Lauf war ein Milestone-Kommentar-Selector zu breit und wurde testseitig auf `exact: true` eingegrenzt.

## Offene Punkte / Folgeaufgaben

Keine.
