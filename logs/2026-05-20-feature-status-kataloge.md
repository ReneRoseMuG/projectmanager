# Log: Status- und Prioritätskataloge

**Datum:** 20.05.26  
**Schritt:** Feature — Status- und Prioritätskataloge  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die festen Status-Enums wurden in editierbare Katalogeinträge überführt: Arbeitsstatus für Projekte, Meilensteine, Aufgaben, Backlog und Tickets sowie ein eigener Feature-Status für Features und Use Cases. Prioritäten gelten nur noch für Aufgaben und Tickets; die Backlog-Priorität wurde aus Shared Types, API, UI und Migration entfernt. Status- und Prioritätskataloge besitzen `sortOrder`, Statuskataloge zusätzlich `isClosed`; beim Löschen werden betroffene Objekte auf den niedrigsten verbleibenden Sortierwert zurückgesetzt. Die Status-Auswahl nutzt nun eine gemeinsame `StatusToggle`-Komponente, Prioritäten werden über ein gemeinsames Dropdown gewählt. Tab-Zähler in Formularen zählen statusfähige Einträge nur noch, wenn deren Status nicht geschlossen ist; statuslose Einträge werden vollständig gezählt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Katalogtypen ergänzt, Status/Priorität dynamisiert, Backlog-Priorität entfernt |
| `apps/api/src/db/schema.ts` | geändert | `catalog_entries` ergänzt, Status/Priorität auf Text umgestellt, Backlog-Priorität entfernt |
| `apps/api/src/db/migrations/0021_eager_moon_knight.sql` | neu | Katalogtabelle, Startwerte und Drop von `backlog_items.priority` |
| `apps/api/src/repositories/catalog.repository.ts` | neu | Repository für versionierte Katalogeinträge |
| `apps/api/src/services/catalogs.service.ts` | neu | CRUD, Validierung, Default-Auflösung und Fallback beim Löschen |
| `apps/api/src/routes/catalogs.ts` | neu | REST-Endpunkte für Katalogverwaltung |
| `apps/api/src/services/*.ts` | geändert | Status-/Prioritätsvalidierung auf Kataloge umgestellt |
| `apps/web/src/hooks/useCatalogs.ts` | neu | TanStack Query Hook für Kataloge |
| `apps/web/src/components/ui/StatusToggle.tsx` | neu | Gemeinsame Statusauswahl |
| `apps/web/src/components/ui/PrioritySelect.tsx` | neu | Gemeinsame Prioritätsauswahl |
| `apps/web/src/components/settings/CatalogManager.tsx` | neu | Admin-Oberfläche für Status- und Prioritätskataloge |
| `apps/web/src/components/**/*Form.tsx` | geändert | Formulare auf StatusToggle, PrioritySelect und offene Tab-Zähler umgestellt |
| `apps/api/tests/integration/catalogs.test.ts` | neu | API-Tests für Update und Lösch-Fallbacks |

## Probleme und Abweichungen

Ein zunächst gezielter Katalog-Testlauf wurde mit falscher Vitest-Argumentübergabe gestartet und lief dadurch über die API-Suite. Dabei waren 301 bestehende Tests grün, nur die neue Katalog-Testdatei war rot, weil der Test-App-Builder die neue Route noch nicht registrierte. Die Test-App-Registrierung wurde ergänzt; der gezielte Katalog-Testlauf ist danach grün.

## Offene Punkte / Folgeaufgaben

Ein vollständiger Testlauf über API, Web und E2E wurde noch nicht gestartet.
