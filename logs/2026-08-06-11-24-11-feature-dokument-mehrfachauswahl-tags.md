# Log: Dokument-Mehrfachauswahl und Tags

**Datum:** 06.08.26  
**Uhrzeit:** 11:24:11  
**Schritt:** Feature  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Dokumentbibliothek besitzt nun eine von der Detailauswahl getrennte Mehrfachauswahl über die Checkboxen der Thumbnails. Bis zu 100 ausgewählte Dokumente können gemeinsam um bis zu 20 DMS-Tags ergänzt werden; vorhandene Tags bleiben erhalten und wiederholte Zuweisungen sind idempotent. Die API prüft Berechtigungen und Dokumentversionen und führt die Zuordnung gebündelt in einer Transaktion aus, ohne eine Datenbankabfrage pro Dokument zu starten. Nach erfolgreicher Zuweisung liefert sie die aktualisierten Dokumente zurück, die der Web-Hook sofort in alle progressiven Bibliotheks-Caches schreibt; erst danach wird die Auswahlleiste geschlossen. Suche, Typ- und Größenwahl, aktive Filter sowie die Mehrfachaktionsleiste bilden nun einen gemeinsamen Sticky-Bereich über den Thumbnails.

Für die Tests wurden die Skills `test-entwurfsleitplanken` und `planungsleitplanken` angewendet. Abgedeckt sind Unit-Tests mit echtem TanStack QueryClient, API-Integrationstests mit isolierter echter Testdatenbank sowie ein Browser/E2E-Fall mit echter Web-App, API und Testdaten. Bewiesen werden additive und idempotente Zuweisung, atomarer Versionskonflikt, Berechtigungen, unmittelbare Cache-Aktualisierung, getrennte Auswahlgesten und Sticky-Markup.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/dms.ts` | geändert | Geschützter Bulk-Tag-Endpunkt mit validiertem Request- und Response-Schema |
| `apps/api/src/services/document.service.ts` | geändert | Gebündelte additive Tag-Zuweisung mit Versionierung, Transaktion und Journal |
| `apps/web/src/api/documents.ts` | geändert | Bulk-API-Vertrag liefert aktualisierte Dokumente |
| `apps/web/src/hooks/useDocuments.ts` | geändert | Mutation und sofortige Aktualisierung progressiver Dokument-Caches |
| `apps/web/src/components/attachments/DocumentTile.tsx` | geändert | Detailöffnung und Mehrfachauswahl als getrennte Gesten |
| `apps/web/src/components/documents/DocumentBulkTagBar.tsx` | neu | Mehrfachaktionsleiste mit TagPicker und Ladezustand |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Auswahlzustand, Bulk-Aktion und gemeinsame Sticky-Steuerung |
| `apps/web/src/utils/domainLabels.ts` | geändert | Texte für Mehrfachauswahl und Ladezustand |
| `docs/design-leitfaden.md` | geändert | DMS-Interaktion und Sticky-Toolbar verbindlich dokumentiert |
| `tests/integration/api/dms.test.ts` | geändert | Bulk-Erfolg, Idempotenz, Berechtigungen und atomarer Konflikt |
| `tests/unit/web/api/documents.test.ts` | neu | Bulk-Request und aktualisierte API-Antwort |
| `tests/unit/web/hooks/useDocuments.test.tsx` | geändert | Sofortige Aktualisierung des progressiven Caches |
| `tests/unit/web/components/attachments/DocumentTile.test.tsx` | geändert | Getrennte Checkbox- und Detailinteraktion |
| `tests/unit/web/pages/DocumentsPage.grid.test.tsx` | geändert | Mehrfachzuweisung und Sticky-Steuerung |
| `tests/browser/web/documents.spec.ts` | geändert | Realer Bulk-Tag-Ablauf ohne manuelles Neuladen |

## Probleme und Abweichungen

Die gezielten API-Integrationstests sind mit 2/2 Tests grün. Die gezielten Web-Unit-Tests sind mit 30/30 relevanten Tests grün; Web- und API-Build sowie das gezielte ESLint-Gate sind ebenfalls grün. Der neue Browser/E2E-Test konnte nicht bis zum ersten Browser-Schritt starten: Der Benutzer `taskmanager_test` darf die durch die E2E-Infrastruktur erzeugte Tabelle `__drizzle_migrations_taskmanager` nicht lesen (`SELECT command denied`). Dieser Infrastrukturfehler liegt außerhalb des Features und wurde gemäß Umsetzungsregel nicht nebenbei verändert.

Der vollständige bestehende Test `persistiert die gewählte Kachelgröße` wurde nicht angepasst; er erwartet weiterhin den veralteten Titel „Kachelgröße Groß“, während die aktuelle UI „Kachelgröße L“ verwendet. Die für diese Änderung ausgewählten Tests umgehen diesen bereits bekannten, fachfremden Altfehler nicht durch abgeschwächte Assertions.

## Offene Punkte / Folgeaufgaben

- Dem E2E-Datenbankbenutzer die nötigen Rechte für seine isolierte Migrationstabelle erteilen und danach `npm run e2e -w apps/web -- documents.spec.ts -g "mehreren Kacheln"` erneut ausführen.
- Den bestehenden veralteten Kachelgrößen-Test in einem separaten Auftrag gegen die aktuelle S/M/L-Beschriftung einordnen.
