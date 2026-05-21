# Log: Rote Tests TLDraw und Migration

**Datum:** 21.05.26  
**Schritt:** Fix — Rote Tests analysieren und Testcode korrigieren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die roten Testläufe wurden analysiert und ausschließlich im Testcode korrigiert. Der API-Integrationstest nutzte direkt den Drizzle-Migrator, der mit dem vorhandenen Legacy-Migrationsformat nicht kompatibel ist; er verwendet nun denselben Legacy-Migrationshelper wie die übrigen API-Test-Fixtures. Der TLDraw-Unit-Test mockt nun die aktuelle `getSvgString`-Editor-API statt der alten Exportfunktion, sodass Vorschau-Erzeugung und Object-URL-Freigabe wieder das echte Komponentenverhalten prüfen. Der RichTextInlineField-Test mockt die TLDraw-TipTap-Node, weil dieser Test den RichText-Basiseditor und nicht die TLDraw-Integration absichert. Danach liefen API-, Web- und E2E-Tests vollständig grün.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/fixtures/api/db.ts` | geändert | Legacy-Migrationshelper für gezielte Wiederverwendung exportiert |
| `tests/integration/api/app.integration.test.ts` | geändert | Direkten Drizzle-Migrator durch Legacy-Testmigrationshelper ersetzt |
| `tests/unit/web/components/ui/tldraw-node.test.tsx` | geändert | Mock auf aktuelle `getSvgString`-API umgestellt |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | TLDraw-Node für RichText-Basistest isoliert gemockt |
| `logs/2026-05-21-fix-rote-tests-tldraw-migration.md` | neu | Schritt-Log für den Test-Fix angelegt |
| `logs/README.md` | geändert | Log-Index um den Fix ergänzt |

## Probleme und Abweichungen

Keine. Die Änderungen betreffen nur Testcode und Test-Fixtures. Produktionscode, Migrationen und fachliche Implementierung wurden nicht verändert.

## Offene Punkte / Folgeaufgaben

Keine.
