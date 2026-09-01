# Log: Nicht ausgeführte Abnahmeblöcke

**Datum:** 31.08.26  
**Uhrzeit:** 18:05:41  
**Schritt:** Test — Nicht ausgeführte Abnahmeblöcke  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Auf Wunsch wurden nur die bislang nicht vollständig ausgeführten Testblöcke der Abnahmematrix seriell gestartet. Der API-Gesamttest wurde nicht erneut gestartet, weil der Nutzer ausdrücklich nur die nicht ausgeführten Tests laufen lassen wollte. MCP-Server, Windows-Importer, Web-Tests und Build wurden vollständig ausgeführt und sind grün. Der Browser-/E2E-Lauf wurde gestartet, zeigte jedoch sofort zahlreiche 0-ms-Fehler über mehrere Specs hinweg; nach 26 gleichartigen Fehlern wurde der Lauf kontrolliert beendet, um keinen langen, offensichtlich systemischen Fehlermarathon ohne zusätzlichen Erkenntnisgewinn weiterlaufen zu lassen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-08-31-18-05-41-test-nicht-ausgefuehrte-abnahmebloecke.md` | neu | Teststatus der nachgeholten Abnahmeblöcke dokumentiert |
| `logs/README.md` | geändert | Log-Index um diesen Testlauf ergänzt |

## Testleitplanken

Der Skill `test-entwurfsleitplanken` wurde angewendet. Betroffene Testebenen waren Unit/Integration für MCP, Windows-Importer und Web sowie Browser/E2E für Playwright. Es wurden bestehende Tests mit vorhandener Isolation ausgeführt; es wurden keine Produktivdaten, keine Upload-Ordner und keine Backups berührt. Es wurden keine Mocks oder Assertions verändert.

## Ergebnisse

| Befehl | Ergebnis |
|---|---|
| `npm test -w apps/mcp-server` | ✅ 6 Testdateien, 76 Tests bestanden |
| `npm test -w apps/windows-importer` | ✅ 1 Testdatei, 9 Tests bestanden |
| `npm test -w apps/web` | ✅ 136 Testdateien, 929 Tests bestanden |
| `npm run build` | ✅ Build bestanden; Vite meldet nur Chunk-Größenwarnung |
| `npm run e2e -w apps/web` | ⚠️ gestartet, aber nach 26 sofortigen 0-ms-Fehlern kontrolliert beendet |

## Probleme und Abweichungen

Der E2E-Lauf bricht systemisch an vielen Specs direkt bei Teststart weg. Sichtbar waren unter anderem `auth.spec.ts`, `calendar.spec.ts`, `catalog-defaults.spec.ts`, `create-child-elements.spec.ts` und `dashboard.spec.ts`. Zusätzlich meldete Vite während des Laufs eine Dependency-Reoptimierung wegen geändertem Lockfile. Durch den kontrollierten Abbruch liegt keine vollständige Playwright-Endsummary vor; `test-results/.last-run.json` markiert den Lauf als `failed`.

## Offene Punkte / Folgeaufgaben

Der Browser-/E2E-Startblocker muss separat diagnostiziert werden. Ein Fix wurde gemäß Nutzeranweisung nicht vorgenommen und benötigt vor Umsetzung eine neue Genehmigung.
