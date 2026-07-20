# Log: Gesamttest und Build

**Datum:** 19.07.26  
**Uhrzeit:** 21:02:17  
**Schritt:** 17 — Gesamttest und Build  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die serielle Testorchestrierung wurde auf Windows korrigiert: Statt `npm.cmd` direkt zu starten, ruft das Skript den von npm bereitgestellten Einstiegspunkt über den laufenden Node-Prozess auf. Der gezielte API-Nachtest der fünf zuvor roten Dateien ist mit 5/5 Dateien und 52/52 Tests grün. Der vollständige Root-Testlauf wurde seriell über alle vier Workspaces ausgeführt und setzte nach roten Workspaces wie vorgesehen fort; API und Windows Importer waren grün, MCP und Web blieben rot. Der MCP-Lauf erreicht nach der MySQL-Testisolation 74/75 grüne Tests und zeigt nun einen fachlichen Konflikt beim Löschen einer noch projektverknüpften Aufgabe. Im Web bleiben 5/85 gezielt nachgestellte Tests rot: Vier Formular-Tests bilden die verpflichtende Bibliotheksauswahl nicht ab, ein Meilensteinseiten-Test erwartet noch die alte Upload-Signatur. Der vollständige Build aller Workspaces ist erfolgreich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/run-tests.mjs` | neu | Serielle Root-Testorchestrierung mit workspaceübergreifender Fehlerfortsetzung und Windows-kompatiblem npm-Aufruf |
| `package.json` | geändert | Root-Testkommando an die serielle Orchestrierung angebunden |
| `apps/mcp-server/vitest.config.ts` | geändert | MySQL-Testumgebung aus der Root-Testkonfiguration geladen |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | MCP-Integrationstest auf isolierte MySQL-Testdatenbank umgestellt |
| `apps/mcp-server/package.json` | geändert | `dotenv` für die Testkonfiguration ergänzt |
| `package-lock.json` | geändert | Abhängigkeitssperre nachgeführt |

## Testleitplanken

Angewendet wurden `projekt-manager-test-entwurfsleitplanken` und die Testregeln aus `agents.md`. Betroffen sind API- und MCP-Integrationstests sowie Web-Unit-/Komponententests. Beobachtet wurden reale HTTP-, Persistenz- und Dateiabläufe mit isolierter MySQL-Testdatenbank beziehungsweise temporären Upload-Verzeichnissen; Web-Komponenten verwenden die bestehenden kontrollierten Mocks. Neue rote Befunde wurden während des Testlaufs nicht repariert, sondern als Folgearbeiten abgegrenzt.

## Probleme und Abweichungen

Der erste Root-Aufruf scheiterte unter Windows mit `spawn EINVAL`, weil Node `npm.cmd` nicht direkt starten konnte; die Testorchestrierung wurde daraufhin am Ausführungsmechanismus korrigiert und erneut vollständig ausgeführt. Im MCP-Test `delete_task` liefert die Anwendung fachlich korrekt `409 CONFLICT`, solange die Testaufgabe mit einem Projekt verknüpft ist; der Test stellt noch keinen löschbaren Zustand her. Im Web sind fünf Assertions nicht auf den MS-80-Uploadvertrag nachgeführt. Diese roten Tests blockieren den Build und die übrigen Arbeitspakete nicht, verhindern aber eine vollständige Testabnahme.

## Offene Punkte / Folgeaufgaben

- MCP-Testdaten für `delete_task` in einen zulässig löschbaren Zustand versetzen oder den erwarteten Konflikt als eigenen Negativfall trennen.
- In vier Formular-Tests die explizite Bibliotheksauswahl vor dem Submit abbilden und die Pending-Dateien weiterhin vollständig prüfen.
- In `MilestonesPage.test.tsx` die Attachment-Erwartungen um `libraryVisibility` erweitern.
- Danach Root-Testlauf erneut ausführen; bis dahin bleiben MS-80 und die betroffenen Aufgaben aktiv.
