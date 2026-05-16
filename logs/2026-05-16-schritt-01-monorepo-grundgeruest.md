# Log: Monorepo Grundgerüst

**Datum:** 16.05.26  
**Schritt:** 1 — Monorepo-Grundgerüst (workspaces, tsconfig, tooling)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Repository wurde als npm-Monorepo mit den Workspaces `apps/api`, `apps/web` und `packages/shared-types` angelegt. Die mitgelieferte `agents.md` wurde ins Projekt übernommen und ist damit die lokale Arbeitsanweisung. Root-Skripte für Entwicklung, Build, Migration und Tests wurden eingerichtet. Gemeinsame TypeScript-Konfiguration, `.gitignore`, `.npmrc` und die Grundordnerstruktur wurden angelegt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | neu | Projektanweisung übernommen |
| `package.json` | neu | Root-Workspace und Skripte |
| `tsconfig.base.json` | neu | Gemeinsame TypeScript-Basis |
| `.gitignore` | neu | Ignoriert Build-, Env-, DB- und Upload-Artefakte |
| `.npmrc` | neu | npm löst den dokumentierten `@dnd-kit`-Peer-Konflikt |
| `.eslintrc.cjs` | neu | ESLint-Konfiguration |
| `docs/README.md` | neu | Dokumentationsordner initialisiert |

## Probleme und Abweichungen

`workspace:*` wurde durch lokale `file:`-Referenzen ersetzt, weil das installierte npm diese Referenzform in diesem Projektlauf nicht akzeptiert hat.

## Offene Punkte / Folgeaufgaben

Keine.
