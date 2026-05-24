# Codex-Auftrag: HTML-Encoding in Ticket-Beschreibungen via MCP beheben

## Kontext

Ticket-Beschreibungen, die über das MCP-Tool `add_ticket_to_parent` mit HTML-Inhalt
(`<p>...</p>`, `<strong>...</strong>` etc.) übergeben werden, werden im Projekt Manager
als Rohtext angezeigt — die HTML-Tags sind im Beschreibungsfeld sichtbar statt gerendert.

Beschreibungen, die ein Benutzer direkt im Browser über den TipTap-Editor eingibt,
werden korrekt als formatierter HTML-Inhalt gespeichert und angezeigt.

## Betroffene Dateien / Komponenten

- `apps/mcp-server/src/api-client.ts` — sendet Request-Body als `JSON.stringify(body)`
- `apps/mcp-server/src/tool-result.ts` — gibt API-Response als `JSON.stringify(value)` zurück
- `apps/api/src/repositories/ticket.repository.ts` — speichert `description` via `cleanNullable()`
- `apps/api/src/app.ts` — Fastify-Setup (keine bekannte HTML-Sanitizer-Middleware)

## Diagnose-Schritte für Codex

### Schritt 1: Ist-Zustand in der Datenbank prüfen

```bash
# Nach einem MCP-Ticket-Anlage: den tatsächlich gespeicherten Wert lesen
sqlite3 "<db-pfad>" "SELECT id, substr(description,1,80) FROM tickets ORDER BY id DESC LIMIT 3;"
```

**Erwartung A (gesund):** `<p>text</p>` — HTML raw gespeichert  
**Erwartung B (Problem):** `&lt;p&gt;text&lt;/p&gt;` — HTML-Entities gespeichert

### Schritt 2: Je nach Ergebnis

**Falls B (Entities in DB):**
- Fastify serialisiert den Request-Body mit einem Security-JSON-Serializer,
  der `<` → `&lt;` konvertiert.
- Prüfen: `@fastify/formbody`, `@fastify/sensible`, oder ein benutzerdefiniertes
  Prehandler-Hook in `apps/api/src/app.ts`.
- Fix: Entweder den Sanitizer deaktivieren für API-Key-gesicherte Routen,
  oder den MCP-Client anpassen, den HTML-Inhalt vor dem Senden zu dekodieren.

**Falls A (raw HTML in DB, Rendering-Problem im Frontend):**
- Das Problem liegt im React-Rendering.
- Prüfen: `RichTextInlineField` → `hasVisibleHtmlContent(value)` liefert für
  stored raw HTML `true`, und `dangerouslySetInnerHTML` rendert es korrekt.
- Prüfen: Gibt es eine zusätzliche Render-Schicht (z.B. ein Panel mit `<p>{description}</p>`
  statt `dangerouslySetInnerHTML`) die den Beschreibungstext rendert?
- Kandidat: `ProjectTicketPanel.tsx` oder andere Panels, die Ticket-Beschreibungen
  als Plain-Text darstellen.

### Schritt 3: Fix implementieren

Je nach Ursache aus Schritt 2:

**Option A (Backend-Sanitizer):**
```typescript
// In app.ts oder dem betroffenen Plugin: Sanitizer nur für Browser-Sessions aktivieren,
// nicht für API-Key-authentifizierte Requests.
// Alternativ: Im MCP api-client.ts sicherstellen, dass keine HTML-Entities im Body sind.
```

**Option B (Frontend-Rendering):**
```typescript
// Jede Stelle, die ticket.description als Plain-Text rendert:
// <p>{ticket.description}</p>  ← FALSCH für HTML-Inhalt

// Ersetzen durch:
<div dangerouslySetInnerHTML={{ __html: ticket.description ?? "" }} />
// oder besser: <RichTextInlineField value={ticket.description} readOnly />
```

## Akzeptanzkriterien

- [ ] Ticket-Beschreibung mit HTML via MCP-Tool anlegen → App zeigt formatierten Text,
      keine sichtbaren HTML-Tags
- [ ] Ticket-Beschreibung im Browser-Editor eingeben → Verhalten unverändert korrekt
- [ ] Direktabfrage der SQLite-DB: `description` enthält `<p>` nicht `&lt;p&gt;`
- [ ] Kein Regressionstest schlägt fehl
- [ ] Mindestens ein neuer Integrationstest: MCP-Eingabe mit HTML → API-Response enthält
      raw HTML, kein double-encoding

## Bekannte Nicht-Ursachen (bereits untersucht)

- `cleanNullable()` in `ticket.repository.ts`: nur `trim()`, kein Encoding ✅
- `JSON.stringify()` in `api-client.ts`: kein HTML-Escaping in Node.js ✅
- `json-result.ts`: kein Encoding ✅
- `wiki-import.service.ts`: `escapeHtml()` dort ist isoliert und nicht im Ticket-Pfad ✅
