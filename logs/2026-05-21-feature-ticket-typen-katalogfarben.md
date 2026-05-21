# Log: Ticket-Typen als farbige Katalogeinträge

**Datum:** 21.05.26  
**Schritt:** Feature — Ticket-Typen als farbige Katalogeinträge  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Ticket-Typen wurden aus der statischen Typ-Liste in den allgemeinen Katalog `ticketType` überführt. Katalogeinträge besitzen jetzt ein verpflichtendes Farbfeld, das in Schema, Shared Types, API-DTOs, Fixtures und UI-Helfern durchgereicht wird. Die Ticket-Services validieren `type` nun gegen den Ticket-Typ-Katalog und nutzen den niedrigsten bzw. bevorzugten Katalogeintrag als Default. Die UI verwendet Katalogfarben in Pills, Badges, Filter-Chips, Status-Toggles, Listen-/Board-Spalten und Ticket-Typ-Anzeigen als gefüllte Hintergrundfarbe mit Kontrasttext. Der Katalogeditor zeigt Ticket-Typen als eigene Gruppe und erlaubt pro Katalogeintrag die Farbauswahl über den vorhandenen ColorPicker.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `ticketType` als Katalogart ergänzt, `TicketType` dynamisiert und `CatalogEntry.color` ergänzt |
| `apps/api/src/db/schema.ts` | geändert | `catalog_entries.color` ergänzt und `tickets.type` von statischer Enum-Bindung gelöst |
| `apps/api/src/db/migrations/0026_ticket_type_catalog_colors.sql` | neu | Migration für Katalogfarben und initiale Ticket-Typ-Einträge |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration `0026_ticket_type_catalog_colors` registriert |
| `apps/api/src/db/migrations/meta/0026_snapshot.json` | neu | Drizzle-Snapshot für die neue Katalogfarbspalte |
| `apps/api/src/repositories/catalog.repository.ts` | geändert | Katalog-Updates um `color` erweitert |
| `apps/api/src/routes/catalogs.ts` | geändert | Create-/Patch-Schemas akzeptieren `color` |
| `apps/api/src/routes/tickets.ts` | geändert | Ticket-Typ-Schema auf dynamischen String umgestellt |
| `apps/api/src/services/catalogs.service.ts` | geändert | Farbvalidierung, Defaults, Status-only `isClosed` und Ticket-Typ-Fallback beim Löschen ergänzt |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Typen gegen den Katalog validiert und Default-Auflösung angepasst |
| `apps/api/src/services/ai.service.ts` | geändert | AI-Ticket-Actions von statischen Ticket-Typen entkoppelt |
| `tests/fixtures/api/db.ts` | geändert | Test-Fixtures um Katalogfarben und Ticket-Typ-Katalog erweitert |
| `apps/web/src/utils/catalogs.ts` | geändert | Fallback-Kataloge, Farbdefaults, Label-/Entry-/Color-Helper und Kontraststyles ergänzt |
| `apps/web/src/hooks/useCatalogs.ts` | geändert | `ticketTypes` im Kataloghook bereitgestellt |
| `apps/web/src/components/settings/CatalogManager.tsx` | geändert | Ticket-Typ-Gruppe, ColorPicker und Permission-aware Aktionen ergänzt |
| `apps/web/src/components/ui/Pill.tsx` | geändert | Katalogfarben als gefüllte Pill-Styles unterstützt |
| `apps/web/src/components/ui/Badge.tsx` | geändert | Gefüllte Badge-Darstellung für Katalogfarben ergänzt |
| `apps/web/src/components/ui/TicketTypeBadge.tsx` | neu | Dynamische Ticket-Typ-Badge-Komponente mit Katalogfarbe |
| `apps/web/src/components/ui/StatusPill.tsx` | geändert | Status-Pills verwenden Katalogfarben |
| `apps/web/src/components/ui/PriorityBadge.tsx` | geändert | Prioritäts-Badges verwenden Katalogfarben |
| `apps/web/src/components/ui/StatusToggle.tsx` | geändert | Status-Auswahl nutzt Katalogfarben für aktive Optionen |
| `apps/web/src/components/ui/PrioritySelect.tsx` | geändert | Priority-Fallback-Optionen enthalten Farben |
| `apps/web/src/components/ui/RadioList.tsx` | geändert | Dynamische Optionsfarben für Ticket-Typ-Auswahl unterstützt |
| `apps/web/src/components/ui/FilterChips.tsx` | geändert | Filter-Chips reflektieren Katalogfarben |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Statusspalten-Header und Spaltenhintergründe nutzen Katalogfarben |
| `apps/web/src/components/ui/PendingRelationList.tsx` | geändert | Vorgemerkte Relationen können Katalogfarben anzeigen |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Statusfilter, Spalten und Akzente nutzen Katalogfarben |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Aufgaben-Karten nutzen Prioritätsfarben aus dem Katalog |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Statusfilter und Boardspalten erhalten Katalogfarben |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Ticket-Drafts nutzen dynamische Ticket-Typen |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Ticket-Typen und Prioritäten nutzen Katalog-Badges/Farben |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Ticket-Typ-Auswahl und Subticket-Drafts nutzen dynamische Katalogoptionen |
| `apps/web/src/components/tickets/TicketLinkDialog.tsx` | geändert | Ticket-Typ-Anzeige nutzt `TicketTypeBadge` |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Feature-Akzentfarbe aus Feature-Status-Katalog |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Ticket-Drafts und Pending-Statusanzeigen nutzen Katalogdaten |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Pending-Aufgaben/-Tickets nutzen Kataloglabels und -farben |
| `apps/web/src/components/usecases/UseCaseCard.tsx` | geändert | Use-Case-Akzentfarbe aus Feature-Status-Katalog |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Ticket-Drafts und Pending-Statusanzeigen nutzen Katalogdaten |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Feature-Statusfilter enthält Katalogfarben |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Projekt-Statusfilter enthält Katalogfarben |
| `tests/browser/web/catalog-defaults.spec.ts` | geändert | Gekürzter-Katalog-Flow um `ticketType` und Farb-Restore erweitert |
| `tests/integration/api/app.integration.test.ts` | geändert | API-Default-Flow um `ticketType` und Farb-Restore erweitert |
| `tests/integration/api/auth.test.ts` | geändert | Catalog-Read/Write/Delete-Permissions für Reader abgesichert |
| `tests/integration/api/catalogs.test.ts` | geändert | Katalogfarben, Ticket-Typ-Fallback und Farbvalidierung getestet |
| `tests/integration/api/tickets.test.ts` | geändert | Dynamische Ticket-Typen aus dem Katalog getestet |
| `tests/unit/web/components/backlog/BacklogItemForm.test.tsx` | geändert | Mock-Kataloge um Farben ergänzt |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Mock-Kataloge um Farben ergänzt |
| `tests/unit/web/components/ui/StatusPill.test.tsx` | geändert | StatusPill-Tests auf Katalogfarben umgestellt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Web-Test-Fixtures um Farben und Ticket-Typen erweitert |

## Probleme und Abweichungen

`drizzle-kit generate` konnte wegen des vorhandenen Migrationsformats nicht regulär ausgeführt werden. Nach einem kurzen Format-Konvertierungsversuch wurden die automatisch erzeugten Migrations-Nebenänderungen zurückgenommen und die Migration wurde passend zum bestehenden Migrationsformat manuell angelegt. `npm run db:migrate -w apps/api` lief anschließend erfolgreich. Der API-Testlauf wurde gestartet, aber vom Nutzer unterbrochen; deshalb liegen noch keine vollständigen Testergebnisse vor.

## Offene Punkte / Folgeaufgaben

- Die seriellen Testläufe aus dem Plan stehen noch aus: `npm run test -w apps/api`, `npm run test -w apps/web` und `npm run e2e -w apps/web`.
- Falls die ausstehenden Tests Fehler melden, müssen diese in einem Folgeauftrag ausgewertet werden; während des unterbrochenen Testlaufs wurden keine Regression-Fixes vorgenommen.
