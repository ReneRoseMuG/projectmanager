# Log: Events Owner-Junction Folgeauftrag

**Datum:** 19.05.26  
**Schritt:** Fix / Folgeaufgabe  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für den verbliebenen Architektur-Nachzügler im Kalenderbereich wurde eine neue Aufgabendatei erstellt. Die Aufgabe beschreibt die Migration von direkten Event-Owner-Spalten zu n:m-Junction-Tabellen für die aktuell event-fähigen Owner `project` und `task`. Sie hält fest, dass globale Events ohne Owner erhalten bleiben und keine neuen Event-Träger ohne separate fachliche Entscheidung eingeführt werden. Außerdem sind die notwendigen Schema-, Service-, API-, UI-, Seed-/Dump- und Teständerungen inklusive Integration-, Web- und E2E-Pflichtfällen dokumentiert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/tasks/12-events-owner-junction-modell.md` | neu | Folgeauftrag für Event-Junction-Architektur |
| `logs/2026-05-19-fix-events-owner-junction-folgeauftrag.md` | neu | Schritt-Log für die Aufgabenerstellung |
| `logs/README.md` | geändert | Log-Index um neuen Eintrag ergänzt |

## Probleme und Abweichungen

Keine. Es wurde nur der Folgeauftrag dokumentiert; Produktionscode, Schema und Tests wurden nicht geändert.

## Offene Punkte / Folgeaufgaben

Die neue Aufgabe `docs/tasks/12-events-owner-junction-modell.md` muss in einem separaten Implementierungsschritt umgesetzt werden.
