---
name: projekt-manager
description: Use for interactions with the Projekt Manager app and MCP objects such as projects, milestones, tasks, tickets, features, use cases, comments, notes, attachments, catalogs, and users.
---

# Projekt Manager

Use this skill for Projekt Manager app interactions through MCP.

## Technical Requirement

The local API must be running at `http://127.0.0.1:3001`. If MCP tools fail, tell the user the Projekt Manager app may need to be started.

## Object References

- Projects and milestones: `PROJ-<id>`, `MS-<id>`.
- Tasks and tickets: `TASK-<id>`, `TKT-<id>`.
- Features and use cases: `FEAT-<id>`, `UC-<id>`.

If a reference is ambiguous, ask briefly.

## Common Tools

Use the current Projekt Manager MCP tools when available. Expected tool families include:

- Projects and milestones: list, get, update project/milestone, create milestone.
- Tasks and tickets: list children for a parent, get, create, update, assign.
- Features and use cases: list, get, create, update, link to parent, attach tasks or tickets.
- Comments, notes, and attachments: add or inspect context where supported.
- Catalogs and users: list available catalogs or users.

The MCP server is authoritative. If a named tool is unavailable, inspect available tools or report the limitation.

## Reading Workflow

- For unknown project context, list projects first.
- For hierarchical queries, identify the parent first, then load children.
- Summarize long lists compactly with the fields useful for the decision at hand.

## Editing Workflow

When implementing or resolving a task, ticket, or milestone:

1. Complete the actual work first.
2. Set status to `pending` for the worked object when the relevant update tool exists.
3. Add a user-readable execution comment describing what was actually done.

For a parent object containing several tasks or tickets, comment on the parent with an overview of completed work and any branch/order decisions.

## HTML Rule

Projekt Manager rich text fields render HTML. Do not send Markdown to `description` or `text` fields.

Convert:

- `## Heading` -> `<h2>Heading</h2>`
- `### Heading` -> `<h3>Heading</h3>`
- `**bold**` -> `<strong>bold</strong>`
- Bullet lists -> `<ul><li>...</li></ul>`
- Numbered lists -> `<ol><li>...</li></ol>`
- Paragraphs -> `<p>...</p>`
- Mermaid -> `<pre class="mermaid">...</pre>`

Specialized Projekt Manager skills reuse this HTML rule.

