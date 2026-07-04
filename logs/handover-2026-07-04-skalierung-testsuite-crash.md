# Handover — Skalierungs-Umbau, progressives Laden, akuter Frontend-Crash, Testsuite-Auftrag

**Stand:** 04.07.26, feature/ms-75-dms. **Nichts committed/gepusht** — alles liegt im Working Tree (~70+ geänderte Dateien). Kein `save` ausgeführt.

---

## 1. Was in dieser Session passiert ist (chronologisch)

1. **MS-75 DMS-Migration abbruchsicher gemacht** — die halb eingespielte Migration `20260703085813_parched_unus` wurde wiederanlaufsicher umgebaut (Prüf-Prozedur pro Schritt). agents.md §8 um „Abbruchsicherheit" ergänzt. Erledigt, eingespielt beim App-Start.
2. **App-weiter Datenzugriffs-Audit + Fixes** (Cluster A–E): N+1-Fluten/Pool-Sprenger behoben in document/attachments (DMS-500), features/use-cases/backlog/day-plan/admin-users (`getUserOptionsMap`), recent-comments (SQL-LIMIT), notification-scheduler, project-context-Kandidatenlisten. Zusätzlich **Kontextbaum** (`getProjectContextTree`) vollständig gebündelt und **Dashboard-Stats** (tasks/tickets) entlastet. Befund in `docs/audit-datenzugriffe.md`. **Typecheck API+Web grün.**
3. **Pagination (Seitenzahlen)** eingebaut (opt-in per `?page=`), dann auf Nutzerwunsch **komplett auf progressives Nachladen umgestellt**: neuer Hook `apps/web/src/hooks/useProgressiveList.ts` (nutzt `useInfiniteQuery`, lädt Blöcke sequenziell à 50 mit 200ms Pause), Komponente `apps/web/src/components/ui/LoadMoreIndicator.tsx`. `Pagination.tsx` + `usePagination.ts` wurden **gelöscht**. Umgestellt: documents, notes, projects, features, milestones, tickets + Boards (tasks, backlog). Design-Leitfaden §8.24 ergänzt. **Typecheck grün.**

## 2. AKUTER BUG (höchste Priorität, ungelöst)

Nach dem progressiven Umbau **crashen** mehrere Listen-Seiten (`/projects`, `/milestones`, `/features`) mit einer Error-Boundary; Konsole: **`TypeError: r.filter is not a function`** in einem `useMemo`. **Tickets lädt, ist aber leer** (kein Crash).

**Bereits bewiesen/ausgeschlossen:**
- **Backend ist korrekt.** `GET /api/projects` (ohne `page`) liefert nachweislich ein **Array** (vom Nutzer im Browser bestätigt + Integrationstest `projects.test.ts` „GET /api/projects gibt alle Projekte" grün). Der Opt-in-Vertrag hält im Quellcode.
- Also ist der Bug **im Frontend**: eine `.filter()`/`useMemo`-Stelle läuft auf ein **Nicht-Array-Objekt**.
- Der Nutzer läuft einen **vollständigen, aktuellen Build** (meine frühere „veralteter Build"-Vermutung war falsch — nicht wiederholen).
- Ein **defensiver Fix** in `useProgressiveList` (items filtert Nicht-Paginated, `getNextPageParam` prüft Paginated-Form) ist im Quellcode drin, hat den Crash aber **nicht** behoben → der Crash liegt an anderer Stelle.

**Diagnose-Stand / Kandidaten (noch nicht final lokalisiert):**
- `ProjectsPage.tsx` ~Z.70-80: `statusOptions`-useMemo mit `catalogEntriesByKind(catalogs.entries, "workStatus")` **und** `projects.filter(...)`. `projects` kommt aus `useProjects()` (Alt-Pfad, liefert Array laut API) → also eher **nicht** das Problem. `catalogs.entries` wäre ein Kandidat, aber catalogs wurde nie umgebaut — und wenn es das wäre, müssten Tickets auch crashen (tun sie nicht).
- `ProjectListBoardView.tsx` Z.80-82: `visibleProjects = searchControlled ? projects : projects.filter(...)`. Auf `/projects` ist `searchControlled === true` (kontrollierte Suche gesetzt) → nutzt `projects` direkt **ohne** `.filter` → also **nicht** die Crash-Stelle dort.
- **Offene Kernfrage:** Welche Variable ist zur Laufzeit ein Objekt statt Array? Unterschied Projekte/Meilensteine/Features (crashen) vs. Tickets (leer) eingrenzen. Verdacht: die Alt-Pfad-Hooks `useMilestones`/`useFeatures` (von den progressiven Agents angefasst) könnten für die Status-Chip-Counts kein Array mehr liefern — **useProjects wurde geprüft und sieht sauber aus** (`projects: projectsQuery.data ?? []`), useMilestones/useFeatures **noch nicht geprüft**.

**Empfohlener nächster Schritt (test-getrieben):** Einen Frontend-Test schreiben, der `/projects` (bzw. die Seite) rendert und beweist, dass keine Error-Boundary erscheint — reproduziert den Crash. Dann via React DevTools/Sourcemap ODER durch Prüfen der Hook-Rückgaben (`useProjects`/`useMilestones`/`useFeatures` und `useCatalogs` → geben sie immer ein Array?) die exakte Nicht-Array-Variable finden und robust machen. Grep-Startpunkt: `.filter(`/`useMemo` in den drei Pages + den drei `*ListBoardView`-Komponenten + `catalogEntriesByKind` (in `apps/web/src/utils/catalogs.ts`).

## 3. Offener Hauptauftrag: Testsuite-Vollausbau (freigegeben)

Nutzer-Auftrag wörtlich: umfangreiche Testsuite, **für jedes Domänenobjekt die denkbaren Abrufpfade, sämtliche Nebeneffekte und Grenzfälle**. Freigabe: **(1) Vollausbau, (2) test-getrieben MIT Fix** (Tests rot → Produktivcode grün im selben Zug). Plan wurde im Chat vorgelegt und akzeptiert.

**Scope pro Domäne** (projects, milestones, tasks, tickets, features, use-cases, notes, backlog, documents, wiki):
- **Integration (API):** `GET /X` ohne `page` → **Array** (der gebrochene Vertrag!); `GET /X?page=1&pageSize=n` → `Paginated{data,total,page,pageSize}`; Konsistenz (paginiert zusammengesetzt == Array); Filter/Suche serverseitig mit **Gegenbeispielen** (rein/raus, `total` korrekt); Grenzfälle (0/1/>pageSize/letzte Seite/page hinter Ende/pageSize>100/page≤0); Auth (401/403).
- **Unit (Web):** `useProgressiveList` akkumuliert + defensiv gegen Nicht-Paginated; `getX`→Array, `getXPage`→Paginated; `useX`-Hooks liefern immer Array.
- **E2E:** Navigation zu jeder Listen-/Board-Route → rendert, **keine Error-Boundary**, erste Einträge sichtbar (hätte den aktuellen Crash gefangen).
- **Nebeneffekte:** Create→Liste, Update+`expectedVersion`→Erfolg/`CONFLICT`, Delete→Cascade, Tags, Invalidierung.

**Testinfrastruktur (verifiziert, funktioniert):**
- Test-DB **läuft** (kein Timeout mehr). Start-Kommando das nachweislich grün lief:
  `$env:TEST_DB_HOST='127.0.0.1'; $env:TEST_DB_PORT='3306'; $env:TEST_DB_USER='root'; $env:TEST_DB_PASSWORD='#i355nz@oM?5bdxs'; npm run test -w apps/api -- --run tests/integration/api/<datei>.test.ts`
- Fixtures: `tests/fixtures/api/index.ts` re-exportiert `db.ts` (`createTestDb`, `truncateAll`, `TestDb`), `app.ts` (`buildTestApp(testDb, { enableMultipart?, enableAuth? })` — **`enableAuth: true` nötig für 401/403-Tests**, sonst kein Guard), `factories.ts` (`createProject/Milestone/Task/Ticket/Feature/UseCase/WikiPage/BacklogItem/Tag/Note...` — alle per Supertest-POST gegen `app.server`, Routen mit `/api`-Prefix).
- Muster-Vorlage: `tests/integration/api/projects.test.ts` (describe/beforeAll `createTestDb`+`buildTestApp`/beforeEach `truncateAll`/afterAll close; `supertest(app.server).get("/api/projects").expect(200)`).
- Pflicht-Scope-Kommentar in jeder neuen Testdatei (siehe `test-entwurfsleitplanken`).
- Empfehlung: pro Domäne neue Datei `tests/integration/api/<domain>-list-contracts.test.ts` (Konfliktfrei, delegierbar an Subagents).

## 4. Verbindliche Regeln/Constraints (aus agents.md + Memory)

- **Durchgehend Deutsch** antworten.
- **Kein Produktivcode-Fix ohne Genehmigung** — Ausnahme: akuter Crash ist impliziter Fix-Auftrag. In Test-Sessions keinen unbeauftragten Produktivcode ändern (test-entwurfsleitplanken) — hier aber ausdrücklich „test+fix" freigegeben.
- **Pflicht-Skills:** `planungsleitplanken` vor jeder Planung, `test-entwurfsleitplanken` bei Tests. Integrationstests = **keine Mocks**, echte DB/App.
- **graphify** nur **1× am Ende** aller Änderungen, **nie in parallelen Subagents** (Races).
- **Kein eigenständiger Preview/Browser** — nur auf explizite Aufforderung.
- **Scope nicht eigenmächtig verkleinern**; gegen **reale Datenmengen** denken (N+1, Aiven-Pool `connectionLimit 10`).
- Subagents für Umsetzung bewährt (disjunkte Dateien), **zentral per Typecheck absichern** (`npm run typecheck -w apps/api` / `-w apps/web`). Gemeinsame Dateien (`queryKeys.ts`, `invalidation.ts`) NICHT parallel ändern lassen.
- MCP-Abschlusskommentar an PROJ-3 (Standard-Ziel) nur wenn App läuft (`add_comment_to_parent`, parentType `project`, id `3`).

## 5. Sofort-To-Do für den nächsten Chat

1. **Frontend-Crash fixen** (test-getrieben): reproduzierenden Test → exakte Nicht-Array-Variable finden (useMilestones/useFeatures/useCatalogs-Rückgaben + catalogEntriesByKind prüfen) → robust machen. App muss wieder ohne Crash laden.
2. **Testsuite-Vollausbau** wie oben — beginnend mit den Abrufpfad-Verträgen (Alt-Array vs. Paginated), die den Crash-Klasse abdecken.
3. Danach: Nutzer fragen zu `save`.
