# Log: Veraltete Test-Assertions

**Datum:** 05.07.26  
**Uhrzeit:** 07:43:53  
**Schritt:** Fix - Veraltete Test-Assertions  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die offensichtlich veralteten Attachment-Assertions wurden an den aktuellen MS-75/DMS-Vertrag angepasst. Tests erwarten nun nicht mehr, dass Attachments beim Löschen oder Entknüpfen ihres Fachobjekt-Owners physisch gelöscht werden. Stattdessen prüfen sie spezifisch, dass die jeweilige Junction-Zeile entfernt wird und der Attachment-Datensatz als DMS-Dokument erhalten bleibt. Zusätzlich wurde ein FeatureForm-Unit-Test von der alten Parent-Kontext-Anzeige auf die aktuelle Parent-Auswahl im Sidebar-Details-Tab umgestellt. Produktcode wurde nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/attachments.test.ts` | geändert | Wiki-Attachment-Delete prüft Unlink plus erhaltenes Attachment |
| `tests/integration/api/delete-cascade.test.ts` | geändert | Feature-/Ticket-Kaskaden prüfen entfernte Attachment-Joins plus erhaltene Attachments |
| `tests/integration/api/milestone-cascade.test.ts` | geändert | Meilenstein-Kaskadenvertrag und Assertions auf Attachment-Retention aktualisiert |
| `tests/integration/api/milestones.test.ts` | geändert | Milestone-Supportobjekt-Tests prüfen Attachment-Retention und Join-Bereinigung |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Parent-Kontext-Assertion auf aktuelle Parent-Auswahl umgestellt |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Die Änderung beschränkt sich auf veraltete Test-Assertions und Testbeschreibungen. Testleitplanken: API-Integrationstests nutzen echte Fastify-App, echte MySQL-Testdatenbank und temporäre Upload-/Preview-Verzeichnisse; der Web-Test bleibt ein Unit-/Komponententest mit vorhandenen Fixtures und Mocks.

## Offene Punkte / Folgeaufgaben

Der vollständige rote Testbestand ist damit nicht vollständig bereinigt. Die verbleibenden bekannten Gruppen aus dem vorherigen Report, insbesondere API-Config-Isolation, ParentContextField-Referenzanzeige, Details-Tab-Flex-Fill und E2E-Selektoren, bleiben Folgeaufgaben.
