---
name: code-discipline
description: Use before making implementation changes to preserve existing behavior, avoid speculative edits, inspect affected callers and UI wiring, and follow up tests in the Projekt Manager repository and similar codebases.
---

# Code Discipline

Use this skill before editing files for an implementation task. It is a preservation gate: understand the existing code, keep the requested scope tight, and verify that unchanged behavior remains intact.

## Position In The Workflow

- Run after planning guidance has established the allowed scope.
- Run before the first file edit.
- Apply alongside repository instructions such as `agents.md`.

## Principles

### Read Before Editing

Before changing a file, read the relevant current code:

- The whole component or module, not only the target line.
- Existing buttons, inputs, icons, conditional renders, and event handlers.
- Shared CSS classes, stylesheets, parent selectors, and layout dependencies.
- Service callers and assumptions about return values or side effects.

### Code Is Current Truth

When a background specification and working code disagree, treat the code as the current truth unless the user explicitly asks to align the code to the specification.

- Do not revert intentional working behavior just because old documentation differs.
- Mention code/spec mismatches as observations.
- Leave functioning behavior alone when it is outside the task.

### Think Through Effects

Before editing, identify likely direct and indirect effects:

- Which neighboring files or callers depend on this structure?
- Could a CSS change affect layout, overflow, or z-index elsewhere?
- Does a function signature or behavior change affect other call sites?
- Is a component embedded in parents that depend on its DOM shape?

Document complex impacts briefly in the work plan or update.

### Keep Scope Minimal

- Do not refactor adjacent code just because it could be cleaner.
- Do not rename, reorganize, or restyle unrelated code.
- If a side change is necessary, name what it is and why before making it.

## Preservation Checklist

For UI changes:

- Existing buttons, inputs, and interactive elements remain present and functional.
- Event handlers remain wired to the intended actions.
- Layout has no unintended overflow or overlapping components.
- Style changes are scoped to the intended area.

For logic or service changes:

- Existing callers still work with the signature and behavior.
- Previously valid states are still handled.
- No behavior needed elsewhere was removed.

For all changes:

- No change outside the explicit scope unless necessary and named.
- Existing tests that cover changed behavior are identified and updated when labels, props, signatures, or API contracts change.

## Projekt Manager Specific Checks

React and TanStack Query:

- Server-state fetching stays in TanStack Query hooks, not `useState` plus `useEffect`.
- Mutation invalidation goes through `src/queries/invalidation.ts`.
- Components receive normalized query errors via `toQueryError()`.
- Business logic stays in hooks, API modules, or services, not components.

UI components:

- Preserve established component patterns such as `ItemCard`, `FormModal`, and `ItemRow` where they already apply.
- Do not introduce inline German labels when a domain label source exists.
- Do not invent unrelated styling systems.

API and permissions:

- New or changed routes need an explicit permission decision.
- Frontend gating is only convenience; backend guards remain required.

