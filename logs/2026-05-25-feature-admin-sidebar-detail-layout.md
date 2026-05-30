# Log: Admin Sidebar Detail Layout

**Datum:** 25.05.26  
**Schritt:** Feature — Admin-Bereich innere Seitenleiste und Detail-Page-Layout  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Admin-Bereich wurde auf eine innere vertikale `AdminSidebar` umgestellt; die bisherige horizontale `AdminNavigation` und der `usesOwnAdminChrome`-Mechanismus wurden entfernt. Kataloge, Tags, Sicherung, Benutzer und Rollen nutzen nun `PageHero variant="detail"` und einen weißen, scrollbaren Content-Bereich. Die Katalogseite hat eine `TabBar` pro Katalogtyp, die Sicherungsaktionen stehen als Aktionsleiste direkt unter dem Hero. Benutzer und Rollen verwenden die bestehende `ListBoardView` mit `ItemCard`, `ItemRow` und `ActionMenu`; Neu- und Bearbeiten-Aktionen öffnen `DetailModal` statt Detail-Routen. System-Rollen bleiben im Modal read-only und die Löschaktion ist deaktiviert. Die alten Detail-Routen für Benutzer und Rollen redirecten auf die jeweilige Listen-Seite.

Testleitplanken wurden angewendet. Testebenen: Unit/Component für AdminSidebar, Katalog-Tabs, Benutzer-/Rollen-ListBoardView und Modals; Browser/E2E für den betroffenen Admin-Auth-Flow. Bewiesen wird beobachtbares UI-Verhalten mit kontrollierten Hook-Daten in jsdom sowie echter Browserinteraktion in einer isolierten Playwright-Testinstanz.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/AdminSidebar.tsx` | neu | Innere vertikale Admin-Navigation |
| `apps/web/src/components/layout/AdminLayout.tsx` | geändert | Zweispaltiger Admin-Chrome ohne horizontale Tabs |
| `apps/web/src/App.tsx` | geändert | Admin-Full-Bleed und Redirects für alte Detail-Routen |
| `apps/web/src/components/admin/UserCard.tsx` | neu | Benutzerkarte für Board-Ansicht |
| `apps/web/src/components/admin/UserListBoardView.tsx` | neu | Benutzer-Adapter für ListBoardView |
| `apps/web/src/components/admin/UserEditorModal.tsx` | neu | Benutzerformular im DetailModal |
| `apps/web/src/components/admin/RoleCard.tsx` | neu | Rollenkarte für Board-Ansicht |
| `apps/web/src/components/admin/RoleListBoardView.tsx` | neu | Rollen-Adapter für ListBoardView |
| `apps/web/src/components/admin/RoleEditorModal.tsx` | neu | Rollenformular im DetailModal mit Read-only-Systemrollen |
| `apps/web/src/pages/admin/UsersPage.tsx` | geändert | Benutzerseite auf Board/Listview und Modal-Flow umgestellt |
| `apps/web/src/pages/admin/RolesPage.tsx` | geändert | Rollenseite auf Board/Listview und Modal-Flow umgestellt |
| `apps/web/src/pages/SettingsCatalogsPage.tsx` | geändert | Detail-Page-Hero und Katalog-TabBar |
| `apps/web/src/components/settings/CatalogManager.tsx` | geändert | Kataloggruppen exportiert und filterbar gemacht |
| `apps/web/src/pages/SettingsTagsPage.tsx` | geändert | Detail-Page-Hero und weißer Content-Bereich |
| `apps/web/src/components/tags/TagManager.tsx` | geändert | Eigene Header-Chrome entfernt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Detail-Page-Hero und separate Button-Aktionsleiste |
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Deaktivierbare Menüaktionen ergänzt |
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Deaktivierbare Delete-Aktion für Karten ergänzt |
| `tests/unit/web/components/layout/AdminLayout.test.tsx` | geändert | Tests auf neue AdminSidebar umgestellt |
| `tests/unit/web/pages/AdminUsersRolesPage.test.tsx` | neu | Benutzer-/Rollen-ListBoardView und Modal-Tests |
| `tests/unit/web/pages/AdminCatalogsPage.test.tsx` | neu | Katalog-TabBar-Test |
| `tests/browser/web/auth.spec.ts` | geändert | E2E auf neuen Benutzer-Modal-Flow angepasst |

## Probleme und Abweichungen

Keine. Die in der Aufgabe erlaubte Route-Strategie wurde als Redirect umgesetzt. Der Browser-Toolzugriff war nicht als direktes In-App-Browser-Tool verfügbar; die Browserprüfung wurde deshalb über den vorhandenen Playwright-E2E-Flow mit isolierter Testinstanz durchgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
