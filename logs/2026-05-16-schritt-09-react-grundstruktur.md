# Log: React Grundstruktur

**Datum:** 16.05.26  
**Schritt:** 9 — Vite/React Grundstruktur (Router, Layout, API-Layer)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Vite-React-App wurde mit Tailwind, React Router, Layout-Komponenten und API-Layer aufgebaut. Routen für Projekte, Projektdetail, Kalender und Not Found sind vorhanden. Der API-Layer verwendet `ky` und kapselt HTTP-Zugriffe pro Domänenbereich. Der Frontend-Build läuft erfolgreich durch.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/App.tsx` | neu | Router und Layout |
| `apps/web/src/main.tsx` | neu | React-Einstiegspunkt |
| `apps/web/src/components/layout/Sidebar.tsx` | neu | Seitennavigation |
| `apps/web/src/components/layout/TopBar.tsx` | neu | Kopfbereich |
| `apps/web/src/api/*.ts` | neu | API-Funktionen |
| `apps/web/src/hooks/*.ts` | neu | Daten-Hooks |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
