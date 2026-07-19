# Log: Berechtigungen, Versionierung und Dateischutz

**Datum:** 19.07.26  
**Uhrzeit:** 19:01:11  
**Schritt:** 11 — Berechtigungen, Versionierung, Journal und Dateischutz  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die DMS-Endpunkte unterscheiden Lesen, Schreiben, Duplikatprüfung, Verschieben, Bibliotheksentfernung und endgültiges Löschen über die bestehende Berechtigungsressource `attachments`. Originaldateien und generierte PDF-Vorschauen werden nicht mehr über öffentliche statische Verzeichnisse ausgeliefert, sondern über authentifizierte, pfadgeschützte API-Routen mit `attachments:read`. Änderungen an Metadaten, direkter Sammlung und DMS-Tags verlangen nun durchgängig `expectedVersion`, führen den Versionszähler atomar fort und brechen konkurrierende Schreibzugriffe mit `CONFLICT` ab. Journalereignisse unterscheiden Metadatenänderung, Sammlungswechsel, Tagänderung, Owner-Unlink, Bibliotheksentfernung und endgültiges Löschen. Für die Custom Role `attachments:read` wurden positive Lese- sowie negative Scan-, Schreib- und Löschfälle auf API- und Browser-Testebene ergänzt. Die Testentwurfsleitplanken wurden für Integration und Browser/E2E angewendet; echte isolierte Testdaten werden über die vorhandene Test-DB, temporäre Upload-/Preview-Verzeichnisse und den worker-isolierten Browser-Stack verwendet, ohne Fachmocks.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/plugins/static.ts` | geändert | Öffentliche Upload- und Preview-Verzeichnisse entfernt |
| `apps/api/src/routes/attachments.ts` | geändert | Authentifizierte Content- und Preview-Dateirouten ergänzt |
| `apps/api/src/routes/dms.ts` | geändert | Explizite DMS-Rechte sowie Versions- und Actor-Übergabe ergänzt |
| `apps/api/src/repositories/attachment.repository.ts` | geändert | Atomare versionsgebundene Metadaten- und Versionsupdates |
| `apps/api/src/services/attachments.service.ts` | geändert | Geschützter Dateizugriff und Journaleintrag für Direktimporte |
| `apps/api/src/services/attachment-preview.service.ts` | geändert | Geschützte Vorschau-URLs und sichere Preview-Dateiauflösung |
| `apps/api/src/services/attachment-folder.service.ts` | geändert | Versionsgesicherter Sammlungswechsel mit Journaländerung |
| `apps/api/src/services/document.service.ts` | geändert | Versionsgesicherte Metadaten- und Tagänderungen mit Journal |
| `apps/api/src/services/document-import.service.ts` | geändert | Fortgeschriebene Version zwischen Import-Teiloperationen |
| `apps/web/src/api/documents.ts` | geändert | `expectedVersion` für Tagänderungen und geschützte Download-URL |
| `apps/web/src/hooks/useDocuments.ts` | geändert | Version an Tagmutation weitergereicht |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Versionierte Tagänderung und geschützter Download |
| `apps/api/package.json` | geändert | Nicht mehr benötigtes `@fastify/static` entfernt |
| `package-lock.json` | geändert | Abhängigkeitsstand nach Static-Entfernung aktualisiert |
| `tests/integration/api/attachments.test.ts` | geändert | Rechte-, statische URL- und Pfadmanipulationsfälle ergänzt |
| `tests/integration/api/dms.test.ts` | geändert | Custom-Role-, Konflikt- und Journalfälle ergänzt |
| `tests/browser/web/documents.spec.ts` | geändert | Read-only-Bedienoberfläche als Browserfall ergänzt |
| `tests/unit/web/hooks/useDocuments.test.tsx` | geändert | Versionsweitergabe der Tagmutation geprüft |
| `tests/unit/web/components/attachments/AttachmentPreview.test.tsx` | geändert | Geschützte Asset-URL nachgeführt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Attachment-Testfixture auf geschützte URL umgestellt |
| `tests/unit/windows-importer/importer.test.ts` | geändert | Importer-Antwort auf geschützte URL umgestellt |

## Probleme und Abweichungen

API-Typecheck und Web-Produktionsbuild sind grün. Der DMS-Integrationstest beweist alle neuen TASK-505-Fälle; insgesamt sind 17 von 18 Fällen grün. Der bekannte ältere Duplikat-Test erwartet für ein bibliotheksunsichtbares Attachment weiterhin einen Dokumentdetailzugriff mit `200`, die gewünschte Sichtbarkeitsgrenze liefert korrekt `404`. Im Attachment-Integrationstest sind 19 von 26 Fällen grün; sechs ältere generische Uploadfälle senden die seit TASK-498 verpflichtende `libraryVisibility` nicht, ein weiterer Test erwartet für eine entfernte statische Route `404`, erhält durch den globalen Auth-Guard aber bereits `401`. Der Web-Unit-Aufruf startete wegen eines nicht vorhandenen Root-`vitest.config.ts` nicht. Der Browserfall wurde angelegt, konnte jedoch nicht ausgeführt werden, weil in der aktuellen Sitzung kein steuerbarer In-App-Browser verfügbar ist. Gemäß Nutzerfreigabe wurden aus roten Tests keine Fixes in dieser Sitzung abgeleitet.

## Offene Punkte / Folgeaufgaben

- Die genannten roten bzw. nicht gestarteten Tests in einer eigenen Folgesitzung nachführen.
- Den neuen Browserfall mit dem vorgesehenen In-App-Browser gegen den isolierten E2E-Stack ausführen.
- TASK-505 bis zur Abnahme aktiv lassen; erst danach gemäß Vorgabe auf `Wartend` setzen.
