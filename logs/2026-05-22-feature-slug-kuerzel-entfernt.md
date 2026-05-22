# Log: Slug und Projekt-Kürzel entfernt

**Datum:** 22.05.26  
**Schritt:** Feature — Slug und Projekt-Kürzel entfernt  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die öffentlichen Slug-Felder für Features, Use Cases und Wiki-Seiten wurden aus Schema, Repository-, Service-, Route- und Shared-Type-Schicht entfernt. Neue Content-Dateien werden nicht mehr aus Slugs abgeleitet, sondern stabil über die jeweilige Objekt-ID benannt; vorhandene `contentPath`-Werte bleiben bei Updates erhalten. Das Projekt-Kürzel wurde aus dem Projektformular entfernt, weil es keine beauftragte fachliche Bedeutung hat. Frontend-Formulare, Detailansichten, Suche, Importdarstellung, Beziehungen und Tests wurden so angepasst, dass keine Slug-Eingaben oder Slug-Anzeigen mehr erwartet werden. Die Wiki-Import-Zuordnung verwendet jetzt vorhandene fachliche Titel beziehungsweise bestehende Relationen statt Slug-Werte.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Slug-Spalten aus Features, Use Cases und Wiki-Seiten entfernt |
| `apps/api/src/db/migrations/0027_remove_document_slugs.sql` | neu | Migration zum Entfernen der Slug-Spalten und Indizes |
| `apps/api/src/db/migrations/meta/0027_snapshot.json` | neu | Drizzle-Snapshot nach der Schemaänderung |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration 0027 im Journal eingetragen |
| `apps/api/src/repositories/feature.repository.ts` | geändert | Slug-Felder und Slug-Lookups entfernt |
| `apps/api/src/repositories/use-case.repository.ts` | geändert | Slug-Felder und Slug-Lookups entfernt |
| `apps/api/src/repositories/wiki-page.repository.ts` | geändert | Slug-Felder entfernt, Content-Pfad-Update ergänzt |
| `apps/api/src/routes/features.ts` | geändert | API-Schema ohne Slug-Eingabe |
| `apps/api/src/routes/use-cases.ts` | geändert | API-Schema ohne Slug-Eingabe |
| `apps/api/src/routes/wiki.ts` | geändert | API-Schema ohne Slug-Eingabe |
| `apps/api/src/services/content.service.ts` | geändert | Dateinamen werden ID-basiert erzeugt |
| `apps/api/src/services/features.service.ts` | geändert | Feature-DTOs und Content-Pfade ohne Slug |
| `apps/api/src/services/use-cases.service.ts` | geändert | Use-Case-DTOs und Content-Pfade ohne Slug |
| `apps/api/src/services/wiki.service.ts` | geändert | Wiki-DTOs und Content-Pfade ohne Slug |
| `apps/api/src/services/wiki-import.service.ts` | geändert | Import-Zuordnung ohne Slug-Feld |
| `apps/api/src/services/doc-links.service.ts` | geändert | Dokument-Link-Ausgaben ohne Slug |
| `apps/api/src/services/ai.service.ts` | geändert | KI-Payloads ohne Slug-Pflichtfelder |
| `packages/shared-types/src/index.ts` | geändert | Öffentliche Shared Types ohne Slug-Felder |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Projekt-Kürzel aus dem Formular entfernt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Feature-Slug-Eingabe entfernt |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Feature-Slug-Anzeige entfernt |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | Listen-/Suchlogik ohne Slug |
| `apps/web/src/components/features/FeatureRelationPanel.tsx` | geändert | Relationsauswahl ohne Slug |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Projekt-Feature-Panel ohne Slug-Metadaten |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Use-Case-Slug-Eingabe entfernt |
| `apps/web/src/components/usecases/UseCaseListBoardView.tsx` | geändert | Listen-/Suchlogik ohne Slug |
| `apps/web/src/components/usecases/UseCaseRelationPanel.tsx` | geändert | Relationsauswahl ohne Slug |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Wiki-Slug-Eingabe entfernt |
| `apps/web/src/components/wiki/WikiPageDetail.tsx` | geändert | Wiki-Slug-Anzeige entfernt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Zielauswahl ohne Slug-Suche |
| `apps/web/src/components/imports/WikiImportPanel.tsx` | geändert | Import-Ergebnis ohne Slug-Anzeige |
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Globale Suche ohne Slug-Metadaten |
| `tests/fixtures/api/factories.ts` | geändert | API-Fixtures ohne Slug-Felder |
| `tests/fixtures/web/components/ui/factories.ts` | geändert | Web-Fixtures ohne Slug-Felder |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Owner-Testdaten ohne Slug-Felder |
| `tests/integration/api/features.test.ts` | geändert | Feature-API-Tests ohne Slug-Payloads |
| `tests/integration/api/use-cases.test.ts` | geändert | Use-Case-API-Tests ohne Slug-Payloads |
| `tests/integration/api/wiki.test.ts` | geändert | Wiki-API-Tests ohne Slug-Payloads |
| `tests/integration/api/wiki-import.test.ts` | geändert | Wiki-Import-Tests ohne Slug-Erwartungen |
| `tests/integration/api/backlog.test.ts` | geändert | Testdaten ohne Slug-Abhängigkeit |
| `tests/integration/api/doc-links.test.ts` | geändert | Testdaten ohne Slug-Abhängigkeit |
| `tests/integration/api/dumps-local.test.ts` | geändert | Dump-SQL ohne Slug-Spalten |
| `tests/integration/api/app.integration.test.ts` | geändert | API-Integrationstestdaten ohne Slug |
| `tests/integration/web/hooks/queryMutations.integration.test.tsx` | geändert | Query-Mutation-Testdaten ohne Slug |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Formular-Test ohne Slug-Feld |
| `tests/unit/web/components/features/FeatureDetail.test.tsx` | geändert | Detail-Test ohne Slug-Anzeige |
| `tests/unit/web/components/usecases/UseCaseForm.test.tsx` | geändert | Formular-Test ohne Slug-Feld |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Formular-Test ohne Slug-Feld |
| `tests/unit/web/components/wiki/WikiPageDetail.test.tsx` | geändert | Detail-Test ohne Slug-Anzeige |
| `tests/unit/web/components/ui/ProjectFeaturePanel.test.tsx` | geändert | Panel-Test ohne Slug-Metadaten |
| `tests/unit/web/components/ui/UseCaseListBoardView.test.tsx` | geändert | Board-Test ohne Slug-Metadaten |
| `tests/unit/web/components/ui/MilestoneListBoardView.test.tsx` | geändert | Testkommentar ohne Slug-/Kürzel-Bezug |
| `tests/unit/web/pages/FeatureDetailPage.test.tsx` | geändert | Page-Testdaten ohne Slug |
| `tests/unit/web/pages/UseCaseDetailPage.test.tsx` | geändert | Page-Testdaten ohne Slug |
| `tests/unit/web/pages/WikiPage.test.tsx` | geändert | Page-Testdaten ohne Slug |
| `tests/browser/web/domain-test-utils.ts` | geändert | Browser-Test-Fixtures ohne Slug-Payloads |
| `tests/browser/web/feature.spec.ts` | geändert | Browser-Test ohne Slug-Eingabe |
| `tests/browser/web/project.spec.ts` | geändert | Projekt-Browser-Test ohne Kürzel/Slug-Erwartung |
| `tests/browser/web/catalog-defaults.spec.ts` | geändert | Browser-Test ohne Slug-Felder |
| `tests/browser/web/freshness.spec.ts` | geändert | Hilfsfunktion ohne Slugify-Abhängigkeit |
| `tests/browser/web/ticket-detail-tabs.spec.ts` | geändert | Hilfsfunktion ohne Slugify-Abhängigkeit |

## Probleme und Abweichungen

`npm run db:generate` konnte nicht genutzt werden, weil das vorhandene Script noch den nicht mehr unterstützten Befehl `drizzle-kit generate:sqlite` verwendet. Der direkte Drizzle-Generate-Aufruf verlangte eine vorherige Strukturaktualisierung und erzeugte kurzzeitig ein neues Migrationsordnerformat; diese generierten Ordner wurden nicht übernommen. Die Migration wurde deshalb im vorhandenen Repo-Migrationsformat angelegt und anschließend mit `npm run db:migrate -w apps/api` erfolgreich angewendet.

## Offene Punkte / Folgeaufgaben

Ein voller Testlauf wurde noch nicht ausgeführt; die Entscheidung dazu erfolgt im Abschluss gemäß Repo-Vorgabe.
