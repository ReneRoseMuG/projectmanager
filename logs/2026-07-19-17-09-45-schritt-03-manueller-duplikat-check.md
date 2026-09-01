# Log: Manueller Duplikat-Check

**Datum:** 19.07.26  
**Uhrzeit:** 17:09:45  
**Schritt:** 3 — Manuellen Duplikat-Check für die Bibliothek bereitstellen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die DMS-API bietet einen ausschließlich manuell gestarteten, pro App-Instanz serialisierten Duplikat-Check mit lesendem Status-Endpunkt. Der Scan friert seinen ID-Scope beim Start ein, liest nur bibliothekssichtbare Attachments in Seiten zu je 100 Datensätzen und verarbeitet Dateien mit vier begrenzten Workern. SHA-256 wird aus dem tatsächlichen Dateiinhalt berechnet; Einzeldateien werden verworfen, während fehlende, unlesbare oder während des Scans geänderte Dateien getrennt gemeldet werden. Owner und direkte Sammlung werden pro Seite gebündelt geladen, sodass keine Abfrage pro Dokument entsteht. Die DMS-Oberfläche enthält die Aktion „Duplikate prüfen“, laufenden Fortschritt, Zeitpunkt/Umfang des letzten Laufs, stabile Gruppen und getrennte Prüfprobleme; ein laufender Scan kann angesehen, aber nicht erneut gestartet werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Gemeinsame DTOs für Status, Gruppen, Dokumente und Prüfprobleme |
| `apps/api/src/services/document-duplicate-check.service.ts` | neu | Seitenweiser, begrenzt paralleler und nicht mutierender SHA-256-Prüflauf |
| `apps/api/src/routes/dms.ts` | geändert | Geschützte Start- und Status-Endpunkte ergänzt |
| `apps/web/src/api/documents.ts` | geändert | API-Funktionen für Start und Status |
| `apps/web/src/queries/queryKeys.ts` | geändert | Zentraler Query-Key für den Prüflauf |
| `apps/web/src/queries/invalidation.ts` | geändert | Gezielte Invalidierung des Prüflauf-Status |
| `apps/web/src/hooks/useDocuments.ts` | geändert | TanStack-Query-Hook mit Polling nur während eines laufenden Scans |
| `apps/web/src/components/documents/DocumentDuplicateCheck.tsx` | neu | Aktion, Fortschritt und Ergebnisdarstellung |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Prüflauf-Aktion in die DMS-Filterleiste eingebunden |
| `tests/unit/api/document-duplicate-check.test.ts` | neu | Unit-Tests für Gruppierung und Dateifehlerklassifikation |
| `tests/integration/api/dms.test.ts` | geändert | Echte Datei-/DB-Testfälle sowie Berechtigungsfall ergänzt |
| `tests/unit/web/components/documents/DocumentDuplicateCheck.test.tsx` | neu | Komponentenfälle für Fortschritt, Treffer, Leerzustand und Fehler |
| `tests/unit/web/components/attachments/AttachmentPreview.test.tsx` | geändert | Fixture an das additive Attachment-DTO angepasst |
| `logs/README.md` | geändert | Neuer Log-Eintrag in der Übersicht |

## Probleme und Abweichungen

Der neue Komponenten-Test wurde ohne JSDOM ausgeführt und scheiterte deshalb vor dem Rendering mit `document is not defined` in allen vier Fällen. Entsprechend der Vorgabe wurde aus diesem roten Testlauf kein Fix abgeleitet. Der API-Integrationstest wurde wegen des bereits dokumentierten fehlenden lokalen MySQL-Testzugangs nicht erneut gestartet; die neuen Fälle sind vorhanden, aber in dieser Session nicht grün nachgewiesen. Ein eigenständiger Browser-/E2E-Test für den Prüflauf ist noch offen. Die Prüflaufergebnisse liegen bewusst nur im Arbeitsspeicher der laufenden API-Instanz; eine persistente Job-Historie war nicht beauftragt.

## Offene Punkte / Folgeaufgaben

- UI-Komponententests in einer nachfolgenden Test-Fix-Session mit der vorgesehenen JSDOM-Umgebung ausführen.
- API-Integrationstest mit korrekt konfigurierter isolierter Test-MySQL ausführen.
- Browser-/E2E-Nachweis für Start, Fortschritt, Treffer, Leerzustand und Berechtigung ergänzen beziehungsweise ausführen.

## Angewandte Testleitplanken

- Unit: reine Hash-Gruppierung und Fehlerklassifikation ohne Mocks oder externe Ressourcen; zwei Tests grün.
- Integration: reale Fastify-App, echte temporäre MySQL-Datenbank und echte Dateien im Temp-Upload-Verzeichnis; keine Fachlogik-Mocks. Fälle ergänzt, Ausführung durch fehlenden Test-DB-Zugang blockiert.
- UI-Komponente: reales Rendering mit kontrolliertem Server-State-Hook; vier Fälle vorhanden, Lauf wegen fehlender JSDOM-Umgebung vor Assertions fehlgeschlagen.
- Builds: API-Typecheck und Web-Produktionsbuild erfolgreich; bekannte Chunk-Größenwarnung unverändert.
