# Codex-Auftrag: Objekt-Referenzen – „ID kopieren" und `resolve_reference`-Tool

## Ziel

Jedes Domänenobjekt bekommt einen menschenlesbaren, eindeutigen Kurzbezeichner (z. B. `TASK-10`, `FEAT-3`). In der UI erscheint ein „ID kopieren"-Button, der diesen Bezeichner in die Zwischenablage legt. Der MCP Server bekommt ein neues Tool `resolve_reference`, das einen solchen Bezeichner entgegennimmt und das vollständige Objekt zurückgibt.

Damit kann der Nutzer im Gespräch mit Claude einfach `FEAT-26` sagen, und Claude kann das Objekt ohne Rückfrage direkt laden.

---

## Präfix-Konvention

| Präfix | Objekt | MCP-Tool zum Laden |
|---|---|---|
| `PROJ-{id}` | Projekt | `get_project` |
| `MS-{id}` | Meilenstein | `get_milestone` |
| `TASK-{id}` | Aufgabe (Task) | `get_task` |
| `TKT-{id}` | Ticket | `get_ticket` |
| `FEAT-{id}` | Feature | `get_feature` |
| `UC-{id}` | Use Case | `get_use_case` |

Die Präfixe sind fest kodiert, Groß-/Kleinschreibung beim Einlesen ignorieren (`task-10` = `TASK-10`).

---

## Aufgabe 1 – UI: „ID kopieren"-Button

An jedem Objekt wird ein kleiner Copy-Button platziert, der beim Klick den Kurzbezeichner in die Zwischenablage schreibt und kurz visuelles Feedback gibt (z. B. Checkmark für 1,5 s).

### Platzierung

- **Karten-Ansicht** (Task-Card, Ticket-Card usw.): Button im Hover-State sichtbar, neben Titel oder in der Aktionsleiste
- **Detail-Ansicht / Header**: dauerhaft sichtbar neben dem Titel
- **Listen-Zeilen**: im Hover-State sichtbar

### Verhalten

1. Klick kopiert z. B. `TASK-10` in die Zwischenablage (`navigator.clipboard.writeText`)
2. Icon wechselt kurz auf ein Checkmark-Icon, dann zurück
3. Kein Toast nötig – das Icon-Feedback reicht

### Hilfsfunktion

Eine zentrale Hilfsfunktion (z. B. in `lib/references.ts` oder `utils/object-reference.ts`) erzeugt den Bezeichner:

```ts
export function objectReference(type: ObjectType, id: number): string {
  const prefixes: Record<ObjectType, string> = {
    project:   'PROJ',
    milestone: 'MS',
    task:      'TASK',
    ticket:    'TKT',
    feature:   'FEAT',
    useCase:   'UC',
  };
  return `${prefixes[type]}-${id}`;
}
```

Diese Funktion soll von allen UI-Komponenten genutzt werden, kein Copy-Paste der Präfix-Logik.

---

## Aufgabe 2 – MCP Server: `resolve_reference`-Tool

### Neues Tool in `apps/mcp-server/src/tools.ts`

```
name: resolve_reference
title: Objekt per Referenz laden
description: Lädt ein beliebiges Domänenobjekt anhand seines Kurzbezeichners
             (z. B. "TASK-10", "FEAT-3", "PROJ-1"). Gibt das vollständige
             Objekt inklusive aller Felder zurück.

inputSchema:
  reference: string  // z. B. "TASK-10", case-insensitive

execute:
  1. reference.toUpperCase().trim()
  2. Regex-Match: /^(PROJ|MS|TASK|TKT|FEAT|UC)-(\d+)$/
  3. Fehler wenn kein Match: "Ungültige Referenz – erwartet z. B. TASK-10"
  4. id = parseInt(match[2])
  5. Switch auf Präfix → passenden GET-Endpunkt aufrufen:
       PROJ  → GET projects/:id
       MS    → GET milestones/:id
       TASK  → GET tasks/:id
       TKT   → GET tickets/:id
       FEAT  → GET features/:id
       UC    → GET use-cases/:id
  6. Objekt zurückgeben
```

### Beispiel-Implementierung (Orientierung für Codex)

```typescript
defineTool({
  name: 'resolve_reference',
  title: 'Objekt per Referenz laden',
  description:
    'Lädt ein Domänenobjekt anhand seines Kurzbezeichners (z. B. "TASK-10", "FEAT-3", "PROJ-1").',
  inputSchema: z.object({ reference: z.string().min(1) }),
  execute: async ({ reference }) => {
    const match = reference.toUpperCase().trim().match(/^(PROJ|MS|TASK|TKT|FEAT|UC)-(\d+)$/);
    if (!match) throw new Error(`Ungültige Referenz "${reference}" – erwartet z. B. TASK-10`);
    const id = parseInt(match[2], 10);
    const paths: Record<string, string> = {
      PROJ: `projects/${id}`,
      MS:   `milestones/${id}`,
      TASK: `tasks/${id}`,
      TKT:  `tickets/${id}`,
      FEAT: `features/${id}`,
      UC:   `use-cases/${id}`,
    };
    return client.get(paths[match[1]]);
  }
}),
```

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `apps/mcp-server/src/tools.ts` | `resolve_reference`-Tool hinzufügen |
| `apps/web/src/lib/references.ts` *(neu)* | Hilfsfunktion `objectReference()` |
| Komponenten Task-Card, Ticket-Card, Feature-Card usw. | Copy-Button einbauen |
| Detail-Header-Komponenten für alle Objekt-Typen | Copy-Button einbauen |

---

## Tests

- Unit-Test für `objectReference()`: alle sechs Typen prüfen
- Unit-Test für `resolve_reference`: gültige Referenzen (alle 6 Präfixe), Fehlerfall bei ungültigem Format
- Kein separater Integration-Test nötig – der API-Aufruf ist durch bestehende Tests der `get_*`-Tools abgedeckt
