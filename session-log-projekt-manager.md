## Session-Log: Skill-Library-Vereinheitlichung (Cowork, 05.–06.09.26)

**Ziel:** Skills für Softwareentwicklung/Testing von PM-Workflow-Skills trennen, in MuGPlan
und Projekt Manager einheitliche, aktuelle Skills etablieren, Sync über lokale Repos
sicherstellen, Projekt-Manager-MCP-Nutzung und Kommentar-Logging vereinheitlichen.

**Ergebnis:**
- Skill Library (`ReneRoseMuG/Skill-Library`) als Marketplace mit zwei Claude-Code-Plugins
  strukturiert: `pm-workflow-skills` (MCP-Basiszugriff, Arbeitsauftrags-Orchestrierung,
  Doku-/Wiki-Redaktion, Tagebuch) und `dev-testing-skills` (Architektur, Datenmodell,
  Exploration, Code-Disziplin, Planungs- und Test-Gates — technologiestack-generisch, liest
  Projektfakten aus einer neuen `.claude/project-context/tech-stack.md` pro Repo).
- `dev-testing-skills` zunächst fälschlich als "nicht teilbar" eingeschätzt, nach
  Nutzer-Korrektur (MuGPlan und Projekt Manager sind technisch gleichartige Apps) als echtes
  drittes Plugin nachgebaut.
- `tech-stack.md` für Projekt Manager und MuGPlan erstellt und lokal committet (jeweils
  eigener Arbeitsbranch, kein automatischer Push).
- Verteilungsproblem aufgetreten und behoben: `dev-testing-skills` landete zunächst in einem
  lokalen Skill-Library-Klon, der nie gepusht wurde, während eine parallele lokale
  Claude-Code-Sitzung einen anderen Klon weiterentwickelte und pushte. Per Cherry-Pick auf den
  aktuellen `origin/main`-Stand rekonstruiert und als Patch an die lokale MuGPlan-Sitzung
  übergeben, die die Rückfrage gestellt hatte.
- Zwei Handover-Dokumente (Projekt Manager, MuGPlan) für lokale Claude-Code-Sitzungen erstellt,
  die die eigentliche Plugin-Installation und das Entfernen der alten `.claude/skills/`-Kopien
  übernehmen — inkl. Prüfauftrag für einen möglichen Konflikt mit einem bereits vorhandenen
  `projekt-manager`-Plugin.

**Wichtige Entscheidung (Nutzer, während der Sitzung bestätigt):** Der Projekt Manager wird
für MuG Plan das einzige Werkzeug für Spezifikationen; das Wiki „MuG Plan Lastenheft" wird
alleinige Quelle statt der bisherigen Doppelstruktur mit Feature-/Use-Case-Domänenobjekten.
Begründung: Doppelpflege zweier Quellen für denselben Inhalt lief auseinander; die
Domänenobjekte gelten als veraltet, das Wiki als vollständigerer Bestand. Die
Feature-/Use-Case-Domänenobjekte werden in Kürze aus dem Projekt Manager entfernt.

**Offene Punkte / nächste Schritte:**
- Plugin-Installation (`pm-workflow-skills`, `dev-testing-skills`) in beiden Repos noch nicht
  vollzogen — Handover-Dokumente liegen bereit, ausstehender Prüfpunkt: Konflikt mit
  bestehendem `projekt-manager`-Plugin.
- Umbau von `specification`, `feature-editorial` und `documentation`s Quellenpriorität von
  Feature-/Use-Case-MCP-Objekten auf Wiki-Werkzeuge — als eigener Auftrag an Claude Code
  übergeben, noch nicht umgesetzt.
- Lokale Commits in allen drei Repos (Skill Library, Projekt Manager, MuGPlan) müssen noch
  vollständig nach GitHub durchgereicht werden.
