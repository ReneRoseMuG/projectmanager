# Handover an Claude Code: Skill-Library-Plugins einrichten — Projekt Manager

Dieses Dokument wurde von einer Cowork-Sitzung (Cloud, kein direkter GitHub-Zugriff über
die Geräte-Bridge) vorbereitet und an eine lokale Claude-Code-Sitzung in diesem Repo
übergeben, weil die verbleibenden Schritte echten Netzwerkzugriff (`git push`,
`claude plugin marketplace add`) und Zugriff auf `~/.claude/plugins` brauchen — beides
war von der Cowork-Sitzung aus nicht möglich.

## Ziel

Die acht Entwicklungs-/Test-Skills (`architektur`, `code-discipline`, `datenmodell`,
`exploration`, `planungsleitplanken`, `test-entwurfsleitplanken`, `test-quality-review`,
`testing`) sowie die Projekt-Manager-Workflow-Skills sollen nicht mehr als lose Kopie in
`.claude/skills/` liegen, sondern aus zwei zentralen Claude-Code-Plugins kommen, die aus
dem Repo `https://github.com/ReneRoseMuG/Skill-Library.git` installiert werden. Damit
bekommt jeder Rechner (Homeoffice/Büro) über `git pull` + Plugin-Update denselben Stand.

## Voraussetzung — zuerst prüfen

Die Skill Library liegt aktuell auf Branch `plugin-restructure`, **noch nicht in
`main` gemerged und noch nicht nach GitHub gepusht** (lokaler Klon lag unter
`Skill Library/`, 2 Commits vor `origin/main`). Der Plugin-Marketplace-Mechanismus
von Claude Code liest standardmäßig den Default-Branch (`main`) des GitHub-Repos.

**Vor allem anderen:** mit dem Nutzer klären, ob `plugin-restructure` gepusht und nach
`main` gemerged werden soll (oder ob der Marketplace-Eintrag stattdessen explizit auf den
Branch zeigen soll). Ohne diesen Schritt liefert `claude plugin marketplace add` nur die
alte, unveränderte Version der Bibliothek.

## Bekannter Blocker — vor der Installation klären

In diesem Repo ist bereits ein MCP-Plugin namens **`projekt-manager`** aktiv
(Tool-Präfix `mcp__plugin_projekt-manager_projekt-manager__*`), aber `.claude/settings.json`
enthält dafür keine sichtbaren `enabledPlugins`/`extraKnownMarketplaces`-Einträge — es
scheint also maschinen-/nutzerweit unter `~/.claude/plugins` installiert zu sein.

Das neue Plugin `pm-workflow-skills` (aus der Skill Library) deklariert **ebenfalls**
einen MCP-Server namens `projekt-manager` (siehe `plugins/pm-workflow-skills/.claude-plugin/.mcp.json`,
URL aktuell `http://127.0.0.1:3001/mcp` — vor Verwendung gegen die tatsächlich laufende
Projekt-Manager-Instanz prüfen).

1. `claude plugin list` ausführen und/oder `~/.claude/plugins` ansehen: was ist das
   bestehende `projekt-manager`-Plugin, woher stammt es, welche Version/Quelle?
2. Mit dem Nutzer klären: bestehendes Plugin durch `pm-workflow-skills` ersetzen,
   nebeneinander betreiben (Risiko: doppelte MCP-Registrierung/Tool-Namenskollision),
   oder das bestehende Plugin ist bereits identisch/Vorläufer und kann einfach ersetzt werden?
3. Erst nach dieser Klärung mit der Installation fortfahren.

## Aktueller Stand in diesem Repo

- Branch `work`, lokal committet (noch **nicht gepusht**): `.claude/project-context/tech-stack.md`
  (Commit `ea04b45`, "Projektkontext für dev-testing-skills-Plugin anlegen") — enthält
  Schichten, MySQL/Drizzle/Aiven-Pool-Limits, TanStack-Query-Konventionen, Testkommandos,
  Domänen-Tabelle, Git-Kurzkommandos (Hauptbranch `main`).
- Davor bereits committet (ebenfalls **nicht gepusht**): Commit `4754a40`, aktualisierte
  "Quelle (Ebene 1)"-Fußzeilen in den bestehenden Skill-Dateien.
- `.claude/skills/` enthält weiterhin die alten, projekteigenen Skill-Kopien (Stand dieser
  Sitzung — vor dem Löschen unbedingt mit `ls .claude/skills/` erneut prüfen, ob sich das
  geändert hat):
  `architektur`, `code-discipline`, `datenmodell`, `dokumentation`, `exploration`,
  `feature-editorial`, `leitfaden-pflege`, `mcp-code-auftrag`, `planungsleitplanken`,
  `projekt-manager`, `spezifikation`, `tagebuch`, `test-entwurfsleitplanken`,
  `test-quality-review`.

  Achtung: Dieses Repo nennt die Doku-Skills **`dokumentation`/`spezifikation`** (deutsch) —
  die Skill-Library-Fassung im neuen Plugin `pm-workflow-skills` heißt **`documentation`/
  `specification`** (englisch). Das ist eine Umbenennung, keine reine Löschung.

## Auftrag

1. Voraussetzung oben klären (Skill-Library-Branch) und Blocker oben klären
   (bestehendes `projekt-manager`-Plugin).
2. Marketplace + Plugins registrieren:
   ```bash
   claude plugin marketplace add ReneRoseMuG/Skill-Library
   claude plugin install pm-workflow-skills@skill-library
   claude plugin install dev-testing-skills@skill-library
   ```
3. `plugins/pm-workflow-skills/.claude-plugin/.mcp.json` prüfen: zeigt die URL wirklich
   auf die lokal laufende Projekt-Manager-MCP-Instanz? Bei Abweichung anpassen (im
   Skill-Library-Repo, nicht hier).
4. Alte, jetzt durch Plugins abgedeckte Skill-Ordner unter `.claude/skills/` entfernen
   (Liste oben) — **außer** `leitfaden-pflege` (noch nicht generalisiert, bleibt
   projekteigen).
5. `.claude/project-context/tech-stack.md` gegenlesen: Fakten noch aktuell? Insbesondere
   DB-Pool-Limits, Domänen-Tabelle, Auth-Permission-Mapping. Bei Abweichungen aktualisieren.
6. `agents.md`-Nummerierung prüfen/vereinheitlichen, falls durch die neuen Skill-Referenzen
   nötig (§13.1.1 o. ä. — siehe `claude/aktualisierung-konzept.md` im Projekt "Skill Library"
   auf claude.ai für Hintergrund).
7. Verifizieren: Skills werden geladen (z. B. `architektur` triggert bei einer
   Architekturfrage), keine doppelte MCP-Tool-Registrierung, `graphify`-Aufrufe aus den
   Skills funktionieren weiterhin.
8. Alles committen und **pushen** (Branch `work`, inkl. der beiden bereits lokal
   vorhandenen Commits `4754a40` und `ea04b45`).
9. Ergebnis, offene Punkte und getroffene Entscheidungen (insbesondere zum Plugin-Konflikt)
   als Kommentar an `PROJ-3` loggen (Standard-Log-Ziel dieses Repos, siehe
   `docs/projekt-kontext.md` und `mcp-code-auftrag`-Skill).

## Nicht Teil dieses Auftrags

- Die grundsätzliche Entscheidung, ob das bestehende `projekt-manager`-Plugin ersetzt wird,
  trifft der Nutzer — nicht eigenmächtig entscheiden.
- MuGPlan wird separat gehandhabt (eigenes Handover-Dokument).
