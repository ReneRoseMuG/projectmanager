# Log: Attachment-Lebenszyklus

**Datum:** 19.07.26  
**Uhrzeit:** 17:39:11  
**Schritt:** 5 — Attachment-Verknüpfung, Bibliotheksentfernung und Löschen trennen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Owner-Verknüpfungen werden nun über owner-spezifische DELETE-Routen ausschließlich gelöst; sie löschen weder Datei noch andere Owner und verlangen `expectedVersion`. Die DMS-Route `DELETE /documents/:id/library` entfernt nur die globale Bibliothekssichtbarkeit und lässt Datei, Owner, Tags und Sammlungszuordnungen bestehen. Das endgültige Löschen bleibt separat unter `DELETE /attachments/:id`, verlangt Delete-Berechtigung und aktuelle Version und entfernt anschließend die physische Datei. Ein transaktionaler Guard verhindert, dass das Lösen der letzten Owner-Verknüpfung eine bibliotheksunsichtbare, unerreichbare Datei erzeugt; die explizite Folgeaktion `orphanAction=add-to-library` übernimmt sie stattdessen in die Bibliothek. Web-Karten verwenden entsprechend getrennte Aktionen „Verknüpfung lösen“ und „Endgültig löschen“, während die DMS-Karte „Aus der Dokumentenbibliothek entfernen“ und „Endgültig löschen“ getrennt bestätigt und ihre Auswirkungen vollständig beschreibt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/repositories/attachment.repository.ts` | geändert | Versionsgesicherte Sichtbarkeitsänderung, Versionserhöhung und Löschung |
| `apps/api/src/services/attachments.service.ts` | geändert | Generischer Unlink, Orphan-Guard, Bibliotheksentfernung und versionsgesichertes Löschen |
| `apps/api/src/routes/attachments.ts` | geändert | Owner-Unlink-Routen und eindeutige endgültige Delete-Route |
| `apps/api/src/routes/tickets.ts` | geändert | Ticket-Delete auf reinen Owner-Unlink umgestellt |
| `apps/api/src/routes/dms.ts` | geändert | Explizite Route zur reinen Bibliotheksentfernung |
| `apps/web/src/api/attachments.ts` | geändert | Owner-Unlink und endgültiges Löschen getrennt |
| `apps/web/src/api/documents.ts` | geändert | Bibliotheksentfernung und endgültiges Löschen getrennt |
| `apps/web/src/hooks/useAttachments.ts` | geändert | Getrennte Mutationen und bewusste Orphan-Promotion |
| `apps/web/src/hooks/useDocuments.ts` | geändert | Getrennte DMS-Lebenszyklusmutationen |
| `apps/web/src/queries/invalidation.ts` | geändert | Owner- und DMS-Caches bei Lebenszyklusänderungen gemeinsam invalidiert |
| `apps/web/src/components/attachments/AttachmentList.tsx` | geändert | Delete-Recht steuert nur die endgültige Löschaktion |
| `apps/web/src/components/attachments/AttachmentPreview.tsx` | geändert | Getrennte Icons, Labels und Folgen-Dialoge für Unlink und Löschen |
| `apps/web/src/components/{projects,tasks,milestones,features,tickets,wiki}/*Form.tsx` | geändert | Getrennte Lifecycle-Callbacks eingebunden |
| `apps/web/src/pages/DocumentsPage.tsx` | geändert | Bibliotheksentfernung und endgültiges Löschen mit unterschiedlichen Bestätigungen |
| `tests/integration/api/dms.test.ts` | geändert | Mehrere Owner, Sichtbarkeit, Orphan-Guard, Version und Rollen abgedeckt |
| `tests/integration/api/{attachments,app.integration}.test.ts` | geändert | Bestehende Delete-Aufrufe um aktuelle Version ergänzt |
| `tests/unit/web/components/attachments/AttachmentPreview.test.tsx` | geändert | UI-Verträge und Bestätigungsfolgen ergänzt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Hook-Fixture auf getrennte Aktionen umgestellt |
| `tests/unit/web/components/*/*catalogTiming.test.tsx` | geändert | Hook-Mocks auf getrennte Aktionen umgestellt |
| `tests/unit/web/components/{wiki,milestones}/*Form.test.tsx` | geändert | Hook-Mocks auf getrennte Aktionen umgestellt |
| `logs/README.md` | geändert | Neuer Log-Eintrag in der Übersicht |

## Probleme und Abweichungen

Der API-Integrationstest mit echten Ownern, Dateien und Rollen ist ergänzt, konnte wegen des bereits dokumentierten fehlenden lokalen MySQL-Testzugangs jedoch nicht ausgeführt werden. Der gezielte AttachmentPreview-Komponententest scheiterte in allen vier Fällen vor dem Rendering mit `document is not defined`, weil die bestehende Testdatei keine JSDOM-Umgebung aktiviert; entsprechend der Vorgabe wurde daraus in dieser Session kein Test-Fix abgeleitet. Bei einem seltenen Dateisystemfehler nach erfolgreicher Datenbanklöschung meldet die API jetzt ausdrücklich den reparaturbedürftigen Zustand; eine vollständig atomare Transaktion zwischen MySQL und Dateisystem ist technisch nicht möglich.

## Offene Punkte / Folgeaufgaben

- API-Integrationstest mit korrekt konfigurierter isolierter Test-MySQL ausführen.
- AttachmentPreview-Test in einer nachfolgenden Test-Fix-Session mit JSDOM ausführen.
- Browser-/E2E-Nachweis für getrennte Labels und Bestätigungsdialoge ergänzen beziehungsweise ausführen.
- Die physische Löschreihenfolge und Dateischutzmaßnahmen werden im vorgesehenen Schritt 11 weiter gehärtet.

## Angewandte Testleitplanken

- Integration: reale Fastify-App, echte temporäre MySQL-Datenbank, reale Owner-Verknüpfungen und Temp-Dateien; Mehrfach-Owner, sichtbare/unsichtbare Zustände, Reader-Negativfälle und Versionskonflikt sind als Testfälle vorhanden.
- UI-Komponente: reales Rendering mit kontrollierten Bestätigungs-/Toast-Schnittstellen; Lauf vor Assertions wegen fehlender JSDOM-Umgebung fehlgeschlagen (4/4 rot), kein Fix in dieser Session.
- Builds: API-Typecheck und Web-Produktionsbuild erfolgreich; bekannte Chunk-Größenwarnung unverändert.
