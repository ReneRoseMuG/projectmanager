---
name: projekt-manager-planungsleitplanken
description: Use when Codex creates, reviews, updates, or executes any plan for the Projekt Manager repository, including fixes, features, audits, tests, migrations, API/Web changes, UI work, branch strategy, permissions, and acceptance criteria.
---

# Projekt Manager Planungsleitplanken

Use this skill as the planning gate for the Projekt Manager repository. `agents.md` is the binding source of truth. If this skill and `agents.md` disagree, follow `agents.md` and mention the mismatch.

## Required Planning Flow

1. Classify the request using `agents.md` classes 1-5.
2. Check branch and dirty working tree when changes are possible.
3. Read only the repo sections needed for the request, expanding context only when needed.
4. Identify affected domains, layers, files, APIs, data model, frontend state, tests, logs, and acceptance criteria.
5. Decide explicitly whether auth, roles, permissions, migrations, dumps, fixtures, and UI rules are affected.
6. State assumptions and blockers instead of silently making architecture, product, or scope decisions.
7. Keep the plan proportional to the request class, while never omitting relevant security, tests, data migration, or UI implications.

## Reference Selection

Read only what is relevant:

- `agents.md`: always known and binding.
- `skills/projekt-manager-planungsleitplanken/references/plan-checklist.md`: for feature, fix, refactor, audit, or test planning when present.
- `skills/projekt-manager-planungsleitplanken/references/architecture.md`: domain, layer, schema, shared type, dump, repository, or service decisions.
- `skills/projekt-manager-planungsleitplanken/references/auth-roles.md`: API, web workflow, navigation, admin, permission, or protected data.
- `skills/projekt-manager-planungsleitplanken/references/testing.md`: test plans, fixtures, E2E, runtime, or acceptance evidence.
- `skills/projekt-manager-planungsleitplanken/references/git-workflow.md`: branch, save, savetowork, merge, push, cleanup.
- `skills/projekt-manager-planungsleitplanken/references/ui-guidelines.md` and `docs/design-leitfaden.md`: frontend layout, visuals, dashboards, forms, styling, menus, and interactions.
- `docs/architektur-leitfaden.md`: only for deeper architecture work.

## Planning Questions

Before proposing a plan, answer:

- Which domain is affected: project management, documentation, tickets, or cross-cutting infrastructure?
- Is it a business entity, editable support object, admin configuration, or infrastructure?
- Which routes, services, repositories, shared types, migrations, web APIs, hooks, components, and pages are affected?
- Does the change require auth, roles, permissions, UI gating, or admin behavior?
- Does it touch UI visuals, layout, styling, dashboards, forms, or interactions?
- Is a DB migration, dump registry update, truncate fixture update, or seed change needed?
- Are query keys, invalidation, TanStack hooks, or E2E setup affected?
- What remains intentionally unchanged?
- What can break, and how is the risk bounded?

## Plan Output

Use German for user-facing plans in this repository.

For a small local fix, include: what is planned, affected files and why, expected result and risks.

For a multi-layer change or new feature, include: what is planned, affected functions/components/files and why, workflow impacts, risks and damage potential, expected result and acceptance evidence.

Avoid vague statements such as "add tests" or "update UI"; name test levels and observable behavior.

## Hard Stops

Stop and document a blocker when:

- The scope contradicts `agents.md`.
- A required architecture decision is unspecified and no safe local convention exists.
- The plan would remove or overwrite unrelated user changes.
- A required task file or schema source is missing and all dependent work needs it.

