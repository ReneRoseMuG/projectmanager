---
name: projekt-manager-referenz-lesen
description: Use when Codex is asked to read, load, inspect, check, show, summarize, or look up Projekt Manager objects by object reference or object ID, including patterns like MS-12, PROJ-3, TASK-47, TKT-5, FEAT-26, UC-7, "Meilenstein ID 12 lesen", "Ticket 5 prüfen", "Projekt ID 3 anzeigen", or similar German/English read requests. Always use the Projekt Manager MCP server and read recursive child context without asking the user to repeat that the ID should be read through MCP.
---

# Projekt Manager Referenz Lesen

Nutze diesen Skill, wenn eine Nutzeranfrage ein Projekt-Manager-Objekt per Referenz oder ID lesen will.

## Grundregel

Lies Projekt-Manager-Referenzen immer über den MCP-Server `projekt-manager`.

Bevorzuge `get_reference_context`, weil dieses Tool das Objekt inklusive rekursiver Kinder, Notes, Attachments, Comments und relevanter Relationen lädt. Nutze `resolve_reference` nur, wenn ausdrücklich nur das Einzelobjekt ohne Kontext benötigt wird oder `get_reference_context` nicht verfügbar ist.

## Referenzen

Erkenne diese Kurzreferenzen case-insensitive:

| Referenz | Objekt |
|---|---|
| `PROJ-<id>` | Projekt |
| `MS-<id>` | Meilenstein |
| `TASK-<id>` | Aufgabe |
| `TKT-<id>` | Ticket |
| `FEAT-<id>` | Feature |
| `UC-<id>` | Use Case |

Erkenne außerdem ausgeschriebene Formen, wenn der Objekttyp eindeutig ist:

- `Projekt ID 3`, `Projekt 3`, `project 3` -> `PROJ-3`
- `Meilenstein ID 12`, `Meilenstein 12`, `milestone 12` -> `MS-12`
- `Aufgabe 47`, `Task ID 47`, `task 47` -> `TASK-47`
- `Ticket 5`, `Ticket ID 5` -> `TKT-5`
- `Feature 26`, `Feature ID 26` -> `FEAT-26`
- `Use Case 7`, `UC 7`, `Anwendungsfall 7` -> `UC-7`

Reine Zahlen ohne eindeutigen Objekttyp sind mehrdeutig. Frage in diesem Fall kurz nach dem Typ.

## Vorgehen

1. Extrahiere alle eindeutigen Referenzen aus der Nutzeranfrage.
2. Normalisiere ausgeschriebene ID-Formen auf die Kurzreferenz.
3. Rufe für jede Referenz `get_reference_context` über den Projekt-Manager-MCP-Server auf.
4. Berichte das geladene Objekt und die relevanten Kinder knapp, aber vollständig genug für die Anfrage.
5. Nenne Warnungen aus dem Tool, wenn optionale Kinder oder Previews nicht gelesen werden konnten.

## Antwortverhalten

- Fasse große Kontextbäume nach Relevanz zusammen, statt den kompletten Rohbaum auszuschreiben.
- Erwähne Attachments mit Dateiname, Typ, Größe und vorhandener Textvorschau.
- Verfolge Relationshinweise nicht weiter, wenn das MCP-Ergebnis sie nur als Relation aufführt.
- Bei mehreren Referenzen die Ergebnisse getrennt strukturieren.
- Keine Schreibtools ausführen, solange der Nutzer nur lesen, prüfen oder zusammenfassen möchte.
