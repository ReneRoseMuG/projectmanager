# Codex-Auftrag: Views und Detailseiten in Browser-Tabs öffnen

## Ziel

Alle Hauptansichten der Sidebar und alle Detailseiten-Formulare können per Klick in einem neuen Browser-Tab geöffnet werden. Der ursprüngliche Tab kehrt dabei zur vorherigen Listenansicht zurück.

---

## Kontext

Die App ist eine React-SPA mit React Router. Alle Hauptansichten (`/projects`, `/tickets`, `/features`, `/wiki`, `/calendar`) und alle Detailseiten (`/features/:id`, `/tasks/:id` usw.) haben eigene URL-Routen. Formulare werden immer per Navigation geöffnet — nie als Modal-Overlay über einer Liste.

Das Feature ist rein frontend-seitig. Es werden keine neuen Routen, kein Backend-Code und keine Datenbankänderungen benötigt.

Betroffene Architekturschichten:
- `apps/web/src/components/layout/Sidebar.tsx` — Navigation
- `apps/web/src/components/ui/FormModal.tsx` — universelle Formular-Hülle
- Domain-Form-Komponenten (8 Stück) — Prop-Durchreichung
- Detail-Pages (8 Stück) — Logik für `openInTab`

---

## Aufgabe

### Schritt 1 — `FormModal.tsx`: neues Prop und Button

`FormModal` erhält ein optionales Prop `onOpenInTab?: () => void`. Ist es gesetzt, erscheint im Header ein `ExternalLink`-Icon-Button (aus `lucide-react`, `size={18}`) links neben dem bestehenden X-Button.

```tsx
interface FormModalProps {
  // ... bestehende Props unverändert ...
  onOpenInTab?: () => void;
}

// Im Header, vor dem X-Button:
<div className="flex shrink-0 items-center gap-1">
  {onOpenInTab ? (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white"
      aria-label="In neuem Tab öffnen"
      title="In neuem Tab öffnen"
      onClick={onOpenInTab}
    >
      <ExternalLink size={18} />
    </button>
  ) : null}
  {/* bestehender X-Button bleibt unverändert */}
</div>
```

### Schritt 2 — Domain-Form-Komponenten: Prop durchreichen

Vor der Umsetzung prüfen welche Komponenten `FormModal` verwenden:
```bash
grep -r "FormModal" apps/web/src/components --include="*.tsx" -l
```

Jede gefundene Komponente erhält `onOpenInTab?: () => void` als optionales Prop und reicht es ohne eigene Logik an `FormModal` weiter. Bekannte Dateien:

| Komponente | Pfad |
|---|---|
| `FeatureForm` | `components/features/FeatureForm.tsx` |
| `TaskForm` | `components/tasks/TaskForm.tsx` |
| `MilestoneForm` | `components/milestones/MilestoneForm.tsx` |
| `BacklogItemForm` | `components/backlog/BacklogItemForm.tsx` |
| `UseCaseForm` | `components/usecases/UseCaseForm.tsx` |
| `WikiPageForm` | `components/wiki/WikiPageForm.tsx` |
| `EventForm` | `components/calendar/EventForm.tsx` |

### Schritt 3 — Detail-Pages: `openInTab` verdrahten

Jede Detail-Page berechnet `openInTab` im Edit-Modus und übergibt es der Form-Komponente. Im Create-Modus bleibt das Prop `undefined`.

```tsx
const openInTab = !isCreateMode && id
  ? () => {
      window.open(`/<domäne>/${id}`, '_blank');
      navigate(returnTo);
    }
  : undefined;

<DomäneForm ... onOpenInTab={openInTab} />
```

Die saubere URL (ohne `?returnTo=...`) wird im neuen Tab geöffnet. Der aktuelle Tab navigiert via bestehendem `returnTo`-Wert zurück.

| Detail-Page | Entity-URL |
|---|---|
| `FeatureDetailPage.tsx` | `/features/${featureId}` |
| `TaskDetailPage.tsx` | `/tasks/${taskId}` |
| `TicketDetailPage.tsx` | `/tickets/${ticketId}` |
| `MilestoneDetailPage.tsx` | `/milestones/${milestoneId}` |
| `BacklogItemDetailPage.tsx` | `/backlog/${backlogItemId}` |
| `UseCaseDetailPage.tsx` | `/use-cases/${useCaseId}` |
| `ProjectDetailPage.tsx` | `/projects/${projectId}` |
| `WikiPage.tsx` | `/wiki/${pageId}` |

### Schritt 4 — `Sidebar.tsx`: Hover-Button

Alle Nav-Einträge bekommen beim Hovern einen sichtbaren `ExternalLink`-Button. `e.preventDefault()` und `e.stopPropagation()` verhindern, dass der NavLink gleichzeitig navigiert.

```tsx
<NavLink
  className={({ isActive }) =>
    `group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
      isActive ? "bg-white font-semibold text-steel-700 shadow-md"
               : "text-white/75 hover:bg-white/5 hover:text-white"
    }`
  }
  to={item.to}
>
  <Icon size={17} />
  {item.label}
  <button
    type="button"
    className="ml-auto flex h-6 w-6 items-center justify-center rounded opacity-0 transition hover:bg-white/20 group-hover:opacity-100"
    title={`${item.label} in neuem Tab öffnen`}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(item.to, '_blank');
    }}
  >
    <ExternalLink size={13} />
  </button>
</NavLink>
```

---

## Regeln & Einschränkungen

- `onOpenInTab` ist in allen Form-Komponenten und `FormModal` **optional** — kein Prop-Fehler wenn es fehlt.
- Im Create-Modus (keine ID) darf `openInTab` **niemals** gesetzt werden. Eine URL ohne ID wäre bedeutungslos.
- Die URL, die `window.open` erhält, enthält **keinen** `returnTo`-Parameter.
- `navigate(returnTo)` wird **nach** `window.open` aufgerufen — nie davor.
- Keine neuen Routen, kein Backend-Code, keine Datenbankänderungen.
- Keine neuen Tailwind-Klassen außer vorhandenen Design-Tokens der App.
- Alle Icons aus `lucide-react`. Größen: `size={18}` im FormModal-Header, `size={13}` im Sidebar-Button.

---

## Randfälle & Fehlerpfade

| Fall | Erwartetes Verhalten |
|---|---|
| `window.open` vom Browser blockiert (Popup-Blocker) | Kein Fehler, kein Toast — Browser zeigt eigene Blockier-Meldung. `navigate(returnTo)` wird trotzdem ausgeführt. |
| `returnTo` fehlt in `searchParams` | Fallback-Wert aus der Detail-Page (`/features`, `/projects` usw.) greift — bestehende Logik unverändert. |
| Detail-Page im Create-Modus | `openInTab` ist `undefined`, kein Button. Kein Sonderfall nötig. |
| NavLink-Klick + Button-Klick gleichzeitig | `e.stopPropagation()` verhindert doppelte Aktion. Nur `window.open` wird ausgeführt. |
| Formular noch nicht gespeichert, dann „In Tab öffnen" | Der neue Tab lädt die gespeicherte Version. Ungespeicherte Änderungen bleiben im alten Tab — kein automatisches Speichern, kein Hinweis nötig. |

---

## Seiteneffekte

- **Keine Backend-Seiteneffekte.** Das Feature berührt keine API-Endpunkte.
- **Keine Routing-Seiteneffekte.** Bestehende Navigationsabläufe, `returnTo`-Logik und Browser-History bleiben unverändert.
- **Bestehende Tests bleiben grün.** Da `onOpenInTab` überall optional ist, entstehen keine Regressions durch fehlende Verdrahtung — der Button fehlt dann einfach stillschweigend.
- **`agents.md` wird erweitert** um Abschnitt 15.8, damit neue Views und Detail-Pages die Konvention automatisch kennen.

---

## Testhinweise

### Testregime

Alle Tests verwenden `vitest` + `@testing-library/dom`. `window.open` wird in betroffenen Tests via `vi.spyOn(window, 'open').mockImplementation(() => null)` gemockt. `renderWithProviders` aus `components/test/ownerFormTestUtils.tsx` liefert MemoryRouter, ToastProvider und ConfirmDialogProvider.

**Kein Test ist optional.** Alle unten aufgeführten Testfälle müssen vor Abnahme grün sein. `test.skip` und `it.skip` sind ohne dokumentierten Blocker im Log unzulässig.

---

### Testdatei 1 — `components/layout/__tests__/Sidebar.test.tsx` (neu)

```ts
/**
 * Test Scope: Sidebar – In-Tab-öffnen-Button
 *
 * Abgedeckte Regeln:
 * - Für jeden Nav-Eintrag existiert ein „In neuem Tab öffnen"-Button im DOM
 * - Klick ruft window.open(path, '_blank') auf
 * - Klick löst keine Router-Navigation im aktuellen Tab aus
 *
 * Fehlerfälle:
 * - NavLink-Klick darf window.open nicht aufrufen
 *
 * Ziel:
 * Sicherstellen, dass alle Sidebar-Einträge den Tab-Button korrekt rendern
 * und window.open mit dem richtigen Pfad aufrufen.
 */
```

| # | Testfall |
|---|---|
| 1 | Alle 5 Nav-Einträge haben je einen Button mit `title="<Label> in neuem Tab öffnen"` |
| 2 | Klick auf den Button bei `/features` → `window.open('/features', '_blank')` aufgerufen |
| 3 | Klick auf den Button → `location.pathname` ändert sich nicht |
| 4 | Klick auf den NavLink-Text → `window.open` wird **nicht** aufgerufen |

---

### Testdatei 2 — Erweiterung bestehender Form-Testdateien

In den folgenden Testdateien werden am Ende des `describe`-Blocks je zwei neue Testfälle ergänzt:

```ts
it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button, wenn onOpenInTab übergeben wird", () => {
  const onOpenInTab = vi.fn();
  renderWithProviders(<DomäneForm open entity={fixture} onSubmit={vi.fn()} onClose={vi.fn()} onOpenInTab={onOpenInTab} />);
  expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
});

it("zeigt im Edit-Modus keinen 'In neuem Tab öffnen'-Button, wenn onOpenInTab fehlt", () => {
  renderWithProviders(<DomäneForm open entity={fixture} onSubmit={vi.fn()} onClose={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
});
```

| Testdatei | Fixture |
|---|---|
| `components/features/__tests__/FeatureForm.test.tsx` | `feature` |
| `components/tasks/__tests__/TaskForm.test.tsx` | `task` |
| `components/milestones/__tests__/MilestoneForm.test.tsx` | `milestone` (prüfen) |
| `components/backlog/__tests__/BacklogItemForm.test.tsx` | `backlogItem` (prüfen) |

Existiert für eine Form-Komponente noch keine Testdatei, legt Codex sie mit Pflicht-Kommentar und den zwei neuen Testfällen an.

---

### Testdateien 3–10 — Detail-Pages (`pages/__tests__/`)

Für jede Detail-Page eine neue Testdatei mit je 3 Testfällen. Das Mock-Pattern ist für alle Pages identisch.

**Gemeinsames Mock-Pattern:**

```ts
// @vitest-environment jsdom

const navigateSpy = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => navigateSpy,
    useParams: () => ({ id: "10" }),
    useSearchParams: () => [new URLSearchParams("returnTo=%2Ffeatures"), vi.fn()],
  };
});

vi.mock("../../hooks/use<Domäne>", () => ({
  use<Domäne>: () => ({
    <entity>: { id: 10, title: "Test", version: 1, /* Mindest-Felder */ },
    loading: false,
    update<Entity>: vi.fn(),
    reload: vi.fn(),
  }),
}));

beforeEach(() => {
  navigateSpy.mockReset();
  vi.spyOn(window, "open").mockImplementation(() => null);
});
```

**3 Testfälle pro Datei:**

| # | Testfall |
|---|---|
| 1 | Edit-Modus: `„In neuem Tab öffnen"`-Button sichtbar |
| 2 | Edit-Modus: Klick → `window.open("/<domäne>/10", "_blank")` + `navigate("/features")` |
| 3 | Create-Modus (`useParams` gibt `{}` zurück): kein Button |

Für Testfall 3 überschreibt Codex `useParams` testlokal via `mockReturnValueOnce({})`.

**Betroffene Testdateien:**

| Datei | Hook | URL |
|---|---|---|
| `pages/__tests__/FeatureDetailPage.test.tsx` | `useFeatures` | `/features/10` |
| `pages/__tests__/TaskDetailPage.test.tsx` | `useTaskDetail` | `/tasks/10` |
| `pages/__tests__/TicketDetailPage.test.tsx` | `useTicketDetail` | `/tickets/10` |
| `pages/__tests__/MilestoneDetailPage.test.tsx` | `useMilestones` | `/milestones/10` |
| `pages/__tests__/BacklogItemDetailPage.test.tsx` | `useBacklog` | `/backlog/10` |
| `pages/__tests__/UseCaseDetailPage.test.tsx` | `useUseCases` | `/use-cases/10` |
| `pages/__tests__/ProjectDetailPage.test.tsx` | `useProjects` | `/projects/10` |
| `pages/__tests__/WikiPage.test.tsx` | `useWiki` | `/wiki/10` |

Codex liest jede Detail-Page vor der Implementierung, um das Mindest-Fixture für den Domain-Hook korrekt zu bestimmen.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn **alle** der folgenden Punkte erfüllt sind:

- [ ] `FormModal` hat `onOpenInTab?: () => void` — Button erscheint nur wenn Prop gesetzt
- [ ] Button erscheint **nicht** im Create-Modus einer beliebigen Detail-Page
- [ ] Alle 8 Detail-Pages verdrahten `openInTab` im Edit-Modus korrekt
- [ ] `window.open` erhält die saubere Entity-URL ohne `returnTo`-Parameter
- [ ] Nach Klick auf „In Tab öffnen" kehrt der aktuelle Tab via `navigate(returnTo)` zur Liste zurück
- [ ] `Sidebar.tsx`: alle 5 Nav-Einträge haben den Hover-Button
- [ ] `e.preventDefault()` und `e.stopPropagation()` im Sidebar-Button-Click gesetzt
- [ ] `agents.md` Abschnitt 15.8 eingefügt
- [ ] `Sidebar.test.tsx` — alle 4 Testfälle grün
- [ ] Bestehende Form-Testdateien — je 2 neue Testfälle grün
- [ ] Alle 8 Detail-Page-Testdateien — je 3 Testfälle grün
- [ ] `npm run test -w apps/web` vollständig grün — keine bestehenden Tests rot

---

## Implementierungsreihenfolge

Codex implementiert seriell in dieser Reihenfolge:

1. `FormModal.tsx` — Prop und Button ergänzen
2. Alle Domain-Form-Komponenten — `onOpenInTab` durchreichen (Grep-Check vorab)
3. Bestehende Form-Testdateien — je 2 neue Testfälle
4. Alle 8 Detail-Pages — `openInTab` berechnen und übergeben
5. `pages/__tests__/` — alle 8 Detail-Page-Testdateien anlegen
6. `Sidebar.tsx` — Hover-Button ergänzen
7. `components/layout/__tests__/Sidebar.test.tsx` — neue Testdatei
8. `agents.md` — Abschnitt 15.8 einfügen
9. `npm run test -w apps/web` ausführen — Ergebnis berichten
10. Schritt-Log schreiben

---

## Referenz

- `agents.md` — Arbeitsanweisung
- `apps/web/src/components/ui/FormModal.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/test/ownerFormTestUtils.tsx`
- `docs/architecture-leitfaden.md`
