# Log: Modal-Footer

**Datum:** 16.05.26  
**Schritt:** 7 — Modal-Footer  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Task-Detail-Dialog besitzt nun einen festen Footer mit kontextabhängigem Hinweis und zentralem Speicherbutton. Der Button ist nur im Details-Tab aktiv und sendet dort das Details-Formular ab. In allen anderen Tabs bleibt er deaktiviert, damit keine falsche Speichererwartung entsteht. Der Task-Detail-Stand wurde anschließend mit `npm run lint` und `npm run build` geprüft.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Footer mit Details-Speicherlogik ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
