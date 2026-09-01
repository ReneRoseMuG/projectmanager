# Log: Dokument-Kachel-Scrollcontainer

**Datum:** 06.08.26  
**Uhrzeit:** 11:30:50  
**Schritt:** Fix  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der zuvor sticky über dem normalen Seiteninhalt liegende Dokument-Steuerbereich wurde durch eine echte Höhen- und Scrolltrennung ersetzt. Auf Desktop nutzen Dokumentseite und dreispaltige Inhaltszeile die verfügbare Höhe, während die Steuerung als nicht schrumpfendes Element oberhalb des Kachelbereichs stehen bleibt. Nur der neue Bereich `Dokumentkacheln` nimmt die Resthöhe ein und scrollt intern mit `overflow-y-auto`; dadurch können Thumbnails weder hinter der Steuerung durchlaufen noch oberhalb davon wieder erscheinen. Die beiden `DocumentSidePanel`-Instanzen werden auf dieselbe verfügbare Zeilenhöhe begrenzt. Unterhalb des Desktop-Breakpoints bleibt der bisherige gestapelte Seitenfluss erhalten.

Für Planung und Umsetzung wurden `graphify`, `planungsleitplanken`, `test-entwurfsleitplanken` und `code-discipline` angewendet. Der Test ist ein Web-Unit-Test mit echter `DocumentsPage`, realen Attachment-DTOs und begrenzten Hook-Mocks; er beweist die direkte DOM-Reihenfolge sowie die desktopseitige Resthöhen- und Overflow-Konfiguration.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Steuerung und intern scrollender Kachelcontainer höhenmäßig getrennt |
| `apps/web/src/components/attachments/DocumentSidePanel.tsx` | geändert | Panelhöhe an die verfügbare Inhaltszeile gebunden |
| `tests/unit/web/pages/DocumentsPage.grid.test.tsx` | geändert | Containergrenze und Scrollverantwortung abgesichert |
| `tests/browser/web/documents.spec.ts` | geändert | Browserabnahme auf Containergrenze statt Sticky-Overlay ausgerichtet |
| `docs/design-leitfaden.md` | geändert | Verbindliches DMS-Scrolllayout dokumentiert |

## Probleme und Abweichungen

Der gezielte Web-Unit-Lauf ist mit 5/5 relevanten Tests grün; ein fachfremder bestehender Kachelgrößen-Test wurde durch den Filter nicht ausgeführt. Web-Build und gezieltes ESLint-Gate sind grün. Der reale Browserlauf wurde nicht erneut gestartet, weil die bereits dokumentierte E2E-Infrastruktur weiterhin vor dem ersten Browser-Schritt an fehlenden `SELECT`-Rechten des Benutzers `taskmanager_test` auf `__drizzle_migrations_taskmanager` scheitert.

## Offene Punkte / Folgeaufgaben

- Nach Korrektur der E2E-Datenbankrechte den vorhandenen Browserfall `DMS ergänzt einen Tag auf mehreren Kacheln und aktualisiert die Ansicht sofort` erneut ausführen.
