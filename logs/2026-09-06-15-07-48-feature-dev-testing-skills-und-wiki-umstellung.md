# Log: dev-testing-skills-Plugin übernommen und Doku auf das Wiki umgestellt

**Datum:** 06.09.26
**Uhrzeit:** 15:07:48
**Schritt:** Feature — Abschluss der Skill-Plugin-Umstellung
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Umstellung auf die Skill-Library-Plugins war hier bereits für `pm-workflow-skills` erfolgt (Commits `e954c58`, `e209192`, `12dcf92`). Offen blieben die sieben Entwicklungs- und Test-Skills, die weiterhin als lokale Kopien unter `.claude/skills/` lagen, weil das Plugin `dev-testing-skills` zum damaligen Zeitpunkt nicht auf GitHub verfügbar war. Der Grund war ein zweiter, nie gepushter Klon der Skill Library; die Analyse dazu steht in `nachtrag-pm-handover.md`.

Das Plugin ist inzwischen gepusht und installiert. Die sieben lokalen Kopien konnten deshalb entfallen. `leitfaden-pflege` bleibt projekteigen, da es nicht generalisiert ist.

Der SessionStart-Hook installierte bisher nur `pm-workflow-skills` — auf einem neuen Rechner hätte `dev-testing-skills` gefehlt. Hook und `enabledPlugins` sind entsprechend ergänzt; dieselbe Lücke wurde in der Vorlage der Skill Library geschlossen.

Zusätzlich wurde die Entscheidung des Nutzers nachgezogen, dass Spezifikation und Anwenderdokumentation künftig ausschließlich im Wiki des Projekt Managers entstehen und die Domänenobjekte Feature und Use Case dafür nicht mehr verwendet werden. Die neue Datei `.claude/project-context/wiki.md` benennt die Wurzelseite dieses Projekts (`Lastenheft`, Seite 22) und den Seitenaufbau darunter. Wichtig für dieses Repo: Der Verzicht betrifft die Projektdokumentation, nicht den Code — die Entitäten `features` und `useCases` bleiben Gegenstand der Anwendung, solange sie nicht ausgebaut sind. Dieser Ausbau ist ein eigener Auftrag und war nicht Teil dieser Arbeit.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.claude/project-context/wiki.md` | angelegt | Wurzelseite (Lastenheft, ID 22), Seitenaufbau, Nummernvergabe, Abgrenzung Doku gegen Code |
| `.claude/hooks/ensure-plugins.sh` | geändert | installiert zusätzlich `dev-testing-skills@skill-library` |
| `.claude/settings.json` | geändert | `dev-testing-skills@skill-library` in `enabledPlugins` |
| `agents.md` | geändert | §7.3 auf drei Skill-Quellen erweitert; Verweis auf `tech-stack.md` als Quelle der stackkonkreten Fakten; Wiki-Absatz ergänzt; `FEAT`/`UC` aus der Parent-Referenzliste für Abschlusskommentare entfernt; „Repo-Skill"-Formulierungen auf §7.3 umgestellt |
| `.claude/skills/architektur/` … `test-quality-review/` | gelöscht | sieben Ordner, jetzt aus Plugin `dev-testing-skills` |

Ausserhalb dieses Repos, `source/repos/Skill Library` — Commit `b2f2482`, nach `origin/main` gepusht: `templates/ensure-plugins.sh` und `templates/settings-snippet.md` um `dev-testing-skills` und einen Hinweis zur Versionspflicht ergänzt.

## Verifikation

- `claude plugin list`: `dev-testing-skills@skill-library` und `pm-workflow-skills@skill-library` installiert und aktiv
- Wiki-Struktur gegen den realen Bestand geprüft: `Wiki` (20) → `Apps` (349) → `Projekt Manager` (19) → `Lastenheft` (22) mit 17 Unterseiten
- `.claude/skills/` enthält nur noch `leitfaden-pflege`
- Kein Testlauf und kein Audit — die Änderung berührt keinen Produktivcode

## Probleme und Abweichungen

Der Plugin-Eintrag `pm-workflow-skills` im Project-Scope dieses Repos steht noch auf 1.0.0, während der User-Scope auf 1.1.0 aktualisiert wurde. Da der User-Scope global gilt und `enabledPlugins` das Plugin ohnehin deklariert, ist die Wirkung unkritisch; eine Bereinigung sollte aus einer Sitzung in diesem Repo erfolgen.

`logs/README.md` beginnt mit einem BOM und enthält im Titel eine falsch kodierte Umlautfolge („Log-Ãœbersicht"). Der Fehler ist Bestand und wurde nicht angefasst.

## Offene Punkte / Folgeaufgaben

- Ausbau der Entitäten `features` und `useCases` aus der Anwendung — eigener Umsetzungsauftrag, hier nur dokumentarisch vorbereitet.
- Der MCP stellt für Wiki-Seiten keinen Kommentar-Endpunkt bereit, obwohl die Anwendung `wikiPageComments` kennt. Redaktionsnachweise gehen deshalb an das Projekt. Eine Erweiterung des MCP um `parentType: "wikiPage"` wäre die sauberere Lösung und ist als Beobachtung festgehalten.
- Die beiden Übergabedokumente `claude-handover-skill-plugins.md` und `nachtrag-pm-handover.md` im Repo-Root sind mit dieser Umsetzung erledigt und können entfernt werden.
- `logs/README.md`: BOM und Mojibake im Titel bereinigen.
