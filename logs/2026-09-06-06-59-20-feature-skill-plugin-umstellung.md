# Log: Skill-Library als Plugin, PM-Workflow-Skills aus dem Marketplace

**Datum:** 06.09.26  
**Uhrzeit:** 06:59:20  
**Schritt:** Feature — Übergabe aus `claude-handover-skill-plugins.md` ausführen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die sechs projektunabhängigen PM-Workflow-Skills kommen ab sofort aus dem Plugin `pm-workflow-skills@skill-library` (Repo `ReneRoseMuG/Skill-Library`) statt als lose Kopie unter `.claude/skills/`. Damit bekommen Büro- und Homeoffice-Rechner denselben Stand über `git pull` in der Bibliothek plus Plugin-Update.

Drei Angaben der Übergabe waren überholt und wurden vor der Ausführung berichtigt:

Erstens gab es kein installiertes `projekt-manager`-Plugin — der beschriebene Konflikt existierte nicht. In `~/.claude/plugins` war ausschließlich der offizielle Anthropic-Marketplace registriert, `enabledPlugins` war leer. Die Anbindung kam aus einem gewöhnlichen MCP-Eintrag in `~/.claude.json`. Der Permissions-Eintrag `mcp__plugin_projekt-manager_projekt-manager__*` in `.claude/settings.json` verwies auf ein Plugin, das es nie gab, und wurde ersetzt.

Zweitens existiert kein Plugin `dev-testing-skills`. Der Zweig `plugin-restructure` enthält nur `plugins/pm-workflow-skills/`; die Bibliothek erklärt in ihrer README ausdrücklich, dass `dev-testing/` bewusst kein Plugin ist, weil dessen Inhalt je Repository an den Technologiestack gebunden ist. Der geplante Installationsschritt wäre fehlgeschlagen. Entfernt wurden deshalb nur die sechs vom Plugin abgedeckten Skills; die sieben Entwicklungs-/Test-Skills und `leitfaden-pflege` bleiben projekteigen.

Drittens zeigte die MCP-Adresse des Plugins auf Port 3001. Das ist die REST-API, deren `/mcp`-Pfad mit `401 UNAUTHORIZED` antwortet. Der MCP-Server (`projekt-manager-mcp 0.1.0`) läuft auf Port 3010; die Adresse wurde in der Bibliothek korrigiert und der Prüfhinweis in deren README durch die verifizierte Angabe ersetzt.

Vor dem Löschen der lokalen Skills wurde jede Fassung gegen ihre Plugin-Entsprechung verglichen. Die Kurzfassungen von `specification` und `documentation` waren ärmer als die lokalen Vorgänger: die Use-Case-Pflichtabschnitte (Alternativabläufe, Fehlerfälle mit konkreter Systemreaktion, Nachbedingung), die Verlustfreiheitsregel, drei Doku-Prüfpunkte, die Nicht-Veröffentlichen-Regel und die Ergebnisstufen fehlten. Alle Inhalte lagen in der Ebene-1-Referenz des Plugins vor, wurden in die Kurzfassungen zurückgeholt und verweisen für das vollständige Verfahren nun auf die Referenzdokumente. Erst danach wurden die lokalen Kopien entfernt.

`.claude/project-context/tech-stack.md` wurde gegen den Code gegengelesen. Die Verweisquelle `dev-testing-skills/reference/tech-stack-template.md` existiert nicht mehr. Der Pool war unvollständig beschrieben (`maxIdle 5`, `idleTimeout 60000` fehlten). Die öffentlichen Routen waren falsch: nicht `/api/auth/*` pauschal, sondern vier benannte Auth-Endpunkte plus `/health`, `/api/health` und zwei Google-Kalender-Callbacks. Die Domänentabelle nannte neun Domänen und eine nicht existierende Tabelle `objectJournal`; tatsächlich führt `schema.ts` 94 Tabellen — ergänzt wurden Tagesplanung, DMS, Kalender/Termine, Backlog, Benachrichtigungen, Tagebuch und Konfiguration/Dashboard.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.claude/settings.json` | geändert | Marketplace `skill-library`, Plugin aktiviert, SessionStart-Hook, veralteter Permissions-Eintrag ersetzt |
| `.claude/hooks/ensure-plugins.sh` | neu | Installiert Marketplace und Plugin bei Sitzungsbeginn nach (idempotent) |
| `.claude/skills/{projekt-manager,mcp-code-auftrag,dokumentation,spezifikation,feature-editorial,tagebuch}/` | gelöscht | Durch das Plugin abgedeckt |
| `.claude/project-context/tech-stack.md` | geändert | Vorlagenverweis, Pool-Limits, öffentliche Routen und Domänentabelle gegen den Code berichtigt |
| `agents.md` | geändert | Neuer Abschnitt 7.3 „Skill-Herkunft"; Projektstrukturbaum um `.claude/hooks/` ergänzt |
| `docs/skill-documentation/{feature-editorial,mcp-code-auftrag,projekt-manager-basis}.md` | geändert | Herkunftshinweis auf das Plugin, veraltete `.claude/skills/`-Pfade berichtigt |

Im Repository `ReneRoseMuG/Skill-Library` (eigene Commits, gepusht): MCP-Adresse auf Port 3010, README- und Skill-Portverweise, Rückholung der fehlenden Redaktionsregeln in `specification`/`documentation`, `enabledPlugins` im Settings-Snippet auf die Objektform. Der Zweig `plugin-restructure` wurde nach `main` gemerged, weil der Marketplace-Mechanismus den Standardzweig liest.

Außerhalb des Repositorys: `~/.claude/settings.json` (Marketplace und Plugin, von der CLI geschrieben) und Entfernung des globalen `projekt-manager`-MCP-Eintrags aus `~/.claude.json`, damit der Server nicht doppelt registriert ist.

## Probleme und Abweichungen

Die Verifikation in einer frischen Sitzung war nicht möglich: `claude -p` bricht mit `401 OAuth access token has expired` ab, während die Desktop-Sitzung weiterläuft. Geprüft wurde deshalb strukturell — Frontmatter aller sechs Plugin-Skills, Gültigkeit aller Plugin- und Marketplace-JSON-Dateien, Syntax beider Hook-Skripte, `claude plugin list` meldet das Plugin als aktiviert, und der MCP-Server antwortet auf `initialize` mit `projekt-manager-mcp 0.1.0`. Dass die sechs Skills tatsächlich auslösen, zeigt sich erst in der nächsten Sitzung.

Codeänderungen gab es keine, entsprechend kein Testlauf. `graphify query` wurde nach dem Umbau ausgeführt und liefert weiterhin Ergebnisse.

## Verifikation

- `claude plugin list`: `pm-workflow-skills@skill-library`, Version 1.0.0, Status aktiviert.
- Alle sechs Plugin-Skills haben gültiges Frontmatter mit `name` und `description`.
- `plugin.json`, `.mcp.json`, `hooks.json`, `marketplace.json` und `.claude/settings.json` sind gültiges JSON.
- MCP auf Port 3010 antwortet mit `projekt-manager-mcp 0.1.0`; Port 3001 `/mcp` antwortet erwartungsgemäß mit `401`.
- `ensure-plugins.sh` und `session-log-reminder.sh` sind syntaktisch fehlerfrei.
- `graphify query` liefert nach dem Umbau weiterhin einen Teilgraphen.
- `claude mcp list` nach Entfernen des globalen Eintrags — sowohl im Repository als auch im Home-Verzeichnis genau ein Server: `plugin:pm-workflow-skills:projekt-manager … ✔ Connected`. Keine Doppelregistrierung.
- `~/.claude.json` vor der Änderung als `.bak-2026-09-06-plugin-umstellung` gesichert; alle 9 Projekteinträge unverändert.
- Verbleibende Repo-Skills: `architektur`, `code-discipline`, `datenmodell`, `exploration`, `leitfaden-pflege`, `planungsleitplanken`, `test-entwurfsleitplanken`, `test-quality-review`.

## Offene Punkte / Folgeaufgaben

- Die Skills laden erst in einer neuen Sitzung. Erste echte Auslöseprobe steht aus.
- Die deutschen Skillnamen `dokumentation`/`spezifikation` heißen im Plugin `documentation`/`specification`. Auslöser in der Beschreibung sind weiterhin deutsch, aber der direkte Aufruf über den alten Namen greift nicht mehr.
- MuGPlan hat das Plugin noch nicht installiert und verliert mit dem entfernten globalen Eintrag vorübergehend den MCP-Zugriff. Dort denselben Marketplace- und Plugin-Eintrag ergänzen (Vorlage: `templates/settings-snippet.md` der Bibliothek). Wird laut Übergabe separat gehandhabt.
- In der Skill Library liegt der verwaiste Zweig `skill-orchestration-graphify` (Juni 2026). Sein Inhalt wurde beim Plugin-Umbau neu geschrieben, der Zweig ist überholt und kann nach Sichtung gelöscht werden.
- Der Berechtigungseintrag in `.claude/settings.json` deckt vorsorglich drei mögliche Namensformen ab, weil die tatsächliche Werkzeug-Präfixform erst in einer neuen Sitzung sichtbar wird. Der Servername lautet `plugin:pm-workflow-skills:projekt-manager`; nach der ersten Sitzung kann auf das zutreffende Muster reduziert werden.
- `claude -p` ist auf diesem Rechner nicht angemeldet; für headless-Verifikationen wäre eine Neuanmeldung der CLI nötig.
