# Log: Bereinigung & Design-System-Doku

**Datum:** 17.05.26  
**Schritt:** 15 — Bereinigung & Dead-Code-Entfernung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Veraltete und ungenutzte Komponenten sowie API-Exports wurden entfernt. Status- und Prioritätslabels wurden in `apps/web/src/utils/domainLabels.ts` zentralisiert und die betroffenen Domain-Komponenten auf diese zentrale Quelle umgestellt. Inline-Radiuswerte `rounded-[18px]` wurden durch `rounded-2xl` ersetzt; `shadow-[...]` war im Quellbaum nicht vorhanden. Die geforderten Alt-Komponenten aus den früheren Schritten sind nicht mehr im `apps/web/src`-Baum referenziert. Zusätzlich wurde `docs/design-system.md` mit Komponentenübersicht, Tone-Referenz und Prüfregeln angelegt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/utils/domainLabels.ts` | neu | Zentrale Status-, Prioritäts- und Tone-Records |
| `docs/design-system.md` | neu | Design-System-Komponentenübersicht und Tone-Referenz |
| `apps/web/src/components/projects/ProjectCardSkeleton.tsx` | gelöscht | Ungenutzter Skeleton nach `ListBoardView`-Migration |
| `apps/web/src/components/tasks/TaskRowSkeleton.tsx` | gelöscht | Ungenutzter Skeleton |
| `apps/web/src/components/usecases/UseCaseDetail.tsx` | gelöscht | Ungenutzter alter Detail-Export |
| `apps/web/src/components/wiki/WikiEditor.tsx` | gelöscht | Ungenutzter Alias-Export |
| `apps/web/src/components/ui/Textarea.tsx` | gelöscht | Ungenutzter UI-Export |
| `apps/web/src/components/ui/Skeleton.tsx` | geändert | Ungenutzte Skeleton-Exports entfernt |
| `apps/web/src/components/ui/ConfirmDialog.tsx` | geändert | Ungenutzten `ConfirmPopover` entfernt und Radius vereinheitlicht |
| `apps/web/src/api/*.ts` | geändert | Ungenutzte einzelne Getter-Exports entfernt |
| `apps/web/src/**/*.tsx` | geändert | Domain-Labels importiert und `rounded-[18px]` ersetzt |
| `logs/2026-05-17-schritt-15-cleanup.md` | neu | Schritt-Log für Schritt 15 |
| `logs/README.md` | geändert | Log-Index um Schritt 15 ergänzt |

## Probleme und Abweichungen

`ts-prune` meldet weiterhin begründete Ausnahmen: Default-Exports von `tailwind.config.ts` und `vite.config.ts`, außerdem reine Typ-/Modul-Exports, die innerhalb des jeweiligen Moduls verwendet werden (`apiBaseUrl`, `HealthStatus`, `AttachmentOwner`, `NoteOwner`, `TaskFormInput`, `ConfirmSeverity`). Der Produktionsbuild meldet eine Vite-Warnung zu einem großen JS-Chunk; der Build selbst ist erfolgreich.

## Offene Punkte / Folgeaufgaben

Optional kann später Code-Splitting für den großen Vite-Chunk ergänzt werden. Die roten Playwright-Flows bleiben wie vereinbart für die separate Nacharbeit offen.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npx ts-prune src` in `apps/web` | ✅ Nur begründete Ausnahmen |
| `rg "cardClass\|FormCard\|CommentSection\|FeaturePicker\|UseCasePicker\|ProjectFeaturePanel\|FeatureProjectLinksPanel\|shadow-\[\|rounded-\[" apps/web/src -n` | ✅ Keine Treffer |
| `npm run build` | ✅ Erfolgreich, mit Vite-Chunkgrößen-Warnung |
