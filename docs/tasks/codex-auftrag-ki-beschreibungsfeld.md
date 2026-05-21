# Codex-Aufgabe: „Mit KI bearbeiten"-Button an Beschreibungsfeldern

## Aufgabenbeschreibung

Alle langen Beschreibungsfelder der App (Tasks, Tickets, Projekte, Milestones usw.) nutzen
die Komponente `RichTextInlineField`. Diese soll einen kleinen „Mit KI bearbeiten"-Button
erhalten. Der Nutzer tippt eine Anweisung in natürlicher Sprache (z. B. „Fasse kürzer zusammen"
oder „Schreibe eine Beschreibung für eine Login-Bug-Aufgabe"), die KI erzeugt daraus neuen
HTML-Inhalt, und das Ergebnis wird direkt in das Feld übernommen.

Der Button löst denselben Backend-Endpunkt (`POST /ai/text`) aus, der in der Toolbar des
Rich-Text-Editors bereits für „Umformulieren" und „Absatz formatieren" genutzt wird.
Es werden **keine Backend-Änderungen** benötigt.

Der Kontext für die KI ist durch den Button implizit festgelegt: Die KI kennt immer den
aktuellen Inhalt des Feldes, an dem der Button angeklickt wurde.

---

## Scope

| Datei | Änderung |
|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | Button hinzufügen, Dialog einbinden |
| `apps/web/src/components/ai/AiFieldEditDialog.tsx` | Neue Komponente (Dialog) |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | Tests für neuen Button |
| `tests/unit/web/components/ai/AiFieldEditDialog.test.tsx` | Tests für neuen Dialog |

Keine Änderungen an: Schema, Migrations, Repositories, Services, Routes, `shared-types`.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden:
`docs/architecture-leitfaden.md`

Lies dann vollständig:
- `apps/web/src/components/ui/rich-text-inline-field.tsx`
- `apps/web/src/api/ai.ts`
- `tests/unit/web/components/ui/rich-text-inline-field.test.tsx`

Erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `rich-text-inline-field.tsx` | Pencil-Icon bei Hover; Toolbar mit KI-Buttons im Edit-Modus | Zusätzlich: „Mit KI bearbeiten"-Button bei Hover in der View-Ansicht |
| `AiFieldEditDialog.tsx` | Existiert nicht | Neue Komponente: Anweisungs-Textarea + Generate-Button |

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Neuer Dialog `AiFieldEditDialog`

Neue Datei anlegen: `apps/web/src/components/ai/AiFieldEditDialog.tsx`

### Props

```typescript
interface AiFieldEditDialogProps {
  open: boolean;
  currentHtml: string;        // Aktueller Feldinhalt — wird als Kontext an die KI übergeben
  onApply: (html: string) => void;  // Wird mit dem KI-Ergebnis aufgerufen
  onClose: () => void;
}
```

### Verhalten

1. Der Dialog zeigt ein `<textarea>` mit Label „Anweisung" und einem Placeholder wie
   *„z. B. „Fasse kürzer zusammen" oder „Schreibe eine Einleitung über Login-Probleme""*
2. Ein „Generieren"-Button ruft `assistAiText` aus `../../api/ai` auf:
   ```typescript
   assistAiText({ html: currentHtml, operation: "rewrite", instruction: userInstruction })
   ```
   - `currentHtml` kann leer sein — dann generiert die KI einen neuen Text aus der Anweisung
   - `operation` ist immer `"rewrite"`, weil der Nutzer via Freitext-Anweisung steuert
3. Während des API-Calls zeigt der Button einen Ladeindikator und ist deaktiviert
4. Bei Erfolg: `onApply(result.html)` aufrufen und Dialog schließen
5. Bei Fehler: Toast mit Fehlermeldung (Pattern aus anderen Komponenten übernehmen,
   z. B. `useToast` + `errorMessage`)
6. Ein „Abbrechen"-Button ruft `onClose()` auf

### UI-Komponenten

Vorhandene UI-Komponenten der App verwenden:
- `Modal` für den Dialog-Rahmen (`size="md"`)
- `FormField` + `<textarea>` für die Anweisung (kein `Input`, da mehrzeilig)
- `Button` für „Generieren" (`variant="primary"`, `icon=<Sparkles />`) und „Abbrechen"
  (`variant="secondary"`)

---

## Schritt 3: Button in `RichTextInlineField` einbauen

### Position

Der Button erscheint in der **View-Ansicht** (nicht im Edit-Modus), beim Hover über das Feld,
direkt neben dem bereits vorhandenen Pencil-Icon. Beide Icons liegen im gleichen
`absolute`-Container oben rechts.

### Button-Design

- Icon: `Sparkles` (16 px, aus `lucide-react`) — konsistent mit KI-Funktionen in der Toolbar
- Kein Label-Text, nur Tooltip (`title="Mit KI bearbeiten"`)
- Gleiche Klassen wie das Pencil-Icon: klein, halbtransparent, bei Hover sichtbar

### Verhalten

- Klick öffnet `AiFieldEditDialog` mit `currentHtml = value ?? ""`
- `onApply`: neues HTML via `onChange(html)` setzen und das Feld in den Edit-Modus
  versetzen, damit der Nutzer das Ergebnis sehen und bei Bedarf noch manuell anpassen kann
- Der Button ist **nicht** sichtbar, wenn `readOnly={true}`

### Zustand

Ein lokales `useState<boolean>` für `dialogOpen` im `RichTextInlineField` genügt.

---

## Schritt 4: Tests

Unit-Tests allein beweisen die Funktion nicht — sie mocken den API-Aufruf und prüfen
nur den Komponent-Code isoliert. Für echten Nachweis sind drei Testebenen nötig.

---

### 4a — Unit-Tests für `AiFieldEditDialog`

Datei: `tests/unit/web/components/ai/AiFieldEditDialog.test.tsx`

Szenarien:
- Dialog wird nicht gerendert, wenn `open={false}`
- Dialog wird gerendert, wenn `open={true}`
- „Generieren" ist deaktiviert, solange die Anweisung leer ist
- `assistAiText` wird mit korrekten Parametern aufgerufen (mock)
- Bei Erfolg: `onApply` wird mit dem zurückgegebenen HTML aufgerufen
- Bei Fehler: Toast wird angezeigt, Dialog bleibt offen
- „Abbrechen" ruft `onClose` auf

### 4b — Unit-Tests für `RichTextInlineField`

Ergänzung in: `tests/unit/web/components/ui/rich-text-inline-field.test.tsx`

Szenarien:
- „Mit KI bearbeiten"-Button ist im Normalzustand vorhanden (nach hover/render)
- Button ist nicht vorhanden, wenn `readOnly={true}`
- Klick auf Button öffnet den `AiFieldEditDialog`

---

### 4c — API-Integrationstest: Agent erstellt Aufgabe (Vitest + echte SQLite-DB)

Ergänzung in: `tests/integration/api/ai.test.ts`

Das Ollama-Modell wird für den **Execute**-Pfad nicht benötigt — der Test übergibt
eine fertig gebaute Action direkt an `POST /ai/agent/execute` und prüft das
Datenbankergebnis. Kein laufendes Ollama erforderlich.

Szenarien:

**createTask via Agent:**
- Voraussetzung: Projekt und Meilenstein in der Test-DB anlegen
- `POST /ai/agent/execute` mit einer validen `createTask`-Action absenden
  (Payload enthält `ownerType`, `ownerId`, `title`, `description`)
- Erwartung: HTTP 200, `results[0].success === true`, `results[0].entityId` ist gesetzt
- Nachprüfung: `GET /tasks/:id` gibt die neu erstellte Aufgabe zurück,
  `title` und `description` stimmen mit dem Payload überein

**Ungültige Action wird abgelehnt:**
- `POST /ai/agent/execute` ohne `requiresConfirmation: true` → HTTP 400
- `POST /ai/agent/execute` mit unbekanntem `type` → HTTP 400

---

### 4d — E2E-Tests im Browser (Playwright)

Neue Datei: `tests/browser/web/ai.spec.ts`

**Keine Mocks.** Der Planungsschritt (Ollama) wird übersprungen. Beide Szenarien
steuern den **Execute-Pfad direkt** an — entweder über die API oder über den
„Ausführen"-Button mit einem vorab per API erzeugten Plan-State.

**Szenario 1 — Agent legt Aufgabe an:**
1. Projekt und Meilenstein per API-Fixture anlegen (echter API-Aufruf im `beforeEach`)
2. Den Execute-Endpunkt direkt aufrufen (`POST /api/ai/agent/execute` mit einer
   fertigen `createTask`-Action als echter HTTP-Request im Test)
3. Anschließend die App im Browser laden und zum Task-Board des Meilensteins navigieren
4. Erwartung: Die neu angelegte Aufgabe ist im Board sichtbar — ohne Reload

**Szenario 2 — „Mit KI bearbeiten" füllt Beschreibungsfeld:**
1. Aufgabe per API-Fixture anlegen
2. Task-Formular im Browser öffnen
3. „Mit KI bearbeiten"-Button am Beschreibungsfeld klicken
4. Den `/ai/text`-Aufruf durch direktes Absetzen eines echten API-Requests im Test
   vorbereiten ist hier nicht möglich — stattdessen: Ollama muss lokal laufen.
   Der Test wird mit `test.skip` markiert und dokumentiert, dass er eine
   laufende Ollama-Instanz voraussetzt. Er läuft nicht in CI.
   Alternativ: Anweisung eingeben → „Generieren" → prüfen, ob das Feld danach
   nicht mehr leer ist (ohne den konkreten Inhalt zu prüfen) — so dass der Test
   mit jedem laufenden Modell besteht.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen, wenn **alle** folgenden Punkte erfüllt sind:

- [ ] `AiFieldEditDialog` existiert und ist eigenständig testbar
- [ ] „Mit KI bearbeiten"-Button erscheint an allen `RichTextInlineField`-Instanzen
      (Task-Beschreibung, Ticket-Beschreibung, Projekt-Beschreibung, Milestone-Beschreibung etc.)
- [ ] Button ist bei `readOnly={true}` nicht sichtbar
- [ ] Erfolgreiche KI-Antwort wird in das Feld übernommen; Feld wechselt in den Edit-Modus
- [ ] Fehlerfall zeigt Toast, Dialog bleibt offen
- [ ] Kein neuer Backend-Code; kein Eingriff in `shared-types`, Schema oder Services
- [ ] Unit-Tests (4a, 4b) vorhanden und grün
- [ ] API-Integrationstest (4c): `createTask` via Agent legt echten Datensatz in SQLite an
- [ ] E2E-Tests (4d): Agent-Flow und Beschreibungsfeld-Button im Browser nachgewiesen
- [ ] Keine bestehenden Tests gebrochen (`vitest run` und `playwright test` vollständig grün)

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Betroffene Komponente: `apps/web/src/components/ui/rich-text-inline-field.tsx`
- Bestehender KI-API-Aufruf: `apps/web/src/api/ai.ts` → `assistAiText`
- Vorhandene KI-Panel-Komponente als Stil-Referenz: `apps/web/src/components/ai/AiAgentPanel.tsx`
- Bestehende Tests: `tests/unit/web/components/ui/rich-text-inline-field.test.tsx`
