# Codex-Auftrag: TaskForm — Automatisierte Layout-Tests

## Ziel

Playwright-E2E-Tests anlegen, die automatisch Layout-Fehler im `TaskForm`-Modal erkennen: Inputs, die aus ihrem Container fließen, sowie Controls, die vertikal nicht sauber ausgerichtet sind.

---

## Kontext

- **Betroffene Komponente:** `apps/web/src/components/tasks/TaskForm.tsx`
- **Gerendert in:** `apps/web/src/pages/ProjectDetailPage.tsx` (Route: `/projects/:id`)
- **Öffnen der Form:** Button auf der `ProjectDetailPage`, der bei aktivem Tab „Tasks" `taskFormOpen(true)` setzt
- **Playwright-Konfiguration:** `apps/web/playwright.config.ts` — startet API (Port 3001) und Web (Port 5173) automatisch als `webServer`
- **E2E-Verzeichnis:** `apps/web/e2e/` — existiert noch **nicht**, muss angelegt werden
- **Tailwind CSS** — Klassen wie `w-full`, `h-11`, `grid`, `md:grid-cols-2` steuern das Layout

---

## Aufgabe

### Schritt 1 — Verzeichnis anlegen

`apps/web/e2e/` anlegen (leeres Verzeichnis, kein Index nötig).

### Schritt 2 — Testdatei anlegen

Neue Datei: `apps/web/e2e/task-form-layout.spec.ts`

Der Test muss folgende Prüfungen durchführen:

#### 2a — Form öffnen

1. Navigiere zu `/projects`.
2. Klicke auf den ersten sichtbaren Projekteintrag, um zur `ProjectDetailPage` zu gelangen.
3. Stelle sicher, dass der Tab „Tasks" aktiv ist (prüfen per Text oder `aria-selected`).
4. Klicke den Button, der das `TaskForm`-Modal öffnet. Den genauen Selektor aus `ProjectDetailPage.tsx` entnehmen — suche nach dem Handler, der `setTaskFormOpen(true)` aufruft, und identifiziere den Button anhand seines Labels oder seiner Rolle.
5. Warte, bis das Modal sichtbar ist (z. B. `dialog`-Rolle oder Überschrift „Neue Aufgabe").

#### 2b — Overflow-Prüfung (Pflicht)

Führe nach dem Öffnen des Modals folgenden `page.evaluate()`-Block aus:

```ts
const overflowing = await page.evaluate(() => {
  const modal = document.querySelector('[role="dialog"]');
  if (!modal) return [];
  return Array.from(modal.querySelectorAll('input, select, textarea, button'))
    .filter(el => {
      const parent = el.parentElement;
      if (!parent) return false;
      return el.getBoundingClientRect().width > parent.getBoundingClientRect().width + 2; // 2px Toleranz
    })
    .map(el => ({
      tag: el.tagName,
      id: (el as HTMLElement).id,
      className: (el as HTMLElement).className.slice(0, 80),
    }));
});
```

Assertion: `expect(overflowing).toHaveLength(0)` — bei Fehlschlag gibt Playwright die Liste der überfließenden Elemente aus.

#### 2c — Vertikale Ausrichtung in Zweispalten-Zeilen (Pflicht)

Jede `Section` mit `md:grid-cols-2` enthält zwei `FormField`-Kinder. Prüfe, dass deren Oberkanten nicht mehr als **4 px** auseinander liegen:

```ts
const misaligned = await page.evaluate(() => {
  const modal = document.querySelector('[role="dialog"]');
  if (!modal) return [];
  const results: { section: string; diff: number }[] = [];

  modal.querySelectorAll('.grid').forEach(grid => {
    const children = Array.from(grid.children).filter(
      c => c.querySelector('label')
    );
    if (children.length >= 2) {
      for (let i = 0; i < children.length - 1; i++) {
        const a = children[i].getBoundingClientRect().top;
        const b = children[i + 1].getBoundingClientRect().top;
        // Nur Geschwister in derselben Zeile prüfen (top-Werte ähnlich)
        if (Math.abs(a - b) > 4 && Math.abs(a - b) < 100) {
          results.push({
            section: children[i].querySelector('label')?.textContent ?? '?',
            diff: Math.round(Math.abs(a - b)),
          });
        }
      }
    }
  });
  return results;
});
```

Assertion: `expect(misaligned).toHaveLength(0)` — bei Fehlschlag zeigt der Output, welche Label-Paare versetzt sind.

#### 2d — Screenshot für visuelle Regression (Pflicht)

Nach den programmatischen Prüfungen einen Screenshot des geöffneten Modals aufnehmen:

```ts
await expect(page.locator('[role="dialog"]')).toHaveScreenshot('task-form-modal.png');
```

Beim ersten Lauf legt Playwright die Baseline automatisch an. Jede spätere Abweichung schlägt den Test fehl.

---

## Regeln & Einschränkungen

- **Keine Produktions-DB anfassen.** Der Test legt ggf. über die API eine Test-Ressource an — diese muss am Ende des Tests wieder gelöscht werden (`afterEach`/`afterAll`).
- **Serielle Ausführung.** Keine parallelen `page`-Instanzen innerhalb dieser Datei.
- **Toleranzwerte** (Overflow: 2 px, Alignment: 4 px) sind bewusst großzügig gewählt, um Sub-Pixel-Rendering nicht fälschlicherweise zu melden.
- **Pflicht-Kommentar** am Dateianfang (gemäß `agents.md` Abschnitt 11):

```ts
// @ts-check
/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Inputs und Controls fließen nicht aus ihrem Container.
 * - Label/Input-Paare in Zweispalten-Layouts sind vertikal ausgerichtet (max. 4 px Versatz).
 *
 * Fehlerfälle:
 * - Überfließende Elemente werden namentlich gemeldet (Tag, id, className).
 * - Versetzte Label-Paare werden mit Versatzwert gemeldet.
 *
 * Ziel:
 * Layout-Regressionssicherung für das TaskForm-Modal gegen Overflow- und Alignment-Fehler.
 */
```

---

## Randfälle & Fehlerpfade

- **Kein Projekt vorhanden:** Wenn `/projects` keine Projekte anzeigt, soll der Test via API (`POST /api/projects`) ein Testprojekt anlegen und es am Ende wieder löschen.
- **Modal öffnet nicht:** Wenn der Button-Selektor nicht trifft, soll der Test mit einer klaren Fehlermeldung abbrechen (`expect(dialog).toBeVisible()` vor den Layout-Prüfungen).
- **Viewport-Abhängigkeit:** Tests laufen im Default-Viewport von Playwright (1280 × 720). Die `md:grid-cols-2`-Klasse greift erst ab 768 px — der Default-Viewport reicht.

---

## Seiteneffekte

- Die Datei `apps/web/e2e/task-form-layout.spec.ts` ist neu — kein bestehender Code wird verändert.
- Playwright legt einen Snapshot-Ordner `apps/web/e2e/task-form-layout.spec.ts-snapshots/` an — dieser gehört ins Repo (`.gitignore` nicht eintragen).
- Der `webServer`-Block in `playwright.config.ts` startet beim Testlauf automatisch API und Web — keine manuelle Anpassung der Config nötig.

---

## Testhinweise

Der Test gilt als erfolgreich, wenn:
1. `overflowing` ist leer.
2. `misaligned` ist leer.
3. Der Screenshot weicht nicht von der Baseline ab.

Beim allerersten Lauf (`npx playwright test --update-snapshots`) wird nur die Baseline erstellt; Assertions 1 und 2 müssen dabei bereits grün sein.

Ausführung:
```bash
npx playwright test e2e/task-form-layout.spec.ts --project=chromium
```
(im Verzeichnis `apps/web/` oder via `npm run test:e2e -w apps/web` falls das Kommando existiert)

---

## Auftragsklassifikation (für Codex)

**Klasse 4 — Kleiner lokaler Fix in bestehender Struktur.**

Begründung: Es wird eine neue Datei in einem bereits konfigurierten Framework (Playwright) angelegt. Keine bestehenden Dateien werden geändert. Kein neues Feature, keine Schemaänderung.

Startschritte:
1. `apps/web/e2e/` anlegen.
2. `ProjectDetailPage.tsx` gezielt nach dem Button-Selektor für `setTaskFormOpen(true)` lesen.
3. `task-form-layout.spec.ts` schreiben.
4. Testlauf lokal ausführen und Ergebnis berichten.
