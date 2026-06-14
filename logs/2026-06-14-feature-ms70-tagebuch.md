# Schritt-Log: MS-70 Tagebuch-Feature

**Auftrag:** MS-70 „Tagebuch Feature" (FT(16), Spec WIKI-24) — App-Infrastruktur für das
Projekt-Tagebuch und ein Dashboard-Widget. Auftragsklasse 5 (mehrschichtiges Feature).
Umgesetzt: TASK-346 (Backend), TASK-347 (MCP-Tools), TASK-348 (Frontend-Widget).
TASK-349 (Cowork-Skill „tagebuch") ist bewusst nicht Teil dieser Umsetzung (separater Deliverable).

## Umgesetzt

### Shared Types (`packages/shared-types/src/index.ts`)
- `diary` zu `AUTH_RESOURCES` ergänzt (read/write durch System-Rollen-Wildcards abgedeckt, kein Seeding nötig).
- DTOs `DiaryEntry`, `DiaryEntryInput`, `DiaryEntryUpdate` (`WithExpectedVersion`) nach WikiPage-Muster.
- `projectDiary` zu `DASHBOARD_WIDGET_IDS` und zur `project`-Liste in `DASHBOARD_ALLOWED_WIDGETS`
  (nur Projekt-Kontext; bewusst NICHT ins Default-Layout, damit bestehende Dashboards unverändert bleiben).

### Backend (`apps/api`)
- Tabelle `diaryEntries`: `projectId`-FK (cascade, notNull), `title`, `content` (longtext/HTML),
  `coveredUntil`, `sourceCount`, plus Versionierung/Audit; **Unique-Index auf `projectId`** (genau ein lebender Eintrag je Projekt).
- Migration `20260614014906_dry_wendell_vaughn` generiert und lokal angewandt. Die generierte
  `migration.sql` ließ die `ON DELETE`-Klauseln der inline-FKs weg (bekanntes drizzle-kit-Verhalten bei
  neuen Tabellen); manuell ergänzt (CASCADE / SET NULL), konsistent mit dem Snapshot.
- Repository `diary-entry.repository.ts` (CRUD + `assertVersion` → 409), Service `diary.service.ts`
  (Projektprüfung → 404, Unique-Vorabprüfung → 409, Mapping). **Bewusst kein Journal-Eintrag** fürs
  Tagebuch, um Rückkopplung (Tagebuch-Änderung → Journal-Ereignis → Tagebuch) zu vermeiden; im Code begründet.
- Route `diary.ts`: `GET/POST /projects/:projectId/diary`, `GET/PATCH /diary/:id` (expectedVersion erzwungen).
  Permission über `config.auth`-Override (`diary` read/write) statt der pfadbasierten Auto-Erkennung,
  da der Pfad unter `/projects/...` sonst fälschlich `projects` prüfen würde. `GET /diary/:id` ergänzt,
  damit der versionsgeschützte MCP-Update-Pfad (updateVersioned: GET+PATCH auf denselben Pfad) funktioniert.
- Registrierung in `app.ts` und in der Test-Fixture `tests/fixtures/api/app.ts`; `diary_entries` in die
  Truncation-Liste `tests/fixtures/api/db.ts` aufgenommen.

### MCP-Tools (`apps/mcp-server/src/tools.ts`)
- `get_project_diary`, `create_diary_entry`, `update_diary_entry` nach dem Wiki-Tool-Muster
  (`withHtmlContent`, `updateVersioned` für `expectedVersion`).

### Frontend (`apps/web`)
- `api/diary.ts` (`getProjectDiary`), Hook `useDiary` (gated an `diary:read`), Query-Key
  `queryKeys.projects.diary` (unter Projekt-Scope, von `invalidateProjectScope` abgedeckt — keine separate
  `invalidateDiary` nötig, da die App das Tagebuch nicht selbst mutiert).
- Registriertes Dashboard-Widget `projectDiary` (`widgetRegistry`), Komponente `DiaryWidget` in
  `DashboardWidgets.tsx`: read-only HTML über das bestehende `RichTextInlineField`, `EmptyState` ohne Eintrag,
  „Aktualisieren" = reines Refetch, Permission-Gating.

## Tests
- Testleitplanken angewendet: `test-entwurfsleitplanken` (Integration ohne Mocks; Unit mit gemockter API/Permission).
- API-Integration `tests/integration/api/diary.test.ts` (11 Tests, grün): CRUD, version=1, GET null,
  GET /diary/:id, PATCH version+1, 409 Versionskonflikt, 409 zweiter POST (Unique), 404 fehlendes Projekt,
  Cascade bei Projektlöschung, 401 ohne Session, 403 Reader auf POST/PATCH, positiver Admin-Schreibfall.
- Frontend: `tests/unit/web/hooks/useDiary.test.tsx` (4 Tests, grün) und DiaryWidget-Tests in
  `DashboardWidgets.test.tsx` (4 Tests, grün): Inhalt, EmptyState, Refetch, Permission-Sichtbarkeit.
- Verifiziert: shared-types/api/mcp-server/web bauen sauber; Migration über `createTestDb` angewandt.

## Offene Punkte / Blocker
- **Vorbestehender roter Test (nicht aus diesem Auftrag):** `DashboardWidgets.test.tsx › „filtert das
  Kalender-Widget im DayPlan-Kalender"` schlägt fehl, weil der `useDayPlan`-Mock dieser Datei `useDayPlanEvents`
  nicht exportiert. Per `git stash` gegen den committed Stand verifiziert (1 failed | 23 passed) — gehört zum
  laufenden Calendar-Arbeitsstrang (uncommittetes `WeekCalendar.tsx`), bewusst nicht angefasst.
- Auf ausdrücklichen Wunsch kein voller Testlauf; nur die direkt betroffenen Tests ausgeführt.
- TASK-349 (Cowork-Skill „tagebuch") offen — separater Deliverable; die MCP-Tools erfüllen seinen Schnittstellenvertrag.

## Leitfaden-Pflege (Vorschlag, nicht eingearbeitet)
- `docs/architektur-leitfaden.md` §1/§2: Lücke — `diaryEntries` als projektgebundenes 1:1-Begleitobjekt
  (direkter notNull-`projectId`-FK, kein Junction, kein Support-n:m) dokumentieren. Formulierungsvorschlag im Chat.
- `docs/design-leitfaden.md`: kein Handlungsbedarf (Widget komponiert nur bestehende, konforme Muster).
