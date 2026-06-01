---
name: projekt-manager
description: >
  Dieser Skill wird verwendet wenn der Nutzer Projekte, Meilensteine, Aufgaben, 
  Tickets, Features oder Use Cases der Projekt Manager App abfragen oder bearbeiten 
  möchte. Auslöser: "zeig mir alle Projekte", "liste Projekte auf", "was sind meine 
  Meilensteine", "Aufgaben für Projekt X", "erstelle eine Aufgabe", "Features 
  anzeigen", "Use Cases auflisten", oder jede andere Interaktion mit der lokalen 
  Projekt Manager App.
---

## Verfügbare Tools

Alle Tools des `projekt-manager` MCP Servers stehen zur Verfügung:

**Projekte & Meilensteine**
- `list_projects` — alle Projekte auflisten
- `get_project` — ein Projekt per ID abrufen
- `list_milestones` — Meilensteine (optional gefiltert nach Projekt)
- `get_milestone` — einen Meilenstein per ID abrufen

**Aufgaben & Tickets**
- `list_tasks_for_parent` — Aufgaben eines Projekts/Meilensteins auflisten
- `list_tickets_for_parent` — Tickets eines Projekts/Meilensteins auflisten
- `get_task` — eine Aufgabe per ID abrufen
- `get_ticket` — ein Ticket per ID abrufen
- `add_task_to_parent` — neue Aufgabe anlegen
- `assign_editorial_task` — Aufgabe zuweisen
- `add_ticket_to_parent` — neues Ticket anlegen

**Features & Use Cases**
- `list_features` — Features auflisten
- `get_feature` — ein Feature per ID abrufen
- `create_feature` — neues Feature anlegen
- `update_feature_content` — Feature-Inhalt aktualisieren
- `link_feature_to_parent` — Feature verknüpfen
- `list_use_cases` — Use Cases auflisten
- `get_use_case` — einen Use Case per ID abrufen
- `create_use_case` — neuen Use Case anlegen
- `update_use_case_content` — Use Case aktualisieren
- `add_task_to_use_case` / `add_ticket_to_use_case` — Aufgaben/Tickets zu Use Case verknüpfen

**Kataloge & Benutzer**
- `list_catalogs` — Kataloge auflisten
- `list_users` — Benutzer auflisten

**Kommentare & Notizen**
- `add_comment_to_parent` — Kommentar hinzufügen
- `add_note_to_parent` — Notiz hinzufügen

**Beschreibungen aktualisieren**
- `update_project_description` — Projektbeschreibung aktualisieren
- `update_milestone_description` — Meilensteinbeschreibung aktualisieren
- `update_task_description` — Aufgabenbeschreibung aktualisieren
- `update_ticket_description` — Ticketbeschreibung aktualisieren

## Workflow: Beauftragung zur Bearbeitung

Wenn der Nutzer Claude beauftragt, ein Ticket, eine Aufgabe oder einen Meilenstein zu **bearbeiten** (z. B. implementieren, umsetzen, analysieren, lösen):

### 1. Arbeit erledigen
Zuerst die eigentliche Aufgabe vollständig umsetzen.

### 2. Status auf „Ausstehend" setzen
Nach Abschluss den Status des Objekts auf `pending` setzen:
- Ticket → `update_ticket` mit `status: "pending"`
- Aufgabe → `update_task` mit `status: "pending"`
- Meilenstein → `update_milestone` mit `status: "pending"`

### 3. Ausführungskommentar hinzufügen

Der Kommentar ist ein **Arbeitsprotokoll** — er beschreibt was tatsächlich gemacht wurde, nicht was geplant ist.

**Einzelnes Ticket oder Aufgabe** — kurze, menschenlesbare Log-Nachricht:
- Was wurde gemacht, was wurde geändert
- Kein technisches Jargon
- Beispiel: *„Tab-Beschriftung auf Format [Shortcode] Name umgestellt. Menüeintrag in Board- und Listview ergänzt."*

**Elternobjekt (z. B. Meilenstein mit mehreren Aufgaben/Tickets)** — Kommentar am Elternobjekt, zusätzlich mit:
- Überblick über alle durchgeführten Änderungen
- **Branching-Entscheidungen**: Welcher Branch, welche Strategie, welche Reihenfolge der Teilaufgaben
- Beispiel: *„Meilenstein abgearbeitet auf Branch `feature/wiki-redesign`. Reihenfolge: Datenbankschema → API-Endpunkte → UI. Alle drei Teilaufgaben erledigt."*

Kommentar hinzufügen mit `add_comment_to_parent`.

---

## Allgemeine Vorgehensweise

1. Nutze immer zuerst `list_projects` um einen Überblick zu bekommen, wenn kein spezifisches Projekt genannt wird.
2. Bei hierarchischen Abfragen (z.B. Aufgaben eines Projekts) zuerst die Parent-ID ermitteln.
3. Ergebnisse kompakt und übersichtlich präsentieren — bei langen Listen wichtigste Felder zusammenfassen.
4. Die API muss lokal laufen (`http://127.0.0.1:3001`). Falls Tools Fehler zurückgeben, darauf hinweisen, dass die Projekt Manager App gestartet sein muss.

## Textfelder sind HTML

Der Projekt Manager rendert alle `description`- und `text`-Felder als HTML-Editor — **niemals Markdown übergeben**.

Konvertierungsregel:

| Markdown | HTML |
|---|---|
| `## Überschrift` | `<h2>Überschrift</h2>` |
| `### Unterüberschrift` | `<h3>Unterüberschrift</h3>` |
| `**fett**` | `<strong>fett</strong>` |
| `- Listenpunkt` | `<ul><li>Listenpunkt</li></ul>` |
| `1. Punkt` | `<ol><li>Punkt</li></ol>` |
| Fließtext-Absatz | `<p>Fließtext-Absatz</p>` |

Betrifft: `add_task_to_parent`, `add_ticket_to_parent`, `update_milestone`, `update_task_description`, `update_ticket_description`, `update_project_description`, `add_note_to_parent`, `create_feature`, `create_use_case` — überall wo ein Textinhalt übergeben wird.
