# Codex-Auftrag: Aktiven Tab beim Navigieren wiederherstellen

## Kontext

Formular-Komponenten (FeatureForm, MilestoneForm, ProjectForm, UseCaseForm) haben eine Tab-Leiste mit Tabs wie „Details", „Aufgaben", „Tickets" etc. Der aktive Tab liegt im lokalen React-State (`useState`). Wenn der Nutzer von einem dieser Tabs aus einen untergeordneten Eintrag öffnet (Aufgabe, Ticket, Use Case), navigiert die App zu einer separaten Detail-Route mit einem `returnTo`-Parameter. Nach dem Speichern navigiert die App über `navigate(returnTo)` zurück.

## Problem

Der `returnTo`-Parameter enthält nur `pathname + search` der Ausgangsseite — keinen Hinweis auf den aktiven Tab. Beim Zurücknavigieren mountet das Formular neu, und der `useEffect` setzt `activeTab` auf den Default zurück (meistens „Details").

**Beobachtetes Symptom:** Feature-Detail öffnen → Tab „Aufgaben" wählen → Aufgabe öffnen → Speichern → Rückkehr, aber Tab zeigt „Details" statt „Aufgaben".

## Betroffene Dateien

**Formular-Komponenten (Tab-State führen + lesen):**
- `apps/web/src/components/features/FeatureForm.tsx`
- `apps/web/src/components/milestones/MilestoneForm.tsx`
- `apps/web/src/components/projects/ProjectForm.tsx`
- `apps/web/src/components/usecases/UseCaseForm.tsx`

**Detail-Pages (initialTab prop weitergeben):**
- `apps/web/src/pages/FeatureDetailPage.tsx`
- `apps/web/src/pages/MilestoneDetailPage.tsx`
- `apps/web/src/pages/ProjectDetailPage.tsx`
- `apps/web/src/pages/UseCaseDetailPage.tsx`

**Navigation aus Board-Komponenten (returnTo enthält Tab automatisch):**
- `apps/web/src/components/tasks/OwnerTaskBoard.tsx`
- `apps/web/src/components/tickets/OwnerTicketBoard.tsx`

## Ursache

In `OwnerTaskBoard.tsx`:
```typescript
const returnTo = `${location.pathname}${location.search}`;
navigate(`/tasks/${task.id}?returnTo=${encodeURIComponent(returnTo)}`);
```

`location.search` enthält keinen Tab-Parameter, weil der Tab in lokalem State und nicht in der URL liegt.

## Fix

Den aktiven Tab als URL-Search-Parameter führen (`?tab=tasks`). `location.search` enthält den Tab dann automatisch, womit `returnTo` ihn ohne weitere Änderungen an `OwnerTaskBoard`/`OwnerTicketBoard` transportiert.

### Schritt 1: Tab-Wechsel in URL spiegeln (in jeder Form-Komponente)

```typescript
const navigate = useNavigate();
const location = useLocation();

const handleTabChange = (newTab: FeatureFormTab) => {
  setActiveTab(newTab);
  // URL aktualisieren ohne neuen History-Eintrag
  const params = new URLSearchParams(location.search);
  params.set("tab", newTab);
  navigate(`${location.pathname}?${params.toString()}`, { replace: true });
};

// TabBar erhält handleTabChange statt setActiveTab:
<TabBar tabs={tabItems} active={activeTab} onChange={handleTabChange} />
```

### Schritt 2: Initial-Tab aus URL lesen (in den Detail-Pages)

```typescript
// FeatureDetailPage.tsx
const [searchParams] = useSearchParams();
const initialTab = searchParams.get("tab") as FeatureFormTab | null;

<FeatureForm
  initialTab={initialTab ?? undefined}
  // ...
/>
```

### Schritt 3: Form-Komponenten akzeptieren `initialTab`-Prop

```typescript
interface FeatureFormProps {
  // ...
  initialTab?: FeatureFormTab;
}

// Im Init-Effect (nur beim frischen Öffnen, siehe Bug-04-Fix):
if (open && !prevOpenRef.current) {
  setActiveTab(initialTab ?? "details");
}
```

### Ergebnis

Da `OwnerTaskBoard` bereits `returnTo = location.pathname + location.search` baut, enthält `returnTo` nach Schritt 1 automatisch den Tab-Parameter, z.B.:
```
returnTo=/features/5?tab=tasks
```
Nach dem Speichern navigiert die App zu `/features/5?tab=tasks`, die Form liest `tab=tasks` aus den URL-Params und öffnet direkt den „Aufgaben"-Tab.

## Wichtiger Hinweis

`replace: true` beim Tab-Wechsel ist wichtig, damit der Nutzer nicht eine lange Back-History mit Tab-Wechseln aufbaut. Der Browser-Zurück-Button soll zur vorherigen Seite führen, nicht zum vorherigen Tab.

## Akzeptanzkriterien

- [ ] Aufgabe aus Tab „Aufgaben" öffnen → speichern → Rückkehr auf Tab „Aufgaben"
- [ ] Ticket aus Tab „Tickets" öffnen → speichern → Rückkehr auf Tab „Tickets"
- [ ] Abbrechen (ohne Speichern) verhält sich identisch
- [ ] Tab ist deep-linkbar: `/features/5?tab=tasks` öffnet direkt den Aufgaben-Tab
- [ ] Browser-Zurück-Button führt zur vorherigen Seite, nicht zum vorherigen Tab
- [ ] Keine Regression bei anderen Tabs und Formularen
- [ ] Alle vier betroffenen Form-Komponenten sind angepasst
