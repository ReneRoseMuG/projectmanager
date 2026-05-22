# Log: Inline Status und Datum

**Datum:** 22.05.26  
**Schritt:** 5 — Inline Status und Datum  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Status-Pills auf Cards und List Items sind nun optional klickbar und öffnen ein Statusmenü mit den passenden Katalogeinträgen. Datumsfelder können inline über ein kompaktes Date-Input geändert werden. Die Mutationen wurden in den jeweiligen Owner-Boards und Hauptseiten angebunden, inklusive bestehender Toast-Fehlerbehandlung. Dadurch lassen sich Status und Fälligkeit direkt im Listen- oder Boardkontext ändern, ohne zuerst die Detailformulare öffnen zu müssen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/StatusPill.tsx` | geändert | Optionales Statusmenü für klickbare Status-Pills ergänzt |
| `apps/web/src/components/ui/InlineDateField.tsx` | neu | Inline-Datumsfeld für Cards und Rows ergänzt |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | Inline-Status- und Fälligkeitsänderungen für Aufgaben angebunden |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | geändert | Inline-Status- und Fälligkeitsänderungen für Tickets angebunden |
| `apps/web/src/pages/TicketsPage.tsx` | geändert | Inline-Status- und Fälligkeitsänderungen in der Ticket-Hauptansicht angebunden |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Inline-Statusänderung für Projekte angebunden |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Inline-Statusänderung für Features angebunden |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Inline-Statusänderungen für Use Cases angebunden |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Inline-Status- und Fälligkeitsänderungen für Meilensteine sowie Backlog-Status angebunden |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Klickbare Status-Pill und klickbares Fälligkeitsdatum integriert |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Klickbare Status-Pill und klickbares Fälligkeitsdatum integriert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine fachlichen offenen Punkte in diesem Schritt. Der nachgelagerte volle Testlauf enthält rote Tests, die im Abschlussbericht benannt sind.
