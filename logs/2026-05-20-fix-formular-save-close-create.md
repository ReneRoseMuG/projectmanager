# Log: Formular Save-Close Create

**Datum:** 20.05.26  
**Schritt:** Fix — Formular-Speichern schließt Create-Flows  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Create-Detailseiten für Projekte, Meilensteine, Features, Aufgaben, Tickets, Backlog-Items und Use Cases überschreiben das Standardverhalten der Formulare nicht mehr. Nach erfolgreichem Speichern übernimmt wieder der gemeinsame `onClose`-Handler und navigiert auf die vorhandene `returnTo`-Route zurück. Zusätzlich wurden die konkurrierenden Navigationsbefehle aus den Create-Handlern entfernt, die zuvor direkt auf die neu angelegte Detailroute geführt hatten. Die Persistenzlogik, Pending-Zuordnungen, Tags, Kommentare, Notizen und Datei-Uploads bleiben unverändert und laufen weiterhin vor dem Schließen. Die Browser-Tests wurden auf das vereinbarte Verhalten umgestellt, sodass Create- und Edit-Save-Flows künftig das Schließen auf die Rücksprungroute prüfen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Create-Speichern navigiert nicht mehr auf die neue Projektdetailroute |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Create-Speichern nutzt wieder das Formular-Defaultschließen |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Post-Create-Navigation auf die Feature-Detailroute entfernt |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Aufgaben-Create schließt nach erfolgreichem Speichern auf `returnTo` |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Ticket-Create überschreibt `closeOnSubmit` nicht mehr |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | Backlog-Create schließt nach erfolgreichem Speichern auf `returnTo` |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | Post-Create-Navigation auf die Use-Case-Detailroute entfernt |
| `apps/web/src/pages/__tests__/TaskDetailPage.test.tsx` | geändert | Regressionstest gegen `closeOnSubmit={false}` im Task-Create-Modus ergänzt |
| `apps/web/e2e/project.spec.ts` | geändert | Create/Edit-Save-Erwartungen auf Rücksprungroute angepasst |
| `apps/web/e2e/feature.spec.ts` | geändert | Create/Edit-Save-Erwartungen auf Rücksprungroute angepasst |
| `apps/web/e2e/milestone.spec.ts` | geändert | Meilenstein-Create prüft Rücksprung zum Projekt |
| `apps/web/e2e/task.spec.ts` | geändert | Aufgaben-Create und Edit-Save prüfen Schließen auf den Owner |
| `apps/web/e2e/tickets.spec.ts` | geändert | Ticket-Create und Edit-Save prüfen Schließen auf die Übersicht bzw. den Owner |
| `apps/web/e2e/owner-tasks.spec.ts` | geändert | Owner-Aufgaben-Create prüft geschlossenes Formular und Owner-Karte |
| `logs/2026-05-20-fix-formular-save-close-create.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
