# Log: Detailseiten und Formularnavigation

**Datum:** 18.05.26  
**Schritt:** Feature — Detailseiten und Formularnavigation  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für die Domänenobjekte Projekt, Feature, Aufgabe, Ticket, Use Case und Backlog-Item wurden kanonische Detailseiten bzw. Create-Seiten aufgebaut, die jeweils das vollständige bestehende Formular im Seitenmodus hosten. Die bisherigen Overlay-Pfade für Domain-Objekte wurden aus den Listen- und Tab-Views entfernt bzw. auf Routennavigation umgestellt; Notizen bleiben als kleines Querschnittsobjekt weiterhin im Editor-Modal. Doppelklick und Bearbeiten-Button führen nun in Board- und Listenansichten auf dieselbe Detailformular-Route. Verknüpfte Objekte in Projekt-, Feature-, Aufgaben-, Use-Case- und Ticket-Tabs öffnen ebenfalls ihre jeweilige Detailseite und erhalten über `returnTo` einen stabilen Rückweg. Zusätzlich wurden Browser-Suites mit echten API-Daten ergänzt, die Navigation, Gleichheit von Doppelklick/Bearbeiten und vollständig geladene Formularwerte nachweisen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/App.tsx` | geändert | Detail- und Create-Routen für Projekte, Features, Aufgaben, Tickets, Use Cases und Backlog ergänzt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Projekt-Detailseite als Host für `ProjectForm` im Seitenmodus |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Feature-Detailseite als Host für `FeatureForm` im Seitenmodus |
| `apps/web/src/pages/TaskDetailPage.tsx` | neu | Aufgaben-Detailseite mit Owner-Kontext, Create- und Edit-Modus |
| `apps/web/src/pages/TicketDetailPage.tsx` | neu | Ticket-Detailseite mit Owner-Kontext, Create- und Edit-Modus |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | neu | Use-Case-Detailseite mit Feature-Kontext, Create- und Edit-Modus |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | neu | Backlog-Item-Detailseite mit Projekt-/Feature-Kontext |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Create, Doppelklick und Bearbeiten navigieren auf Projekt-Detailrouten |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Create, Doppelklick und Bearbeiten navigieren auf Feature-Detailrouten |
| `apps/web/src/pages/TicketsPage.tsx` | geändert | Create, Status-Create, Doppelklick und Bearbeiten navigieren auf Ticket-Detailrouten |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Seitenmodus für Formulare ergänzt |
| `apps/web/src/components/ui/DetailModal.tsx` | geändert | Seitenmodus für Detaildarstellungen ergänzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Domain-Objekt-Tabs auf Routennavigation umgestellt, alte Overlay-Formulare entfernt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Use-Case-, Projekt-, Aufgaben- und Ticket-Tabs auf Routennavigation umgestellt |
| `apps/web/src/components/tasks/TaskModal.tsx` | geändert | Seitenmodus und optionales Offenbleiben nach Submit ergänzt |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Seitenmodus und optionales Offenbleiben nach Submit ergänzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Seitenmodus und optionales Offenbleiben nach Submit ergänzt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Seitenmodus und optionales Offenbleiben nach Submit ergänzt |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | Neue und bestehende Aufgaben öffnen per Detailroute |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | geändert | Neue und bestehende Tickets öffnen per Detailroute |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Doppelklick/Bearbeiten an gemeinsame Öffnungslogik angebunden |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Bearbeiten-Aktion für Board-Karten ergänzt |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | Bearbeiten-Callback an Karten und Zeilen weitergereicht |
| `apps/web/src/components/features/FeatureProjectPanel.tsx` | geändert | Verknüpfte Projekte öffnen per Doppelklick/Bearbeiten |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Aktionstext auf Bearbeiten vereinheitlicht |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Aktionstext auf Bearbeiten vereinheitlicht |
| `apps/web/src/components/tickets/TicketDetail.tsx` | geändert | Verknüpfte Tickets öffnen über zentrale Öffnungslogik |
| `apps/web/src/components/tickets/TicketRelationPanel.tsx` | geändert | Öffnen-Callback für Ticket-Relationen ergänzt |
| `apps/web/src/components/usecases/UseCaseCard.tsx` | geändert | Bearbeiten-Aktion für Use-Case-Karten ergänzt |
| `apps/web/src/api/backlog.ts` | geändert | Detail-Fetch für einzelnes Backlog-Item ergänzt |
| `apps/web/src/components/test/ownerFormTestUtils.tsx` | geändert | Formulartests mit Router-Kontext abgesichert |
| `apps/web/src/components/ui/__tests__/FeatureListBoardView.test.tsx` | geändert | Edit-/Doppelklick-Erwartungen aktualisiert |
| `apps/web/src/components/ui/__tests__/ProjectListBoardView.test.tsx` | geändert | Edit-/Doppelklick-Erwartungen aktualisiert |
| `apps/web/src/components/ui/__tests__/TaskListBoardView.test.tsx` | geändert | Bearbeiten-Aktion aktualisiert |
| `apps/web/src/components/ui/__tests__/UseCaseListBoardView.test.tsx` | geändert | Edit-/Doppelklick-Erwartungen aktualisiert |
| `apps/web/e2e/domain-test-utils.ts` | neu | Gemeinsame API-Fixtures und Browser-Helfer für echte Testdaten |
| `apps/web/e2e/project.spec.ts` | geändert | Projekt-Routen, Tabs, Doppelklick, Bearbeiten und Formularwerte getestet |
| `apps/web/e2e/feature.spec.ts` | geändert | Feature-Routen, Tabs, Doppelklick, Bearbeiten und Formularwerte getestet |
| `apps/web/e2e/task.spec.ts` | geändert | Aufgaben-Routen, Owner-Tabs, Doppelklick, Bearbeiten und Formularwerte getestet |
| `apps/web/e2e/tickets.spec.ts` | geändert | Ticket-Routen, Owner-Tabs, Doppelklick, Bearbeiten und Formularwerte getestet |
| `apps/web/e2e/owner-tasks.spec.ts` | geändert | Owner-Aufgaben-Flows auf Routennavigation aktualisiert |
| `apps/web/e2e/freshness.spec.ts` | geändert | Backlog- und Tab-Flows auf Detailrouten aktualisiert |

## Probleme und Abweichungen

Keine. Die Umsetzung bleibt auf Frontend-Routen, Formular-Hosting, Domain-View-Navigation und betroffene Tests begrenzt. Es wurden keine Datenbank-, API-Routen- oder Schemaänderungen vorgenommen.

## Offene Punkte / Folgeaufgaben

Die `docs/`-Dokumentation wurde noch nicht geprüft oder aktualisiert. Die Tests sind abgeschlossen: `npm run typecheck -w apps/web`, `npm run test -w apps/web`, `npm run e2e -w apps/web` und `npm run test -w apps/api` liefen erfolgreich.
