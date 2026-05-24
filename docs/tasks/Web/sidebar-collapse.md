# Codex-Auftrag: Sidebar Collapse / Expand + einheitliche Schaltflächenbreite

## Aufgabenbeschreibung

Die Navigationsleiste (`Sidebar.tsx`) erhält zwei Verbesserungen:

1. **Collapse/Expand** – Die Sidebar kann auf eine schmale Icon-Only-Variante (`w-16`) zusammengeklappt werden. Der Zustand wird in `localStorage` gespeichert und beim nächsten Laden wiederhergestellt.
2. **Einheitliche Schaltflächenbreite** – Im expanded Zustand haben alle Navigationspunkte die gleiche Breite; das „In Tab öffnen"-Icon ist rechtsbündig an einer gemeinsamen vertikalen Linie ausgerichtet.

## Scope

Primär eine Datei:

- `apps/web/src/components/layout/Sidebar.tsx`

Keine Backend-Änderungen. Keine neuen Abhängigkeiten.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lese zunächst:

- `docs/architecture-leitfaden.md`
- `docs/design-richtlinien-visuell.md`
- `apps/web/src/components/layout/Sidebar.tsx` (vollständig)

Erstelle danach eine Ist/Soll-Tabelle:

| Bereich | Ist | Soll |
|---|---|---|
| Sidebar-Breite | fix `w-64` | `w-64` (expanded) / `w-16` (collapsed) |
| Collapse-State | keiner | `localStorage` key `ui.sidebar.collapsed` |
| Toggle-Button | keiner | Chevron-Button oben in der Sidebar |
| NavSection-Header | immer sichtbar | im collapsed Zustand ausgeblendet |
| Suchleiste | immer sichtbar | im collapsed Zustand ausgeblendet |
| App-Logo-Zeile | Icon + Titel + Refresh | collapsed: nur Icon-Box, kein Titel, kein Refresh |
| Nav-Items expanded | Icon + Label + Tab-Button rechts | wie bisher, Tab-Button rechtsbündig auf gleicher Linie |
| Nav-Items collapsed | — | nur Icon, zentriert; Tab-Button als Badge top-right am Icon |
| User-Bereich expanded | Name + Rolle + Logout-Button | wie bisher |
| User-Bereich collapsed | — | nur Logout-Icon (kein Name, keine Rolle) |
| Server-Status collapsed | — | nur Activity-Icon; kein Status-Text, kein Dot |

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Collapse-State

Initialisiere den `collapsed`-State in der `Sidebar`-Komponente aus `localStorage`:

```tsx
const [collapsed, setCollapsed] = useState<boolean>(
  () => localStorage.getItem("ui.sidebar.collapsed") === "true"
);

function toggleCollapsed() {
  setCollapsed((current) => {
    const next = !current;
    localStorage.setItem("ui.sidebar.collapsed", String(next));
    return next;
  });
}
```

---

## Schritt 3: Toggle-Button

Platziere den Toggle-Button direkt unterhalb der App-Logo-Zeile. Nutze `ChevronLeft` / `ChevronRight` aus `lucide-react`:

```tsx
<button
  type="button"
  onClick={toggleCollapsed}
  className="mb-3 flex h-8 w-full items-center justify-center rounded-lg text-white/55 transition hover:bg-white/5 hover:text-white"
  title={collapsed ? "Navigation aufklappen" : "Navigation einklappen"}
>
  {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
</button>
```

---

## Schritt 4: `<aside>`-Container

Passe die `<aside>`-Klasse dynamisch an:

```tsx
<aside
  className={`hidden shrink-0 overflow-y-auto bg-gradient-to-b from-steel-700 to-steel-800 p-4 text-white md:block transition-[width] duration-200 ${
    collapsed ? "w-16" : "w-64"
  }`}
>
```

---

## Schritt 5: `NavigationLinks` – collapsed Modus

Erweitere `NavigationLinks` um die `collapsed`-Prop.

### Collapsed Nav-Item-Style

```tsx
function navLinkClassCollapsed(isActive: boolean): string {
  return `relative flex h-10 w-10 items-center justify-center rounded-lg transition ${
    isActive
      ? "bg-white text-steel-700 shadow-panel"
      : "text-white/75 hover:bg-white/5 hover:text-white"
  }`;
}
```

### Rendering

```tsx
function NavigationLinks({
  currentUser,
  items,
  allowStandalone,
  collapsed,
}: {
  currentUser?: CurrentUser | null;
  items: NavigationItem[];
  allowStandalone: boolean;
  collapsed?: boolean;
}) {
  return (
    <nav className={`grid gap-1 ${collapsed ? "items-center" : ""}`}>
      {items.filter((item) => canReadItem(currentUser, item)).map((item) => {
        const Icon = item.icon;

        if (collapsed) {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => navLinkClassCollapsed(isActive)}
            >
              <Icon size={17} />
              {allowStandalone ? (
                <button
                  type="button"
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-steel-600 text-white/80 transition hover:bg-steel-500 hover:text-white"
                  aria-label={`${item.label} in neuem Tab öffnen`}
                  title={`${item.label} in neuem Tab öffnen`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.open(withStandaloneView(item.to), "_blank");
                  }}
                >
                  <ExternalLink size={9} />
                </button>
              ) : null}
            </NavLink>
          );
        }

        // expanded (bisheriges Rendering, leicht angepasst für einheitliche Breite):
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Icon size={17} />
            <span className="flex-1 truncate">{item.label}</span>
            {allowStandalone ? (
              <button
                type="button"
                className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition hover:bg-white/20 group-hover:opacity-100"
                aria-label={`${item.label} in neuem Tab öffnen`}
                title={`${item.label} in neuem Tab öffnen`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  window.open(withStandaloneView(item.to), "_blank");
                }}
              >
                <ExternalLink size={13} />
              </button>
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );
}
```

**Hinweis zur einheitlichen Breite im expanded Zustand:** Der Label-`<span>` mit `flex-1 truncate` sorgt dafür, dass alle Navigationspunkte die volle Breite der `<aside>` ausfüllen. Der Tab-Button mit `shrink-0` und `ml-auto` liegt dadurch immer rechtsbündig auf gleicher vertikaler Linie.

---

## Schritt 6: App-Logo-Zeile im collapsed Zustand

```tsx
{collapsed ? (
  <div className="mb-3 flex justify-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-steel-700 shadow-steel-icon text-sm font-bold">
      PM
    </span>
  </div>
) : (
  <button
    type="button"
    className="mb-3 flex w-full items-center gap-3 rounded-lg p-1 text-left transition hover:bg-white/5"
    title="Aktualisieren"
    onClick={() => void invalidateWikiImportData(queryClient)}
  >
    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-steel-700 shadow-steel-icon">PM</span>
    <span className="flex min-h-10 items-center text-sm font-bold text-white">Projekt Manager</span>
    <RefreshCw size={14} className="ml-auto text-white/55" />
  </button>
)}
```

---

## Schritt 7: Suchleiste und NavSection-Header

```tsx
{/* Suchleiste: nur im expanded Zustand */}
{!collapsed && (
  <div className="mb-2" onClick={() => openGlobalSearch(sidebarSearch)}>
    <SearchInput ... />
  </div>
)}

{/* NavSection-Header: nur im expanded Zustand */}
{!collapsed && <NavSection>Projekt Management</NavSection>}
<NavigationLinks ... collapsed={collapsed} />

{!collapsed && <NavSection>Projekt Dokumentation</NavSection>}
<NavigationLinks ... collapsed={collapsed} />

{/* usw. */}
```

---

## Schritt 8: User-Bereich im collapsed Zustand

```tsx
{currentUser ? (
  <div className="mt-6 border-t border-white/10 pt-4">
    {!collapsed && (
      <div className="mb-3 px-3 text-xs text-white/70">
        <span className="block font-semibold text-white">{currentUser.fullName}</span>
        <span>{currentUser.role.label}</span>
      </div>
    )}
    <button
      type="button"
      onClick={onLogout}
      title="Abmelden"
      className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white ${
        collapsed ? "w-10 justify-center" : "w-full"
      }`}
    >
      <LogOut size={17} />
      {!collapsed && "Abmelden"}
    </button>
  </div>
) : null}
```

---

## Schritt 9: Server-Status im collapsed Zustand

Im collapsed Zustand zeigt der Server-Status-Button nur das `Activity`-Icon. Der Status-Text, der Dot und das ausklappbare Panel werden ausgeblendet:

```tsx
{showAdmin ? (
  collapsed ? (
    <div className="mt-2">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/5 hover:text-white"
        title={`Server ${health.online ? "erreichbar" : "offline"}`}
      >
        <Activity size={17} />
      </button>
    </div>
  ) : (
    <ServerStatus ... /> // wie bisher
  )
) : null}
```

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | collapsed-State, Toggle-Button, alle konditionalen Renderings |

---

## Tests

### Unit-Tests (`tests/unit/web/components/layout/Sidebar.test.tsx`)

- Toggle-Button wechselt zwischen expanded und collapsed
- Im collapsed Zustand: Labels nicht sichtbar, Icons vorhanden
- Im collapsed Zustand: ExternalLink-Badge für Standalone-Items sichtbar
- Im collapsed Zustand: NavSection-Header nicht im DOM
- Zustand wird in `localStorage` persistiert
- Sidebar liest initialCollapsed-State aus `localStorage` beim Mount

### Keine E2E-Tests erforderlich
Die Änderung ist rein visuell und bereits durch Unit-Tests ausreichend abgedeckt.

---

## Akzeptanzkriterien

- [ ] Sidebar lässt sich per Toggle-Button kollabieren und wieder aufklappen
- [ ] Collapsed-Zustand wird in `localStorage` (`ui.sidebar.collapsed`) gespeichert und nach Reload wiederhergestellt
- [ ] Im collapsed Zustand: nur Icons, keine Labels, keine NavSection-Header, keine Suchleiste
- [ ] ExternalLink-Badge ist im collapsed Zustand dauerhaft am Nav-Icon sichtbar (nicht erst bei Hover)
- [ ] Im expanded Zustand: alle Nav-Items gleiche Breite, Tab-Icons rechtsbündig auf gleicher Linie
- [ ] Kein `title`-Attribut vergessen (Accessibility: Tooltip zeigt Label im collapsed Zustand)
- [ ] Keine raw Tailwind-Farben (`slate-*`, `gray-*`, `blue-*`) — nur Design-Tokens gemäß `design-richtlinien-visuell.md`
- [ ] Alle Unit-Tests grün, keine bestehenden Tests gebrochen

---

## Referenz

- Design-Richtlinien: `docs/design-richtlinien-visuell.md`
- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Komponente: `apps/web/src/components/layout/Sidebar.tsx`
- Bestehende Tests: `tests/unit/web/components/layout/Sidebar.test.tsx`
