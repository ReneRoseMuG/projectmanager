# Log: WikiTree Drag Parent

**Datum:** 07.06.26  
**Uhrzeit:** 05:25:06  
**Schritt:** Feature — WikiTree Drag-Parent und Verwandte-Themen-Layout  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der WikiTree zeigt für Nutzer mit `wiki:write` ein `GripVertical`-Handle pro Wiki-Seite und nutzt das vorhandene `@dnd-kit/core` für Drag-and-Drop. Ein Drop auf eine Wiki-Seite verschiebt die gezogene Seite unter diese Zielseite, ein Drop auf die Root-Zone setzt `parentId` auf `null`; Drops auf sich selbst, ohne Ziel oder auf eigene Nachfahren werden im Frontend ignoriert. Die Wiki-Seite persistiert Verschiebungen über die bestehende `PATCH /api/wiki/:id`-Schnittstelle und zeigt bei Fehlern den Toast „Wiki-Seite konnte nicht verschoben werden“. Im Backend verhindert die Wiki-Service-Validierung zusätzlich Parent-Zyklen, indem Selbstzuordnung und Verschieben unter eigene Nachfahren mit `BAD_REQUEST` abgewiesen werden. Im WikiPageForm wurde das Dropdown „Übergeordnete Seite“ aus dem Details-Block entfernt; der Container „Verwandte Themen“ zeigt die übergeordnete Seite nun als reine Link-Zeile und darunter verwandte Themen als inhaltsbreite, umbrechende Link-Chips mit Entfernen-X im Bearbeitungsmodus.

Die Testleitplanken wurden angewendet. Abgedeckt sind Web-Unit-Tests mit jsdom und DnD-Mock sowie ein API-Integrationstest mit isolierter Testdatenbank; es wurden keine Produktionsdaten oder produktiven Dateisystempfade verwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/wiki.service.ts` | geändert | Parent-Validierung verhindert Selbstzuordnung und Verschieben unter eigene Nachfahren |
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | Drag-Handles, Drop-Ziele und Root-Drop-Zone ergänzt |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Move-Handler für WikiTree ergänzt und über bestehende Update-API angebunden |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Parent-Dropdown aus Details entfernt und Parent-Anzeige an RelatedPagesSelector übergeben |
| `apps/web/src/components/wiki/RelatedPagesSelector.tsx` | geändert | Parent-Zeile und umbrechende Link-Chips für verwandte Themen umgesetzt |
| `tests/integration/api/wiki.test.ts` | geändert | Parent-Zyklus und gültigen Parent-Wechsel abgesichert |
| `tests/unit/web/components/wiki/WikiTree.test.tsx` | geändert | Drag-Handle-, Seiten-Drop-, Root-Drop- und No-Op-Fälle ergänzt |
| `tests/unit/web/components/wiki/RelatedPagesSelector.test.tsx` | geändert | Parent-Zeile, Root-Anzeige, Link-Chips und Entfernen-X abgesichert |
| `logs/2026-06-07-05-25-06-feature-wikitree-drag-parent.md` | neu | Schritt-Log für die Umsetzung |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Die fokussierten WikiTree-Unit-Tests erzeugen weiterhin jsdom-Warnungen zu `HTMLCanvasElement.getContext()`, weil die bestehende Breitenmessung im Testumfeld keinen echten Canvas-Kontext bekommt. Die Tests laufen trotzdem erfolgreich durch; es handelt sich nicht um einen neuen Funktionsfehler. Im Arbeitsbaum lagen bereits uncommitted Änderungen aus vorherigen Wiki-Fixes, diese wurden nicht zurückgesetzt oder überschrieben.

## Offene Punkte / Folgeaufgaben

Keine.
