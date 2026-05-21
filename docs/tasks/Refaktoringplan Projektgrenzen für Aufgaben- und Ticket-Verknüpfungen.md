# Refaktoringplan: Projektgrenzen für Aufgaben- und Ticket-Verknüpfungen

**Was ich plane**

Es wird eine neue Aufgabendatei `docs/tasks/codex-auftrag-projektgrenzen-relationen.md` angelegt. Der Auftrag behebt die Lücke, dass `TaskLinkDialog`, `TicketLinkDialog` und Ticket-Relationen aktuell globale Aufgaben-/Ticketlisten verwenden und die API beim Verknüpfen nur Existenz/Subitem-Regeln prüft, aber keine Projektgrenze.

Die verbindliche Regel lautet: Aufgaben- und Ticket-Relationen dürfen nur entstehen, wenn Owner und Zielobjekt dieselbe Projektgrenze teilen. Bei Features/Use-Cases gilt die gewählte Schnittmengen-Regel: mindestens ein gemeinsames Projekt genügt. Projektlose Zielobjekte dürfen an einen bereits projektgebundenen Owner angehängt werden; projektgebundene Zielobjekte dürfen nicht an einen projektlosen Owner gehängt werden.

**Betroffene Funktionen, Komponenten und Dateien**

- API-Services `tasks.service.ts` und `tickets.service.ts`: gemeinsame Projektkontext-Helfer ergänzen und in `linkOwnerTask`, `linkOwnerTicket` sowie `addTicketRelation` erzwingen. Ticket-Kontext berücksichtigt Owner-Links, Parent-Tickets und Ticket-Relationen als verbundenen Kontext.
- API-Routen `tasks.ts` und `tickets.ts`: neue Kandidaten-Endpunkte ergänzen:
  `GET /api/tasks/link-candidates?ownerType=...&ownerId=...`,
  `GET /api/tickets/link-candidates?ownerType=...&ownerId=...`,
  `GET /api/tickets/:id/relation-candidates`.
- Web-API, Query-Keys und Dialoge: `TaskLinkDialog`, `TicketLinkDialog` und Ticket-Relation-Auswahl dürfen nicht mehr `getTasks()`/`getTickets()` als globale Kandidatenquelle verwenden, sondern nur die neuen Kandidaten-Endpunkte.
- Form-/Board-Pfade: `OwnerTaskBoard`, `OwnerTicketBoard`, `ProjectForm`, `FeatureForm`, `UseCaseForm`, `TaskForm`, `TicketForm` übergeben den konkreten Relation-Kontext. Bei noch nicht gespeichertem Projekt/Feature ohne eindeutigen Owner wird “bestehendes Objekt verknüpfen” deaktiviert; neue Drafts bleiben möglich.

**Auswirkungen der Änderung**

Bestehende globale Listen `/api/tasks` und `/api/tickets` bleiben unverändert. Erstellen neuer Aufgaben/Tickets bleibt unverändert, solange die neue Relation nicht projektfremd ist. Projektfremde Links werden künftig backendseitig abgewiesen, auch wenn ein Client sie direkt per API sendet.

Vorhandene ungültige Altdaten werden nicht automatisch gelöscht, weil das Datenverlust wäre. Der Auftrag dokumentiert als offenen Punkt, dass eine separate Bereinigungs-/Audit-Aufgabe nötig ist, falls bestehende produktive Cross-Project-Links entfernt werden sollen.

**Risiken und Schadenspotential**

Schadenspotential: **mittel**. Die Änderung betrifft zentrale Relationserstellung und kann legitime Workflows blockieren, wenn der Projektkontext falsch hergeleitet wird.

Risikobegrenzung: Projektkontext wird zentral berechnet statt pro Route dupliziert; UI-Filterung ist nur Komfort, die API bleibt Sicherheitsgrenze. Keine DB-Migration ist geplant, weil keine Schemaänderung nötig ist.

**Erwartetes Ergebnis**

In der Verknüpfen-Funktion werden bei Aufgaben und Tickets keine projektfremden Kandidaten mehr angeboten. Direkte API-Aufrufe, AI-Aktionen oder andere Pfade können keine projektfremden Aufgaben-/Ticket-Relationen mehr herstellen. Projektlose neue oder bisher unzugeordnete Objekte bleiben verknüpfbar, sobald der Ziel-Owner einen gültigen Projektkontext vorgibt.

**Testplan**

- API-Integration: Cross-Project-Link für `project`, `milestone`, `feature`, `useCase`, `task` wird für Tasks/Tickets mit `400 BAD_REQUEST` abgewiesen.
- API-Integration: gleiche Projektgrenze und Schnittmenge bei Multi-Projekt-Feature sind erlaubt.
- API-Integration: Ticket-zu-Ticket-Relationen mit disjunkten Projektkontexten werden abgewiesen; gemeinsame oder neutrale Kontexte bleiben erlaubt.
- Web-Unit/Integration: Link-Dialoge nutzen Kandidaten-Endpunkte und zeigen projektfremde Aufgaben/Tickets nicht an.
- Serieller Lauf: `npm run test -w apps/api`, `npm run test -w apps/web`; E2E nur ergänzen, falls die Implementierung sichtbare Browser-Flows ändert.

**Annahmen**

- Umfang ist auf Aufgaben-/Ticket-Relationen begrenzt; Feature-/Projekt-/Use-Case-Relationen bleiben unverändert.
- Auth/Permissions ändern sich nicht: neue Kandidaten-Endpunkte sind geschützt und nutzen `read`; Link-/Relationserstellung bleibt `write`.
- Branch wird nicht angelegt, weil kein expliziter Branch-Wunsch vorliegt.
