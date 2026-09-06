# Bauplan: projekt-manager (Basis-Skill)

> **Herkunft seit 2026-09-06:** Der Skill selbst liegt nicht mehr unter `.claude/skills/`, sondern kommt aus dem Plugin
> `pm-workflow-skills@skill-library` (Repo `ReneRoseMuG/Skill-Library`, Ordner `plugins/pm-workflow-skills/`).
> Dieser Bauplan bleibt als projektbezogene Entwurfs- und Begründungsquelle bestehen — Änderungen am Skillverhalten
> zuerst in der Skill Library vornehmen.

## Zweck

Basis-Interaktions-Skill für die Projekt Manager App. Verbindet den Coding Agent mit dem MCP-Server, stellt das Tool-Verzeichnis bereit und regelt den Bearbeitungs-Workflow für alle Objekte. Spezialisierte Skills (z. B. `feature-editorial`, `test-quality-review`) bauen auf diesem Skill auf — sie ergänzen ihn, ersetzen ihn nicht.

## Trigger

Jede Interaktion mit der Projekt Manager App: Projekte, Meilensteine, Aufgaben, Tickets, Features, Use Cases abfragen oder bearbeiten. Auslöser: „zeig mir alle Projekte", „liste Aufgaben auf", „erstelle ein Ticket", „was sind meine Meilensteine", oder jede andere Interaktion mit PM-Objekten.

## Technische Voraussetzung

Die API muss lokal laufen: `http://127.0.0.1:3001`. Falls MCP-Tools Fehler zurückgeben → Nutzer darauf hinweisen, dass die Projekt Manager App gestartet sein muss.

## Tool-Verzeichnis (vollständig)

Alle Tools des `projekt-manager` MCP-Servers — bei Skill-Bau immer aktuellen Stand aus dem MCP-Server prüfen.

**Projekte & Meilensteine**
- `list_projects` — alle Projekte auflisten
- `get_project` — Projekt per ID
- `list_milestones` — Meilensteine, optional nach Projekt gefiltert
- `get_milestone` — Meilenstein per ID
- `update_project` — Projekt aktualisieren
- `update_milestone` — Meilenstein aktualisieren
- `create_milestone` — neuen Meilenstein anlegen

**Aufgaben & Tickets**
- `list_tasks_for_parent` — Aufgaben eines Projekts/Meilensteins
- `list_tickets_for_parent` — Tickets eines Projekts/Meilensteins
- `get_task` — Aufgabe per ID
- `get_ticket` — Ticket per ID
- `add_task_to_parent` — neue Aufgabe anlegen
- `add_ticket_to_parent` — neues Ticket anlegen
- `update_task` — Aufgabe aktualisieren (Status, Felder)
- `update_ticket` — Ticket aktualisieren (Status, Felder)
- `assign_editorial_task` — Aufgabe zuweisen

**Features & Use Cases**
- `list_features` — Features auflisten
- `get_feature` — Feature per ID
- `create_feature` — neues Feature anlegen
- `update_feature` — Feature aktualisieren
- `link_feature_to_parent` — Feature mit Projekt/Meilenstein verknüpfen
- `list_use_cases` — Use Cases auflisten
- `get_use_case` — Use Case per ID
- `create_use_case` — neuen Use Case anlegen
- `update_use_case` — Use Case aktualisieren
- `add_task_to_use_case` / `add_ticket_to_use_case` — Aufgaben/Tickets zu Use Case

**Kommentare, Notizen, Anhänge**
- `add_comment_to_parent` — Kommentar hinzufügen
- `add_note_to_parent` — Notiz hinzufügen

**Kataloge & Benutzer**
- `list_catalogs` — Kataloge auflisten
- `list_users` — Benutzer auflisten

## Bearbeitungs-Workflow

Wenn der Agent ein Ticket, eine Aufgabe oder einen Meilenstein umsetzt (implementieren, analysieren, lösen):

### 1. Arbeit erledigen
Erst die eigentliche Aufgabe vollständig umsetzen.

### 2. Status auf „Ausstehend" setzen
- Ticket → `update_ticket` mit `status: "pending"`
- Aufgabe → `update_task` mit `status: "pending"`
- Meilenstein → `update_milestone` mit `status: "pending"`

### 3. Ausführungskommentar hinterlegen

Der Kommentar ist ein Arbeitsprotokoll — was tatsächlich gemacht wurde, nicht was geplant war. Kein technischer Jargon.

**Einzelnes Objekt:** kurze menschenlesbare Log-Nachricht — was wurde gemacht, was geändert.

**Elternobjekt (Meilenstein mit mehreren Aufgaben/Tickets):** Kommentar am Elternobjekt mit Überblick aller Änderungen und Branching-Entscheidungen (welcher Branch, welche Reihenfolge).

## HTML-Regel (Single Source of Truth)

Der Projekt Manager rendert alle `description`- und `text`-Felder als HTML-Editor — **niemals Markdown übergeben**.

| Markdown | HTML |
|---|---|
| `## Überschrift` | `<h2>Überschrift</h2>` |
| `### Unterüberschrift` | `<h3>Unterüberschrift</h3>` |
| `**fett**` | `<strong>fett</strong>` |
| `- Listenpunkt` | `<ul><li>Listenpunkt</li></ul>` |
| `1. Punkt` | `<ol><li>Punkt</li></ol>` |
| Fließtext-Absatz | `<p>Fließtext-Absatz</p>` |
| Mermaid | `<pre class="mermaid">...</pre>` |

Gilt für alle MCP-Tools die Textinhalte entgegennehmen. Spezialisierte Skills verweisen auf diese Datei — die Tabelle wird nicht dupliziert.

## Allgemeine Verhaltensprinzipien

- Bei unbekanntem Projekt-Kontext zuerst `list_projects` aufrufen
- Bei hierarchischen Abfragen zuerst Parent-ID ermitteln, dann Children laden
- Ergebnisse kompakt präsentieren — bei langen Listen wichtigste Felder zusammenfassen
- PM ist immer das Ausgabeziel wenn eine Objekt-ID bekannt ist

## Verhältnis zu spezialisierten Skills

Dieser Skill ist die Basis. Spezialisierte Skills erweitern ihn für bestimmte Workflows:

| Skill | Erweiterung |
|---|---|
| `feature-editorial` | Redaktionelle Feature-Beschreibung + Use Cases |
| `test-quality-review` | Testbestandsanalyse mit Bericht |
| *(weitere)* | *(eigene Workflows)* |

Spezialisierte Skills nutzen dieselben MCP-Tools und dieselbe HTML-Regel — sie definieren beides nicht neu.

## Implementierungshinweise für den Skill-Bau

- Tool-Liste bei Skill-Bau gegen aktuellen MCP-Server abgleichen — der MCP-Server ist die autoritative Quelle
- HTML-Konvertierungstabelle nur hier pflegen, in anderen Skills per Verweis referenzieren
- Trigger-Beschreibung weit formulieren — dieser Skill ist der Catch-All für PM-Interaktionen
- Spezialisierte Skills haben engere, spezifischere Trigger und werden bevorzugt wenn sie passen
