# Log: Meilenstein Aufgaben Link-Kandidaten

**Datum:** 02.06.26  
**Uhrzeit:** 10:16:00  
**Schritt:** Fix — Meilenstein-Aufgaben Link-Kandidaten  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Kandidatenabruf für `ownerType=milestone` wurde von der globalen Aufgabenliste auf einen gezielten Meilenstein-Pfad umgestellt. Für bestehende Meilensteine lädt die API jetzt direkt die sichtbaren Aufgaben des zugehörigen Projekts und ergänzt weiterhin neutrale, nicht zugeordnete Aufgaben. Bereits direkt mit dem Meilenstein verknüpfte Aufgaben sowie geschlossene Aufgaben werden ausgeschlossen. Damit wird der lange globale Projektkontext-Abgleich vermieden, der im Dialog nach langer Wartezeit zu einer leeren Liste führen konnte. Der Testentwurfs-Skill wurde angewendet; betroffen ist die API-Integrationsebene mit echter Test-App und Testdatenbank, ohne Mocks.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tasks.service.ts` | geändert | Schneller Kandidatenpfad für bestehende Meilenstein-Aufgaben ergänzt |
| `tests/integration/api/tasks.test.ts` | geändert | Integrationstest für projektgebundene Aufgaben als Meilenstein-Link-Kandidaten ergänzt |
| `logs/2026-06-02-10-16-00-fix-meilenstein-aufgaben-link-kandidaten.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Der gezielte Integrationstestlauf konnte lokal nicht ausgeführt werden, weil die MySQL-Testdatenbank den Zugriff für `root` ohne Passwort verweigert (`ER_ACCESS_DENIED_ERROR`). Der API-Build wurde erfolgreich ausgeführt. Es wurden keine eigenständigen Testinfrastruktur-Fixes vorgenommen.

## Offene Punkte / Folgeaufgaben

Die ergänzten Integrationstests sollten in einer Umgebung mit korrekt konfigurierter MySQL-Testdatenbank ausgeführt werden.
