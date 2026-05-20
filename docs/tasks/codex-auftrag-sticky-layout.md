# Codex-Auftrag: Sticky Tab Bar & Footer für alle Detail- und Formularseiten

## Ziel

Tab Bar und Footer-Buttons sollen auf allen Detail- und Formularseiten immer sichtbar sein.
Im `variant="page"`-Modus scrollt der Formular-Header zunächst aus dem Bild; sobald er verschwunden ist, klebt die Tab Bar oben am Rand. Der Footer klebt immer unten. Der Formularinhalt scrollt dazwischen durch. Im `variant="modal"`-Modus bleibt das bestehende Verhalten (Tab Bar und Footer sind shrink-0 in einem begrenzten Modal-Container).

---

## Kontext

Das Projekt ist eine React/TypeScript-SPA unter `apps/web/src/`. Alle Detail- und Formularseiten nutzen zwei zentrale Shell-Komponenten:

- **`FormModal.tsx`** (`components/ui/FormModal.tsx`) — Hülle für editierbare Formulare (Projekt, Aufgabe, Feature, Ticket).
- **`DetailModal.tsx`** (`components/ui/DetailModal.tsx`) — Hülle für Detailansichten (read-only + Footer-Aktionen).

Beide Shells unterstützen zwei Varianten:
- `variant="modal"` — Eingebettet in einen `<Modal>`-Overlay mit begrenzter Höhe.
- `variant="page"` — Als Vollseite gerendert, direkt in `<main>` von `App.tsx`.

**Das Kernproblem liegt in `FormModal.tsx`:** Children (inkl. der `<TabBar>`) werden dort in einen einzigen `overflow-auto`-Container gewickelt. Die Tab Bar scrollt damit komplett weg.

**Zweites Problem in `App.tsx`:** Der `<main>`-Bereich hat kein `overflow-auto` – die gesamte Seite (inkl. Sidebar und TopBar) scrollt am Fenster. Das macht `position: sticky` unzuverlässig, weil der Scroll-Container die gesamte Seite ist und sich der Sticky-Offset daher auf das Dokumentfenster bezieht, nicht auf den Content-Bereich.

---

## Scope der betroffenen Dateien

| Datei | Änderungstyp |
|---|---|
| `apps/web/src/App.tsx` | Layout-Fix: `main` bekommt `overflow-auto` |
| `components/ui/FormModal.tsx` | Kern-Fix: neues `tabBar`-Prop, separates Rendering |
| `components/ui/DetailModal.tsx` | Kern-Fix: Page-Variante nutzt Sticky statt Bounded-Container |
| `components/projects/ProjectForm.tsx` | Migration: `tabBar`-Prop statt Kind-Element |
| `components/tasks/TaskForm.tsx` | Migration: `tabBar`-Prop statt Kind-Element |
| `components/features/FeatureForm.tsx` | Migration: `tabBar`-Prop statt Kind-Element |

`TicketForm.tsx` hat keine Tab Bar → **keine Änderung nötig**.

---

## Aufgabe (Schritt für Schritt)

### Schritt 1 — `App.tsx`: Content-Bereich als Scroll-Container

**Ziel:** Nur `<main>` soll scrollen. Sidebar und TopBar bleiben immer sichtbar. Das erlaubt `sticky top-0` innerhalb des Content-Bereichs.

**Änderungen:**

```tsx
// VORHER
<div className="flex min-h-screen bg-shell text-ink">
  ...
  <main className="min-w-0 flex-1 p-4 md:p-6">

// NACHHER
<div className="flex h-screen overflow-hidden bg-shell text-ink">
  ...
  <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
```

Der äußere Container wechselt von `min-h-screen` (wächst mit Inhalt → Fenster scrollt) zu `h-screen overflow-hidden` (fixiert auf Viewport). Der `<main>` scrollt jetzt intern. Der Flex-Column mit TopBar + `<main>` muss ebenfalls `overflow-hidden` tragen, damit er nicht aus dem Viewport herauswächst:

```tsx
// VORHER
<div className="flex min-w-0 flex-1 flex-col">

// NACHHER
<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
```

---

### Schritt 2 — `FormModal.tsx`: `tabBar`-Prop + variante Layouts

**Ziel:** Die Tab Bar soll **außerhalb** des scrollbaren `children`-Containers stehen. Im Modal-Modus bleibt sie `shrink-0`, im Page-Modus wird sie `sticky`.

**Änderungen am Interface:**

```tsx
interface FormModalProps {
  // ...alle bestehenden Props bleiben unverändert...
  tabBar?: ReactNode;  // NEU
}
```

**Änderungen an der Render-Logik — Page-Variante:**

```tsx
// VORHER (page)
<form className="flex min-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-2xl bg-shell shadow-panel" onSubmit={submit}>
  <header className="relative shrink-0 overflow-hidden ...">...</header>
  <div className="grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:p-5">{children}</div>
  <footer className="flex shrink-0 ...">...</footer>
</form>

// NACHHER (page)
<form className="flex flex-col rounded-2xl bg-shell shadow-panel" onSubmit={submit}>
  <header className="relative overflow-hidden ...">...</header>
  {tabBar ? <div className="sticky top-0 z-20">{tabBar}</div> : null}
  <div className="grid content-start gap-4 p-4 md:p-5">{children}</div>
  <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-4">
    ...  {/* Buttons bleiben identisch */}
  </footer>
</form>
```

**Änderungen an der Render-Logik — Modal-Variante:**

```tsx
// VORHER (modal)
<form className="flex max-h-[calc(100vh-64px)] flex-col bg-shell" onSubmit={submit}>
  <header className="relative shrink-0 overflow-hidden ...">...</header>
  <div className="grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:p-5">{children}</div>
  <footer className="flex shrink-0 ...">...</footer>
</form>

// NACHHER (modal)
<form className="flex max-h-[calc(100vh-64px)] flex-col bg-shell" onSubmit={submit}>
  <header className="relative shrink-0 overflow-hidden ...">...</header>
  {tabBar ? <div className="shrink-0">{tabBar}</div> : null}
  <div className="grid min-h-0 flex-1 content-start gap-4 overflow-auto p-4 md:p-5">{children}</div>
  <footer className="flex shrink-0 ...">...</footer>
</form>
```

> **Wichtig:** `shrink-0` auf dem `<header>` bleibt im Modal-Mode. Im Page-Mode ist `shrink-0` am Header nicht nötig (kein Flex-Kontext mit overflow-Constraint). Bestehende Klassen am Header bleiben unverändert.

---

### Schritt 3 — `DetailModal.tsx`: Page-Variante mit Sticky

**Ziel:** Gleiche Strategie wie `FormModal`. Die Tab Bar ist bereits korrekt außerhalb des `<main overflow-auto>` platziert (Modal-Mode ✓). Im Page-Mode muss nur das Höhenbindungs-Muster entfernt und Sticky-Klassen hinzugefügt werden.

**Änderungen — Page-Variante:**

```tsx
// VORHER (page)
<div className="flex min-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-2xl bg-shell shadow-panel">
  <header className="relative shrink-0 ...">...</header>
  <TabBar tabs={tabs} active={activeTab} onChange={onTabChange} />
  <main className="min-h-0 flex-1 overflow-auto p-4 md:p-5">{children}</main>
  {footer ? <footer className="shrink-0 ...">{footer}</footer> : null}
</div>

// NACHHER (page)
<div className="flex flex-col rounded-2xl bg-shell shadow-panel">
  <header className="relative overflow-hidden ...">...</header>
  <div className="sticky top-0 z-20">
    <TabBar tabs={tabs} active={activeTab} onChange={onTabChange} />
  </div>
  <main className="p-4 md:p-5">{children}</main>
  {footer ? (
    <footer className="sticky bottom-0 z-10 border-t border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-end gap-3">{footer}</div>
    </footer>
  ) : null}
</div>
```

**Modal-Mode bleibt exakt unverändert** — er ist korrekt implementiert.

---

### Schritt 4 — `ProjectForm.tsx`, `TaskForm.tsx`, `FeatureForm.tsx`: Migration auf `tabBar`-Prop

In allen drei Formularen ist `<TabBar>` aktuell das **erste Kind-Element** innerhalb von `<FormModal>`. Das muss als `tabBar`-Prop übergeben werden.

**Muster (identisch für alle drei Dateien):**

```tsx
// VORHER
<FormModal
  open={open}
  title="..."
  // ...weitere Props...
>
  <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />
  {/* Tab-Inhalte */}
</FormModal>

// NACHHER
<FormModal
  open={open}
  title="..."
  // ...weitere Props...
  tabBar={<TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />}
>
  {/* Tab-Inhalte – TabBar ist raus */}
</FormModal>
```

Jede der drei Dateien hat genau eine `<TabBar>` direkt unter `<FormModal>`. Diese wird ans `tabBar`-Prop verschoben. Alle anderen Kinder (Sektionen, Panels) bleiben unverändert.

---

## Regeln & Einschränkungen

- Die Modal-Variante (`variant="modal"`) darf sich **funktional und visuell nicht verändern**. Sie ist korrekt und wird nur minimal angepasst (tabBar-Wrapper mit `shrink-0`).
- Die bestehende `max-h-[calc(100vh-64px)]`-Regel der Modal-Variante bleibt unverändert.
- `TicketForm.tsx` wird **nicht angefasst** – es hat keine Tab Bar.
- Der `header` in `FormModal` und `DetailModal` bekommt kein neues Layout. Nur der äußere Container-Wrapper der page-Variante ändert sich.
- Die `z-index`-Werte: TabBar `z-20`, Footer `z-10`. Damit liegt die Tab Bar über dem Footer, falls sie gleichzeitig sichtbar sind.
- Keine neuen npm-Pakete, keine neuen Komponenten.
- Keine Änderungen an `Modal.tsx` oder anderen UI-Primitives.

---

## Randfälle & Fehlerpfade

- **`tabBar`-Prop ist `undefined`:** Der bedingte Block `{tabBar ? ... : null}` verhindert ein leeres `<div>`. FormModal-Nutzungen ohne Tab Bar (z. B. `TicketForm`, Subdialoge wie `SubtaskDraftDialog`) sind nicht betroffen.
- **Sidebar in langen Seiten:** Mit `h-screen overflow-hidden` auf dem Root-Div und `overflow-auto` auf `<main>` bleibt die Sidebar immer vollständig sichtbar. Sicherstellen dass die Sidebar intern bei sehr vielen Einträgen auch scrollt (aktuell `overflow-y-auto` oder ähnliches – falls nicht, ist das ein separates Issue).
- **`CalendarPage`, `WikiPage`, alle anderen Pages ohne Tab Bar:** Die ändern sich durch die App-Layout-Anpassung (Schritt 1) ggf. im Scroll-Verhalten. Prüfen ob `min-h-screen`-Klassen in diesen Pages vorhanden sind, die zu kurzem Content führen könnten. Falls ja, durch `min-h-full` ersetzen.
- **Formulare die `variant="modal"` nutzen:** Unverändert, weil im Modal-Container das Scroll-Modell von App.tsx keine Rolle spielt.
- **`onOpenInTab`-Button im Header** von `FormModal` bleibt unverändert — kein Impact.

---

## Seiteneffekte

- **`App.tsx`-Änderung** wirkt auf alle Seiten. Das ist gewünscht (einheitliches Layout) aber muss mit allen Pages spot-gecheckt werden.
- **`ProjectDetailPage`** rendert `ProjectForm` mit `variant="page"`. Nach der Änderung scrollt der Gradient-Header raus, Tab Bar klebt oben — das ist das gewünschte Zielbild.
- **`TaskDetailPage`, `FeatureDetailPage`** – gleiche Wirkung wie oben.
- **`TicketDetailPage`** — nutzt `TicketForm` ohne Tab Bar, kein Tab-Sticky-Effekt, aber Footer klebt nach Schritt 2 (page-variant).

---

## Testhinweise

Folgende Szenarien manuell prüfen:

1. **Formular-Page mit vielen Feldern (Tab "Details" im Projekt-Formular):**  Seite scrollen → Gradient-Header scrollt weg → Tab Bar bleibt an Oberkante → Footer bleibt an Unterkante. Tab-Wechsel funktioniert.

2. **Formular-Modal (Projekt-Formular aus der Projektliste geöffnet):** Modal öffnet sich, Tab Bar sichtbar und fest, Footer sichtbar und fest, Inhalt scrollt, Modal schließen → kein visueller Artefakt.

3. **DetailModal (falls vorhanden):** Tab Bar klebt oben, Footer klebt unten.

4. **Seiten ohne Tab Bar (z. B. Ticket-Formular als Page):** Footer klebt unten, kein Tab-Element erscheint.

5. **Sidebar bei langer Seite:** Sidebar bleibt immer vollständig sichtbar, scrollt nicht weg.

6. **Kleine Fenster / Zoom:** Tab Bar und Footer überlappen den Content-Bereich nicht dauerhaft; Content-Bereich hat genug Platz zum Scrollen.

---

## Referenz: Prototyp

Der Prototyp liegt als ZIP im Auftrag (`Projekt_Manager.zip`). Die relevante Implementierungsreferenz ist:

- **`shell.jsx`** → `FormModal`-Komponente: children werden direkt in den flex-col Container eingehängt (kein overflow-auto-Wrapper). `PFShell` in `project-screens-b.jsx` zeigt, wie `<TabBar>` und der scrollende `<div>` als separate children ohne Wrapper-div genutzt werden.
- **Artboards 04–13** in `Project Screens.html` zeigen das Zielbild: Tab Bar und Footer immer sichtbar, Inhalt scrollt dazwischen.
