# MCP-Tools

**Stand:** 09.06.26

Diese Übersicht beschreibt die aktuell verfügbaren MCP-Tools des Projekt-Managers. Die Tools sind für Clients wie Claude Desktop oder ChatGPT gedacht und laufen gegen die bestehenden API-Routen der App.

## Betrieb und Authentifizierung

Der MCP-Server liegt im Workspace `apps/mcp-server`. Für die Kommunikation mit der Projekt-Manager-API werden diese Umgebungsvariablen verwendet:
Eine Vorlage liegt in `apps/mcp-server/.env.example`; für den gemeinsamen Projektstart liegt im Repo-Root `.env.local.example`.

| Variable | Zweck |
|---|---|
| `PROJECT_MANAGER_API_BASE_URL` | Basis-URL der API, zum Beispiel `http://127.0.0.1:3001/api` |
| `PROJECT_MANAGER_API_KEY` | API-Key für geschützte Projekt-Manager-Routen |
| `MCP_HTTP_AUTH_MODE` | HTTP-Auth-Modus: `bearer` als sicherer Standard oder `none` für lokale ChatGPT-Tests |
| `MCP_HTTP_BEARER_TOKEN` | Bearer Token für den HTTP-Transport im `bearer`-Modus |
| `PROJECT_MANAGER_MCP_AUTOSTART` | Startet MCP-HTTP automatisch mit `npm run dev` und dem Startscript |
| `PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART` | Startet zusätzlich den stabilen HTTPS-Tunnel, wenn `MCP_TUNNEL_COMMAND` gesetzt ist |
| `MCP_TUNNEL_COMMAND` | Lokaler Tunnel-Befehl, zum Beispiel ein named Cloudflare- oder ngrok-Tunnel |
| `MCP_PUBLIC_URL` | Stabile ChatGPT-Connector-URL, zum Beispiel `https://.../mcp` |

Der Streamable-HTTP-Transport ist standardmäßig im `bearer`-Modus geschützt und startet dann nur mit `MCP_HTTP_BEARER_TOKEN`. Für lokale ChatGPT-Developer-Mode-Tests kann bewusst `MCP_HTTP_AUTH_MODE=none` gesetzt werden; dieser Modus darf nur mit privatem lokalem Tunnel verwendet werden. Claude Desktop nutzt weiterhin den `stdio`-Transport und ist von dieser HTTP-Auth-Einstellung unabhängig.

## Lesende Tools

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `list_projects` | Listet alle Projekte inklusive Stammdaten und Zählern. | keine | Projektliste |
| `get_project` | Liest ein einzelnes Projekt mit Beschreibung, Status, Version und Tags. | `id` | Projekt |
| `list_milestones` | Listet Meilensteine, optional gefiltert nach Projekt. | optional `projectId` | Meilensteinliste |
| `get_milestone` | Liest einen einzelnen Meilenstein mit Beschreibung, Status, Version und Tags. | `id` | Meilenstein |
| `list_tasks_for_parent` | Listet Aufgaben an einem Projekt, Meilenstein, Feature oder Use Case. | `parentType`, `parentId` | Aufgabenliste |
| `list_tickets_for_parent` | Listet Tickets an einem Projekt, Meilenstein, einer Aufgabe, einem Feature oder Use Case. | `parentType`, `parentId` | Ticketliste |
| `list_all_tasks` | Listet alle Root-Aufgaben global inklusive `parentContexts`, ohne Parent-Einschränkung. | keine | Aufgabenliste |
| `list_all_tickets` | Listet alle Root-Tickets global inklusive `parentContexts`, ohne Parent-Einschränkung. | keine | Ticketliste |
| `get_task` | Liest eine einzelne Aufgabe mit aktueller Version. | `id` | Aufgabe |
| `get_ticket` | Liest ein einzelnes Ticket mit aktueller Version. | `id` | Ticket |
| `list_features` | Listet alle Features ohne Content. | keine | Featureliste |
| `get_feature` | Liest ein Feature inklusive Content. | `id` | Feature |
| `list_use_cases` | Listet Use Cases eines Features. | `featureId` | Use-Case-Liste |
| `get_use_case` | Liest einen Use Case inklusive Content. | `id` | Use Case |
| `resolve_reference` | Lädt ein Einzelobjekt anhand einer Kurzreferenz. | `reference`, z. B. `TASK-10` | Projekt, Meilenstein, Aufgabe, Ticket, Feature oder Use Case |
| `get_reference_context` | Lädt ein Objekt anhand einer Referenz inklusive rekursiver Kinder und Supportobjekte. | `reference`, z. B. `MS-12` oder `Meilenstein ID 12` | Kontextbaum mit `root`, `children`, `support` und `warnings` |
| `list_catalogs` | Liest Status-, Prioritäts- und Tickettyp-Kataloge als Lookup für Schreibtools. | keine | Katalogeinträge |
| `list_users` | Listet aktive Nutzeroptionen für Assignee- und Reporter-Felder. | keine | Nutzeroptionen |

## Schreibende Tools

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `create_project` | Legt ein neues Projekt mit Stammdaten an. | `name`, optional `description`, `status`, `color`, `startDate`, `dueDate`, `responsibleUserId` | Neues Projekt |
| `create_milestone` | Legt einen neuen Meilenstein unter einem Projekt an. | `projectId`, `name`, optional `description`, `status`, `color`, `startDate`, `dueDate`, `responsibleUserId` | Neuer Meilenstein |
| `add_task_to_parent` | Legt eine Aufgabe an einem Projekt oder Meilenstein an und befüllt Stammdatenfelder. | `parentType`, `parentId`, `title`, optional `description`, `status`, `priority`, `responsibleUserId`, `dueDate` | Neue Aufgabe |
| `add_task_list_to_parent` | Legt mehrere Aufgaben seriell an einem Projekt, Meilenstein, Feature oder Use Case an. | `parentType`, `parentId`, `tasks[]`, je Aufgabe optional `attachment` mit `fileName`, `contentBase64`, `mimetype` | Bulk-Ergebnis mit neuen Aufgaben und optionalen Attachments |
| `assign_editorial_task` | Vergibt eine redaktionelle Aufgabe als normale Aufgabe mit Briefing. | `parentType`, `parentId`, `title`, `editorialBrief`, optional `status`, `priority`, `responsibleUserId`, `dueDate` | Neue Aufgabe |
| `add_ticket_to_parent` | Legt ein Ticket an einem Projekt oder Meilenstein an und befüllt Stammdatenfelder. | `parentType`, `parentId`, `title`, optional `type`, `description`, `status`, `priority`, `reporterUserId`, `responsibleUserId`, `environment`, `affectedVersion`, `dueDate` | Neues Ticket |
| `add_ticket_list_to_parent` | Legt mehrere Tickets seriell an einem Projekt, Meilenstein, Task, Feature oder Use Case an. | `parentType`, `parentId`, `tickets[]`, je Ticket optional `attachment` mit `fileName`, `contentBase64`, `mimetype` | Bulk-Ergebnis mit neuen Tickets und optionalen Attachments |
| `add_comment_to_parent` | Legt einen Kommentar an Projekt, Meilenstein, Aufgabe, Ticket, Feature oder Use Case an. | `parentType`, `parentId`, `body` | Neuer Kommentar |
| `add_comments_to_parent` | Legt mehrere Kommentare seriell an Projekt, Meilenstein, Aufgabe, Ticket, Feature oder Use Case an. | `parentType`, `parentId`, `comments[]` mit `body` | Bulk-Ergebnis mit neuen Kommentaren |
| `add_note_to_parent` | Legt eine Textnotiz an Projekt, Meilenstein, Aufgabe oder Ticket an. | `parentType`, `parentId`, optional `title`, `text` | Neue Notiz |
| `add_notes_to_parent` | Legt mehrere Textnotizen seriell an Projekt, Meilenstein, Aufgabe oder Ticket an. | `parentType`, `parentId`, `notes[]` mit optional `title` und `text` | Bulk-Ergebnis mit neuen Notizen |
| `add_attachment_to_parent` | Hängt eine Base64-codierte Datei an Projekt, Meilenstein, Aufgabe, Feature oder Ticket an. | `parentType`, `parentId`, `fileName`, `contentBase64`, optional `mimetype` | Neues Attachment |
| `add_attachments_to_parent` | Hängt mehrere Base64-codierte Dateien seriell an Projekt, Meilenstein, Aufgabe, Feature oder Ticket an. | `parentType`, `parentId`, `attachments[]` mit `fileName`, `contentBase64`, optional `mimetype` | Bulk-Ergebnis mit neuen Attachments |
| `create_feature` | Erstellt ein neues Feature mit Beschreibung und optionalem Content. | `title`, optional `description`, `content`, `status`, `sortOrder`, `responsibleUserId` | Neues Feature |
| `create_use_case` | Erstellt einen neuen Use Case unter einem Feature. | `featureId`, `title`, optional `description`, `content`, `status`, `sortOrder`, `responsibleUserId` | Neuer Use Case |
| `add_task_to_use_case` | Legt eine Aufgabe an einem Use Case an. | `useCaseId`, `title`, optional `description`, `status`, `priority`, `responsibleUserId` | Neue Aufgabe |
| `add_ticket_to_use_case` | Legt ein Ticket an einem Use Case an. | `useCaseId`, `title`, optional `description`, `status`, `priority`, `responsibleUserId` | Neues Ticket |

Bulk-Tools laufen seriell und liefern kein einzelnes Objekt, sondern ein Ergebnis mit `requested`, `createdCount`, `errorCount`, `created[]` und `errors[]`. Wenn bei einer kombinierten Task-/Ticket-Anlage der optionale Attachment-Upload nach erfolgreicher Objektanlage fehlschlägt, bleibt das neue Objekt bestehen und der Attachment-Fehler wird im Ergebnis gemeldet.

## Aktualisieren

Die Update-Tools überarbeiten komplette Stammdaten samt Beschreibung beziehungsweise Content versionsgeschützt. Alle Felder außer `id` sind optional; nur übergebene Felder werden geändert.

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `update_project` | Aktualisiert Projektstammdaten und Beschreibung versionsgeschützt. | `id`, optional `name`, `description`, `status`, `color`, `startDate`, `dueDate`, `responsibleUserId` | Aktualisiertes Projekt |
| `update_milestone` | Aktualisiert Meilenstein-Stammdaten und Beschreibung versionsgeschützt. | `id`, optional `name`, `description`, `status`, `color`, `startDate`, `dueDate` | Aktualisierter Meilenstein |
| `update_task` | Aktualisiert Aufgabenstammdaten und Beschreibung versionsgeschützt. | `id`, optional `title`, `description`, `status`, `priority`, `responsibleUserId`, `dueDate` | Aktualisierte Aufgabe |
| `update_ticket` | Aktualisiert Ticketstammdaten, Beschreibung und Lösung versionsgeschützt. | `id`, optional `title`, `type`, `description`, `status`, `priority`, `reporterUserId`, `responsibleUserId`, `environment`, `affectedVersion`, `dueDate`, `resolution` | Aktualisiertes Ticket |
| `update_feature` | Aktualisiert Feature-Stammdaten, Beschreibung und Content versionsgeschützt. | `id`, optional `title`, `status`, `description`, `content`, `sortOrder`, `responsibleUserId` | Aktualisiertes Feature |
| `update_use_case` | Aktualisiert Use-Case-Stammdaten, Feature-Zuordnung, Beschreibung und Content versionsgeschützt. | `id`, optional `title`, `status`, `description`, `content`, `sortOrder`, `responsibleUserId`, `featureId` | Aktualisierter Use Case |

## Verknüpfungen

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `link_task_to_parent` | Verknüpft eine bestehende Aufgabe mit einem Projekt, Meilenstein, Feature oder Use Case, ohne sie neu anzulegen. | `parentType`, `parentId`, `taskId` | Verknüpfte Aufgabe |
| `link_ticket_to_parent` | Verknüpft ein bestehendes Ticket mit einem Projekt, Meilenstein, Feature oder Use Case, ohne es neu anzulegen. | `parentType`, `parentId`, `ticketId` | Verknüpftes Ticket |
| `link_feature_to_parent` | Verknüpft ein Feature mit einem Projekt oder Meilenstein, ohne bestehende Feature-Links zu entfernen. | `parentType`, `parentId`, `featureId` | Aktuelle Featureliste des Parents |

## Löschen

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `preview_delete` | Zeigt vor dem Löschen den rekursiven Kontextbaum und eine Zusammenfassung der kaskadierend betroffenen Kinder und Supportobjekte. Read-only. | `reference`, z. B. `PROJ-1` | `target`, `cascadeImpact`, `warnings`, `tree` |
| `delete_project` | Löscht ein Projekt inklusive serverseitiger Kaskade. | `id` | `{ deleted, type, id }` |
| `delete_milestone` | Löscht einen Meilenstein inklusive serverseitiger Kaskade. | `id` | `{ deleted, type, id }` |
| `delete_task` | Löscht eine Aufgabe inklusive Subtask-Subtree und Supportobjekten. | `id` | `{ deleted, type, id }` |
| `delete_ticket` | Löscht ein Ticket inklusive Subticket-Subtree und Supportobjekten. | `id` | `{ deleted, type, id }` |
| `delete_feature` | Löscht ein Feature inklusive kaskadierter Use Cases und Supportobjekte. | `id` | `{ deleted, type, id }` |
| `delete_use_case` | Löscht einen Use Case inklusive serverseitiger Kaskade. | `id` | `{ deleted, type, id }` |

Löschungen sind destruktiv. Offene Relationen (z. B. Ticket-Beziehungen) führen serverseitig zu einem `409`-Blocker, der als MCP-Tool-Fehler zurückgegeben wird. `preview_delete` ändert keine Daten und sollte vor jeder Löschung genutzt werden.

## Reports

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `report_open_tasks` | Aggregiert offene Root-Aufgaben (Status nicht als abgeschlossen markiert) gruppiert nach Parent-Kontext. | keine | `generatedAt`, `totalCount`, `openCount`, `groups[]` mit `context` und `items[]` |
| `report_open_tickets` | Aggregiert offene Root-Tickets gruppiert nach Parent-Kontext. | keine | `generatedAt`, `totalCount`, `openCount`, `groups[]` mit `context` und `items[]` |
| `report_activity` | Aggregiert den Änderungsverlauf (Aufgaben, Tickets, Kommentare, Notizen u. a.) aus dem Journal nach Änderungsdatum, gruppiert nach Kontext/Parent. | optional `from`, `to`, `limit` (max. 100) | `generatedAt`, `count`, `nextCursor`, `groups[]` mit `context` und `entries[]` |

„Offen" bestimmt sich über den Katalog: ein Status gilt als abgeschlossen, wenn sein `workStatus`-Katalogeintrag `isClosed = true` hat. `report_activity` liest das globale Journal und ordnet jeden Eintrag seinem primären Kontext zu (`parent` vor `owner` vor `self`).

## Unterstützte Parent-Typen

| Kontext | Unterstützte Werte |
|---|---|
| Aufgaben am Parent lesen | `project`, `milestone`, `feature`, `useCase` |
| Tickets am Parent lesen | `project`, `milestone`, `task`, `feature`, `useCase` |
| Aufgabenliste an Parent | `project`, `milestone`, `feature`, `useCase` |
| Ticketliste an Parent | `project`, `milestone`, `task`, `feature`, `useCase` |
| Kommentare | `project`, `milestone`, `task`, `ticket`, `feature`, `useCase` |
| Notizen | `project`, `milestone`, `task`, `ticket` |
| Attachments | `project`, `milestone`, `task`, `feature`, `ticket` |
| Aufgaben-Verknüpfung | `project`, `milestone`, `feature`, `useCase` |
| Ticket-Verknüpfung | `project`, `milestone`, `feature`, `useCase` |
| Feature-Verknüpfung | `project`, `milestone` |

## Testabdeckung

Die MCP-Test-Suite enthält Unit-Tests für Tool-Registrierung und HTTP-Authentifizierung sowie einen Integrationstest gegen echte Fastify-Routen mit isolierter Temp-SQLite-Datenbank. Der Integrationstest ruft jedes aktuell registrierte MCP-Tool einmal mit realen Testdaten auf und prüft die beobachtbaren Ergebnisse.
