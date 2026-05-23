# MCP CRUD Inventar

## Analysebasis

Ausgewertet wurden die Fastify-Routes unter `apps/api/src/routes/` und die jeweils zugehörigen Services unter `apps/api/src/services/`. Der Fokus liegt auf Domänenobjekten und Operationen, die für einen MCP Server als typisierte Tools sinnvoll sein können. Reine Infrastruktur-Endpunkte wie `/health`, Login/Logout und lokale AI-Textassistenz sind nicht als CRUD-Domänen aufgenommen.

## Bewertungslegende

- `✓ einfach`: gut als einzelnes MCP Tool geeignet.
- `✓ Workflow`: geeignet, aber mit fachlicher Vorprüfung oder mehreren Teilschritten.
- `⚠ destruktiv`: nur mit Bestätigung, Rollback-Hinweis oder eingeschränkter Rolle anbieten.
- `⚠ spezial`: nur für Admin-, Diagnose- oder UI-nahe MCP Tools sinnvoll.
- `✗ nicht v1`: nicht für eine erste MCP-Version empfohlen.

## Projekte

**Abhängigkeiten:** Projekte sind zentrale Owner für Meilensteine, Backlog, Tasks, Tickets, Features, Notizen, Kommentare, Anhänge, Termine, Wiki-Seiten und Tags. Statuswerte kommen aus dem Katalog `workStatus`.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Alle lesen | `GET /api/projects` | keine | ✓ einfach | Zentrale Einstiegsliste, enthält Task-Zähler und Tags. |
| Detail lesen | `GET /api/projects/:id` | `id` | ✓ einfach | Liefert Projekt inklusive Task-Zählern und Tags. |
| Erstellen | `POST /api/projects` | `name` | ✓ einfach | Optional `description`, `status`, `color`, `startDate`, `dueDate`; erzeugt Journal-Eintrag. |
| Aktualisieren | `PATCH /api/projects/:id` | `id`, `expectedVersion`, mindestens ein Feld | ✓ einfach | Versionierter Update; Status muss im Katalog existieren. |
| Löschen | `DELETE /api/projects/:id` | `id` | ⚠ destruktiv | Löscht Projekt und projekt-/meilensteinbezogene Support-Daten; nur nach Bestätigung. |
| Tags setzen | `PUT /api/projects/:id/tags` | `id`, `tagIds[]` | ✓ einfach | Ersetzt die komplette Tag-Zuordnung. |
| Features setzen | `PUT /api/projects/:id/features` | `id`, `featureIds[]` | ✓ Workflow | Ersetzt Feature-Verknüpfungen; alle Feature-IDs müssen existieren. |
| Kommentare lesen/anlegen/verknüpfen/trennen | `GET/POST/POST/DELETE /api/projects/:id/comments...` | `id`, ggf. `body` oder `commentId` | ✓ einfach | Generisches Kommentar-Modell. |
| Notizen lesen/anlegen | `GET/POST /api/projects/:id/notes` | `id`, optional `title`, `contentJson` | ✓ einfach | Einzelne Notiz-Updates laufen über `/api/notes/:id`. |
| Anhänge lesen/hochladen | `GET/POST /api/projects/:id/attachments` | `id`, bei Upload `file` | ⚠ spezial | Multipart und Dateiablage; für MCP nur sinnvoll mit Dateiquelle. |
| Backlog lesen/anlegen | `GET/POST /api/projects/:id/backlog` | `id`, bei Create `title` | ✓ einfach | Eigene Backlog-Details siehe Abschnitt Backlog. |
| Meilensteine lesen/anlegen | `GET/POST /api/projects/:id/milestones` | `id`, bei Create `name` | ✓ einfach | Projekt-ID kommt aus dem Pfad. |
| Tasks lesen/anlegen/verknüpfen | `GET/POST/POST /api/projects/:id/tasks...` | `id`, ggf. `title` oder `taskId` | ✓ Workflow | Board-Position und Projektkontext werden im Service geprüft. |
| Tickets lesen/anlegen/verknüpfen | `GET/POST/POST /api/projects/:id/tickets...` | `id`/`projectId`, ggf. `title` oder `ticketId` | ✓ Workflow | Projekt-Tickets enthalten auch von Meilensteinen geerbte Tickets. |
| Wiki-Import Vorschau | `POST /api/projects/:projectId/import/wiki/preview` | `projectId`, `sourcePath` | ⚠ spezial | Analysiert lokale Wiki-Dateien, verändert keine Daten. |
| Wiki-Import ausführen | `POST /api/projects/:projectId/import/wiki/run` | `projectId`, `sourcePath` | ⚠ destruktiv | Upsert von Features, Use Cases, Backlog und Tasks; nur mit Bestätigung. |

## Meilensteine

**Abhängigkeiten:** Meilensteine gehören zu Projekten. Sie können Tasks, Tickets, Features, Notizen, Kommentare, Anhänge, Termine und Tags tragen. Statuswerte kommen aus `workStatus`.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Alle lesen | `GET /api/milestones` | keine | ✓ einfach | Enthält Task-, Ticket- und Feature-Zähler. |
| Nach Projekt lesen | `GET /api/projects/:id/milestones` | `id` | ✓ einfach | Prüft, ob das Projekt existiert. |
| Detail lesen | `GET /api/milestones/:id` | `id` | ✓ einfach | Liefert Zähler und Tags. |
| Erstellen | `POST /api/milestones` | `projectId`, `name` | ✓ einfach | Optional Status, Beschreibung, Farbe und Daten. |
| Im Projekt erstellen | `POST /api/projects/:id/milestones` | `id`, `name` | ✓ einfach | Projekt-ID kommt aus dem Pfad. |
| Aktualisieren | `PATCH /api/milestones/:id` | `id`, `expectedVersion`, mindestens ein Feld | ✓ einfach | `projectId` darf geändert werden, muss aber existieren. |
| Löschen | `DELETE /api/milestones/:id` | `id` | ⚠ destruktiv | Löscht meilensteinbezogene Notizen und Anhänge; Relationen hängen vom Schema/Cascade ab. |
| Tags setzen | `PUT /api/milestones/:id/tags` | `id`, `tagIds[]` | ✓ einfach | Ersetzt komplette Tag-Liste. |
| Features setzen | `PUT /api/milestones/:id/features` | `id`, `featureIds[]` | ✓ Workflow | Ersetzt Feature-Verknüpfungen. |
| Tasks/Tickets verwalten | `/api/milestones/:id/tasks...`, `/api/milestones/:id/tickets...` | `id`, ggf. `title`, `taskId`, `ticketId` | ✓ Workflow | Gleiche Owner-Logik wie Projekte. |
| Kommentare, Notizen, Anhänge | Mehrere Owner-Routen | `id`, plus fachliche Felder | ✓ einfach / ⚠ spezial | Support-Objekte siehe eigene Abschnitte. |

## Tasks und Subtasks

**Abhängigkeiten:** Tasks können zu Projekten, Meilensteinen, Features und Use Cases verknüpft sein. Subtasks hängen an genau einem Parent-Task. Status und Priorität kommen aus `workStatus` und `priority`; Updates sind versioniert.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Alle Root-Tasks lesen | `GET /api/tasks` | keine | ✓ einfach | Ohne Owner-Kontext, nur Root-Tasks. |
| Owner-Tasks lesen | `GET /api/projects/:id/tasks`, `GET /api/milestones/:id/tasks`, `GET /api/features/:id/tasks`, `GET /api/use-cases/:id/tasks` | `id` | ✓ einfach | Prüft Owner und liefert Board-Items; Projektansicht erbt Meilenstein-Tasks. |
| Detail lesen | `GET /api/tasks/:id` | `id` | ✓ einfach | Enthält Subtasks, Kommentare, Notizen und Anhänge. |
| Stats lesen | `GET /api/tasks/stats` | optional `ownerType`, `ownerId` | ✓ einfach | Owner-Typen: `project`, `milestone`, `task`; beide Owner-Felder müssen zusammen kommen. |
| Neueste Tasks lesen | `GET /api/tasks/recent` | optional `ownerType`, `ownerId`, `limit`, `sort` | ✓ einfach | Für Dashboard-/Zusammenfassungs-Tools gut geeignet. |
| Überfällige Tasks lesen | `GET /api/tasks/overdue` | optional `ownerType`, `ownerId`, `limit` | ✓ einfach | Owner-Typen: `project`, `milestone`. |
| Link-Kandidaten lesen | `GET /api/tasks/link-candidates` | `ownerType`, `ownerId` | ✓ Workflow | Prüft kompatiblen Projektkontext. |
| Task beim Owner erstellen | `POST /api/{owner}/:id/tasks` | `id`, `title` | ✓ Workflow | Owner-Typen: Project, Milestone, Feature, Use Case; legt Task an und verknüpft ihn. |
| Vorhandenen Task verknüpfen | `POST /api/{owner}/:id/tasks/:taskId` | `id`, `taskId` | ✓ Workflow | Keine Subtasks; Projektkontext muss kompatibel sein. |
| Task vom Owner trennen | `DELETE /api/{owner}/:id/tasks/:taskId` | `id`, `taskId` | ⚠ destruktiv | Entfernt nur Verknüpfung, nicht den Task. |
| Board-Position ändern | `PATCH /api/{owner}/:id/tasks/:taskId/board` | `id`, `taskId`, `status`, `position`, `expectedVersion` | ✓ Workflow | Aktualisiert Task-Status und Owner-Position atomar. |
| Subtasks lesen | `GET /api/tasks/:taskId/subtasks` | `taskId` | ✓ einfach | Parent muss existieren. |
| Subtask erstellen | `POST /api/tasks/:taskId/subtasks` | `taskId`, `title` | ✓ einfach | Parent darf selbst kein Subtask sein. |
| Task aktualisieren | `PATCH /api/tasks/:id` | `id`, `expectedVersion`, mindestens ein Feld | ✓ einfach | Felder: `title`, `description`, `status`, `priority`, `assignee`, `dueDate`. |
| Task löschen | `DELETE /api/tasks/:id` | `id` | ⚠ destruktiv | Blockiert bei bestehenden Owner-Verknüpfungen; löscht Subtree-Supportdaten. |
| Tags setzen | `PUT /api/tasks/:id/tags` | `id`, `tagIds[]` | ✓ einfach | Ersetzt komplette Tag-Liste. |
| Kommentare, Notizen, Anhänge, Tickets | Mehrere Owner-Routen | `id`, plus fachliche Felder | ✓ einfach / ✓ Workflow | Support-Objekte und Ticket-Verknüpfungen separat bewertet. |

## Tickets und Sub-Tickets

**Abhängigkeiten:** Tickets können global oder an Projekte, Meilensteine, Tasks, Features und Use Cases gebunden sein. Sub-Tickets hängen an einem Parent-Ticket. Typ, Status und Priorität kommen aus `ticketType`, `workStatus` und `priority`; Updates sind versioniert.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Alle Root-Tickets lesen | `GET /api/tickets` | keine | ✓ einfach | Ohne Owner-Kontext. |
| Owner-Tickets lesen | `GET /api/projects/:id/tickets`, `GET /api/milestones/:id/tickets`, `GET /api/tasks/:id/tickets`, `GET /api/features/:id/tickets`, `GET /api/use-cases/:id/tickets` | `id`/`projectId` | ✓ einfach | Projektansicht erbt Meilenstein-Tickets. |
| Detail lesen | `GET /api/tickets/:id` | `id` | ✓ einfach | Enthält Kommentare, Notizen, Anhänge, Relationen und Sub-Tickets. |
| Stats lesen | `GET /api/tickets/stats` | optional `ownerType`, `ownerId` | ✓ einfach | Owner-Typen: `project`, `milestone`. |
| Neueste Tickets lesen | `GET /api/tickets/recent` | optional `ownerType`, `ownerId`, `limit`, `sort` | ✓ einfach | Für Agenten-Zusammenfassungen gut geeignet. |
| Link-Kandidaten lesen | `GET /api/tickets/link-candidates` | `ownerType`, `ownerId` | ✓ Workflow | Prüft kompatiblen Projektkontext. |
| Global erstellen | `POST /api/tickets` | `title` | ✓ einfach | Optional Typ, Status, Priorität und weitere Bug-Felder. |
| Beim Owner erstellen | `POST /api/{owner}/:id/tickets` | `id`, `title` | ✓ Workflow | Owner-Typen: Project, Milestone, Task, Feature, Use Case. |
| Vorhandenes Ticket verknüpfen | `POST /api/{owner}/:id/tickets/:ticketId` | `id`, `ticketId` | ✓ Workflow | Keine Sub-Tickets; Projektkontext muss kompatibel sein. |
| Ticket vom Owner trennen | `DELETE /api/{owner}/:id/tickets/:ticketId` | `id`, `ticketId` | ⚠ destruktiv | Entfernt nur die Verknüpfung. |
| Ticket aktualisieren | `PATCH /api/tickets/:id` | `id`, `expectedVersion`, mindestens ein Feld | ✓ einfach | Kann `resolvedAt` bei geschlossenem Status automatisch setzen. |
| Position ändern | `PATCH /api/tickets/:id/position` | `id`, `status`, `position`, `expectedVersion` | ✓ einfach | Aktualisiert Ticket-Status und Position. |
| Ticket löschen | `DELETE /api/tickets/:id` | `id` | ⚠ destruktiv | Blockiert bei Owner-Links, Sub-Tickets und Relationen; löscht Supportdaten. |
| Sub-Tickets lesen/erstellen | `GET/POST /api/tickets/:id/sub-tickets` | `id`, bei Create `title` | ✓ einfach | Parent-Ticket liefert Standardwerte für Typ/Priorität. |
| Relationen lesen | `GET /api/tickets/:id/relations` | `id` | ✓ einfach | Liefert eingehende und ausgehende Ticket-Relationen. |
| Relation-Kandidaten lesen | `GET /api/tickets/:id/relation-candidates` | `id` | ✓ einfach | Filtert vorhandene Relationen und inkompatible Projektkontexte. |
| Relation hinzufügen | `POST /api/tickets/:id/relations` | `id`, `targetTicketId`, `relationType` | ✓ Workflow | Verhindert Selbstbezug und Duplikate. |
| Relation entfernen | `DELETE /api/tickets/:id/relations` | `id`, `targetTicketId`, `relationType` | ⚠ destruktiv | Entfernt Relation in beide Richtungen passend zum Typ. |
| Tags setzen | `PUT /api/tickets/:id/tags` | `id`, `tagIds[]` | ✓ einfach | Ersetzt komplette Tag-Liste. |
| Notizen/Kommentare/Anhänge | `/api/tickets/:id/...` | `id`, plus fachliche Felder | ✓ einfach / ⚠ spezial | Ticket hat eigene Support-Routen zusätzlich zu generischen Routen. |

## Features

**Abhängigkeiten:** Features haben Content im Dateisystem, Use Cases, Feature-Relationen sowie Verknüpfungen zu Projekten, Meilensteinen, Tasks und Tickets. Status kommt aus `featureStatus`.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Alle lesen | `GET /api/features` | keine | ✓ einfach | Ohne Content, mit Use-Case-Zähler. |
| Detail lesen | `GET /api/features/:id` | `id` | ✓ einfach | Enthält Content aus Datei. |
| Erstellen | `POST /api/features` | `title` | ✓ einfach | Optional `status`, `description`, `content`, `sortOrder`; schreibt Content-Datei. |
| Aktualisieren | `PATCH /api/features/:id` | `id`, `expectedVersion`, mindestens ein Feld oder `content` | ✓ einfach | Versionierter DB-Update plus optionaler Dateischreibzugriff. |
| Löschen | `DELETE /api/features/:id` | `id` | ⚠ destruktiv | Entfernt Feature, Anhänge und Content-Dateien; Use-Case-Content wird mitbereinigt. |
| Projekt-/Meilenstein-Verknüpfungen lesen | `GET /api/projects/:id/features`, `GET /api/milestones/:id/features` | `id` | ✓ einfach | Liefert verknüpfte Features. |
| Projekt-/Meilenstein-Features setzen | `PUT /api/projects/:id/features`, `PUT /api/milestones/:id/features` | `id`, `featureIds[]` | ✓ Workflow | Ersetzt die komplette Feature-Menge. |
| Feature-Relationen lesen | `GET /api/features/:id/relations` | `id` | ✓ einfach | Nur ausgehende Relationen. |
| Feature-Relationen setzen | `PUT /api/features/:id/relations` | `id`, `relations[]` | ✓ Workflow | Ersetzt Relationen, verhindert Selbstrelationen. |
| Use Cases lesen/anlegen | `GET/POST /api/features/:featureId/use-cases` | `featureId`, bei Create `title` | ✓ einfach | Eigene Use-Case-Details siehe Abschnitt Use Cases. |
| Tasks/Tickets/Kommentare/Anhänge | Mehrere Owner-Routen | `id`, plus fachliche Felder | ✓ einfach / ✓ Workflow | Unterstützt Feature als Owner und Kommentarziel. |

## Use Cases

**Abhängigkeiten:** Use Cases gehören zu einem Feature, haben Content im Dateisystem und können Tasks, Tickets und Kommentare tragen. Status kommt aus `featureStatus`.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Nach Feature lesen | `GET /api/features/:featureId/use-cases` | `featureId` | ✓ einfach | Feature muss existieren. |
| Detail lesen | `GET /api/use-cases/:id` | `id` | ✓ einfach | Enthält Content aus Datei. |
| Erstellen | `POST /api/features/:featureId/use-cases` | `featureId`, `title` | ✓ einfach | Body darf `featureId` überschreiben; Ziel-Feature muss existieren. |
| Aktualisieren | `PATCH /api/use-cases/:id` | `id`, `expectedVersion`, mindestens ein Feld oder `content` | ✓ einfach | Kann in anderes Feature verschoben werden. |
| Löschen | `DELETE /api/use-cases/:id` | `id` | ⚠ destruktiv | Entfernt Use Case und Content-Datei. |
| Tasks/Tickets/Kommentare | Mehrere Owner-Routen | `id`, plus fachliche Felder | ✓ einfach / ✓ Workflow | Use Case kann Owner für Tasks und Tickets sein. |

## Backlog

**Abhängigkeiten:** Backlog-Einträge gehören zu einem Projekt und können optional Feature und Use Case referenzieren. Status kommt aus `workStatus`; Updates sind versioniert.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Projekt-Backlog lesen | `GET /api/projects/:id/backlog` | `id`, optional `featureId`, `useCaseId`, `status` | ✓ einfach | Filtert innerhalb eines Projekts. |
| Detail lesen | `GET /api/backlog/:id` | `id` | ✓ einfach | Einzelner Backlog-Eintrag. |
| Erstellen | `POST /api/projects/:id/backlog` | `id`, `title` | ✓ einfach | Optional Feature/Use Case, Import-Key und Sortierung. |
| Aktualisieren | `PATCH /api/backlog/:id` | `id`, `expectedVersion`, mindestens ein Feld | ✓ einfach | Feature/Use Case werden geprüft, wenn gesetzt. |
| Löschen | `DELETE /api/backlog/:id` | `id` | ⚠ destruktiv | Entfernt den Eintrag dauerhaft. |
| Kommentare lesen/anlegen/verknüpfen/trennen | `/api/backlog/:id/comments...` | `id`, ggf. `body` oder `commentId` | ✓ einfach | Generisches Kommentar-Modell. |

## Wiki-Seiten

**Abhängigkeiten:** Wiki-Seiten können hierarchisch sein und optional zu einem Projekt gehören. Content liegt im Dateisystem; Updates sind versioniert.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Root-Seiten lesen | `GET /api/wiki` | keine | ✓ einfach | Liefert nur Root-Seiten ohne Content. |
| Kinder lesen | `GET /api/wiki/:id/children` | `id` | ✓ einfach | Parent muss existieren. |
| Breadcrumb lesen | `GET /api/wiki/:id/breadcrumb` | `id` | ✓ einfach | Erkennt Zyklen in der Parent-Kette. |
| Detail lesen | `GET /api/wiki/:id` | `id` | ✓ einfach | Enthält Content aus Datei. |
| Erstellen | `POST /api/wiki` | `title` | ✓ einfach | Optional `parentId`, `projectId`, `content`, `sortOrder`; prüft Parent/Projekt. |
| Aktualisieren | `PATCH /api/wiki/:id` | `id`, `expectedVersion`, mindestens ein Feld oder `content` | ✓ einfach | Verhindert Selbst-Parent, prüft Projekt. |
| Löschen | `DELETE /api/wiki/:id` | `id` | ⚠ destruktiv | Blockiert, wenn Child-Seiten existieren; löscht Content-Datei. |
| Kommentare lesen/anlegen/verknüpfen/trennen | `/api/wiki/:id/comments...` | `id`, ggf. `body` oder `commentId` | ✓ einfach | Generisches Kommentar-Modell. |

## Notizen

**Abhängigkeiten:** Notizen hängen an Project, Milestone, Task oder Ticket. Inhalt ist `contentJson`; Updates sind versioniert.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Owner-Notizen lesen | `GET /api/projects/:id/notes`, `GET /api/milestones/:id/notes`, `GET /api/tasks/:id/notes`, `GET /api/tickets/:id/notes` | `id` | ✓ einfach | Owner muss existieren. |
| Notiz erstellen | `POST /api/projects/:id/notes`, `POST /api/milestones/:id/notes`, `POST /api/tasks/:id/notes`, `POST /api/tickets/:id/notes` | `id` | ✓ einfach | Optional `title`, `contentJson`; leerer Titel wird `Ohne Titel`. |
| Detail lesen | `GET /api/notes/:id` | `id` | ✓ einfach | Owner-Kontext wird nicht direkt mitgeliefert. |
| Aktualisieren | `PATCH /api/notes/:id` | `id`, `expectedVersion`, mindestens `title` oder `contentJson` | ✓ einfach | Journalisiert alle Owner-Kontexte. |
| Löschen | `DELETE /api/notes/:id` | `id` | ⚠ destruktiv | Löscht die Notiz vollständig. |
| Ticket-Notiz lösen/löschen | `DELETE /api/tickets/:id/notes/:childId` | `id`, `childId` | ⚠ destruktiv | Entfernt Link und löscht Notiz, wenn Ticket-Route genutzt wird. |

## Kommentare

**Abhängigkeiten:** Kommentare hängen an Project, Milestone, Task, Ticket, Feature, Use Case, Backlog Item oder Wiki Page. Der Body ist Pflicht; es gibt kein Update, nur Erstellen, Verknüpfen und Entfernen.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Neueste Kommentare lesen | `GET /api/comments/recent` | optional `ownerType`, `ownerId`, `mine`, `limit` | ✓ einfach | Owner-Typen: `project`, `milestone`, `task`; ohne Owner werden eigene Kommentare gelesen. |
| Owner-Kommentare lesen | `GET /api/{entity}/:id/comments` | `id` | ✓ einfach | Entity: Project, Milestone, Task, Ticket, Feature, Use Case, Backlog, Wiki. |
| Kommentar erstellen | `POST /api/{entity}/:id/comments` | `id`, `body` | ✓ einfach | Body darf HTML enthalten; Journal-Eintrag wird erzeugt. |
| Kommentar verknüpfen | `POST /api/{entity}/:id/comments/:commentId` | `id`, `commentId` | ✓ Workflow | Verknüpft vorhandenen Kommentar zusätzlich mit Entity. |
| Kommentar vom Owner trennen | `DELETE /api/{entity}/:id/comments/:commentId` | `id`, `commentId` | ⚠ destruktiv | Entfernt nur die Owner-Verknüpfung. |
| Kommentar löschen | `DELETE /api/comments/:id` | `id` | ⚠ destruktiv | Löscht den Kommentar selbst. |

## Anhänge

**Abhängigkeiten:** Anhänge hängen an Project, Milestone, Task, Ticket oder Feature und besitzen Dateiinhalt im Upload-Verzeichnis. Uploads sind multipart; Löschen entfernt DB-Eintrag, Datei und Previews.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Neueste Anhänge lesen | `GET /api/attachments/recent` | optional `ownerType`, `ownerId`, `mine`, `limit` | ✓ einfach | Owner-Typen: `project`, `milestone`, `task`; ohne Owner eigene Anhänge. |
| Owner-Anhänge lesen | `GET /api/projects/:id/attachments`, `GET /api/milestones/:id/attachments`, `GET /api/tasks/:id/attachments`, `GET /api/features/:id/attachments`, `GET /api/tickets/:id/attachments` | `id` | ✓ einfach | Owner muss existieren. |
| Preview lesen | `GET /api/attachments/:id/preview` | `id` | ⚠ spezial | UI-/Dateivorschau, für MCP nur bei Dateiinspektion sinnvoll. |
| Datei öffnen | `POST /api/attachments/:id/open` | `id` | ✗ nicht v1 | Öffnet lokal über File-Opener, kein guter Remote-MCP-Primitive. |
| Upload | `POST /api/{owner}/:id/attachments` | `id`, `file` | ⚠ spezial | MCP braucht Dateihandle/Upload-Bridge. |
| Löschen | `DELETE /api/attachments/:id` | `id` | ⚠ destruktiv | Entfernt Datei dauerhaft. |

## Tags

**Abhängigkeiten:** Tags können Project, Milestone, Task und Ticket zugeordnet werden. Tag-Datensätze sind versioniert; Namen müssen eindeutig sein.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Alle lesen | `GET /api/tags` | keine | ✓ einfach | Gut als Lookup-Tool. |
| Erstellen | `POST /api/tags` | `name` | ✓ einfach | Optional `color`; Konflikt bei gleichem Namen. |
| Aktualisieren | `PATCH /api/tags/:id` | `id`, `expectedVersion`, mindestens `name` oder `color` | ✓ einfach | Versionierter Update. |
| Löschen | `DELETE /api/tags/:id` | `id` | ⚠ destruktiv | Entfernt Tag-Datensatz und Zuordnungen. |
| Owner-Tags setzen | `PUT /api/projects/:id/tags`, `PUT /api/milestones/:id/tags`, `PUT /api/tasks/:id/tags`, `PUT /api/tickets/:id/tags` | `id`, `tagIds[]` | ✓ einfach | Ersetzt komplette Tag-Liste, prüft alle IDs. |

## Kalendertermine

**Abhängigkeiten:** Termine können mehreren Projects, Milestones und Tasks zugeordnet sein. Zeiträume werden validiert; Updates sind versioniert.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Termine lesen | `GET /api/events` | optional `from`, `to` | ✓ einfach | Filtert über Start-/Endzeit. |
| Detail lesen | `GET /api/events/:id` | `id` | ✓ einfach | Enthält Owner-Liste. |
| Erstellen | `POST /api/events` | `title`, `startTime`, `endTime` | ✓ einfach | Optional `description`, `isAllDay`, `color`, `owners[]`; Owner werden geprüft. |
| Aktualisieren | `PATCH /api/events/:id` | `id`, `expectedVersion`, mindestens ein Feld oder `owners` | ✓ einfach | Kann Owner-Liste komplett ersetzen. |
| Löschen | `DELETE /api/events/:id` | `id` | ⚠ destruktiv | Entfernt Termin dauerhaft. |

## Kataloge

**Abhängigkeiten:** Kataloge steuern Status, Priorität, Feature-Status und Ticket-Typen. Löschen ersetzt bestehende Werte durch Fallbacks und erhöht Versionen betroffener Objekte.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Alle Einträge lesen | `GET /api/catalogs` | keine | ✓ einfach | Lookup für Tool-Schemas und Statuswerte. |
| Katalog lesen | `GET /api/catalogs/:kind` | `kind` | ✓ einfach | `kind`: `workStatus`, `featureStatus`, `priority`, `ticketType`. |
| Eintrag erstellen | `POST /api/catalogs/:kind` | `kind`, `key`, `label` | ⚠ spezial | Admin-nah; `key` folgt Pattern, Farbe wird validiert. |
| Eintrag aktualisieren | `PATCH /api/catalogs/:kind/:id` | `kind`, `id`, `expectedVersion`, mindestens ein Feld | ⚠ spezial | `key` ist nicht änderbar. |
| Eintrag löschen | `DELETE /api/catalogs/:kind/:id` | `kind`, `id` | ⚠ destruktiv | Darf letzter Eintrag nicht sein; setzt Fallback auf vielen Objekten. |

## Dashboards

**Abhängigkeiten:** Dashboards sind benutzerspezifisch oder systemweit. Zugriff hängt am aktuellen User und an Dashboard-Admin-Berechtigung; Widgets werden gegen Kontextregeln validiert.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Dashboards listen | `GET /api/dashboards` | `context` | ⚠ spezial | UI-Konfiguration, aber für Personalisierung nützlich. |
| Detail lesen | `GET /api/dashboards/:id` | `id` | ⚠ spezial | Zugriff nur auf eigene/systemweite bzw. Admin-Dashboards. |
| Erstellen | `POST /api/dashboards` | `name`, `context`, `widgets[]` | ✗ nicht v1 | UI-Layout-Tool, nicht Kern-MCP. |
| Aktualisieren | `PUT /api/dashboards/:id` | `id`, `name`, `context`, `widgets[]`, `expectedVersion` | ✗ nicht v1 | Kontext darf nicht geändert werden. |
| Löschen | `DELETE /api/dashboards/:id` | `id` | ⚠ destruktiv | Berechtigungs- und Default-Folgen beachten. |
| Default setzen | `POST /api/dashboards/:id/default` | `id`, `scopeType`, `expectedVersion` | ⚠ spezial | Global nur Admin; User-Default für eigene Dashboards. |

## Journal

**Abhängigkeiten:** Journal-Einträge werden von Fachoperationen erzeugt. Es gibt nur lesende Endpunkte mit Filterung und Cursor-Pagination.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Journal lesen | `GET /api/journal` | optional `limit`, `cursor`, `q`, `operation`, `objectType`, `objectId`, `actorUserId`, `from`, `to` | ✓ einfach | Sehr geeignet für Audit-/Zusammenfassungs-Tools. |
| Objekt-Journal lesen | `GET /api/journal/objects/:objectType/:objectId` | `objectType`, `objectId`, optionale Filter | ✓ einfach | Praktisch für Historie eines konkreten Objekts. |

## Benutzer, Rollen und Berechtigungen

**Abhängigkeiten:** Admin-Operationen für Nutzer und Rollen. Rollen werden von Usern referenziert; Systemrollen sind geschützt.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| User-Optionen lesen | `GET /api/users` | keine | ✓ einfach | Aktive Nutzer als Auswahl-/Lookup-Tool. |
| Admin-User listen | `GET /api/admin/users` | keine | ⚠ spezial | Admin-Kontext. |
| Admin-User lesen | `GET /api/admin/users/:id` | `id` | ⚠ spezial | Admin-Kontext. |
| Admin-User erstellen | `POST /api/admin/users` | `firstName`, `lastName`, `email`, `roleId`, `password` | ⚠ spezial | Passwort- und Rollenhandling; nur Admin. |
| Admin-User aktualisieren | `PUT /api/admin/users/:id` | `id`, `expectedVersion`, mindestens ein Feld | ⚠ spezial | Verhindert Verlust des letzten aktiven Admins. |
| Admin-User löschen | `DELETE /api/admin/users/:id` | `id` | ⚠ destruktiv | Selbstlöschung verboten; letzter Admin geschützt. |
| Rollen listen/lesen | `GET /api/admin/roles`, `GET /api/admin/roles/:id` | ggf. `id` | ⚠ spezial | Admin-Kontext, aber nützlich für Permission-Planung. |
| Rolle erstellen | `POST /api/admin/roles` | `key`, `label`, `permissions[]` | ⚠ spezial | Custom-Rolle, validierte Permission-Ressourcen. |
| Rolle aktualisieren | `PUT /api/admin/roles/:id` | `id`, `expectedVersion`, ggf. Felder | ⚠ spezial | Systemrollen-Key nicht änderbar. |
| Rolle löschen | `DELETE /api/admin/roles/:id` | `id` | ⚠ destruktiv | Systemrollen und zugewiesene Rollen sind geschützt. |
| Permission-Katalog lesen | `GET /api/admin/permissions/catalog` | keine | ✓ einfach | Reines Lookup. |

## Einstellungen

**Abhängigkeiten:** Einstellungen hängen am aktuellen User, an Rollen oder globalem Scope. Schreiben auf Global/Role braucht Admin-Rechte; Updates sind versioniert.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Aufgelöste Einstellungen lesen | `GET /api/settings/resolved` | keine | ⚠ spezial | Für UI-/Agent-Kontext nützlich. |
| Setting setzen | `PUT /api/settings/values` | `key`, `scopeType`, `value`, `expectedVersion` | ⚠ spezial | `scopeId` je nach Scope; Wert wird gegen Registry validiert. |
| Setting löschen | `DELETE /api/settings/values` | `key`, `scopeType`, `expectedVersion` | ⚠ destruktiv | Entfernt Scope-Wert; fällt auf nächste Ebene/Default zurück. |

## Dumps und Backups

**Abhängigkeiten:** Backup-/Restore-Operationen greifen auf SQLite, Upload-/Content-Verzeichnisse, lokales Backup-Verzeichnis und optional SFTP zu. Restore ersetzt Tabellen und Dateiwurzeln.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Lokalen Backup-Status lesen | `GET /api/dumps/local/status` | keine | ⚠ spezial | Diagnose-Tool. |
| Dump lokal sichern | `POST /api/dumps/local/save` | keine | ⚠ spezial | Erstellt Archive, optional Remote-Upload. |
| Lokalen Dump previewen | `GET /api/dumps/local/latest/preview` | keine | ⚠ spezial | Liefert Hash, Confirmation Phrase, Warnungen/Blocker. |
| Lokalen Dump anwenden | `POST /api/dumps/local/latest/apply` | `fileId`, `fileHash`, `confirmationPhrase` | ⚠ destruktiv | Restore mit Sicherheitsprüfungen; nicht als allgemeines MCP-Tool v1. |
| Remote-Backup-Status lesen | `GET /api/dumps/remote/status` | keine | ⚠ spezial | SFTP-Abhängigkeit. |
| Remote-Dump previewen | `POST /api/dumps/remote/preview` | optional `fileId` | ⚠ spezial | Liest Remote-Datei, prüft Importstatus. |
| Remote-Dump anwenden | `POST /api/dumps/remote/apply` | `fileId`, `fileHash`, `confirmed=true` | ⚠ destruktiv | Verhindert parallele Imports, ersetzt produktive Daten. |

## Bestehende AI-Agent-Aktionen als Hinweis

**Abhängigkeiten:** `/api/ai/agent/execute` ruft intern bereits eine bestätigungspflichtige Aktionsliste auf. Diese Aktionen sind kein CRUD-Ersatz, aber eine gute Quelle für MCP-v1-Prioritäten.

| Operation | Methode & Pfad | Parameter | MCP-Eignung | Anmerkung |
|---|---|---|---|---|
| Aktionsplan erzeugen | `POST /api/ai/agent/plan` | `prompt` | ✗ nicht v1 | LLM-Planung über Ollama, nicht deterministisch genug als MCP-Kern. |
| Aktionsliste ausführen | `POST /api/ai/agent/execute` | `actions[]` mit `requiresConfirmation=true` | ✓ Workflow | Unterstützt Create-/Link-/Set-Aktionen für Projekte, Tasks, Tickets, Features, Tags usw. |
| Text assistieren | `POST /api/ai/text` | `html`, `operation` | ✗ nicht v1 | UI-Schreibassistenz, kein Domänen-CRUD. |

## Empfohlene Priorisierung

### MCP v1: lesen und risikoarme Erstellung

1. Projekte, Meilensteine, Tasks und Tickets: Listen, Details, Stats, Recent/Overdue, einfache Create-Operationen.
2. Backlog, Features, Use Cases und Wiki-Seiten: Lesen, Details, Erstellen und versionierte Updates ohne Löschoperationen.
3. Kommentare, Notizen und Tags: Lesen, Erstellen, Aktualisieren und Tag-Zuordnung setzen.
4. Journal und Kataloge: reine Lookup-/Audit-Tools für Kontext, Statuswerte und Änderungshistorie.

### MCP v1.5: fachliche Workflows

1. Owner-Verknüpfungen für Tasks und Tickets, inklusive Link-Kandidaten.
2. Board-/Positionsänderungen mit `expectedVersion`.
3. Feature-Verknüpfungen und Feature-/Ticket-Relationen.
4. Kalendertermine inklusive Owner-Zuordnung.

### Später oder nur mit Admin-/Bestätigungsmodus

1. Alle Delete-Operationen, besonders Project, Task, Ticket, Feature, Wiki, Attachment und Backup-Restore.
2. Dumps/Restore, Wiki-Import-Run und Dateiöffnen.
3. Admin-User, Rollen, Settings und Dashboard-Layout-Änderungen.
4. Multipart-Uploads, sofern der MCP Server keine robuste Dateiübergabe mit Größen- und Pfadprüfung anbietet.

### Wichtige Tool-Design-Regeln für den MCP Server

- Schreibende Tools sollten immer `expectedVersion` verlangen, wenn die REST-Operation versioniert ist.
- Destruktive Tools brauchen eine explizite Bestätigung und sollten in der Tool-Beschreibung die betroffenen abhängigen Daten nennen.
- Für Owner-basierte Tools sollte der MCP Server zuerst Kandidaten-/Lookup-Tools anbieten, damit IDs nicht geraten werden.
- Katalog-Keys sollten nie frei erfunden werden; MCP Tools sollten `GET /api/catalogs` als Vorbereitung nutzen.
- Backend-Berechtigungen bleiben maßgeblich. Der MCP Server sollte keine Operation anbieten, die der aktuelle Benutzer per API nicht ausführen darf.
