# Codex-Auftrag: Bug – Projekt-Kontext schließt Meilenstein-Aufgaben und -Tickets nicht ein

## Problem

Wenn ein Dashboard-Widget im Kontext `project` (owner `{ type: "project", id: X }`) Aufgaben- oder Ticket-Statistiken abruft, werden nur Einträge berücksichtigt, die **direkt am Projekt** hängen (`projectTasks` bzw. `projectTickets`). Aufgaben und Tickets, die an **Meilensteinen des Projekts** hängen, werden nicht einbezogen.

Betroffen: alle Widgets, die `listDashboardTasks` oder `listDashboardTickets` mit `owner.type === "project"` aufrufen — also `taskStatusReport`, `taskJournal`, `overdueTasks`, `ticketStatusReport`, `ticketJournal`, `taskBoard`, `taskList`, `ticketBoard`, `ticketList`.

## Betroffene Dateien

- `apps/api/src/services/tasks.service.ts` → Funktion `listDashboardTasks`
- `apps/api/src/services/tickets.service.ts` → Funktion `listDashboardTickets`

## Fix: `tasks.service.ts`

Die Funktion `listDashboardTasks` muss für `owner.type === "project"` sowohl direkte Projektaufgaben als auch Meilensteinaufgaben des Projekts zurückgeben.

Die Hilfsfunktion `selectProjectMilestoneTaskRows` (Zeile ~283) existiert bereits und liefert genau die Meilensteinaufgaben eines Projekts. Sie wird bisher nur in anderen Kontexten genutzt.

```ts
function listDashboardTasks(database: DbClient, owner?: DashboardTaskOwner): Task[] {
  if (!owner) {
    return listTasks(database);
  }
  if (owner.type === "task") {
    return listSubtasks(database, owner.id);
  }
  if (owner.type === "project") {
    const directTasks = listOwnerTasks(database, { type: "project", id: owner.id });
    const milestoneTasks = selectProjectMilestoneTaskRows(database, owner.id);
    // Deduplizieren nach task.id (eine Aufgabe kann theoretisch sowohl am Projekt
    // als auch an einem Meilenstein hängen)
    const seen = new Set<number>();
    const result: Task[] = [];
    for (const task of [...directTasks, ...milestoneTasks]) {
      if (!seen.has(task.id)) {
        seen.add(task.id);
        result.push(task);
      }
    }
    return result;
  }
  return listOwnerTasks(database, { type: "milestone", id: owner.id });
}
```

**Hinweis:** `selectProjectMilestoneTaskRows` gibt `OwnerTaskRecord[]` zurück. Prüfe den Rückgabetyp und passe ggf. die Typen an, damit der Merge funktioniert. `Task` ist der gemeinsame Rückgabetyp von `listOwnerTasks`.

## Fix: `tickets.service.ts`

Analog: `listDashboardTickets` für `owner.type === "project"` muss neben `projectTickets` auch die Tickets aller Meilensteine des Projekts einschließen.

```ts
function listDashboardTickets(database: DbClient, owner?: DashboardTicketOwner): Ticket[] {
  if (!owner) {
    return listTickets(database);
  }
  if (owner.type === "project") {
    const directTickets = listOwnerTickets(database, { type: "project", id: owner.id });
    // Meilenstein-Tickets des Projekts laden:
    const milestoneTickets = database
      .select({ ...ticketSelect, boardPosition: milestoneTickets.position })
      .from(milestoneTickets as MilestoneTicketsTable)
      .innerJoin(milestones, eq(milestoneTickets.ownerId, milestones.id))
      .innerJoin(tickets, eq(milestoneTickets.ticketId, tickets.id))
      .where(and(eq(milestones.projectId, owner.id), isNull(tickets.parentId)))
      .all();
    // Deduplizieren nach ticket.id
    const seen = new Set<number>();
    const result: Ticket[] = [];
    for (const ticket of [...directTickets, ...milestoneTickets]) {
      if (!seen.has(ticket.id)) {
        seen.add(ticket.id);
        result.push(mapTicket(ticket)); // ggf. mapTicket anpassen
      }
    }
    return result;
  }
  return listOwnerTickets(database, owner);
}
```

**Hinweis:** Passe die Tabellen-Imports und den Mapping-Aufruf entsprechend der bestehenden Konventionen in der Datei an. Den Tabellennamen `milestoneTickets` gibt es möglicherweise schon als Import — prüfen.

## Tests

- Bestehende Integration-Tests für `getTaskStats` und `getTicketStats` mit Projekt-Owner ergänzen:
  - Testfall: Projekt mit einem Meilenstein, Aufgabe/Ticket nur am Meilenstein → muss in der Statistik erscheinen.

## Abnahmekriterien

- `GET /tasks/stats?ownerType=project&ownerId=X` liefert die Summe aus direkt am Projekt hängenden **und** an Meilensteinen des Projekts hängenden Aufgaben.
- Analog für `/tickets/stats`.
- Keine Duplikate in der Ergebnismenge.
- Bestehende Tests laufen weiterhin durch.
