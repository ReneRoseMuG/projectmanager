# Log: Lint Restfehler

**Datum:** 31.05.26  
**Uhrzeit:** 15:45:57  
**Schritt:** Fix — Lint Restfehler  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die beiden verbliebenen Lintfehler wurden behoben. Im Web-Hook für die Status-Kaskade wird `statusSortOrder` nicht mehr per ungenutztem Destructuring herausgefiltert, sondern die Dialogdaten werden explizit ohne dieses Feld aufgebaut. Im Use-Case-Service wurde der serverseitige Parent-Kontext-Helper von `useCaseParentContexts` in `buildUseCaseParentContexts` umbenannt, damit die React-Hook-Regel ihn nicht fälschlich als Hook-Aufruf interpretiert. Die fachliche Logik und die API-Kontrakte bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useStatusCascadeWorkflow.tsx` | geändert | Dialog-Item-Mapping ohne ungenutztes Feld formuliert |
| `apps/api/src/services/use-cases.service.ts` | geändert | Server-Helper hook-neutral umbenannt |
| `logs/2026-05-31-15-45-57-fix-lint-restfehler.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. `npm run lint -w apps/web`, `npm run lint -w apps/api` und `npm run build` laufen erfolgreich. Der Build meldet weiterhin nur die bekannte Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.
