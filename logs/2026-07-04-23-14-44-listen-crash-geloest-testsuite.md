# Abschluss — MS-Skalierung: Listen-Crash gelöst + Testsuite-Ausbau

**Stand:** 04.07.26 23:14, `feature/ms-75-dms`. **Nichts committed/gepusht** (kein `save` — bewusst nicht ausgeführt). Working Tree trägt Vorsession-Umbau + diese Session vermischt.

---

## 1. Kern-Auftrag: Listen-Crash GELÖST und verifiziert

**Symptom:** `/projects`, `/milestones`, `/features` crashten mit `TypeError: … .filter is not a function` (Error-Boundary); `/tickets`, `/tasks` luden leer.

**Ursache (test-getrieben belegt):** Cache-Key-Kollision in TanStack Query. Die Alt-Pfad-Hooks `useProjects/useMilestones/useFeatures` (`useQuery`, speichern ein **Array**) und die progressiven `useXLibrary` (`useInfiniteQuery`, speichern `{pages,pageParams}`) teilten sich bei leerem Filter denselben `queryKeys.X.list(...)`-Cache-Eintrag. Der InfiniteQuery überschrieb das Array mit seinem Objekt → `X.filter(...)` in den Status-Chip-Counts crashte; bei Tickets/Tasks (kein `.filter` auf dem Alt-Pfad) blieb die Liste leer. Die API war nie schuld (140 Contract-Tests grün).

**Fix (4 Produktivdateien — die einzigen bewussten Produktivcode-Änderungen dieser Session):**
- `apps/web/src/hooks/useProgressiveList.ts` — hängt einen Suffix-Marker `"__progressiveList"` an den InfiniteQuery-Key → trennt die Cache-Einträge für **alle** progressiven Hooks; Prefix-Invalidierung bleibt intakt.
- `apps/web/src/hooks/useProjects.ts`, `useMilestones.ts`, `useFeatures.ts` — `Array.isArray(...)`-Guards statt `?? []` (Härtung).

**Verifikation (gemessen, nicht behauptet):**
- E2E `tests/browser/web/list-progressive-render.spec.ts`: **5/5 grün** (vorher 3/3 rot mit echtem Stacktrace `features.features.filter is not a function`). Deckt /projects, /milestones, /features (kein Crash) + /tickets, /tasks (Einträge sichtbar statt leer).
- Unit-Regression `tests/integration/web/hooks/progressiveListCacheIsolation.integration.test.tsx`: ohne Fix rot, mit Fix grün — verifiziert.
- Bestehende Listen-E2E (project/milestone/feature/tickets.spec): **23/27 grün** — die 4 Fehler sind „Target page closed"-Cleanup-Flakes bei parallelen Workern (E2E_WORKERS=2), **kein Crash**. Noch mit E2E_WORKERS=1 gegenzuprüfen.
- Typecheck Web + API grün.

## 2. Neue Testsuite (grün)

- **Integration (API): 140 Tests, 9 Dateien** — `tests/integration/api/`: `list-pagination-contracts` (domänenübergreifender Kern) + `<domain>-list-contracts` für projects/milestones/features/tickets/tasks/notes/backlog/documents. Je: Array-ohne-page-Vertrag, Paginated-mit-page, Konsistenz, Filter/Suche **mit Gegenbeispielen**, Grenzfälle (0/1/>pageSize/hinter Ende/`pageSize>100`→400/`page≤0`→400), Auth 401/403.
- **Unit (Web): 4 Tests** — Cache-Isolations-Regression + `useProgressiveList` (Akkumulation, Defensive gegen Nicht-Paginated).
- **E2E: 5 Tests** — Listen-/Board-Smoke (s.o.).

**Verifizierte Vertragsfeinheiten (kein Bug, test-getrieben festgeschrieben):** Array-Pfad ohne `page` ignoriert Filter bei projects/tickets/tasks/notes/milestones/features, **wendet** sie aber bei backlog/documents an; `q` sucht bei features/milestones/backlog nur Titel/Name, bei notes über Titel+`content_json`.

## 3. Alt-Test-Aufräumen (Vorsession-Schaden) — TEILWEISE, 6 Tests offen

Der Regressions-Check deckte **67 rote Web-Unit-Tests (26 Dateien)** auf. Baseline-Analyse (HEAD vs. Working Tree): **30 davon schon auf HEAD rot** = Vorschaden aus früheren Commits (Board-Redesign, Editor-Migration MS-56), **nicht** vom Listen-Umbau; nur 37 sind Umbau-Folge. Keiner betrifft den Crash-Fix.

- **Ausgangslage:** 67 rot / 746 grün.
- **Jetzt:** **6 rot / 823 grün** (5 Form-Dateien offen).
- **Repariert:** Query-Key-Invalidierung (dumps-Feature entfernt, `notes.list()`-Signatur), TicketsPage (fehlender `useTicketsLibrary`-Mock), Pages, alle Board-View-Spalten-Counts (ClosedBoardSidebar-Umstellung), NoteEditor (Legacy-Markdown-Migration), DashboardWidgets, ParentContextField. **Kein Weichspülen** — Vorlagen und Design-Leitfaden (`showGroupedEmptyState`) wurden konsultiert.
- **NOCH OFFEN (6 Tests, ~5 Dateien):** `ProjectForm`, `TaskForm`, `TicketForm`, `FeatureForm`, `BacklogItemForm`, `MilestoneForm` — Parent-Kontext-/Flex-Fill-Selektoren an das Form-Redesign anpassen. Der Reparatur-Subagent wurde mitten in `TaskForm` gestoppt. Muster: bereits reparierte `ProjectForm.catalogTiming.test.tsx` (Mock `useBacklogPaginated`).

## 4. OFFENER BEFUND — echter Produktivcode-Bug (NICHT gefixt, wartet auf Genehmigung)

**Backlog-`line-through` verloren:** Geschlossene/abgelehnte Backlog-Items werden im Board-Modus **nicht mehr durchgestrichen**. Der `closed`-Zweig in `apps/web/src/components/backlog/BacklogListBoardView.tsx` (`BacklogItemCard.<h3>`, `line-through`) ist toter Code, weil geschlossene Items jetzt in der `ClosedBoardSidebar` über `ItemRow` (`apps/web/src/components/ui/ItemRow.tsx`, ohne `line-through`) laufen. Kosmetische Regression des Board-Redesigns. **Fix wäre Produktivcode** (`line-through` in die Sidebar-Darstellung geschlossener Items ziehen) — bewusst NICHT ausgeführt, weil Produktivcode-Änderungen deine Genehmigung brauchen.

## 5. Produktivcode-Status

Bewusst geändert: **ausschließlich die 4 Crash-Fix-Hooks** aus §1. Kein weiterer Produktivcode-Fix. (Die restlichen Produktiv-Änderungen im Working Tree stammen aus dem Vorsession-Umbau.)

## 6. Nächste Schritte (für die Folgesession)

1. **6 rote Form-Tests** fertig reparieren (reine Test-Arbeit) → Web-Suite komplett grün.
2. **Backlog-`line-through`**: Genehmigung einholen, dann Produktivcode-Fix in der Sidebar-Darstellung.
3. **4 E2E-Cleanup-Flakes** mit `E2E_WORKERS=1` gegenprüfen (vermutlich reine Parallel-Worker-Races).
4. `graphify update .` (nach den letzten Änderungen).
5. **`save`** (commit + push) — noch nicht erfolgt.
