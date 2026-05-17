# Log: Atome

**Datum:** 17.05.26  
**Schritt:** 1 — Atom-Extraktion  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die fehlenden Atom-Komponenten `Input`, `Textarea`, `Label`, `FieldHint`/`FieldError`, `Avatar`, `Spinner` und `Divider` wurden unter `apps/web/src/components/ui/` angelegt. `Button` wurde um `size` und `loading` erweitert und nutzt den neuen `Spinner`, ohne bestehende Icon-Button-Aufrufe mit eigenen Größenklassen zu brechen. `Badge`, `Pill` und `Skeleton` erhielten einheitliche JSDoc-Kommentare; `Skeleton` reicht zusätzlich normale Span-Attribute weiter. Die bisher lokale Avatar-Logik in `TaskCard` wurde durch den neuen `Avatar` ersetzt. Für die Atome wurde eine Vitest/React-Testing-Library-Suite mit 17 Tests angelegt und die nötige minimale Testinfrastruktur im Web-Workspace ergänzt. Typcheck, Atom-Test und Web-Build sind erfolgreich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/Input.tsx` | neu | Input-Atom mit Mono-Variante und `iconLeft` (19 Zeilen) |
| `apps/web/src/components/ui/Textarea.tsx` | neu | Textarea-Atom mit optionalem Auto-Resize (25 Zeilen) |
| `apps/web/src/components/ui/Label.tsx` | neu | Label-Atom mit Required-Marker (13 Zeilen) |
| `apps/web/src/components/ui/FieldHint.tsx` | neu | FieldHint und FieldError (9 Zeilen) |
| `apps/web/src/components/ui/Avatar.tsx` | neu | Initialen-Avatar mit drei Größen (25 Zeilen) |
| `apps/web/src/components/ui/Spinner.tsx` | neu | Inline-Spinner für Ladezustände (16 Zeilen) |
| `apps/web/src/components/ui/Divider.tsx` | neu | Divider mit optionalem Label (16 Zeilen) |
| `apps/web/src/components/ui/__tests__/atoms.test.tsx` | neu | Atom-Test-Suite mit 17 Fällen (117 Zeilen) |
| `apps/web/src/components/ui/Button.tsx` | geändert | `size`, `loading` und Spinner-Integration ergänzt |
| `apps/web/src/components/ui/Badge.tsx` | geändert | JSDoc ergänzt |
| `apps/web/src/components/ui/Pill.tsx` | geändert | JSDoc ergänzt |
| `apps/web/src/components/ui/Skeleton.tsx` | geändert | JSDoc und Props-Forwarding ergänzt |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Lokalen Assignee-Avatar durch `Avatar` ersetzt |
| `apps/web/package.json` | geändert | `typecheck`-Script und Test-Dev-Dependencies ergänzt |
| `apps/web/vite.config.ts` | geändert | Vitest-Environment für Web-Tests ergänzt |
| `package-lock.json` | geändert | Neue Test-Abhängigkeiten festgeschrieben |
| `logs/2026-05-17-schritt-01-atoms.md` | neu | Schritt-Log für Schritt 1 |
| `logs/README.md` | geändert | Log-Index um Schritt 1 ergänzt |

## Probleme und Abweichungen

Beim ersten Typcheck waren `fireEvent` und `screen` nicht aus `@testing-library/react` typisiert verfügbar; die Testdatei importiert diese Helfer deshalb aus `@testing-library/dom`. Der erste Vitest-Lauf startete ohne DOM-Environment, weil der Einzelbefehl aus dem Repo-Root läuft; die Testdatei setzt das Environment jetzt explizit auf `jsdom`. `npm install` meldete 4 moderate Audit-Hinweise in Abhängigkeiten; diese wurden nicht automatisch behoben, weil Dependency-Audits kein Bestandteil von Schritt 1 sind.

## Offene Punkte / Folgeaufgaben

Keine.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npx vitest run apps/web/src/components/ui/__tests__/atoms.test.tsx` | ✅ 17/17 Tests bestanden |
| `npm run build -w apps/web` | ✅ Erfolgreich, mit bestehender Vite-Warnung zu großen Chunks |
