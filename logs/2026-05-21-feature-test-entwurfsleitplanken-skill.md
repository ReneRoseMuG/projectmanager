# Log: Test-Entwurfsleitplanken-Skill

**Datum:** 21.05.26  
**Schritt:** Feature — Test-Entwurfsleitplanken-Skill  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Es wurde ein neuer repo-versionierter Skill für den Entwurf aussagekräftiger Tests angelegt. Der Skill definiert Mocks als Werkzeug für Unit-Tests und schließt einflussreiche Mocks in Integrationstests aus. Integration, Browser-/E2E-Tests, Datenbanktests und Dateisystemtests werden auf echte Objekte, echte Daten und isolierte Testumgebungen verpflichtet. Zusätzlich enthält der Skill Regeln für negative Gegenbeispiele, Rollen- und Permission-Fälle, beobachtbare Assertions und einen erweiterten Testkommentar. Eine manuelle Strukturprüfung hat Frontmatter, Body und `agents/openai.yaml` bestätigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `skills/projekt-manager-test-entwurfsleitplanken/SKILL.md` | neu | Skill-Anweisung für Testentwurf, Mock-Regeln, Isolation und Aussagekraft |
| `skills/projekt-manager-test-entwurfsleitplanken/agents/openai.yaml` | neu | UI-Metadaten für den Skill |
| `logs/README.md` | geändert | Log-Index um neuen Feature-Eintrag ergänzt |

## Probleme und Abweichungen

Die Skill-Creator-Skripte `init_skill.py` und `quick_validate.py` konnten nicht ausgeführt werden, weil weder `python` noch `py` in dieser PowerShell verfügbar sind. Die Skill-Struktur wurde deshalb manuell nach Skill-Creator-Vorgaben angelegt und per PowerShell auf Frontmatter, Body und `agents/openai.yaml` geprüft.

## Offene Punkte / Folgeaufgaben

Die offizielle Skill-Validierung mit `quick_validate.py` sollte nachgeholt werden, sobald ein Python-Launcher in der Umgebung verfügbar ist.
