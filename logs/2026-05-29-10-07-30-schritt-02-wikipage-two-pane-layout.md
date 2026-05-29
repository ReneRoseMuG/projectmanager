# Log: WikiPage Two Pane Layout

**Datum:** 29.05.26  
**Uhrzeit:** 10:07:30  
**Schritt:** 2 — TASK-140 WikiPage Layout auf Flex-Two-Pane umbauen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Wiki-Seite wurde vom zentrierten Grid mit Max-Width auf einen Full-Bleed-Flex-Container umgestellt. Der Loading-Zustand reserviert nun links eine dunkle Sidebar-Fläche und rechts den Skeleton-Bereich. Im normalen Zustand sind WikiTree und Inhaltsbereich direkte Kinder des gemeinsamen Flex-Containers. Der Inhaltsbereich scrollt eigenständig und enthält Fehleranzeige, Breadcrumb und die bisherige Detailansicht noch als temporären Inhalt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/WikiPage.tsx` | geändert | Grid/Card-Layout durch Full-Bleed-Flex-Struktur ersetzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

`WikiPageDetail` ist in diesem Schritt noch bewusst als temporärer Inhalt enthalten und wird in TASK-141/142 abgelöst.
