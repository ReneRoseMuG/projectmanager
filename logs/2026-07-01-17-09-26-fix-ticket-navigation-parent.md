# Log: Ticket-Navigation Parent-Kontext

**Datum:** 01.07.26  
**Uhrzeit:** 17:09:26  
**Schritt:** Fix — Ticket-Navigation Parent-Kontext  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die globale Ticketliste (`GET /api/tickets`) liefert jetzt für root Tickets den ersten vorhandenen Parent-/Owner-Kontext als `visibleParent`. Dadurch greifen die bereits vorhandenen `ParentBadge`-Darstellungen in `TicketCard` auch in der Navigation-Hauptansicht für Tickets. Ownerlose Tickets bleiben unverändert und erhalten `visibleParent: null`. Der Fix nutzt die bestehende `ticketParentContexts()`-Logik, damit die Detailansicht und die Karten dieselbe Kontextquelle verwenden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tickets.service.ts` | geändert | `listTickets()` setzt `visibleParent` aus vorhandenen Parent-Kontexten |
| `tests/fixtures/api/factories.ts` | geändert | `TestTicket.visibleParent` optional typisiert |
| `tests/integration/api/tickets.test.ts` | geändert | Globaler Ticketlisten-Test prüft Owner- und ownerlosen Gegenfall |

## Probleme und Abweichungen

Graphify konnte nicht genutzt werden, weil `graphify query` lokal erneut mit `uv trampoline failed to canonicalize script path` abbrach. Keine fachliche Abweichung vom Plan.

Testleitplanken: Integrationstest mit echter Test-App und isolierter Testdatenbank, keine Mocks. Bewiesen wurde, dass `GET /api/tickets` für ein Projekt-Ticket den sichtbaren Projekt-Parent liefert und für ein ownerloses Ticket keinen Parent erfindet.

## Offene Punkte / Folgeaufgaben

Keine.
