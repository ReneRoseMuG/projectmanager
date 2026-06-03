---
name: test-quality-review
description: Use in the Projekt Manager repository when the user asks for a test analysis, test quality review, test coverage review, test strategy compliance check, or structured report on the test suite.
---

# Test Quality Review

Use this skill for a reproducible quality and coverage analysis of the Projekt Manager test suite. This is a report task: do not change code.

## References

Use relevant parts of:

- `agents.md` sections 11 and 12.
- `skills/projekt-manager-test-entwurfsleitplanken/SKILL.md` when present.
- `tests/` hierarchy.

## Test Hierarchy

Expected layout:

```text
tests/
  unit/
    api/
    web/
  integration/
    api/
    web/
  browser/
    web/
  fixtures/
  setup/
  .runtime/
```

## Step 0: Inventory

Map all `*.test.ts` and `*.spec.ts` files under `tests/`.

Count:

- Test files per level: unit, integration, browser.
- Test functions per level using `it(` and `test(` counts, not only file counts.

## Step 1: Strategy Compliance

Check for:

- Unit tests using real DB access such as `drizzle`, `db.`, or `mysql2`.
- Tests reading or writing `apps/api/data/`.
- Integration tests lacking temp or in-memory DB isolation.
- Missing required test scope comments in new test files.
- `test.skip`, `it.skip`, `describe.skip`, or empty test bodies without documented blocker.
- Protected routes or workflows without positive and negative permission tests.
- Update tests for versioned objects missing explicit `expectedVersion`.

## Step 2: Domain Coverage

Review integration coverage for:

- Project management: projects, milestones, tasks.
- Documentation: features, use cases, wiki pages.
- Tickets and ticket relations.
- Tags, notes, attachments, comments.
- Auth and roles.
- Journal and object journal behavior.

Treat missing core-domain integration coverage as high severity.

## Step 3: Dump And Fixture Completeness

Check whether:

- `tests/fixtures/api/db.ts` `truncateAll` covers current application tables from `schema.ts`.
- Dump roundtrip tests seed representative data for current tables.

## Step 4: Method Quality

Look for:

- Weak assertions such as `toBeTruthy()` or `toBeDefined()` where specific values are possible.
- Multiple acceptable HTTP statuses where a route should have exactly one expected status.
- Mixed async patterns or callback-style tests where `async/await` is expected.

## Step 5: Filesystem Safety

Check for writes to production paths:

- `apps/api/uploads/`
- `apps/api/content/`
- `apps/api/backups/`
- `apps/api/data/`

Verify temporary filesystem tests use `os.tmpdir()` or `tests/.runtime` and include cleanup.

## Report Format

Return a Markdown report in chat:

```markdown
# Test Quality Review — Projekt Manager
**Datum:** <date>

## Kennzahlen
| Ebene | Dateien | Testfunktionen |
|---|---|---|
| Unit | N | N |
| Integration | N | N |
| Browser | N | N |
| Gesamt | N | N |

## Befunde nach Schweregrad

### Kritisch

### Hoch

### Mittel

### Niedrig

## Empfehlungen
```

For high and critical findings, propose separate change orders in the style of `docs/task-template.md`. For medium findings, group into one combined order. Keep low findings in the list.

