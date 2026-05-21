# Log: Ticket-Detailformular Tabs

**Datum:** 21.05.26  
**Schritt:** Feature — Ticket-Detailformular Tabs  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Ticket-Detailformular wurde auf dieselbe Formularbasis wie die anderen Detailseiten umgestellt. `TicketForm` rendert jetzt Tabs für Details, Sub-Tickets, Relationen, Kommentare, Notizen, Dateien und im berechtigten Edit-Modus Journal. Im Edit-Modus werden echte Detaildaten, Notizen, Attachments und Relationstickets über die vorhandenen Hooks geladen. Im Create-Modus sammelt das Formular Pending-Daten und `TicketDetailPage` speichert nach dem Ticket seriell Tags, Sub-Tickets, Relationen, Kommentare, Notizen und Dateien. Der Ticket-Detail-Hook wurde um Kommentar-Mutationen erweitert, und die alte abweichende `TicketDetail`-Komponente wurde entfernt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Ticketformular auf Tabs, Detaildaten und Pending-Listen umgestellt |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Create-/Edit-Flow für neue Pending-Daten ergänzt |
| `apps/web/src/hooks/useTicketDetail.ts` | geändert | Kommentar-Mutationen und Invalidierung ergänzt |
| `apps/web/src/components/tickets/TicketDetail.tsx` | gelöscht | Ungenutzte zweite Detailbasis entfernt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Ticket-Detail-Fixture und Hook-/API-Mocks ergänzt |
| `tests/unit/web/components/tickets/TicketForm.test.tsx` | geändert | Tab-, Pending- und Detaildaten-Suite erweitert |
| `tests/browser/web/ticket-detail-tabs.spec.ts` | neu | Browser-Test mit echten Ticket-Detaildaten ergänzt |

## Probleme und Abweichungen

Keine. Die bereits vorhandenen fremden Änderungen unter `docs/tasks/*` wurden nicht verändert.

## Offene Punkte / Folgeaufgaben

Keine.
