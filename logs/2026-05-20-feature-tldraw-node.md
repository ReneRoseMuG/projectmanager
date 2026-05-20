# Log: TLDraw-Zeichenblock

**Datum:** 20.05.26  
**Schritt:** Feature — TLDraw-Zeichenblock als TipTap Custom Node  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Rich-Text-Editor wurde um einen TLDraw-Zeichenblock als TipTap Custom Node erweitert. Die neue Node speichert den TLDraw-Snapshot als JSON-String im `snapshot`-Attribut und wird als atomarer Block gerendert. Die React-NodeView zeigt im Vorschauzustand einen Platzhalter oder eine gecachte SVG-Vorschau und öffnet per Doppelklick die eingebettete TLDraw-Canvas. Übernehmen serialisiert den aktuellen Snapshot, erzeugt eine SVG-Vorschau und räumt Object-URLs beim Austausch oder Unmount auf; Abbrechen verlässt den Editor ohne Attributänderung. Der Full-Toolbar-Block von `RichTextInlineField` enthält zusätzlich einen Button zum Einfügen leerer Zeichenblöcke.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/package.json` | geändert | `@tldraw/tldraw` als Web-Dependency ergänzt |
| `package-lock.json` | geändert | Dependency-Baum für TLDraw v2.4.6 ergänzt |
| `apps/web/src/components/ui/tldraw-node.ts` | neu | TipTap-Node mit `atom`, `snapshot`-Attribut und ReactNodeViewRenderer |
| `apps/web/src/components/ui/TldrawNodeView.tsx` | neu | Vorschau-, Editier-, Commit-, Cancel- und Cleanup-Logik |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | TldrawNode registriert und Full-Toolbar-Button ergänzt |
| `apps/web/src/styles.css` | geändert | TLDraw-CSS importiert und `.tl-container` begrenzt |
| `apps/web/src/components/ui/__tests__/tldraw-node.test.tsx` | neu | TN-01 bis TN-11 für NodeView-Verhalten ergänzt |
| `logs/2026-05-20-feature-tldraw-node.md` | neu | Schritt-Log für diesen Auftrag |
| `logs/README.md` | geändert | Log-Index um diesen Auftrag ergänzt |

## Probleme und Abweichungen

`npm install` hat ohne Versionsangabe zunächst TLDraw 5 installiert. Da der Auftrag TLDraw v2 vorgibt, wurde die Dependency auf `@tldraw/tldraw@2.4.6` korrigiert und anschließend mit `npm ls @tldraw/tldraw` geprüft. Der erste Typecheck zeigte außerdem, dass die installierte TipTap-Version die NodeView-Props über `ReactNodeViewProps` bereitstellt; die neuen Dateien wurden entsprechend angepasst. Weitere Abweichungen vom Auftrag gibt es nicht.

## Offene Punkte / Folgeaufgaben

Keine.
