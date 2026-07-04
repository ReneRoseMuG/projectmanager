# Audit: Backend-Datenzugriffe — Skalierbarkeit & N+1

**Datum:** 04.07.26
**Auslöser:** Wiederkehrende HTTP-500 unter realer Last (DMS-Dokumente ab ~7 Datensätzen); Auftrag „gesamte App schnell und skalierbar laden".
**Methode:** Fünf parallele Read-only-Audits über den kompletten Datenzugriffs-Layer (40 Services, 26 Repositories, 31 Routes), kalibriert auf den realen Pool (`connectionLimit 10`, `queueLimit 50` → HTTP 500 ab ~60 gleichzeitigen Queries/Anfrage) und Datenmengen bis in die Tausende.

## Gemeinsames Muster

Jeder kritische Fund hat dieselbe Signatur: **eine HTTP-Anfrage feuert eine mit der Datenmenge wachsende Zahl gleichzeitiger Queries** (N+1 via `Promise.all(rows.map(...))` / `for-await`, oder komplette Tabellenladung mit In-Memory-Filterung/Sortierung). Fixe Lösungsvorlagen existieren bereits im Code: `getUserOptionsMap`, `inArray`-Bündelung, `getWikiTree`-Aggregation, `mapTicketListRows`.

## Fortschritt (Stand 04.07.26)

- [x] Cluster B — DMS / Anhänge — **erledigt** (`listDocumentLibrary` + `listAttachmentOwnersForIds` gebündelt, 1+N×9 → konstant 5)
- [x] Cluster A — Rekursiver project-context Fan-out — **vollständig erledigt**: Kandidatenlisten via `buildTaskProjectContextMap`/`buildTicketProjectContextMap` (mengengleich zur Rekursion); `getProjectContextTree` jetzt vollständig gebündelt (flaches Laden + In-Memory-Baumaufbau, Query-Zahl nur noch von Baumtiefe abhängig, deterministische Dedup-Regel statt zufälliger DB-Reihenfolge).
- [x] Cluster C — **vollständig erledigt**: recent-comments pro Typ `ORDER BY … LIMIT`; Dashboard-Stats `tasks`/`tickets` mappen nur noch die ≤limit ausgewählten Einträge voll (Zählungen/Auswahl identisch, eindeutiger id-Tiebreaker).
- [x] Cluster D — Notification-Scheduler — **erledigt** (Recipients + wasSent + Subscriptions gebündelt, Batch-Insert; Doppelversand-Schutz via `.ignore()` erhalten)
- [x] Cluster E — `getUserOption`-Fluten — **erledigt** (features, use-cases, backlog, doc-links, day-plan, admin-users → `getUserOptionsMap`/Batch)
- [x] Prio 4 — Pagination-Querschnitt (Backend + Frontend) — **umgesetzt** (Seitenzahlen, opt-in über `page`)

## Pagination (Prio 4) — Umsetzung

**Fundament:** `Paginated<T>` (shared-types), `paginationQuerySchema`+`paginatedResponseSchema` (route-schemas), UI-Komponente `components/ui/Pagination.tsx` (blendet sich bei ≤1 Seite aus), State-Hook `usePagination`. Opt-in: ohne `page`-Query weiterhin nacktes Array (MCP-Server/interne Nutzer unberührt), mit `page` → `Paginated<T>`. Filter/Suche wandern serverseitig; echte SQL-Pagination (`WHERE`+`ORDER BY`+`LIMIT/OFFSET`+`COUNT(*)`) wo möglich.

**Voll umgesetzt (Backend + Frontend, Seitenzahlen sichtbar):** Dokumente (DMS), Notizen, Projekte, Features, Meilensteine — flache Listen bzw. Board-Listen mit serverseitigem Status-/Suchfilter + Pagination.

**Backend paginierbar, UI bleibt Board:** Aufgaben und Backlog sind Kanban-/Board-Ansichten; das Backend ist opt-in-paginierbar, die Board-UI wurde bewusst nicht auf Seitenzahlen umgestellt (Seiten würden die Kanban-Spalten zerschneiden).

**Verbleibende Design-Frage (Board + Seitenzahlen):** Projekte/Meilensteine/Features/Tickets haben ViewToggle (Liste ↔ Kanban). Im Kanban-Modus zeigt die paginierte Seite nur den aktuellen Ausschnitt über die Statusspalten — funktional und serverseitig gefiltert, aber konzeptionell eigenwillig. Saubere Option für später: Pagination nur im Listen-Modus, Kanban ungeschnitten (dann aber Kanban-Virtualisierung nötig).

**Chip-Counts:** Status-Filter-Chip-Gesamtzahlen laufen weiter über die volle Liste (unverändertes Verhalten) — für vollständige Skalierbarkeit wären serverseitige `GROUP BY`-Counts ein Folgeschritt.

**Verifikation:** Typecheck API + Web grün. Keine Testläufe (auf Wunsch).

**Verifikation:** TypeScript-Typecheck der gesamten API grün. Keine Testläufe (auf Wunsch). DTO-Identität je Änderung durch Umsetzungsnotizen belegt.

**Kleinere Folgepunkte:** (a) `getProjectContextTree` vollständig aus flachen `inArray`-Listen zusammensetzen (deterministische Dedup-Regel); (b) Dashboard-Stats mit Sichtbarkeits-SQL; (c) `day-plan` Event-Owner-Batchloader ist bewusst dupliziert (events.service.ts war gesperrt) → zentralisieren; (d) `roleRepository.findByIds` als Helfer ergänzen (admin-users lädt Rollen aktuell inline).

---

## Cluster A — Rekursiver `project-context`-Fan-out (KRITISCH)

Rekursiver Kontextaufbau in `Promise.all`-Schleifen über *alle* Tasks/Tickets.

| Ort | Funktion | Endpunkt | Multiplikator |
|---|---|---|---|
| tasks.service.ts:625 | `listTaskLinkCandidates` | GET Task-Link-Kandidaten | 1 + N (alle Tasks) parallel |
| tickets.service.ts:700 | `listTicketLinkCandidates` | Ticket-Link-Kandidaten | N × rekursiver Kontext |
| tickets.service.ts:1246 | `listTicketRelationCandidates` | Relations-Kandidaten | N × Kontext + Relationstraversal |
| project-context.service.ts:152 | `ticketProjectContext` (rekursiv) | Baustein | Dutzende–Hunderte Q/Ticket |
| project-context.service.ts:86 | `taskProjectContext` (rekursiv) | Baustein | 5 Q/Task rekursiv |
| project-context-tree.service.ts:170 | `getProjectContextTree` | Projekt-Kontextbaum | 1 Q pro Baumknoten |

**Fix:** Kandidaten-Kontexte gebündelt per `inArray`/Batch-Map vorladen statt pro Element rekursiv; Kontextbaum aus flachen `inArray`-Listen in-memory zusammensetzen; Kandidatenzahl serverseitig begrenzen.

## Cluster B — DMS / Anhänge (KRITISCH — akuter 500)

| Ort | Funktion | Endpunkt | Multiplikator |
|---|---|---|---|
| document.service.ts:92 | `listDocumentLibrary` / `mapDocument` | GET /documents | 1 + N×9 (45.001 bei 5.000; 500 ab ~7) |
| attachments.service.ts:231 | `listAttachmentOwners` | /documents, /documents/:id, alle Owner-Listen | 6 sequenziell pro Anhang |
| attachments.service.ts:665 | `listRecentAttachments` | „Zuletzt verwendet" | 12 Q konstant, aber kein LIMIT |
| attachments.service.ts:844 | `deleteAttachment` | DELETE /documents/:id | 6 + M (Owner) |

**Fix:** `listAttachmentOwnersForIds(ids)` (6 Queries gesamt statt 6×N); gebündelte `load*ForIds`-Maps in `listDocumentLibrary`; „Recent" per `ORDER BY … LIMIT` in SQL.

## Cluster C — „Zuletzt/Dashboard"-Widgets ohne SQL-LIMIT (KRITISCH)

| Ort | Funktion | Endpunkt | Muster |
|---|---|---|---|
| comments.service.ts:765 | `listRecentComments` / `recentAllCommentRows` | GET /comments/recent | Alle Kommentare aller 9 Entitätstypen, Sort+Slice in JS |
| tasks.service.ts:712 | `getTaskStats`/`listRecentTasks`/`listOverdueTasks` | Dashboard-Widgets | komplette Task-Tabelle je Refresh |
| tickets.service.ts:746 | `getTicketStats`/`listRecentTickets` | Dashboard | alle Tickets voll gemappt für Count/Sort |

**Fix:** `ORDER BY … LIMIT` bzw. `GROUP BY … COUNT(*)` in SQL statt Vollladung + JS-Aggregation.

## Cluster D — Notification-Scheduler (KRITISCH)

| Ort | Funktion | Multiplikator |
|---|---|---|
| notification.service.ts:47 | `listNotificationRecipients` | 1 + 2×User pro Tick, 2× je Tick |
| notification.service.ts:110 / push-notification.service.ts:108 | Versand-Doppelschleife | Events × Empfänger Einzelqueries + Inserts |

**Fix:** Rollen/Permissions + Subscriptions + gesendete Kombinationen einmal per `inArray` laden; Inserts als Batch.

## Cluster E — `getUserOption`-Fluten in Listen (HOCH)

`getUserOption` pro Zeile statt `getUserOptionsMap` (existiert bereits):

| Ort | Funktion | Endpunkt |
|---|---|---|
| features.service.ts:209 | `listFeatures` → `mapFeature` | GET /features |
| use-cases.service.ts:193 | `listUseCases` → `mapUseCase` | GET /features/:id/use-cases |
| backlog.service.ts:186 | `listBacklogItems` | GET /projects/:id/backlog |
| day-plan.service.ts:75 | `mapDayPlan` | GET /day-plans |
| day-plan.service.ts:251 | `listDayPlanEventsForUser` | Persönliche Planung |
| doc-links.service.ts:26 | `mapFeature` | Feature-Listen/-Relationen |
| users.service.ts:91 | `listAdminUsers` | GET /admin/users |

**Fix:** `getUserOptionsMap` / gebündelte Owner-Maps einmalig vor dem Mapping; Events per `inArray`.

## Weitere Funde (MITTEL/NIEDRIG)

- tickets.service.ts:280 `collectTicketSubtreeIds` — Vollscan aller Tickets je Delete (CTE/`inArray`).
- comments.service.ts:434 `collectTaskDescendantIds` — 1 Q pro Baum-Tiefe (rekursive CTE).
- journal.repository.ts:136 — `LIKE %x%` Full-Scan (FULLTEXT-Index).
- wiki.service.ts:771 `resolveContentImages` / :319 `childCount` — pro Bild/Seite eine Query (Export/Liste, `inArray`).
- wiki-import.service.ts:1129 — Einzel-Lookups je Element (seriell, in Transaktion — pool-schonend).
- events.service.ts:64 `mapEvent` — 5 Q pro Event (zeitfenster-begrenzt).
- settings/roles/catalogs — In-Memory-Filter auf fixen kleinen Mengen (unkritisch).

## Sauber / Referenzmuster

projects (`getProjectCounts`), dashboard, tags (`get*TagsMap`), users (`getUserOptionsMap`), `getWikiTree`, `mapTicketListRows`, `listCommentOwnersForMany`, alle Repositories mit `inArray`.

## Prio 4 — Pagination (Querschnitt, Frontend betroffen)

Keine Listen-Route hat Pagination: `/projects`, `/tasks`, `/tickets`, `/notes`, `/features`, `/use-cases`, `/milestones`, `/wiki`, `/admin/users`, `/documents`. Struktureller Umbau (API-Vertrag + Frontend, inkl. Virtualisierung großer Listen) — separater Vorschlag.
