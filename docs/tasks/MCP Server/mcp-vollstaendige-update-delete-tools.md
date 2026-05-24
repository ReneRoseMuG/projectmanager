# Codex-Auftrag: MCP Server – vollständige Update- und Delete-Tools

## Ziel

Alle Domänenobjekte des Projekt Managers müssen über den MCP Server vollständig editierbar sein – also alle Stammdatenfelder, Status, Beziehungen, Beschreibung und Content. Zusätzlich fehlen Delete-Tools für alle Objekte. Außerdem fehlen Create-Tools für Projekte und Meilensteine.

Der Auftrag betrifft ausschließlich `apps/mcp-server/src/tools.ts`. Die Backend-API liefert bereits alle nötigen Endpunkte.

---

## Analysebasis

### Bestehende Update-Tools im MCP Server (unvollständig)

| Tool | Deckt ab | Fehlt |
|---|---|---|
| `update_project_description` | `description` | `name`, `status`, `color`, `startDate`, `dueDate` |
| `update_milestone_description` | `description` | `name`, `status`, `color`, `startDate`, `dueDate` |
| `update_task_description` | `description` | `title`, `status`, `priority`, `assignee`, `dueDate` |
| `update_ticket_description` | `description` | `title`, `type`, `status`, `priority`, `assignee`, `reporter`, `environment`, `affectedVersion`, `dueDate`, `resolution` |
| `update_feature_content` | `description`, `content` | `title`, `status`, `sortOrder` |
| `update_use_case_content` | `description`, `content` | `title`, `status`, `sortOrder`, `featureId` |

### Fehlende Tools im MCP Server

- **Delete:** Kein einziges Delete-Tool für Projekt, Meilenstein, Task, Ticket, Feature, Use Case
- **Create:** `create_project` und `create_milestone` fehlen (alle anderen Objekte haben bereits Create-Tools)

### Backend-API (bereits vorhanden, muss nicht geändert werden)

| Objekt | Update-Endpunkt | Delete-Endpunkt |
|---|---|---|
| Projekt | `PATCH /api/projects/:id` | `DELETE /api/projects/:id` |
| Meilenstein | `PATCH /api/milestones/:id` | `DELETE /api/milestones/:id` |
| Task | `PATCH /api/tasks/:id` | `DELETE /api/tasks/:id` |
| Ticket | `PATCH /api/tickets/:id` | `DELETE /api/tickets/:id` |
| Feature | `PATCH /api/features/:id` | `DELETE /api/features/:id` |
| Use Case | `PATCH /api/use-cases/:id` | `DELETE /api/use-cases/:id` |

Alle PATCH-Endpunkte sind versionsgeschützt (`expectedVersion` im Body erforderlich).

---

## Aufgaben

### 1. Bestehende Update-Tools ersetzen

Die sechs bestehenden, unvollständigen Update-Tools werden durch vollständige Pendants ersetzt. Die alten Tool-Definitionen werden entfernt.

#### `update_project` (ersetzt `update_project_description`)

```
inputSchema:
  id: number (required)
  name?: string
  description?: string | null
  status?: string        // Katalogwert workStatus.key
  color?: string | null
  startDate?: string | null   // ISO-Date
  dueDate?: string | null

execute:
  GET projects/:id  →  version
  PATCH projects/:id  { name?, description?, status?, color?, startDate?, dueDate?, expectedVersion }
```

#### `update_milestone` (ersetzt `update_milestone_description`)

```
inputSchema:
  id: number (required)
  name?: string
  description?: string | null
  status?: string
  color?: string | null
  startDate?: string | null
  dueDate?: string | null

execute:
  GET milestones/:id  →  version
  PATCH milestones/:id  { ...fields, expectedVersion }
```

#### `update_task` (ersetzt `update_task_description`)

```
inputSchema:
  id: number (required)
  title?: string
  description?: string | null
  status?: string
  priority?: string
  assignee?: string | null
  dueDate?: string | null

execute:
  GET tasks/:id  →  version
  PATCH tasks/:id  { ...fields, expectedVersion }
```

#### `update_ticket` (ersetzt `update_ticket_description`)

```
inputSchema:
  id: number (required)
  title?: string
  type?: string
  description?: string | null
  status?: string
  priority?: string
  reporter?: string | null
  assignee?: string | null
  environment?: string | null
  affectedVersion?: string | null
  dueDate?: string | null
  resolution?: string | null

execute:
  GET tickets/:id  →  version
  PATCH tickets/:id  { ...fields, expectedVersion }
```

#### `update_feature` (ersetzt `update_feature_content`)

```
inputSchema:
  id: number (required)
  title?: string
  status?: string
  description?: string | null
  content?: string
  sortOrder?: number

execute:
  GET features/:id  →  version
  PATCH features/:id  { ...fields, expectedVersion }
```

#### `update_use_case` (ersetzt `update_use_case_content`)

```
inputSchema:
  id: number (required)
  title?: string
  status?: string
  description?: string | null
  content?: string
  sortOrder?: number
  featureId?: number    // Verschieben in ein anderes Feature

execute:
  GET use-cases/:id  →  version
  PATCH use-cases/:id  { ...fields, expectedVersion }
```

---

### 2. Delete-Tools hinzufügen

Sechs neue Tools, alle nach demselben Muster: `inputSchema: { id: number }`, execute: `DELETE <pfad>/:id`.

| Tool-Name | Endpunkt |
|---|---|
| `delete_project` | `DELETE projects/:id` |
| `delete_milestone` | `DELETE milestones/:id` |
| `delete_task` | `DELETE tasks/:id` |
| `delete_ticket` | `DELETE tickets/:id` |
| `delete_feature` | `DELETE features/:id` |
| `delete_use_case` | `DELETE use-cases/:id` |

Beschreibungen müssen auf die Destruktivität hinweisen (z. B. „Löscht das Projekt und alle zugehörigen Daten dauerhaft.").

---

### 3. Create-Tools für Projekt und Meilenstein hinzufügen

#### `create_project`

```
inputSchema:
  name: string (required)
  description?: string | null
  status?: string
  color?: string | null
  startDate?: string | null
  dueDate?: string | null

execute:
  POST projects  { name, description?, status?, color?, startDate?, dueDate? }
```

#### `create_milestone`

```
inputSchema:
  projectId: number (required)
  name: string (required)
  description?: string | null
  status?: string
  color?: string | null
  startDate?: string | null
  dueDate?: string | null

execute:
  POST projects/:projectId/milestones  { name, description?, status?, color?, startDate?, dueDate? }
```

---

## Implementierungshinweise

### Versionsschutz-Pattern

Alle Update-Tools nutzen das bereits etablierte Pattern aus `tools.ts`:

```typescript
async function updateVersioned<T extends { version: number }>(
  client: ProjectManagerApiClient,
  path: string,
  fields: Record<string, unknown>
): Promise<T> {
  const current = await client.get<T>(path);
  return client.patch<T>(path, { ...fields, expectedVersion: current.version });
}
```

Das bestehende `updateVersionedContent` kann als Vorlage dienen, muss aber verallgemeinert werden, damit alle Felder übergeben werden können (nicht nur `description` und `content`).

### Zod-Schemas

Alle optionalen Felder als `.optional()` oder `.nullable().optional()` definieren. Kein Feld darf required sein außer `id`. Beispiel für `update_task`:

```typescript
const updateTaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});
```

### Typen

Alle nötigen Typen sind bereits in `@taskmanager/shared-types` vorhanden:
- `ProjectUpdate`, `MilestoneUpdate`, `TaskUpdate`, `TicketUpdate`, `FeatureUpdate`, `UseCaseUpdate`

Diese Typen können in den `execute`-Funktionen als `satisfies`-Cast verwendet werden.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `apps/mcp-server/src/tools.ts` | Einzige Datei – Update-Tools ersetzen, Delete- und Create-Tools hinzufügen |

Backend und shared-types bleiben unverändert.

---

## Tests

Die bestehenden Tests in `tools.test.ts` und `tools.integration.test.ts` müssen auf die neuen Tool-Namen angepasst werden. Für jeden neuen Tool-Typ (update_*, delete_*, create_project, create_milestone) soll mindestens ein Happy-Path-Test ergänzt werden.
