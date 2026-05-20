# Codex-Auftrag: Test-Konsolidierung – alle Tests unter `tests/`

## Ziel

Alle Testdateien, Setup-Dateien und E2E-Specs werden in einem dedizierten `tests/`-Ordner je App
zusammengeführt. Kein Test bleibt mehr in `src/`. Das Muster folgt dem Referenzprojekt
`C:\Users\r.rose\repos\Plan\releases\work_version02`, in dem `tests/` die alleinige Heimat aller
testbezogenen Dateien ist.

**Es dürfen keine Tests gelöscht, inhaltlich geändert oder neu geschrieben werden.**  
Dieser Auftrag ist reine Strukturarbeit: Dateien verschieben, Imports korrigieren, Configs
anpassen. Die Testergebnisse müssen nach der Umstrukturierung identisch sein.

---

## Kontext und Ist-Zustand

Das Projekt ist ein npm-Workspace-Monorepo mit zwei Apps:

- **`apps/api/`** – Fastify-Backend, Vitest für Unit- und Integrationstests
- **`apps/web/`** – React-Frontend, Vitest für Unit-/Integrationstests, Playwright für E2E

### API – aktuell zerstreute Testdateien in `src/`

Die folgenden fünf Testdateien liegen direkt im Quellcode-Baum und werden daher von
`vitest.config.ts` über den Eintrag `"src/**/*.test.ts"` erfasst:

| Aktuelle Lage | Testtyp |
|---|---|
| `apps/api/src/app.integration.test.ts` | Integration |
| `apps/api/src/runtime-safety.test.ts` | Unit |
| `apps/api/src/services/content.service.test.ts` | Unit |
| `apps/api/src/services/helpers.test.ts` | Unit |
| `apps/api/src/repositories/base.repository.test.ts` | Unit |

Bestehende Testinfrastruktur unter `apps/api/tests/` (bleibt unverändert):

```
apps/api/tests/
├── helpers/        app.ts  db.ts  factories.ts  index.ts
├── integration/    ai.test.ts  attachments.test.ts  auth.test.ts  ...  (26 Dateien)
└── setup/          prepare-test-runtime.ts
```

### Web – Testdateien in `src/` neben den Quelldateien

Alle Frontend-Tests liegen in `__tests__/`-Unterordnern direkt neben den Komponenten:

```
apps/web/src/
├── test/                                    ← setup.ts (Setup-Datei)
├── components/
│   ├── ai/__tests__/                        AiAgentPanel.test.tsx
│   ├── backlog/__tests__/                   BacklogItemForm.test.tsx
│   ├── calendar/__tests__/                  CalendarView.test.tsx  EventForm.test.tsx
│   ├── features/__tests__/                  FeatureDetail.test.tsx  FeatureForm.test.tsx
│   ├── layout/__tests__/                    Sidebar.test.tsx
│   ├── milestones/__tests__/               MilestoneForm.test.tsx
│   ├── notes/__tests__/                     NoteEditor.test.tsx
│   ├── projects/__tests__/                  ProjectForm.test.tsx
│   ├── tasks/__tests__/                     TaskForm.test.tsx
│   ├── tickets/__tests__/                   TicketForm.test.tsx
│   ├── ui/__tests__/                        atoms.test.tsx  BacklogListBoardView.test.tsx
│   │                                        CommentThread.integration.test.tsx
│   │                                        CommentThread.test.tsx  DetailModal.test.tsx
│   │                                        FeatureListBoardView.test.tsx
│   │                                        FeatureProjectPanel.test.tsx  FormModal.test.tsx
│   │                                        ListBoardView.test.tsx  MilestoneListBoardView.test.tsx
│   │                                        OwnerRelationBoard.test.tsx  PendingCommentList.test.tsx
│   │                                        PendingFileList.test.tsx  PendingNoteList.test.tsx
│   │                                        PendingRelationList.test.tsx  ProjectFeaturePanel.test.tsx
│   │                                        ProjectListBoardView.test.tsx  RelationPanel.test.tsx
│   │                                        rich-text-inline-field.test.tsx  TaskListBoardView.test.tsx
│   │                                        tldraw-node.test.tsx  UseCaseListBoardView.test.tsx
│   ├── usecases/__tests__/                  UseCaseForm.test.tsx
│   └── wiki/__tests__/                      WikiPageDetail.test.tsx  WikiPageForm.test.tsx
├── hooks/__tests__/                         queryMutations.integration.test.tsx
├── pages/__tests__/                         BacklogItemDetailPage.test.tsx
│                                            FeatureDetailPage.test.tsx  LoginPage.test.tsx
│                                            MilestoneDetailPage.test.tsx  ProjectDetailPage.test.tsx
│                                            SetupPasswordPage.test.tsx  TaskDetailPage.test.tsx
│                                            TicketDetailPage.test.tsx  UseCaseDetailPage.test.tsx
│                                            WikiPage.test.tsx
├── queries/__tests__/                       invalidation.integration.test.ts
└── utils/__tests__/                         projectTaskStats.test.ts
```

E2E-Tests liegen unter `apps/web/e2e/` (10 `.spec.ts`-Dateien + `domain-test-utils.ts`).

---

## Soll-Zustand

### API – Zielstruktur

```
apps/api/tests/
├── helpers/                               (unverändert)
├── integration/                           (bestehende 26 Dateien + app.integration.test.ts)
│   └── app.integration.test.ts            ← verschoben aus src/
├── setup/                                 (unverändert)
└── unit/                                  ← neu
    ├── runtime-safety.test.ts             ← verschoben aus src/
    ├── repositories/
    │   └── base.repository.test.ts        ← verschoben aus src/repositories/
    └── services/
        ├── content.service.test.ts        ← verschoben aus src/services/
        └── helpers.test.ts                ← verschoben aus src/services/
```

`apps/api/src/` enthält danach **keine** `*.test.ts`-Dateien mehr.

### Web – Zielstruktur

```
apps/web/tests/                            ← neuer Ordner neben src/
├── setup/
│   └── setup.ts                           ← verschoben aus src/test/setup.ts
├── e2e/                                   ← verschoben aus e2e/
│   ├── auth.spec.ts
│   ├── calendar.spec.ts
│   ├── domain-test-utils.ts
│   ├── feature.spec.ts
│   ├── freshness.spec.ts
│   ├── milestone.spec.ts
│   ├── owner-tasks.spec.ts
│   ├── project.spec.ts
│   ├── task.spec.ts
│   └── tickets.spec.ts
└── unit/                                  ← alle verschobenen Vitest-Tests
    ├── components/
    │   ├── ai/           AiAgentPanel.test.tsx
    │   ├── backlog/      BacklogItemForm.test.tsx
    │   ├── calendar/     CalendarView.test.tsx  EventForm.test.tsx
    │   ├── features/     FeatureDetail.test.tsx  FeatureForm.test.tsx
    │   ├── layout/       Sidebar.test.tsx
    │   ├── milestones/   MilestoneForm.test.tsx
    │   ├── notes/        NoteEditor.test.tsx
    │   ├── projects/     ProjectForm.test.tsx
    │   ├── tasks/        TaskForm.test.tsx
    │   ├── tickets/      TicketForm.test.tsx
    │   ├── ui/           (alle 22 Test-Dateien aus src/components/ui/__tests__/)
    │   ├── usecases/     UseCaseForm.test.tsx
    │   └── wiki/         WikiPageDetail.test.tsx  WikiPageForm.test.tsx
    ├── hooks/            queryMutations.integration.test.tsx
    ├── pages/            (alle 10 Test-Dateien aus src/pages/__tests__/)
    ├── queries/          invalidation.integration.test.ts
    └── utils/            projectTaskStats.test.ts
```

`apps/web/src/` enthält danach **keine** `*.test.ts`-, `*.test.tsx`- oder `*.spec.ts`-Dateien mehr.
`apps/web/src/test/` und alle `__tests__/`-Unterordner in `src/` werden nach dem Verschieben
gelöscht.  
`apps/web/e2e/` wird nach dem Verschieben gelöscht.

---

## Implementierungsreihenfolge

### Schritt 1 – Analyse und Bestandsaufnahme

Lies vor Beginn jeder Dateiarbeit:
- `apps/api/vitest.config.ts`
- `apps/api/tsconfig.json`
- `apps/web/vite.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/playwright.config.ts`

Lies außerdem die Imports jeder der fünf API-Testdateien vollständig, um die Import-Pfad-
Korrekturen in Schritt 2 korrekt zu berechnen.

### Schritt 2 – API: Testdateien verschieben und Imports korrigieren

Verschiebe die fünf API-Testdateien an ihre Zielorte (Ist → Soll aus der Tabelle oben).
Korrigiere für jede Datei alle relativen Imports so, dass sie vom neuen Speicherort aus korrekt
auf `src/` zeigen.

**Konkrete Import-Korrekturen:**

**`tests/integration/app.integration.test.ts`** (verschoben aus `src/`):
- `"./runtime-safety.js"` → `"../../src/runtime-safety.js"`

**`tests/unit/runtime-safety.test.ts`** (verschoben aus `src/`):
- `"./runtime-safety.js"` → `"../../src/runtime-safety.js"`

**`tests/unit/services/content.service.test.ts`** (verschoben aus `src/services/`):
- Alle Imports der Art `"./..."` oder `"../..."`, die bisher auf `src/services/` oder
  benachbarte `src/`-Module zeigten, müssen nun von `tests/unit/services/` aus berechnet werden.
  Die neue Tiefe gegenüber `src/` beträgt `../../../src/`. Codex berechnet die genauen Pfade
  anhand der gelesenen Imports.

**`tests/unit/services/helpers.test.ts`** (verschoben aus `src/services/`):
- `"./helpers.js"` → `"../../../src/services/helpers.js"`
- `"../utils/errors.js"` → `"../../../src/utils/errors.js"`

**`tests/unit/repositories/base.repository.test.ts`** (verschoben aus `src/repositories/`):
- `"./base.repository.js"` → `"../../../src/repositories/base.repository.js"`

### Schritt 3 – API: Konfigurationen anpassen

**`apps/api/vitest.config.ts`**:
- Entferne `"src/**/*.test.ts"` aus dem `include`-Array.
- Das Array enthält danach nur noch `"tests/**/*.test.ts"`.
- Alle anderen Einstellungen bleiben unverändert.

**`apps/api/tsconfig.json`** – IDE-Support für `tests/`:
- Das `include`-Array erweitern: `["src", "tests"]`.
- Da `rootDir: "src"` gesetzt ist und TypeScript mit `rootDir`-Konflikten bei `include`-Pfaden
  außerhalb von `src/` Fehler erzeugt, muss `rootDir` auf `.` (App-Root) geändert und
  `"exclude": ["dist", "node_modules"]` explizit gesetzt werden.

  Ergebnis:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "dist",
      "rootDir": ".",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "types": ["node", "vitest/globals"],
      "sourceMap": true
    },
    "include": ["src", "tests"],
    "exclude": ["dist", "node_modules"]
  }
  ```

  ⚠️ Prüfe nach dieser Änderung, dass `npm run build -w apps/api` (tsc) noch fehlerfrei
  durchläuft. Der Compile-Output darf sich nicht ändern. Tut er es, dokumentiere den Blocker.

### Schritt 4 – Web: Testdateien verschieben und Imports korrigieren

Erstelle die Ordnerstruktur `apps/web/tests/unit/[...]/` entsprechend der Soll-Struktur oben.

Verschiebe jede Testdatei von ihrem `__tests__/`-Ort in den entsprechenden `tests/unit/`-Pfad.
Die Abbildung ist direkt:

| Von | Nach |
|---|---|
| `src/[A]/__tests__/[B].test.tsx` | `tests/unit/[A]/[B].test.tsx` |

Beispiele:
- `src/components/ai/__tests__/AiAgentPanel.test.tsx` → `tests/unit/components/ai/AiAgentPanel.test.tsx`
- `src/pages/__tests__/LoginPage.test.tsx` → `tests/unit/pages/LoginPage.test.tsx`
- `src/hooks/__tests__/queryMutations.integration.test.tsx` → `tests/unit/hooks/queryMutations.integration.test.tsx`
- `src/queries/__tests__/invalidation.integration.test.ts` → `tests/unit/queries/invalidation.integration.test.ts`
- `src/utils/__tests__/projectTaskStats.test.ts` → `tests/unit/utils/projectTaskStats.test.ts`

**Import-Pfad-Transformation:**

Der bisherige Speicherort `src/[A]/__tests__/[B].test.tsx` lag zwei Ebenen unterhalb von
`src/[A]/`. Der neue Speicherort `tests/unit/[A]/[B].test.tsx` liegt auf Höhe des ehemaligen
Komponentenordners, aber außerhalb von `src/`. Relative Imports müssen entsprechend angepasst
werden.

**Allgemeine Regel:**

Bisheriger Import `"../[X]"` aus `src/[A]/__tests__/` zeigte auf `src/[A]/[X]`.
Vom neuen Ort `tests/unit/[A]/[B].test.tsx` aus ist `src/[A]/[X]` erreichbar via:
`"../../../src/[A]/[X]"` (drei Ebenen raus: `[A]/` → `unit/` → `tests/` → App-Root, dann `src/[A]/`).

Bisheriger Import `"../../[Y]"` aus `src/[A]/__tests__/` zeigte auf `src/[Y]`.
Vom neuen Ort aus: `"../../../src/[Y]"`.

Codex berechnet den genauen Pfad für jeden Import, indem er die jeweilige Testdatei vor dem
Verschieben liest und die Imports einzeln neu berechnet.

### Schritt 5 – Web: Setup-Datei und E2E-Tests verschieben

- `src/test/setup.ts` → `tests/setup/setup.ts`  
  Kein Import-Update nötig (diese Datei importiert nur externe Pakete).

- `e2e/*.spec.ts` und `e2e/domain-test-utils.ts` → `tests/e2e/` (Dateinamen unverändert)  
  Interne Imports innerhalb der E2E-Dateien prüfen und ggf. korrigieren, falls dort relative
  Imports auf `e2e/`-Nachbardateien bestehen (`"./domain-test-utils"` bleibt relativ korrekt,
  wenn alle E2E-Dateien im selben neuen Ordner liegen).

### Schritt 6 – Web: Konfigurationen anpassen

**`apps/web/vite.config.ts`**:
- `setupFiles` anpassen: `"./src/test/setup.ts"` → `"./tests/setup/setup.ts"`
- `exclude`-Eintrag: `"e2e/**"` → `"tests/e2e/**"` (da E2E-Tests jetzt dort liegen)
- `include` explizit setzen, damit Vitest nicht versehentlich Quelldateien in `src/` durchsucht:
  ```ts
  include: ["tests/unit/**/*.test.{ts,tsx}"]
  ```
- Alle anderen Einstellungen bleiben unverändert.

**`apps/web/playwright.config.ts`**:
- `testDir` anpassen: `"./e2e"` → `"./tests/e2e"`
- Alle anderen Einstellungen bleiben unverändert.

**`apps/web/tsconfig.json`**:
- `include`-Array erweitern: `["src", "tests", "vite.config.ts", "tailwind.config.ts"]`

### Schritt 7 – Aufräumen

Lösche alle jetzt leeren `__tests__/`-Verzeichnisse in `apps/web/src/`.
Lösche `apps/web/src/test/` (war nur für `setup.ts`).
Lösche `apps/web/e2e/` (komplett, alle Dateien wurden verschoben).

Prüfe anschließend, dass `apps/api/src/` und `apps/web/src/` keine `*.test.ts`-, `*.test.tsx`-
oder `*.spec.ts`-Dateien mehr enthalten.

### Schritt 8 – agents.md aktualisieren

Aktualisiere in `agents.md` den Abschnitt **7 Projektstruktur** (Unterabschnitt Referenztabelle):

- Ergänze unter `apps/api/` den Eintrag:
  ```
  apps/api/tests/                  ← alle Tests (unit/, integration/, helpers/, setup/)
  ```

- Ergänze unter `apps/web/` den Eintrag:
  ```
  apps/web/tests/                  ← alle Tests (unit/, e2e/, setup/)
  ```

Aktualisiere außerdem Abschnitt **11 Teststrategie**, Unterabschnitt **Bekannte Kommandos**:
- Ergänze den E2E-Befehl, falls noch nicht vorhanden: `npm run e2e -w apps/web`

### Schritt 9 – Vollständiger Testlauf

Führe seriell aus:

```bash
npm run test -w apps/api
npm run test -w apps/web
npm run e2e -w apps/web
```

Berichte danach:
- Pro Kommando: Status, Anzahl grün / rot / übersprungen
- Gesamt: Summe aller Testläufe
- Falls Fehler auftreten: klassifizieren nach „Import-Pfad-Fehler" (behebbar durch Pfad-Korrektur)
  vs. „inhaltlicher Testfehler" (nicht in diesem Auftrag zu beheben)

Import-Pfad-Fehler dürfen im Rahmen dieses Auftrags behoben werden. Alle anderen Fehler
dokumentiert Codex als offene Punkte im Schritt-Log – sie werden nicht eigenständig behoben.

---

## Randfälle und Fehlerpfade

**`rootDir`-Konflikt in tsconfig.json (API):** Falls TypeScript nach der Änderung auf `.` Fehler
wegen Dateien außerhalb des früheren `rootDir` wirft, ist das der erwartete Ausgangszustand.
Die Lösung ist die Änderung auf `"rootDir": "."` gemäß Schritt 3.

**Vitest findet keine Tests mehr (API):** Wenn nach der Entfernung von `src/**/*.test.ts` aus
`include` der Testlauf leer läuft, fehlt vermutlich `tests/**/*.test.ts` im Array. Prüfen.

**Playwright-Startfehler:** Wenn `npm run e2e` nach dem Verschieben fehlschlägt, liegt der Fehler
mit hoher Wahrscheinlichkeit an `testDir`. Den Wert in `playwright.config.ts` prüfen.

**Leere `__tests__/`-Ordner nach dem Verschieben:** Nur löschen, wenn alle Dateien erfolgreich
verschoben wurden und der Testlauf grün ist. Nicht vorab löschen.

**`domain-test-utils.ts` ist kein Testfile:** Playwright würde diese Hilfsdatei nicht als Test
erkennen – sie muss trotzdem mit in `tests/e2e/` verschoben werden, da E2E-Specs sie
importieren.

---

## Seiteneffekte

- Die Quelldateien in `src/` bleiben vollständig unverändert.
- Keine Schema-, Service-, Route- oder Hook-Änderungen.
- Keine neuen Tests, keine gelöschten Tests, keine inhaltlichen Änderungen an Tests.
- Nach dem Auftrag sind alle `npm run test`-Kommandos lauffähig und produzieren dasselbe
  Ergebnis wie vorher.
- IDE-Unterstützung (TypeScript-Sprachserver) für Tests in `tests/` ist durch die erweiterten
  `tsconfig.json`-Einträge sichergestellt.

---

## Abnahmekriterien

- [ ] `apps/api/src/` enthält keine `*.test.ts`-Dateien mehr
- [ ] `apps/web/src/` enthält keine `*.test.{ts,tsx}`- oder `*.spec.ts`-Dateien mehr
- [ ] `apps/web/src/test/` existiert nicht mehr
- [ ] `apps/web/e2e/` existiert nicht mehr
- [ ] `apps/web/tests/unit/`, `tests/setup/`, `tests/e2e/` existieren
- [ ] `apps/api/tests/unit/` existiert mit `runtime-safety.test.ts`, `repositories/`, `services/`
- [ ] `apps/api/tests/integration/app.integration.test.ts` existiert
- [ ] `npm run test -w apps/api` läuft durch, alle Tests grün
- [ ] `npm run test -w apps/web` läuft durch, alle Tests grün
- [ ] `npm run e2e -w apps/web` läuft durch (oder schlägt aus bekannten inhaltlichen Gründen fehl,
  die bereits vor diesem Auftrag bestanden – kein neuer Fehler durch die Umstrukturierung)
- [ ] `npm run build -w apps/api` (tsc) schlägt nicht fehl
- [ ] `agents.md` Abschnitt 7 und Abschnitt 11 aktualisiert

---

## Referenz

- Referenzstruktur: `C:\Users\r.rose\repos\Plan\releases\work_version02\tests\`
- API Vitest-Konfiguration: `apps/api/vitest.config.ts`
- Web Vite/Vitest-Konfiguration: `apps/web/vite.config.ts`
- Web Playwright-Konfiguration: `apps/web/playwright.config.ts`
- API tsconfig: `apps/api/tsconfig.json`
- Web tsconfig: `apps/web/tsconfig.json`
- Aufgabendateien: `docs/tasks/`
- Schritt-Logs: `logs/`
