# Log: Upload-Bibliothekssichtbarkeit

**Datum:** 19.07.26  
**Uhrzeit:** 17:23:47  
**Schritt:** 4 — Bibliothekssichtbarkeit beim Attachment-Upload explizit steuern  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Owner-basierte Upload-Routen verlangen nun den expliziten Query-Wert `libraryVisibility` mit den fachlichen Optionen `attachment-only` oder `document-library`; ohne Auswahl lehnt die API den Request vor der Fachlogik ab. Beide Varianten verwenden weiterhin denselben Uploadpfad und dieselbe Attachment-Tabelle, speichern beim Upload SHA-256 und setzen nur die globale Bibliothekssichtbarkeit unterschiedlich. Die DMS-Liste und der DMS-Detailabruf liefern ausschließlich sichtbare Attachments, während Owner-Listen und bestehende Downloads auch reine Attachments weiterhin erreichen. Alle sechs Owner-Formulare zeigen vor der Dateiauswahl zwei verständlich erklärte Optionen; dieselbe Auswahl gilt für den gesamten Batch und bleibt nach einem Fehler erhalten. Auch vor dem Anlegen eines Fachobjekts vorgemerkte Dateien speichern ihre Auswahl pro Batch und übertragen sie später unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Gemeinsamer Typ für die explizite Upload-Auswahl |
| `apps/api/src/services/attachments.service.ts` | geändert | Sichtbarkeit und SHA-256 beim Owner-/DMS-Upload gespeichert |
| `apps/api/src/services/document.service.ts` | geändert | DMS-Liste und Detailzugriff auf sichtbare Attachments begrenzt |
| `apps/api/src/routes/attachments.ts` | geändert | Pflicht-Queryvertrag für Projekt, Aufgabe, Meilenstein, Feature und Wiki |
| `apps/api/src/routes/tickets.ts` | geändert | Pflicht-Queryvertrag für Ticket-Attachments |
| `apps/web/src/api/attachments.ts` | geändert | Upload-Auswahl an Owner-Routen übertragen |
| `apps/web/src/api/tickets.ts` | geändert | Upload-Auswahl an Ticket-Route übertragen |
| `apps/web/src/hooks/useAttachments.ts` | geändert | Auswahl als Teil der TanStack-Mutation geführt |
| `apps/web/src/components/attachments/AttachmentUploader.tsx` | geändert | Explizite Batch-Auswahl, Erklärung und sichtbare Zusammenfassung |
| `apps/web/src/components/ui/PendingFileList.tsx` | geändert | Explizite Auswahl für vorgemerkte Datei-Batches |
| `apps/web/src/types.ts` | geändert | Sichtbarkeitsauswahl im DraftFile gespeichert |
| `apps/web/src/components/{projects,tasks,milestones,features,tickets,wiki}/*Form.tsx` | geändert | Owner-Uploader auf den expliziten Vertrag umgestellt |
| `apps/web/src/pages/{ProjectDetail,Projects,TaskDetail,MilestoneDetail,Milestones,FeatureDetail,TicketDetail}Page.tsx` | geändert | Vorgemerkte Auswahl beim späteren Upload weitergereicht |
| `tests/integration/api/*.test.ts` | geändert | Bestehende Owner-Uploads explizit auf bisherige Bibliothekssichtbarkeit festgelegt |
| `tests/integration/api/dms.test.ts` | geändert | Beide Optionen, fehlende Auswahl, DMS-Scope, Hash und direkter Upload abgedeckt |
| `tests/browser/web/{milestone,ticket-detail-tabs}.spec.ts` | geändert | Test-Fixtures an den Pflichtvertrag angepasst |
| `tests/unit/web/components/attachments/AttachmentUploader.test.tsx` | neu | Auswahlpflicht, Batch-Semantik, Retry und Direktupload |
| `tests/unit/web/components/ui/PendingFileList.test.tsx` | geändert | Auswahlpflicht und gespeicherte Bedeutung geprüft |
| `tests/unit/web/components/ui/OwnerRelationBoard.test.tsx` | geändert | DraftFile-Erwartungen auf den neuen Vertrag angepasst |
| `tests/unit/web/components/{projects,tasks,features,tickets}/*Form.test.tsx` | geändert | DraftFile-Fixtures ergänzt |
| `tests/unit/web/pages/MilestonesPage.test.tsx` | geändert | DraftFile-Fixtures ergänzt |
| `logs/README.md` | geändert | Neuer Log-Eintrag in der Übersicht |

## Probleme und Abweichungen

Eine automatische Hash-Deduplizierung wurde nicht eingeführt. Der Bestand enthält bereits mehrere gleichberechtigte Attachments pro Hash; eine automatische Wahl eines kanonischen Datensatzes wäre eine nicht freigegebene Produkt- und Löschentscheidung. Damit sind die nur für eine zukünftige Hash-Wiederverwendung formulierten Promotion-/Nicht-Demotion-Fälle in diesem Schritt nicht ausführbar. Der API-Integrationstest ist vorhanden, konnte wegen des bereits dokumentierten fehlenden lokalen MySQL-Testzugangs aber nicht grün ausgeführt werden. Ein eigenständiger Browser-/E2E-Nachweis der Auswahlbedienung bleibt offen.

## Offene Punkte / Folgeaufgaben

- API-Integrationstest mit korrekt konfigurierter isolierter Test-MySQL ausführen.
- Browser-/E2E-Test für Auswahlpflicht, beide Optionen und Batch-Zusammenfassung ausführen.
- Falls später automatische Hash-Wiederverwendung beauftragt wird, muss zuerst eine kanonische Auswahl-/Merge-Regel für bestehende Duplikatgruppen festgelegt werden; dann gilt ausschließlich Promotion `false → true`, niemals Demotion.
- MCP- und Windows-Importer-Verträge werden im vorgesehenen Schritt 10 explizit nachgeführt.

## Angewandte Testleitplanken

- UI-Komponente: JSDOM, echte File-Objekte, reale Auswahl-/Dateiereignisse, nur äußerer Upload-Callback kontrolliert; 4 Tests grün.
- Draft-Dateiliste: JSDOM, echte File-Objekte und Größenvalidierung; 7 Tests grün.
- API-Integration: echte Fastify-App, isolierte MySQL-Testdatenbank und echte Temp-Dateien; Fälle ergänzt, Ausführung wegen fehlendem Test-DB-Zugang offen.
- Builds: Shared Types, API-Typecheck und Web-Produktionsbuild erfolgreich; bekannte Chunk-Größenwarnung unverändert.
