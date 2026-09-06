# Log: Nachtrag — Plugin-Versionsstand im Project-Scope

**Datum:** 06.09.26
**Uhrzeit:** 15:10:03
**Schritt:** Nachtrag zu `2026-09-06-15-07-48-feature-dev-testing-skills-und-wiki-umstellung.md`
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der vorangegangene Log führte unter „Probleme und Abweichungen" auf, dass `pm-workflow-skills` im Project-Scope dieses Repos noch auf 1.0.0 stand, während der User-Scope bereits auf 1.1.0 aktualisiert war. Damit hätte hier weiterhin die alte, auf Feature- und Use-Case-Objekte ausgelegte Fassung der Doku-Skills gegriffen.

Ursache war der Standardwert des Update-Befehls: `claude plugin update` arbeitet ohne weitere Angabe immer auf dem User-Scope, auch wenn er im Projektverzeichnis aufgerufen wird. Mit `--scope project` liess sich der Eintrag gezielt nachziehen.

## Geänderte / angelegte Dateien

Keine Repo-Dateien. Geändert wurde ausschliesslich die lokale Plugin-Registrierung unter `~/.claude/plugins`.

## Verifikation

Alle Einträge stehen jetzt auf dem aktuellen Stand: `pm-workflow-skills` 1.1.0 im User- und im Project-Scope, `dev-testing-skills` 1.0.0 im User-Scope.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Der Punkt „Plugin-Eintrag im Project-Scope steht auf 1.0.0" aus dem vorangegangenen Log ist damit erledigt. Für künftige Plugin-Aktualisierungen gilt: Ein Repo mit eigenem Project-Scope-Eintrag braucht `claude plugin update <plugin> --scope project` zusätzlich zum User-Scope-Update.
