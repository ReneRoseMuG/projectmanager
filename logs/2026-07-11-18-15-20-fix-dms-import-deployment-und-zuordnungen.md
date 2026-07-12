# Log: DMS-Import-Deployment und Zuordnungen

**Datum:** 11.07.26  
**Uhrzeit:** 18:15:20  
**Schritt:** Fix — DMS-Import-Deployment und Zuordnungen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Diagnose des letzten realen Importauftrags zeigte korrekt übergebene `folderIds: [7]` und `categoryIds: [8]`. Der installierte API-Prozess lief jedoch seit 08:38 Uhr mit einem alten Deployment, während der Explorer-Worker bereits den neuen Mehrfachvertrag sendete. Die installierten Dienste wurden kontrolliert gestoppt, das Repository über `scripts/deploy.ps1` nach `%LOCALAPPDATA%\Projekt Manager` deployt und anschließend neu gestartet. Der neue API-Prozess läuft seit 18:14 Uhr; der Healthcheck ist grün. Für die bereits importierten Dokumente 280–288 wurde die nachweislich ausgewählte Kategorie 8 („Fasssauna“) nachgeführt; die vorhandene Sammlung 7 und weitere Kategorien blieben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `%LOCALAPPDATA%/Projekt Manager` | Deployment | Aktueller Repo-Build installiert und Dienste neu gestartet |

## Probleme und Abweichungen

Der Repository-Build allein aktualisiert die installierte Projekt-Manager-Instanz nicht. Dadurch liefen Explorer-Worker und API mit unterschiedlichen Verträgen. Es war keine weitere Codeänderung nötig; der aktuelle Mehrfachvertrag war bereits durch 20 Integrationstests abgesichert.

## Offene Punkte / Folgeaufgaben

- Browserseite neu laden, damit der zuvor gecachte Dokumentbestand aktualisiert wird.

## Angewendete Testleitplanken

`projekt-manager-test-entwurfsleitplanken`: reale Laufzeitprüfung über die geschützte API. Vor der Korrektur wurden Auftrag und gespeicherte Relationen verglichen; danach wurden alle neun Dokumentdetails erneut gelesen. Jedes Dokument besitzt Sammlung 7 und Kategorie 8. Eine abschließende Abfrage von `documents?folder=unsorted` enthält keine der IDs 280–288. API-Healthcheck nach kontrolliertem Deployment und Neustart: grün.
