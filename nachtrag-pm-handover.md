# Nachtrag zum Handover „Skill-Library-Plugins einrichten" (Projekt Manager)

Ergänzung vom 06.09.26, nachdem die parallele MuGPlan-Sitzung eine berechtigte Rückfrage
gestellt hat: Zum Zeitpunkt des ursprünglichen Handovers existierte das Plugin
`dev-testing-skills` zwar real (von der Cowork-Sitzung gebaut), war aber nie nach GitHub
gepusht worden — es lag in einem lokalen Skill-Library-Klon, der nicht derselbe war wie der,
aus dem später `plugin-restructure` tatsächlich gepusht und nach `main` gemergt wurde. Details
und vollständige Fehleranalyse: siehe `antwort-rueckfrage-skill-plugins.md` im MuGPlan-Repo
(`Plan/Releases/version02`), falls für den Hintergrund gewünscht.

**Vor Schritt 2 dieses Handovers (Plugin-Installation) bitte prüfen:**

```bash
claude plugin marketplace add ReneRoseMuG/Skill-Library
```

Falls dabei `dev-testing-skills` **nicht** gefunden wird: Der Fix liegt als Patch
`0001-dev-testing-skills-onto-current-main.patch` im MuGPlan-Repo (`Plan/Releases/version02`)
bereit und muss zuerst dort (oder direkt im Skill-Library-Repo) angewendet und nach
`origin/main` gepusht werden — danach den Marketplace erneut hinzufügen/aktualisieren.

Falls `dev-testing-skills` bereits gefunden wird: Der Fix wurde inzwischen gepusht, hier ist
nichts weiter zu tun — mit Schritt 2 des ursprünglichen Handovers fortfahren.

**Zusätzliche Korrektur zu Schritt 3 des ursprünglichen Handovers:** Die MCP-Server-Deklaration
des Plugins `pm-workflow-skills` liegt im Plugin-Wurzelverzeichnis
(`plugins/pm-workflow-skills/.mcp.json`), nicht unter `.claude-plugin/.mcp.json`. Die
tatsächliche URL wurde von einer anderen lokalen Sitzung bereits gegen die laufende Instanz
verifiziert: `http://127.0.0.1:3010/mcp` (nicht `3001` — das ist die REST-API der App, nicht
der MCP-Server).
