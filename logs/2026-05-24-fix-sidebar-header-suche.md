# Log: Sidebar Header Suche

**Datum:** 24.05.26  
**Schritt:** Fix — Sidebar Header Suche  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Kopfbereich der erweiterten Sidebar wurde neu angeordnet. Das PM-Icon steht nun als eigenes Element ganz oben. Darunter liegt eine zweispaltige Titelzeile mit „Projekt Manager“ links und den Icon-Aktionen für Aktualisieren und Einklappen rechts. Die globale Suche folgt direkt darunter und beginnt durch die angepassten Abstände auf Höhe der Detail-Tabbar. Die bestehende Aktualisieren-Funktion und das Collapse-Verhalten wurden unverändert weiterverwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Sidebar-Header in Logo, Titelzeile mit Aktionsicons und Suchfeld aufgeteilt |
| `logs/2026-05-24-fix-sidebar-header-suche.md` | neu | Schritt-Log für den Layout-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine fachlichen Abweichungen. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunk-Größen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
