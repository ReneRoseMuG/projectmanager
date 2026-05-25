# Codex-Auftrag: Admin-Bereich — Innere Seitenleiste und Detail-Page-Layout einführen

**Parent:** PROJ-3
**Datum:** 2026-05-25
**Aufgaben-ID:** wird nach PM-Anlage ergänzt

---

## Hinweis zum Mockup

Das beigefügte HTML-Mockup dient **ausschließlich** zur Veranschaulichung der neuen
`AdminSidebar`-Navigation (Struktur, Position, Sektionsliste). Alle anderen Elemente im
Mockup — Hero-Bereiche, Tab-Optik, Karten, Buttons, Formularfelder — weichen vom
App-Standard ab und sind **nicht maßgeblich**. Codex leitet sämtliche Komponenten,
Klassen und Stile aus dem vorhandenen Komponentenbestand ab (`DetailModal`, `PageHero`,
`ListBoardView`, `ItemCard`, `TabBar`, `Button` etc.). Das Mockup nie als Vorlage für
konkrete CSS-Klassen oder Layout-Entscheidungen verwenden.

---

## Ziel

Der Admin-Bereich erhält eine vollständige Layout-Überarbeitung. Die horizontale Tab-Leiste
(aktuell `AdminNavigation` in `AdminLayout.tsx`) wird durch eine schmale vertikale Seitenleiste
ersetzt, die rechts neben der Hauptnavigation angedockt ist. Alle Admin-Sektionen (Kataloge, Tags,
Sicherung, Benutzer, Rollen) werden als vollwertige Detail-Pages gestaltet. Benutzer und Rollen
erhalten Board-/Listview-Darstellung mit Karten und einen Modal-Dialog für das Edit-Formular
(im Stil einer Detail-Page, über `DetailModal` mit `variant="modal"`).

---

## Hintergrund & Kontext

Der Admin-Bereich nutzt aktuell eine horizontale `AdminNavigation`-Leiste unterhalb des
Page-Heroes, die als Tab-Bar zwischen den Sektionen schaltet. Die einzelnen Seiten (Benutzer,
Rollen, Kataloge, Tags, Sicherung) sind einfache Listen- oder Formularseiten ohne einheitliches
Layout-Konzept. Benutzer- und Rollenbearbeitung erfolgt über separate Routen (`/admin/users/:id`,
`/admin/roles/:id`), die als eigenständige Seiten gerendert werden.

Das Ziel ist, den Admin-Bereich optisch und strukturell an die restliche App anzugleichen —
gleiche Layout-Sprache wie Detail-Pages, Modal-Dialoge statt Navigationssprünge, und eine
platzsparende Seitenleiste statt einer breiten Tab-Bar.

---

## Aufgabe

### 1. Innere Admin-Seitenleiste (`AdminSidebar`)

Erstelle eine neue Komponente `apps/web/src/components/layout/AdminSidebar.tsx`.

**Verhalten:**
- Schmale vertikale Leiste (`w-48` oder ähnlich), dockend rechts an die Hauptnavigation
- Listet alle Admin-Sektionen als vertikale NavLinks (gleiche Reihenfolge wie bisher:
  Kataloge, Tags, Sicherung, Benutzer, Rollen)
- Aktiver Eintrag: `bg-steel-700 text-white`
- Inaktiver Eintrag: `text-ink hover:bg-steel-100` (Ghost-Stil)
- Schrift: `text-sm font-medium`
- Obere Ausrichtung, kein Scrollen in der Sidebar selbst

**Layout-Integration:**
- `AdminLayout.tsx` erhält ein zweispaltiges Layout: linke Spalte = `AdminSidebar`, rechte
  Spalte (flex-1) = Seiteninhalt
- Die bisherige `AdminNavigation`-Komponente (horizontale Tabs) wird entfernt
- `AdminNavigation` wird aus allen Admin-Seiten-Importen entfernt
- Der `usesOwnAdminChrome`-Mechanismus entfällt ersatzlos, alle Admin-Seiten nutzen das
  neue Layout

### 2. Admin-Seiten als Detail-Pages

Alle Admin-Seiten erhalten den visuellen Standard einer Detail-Page:
- `PageHero` mit `variant="detail"` (dunkler Header-Bereich)
- Weißer Content-Bereich unterhalb mit `p-5` und `gap-6`
- Falls der Inhalt die Viewport-Höhe überschreitet: `overflow-auto` auf dem Content-Container,
  kein Scrollen auf der Gesamtseite

Die bestehenden `PageHero`-Aufrufe mit `variant="list"` in den Admin-Seiten werden auf
`variant="detail"` umgestellt.

### 3. Sicherungs-Seite (`SettingsBackupPage`)

- Alle Aktions-Buttons (Lokales Backup, Remote-Backup, Inkrementeller Sync) werden aus
  eventuellen Inline-Positionen unterhalb des Heroes platziert — als eigener
  Aktions-Bereich direkt unter dem Hero-Bereich, vor dem eigentlichen Inhalt
- Button-Stil: `<Button variant="secondary">` bzw. `<Button variant="primary">` aus
  `components/ui/Button.tsx` — kein manuelles `inline-flex h-10 ...` mehr
- Bestehende Inline-Klassenketten für Buttons in der Backup-Page auf `<Button>`-Komponente
  umschreiben

### 4. Kataloge-Sektion

- `SettingsCatalogsPage` bekommt eine `TabBar` (vorhandene `TabBar`-Komponente aus
  `components/ui/TabBar.tsx`) mit einem Tab pro Katalog-Typ
- Die Tab-Inhalte zeigen jeweils die Einträge des entsprechenden Katalogs über `CatalogManager`
- Die Tabs entsprechen den vorhandenen Katalog-Kategorien (aus dem API ermitteln, nicht
  hardcoden — `useAdminCatalogs` oder äquivalenten Hook verwenden)
- Layout innerhalb des Content-Bereichs: unterhalb der `TabBar`, mit Scroll-Container wenn nötig

### 5. Benutzer-Sektion (`UsersPage`)

**Board-/Listview:**

Die App besitzt ein etabliertes, generisches Board-/Listview-System. Dieses ist **zwingend zu
verwenden** — keine eigene Grid-/Listimplementierung bauen.

- **`ListBoardView<T>`** (`components/ui/ListBoardView.tsx`) — generische Oberfläche mit
  Toolbar (Suche, ViewToggle, Add-Button), Status-Gruppen und DnD-Support. Props:
  `items`, `mode`, `onModeChange`, `onAdd`, `renderCard`, `renderRow` u.a.
- **`ViewToggle`** (`components/ui/ViewToggle.tsx`) — wird intern von `ListBoardView`
  gerendert; nicht separat einbauen
- **`ItemCard`** (`components/ui/ItemCard.tsx`) — Standard-Karten-Basis für Board-Ansicht;
  Props: `header`, `body`, `footer`, `onEdit`, `onDelete`, `onOpen`, `accentColor`
- **`ItemRow`** (`components/ui/ItemRow.tsx`) — Standard-Zeilen-Basis für List-Ansicht;
  Props: `title`, `description`, `pills`, `meta`, `actions`, `onOpen`
- **`ActionMenu`** (`components/ui/ActionMenu.tsx`) — Drei-Punkte-Menü für Karten/Zeilen

**Vorgehensweise:** Analog zu den vorhandenen `*ListBoardView.tsx`-Adaptern erstelle:

1. `apps/web/src/components/admin/UserCard.tsx` — rendert einen User als `<ItemCard>`
   (Board-Ansicht): Name als Header, E-Mail + Rolle + Status-Badge im Body
2. `apps/web/src/components/admin/UserListBoardView.tsx` — wraps `<ListBoardView>` mit
   `renderCard={(user) => <UserCard user={user} onEdit={...} onDelete={...} />}` und
   `renderRow={(user) => <ItemRow title={user.fullName} ... />}`
3. `UsersPage.tsx` bindet `<UserListBoardView>` ein; `onAdd` und `onEdit` öffnen das Modal

**Karten-Inhalt (UserCard):**
- Header: `user.fullName` (`font-semibold`)
- Body: E-Mail (`text-sm text-steel-500`), Rolle als `<Badge>`, Status als `<Badge>` mit
  Tone `fern` (aktiv) / `crimson` (inaktiv)
- Kontextmenü via `onEdit` / `onDelete` props von `ItemCard`

Da Benutzer keinen Workflow-Status im Katalog-Sinn haben, wird `ListBoardView` **ohne**
`statusKey`/`statusCatalogKind` verwendet (ungruppierten Modus). Board-Ansicht zeigt alle
Karten in einem Grid via `CardGrid` (`components/ui/CardGrid.tsx`), Listview als Zeilen.

**Edit-Modal:**
- Der Edit-Button öffnet keinen neuen Route mehr, sondern einen `DetailModal`
  (`components/ui/DetailModal.tsx`) mit `variant="modal"`
- Das bestehende Formular aus `UserDetailPage.tsx` wird in die Modal-Komponente übernommen
- Modal-Titel: „Benutzer bearbeiten" / „Neuer Benutzer"
- Tabs im Modal nach Bedarf (mindestens: „Stammdaten")
- Footer des Modals: `<Button variant="primary" icon={<Save />}>Speichern</Button>` und
  `<Button variant="secondary">Abbrechen</Button>`
- Die Routen `/admin/users/new` und `/admin/users/:id` können entfallen oder leer auf
  `/admin/users` redirecten — der Einstiegspunkt ist nun immer die UsersPage

### 6. Rollen-Sektion (`RolesPage`)

Identisches Vorgehen wie Benutzer (Punkt 5) — **dieselben Standard-Komponenten nutzen**:

1. `apps/web/src/components/admin/RoleCard.tsx` — `<ItemCard>` mit Rollenname, Schlüssel
   (`font-mono text-xs`), Typ-Badge, Anzahl Rechte
2. `apps/web/src/components/admin/RoleListBoardView.tsx` — wraps `<ListBoardView>` ohne
   Statusgruppierung
3. `RolesPage.tsx` bindet `<RoleListBoardView>` ein

**Karten-Inhalt (RoleCard):**
- Header: `role.label` (`font-semibold`)
- Body: Schlüssel (`font-mono text-xs text-steel-500`), Typ als `<Badge>` (System /
  Benutzerdefiniert), Anzahl Rechte (`text-xs text-steel-400`)
- `onDelete` disabled wenn `role.isSystem === true`

**Edit-Modal:**
- `DetailModal` mit `variant="modal"`, Formular aus `RoleDetailPage.tsx` übernehmen
- Gleiche Footer-Struktur wie beim Benutzer-Modal
- Routen `/admin/roles/new` und `/admin/roles/:id` können entfallen oder redirecten

---

## Technische Leitplanken

- **Keine Raw-Tailwind-Farben** — ausschließlich Token-Klassen (`text-ink`, `bg-shell`,
  `border-line`, `bg-steel-700` etc.) gemäß `design-richtlinien-visuell.md`
- **Button-Komponente** — alle Buttons über `<Button>` aus `components/ui/Button.tsx`,
  keine manuellen `inline-flex h-10 ...`-Ketten mehr in Admin-Seiten
- **DetailModal** — für alle Edit-Formulare; `variant="modal"` für die Overlay-Variante
- **TabBar** — vorhandene Komponente `components/ui/TabBar.tsx` verwenden, nicht neu bauen
- **ListBoardView / ItemCard / ItemRow / ActionMenu** — ausschließlich die vorhandenen
  Standard-Komponenten aus `components/ui/` nutzen; kein eigenes Grid, keine eigene
  Karten-Implementierung. Pattern: `*ListBoardView.tsx`-Adapter analog zu
  `FeatureListBoardView`, `TaskListBoardView`, `TicketListBoardView` etc.
- **Kein neuer State-Manager** — alles via `useState` / vorhandene Hooks (`useAdminUsers`,
  `useAdminRoles`, `useAdminCatalogs`)
- **Scroll-Container** — bei längerem Inhalt `overflow-auto` auf dem Body-Container der
  jeweiligen Section; nie auf `body` oder `html`
- **Bestehende API-Hooks** — `useAdminUsers`, `useAdminRoles`, `useAdminUserDetail`,
  `useAdminCatalogs` (bzw. vorhandene Äquivalente) unverändert lassen; nur die
  Präsentationsschicht wird umgebaut

---

## Regeln & Randfälle

- System-Rollen (`role.isSystem === true`): Löschen-Button disabled, Edit-Modal öffnet sich
  im Read-only-Modus oder mit Hinweis „System-Rolle kann nicht bearbeitet werden"
- Inaktive Benutzer: Badge in Ton `crimson`; aktive in `fern`
- Leere Listen: `EmptyState`-Komponente mit passendem Icon und Text verwenden
- Fehler (API): bestehende Fehlerdarstellung (`border-crimson/30 bg-crimson/5 text-crimson`)
  beibehalten
- Modal-Scroll: wenn das Formular im Modal zu lang ist, muss der `<main>`-Bereich des
  DetailModals den Overflow aufnehmen (`overflow-auto`) — der Modal-Rahmen selbst
  soll nicht wachsen

---

## Seiteneffekte

- `AdminLayout.tsx`: komplett neu — horizontale Tab-Bar raus, zweispaltiges Layout rein
- `AdminNavigation`-Komponente: entfällt; alle Importe entfernen
- `UserDetailPage.tsx` / `RoleDetailPage.tsx`: werden nicht mehr direkt geroutet; Formular-
  logik in Modal-Wrapper extrahieren oder inline in UsersPage/RolesPage integrieren
- `SettingsBackupPage.tsx`: Button-Stil-Migration
- `SettingsCatalogsPage.tsx`: Tab-Navigation ergänzen
- Router (`apps/web/src/router.tsx` o.ä.): Routen für `/admin/users/:id`,
  `/admin/users/new`, `/admin/roles/:id`, `/admin/roles/new` prüfen und ggf. entfernen
  oder auf `/admin/users` bzw. `/admin/roles` redirecten

---

## Testanforderungen

- **Unit-Tests** für `AdminSidebar`: korrekte NavLink-Aktivierung je nach aktuellem Pfad
- **Integrations-Tests** für UsersPage: Board-/Listview-Umschalter, Modal öffnet/schließt,
  Speichern-Aktion ruft korrekten Hook-Handler auf
- **Integrations-Tests** für RolesPage: analog Benutzer; Löschen disabled für System-Rollen
- **Snapshot- oder visuelle Tests** für die neue AdminSidebar-Struktur falls vorhanden

---

## Abnahmekriterien

- [ ] Die horizontale `AdminNavigation` ist nirgends mehr sichtbar oder importiert
- [ ] Eine vertikale `AdminSidebar` erscheint links neben dem Content, mit korrekter
      Aktiv-Markierung je nach Route
- [ ] Alle Admin-Sektionen rendern mit `PageHero variant="detail"` (dunkler Header)
- [ ] Backup-Buttons verwenden `<Button>`-Komponente und sind unterhalb des Heroes platziert
- [ ] Kataloge-Sektion hat eine funktionierende TabBar mit einem Tab pro Katalog-Typ
- [ ] Benutzer-Sektion zeigt Board- und Listview, umschaltbar
- [ ] Benutzer-Bearbeitung öffnet einen `DetailModal` (kein Navigations-Sprung)
- [ ] Rollen-Sektion zeigt Board- und Listview, umschaltbar
- [ ] Rollen-Bearbeitung öffnet einen `DetailModal` (kein Navigations-Sprung)
- [ ] System-Rollen: Löschen-Button disabled, Edit-Modal signalisiert Read-only
- [ ] Kein Raw-Tailwind-Farb-Token (`slate-*`, `gray-*`, `blue-*`) in neuen oder
      geänderten Dateien
- [ ] Scroll-Container vorhanden wo Inhalt die Viewport-Höhe überschreiten kann
- [ ] Alle bestehenden Tests grün; neue Tests für Board/Listview und Modals vorhanden

---

## Anhang: Mockup-Datei

Das Mockup für diese Aufgabe (HTML-Archiv aus Claude Design) wird als zweites Attachment
an dieser Aufgabe angehängt. Es zeigt den angestrebten Zielzustand der AdminDetailsPage
und aller Unterseiten visuell.
