# Log: Dev-Start ohne tsx

**Datum:** 18.05.26  
**Schritt:** Fix — Dev-Start ohne tsx  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der normale API-Dev-Start wurde vom fehleranfälligen `tsx watch src/index.ts` auf einen kompilierten Startpfad umgestellt. `npm run dev -w apps/api` baut nun zuerst TypeScript, kopiert die Migrationen nach `dist` und startet anschließend parallel `tsc --watch` sowie `node --watch dist/index.js`. Damit wird der bekannte `esbuild spawn UNKNOWN`-Fehler unter Node 24 vermieden. Zusätzlich wurde `db:migrate` auf denselben kompilierten Migrationspfad umgestellt, damit auch dieses Kommando ohne `tsx` funktioniert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/package.json` | geändert | `dev` und `db:migrate` laufen ohne `tsx` über kompiliertes JavaScript |
| `logs/2026-05-18-fix-dev-start-ohne-tsx.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Beim Root-Smoke war Port 5173 zunächst durch einen anderen Prozess belegt; Vite wich erwartungsgemäß auf 5174 aus. Beim wiederholten Smoke war 5173 frei. Der API-Start war in beiden Fällen gesund. Git zeigte nach der Prüfung gelöschte Markdown-Dateien, die nicht Teil dieses Fixes sind; diese Fremdänderungen wurden nicht angefasst.

## Offene Punkte / Folgeaufgaben

Keine.
