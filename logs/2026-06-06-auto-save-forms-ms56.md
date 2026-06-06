# Log: MS-56 Auto-Save auf alle Detail-Formulare ausrollen

**Datum:** 06.06.26  
**Schritt:** Feature — MS-56 Auto-Save auf alle Detail-Formulare  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Auto-Save-Mechanismus wurde auf alle Detail-Formulare ausgerollt. Bisher wurde er nur für Task, Ticket, Milestone und Project in einer Vorgänger-Session implementiert. Diese Session schließt Feature, UseCase, BacklogItem und Wiki-Seite ab und konsolidiert alle Tests.

**Neue Dateien:**
- `apps/web/src/hooks/useAutoSave.ts` — Hook mit `enabled`/`save`-Optionen, `formStateRef`-Muster (kein Stale-Closure), Pending-Queue für gleichzeitige Feldänderungen, Unmount-Safety.
- `apps/web/src/components/ui/SaveStatus.tsx` — Darstellungskomponente: zeigt "Speichern…" / "Gespeichert" / "Fehler beim Speichern" abhängig vom `AutoSaveStatus`.

**Formular-Muster (gilt für alle acht Entitäten):**
- `formStateRef` spiegelt alle Felder synchron; wird im Render-Body und in `onChange`-Handlern aktualisiert
- `autoSave = useAutoSave({ enabled: !!entity && !!onAutoSave, save: async () => { ... } })`
- `af = entity ? autoSave.flush : undefined`
- Text-Inputs → `onBlur={af}`; RichTextInlineField (feuert `onChange` beim Blur) → `onChange={(v) => { setState(v); formStateRef.current = {..., field: v}; af?.(); }}`
- Select/Picker-Felder → `onChange` mit sofortigem `af?.()`
- `FormModal` erhält `hideFooter={!!entity}`, `saveStatus={entity ? <SaveStatus .../> : undefined}`, `entityTitle={entity?.title}`
- `onDelete` in `FormModal` ersetzt den alten Modal-Footer-Delete-Button

**Detail-Pages mit `autoSave`-Funktion:**
- `FeatureDetailPage`, `UseCaseDetailPage`, `BacklogItemDetailPage`, `WikiPage`
- Alle mit Change-Detection vor dem Update-Aufruf (kein unnötiger API-Aufruf)
- `WikiPage` vergleicht zusätzlich `relatedPageIds` (sortiert) für Relations-Sync

**WikiPageForm-Sonderfall:**
- Kein `FormModal`, daher `SaveStatus` manuell in `PageHero`-Actions (inline) und in den Modal-Header (Create-Modus) eingebunden
- Footer ausgeblendet wenn `page && onAutoSave` — sonst bleibt er für den Create-Modus

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useAutoSave.ts` | neu | Auto-Save-Hook mit Pending-Queue und Unmount-Safety |
| `apps/web/src/components/ui/SaveStatus.tsx` | neu | AutoSave-Status-Anzeige |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | `entityTitle`, `hideFooter`, `onDelete`, `saveStatus` Props ergänzt |
| `apps/web/src/components/ui/FormSidebar.tsx` | geändert | Kleinere Anpassung |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Auto-Save eingebaut |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Auto-Save eingebaut |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Auto-Save eingebaut |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Auto-Save eingebaut |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Auto-Save eingebaut |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Auto-Save eingebaut |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Auto-Save eingebaut |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Auto-Save eingebaut |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | `autoSaveBacklogItem`-Funktion |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | `autoSaveFeature`-Funktion |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | `autoSaveMilestone`-Funktion |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | `autoSaveProject`-Funktion |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | `autoSaveTask`-Funktion |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | `autoSaveTicket`-Funktion |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | `autoSaveUseCase`-Funktion |
| `apps/web/src/pages/WikiPage.tsx` | geändert | `autoSaveInlineForm`-Funktion |
| `tests/unit/web/hooks/useAutoSave.test.ts` | neu | Unit-Tests für den Hook |
| `tests/unit/web/components/ui/SaveStatus.test.tsx` | neu | Unit-Tests für SaveStatus |
| `tests/unit/web/components/backlog/BacklogItemForm.test.tsx` | geändert | onAutoSave statt Speichern-Button-Klick |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | onAutoSave statt Speichern-Button-Klick |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | onAutoSave statt Speichern-Button-Klick |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | onAutoSave statt Speichern-Button-Klick |
| `tests/unit/web/components/tasks/TaskForm.test.tsx` | geändert | onAutoSave statt Speichern-Button-Klick |
| `tests/unit/web/components/tickets/TicketForm.test.tsx` | geändert | onAutoSave statt Speichern-Button-Klick |
| `tests/unit/web/components/usecases/UseCaseForm.test.tsx` | geändert | onAutoSave statt Speichern-Button-Klick |
| `tests/unit/web/pages/TaskDetailPage.test.tsx` | geändert | useConfirm-Mock ergänzt |
| `tests/unit/web/pages/TicketDetailPage.test.tsx` | geändert | useQueryClient + useConfirm-Mock ergänzt |

## Testergebnisse

- `npm run test -w apps/web`: **613 Tests, 97 Dateien — alle grün**
- `npm run test -w apps/api`: Nicht von dieser Änderung betroffen (nur Web-Schicht)

## Offene Punkte

- Browser/E2E-Tests für Auto-Save-Flows fehlen noch — der E2E-Serverstart-Blocker (`UPLOAD_DIR`) blockiert weiterhin
- Die Zeitverzögerung des "Gespeichert"-Resets (2000ms) könnte bei sehr schnellen Feldeingaben optisch stören; bisher kein Nutzer-Feedback dazu
