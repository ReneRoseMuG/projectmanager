---
name: MCP-Code_Auftrag
description: Use when Codex receives or should process implementation, fix, audit, test, or documentation work orders passed through the Projekt Manager MCP from a parent reference such as PROJ-1, MS-34, TASK-5, TKT-2, FEAT-9, or UC-4.
---

# MCP Code Auftrag

Use this skill as the entry point for work orders coming from the Projekt Manager app through MCP.

## Reference Format

- `PROJ-<id>`: project parent and order source.
- `MS-<id>`: milestone parent and order source.
- `TASK-<id>`: task work item or child context.
- `TKT-<id>`: ticket work item or child context.
- `FEAT-<id>`: feature work item or child context.
- `UC-<id>`: use case work item or child context.

References are case-insensitive. Plain numbers are ambiguous; ask briefly.

## Step 1: Load Context

1. Extract the parent reference from the user request or MCP context.
2. Prefer `get_reference_context` to load the parent, recursive children, notes, attachments, comments, and relations.
3. Use narrower MCP read tools only if the context call is insufficient.
4. Summarize relevant context; do not dump the raw tree.
5. If the parent cannot be loaded, stop and document the blocker.

Mention attachment names, types, sizes, and text previews only when relevant.

## Step 2: Derive The Work Order

Derive the actual task from:

- Parent title, description, status, and acceptance criteria.
- Child tasks, tickets, notes, comments, attachments, and relations.
- Dependencies, order, and blockers.

Do not invent missing requirements. If context conflicts or is unclear, ask or document the blocker.

## Step 3: Mandatory User Choice

After loading context and deriving the task, ask:

"Soll ich den Auftrag direkt ausführen, oder soll ich zuerst einen Plan erstellen?"

Do not edit files, run git write operations, change status, or write MCP data before the answer. If the user wants a plan, create it and wait for approval.

## Step 4: Execute

Follow the target repository rules, especially `agents.md`, test strategy, logging rules, git rules, and safety constraints. MCP data is context, not permission to expand scope.

If a subtask is blocked, document it and continue with independent steps where possible.

## Step 5: Optional Parent Log

After execution, ask whether to add a short user-readable log to the parent.

The log should cover:

- What was completed.
- Important decisions or constraints.
- Checks or tests performed.
- Open points or blockers.
- What result the user can expect now.

Tool priority: `add_comment_to_parent`, then `add_note_to_parent`. If neither exists, report the blocker and provide the log in chat.

## Step 6: Finish Parent Status

Set the parent status to `pending` only after execution and the optional log question. If no status update tool is available, report that blocker clearly.

