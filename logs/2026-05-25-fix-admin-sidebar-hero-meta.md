# Log: Admin Sidebar Hero Meta

**Datum:** 25.05.26  
**Schritt:** Fix — Admin Sidebar und Hero-Metatexte  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die innere Admin-Navigation wurde optisch an Mockup und Screenshot angepasst: dunkle schmale Spalte, Admin-Label, Icon-Kacheln und aktive Hervorhebung mit seitlichem Indikator. Die gerahmten Counter in den Admin-Hero-Bereichen wurden auf einfachen Text ohne Rahmen und ohne Hintergrund umgestellt. Der zusätzliche Untertitel im Sicherungs-Hero wurde entfernt. Auch die nicht notwendigen „Administration“-Subtitel auf Benutzer- und Rollen-Hero wurden entfernt, damit die Admin-Detailseiten keine neuen erklärenden Untertitel einführen.

Testleitplanken wurden angewendet. Testebene: Unit/Component. Bewiesen wird, dass die AdminSidebar als dunkle Icon-Sidebar aktiv markiert und dass der Katalog-Hero-Counter als einfacher Text ohne Badge-Rahmen gerendert wird.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/AdminSidebar.tsx` | geändert | Dunkle Icon-Navigation nach Mockup |
| `apps/web/src/pages/SettingsCatalogsPage.tsx` | geändert | Counter als einfacher Hero-Text |
| `apps/web/src/pages/SettingsTagsPage.tsx` | geändert | Counter als einfacher Hero-Text |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Sicherungs-Unteritel aus Hero entfernt |
| `apps/web/src/pages/admin/UsersPage.tsx` | geändert | unnötigen Hero-Unteritel entfernt |
| `apps/web/src/pages/admin/RolesPage.tsx` | geändert | unnötigen Hero-Unteritel entfernt |
| `tests/unit/web/components/layout/AdminLayout.test.tsx` | geändert | Erwartungen auf dunkle Icon-Sidebar aktualisiert |
| `tests/unit/web/pages/AdminCatalogsPage.test.tsx` | geändert | Hero-Counter ohne Badge-Rahmen abgesichert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
