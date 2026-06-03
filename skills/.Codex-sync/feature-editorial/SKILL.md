---
name: feature-editorial
description: Use in the Projekt Manager repository when the user asks to rewrite, document, or prepare a feature from the user's perspective, including FEAT-N feature descriptions and optional use cases.
---

# Feature Editorial

Use this skill to create a clear, user-facing feature description. The target reader is a product owner or domain stakeholder, not a developer.

## Trigger Examples

Use when the user asks for:

- "Feature überarbeiten"
- "redaktionell aufbereiten"
- "aus Anwendersicht beschreiben"
- "erstelle Use Cases"
- "bereite FEAT-35 auf"

## Source

1. If a feature ID such as `FEAT-35` is provided, load the feature through the Projekt Manager MCP tool if available.
2. If the user gives a name or description in chat, use that as source material.
3. If the target feature is unclear, ask a short clarification question.

Read relevant code or docs only when needed to infer domain rules, affected objects, or dependencies.

## Content To Derive

Before writing, identify:

- Purpose and benefit: what the user can do and which problem is solved.
- Domain rules: required fields, roles, status transitions, validations, or constraints.
- Affected business objects: use domain names, not table names.
- Related features and dependencies.

## Feature Description Structure

Use this structure. Replace the first heading with a meaningful domain heading.

```markdown
## [Meaningful Heading]

### Ziel / Zweck
1-3 sentences about what the user can do and why it matters.

### Fachliche Beschreibung
User-facing description of typical actions, states, and outcomes.

### Regeln & Randbedingungen
- Clear rule.
- Clear rule.

## Architektur & Kontext

### Betroffene Objekte
Business objects with short role descriptions.

### Verwandte Features & Abhängigkeiten
Related features with short relationship notes.
```

Use Mermaid only when it adds real value.

## Optional Use Cases

When use cases are requested, use:

```markdown
### UC-[Number]: [Title]

**Akteur:** [Role]
**Ziel:** [Goal]

**Vorbedingungen:**
- [Condition]

**Ablauf:**
1. [Step]
2. [Step]

**Alternativen / Sonderfälle:**
- [Alternative]

**Ergebnis:**
[Result]
```

## Output Rules

Project Manager rich text fields are HTML. If writing back through MCP, convert Markdown to HTML:

- `## Heading` -> `<h2>Heading</h2>`
- `### Heading` -> `<h3>Heading</h3>`
- `**bold**` -> `<strong>bold</strong>`
- Lists -> `<ul><li>...</li></ul>` or `<ol><li>...</li></ol>`
- Paragraphs -> `<p>...</p>`
- Mermaid -> `<pre class="mermaid">...</pre>`

If a feature ID is known, the Project Manager is the output target. If no ID is known, ask whether to create/update a Project Manager feature or provide the draft in chat.

## Style

- Write actively and clearly.
- Avoid technical jargon unless the user asks for it.
- Prefer domain language and short rules.
- Keep implementation details out of the user-facing feature text.

