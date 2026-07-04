# Log: Backend-Datenzugriffe — Skalierungs-Audit + Fixes (Cluster A–E)

**Datum:** 04.07.26
**Uhrzeit:** 11:40:56
**Schritt:** Feature/Fix — systematische Behebung von N+1-/Pool-Sprengern im gesamten Backend-Datenzugriff
**Status:** ⚠️ Teilweise abgeschlossen (5 Cluster behoben; 3 begründete Folgepunkte offen)

## Was wurde umgesetzt

Ausgelöst durch wiederkehrende HTTP-500 unter realer Last (DMS-Dokumente ab ~7 Datensätzen) wurde der komplette Datenzugriffs-Layer (40 Services, 26 Repositories, 31 Routes) per fünf paralleler Read-only-Audits systematisch auf N+1, unbegrenzte `Promise.all`-Fluten, fehlende Pagination und In-Memory-Filterung geprüft. Befund: ~11 kritische Funde in 5 wiederkehrenden Mustern; Lösungsvorlagen (`getUserOptionsMap`, `inArray`-Bündelung) existieren bereits im Code. Der Befund liegt als `docs/audit-datenzugriffe.md` vor.

Anschließend wurden die Cluster über disjunkte Dateien parallel umgesetzt und zentral per TypeScript-Typecheck (grün) plus Diff-Review abgesichert. Kern jeder Änderung: WIE Daten geladen werden (gebündelt), nicht WAS zurückkommt — DTOs bleiben identisch.

- **Cluster B (DMS):** `listAttachmentOwnersForIds` + gebündelte `load*ForIds`-Maps; `listDocumentLibrary` von 1+N×9 auf konstant 5 Queries. Behebt den akuten 500.
- **Cluster E (`getUserOption`-Fluten):** features, use-cases, backlog, doc-links, day-plan, admin-users nutzen `getUserOptionsMap`/gebündelte Owner-/Rollen-Maps statt Query-pro-Zeile.
- **Cluster C (recent-comments):** pro Entitätstyp `ORDER BY … LIMIT` statt Vollladung aller Kommentare + JS-Sort.
- **Cluster D (Notification-Scheduler):** Recipients (Rollen+Permissions), „bereits gesendet"-Prüfung und Push-Subscriptions gebündelt; Batch-Insert; Doppelversand-Schutz via `.ignore()` erhalten.
- **Cluster A (Kandidatenlisten):** `buildTaskProjectContextMap`/`buildTicketProjectContextMap` lösen den Projektkontext aller Kandidaten gebündelt auf (BFS + `inArray`), mengengleich zur bisherigen Rekursion; der Kontext ist reines Filterprädikat (kein DTO).

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/audit-datenzugriffe.md` | neu | Befundbericht + Fortschritt |
| `apps/api/src/services/document.service.ts` | geändert | gebündelte Batch-Loader, `buildDocument` |
| `apps/api/src/services/attachments.service.ts` | geändert | `listAttachmentOwnersForIds` |
| `apps/api/src/services/features.service.ts`, `use-cases.service.ts`, `backlog.service.ts`, `doc-links.service.ts`, `day-plan.service.ts`, `users.service.ts` | geändert | `getUserOptionsMap`/Batch statt Query-pro-Zeile |
| `apps/api/src/services/comments.service.ts` | geändert | recent-comments SQL-`LIMIT` je Typ |
| `apps/api/src/services/notification.service.ts`, `push-notification.service.ts` | geändert | Scheduler gebündelt + Batch-Insert |
| `apps/api/src/repositories/notification.repository.ts`, `push-subscription.repository.ts` | geändert | `findSentKeys`, `recordSentMany`, `findByUsers` |
| `apps/api/src/services/project-context.service.ts` | geändert | Batch-Kontext-Builder |
| `apps/api/src/services/tasks.service.ts`, `tickets.service.ts` | geändert | Kandidatenlisten nutzen Batch-Builder |
| `apps/api/src/services/project-context-tree.service.ts` | geändert | Nebenläufigkeit gedeckelt (Sofortschutz) |

## Probleme und Abweichungen

- **`getProjectContextTree`:** nur Sofortschutz (Nebenläufigkeit auf 5 gedeckelt), keine vollständige Bündelung — ein flacher Batch-Umbau ist wegen einer reihenfolge-abhängigen Dedup-Regel bei mehrfach verknüpften Knoten DTO-riskant. Bewusst als Folgeauftrag zurückgestellt.
- **Dashboard-Stats (`getTaskStats`/`getTicketStats`/`listRecent*`):** bewusst nicht umgebaut — keine N+1-Klasse (begrenzte Owner-Menge), aber komplexe Sichtbarkeits-/Dedup-Logik; korrekte Aggregat-SQL ist ein eigener Auftrag.
- **`day-plan` Event-Owner-Batchloader** ist bewusst dupliziert (events.service.ts war im parallelen Lauf gesperrt) → später zentralisieren.
- Umsetzung teils via parallele Subagents über disjunkte Dateien; zentrale Absicherung durch Typecheck + Diff-Review. Ein Typfehler (`mapWithBoundedConcurrency`, Generics) wurde behoben.

## Offene Punkte / Folgeaufgaben

- Prio 4: Pagination-Querschnitt (Backend-API-Vertrag + Frontend, inkl. Virtualisierung) — separater Vorschlag, noch offen.
- `getProjectContextTree` vollständig bündeln; Dashboard-Stats per Sichtbarkeits-SQL; Event-Owner-Loader zentralisieren; `roleRepository.findByIds` ergänzen.
- Keine Testläufe (auf Nutzerwunsch). Empfehlung: Integrationstests der betroffenen List-Endpunkte gegen realistische Datenmengen, sobald die Test-DB wieder greift.
