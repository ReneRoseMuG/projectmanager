---
name: projekt-manager-test-entwurfsleitplanken
description: Use in the Projekt Manager repository whenever tests are planned, written, changed, reviewed, or run, including test coverage, integration tests, E2E, fixtures, real data, database isolation, permissions, and acceptance criteria.
---

# Projekt Manager Test Entwurfsleitplanken

Use this skill before designing, writing, changing, evaluating, or running tests. It complements the planning skill; `agents.md` remains binding.

## Core Principle

A test must prove real behavior. It should build a real initial state, perform a real action, assert an observable result, include meaningful negative or counterexamples, avoid production data and paths, and honestly name its test level.

## Required Test Design Flow

1. Choose the test level: Unit, Integration, or Browser/E2E.
2. State the behavior in one sentence: initial state -> action -> expected result.
3. Identify the real objects and data needed for the proof.
4. Decide and justify mocks.
5. Choose isolation: temp DB, in-memory DB, `tests/.runtime`, or temp root.
6. Name positive cases, negative cases, permission cases, conflict cases, and edge cases.
7. Reject or sharpen tests that only check visibility or implementation details.

## Mock Rules

Unit tests may mock external side effects, bounded collaborators, time, randomness, network, and rare error paths. Do not mock impossible system states.

Integration tests should use real objects, data, services, repositories, DB clients, auth hooks, and API responses. If a mock is unavoidable, document why it is not a true integration test.

Browser/E2E tests use real browser interaction, real routes, real API responses from an isolated test instance, and real test data. Do not stub UI hooks, API clients, or permissions.

## Data And Filesystem Isolation

Database:

- Never use `apps/api/data/` or production SQLite files.
- Use temp DB, in-memory DB, or `tests/.runtime`.
- Initialize schema or migrations consistently with product code.
- Clean up reliably before or after tests.
- Include counterexample data, not only positive matches.

Filesystem:

- Use a unique temp root per test or suite.
- Never write to `apps/api/uploads/`, `apps/api/content/`, `apps/api/backups/`, or `apps/api/data/`.
- Test files, directories, collisions, and delete paths for real when relevant.
- Clean up robustly.

## Assertion Quality

Prefer specific assertions:

- HTTP status plus standard error format.
- Persisted DB state.
- Created, changed, or deleted files in a temp root.
- Role and permission effects with real users and sessions.
- Version conflicts using current and stale versions.

Avoid weak assertions such as only `toBeTruthy()`, only mock calls, snapshots without domain meaning, or permission tests with stubbed auth.

## Data-Driven Tests

Filters, searches, sorting, permission boundaries, and status logic need:

- Records that must be included.
- Records that must be excluded.
- Edge cases such as empty results, other statuses, other roles, or other owners.
- Assertion on the complete result set when feasible.

## Auth, Roles, And Permissions

Protected workflows need real permission data:

- Allowed access with the required permission.
- Rejected access without sufficient permission.
- For write operations, a reader or custom-role negative case.
- For UI flows, actions are hidden or server-side `FORBIDDEN` is handled.

Frontend gating never replaces API checks.

## Required Test File Comment

New test files include a scope comment with:

- Test Scope.
- Test-Ebene.
- Realitätsgrad.
- Mock-Entscheidung.
- Isolation.
- Abgedeckte Regeln.
- Fehlerfälle.
- Ziel.

If these points cannot be answered, do not invent coverage; document the blocker.

