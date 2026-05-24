# Log: Sidebar Hero Abstände

**Datum:** 24.05.26  
**Schritt:** Fix — Sidebar-Hero und Main-View-Hero  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Main-View-Hero wurde auf dieselbe steel-farbige Hero-Zone wie die Detailseiten umgestellt. Die globale Suche wurde unterhalb des Navigation-Hero platziert und steht nun direkt über dem ersten Hauptnavigationstitel. Oberhalb und unterhalb der Suchzeile wird derselbe vertikale Abstand verwendet. Der Sidebar-Hero wurde auf volle Breite korrigiert, damit der horizontale Trennstrich rechts keine Lücke mehr zeigt und der PM-Block nicht optisch nach links verschoben wirkt. Das Label „Projekt Manager“ wurde größer gesetzt und innerhalb des verbleibenden Hero-Bereichs vertikal zentriert.

Testleitplanken wurden angewendet. Testebene: Web-Unit-Tests mit jsdom; bewiesen wird die DOM-Reihenfolge von Hero, globaler Suche und erstem Navigationstitel sowie die relevanten Klassen für Breite, Abstand und Label-Darstellung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Hero-Breite, PM-Label, Suchposition und Abstände korrigiert |
| `apps/web/src/components/ui/PageHero.tsx` | geändert | Listen-Hero auf Detail-Hero-Farbzone umgestellt |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Sidebar-Reihenfolge, Breite und Abstände abgesichert |
| `tests/unit/web/components/ui/PageHero.test.tsx` | geändert | Dunkle Listen-Hero-Variante abgesichert |
| `tests/unit/web/pages/SettingsPreferencesPage.test.tsx` | geändert | Erwartung an dunklen Main-View-Hero angepasst |

## Probleme und Abweichungen

Der zuvor gestartete gezielte Browser/E2E-Lauf wurde durch eine Nutzerunterbrechung abgebrochen und nach diesem kleinen Nachfolge-Fix nicht erneut ausgeführt. TypeScript und die gezielten Web-Unit-Tests sind grün.

## Offene Punkte / Folgeaufgaben

Optional: den gezielten Browser/E2E-Test `page-hero-alignment.spec.ts` nachholen, falls eine browserbasierte Geometrieprüfung für diesen Feinschliff gewünscht ist.
