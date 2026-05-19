# Log: RichText Beschreibungsfelder

**Datum:** 19.05.26  
**Schritt:** Fix — RichText Beschreibungsfelder  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Inline-Rich-Text-Komponente wurde so erweitert, dass eine Toolbar erst im aktiven Editierzustand sichtbar wird. Die Toolbar ist über `toolbar="full" | "minimal" | "none"` konfigurierbar und nutzt standardmäßig die erweiterte Variante. Ergänzt wurden zusätzliche Formatierungsfunktionen für Durchstreichen, Hervorheben, Überschriften bis H3, Zitat, Codeblock, Link, Bild, Textausrichtung und Formatierung entfernen. Alle bestehenden Formularfelder für Beschreibungen wurden gezielt auf mindestens 12 sichtbare Zeilen gesetzt. Inhaltsfelder, Kommentare und reine Leseansichten ohne Beschreibungskontext wurden bewusst nicht pauschal vergrößert. Die Web-TypeScript-Prüfung wurde ausgeführt und ist grün.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Konfigurierbare Edit-Toolbar und `minRows`-Unterstützung ergänzt |
| `apps/web/src/styles.css` | geändert | CSS-Regel für zeilenbasierte Rich-Text-Mindesthöhe ergänzt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Beschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Beschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Kurzbeschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Kurzbeschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Beschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Beschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/tasks/TaskModal.tsx` | geändert | Beschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Beschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Kurzbeschreibung auf 12 Mindestzeilen gesetzt |
| `apps/web/src/components/ui/__tests__/rich-text-inline-field.test.tsx` | geändert | Toolbar-Sichtbarkeit und Mindesthöhe abgesichert |
| `logs/2026-05-19-fix-richtext-beschreibungsfelder.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Kein vollständiger Testlauf ausgeführt; gemäß Abschlussworkflow steht die Entscheidung dazu noch aus.
