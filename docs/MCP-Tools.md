# MCP-Tools

**Stand:** 24.05.26

Diese Übersicht beschreibt die aktuell verfügbaren MCP-Tools des Projekt-Managers. Die Tools sind für Clients wie Claude Desktop oder ChatGPT gedacht und laufen gegen die bestehenden API-Routen der App.

## Betrieb und Authentifizierung

Der MCP-Server liegt im Workspace `apps/mcp-server`. Für die Kommunikation mit der Projekt-Manager-API werden diese Umgebungsvariablen verwendet:
Eine Vorlage liegt in `apps/mcp-server/.env.example`.

| Variable | Zweck |
|---|---|
| `PROJECT_MANAGER_API_BASE_URL` | Basis-URL der API, zum Beispiel `http://127.0.0.1:3001/api` |
| `PROJECT_MANAGER_API_KEY` | API-Key für geschützte Projekt-Manager-Routen |
| `MCP_HTTP_BEARER_TOKEN` | Optionaler Bearer Token für den HTTP-Transport des MCP-Servers |

Ohne `MCP_HTTP_BEARER_TOKEN` ist der Streamable-HTTP-Transport im Entwicklungsbetrieb offen. Sobald die Variable gesetzt ist, akzeptiert der Server HTTP-Anfragen nur noch mit passendem Header `Authorization: Bearer <token>`.

## Lesende Tools

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `list_projects` | Listet alle Projekte inklusive Stammdaten und Zählern. | keine | Projektliste |
| `get_project` | Liest ein einzelnes Projekt mit Beschreibung, Status, Version und Tags. | `id` | Projekt |
| `list_milestones` | Listet Meilensteine, optional gefiltert nach Projekt. | optional `projectId` | Meilensteinliste |
| `get_milestone` | Liest einen einzelnen Meilenstein mit Beschreibung, Status, Version und Tags. | `id` | Meilenstein |
| `list_tasks_for_parent` | Listet Aufgaben an einem Projekt oder Meilenstein. | `parentType`, `parentId` | Aufgabenliste |
| `list_tickets_for_parent` | Listet Tickets an einem Projekt oder Meilenstein. | `parentType`, `parentId` | Ticketliste |
| `get_task` | Liest eine einzelne Aufgabe mit aktueller Version. | `id` | Aufgabe |
| `get_ticket` | Liest ein einzelnes Ticket mit aktueller Version. | `id` | Ticket |
| `list_features` | Listet alle Features ohne Content. | keine | Featureliste |
| `get_feature` | Liest ein Feature inklusive Content. | `id` | Feature |
| `list_use_cases` | Listet Use Cases eines Features. | `featureId` | Use-Case-Liste |
| `get_use_case` | Liest einen Use Case inklusive Content. | `id` | Use Case |
| `list_catalogs` | Liest Status-, Prioritäts- und Tickettyp-Kataloge als Lookup für Schreibtools. | keine | Katalogeinträge |
| `list_users` | Listet aktive Nutzeroptionen für Assignee- und Reporter-Felder. | keine | Nutzeroptionen |

## Schreibende Tools

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `add_task_to_parent` | Legt eine Aufgabe an einem Projekt oder Meilenstein an und befüllt Stammdatenfelder. | `parentType`, `parentId`, `title`, optional `description`, `status`, `priority`, `assignee`, `dueDate` | Neue Aufgabe |
| `assign_editorial_task` | Vergibt eine redaktionelle Aufgabe als normale Aufgabe mit Briefing. | `parentType`, `parentId`, `title`, `editorialBrief`, optional `status`, `priority`, `assignee`, `dueDate` | Neue Aufgabe |
| `add_ticket_to_parent` | Legt ein Ticket an einem Projekt oder Meilenstein an und befüllt Stammdatenfelder. | `parentType`, `parentId`, `title`, optional `type`, `description`, `status`, `priority`, `reporter`, `assignee`, `environment`, `affectedVersion`, `dueDate` | Neues Ticket |
| `add_comment_to_parent` | Legt einen Kommentar an Projekt, Meilenstein, Aufgabe, Ticket, Feature oder Use Case an. | `parentType`, `parentId`, `body` | Neuer Kommentar |
| `add_note_to_parent` | Legt eine Textnotiz an Projekt, Meilenstein, Aufgabe oder Ticket an. | `parentType`, `parentId`, optional `title`, `text` | Neue Notiz |
| `add_attachment_to_parent` | Hängt eine Base64-codierte Datei an Projekt, Meilenstein, Aufgabe, Feature oder Ticket an. | `parentType`, `parentId`, `fileName`, `contentBase64`, optional `mimetype` | Neues Attachment |
| `create_feature` | Erstellt ein neues Feature mit Beschreibung und optionalem Content. | `title`, optional `description`, `content`, `status` | Neues Feature |
| `create_use_case` | Erstellt einen neuen Use Case unter einem Feature. | `featureId`, `title`, optional `description`, `content`, `status` | Neuer Use Case |
| `add_task_to_use_case` | Legt eine Aufgabe an einem Use Case an. | `useCaseId`, `title`, optional `description`, `status`, `priority`, `assignee`, `dueDate` | Neue Aufgabe |
| `add_ticket_to_use_case` | Legt ein Ticket an einem Use Case an. | `useCaseId`, `title`, optional `type`, `description`, `status`, `priority`, `reporter`, `assignee`, `environment`, `affectedVersion`, `dueDate` | Neues Ticket |

## Redaktion und Inhaltsüberarbeitung

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `update_project_description` | Überarbeitet die Projektbeschreibung versionsgeschützt. | `id`, `description` | Aktualisiertes Projekt |
| `update_milestone_description` | Überarbeitet die Meilensteinbeschreibung versionsgeschützt. | `id`, `description` | Aktualisierter Meilenstein |
| `update_task_description` | Überarbeitet die Aufgabenbeschreibung versionsgeschützt. | `id`, `description` | Aktualisierte Aufgabe |
| `update_ticket_description` | Überarbeitet die Ticketbeschreibung versionsgeschützt. | `id`, `description` | Aktualisiertes Ticket |
| `update_feature_content` | Überarbeitet Feature-Beschreibung und/oder Feature-Content versionsgeschützt. | `id`, optional `description`, `content` | Aktualisiertes Feature |
| `update_use_case_content` | Überarbeitet Use-Case-Beschreibung und/oder Use-Case-Content versionsgeschützt. | `id`, optional `description`, `content` | Aktualisierter Use Case |

## Verknüpfungen

| Tool | Zweck | Wichtige Eingaben | Ergebnis |
|---|---|---|---|
| `link_feature_to_parent` | Verknüpft ein Feature mit einem Projekt oder Meilenstein, ohne bestehende Feature-Links zu entfernen. | `parentType`, `parentId`, `featureId` | Aktuelle Featureliste des Parents |

## Unterstützte Parent-Typen

| Kontext | Unterstützte Werte |
|---|---|
| Aufgaben und Tickets an Parent | `project`, `milestone` |
| Kommentare | `project`, `milestone`, `task`, `ticket`, `feature`, `useCase` |
| Notizen | `project`, `milestone`, `task`, `ticket` |
| Attachments | `project`, `milestone`, `task`, `feature`, `ticket` |
| Feature-Verknüpfung | `project`, `milestone` |

## Testabdeckung

Die MCP-Test-Suite enthält Unit-Tests für Tool-Registrierung und HTTP-Authentifizierung sowie einen Integrationstest gegen echte Fastify-Routen mit isolierter Temp-SQLite-Datenbank. Der Integrationstest ruft jedes aktuell registrierte MCP-Tool einmal mit realen Testdaten auf und prüft die beobachtbaren Ergebnisse.
