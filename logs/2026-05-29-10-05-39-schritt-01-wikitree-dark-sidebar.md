# Log: WikiTree Dark Sidebar

**Datum:** 29.05.26  
**Uhrzeit:** 10:05:39  
**Schritt:** 1 — TASK-139 WikiTree auf Dark-Sidebar-Stil umstellen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der WikiTree wurde vom weißen Card-Stil auf eine dunkle Steel-Sidebar umgestellt. Der doppelte Wiki-Header und der primäre „Neue Seite“-Button wurden durch ein kompaktes Seiten-Label mit Icon-Button ersetzt. Der Empty-State ist nun inline auf dunklem Hintergrund gestaltet. Aktive und inaktive Tree-Links, Expand/Collapse-Controls und Unterseiten-Buttons verwenden die vorgesehenen weißen Hover- und Aktiv-Zustände. Zusätzlich wurde ein optionaler Navigations-Guard vorbereitet, damit spätere Inline-Änderungen vor einem Seitenwechsel bestätigt werden können.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | Dark-Sidebar-Stil, Empty-State und optionaler Navigations-Guard |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die konkrete Dirty-State-Verdrahtung erfolgt in TASK-141, wenn das Inline-Formular eingeführt wird.
