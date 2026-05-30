# Testbeschleunigungs-Strategie

**Datum:** 30.05.2026  
**Autor:** Codex  
**Status:** Planungsstand

---

## 1. Aktuelle Testsammlung

### Integrationstests API (31 Dateien)
- `app.integration.test.ts`
- `attachments.test.ts`
- `auth.test.ts`
- `backlog.test.ts`
- `catalogs.test.ts`
- `comments.test.ts`
- `content-images.test.ts`
- `dashboard-widgets.test.ts`
- `dashboard.test.ts`
- `day-plans.test.ts`
- `delete-cascade.test.ts`
- `doc-links.test.ts`
- `dumps-local.test.ts`
- `events.test.ts`
- `features.test.ts`
- `health.test.ts`
- `journal.test.ts`
- `milestones.test.ts`
- `notes.test.ts`
- `notifications.test.ts`
- `owner-task-relations.test.ts`
- `projects.test.ts`
- `realtime.test.ts`
- `settings.test.ts`
- `subtasks.test.ts`
- `tags.test.ts`
- `tasks.test.ts`
- `tickets.test.ts`
- `use-cases.test.ts`
- `wiki-import.test.ts`
- `wiki.test.ts`

### Integrationstests Web (3 Dateien)
- `hooks/queryMutations.integration.test.tsx`
- `hooks/statusCascadeWorkflow.integration.test.tsx`
- `queries/invalidation.integration.test.ts`

### Browser/E2E Tests (22 Dateien)
- `auth.spec.ts`
- `calendar.spec.ts`
- `catalog-defaults.spec.ts`
- `create-child-elements.spec.ts`
- `dashboard.spec.ts`
- `feature-parent-select.spec.ts`
- `feature.spec.ts`
- `freshness.spec.ts`
- `journal.spec.ts`
- `milestone.spec.ts`
- `navigation-return.spec.ts`
- `notes-modal-flow.spec.ts`
- `owner-tasks.spec.ts`
- `page-hero-alignment.spec.ts`
- `project.spec.ts`
- `realtime.spec.ts`
- `settings.spec.ts`
- `start-page.spec.ts`
- `task-dnd.spec.ts`
- `task.spec.ts`
- `ticket-detail-tabs.spec.ts`
- `tickets.spec.ts`

## 2. Aktuelle Testarchitektur und Engpässe

### API-Integrationstests (vitest)
- **Konfiguration:** `apps/api/vitest.config.ts`
- **Pool:** `forks` mit `fileParallelism: false` → **Serielle Ausführung**
- **DB-Isolation:** Jede Testdatei erstellt eine eigene MySQL-Datenbank mit `createTestDb()` (eindeutiger Name mit PID + UUID)
- **Cleanup:** `truncateAll()` vor jedem Test (beforeEach)
- **Setup:** `beforeAll` erstellt DB + App, `afterAll` löscht DB

**Engpass:** `fileParallelism: false` erzwingt serielle Ausführung aller Testdateien, obwohl jede Datei ihre eigene isolierte DB hat.

### Browser/E2E Tests (Playwright)
- **Konfiguration:** `apps/web/playwright.config.ts`
- **Workers:** `workers: 1` → **Serielle Ausführung**
- **Server-Start:** Startet API (Port 3101) und Web (Port 5174) als `webServer`
- **DB-Isolation:** Verwendet einzelne E2E-Datenbank (`taskmanager_e2e`)
- **Test-Isolation:** Jeder Test erstellt eigene Daten via API und räumt am Ende auf

**Engpass:** `workers: 1` und einzelne gemeinsame Datenbank verhindern Parallelisierung.

### Web-Integrationstests (vitest)
- **Konfiguration:** `apps/web/vite.config.ts` (test section)
- **Environment:** `jsdom`
- **Mocking:** Vollständiges API-Mocking (keine echte DB)
- **Isolation:** In-Memory mit QueryClient pro Test

**Status:** Diese Tests sind bereits schnell, da kein DB-Zugriff.

## 3. Beschleunigungsstrategie

### Phase 1: Parallele API-Integrationstests (hohe Priorität, geringes Risiko)

**Analyse:** Die API-Tests verwenden bereits isolierte Datenbanken pro Testdatei (`createTestDb()` erzeugt eindeutigen DB-Namen). Die serielle Ausführung (`fileParallelism: false`) ist daher unnötig restriktiv.

**Maßnahmen:**
1. `fileParallelism` auf `true` setzen oder entfernen (Default)
2. `pool: "forks"` beibehalten (unterstützt Parallelität)
3. Ggf. `maxWorkers` setzen, um Überlastung zu vermeiden (z.B. `maxWorkers: 4`)

**Risiken:**
- MySQL-Verbindungslimit könnte erreicht werden (bei vielen parallelen DBs)
- Lösung: Connection-Pool-Limit pro Test oder `maxWorkers` begrenzen

**Erwartete Beschleunigung:** Bei 31 Testdateien und 4 parallelen Workers → ~75% Zeitersparnis.

### Phase 2: Parallele Browser-Tests mit DB-Isolation (mittlere Priorität, mittleres Risiko)

**Analyse:** Playwright verwendet `workers: 1` und eine gemeinsame Datenbank. Für Parallelisierung benötigt jeder Worker eine isolierte Datenbank.

**Maßnahmen:**
1. **DB-Isolation pro Worker:** Ähnlich wie bei API-Tests, aber für Playwright-Prozesse
   - Jeder Playwright-Worker erhält eine eigene Test-DB
   - DB-Name basiert auf Worker-ID (z.B. `taskmanager_e2e_worker_${process.env.TEST_WORKER_INDEX}`)
   - API-Server muss pro Worker mit entsprechender DB gestartet werden

2. **Playwright-Konfiguration anpassen:**
   - `workers` auf `2` oder `3` setzen (begrenzt durch MySQL-Capacity)
   - `webServer`-Konfiguration muss pro Worker unterschiedliche Ports und DBs verwenden
   - Oder: Project-basierte Konfiguration mit unterschiedlichen Umgebungen

3. **Alternative: Transaction Rollback**
   - Jeder Test läuft in einer Transaktion
   - Nach Test-Ende: Rollback statt Commit
   - Sehr schnell, aber MySQL-limitiert (DDL nicht transactional)

**Risiken:**
- Deutlich komplexere Test-Infrastruktur
- Höherer MySQL-Ressourcenbedarf
- Mögliche Race-Conditions bei gemeinsamen Ressourcen (Upload-Verzeichnisse, etc.)

**Erwartete Beschleunigung:** Bei 22 Browser-Tests und 3 Workers → ~66% Zeitersparnis.

### Phase 3: Optimierte DB-Reset-Strategie (ergänzend)

**Aktuell:** `truncateAll()` löscht alle Tabellen und setzt Auth/Catalog zurück.

**Optimierung:**
1. **Snapshot-basierter Reset:**
   - Einmalig vollständige DB mit Grunddaten anlegen
   - Vor jedem Test: Snapshot restore (MySQL `mysqldump` + `mysql` oder `CREATE DATABASE ... LIKE`)
   - Schneller als individuelles DELETE

2. **Transaction-based Isolation:**
   - Test in Transaktion starten
   - Am Ende: Rollback
   - Sehr schnell, aber MySQL-limitiert (DDL nicht transactional)

**Risiken:**
- Snapshot-Overhead bei vielen parallelen Tests
- Transaction-Rollback bei MySQL nicht vollständig möglich

## 4. Konkreter Umsetzungsplan

### Schritt 1: API-Integrationstests parallelisieren
1. `apps/api/vitest.config.ts` ändern:
   - `fileParallelism: true` setzen
   - `maxWorkers: Math.min(4, os.cpus().length)` für sinnvolle Begrenzung
2. Testen, ob alle Tests noch grün laufen
3. Ggf. Connection-Limits anpassen

### Schritt 2: Browser-Test-Isolation vorbereiten
1. `tests/fixtures/api/db.ts` erweitern:
   - Funktion `createWorkerTestDb(workerId: string)` für worker-spezifische DBs
2. `apps/web/playwright.config.ts` anpassen:
   - `workers: 2` oder `3`
   - `webServer`-Konfiguration pro Worker mit eigenem Port und DB
   - Oder: Project-basierte Konfiguration mit unterschiedlichen Umgebungen

### Schritt 3: DB-Reset optimieren (optional)
1. Snapshot-Mechanismus implementieren
2. Oder: Transaction-based Cleanup wo möglich

## 5. Zusammenfassung

Die **wichtigste und einfachste Beschleunigung** ist die **Parallelisierung der API-Integrationstests**, da die Isolation bereits durch separate Datenbanken pro Testdatei gegeben ist. Die aktuelle Konfiguration (`fileParallelism: false`) ist unnötig restriktiv.

Für **Browser-Tests** ist die Parallelisierung komplexer, da die aktuelle Architektur eine gemeinsame Datenbank verwendet. Hier wäre eine worker-spezifische DB-Isolation nötig, was die Testinfrastruktur deutlich verändert.

**Empfehlung:** Mit Phase 1 beginnen (API-Tests parallelisieren), da dies die größte Beschleunigung bei geringstem Risiko bringt. Anschließend kann Phase 2 evaluiert werden.

---

## 6. Abnahmekriterien

- [ ] Phase 1: API-Integrationstests laufen parallel ohne Fehler
- [ ] Phase 1: Testlaufzeit reduziert sich um mindestens 50%
- [ ] Phase 2: Browser-Tests laufen parallel mit isolierten DBs
- [ ] Phase 2: Testlaufzeit reduziert sich um mindestens 50%
- [ ] Alle Tests bestehen weiterhin konsistent (keine Flakiness durch Parallelisierung)