# Log: Sidebar rechter Abstand

**Datum:** 24.05.26  
**Schritt:** Fix — Sidebar rechter Abstand  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der geöffnete Sidebar-Container hat rechts jetzt denselben Außenabstand wie links. Dafür wurde die Tailwind-Klasse im expanded Zustand von `pr-0` auf `pr-4` geändert. Die bestehende Sidebar-Struktur mit getrennten Navigations- und In-neuem-Tab-Buttons bleibt unverändert. Die zugehörige Unit-Test-Erwartung wurde angepasst, damit der gewünschte Abstand künftig abgesichert ist.

Testleitplanken: Der Testentwurfs-Skill wurde angewendet. Betroffene Testebene ist ein Web-Unit-Test. Bewiesen wird, dass die gerenderte expanded Sidebar die erwarteten Layout-Klassen trägt. Es werden die vorhandenen Unit-Test-Mocks für technische Abhängigkeiten genutzt; produktive Daten, Datenbanken und Dateisysteme sind nicht betroffen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Expanded Sidebar erhält rechts `pr-4` statt `pr-0` |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Erwartung für den rechten Sidebar-Abstand angepasst |
| `logs/2026-05-24-fix-sidebar-rechter-abstand.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
