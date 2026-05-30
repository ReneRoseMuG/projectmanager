# Log: PageHero Sidebar Alignment

**Datum:** 24.05.26  
**Schritt:** Feature — TASK-47 PageHero-Refactoring ohne Farbänderungen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

TASK-47 wurde auf dem Arbeitsbranch `task-47-page-hero` umgesetzt. Es wurde eine gemeinsame `PageHero`-Komponente für Listen- und Detailbereiche angelegt, die über `--hero-h` dieselbe Höhe wie der Sidebar-Kopf nutzt. Der expanded Sidebar-Kopf wurde strukturell neu aufgebaut und an die gemeinsame Höhe angebunden; der collapsed State bleibt unverändert bedienbar. Listen-, Settings- und ausgewählte Admin-Seiten wurden auf `PageHero` umgestellt, während Board-, Filter- und Aktionslogik fachlich unverändert bleiben. `FormModal` und `DetailModal` nutzen die neue Detail-Variante für Page-Layouts; Modal-Layouts behalten ihr natürliches Höhenverhalten. Die ausdrücklich gewünschte Einschränkung wurde eingehalten: Es wurden keine globalen Farbtoken und keine Sidebar-/Hero-Gradienten angeglichen.

Testleitplanken wurden angewendet. Abgedeckte Testebenen: Web-Unit-Tests mit jsdom für Komponentenstruktur und Interaktionen sowie Browser/E2E mit echter Testinstanz in `tests/.runtime` für das beobachtbare Sidebar-/Hero-Alignment.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/PageHero.tsx` | neu | Gemeinsame PageHero-Basiskomponente für Listen- und Detailvarianten |
| `apps/web/src/App.tsx` | geändert | Layout-CSS-Variable `--hero-h` und Full-Bleed-Routen ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Expanded Sidebar-Kopf auf feste Hero-Höhe umgestellt |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Page-Form-Header nutzt `PageHero` |
| `apps/web/src/components/ui/DetailModal.tsx` | geändert | Page-Detail-Header nutzt `PageHero` |
| `apps/web/src/pages/**` | geändert | Betroffene Listen-, Settings- und Admin-Seiten auf `PageHero` migriert |
| `tests/unit/web/components/**` | geändert/neu | Unit-Tests für PageHero, Sidebar, AdminLayout und FormModal angepasst |
| `tests/browser/web/page-hero-alignment.spec.ts` | neu | E2E-Geometrietest für Sidebar-/PageHero-Flucht |

## Probleme und Abweichungen

Keine. Die in TASK-47 enthaltene Farbangleichung wurde bewusst nicht umgesetzt, weil der Nutzer ausdrücklich „keine Farbänderungen“ vorgegeben hat.

## Offene Punkte / Folgeaufgaben

Keine.
