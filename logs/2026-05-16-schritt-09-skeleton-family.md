# Log: Skeleton-Family

**Datum:** 16.05.26  
**Schritt:** 9 — Skeleton-Family  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Skeleton-Primitive unterstützt jetzt Breite, Höhe und Radius sowie eine Shimmer-Animation mit `prefers-reduced-motion`-Fallback. Projekt-, Feature-, Task- und Kalender-Skeletons wurden ergänzt oder auf die neue Struktur umgestellt. Bestehende Loader verwenden weiterhin kompatible Exportnamen, damit vorhandene Pages nicht unnötig umgebaut werden mussten. FeaturesPage, ProjectsPage und CalendarPage nutzen nun spezialisierte Skeleton-Komponenten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/Skeleton.tsx` | geändert | Primitive und bestehende Loader neu aufgebaut |
| `apps/web/src/components/projects/ProjectCardSkeleton.tsx` | neu | Projekt-Skeleton-Wrapper |
| `apps/web/src/components/features/FeatureCardSkeleton.tsx` | neu | FeatureCard-Skeleton |
| `apps/web/src/components/tasks/TaskRowSkeleton.tsx` | neu | TaskRow-Skeleton-Wrapper |
| `apps/web/src/components/calendar/CalendarSkeleton.tsx` | neu | Kalender-Skeleton-Export |
| `apps/web/src/styles.css` | geändert | Shimmer-Animation ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
