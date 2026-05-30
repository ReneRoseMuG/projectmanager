# Log: CardFooterBar Status-Footer

**Datum:** 26.05.26  
**Schritt:** 65 — CardFooterBar Status-Footer  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Shared Types und API-Services liefern jetzt `attachmentCount`, `noteCount` und `commentCount` für Task, Ticket, Feature und UseCase. Tasks und Tickets zählen Attachments, Notizen und Kommentare über die bestehenden Junction-Tabellen; Features zählen Attachments und Kommentare mit `noteCount = 0`; UseCases zählen Kommentare mit `attachmentCount = 0` und `noteCount = 0`. Im Frontend wurde eine gemeinsame `CardFooterBar` mit Counter-Icons, Tag-Anzeige und optionalem Tag-Picker angelegt und in Task-, Ticket-, Feature- und UseCase-Karten eingebunden. Task- und Ticket-Boards reichen Tags und zentrale Tag-Mutationen aus den bestehenden Hooks weiter; Feature- und UseCase-Karten nutzen dieselbe Footer-Bar read-only. Die Query-Invalidierung wurde so erweitert, dass Support-Objektänderungen die betroffenen Karten-Counter aktualisieren, ohne Projekt- oder Meilenstein-Kommentare unnötig auszuweiten.

Testleitplanken wurden angewendet: Web-Unit-Tests prüfen Komponentenverhalten und DOM-Interaktionen in jsdom; API-Integrationstests nutzen echte Fastify-Apps mit isolierten Temp-DBs und Temp-Upload-Verzeichnissen. Beobachtbares Verhalten sind korrekte Counts, erlaubte und verbotene Tag-Mutationen, Footer-Interaktionen, Pending-State, Rollback bei Fehlern und gezielte Query-Invalidierung. Mocking wurde im Web nur für externe Hooks und Seiteneffekte eingesetzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Count-Felder für Task, Ticket, Feature und UseCase ergänzt |
| `apps/api/src/services/tasks.service.ts` | geändert | Task-Support-Counts ergänzt |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Support-Counts ergänzt |
| `apps/api/src/services/features.service.ts` | geändert | Feature-Support-Counts ergänzt |
| `apps/api/src/services/use-cases.service.ts` | geändert | UseCase-Support-Counts ergänzt |
| `apps/web/src/components/ui/CardFooterBar.tsx` | neu | Gemeinsamer Footer für Tags und Support-Counter |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Footer-Bar und editierbare Tags integriert |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Footer-Bar und editierbare Tags integriert |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Read-only Footer-Bar mit Counts integriert |
| `apps/web/src/components/usecases/UseCaseCard.tsx` | geändert | Read-only Footer-Bar mit Counts integriert |
| `apps/web/src/hooks/useTasks.ts` | geändert | Zentrale Task-Tag-Mutation ergänzt |
| `apps/web/src/hooks/useTickets.ts` | geändert | Zentrale Ticket-Tag-Mutation ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Counter-relevante Support-Invalidierung ergänzt |
| `tests/integration/api/*.test.ts` | geändert | Count- und Permission-Fälle ergänzt |
| `tests/unit/web/components/ui/CardFooterBar.test.tsx` | neu | Footer-Bar und Tag-Abkürzung abgesichert |

## Probleme und Abweichungen

Der MS-17-Umfang baut und die API-Tests sind grün. Der vollständige Web-Testlauf bleibt wegen zwei bestehenden Sidebar-Tests rot: `Sidebar.test.tsx` erwartet den Placeholder `Navigation durchsuchen`, während die aktuelle Sidebar `Alles durchsuchen` rendert. Dieser Befund liegt außerhalb des MS-17-Scopes und wurde nicht eigenständig korrigiert.

## Offene Punkte / Folgeaufgaben

Die Sidebar-Test-Erwartung sollte in einem separaten Auftrag gegen den aktuellen Placeholder abgeglichen werden, falls `Alles durchsuchen` fachlich gewollt ist. Danach sollte `npm run test -w apps/web` erneut vollständig grün laufen.
