# Log: Sidebar Edge Style

**Datum:** 24.05.26  
**Schritt:** 52 — TASK-52 Sidebar Refactor — neuer Stil (edge-style)  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Sidebar wurde auf den MS-15-Edge-Stil umgebaut. Der neue Header zeigt eine Custom-SVG-Mark, die Wordmark „Projekt Manager", das Meta-Label `Lokal · v0.1.0` und den Einklapp-Button; der alte Refresh-Button und der zentrierte PM-Tile wurden entfernt. Die Navigation verwendet jetzt einzeilige Edge-Rows mit linkem Aktivbalken und integrierter External-Link-Affordanz, während Permission-Filterung und Standalone-Tab-Logik erhalten bleiben. Die Suchleiste sitzt in der Sektion „Einstellungen" vor dem Einstellungs- bzw. Administrationseintrag. Serverstatus und User-Footer wurden in den neuen Stil überführt, das bestehende collapsed-Verhalten mit `localStorage` bleibt erhalten.

Der Testentwurfs-Skill `projekt-manager-test-entwurfsleitplanken` wurde angewendet. Abgedeckte Testebenen: Unit/jsdom für Sidebar-Routing, Permission-Gating, `window.open`-Isolation und `localStorage`; Browser/E2E für echte Sidebar-/PageHero-Geometrie und collapsed Interaktion.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Edge-Sidebar, Header, Search-Position, Serverstatus und User-Footer umgesetzt |
| `apps/web/src/styles/theme.css` | geändert | Sidebar-Token und Edge-CSS-Klassen ergänzt |
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Unit-Erwartungen auf Edge-Struktur, integrierte Tab-Buttons und collapsed Verhalten aktualisiert |
| `tests/browser/web/page-hero-alignment.spec.ts` | geändert | Browser-Geometrie auf neue Edge-Sidebar statt alten Sidebar-Hero umgestellt |

## Probleme und Abweichungen

Der vollständige Browserlauf `npm run e2e -w apps/web` ist nicht vollständig grün: 81 Tests bestanden, 2 Auth-Tests in `tests/browser/web/auth.spec.ts` schlagen fehl, weil nach Login `/projects` erwartet wird, die App aber auf `/` landet. Dieser Befund liegt außerhalb des TASK-52-Scopes und wurde nicht eigenständig behoben. Zusätzlich schlägt `npm run lint -w apps/web` an `apps/web/src/components/ui/ListBoardView.tsx` wegen eines ungenutzten Imports `CirclePlus` fehl; diese Datei wurde im Rahmen von TASK-52 nicht geändert.

## Offene Punkte / Folgeaufgaben

Die beiden Auth-E2E-Fehler und der bestehende Lint-Befund sollten in einem separaten Folgeauftrag geklärt werden.
