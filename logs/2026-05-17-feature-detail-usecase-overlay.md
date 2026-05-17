# Log: Feature-Detail Use-Case Overlay

**Datum:** 17.05.26  
**Schritt:** Feature — Feature-Detail und Use-Case-Overlay  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Feature-Detailseite wurde an das neue Mockup `Feature.html` aus der Designstudie angepasst. Die Seite nutzt jetzt Tabs für Stammdaten und Use Cases, sodass die Use Cases nicht mehr als rechte Seitenleiste neben dem Feature-Formular erscheinen. Der Use-Case-Bereich bietet eine Board- und Listenansicht mit Statusgruppierung und Zählern. Neue und bestehende Use Cases öffnen dasselbe Overlay-Formular; die bisherige Inline-Bearbeitung unterhalb der Seite wird dadurch nicht mehr verwendet. Die bestehenden Hooks und API-Funktionen bleiben unverändert eingebunden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Tabs, UC-View-State und Overlay-Bearbeitung verdrahtet |
| `apps/web/src/components/usecases/UseCaseList.tsx` | geändert | Use-Case-Board und Listenansicht aus dem Mockup umgesetzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Overlay-Form für neue und bestehende Use Cases erweitert |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Die Mockup-Kennzahlen „Verknüpfte Projekte“ und „Aufgaben“ wurden nicht ergänzt, weil die vorhandenen Feature-Daten diese Werte nicht liefern. Stattdessen bleiben die vorhandenen belastbaren Feature-Werte sichtbar: Status, Use Cases, Sortierung und Aktualisierung. Der Vite-Build meldet weiterhin nur die bekannte Chunk-Size-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
