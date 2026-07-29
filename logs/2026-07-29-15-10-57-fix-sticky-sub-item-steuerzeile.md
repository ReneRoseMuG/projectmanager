# Log: Sticky Sub-Item-Steuerzeile

**Datum:** 29.07.26  
**Uhrzeit:** 15:10:57  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsame Toolbar der `ListBoardView` wurde als sticky Kopfbereich innerhalb des vorhandenen Scrollcontainers ausgeführt. Suche, Filter, View-Switch und Aktionen bleiben dadurch beim vertikalen Scrollen von Sub-Item-Listen sichtbar. Der Eingriff liegt bewusst in der gemeinsamen Basiskomponente, weil alle betroffenen Sub-Item-Boards diese Struktur verwenden. Ein gezielter Komponententest prüft die sticky Klassen und stellt zugleich sicher, dass sämtliche Steuerelemente weiterhin in derselben Toolbar liegen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Gemeinsame Toolbar sticky positioniert |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Sticky-Verhalten und bestehende Steuerung abgesichert |
| `logs/2026-07-29-15-10-57-fix-sticky-sub-item-steuerzeile.md` | neu | Schritt-Log für TKT-166 |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken

Angewendet wurde `test-entwurfsleitplanken` auf der Ebene Unit. Der Test verwendet die echte React-Komponente in jsdom, löst keine Netzwerk-, DB- oder Dateisystemzugriffe aus und prüft das beobachtbare Strukturverhalten ohne Komponenten-Mocks.
