# Log: Planungsleitplanken-Skill

**Datum:** 20.05.26  
**Schritt:** 1 — Planungsleitplanken-Skill  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der neue Repo-Skill `projekt-manager-planungsleitplanken` wurde unter `skills/` angelegt, damit er mit Git versioniert und auf anderen Arbeitsplätzen verfügbar ist. Der Skill enthält eine schlanke `SKILL.md` mit starkem Trigger für Planungen im Chat und im Plan-Modus. Detailregeln wurden in gezielte Referenzen ausgelagert: Planung, Architektur, Auth/Rollen, Tests, Git-Workflow, UI-Leitplanken und Abnahmekriterien. `agents.md` wurde ergänzt, damit dieser Skill bei künftigen Planungen verbindlich genutzt wird und trotzdem `agents.md` die maßgebliche Quelle bleibt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Planungs-Skill als Pflicht ergänzt und Projektstruktur erweitert |
| `skills/projekt-manager-planungsleitplanken/SKILL.md` | neu | Skill-Trigger und Planungsablauf |
| `skills/projekt-manager-planungsleitplanken/agents/openai.yaml` | neu | UI-Metadaten und implizite Aktivierung |
| `skills/projekt-manager-planungsleitplanken/references/*.md` | neu | Architektur-, Auth-, Test-, Git-, UI- und Abnahmeregeln |
| `logs/2026-05-20-schritt-01-planungsleitplanken-skill.md` | neu | Schritt-Log für die Skill-Anlage |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Das `skill-creator`-Initialisierungsskript konnte nicht ausgeführt werden, weil auf dem System kein `python` oder `py` im PATH verfügbar ist. Die Skill-Struktur wurde deshalb manuell nach den Vorgaben des Skill-Creators angelegt und anschließend dateibasiert geprüft.

## Offene Punkte / Folgeaufgaben

Spätere verbindliche UI-Regeln können in `skills/projekt-manager-planungsleitplanken/references/ui-guidelines.md` ergänzt werden.
