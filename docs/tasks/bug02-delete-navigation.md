# Codex-Auftrag: Rücknavigation nach Löschen korrigieren

## Kontext

Detail-Pages verwenden einen `returnTo`-URL-Parameter, um nach dem Speichern zur Ausgangsseite zurückzunavigieren. Dieses Muster wird bei `MilestoneDetailPage` und `UseCaseDetailPage` korrekt auch nach dem Löschen angewendet. Bei `FeatureDetailPage` und `ProjectDetailPage` wird beim Löschen stattdessen eine hardcodierte Ziel-URL verwendet.

## Problem

| Page | Navigate nach Speichern | Navigate nach Löschen |
|---|---|---|
| `FeatureDetailPage` | ✅ `navigate(returnTo)` | ❌ `navigate("/features")` |
| `ProjectDetailPage` | ✅ `navigate(returnTo)` | ❌ `navigate("/projects")` |
| `MilestoneDetailPage` | ✅ `navigate(returnTo)` | ✅ `navigate(returnTo)` |
| `UseCaseDetailPage` | ✅ `navigate(returnTo)` | ✅ `navigate(returnTo)` |

**Beobachtetes Symptom:** Feature aus Projekt-Detail öffnen → löschen → landet auf `/features` statt zurück beim Projekt.

## Betroffene Dateien

- `apps/web/src/pages/FeatureDetailPage.tsx`
- `apps/web/src/pages/ProjectDetailPage.tsx`

## Fix

### FeatureDetailPage.tsx — `deleteFeature`-Funktion

```typescript
// Vorher (Zeile ca. 162):
navigate("/features");

// Nachher:
navigate(returnTo);
```

### ProjectDetailPage.tsx — `deleteProject`-Funktion

```typescript
// Vorher (Zeile ca. 144):
navigate("/projects");

// Nachher:
navigate(returnTo);
```

`returnTo` ist in beiden Komponenten bereits korrekt definiert und wird beim Speichern verwendet. Der Fallback (`?? "/features"` bzw. `?? "/projects"`) ist im `returnTo`-Ausdruck bereits eingebaut, sodass das direkte Aufrufen der Seite ohne `returnTo`-Parameter weiterhin auf die Listen-Seite navigiert.

## Akzeptanzkriterien

- [ ] Feature aus Projekt-Detail öffnen → löschen → Rückkehr zum Projekt-Detail
- [ ] Feature direkt über URL aufrufen (kein `returnTo`) → löschen → Fallback auf `/features`
- [ ] Projekt aus Projekte-Liste öffnen → löschen → Rückkehr zur Projekte-Liste
- [ ] Kein Unterschied im Navigationsverhalten zwischen Speichern und Löschen
- [ ] `MilestoneDetailPage` und `UseCaseDetailPage` bleiben unverändert
