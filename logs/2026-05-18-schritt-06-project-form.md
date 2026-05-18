# Log: ProjectForm

**Datum:** 18.05.26  
**Schritt:** 6 — ProjectForm und ProjectDetailPage  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`ProjectForm` ersetzt das bisherige Projekt-Edit- und Inline-Formular. Das Modal enthält Details, Features, Aufgaben, Tickets, Kommentare, Notizen, Dateien, Backlog und im Edit-Modus Import. Im Create-Modus ist Backlog als Hinweis sichtbar, der Import-Tab ist ausgeblendet, und Features, Aufgaben, Tickets, Kommentare, Notizen und Dateien werden pending gesammelt. `ProjectDetailPage` ist nun eine reine Ansichtsseite mit Hero, Kennzahlen und Bearbeiten-Button. `ProjectsPage` verarbeitet Pending-Daten nach erfolgreichem Project-Create seriell.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Vollständiges Project-Create/Edit-Modal |
| `apps/web/src/components/projects/ProjectInlineForm.tsx` | gelöscht | Durch ProjectForm ersetzt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Reine Ansichtsseite mit Bearbeiten-Modal |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Project-Post-Create-Pending-Verarbeitung ergänzt |
| `apps/web/src/components/__tests__/OwnerForms.test.tsx` | neu | ProjectForm-Create/Edit-Verhalten getestet |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Playwright-E2E konnte wegen eines lokalen `tsx`/`esbuild`-Startfehlers nicht ausgeführt werden.
