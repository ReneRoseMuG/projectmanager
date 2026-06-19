# Log: Task-Relation Unlink (TKT-65)

**Datum:** 19.06.26  
**Uhrzeit:** 10:35:00  
**Schritt:** Fix — TKT-65 Auflösen/Verschieben von Relationen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

**TKT-65:** Aufgaben konnten aus dem Formular heraus nicht aus einem Meilenstein (oder anderen Owners) entfernt werden. `ParentContextField` zeigte die verknüpften Kontexte nur als read-only Badges.

**Fix:** `ParentContextField` bekommt eine optionale `onUnlink`-Prop. Ist sie gesetzt, erscheint bei jedem `direct`-Eintrag mit unlinkbarem Typ (project, milestone, feature, useCase, wikiPage) ein ×-Button. `inherited`-Einträge und die Typen `task`/`ticket` bekommen keinen Button (diese Links können nicht per `unlinkOwnerTask` aufgelöst werden).

**TaskForm** implementiert `handleUnlinkParent`:
- `unlinkOwnerTask(parent, taskId)` aufrufen
- `detail.reload()` + `onChanged?.()` zur Cache-Invalidierung
- Toast auf Erfolg/Fehler
- Der TypeScript-Narrowing `if (type === "task" || type === "ticket") return` macht den restlichen Typ zu `TaskOwner["type"]` — kein Cast nötig.

**„Verschieben"** erfolgt als zwei Schritte: Unlink aus Meilenstein A → Task erscheint im Projekt → dann aus dem Meilenstein B verknüpfen. Das entspricht dem bestehenden Workflow und braucht kein eigenes UI.

## Geänderte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ParentContextField.tsx` | geändert | `UNLINKABLE_PARENT_TYPES`, `onUnlink`-Prop, ×-Button für direct-Einträge, `X`-Icon-Import |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | `VisibleParentContext`-Import, `unlinkOwnerTask`-Import, `handleUnlinkParent`-Handler, `onUnlink`-Übergabe |
| `tests/unit/web/components/ui/ParentContextField.test.tsx` | geändert | 3 neue Tests: direct-Einträge/unlinkbare Typen, onUnlink-Callback, kein Button ohne Prop |

## Testergebnis

- 4/4 neue ParentContextField-Tests grün
- TaskForm-Tests: 20/22 grün (2 pre-existing Fehler: "PROJ-30"-Text und Layout — nicht durch diese Änderung verursacht)
- Gesamt-Baseline unverändert: 30 Pre-existing-Failures

## Vorhandene Pre-existing Failures (unverändert)

- `ParentContextField` "rendert Parent-Badges" — erwartet `getByText("PROJ-7")`, Komponente rendert Prefix und ID getrennt
- `TaskForm` "verdrahtet Body, Parent-Kontext..." — erwartet `toHaveTextContent("PROJ-30")`, gleiche Ursache
- `TaskForm` "Details-Tab Flex-Fill-Layout" — Layout-Klassen-Mismatch, unabhängig von TKT-65

## Offene Punkte / Folgeaufgaben

Keine weiteren TKT-65-bezogenen Tasks.
