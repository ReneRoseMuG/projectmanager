# Codex-Auftrag: Nacharbeit Owner-Relation-Board (Schritte 8–11)

**Bezug:** Folgeauftrag zu „Einheitliche Create/Edit-Formulare mit Owner-Relation-Boards" (v2)  
**Datum:** 18.05.2026

---

## Ziel

Die Implementierungsschritte 1–7 des Ursprungsauftrags sind abgeschlossen. Die Test-Schritte 8–11
sind unvollständig. Dieser Auftrag schließt alle offenen Testlücken, korrigiert die fehlerhafte
Teststruktur aus Schritt 9 und behebt den Playwright-Startblocker.

---

## Schritt 0 — Playwright-Startblocker beheben (Voraussetzung für alle E2E-Schritte)

**Problem:** `tsx`/`esbuild` scheitert mit `spawn UNKNOWN` beim Aufruf von
`node_modules/tsx/node_modules/@esbuild/win32-x64/esbuild.exe`. Ursache: native Binaries wurden
nicht korrekt gebaut oder sind korrupt.

**Vorgehen (in dieser Reihenfolge):**

```bash
# 1. esbuild komplett neu bauen
npm rebuild esbuild --workspace=apps/web
npm rebuild esbuild --workspace=apps/api

# 2. Falls erfolglos: lokale tsx-Installation ersetzen
npm uninstall tsx --workspace=apps/web
npm install tsx --workspace=apps/web

# 3. Smoke-Test: API-Server muss starten
npx tsx apps/api/src/server.ts &
sleep 3 && curl -s http://localhost:3000/api/health && kill %1

# 4. Playwright Smoke-Test
npm run e2e -w apps/web -- --list
npm run e2e -w apps/web -- owner-tasks.spec.ts --headed=false
```

**Abnahmekriterium:** `npm run e2e -w apps/web -- owner-tasks.spec.ts` läuft ohne
`spawn UNKNOWN`-Fehler durch. Erst danach Schritte 3–5 beginnen.

Schlägt Schritt 0 fehl: im Log dokumentieren, Schritte 3–5 überspringen und mit Schritt 1 und
Schritt 2 fortfahren.

---

## Schritt 1 — Unit-Tests: vier fehlende Foundation-Komponenten

**Hintergrund:** Im Ursprungsauftrag (Schritt 8) wurde nur `OwnerRelationBoard.test.tsx` angelegt.
Die vier Pending-Komponenten haben keine eigenen Tests.

**Dateien (neu):**
- `apps/web/src/components/ui/__tests__/PendingRelationList.test.tsx`
- `apps/web/src/components/ui/__tests__/PendingCommentList.test.tsx`
- `apps/web/src/components/ui/__tests__/PendingNoteList.test.tsx`
- `apps/web/src/components/ui/__tests__/PendingFileList.test.tsx`

Bestehende Datei **nicht anfassen:**
- `apps/web/src/components/ui/__tests__/OwnerRelationBoard.test.tsx` — bereits grün, unverändert lassen

---

### `PendingRelationList.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn existingItems und draftItems beide leer.
 * - Kein EmptyState wenn existingItems vorhanden.
 * - Kein EmptyState wenn draftItems vorhanden.
 * - Footer-Hinweis „Diese Zuordnungen werden nach dem Speichern verknüpft." immer sichtbar.
 * - showLinkExisting=false: „Verknüpfen"-Button nicht sichtbar.
 * - showCreateNew=false: „Neu erstellen"-Button nicht sichtbar.
 * - „Verknüpfen" geklickt → onLinkExisting() aufgerufen.
 * - „Neu erstellen" geklickt → onCreateNew() aufgerufen.
 * - Entfernen-Button bei existingItem → onRemoveExisting(korrekter Index) aufgerufen.
 * - Entfernen-Button bei draftItem → onRemoveDraft(korrekter Index) aufgerufen.
 * Ziel: PendingRelationList-Rendering und alle Interaktionen absichern.
 */
```

Mindestens **10 Testfälle.**

---

### `PendingCommentList.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Kommentare pending.
 * - Footer-Hinweis „Kommentare werden nach dem Speichern angelegt." immer sichtbar.
 * - Text eingeben + „Hinzufügen" → onAdd() mit korrektem DraftComment aufgerufen.
 * - Leeres Textfeld: „Hinzufügen"-Button disabled oder Aufruf verhindert.
 * - Nach Hinzufügen: Textfeld geleert.
 * - Entfernen → onRemove(index) aufgerufen.
 * Ziel: PendingCommentList-Rendering und Interaktionen absichern.
 */
```

Mindestens **6 Testfälle.**

---

### `PendingNoteList.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Notizen pending.
 * - Footer-Hinweis „Notizen werden nach dem Speichern angelegt." immer sichtbar.
 * - „Neue Notiz" geklickt → Mini-Dialog öffnet sich.
 * - Titel eingeben + Bestätigen → onAdd() mit korrekter DraftNote aufgerufen.
 * - Leerer Titel: Bestätigen-Button disabled.
 * - Entfernen → onRemove(index) aufgerufen.
 * Ziel: PendingNoteList-Rendering und Interaktionen absichern.
 */
```

Mindestens **6 Testfälle.**

---

### `PendingFileList.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Dateien pending.
 * - Footer-Hinweis „Dateien werden nach dem Speichern hochgeladen." immer sichtbar.
 * - Datei auswählen (≤ 25 MB) → onAdd() mit korrekten DraftFiles aufgerufen.
 * - Datei > 25 MB → onAdd() nicht aufgerufen, Fehlermeldung sichtbar.
 * - Dateiname und formatierte Dateigröße sichtbar.
 * - Entfernen → onRemove(index) aufgerufen.
 * Ziel: PendingFileList-Rendering, Größenvalidierung und Interaktionen absichern.
 */
```

Mindestens **6 Testfälle.**

---

**Abnahmekriterien Schritt 1:**
- Alle 4 Testdateien existieren, vollständig typisiert, kein `any`
- Scope-Kommentar in jeder Datei vollständig und exakt so wie oben spezifiziert
- Kein `test.skip`, kein leerer Test-Body
- `npm run test -w apps/web` grün

---

## Schritt 2 — Unit-Tests: Unified Forms restrukturieren

**Problem:** Im Ursprungsauftrag (Schritt 9) wurde die kombinierte Datei
`apps/web/src/components/__tests__/OwnerForms.test.tsx` angelegt statt der vier geforderten
Einzeldateien in den richtigen Verzeichnissen.

**Vorgehen:**

1. Bestehende Datei `apps/web/src/components/__tests__/OwnerForms.test.tsx` lesen und
   die Tests auf vier neue Dateien aufteilen.
2. Bestehende Datei danach löschen.

**Dateien (neu, korrekte Pfade):**
- `apps/web/src/components/usecases/__tests__/UseCaseForm.test.tsx`
- `apps/web/src/components/tasks/__tests__/TaskModal.test.tsx`
- `apps/web/src/components/features/__tests__/FeatureForm.test.tsx`
- `apps/web/src/components/projects/__tests__/ProjectForm.test.tsx`

**Dateien (löschen):**
- `apps/web/src/components/__tests__/OwnerForms.test.tsx`

---

### Scope-Kommentar jede Datei (identische Struktur, angepasst je Entität)

```typescript
/**
 * Test Scope: [UseCaseForm | TaskModal | FeatureForm | ProjectForm]
 *
 * Create-Modus:
 *  1. Alle Relation-Tabs sichtbar (Aufgaben, Tickets, Kommentare, ...).
 *  2. PendingRelationList in Relation-Tabs sichtbar (kein Board, kein API-Aufruf).
 *  3. PendingCommentList im Kommentare-Tab sichtbar.
 *  4. PendingFileList im Dateien-Tab sichtbar (sofern Tab vorhanden).
 *  5. Verknüpfen → kein API-Aufruf vor Submit.
 *  6. Neu erstellen → Draft erscheint in Pending-Liste.
 *  7. Pending-Item entfernen → aus Liste verschwunden.
 *  8. Submit → onSubmit aufgerufen → onPostCreate mit allen Pending-Daten aufgerufen.
 *  9. Schließen + neu öffnen → alle Pending-Listen leer (State-Reset).
 *
 * Edit-Modus:
 * 10. OwnerTaskBoard / OwnerTicketBoard in Relation-Tabs sichtbar.
 * 11. CommentThread im Kommentare-Tab sichtbar.
 * 12. AttachmentList im Dateien-Tab sichtbar (sofern Tab vorhanden).
 */
```

Mindestens **12 Testfälle pro Datei.**

Spezifisch je Entität ergänzen:
- `UseCaseForm`: kein Dateien-Tab → Testfall 4 entfällt, dafür: Reset von
  `pendingComments` bei `open → false` explizit prüfen.
- `TaskModal`: Subtask-Tab im Create-Modus mit `PendingRelationList` (nur „Neu erstellen",
  kein „Verknüpfen") prüfen.
- `FeatureForm`: Use-Case-Tab im Create-Modus (`PendingRelationList` mit beiden Aktionen) prüfen.
- `ProjectForm`: Backlog-Tab im Create-Modus zeigt Hinweistext statt Formular; Import-Tab
  im Create-Modus nicht sichtbar.

**Abnahmekriterien Schritt 2:**
- Alle 4 Dateien in den korrekten Verzeichnissen, vollständig typisiert
- Scope-Kommentar vollständig und korrekt
- `apps/web/src/components/__tests__/OwnerForms.test.tsx` gelöscht
- Kein `test.skip`, kein leerer Test-Body
- In Create-Tests: kein API-Aufruf-Mock vor Submit ausgelöst
- `npm run test -w apps/web` grün

---

## Schritt 3 — E2E: `feature-form.spec.ts` (neu)

**Voraussetzung:** Schritt 0 abgeschlossen (Playwright startet).

**Datei (neu):** `apps/web/e2e/feature-form.spec.ts`

```typescript
/**
 * Test Scope: FeatureForm E2E
 * Abgedeckte Regeln:
 * - FeatureForm Create-Modus: Use Cases-, Aufgaben-, Tickets-, Projekte-,
 *   Kommentare- und Dateien-Tabs sind sichtbar.
 * - Create: Aufgabe vormerken → nach Speichern im Feature-Aufgaben-Tab sichtbar
 *   (Reload-Prüfung: Persistenz bestätigt).
 * - Create: Kommentar vormerken → nach Speichern im Kommentare-Tab sichtbar.
 * - Edit: OwnerTaskBoard sichtbar, Aufgabe direkt anlegen möglich.
 * - FeatureDetailPage zeigt ausschließlich Hero + „Bearbeiten"-Button (kein Tab-Interface).
 * - Edit-Modus: Löschen-Button vorhanden.
 */
```

Mindestens **6 Testfälle.**

Pending-Tests müssen nach Submit einen `page.reload()` durchführen und dann das
verknüpfte Item prüfen (`expect(locator).toHaveCount(1)`).

Isolationstest: Feature-Task erscheint **nicht** in einem anderen Feature
(`expect(locator).toHaveCount(0)` explizit).

---

## Schritt 4 — E2E: `project-form.spec.ts` (neu)

**Voraussetzung:** Schritt 0 abgeschlossen.

**Datei (neu):** `apps/web/e2e/project-form.spec.ts`

```typescript
/**
 * Test Scope: ProjectForm E2E
 * Abgedeckte Regeln:
 * - ProjectForm Create-Modus: Features-, Aufgaben-, Tickets-, Kommentare-,
 *   Notizen- und Dateien-Tabs sichtbar.
 * - Backlog-Tab im Create-Modus: Hinweistext sichtbar, kein Board-Formular.
 * - Import-Tab im Create-Modus: nicht sichtbar.
 * - Create: Aufgabe vormerken → nach Speichern im Projekt-Aufgaben-Tab sichtbar
 *   (Reload-Prüfung: Persistenz bestätigt).
 * - Create: Notiz vormerken → nach Speichern im Notizen-Tab sichtbar.
 * - Edit-Modus: Backlog-Tab und Import-Tab beide vorhanden.
 * - ProjectDetailPage zeigt ausschließlich Hero + „Bearbeiten"-Button.
 * - Edit-Modus: Löschen-Button vorhanden.
 */
```

Mindestens **7 Testfälle.**

Pending-Tests mit `page.reload()` + expliziter Persistenzprüfung.
Isolationstest: Projekt-Task erscheint **nicht** in einem anderen Projekt.

---

## Schritt 5 — Verifikation und Restpunkte

### 5a — `npm run build -w apps/api` nachholen

Im Schritt-7-Log des Ursprungsauftrags fehlt der API-Build. Ausführen und Ergebnis explizit
im Log festhalten:

```bash
npm run build -w apps/api
```

Kein Fehler außer Chunk-Size-Warnungen erlaubt.

### 5b — API-Testzahlen verifizieren

Der Ursprungsauftrag fordert Mindestanzahlen, die im Log nicht belegt wurden:

```bash
# Anzahl der Task-Isolation-Tests zählen (Soll: ≥ 7)
grep -c "it\|test" apps/api/tests/integration/owner-task-relations.test.ts

# Anzahl der Ticket-Isolation-Tests zählen (Soll: ≥ 5)
grep -c "\"Ticket" apps/api/tests/integration/tickets.test.ts
```

Liegt eine Datei unter dem Soll: fehlende Testfälle gemäß dem Ursprungsauftrag (Schritt 10)
ergänzen. Anschließend `npm run test -w apps/api` ausführen.

### 5c — Datei-Upload-Fortschrittsanzeige prüfen

Im Ursprungsauftrag (Schritt 4) ist gefordert:

> Der Speichern-Button zeigt während langer Operationen: „Speichern… (Datei 2 von 5)".

In keinem Log erwähnt. In `apps/web/src/components/tasks/TaskModal.tsx` und
`apps/web/src/components/projects/ProjectForm.tsx` prüfen, ob ein Fortschrittstext beim
sequenziellen Datei-Upload gesetzt wird. Falls nicht vorhanden: ergänzen.

Erwartete Implementierung in der Submit-Sequenz (Beispiel):

```typescript
for (let i = 0; i < pendingFiles.length; i++) {
  setSaveLabel(`Speichern… (Datei ${i + 1} von ${pendingFiles.length})`);
  await uploadAttachment({ type: "task", id: created.id }, pendingFiles[i].file);
}
setSaveLabel("Speichern");
```

Gilt analog für alle Entitäten mit `PendingFileList` (Task, Project, Feature, UseCase).

---

## Abschluss-Checkliste (nach Schritt 5)

```
npm run typecheck -w apps/web      → ✅ Keine Fehler
npm run typecheck -w apps/api      → ✅ Keine Fehler
npm run lint                       → ✅ Keine Fehler
npm run build -w apps/web          → ✅ Kein Fehler (Chunk-Warnung toleriert)
npm run build -w apps/api          → ✅ Kein Fehler          ← neu
npm run test -w apps/api           → ✅ Alle Tests grün
npm run test -w apps/web           → ✅ Alle Tests grün

Playwright owner-tasks.spec.ts     → ✅ Alle Tests grün
Playwright tickets.spec.ts         → ✅ Alle Tests grün
Playwright feature-form.spec.ts    → ✅ Alle Tests grün      ← neu
Playwright project-form.spec.ts    → ✅ Alle Tests grün      ← neu
Playwright project.spec.ts         → ✅ Alle Tests grün
Playwright feature.spec.ts         → ✅ Alle Tests grün
Playwright task.spec.ts            → ✅ Alle Tests grün
```

Tolerierte Altlasten (nicht Gegenstand dieses Auftrags, nicht reparieren):
- `freshness.spec.ts`: 2 bestehende Timeouts
- `project.spec.ts`: 1 bestehender Timeout in Aktualitätsflow

---

## Arbeitsreihenfolge

| Schritt | Kurztitel | Abhängig von |
|---|---|---|
| 0 | Playwright-Startblocker beheben | — |
| 1 | Foundation-Unit-Tests (4 Dateien) | — |
| 2 | Form-Unit-Tests restrukturieren (4 Dateien, 1 löschen) | — |
| 3 | E2E `feature-form.spec.ts` | 0 |
| 4 | E2E `project-form.spec.ts` | 0 |
| 5 | Verifikation: API-Build, Testzahlen, Fortschritt | 1, 2, 3, 4 |

Schritte 1 und 2 sind untereinander unabhängig und können parallel bearbeitet werden.
Schritte 3 und 4 sind untereinander unabhängig, aber beide von Schritt 0 abhängig.

---

## Blocker-Verhalten

- Schritt 0 schlägt fehl → Schritte 3 und 4 überspringen, Schritte 1, 2 und 5 ausführen,
  Playwright-Blocker im Log mit konkreter Fehlermeldung dokumentieren
- Jeder andere Blocker → im Schritt-Log `⚠️` oder `🔴`, nächsten unabhängigen Schritt beginnen
- Bekannte Altlasten (`freshness.spec.ts`, `project.spec.ts`-Timeouts) → dokumentieren, nicht reparieren
