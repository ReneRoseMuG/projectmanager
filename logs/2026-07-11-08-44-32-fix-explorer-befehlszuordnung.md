# Log: Explorer-Befehlszuordnung

**Datum:** 11.07.26  
**Uhrzeit:** 08:44:32  
**Schritt:** Fix — Explorer-Befehlszuordnung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die fehlerhafte kaskadierte Registry-Struktur wurde durch zwei direkte Explorer-Verben ersetzt. „Ins Dokument Management kopieren“ und „Ins Dokument Management verschieben“ erscheinen nun unmittelbar unter „Weitere Optionen“ und besitzen jeweils einen eigenen ausführbaren `command`-Unterschlüssel. Der alte `ExtendedSubCommandsKey` wurde aus der aktiven Benutzerregistrierung entfernt. Registry-Zugriffe auf den Dateiklassenschlüssel `*` verwenden jetzt die .NET-Registry-API, damit PowerShell das Sternchen nicht als Wildcard interpretiert. Die korrigierte Registrierung wurde für den aktuellen Benutzer direkt angewendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/register-document-manager-context-menu.ps1` | geändert | Direkte Verben und literalische Registry-Zugriffe |
| `scripts/unregister-document-manager-context-menu.ps1` | geändert | Alte und neue Schlüssel sicher entfernen |

## Probleme und Abweichungen

Der erste Neuversuch lief in ein Timeout, weil die PowerShell-Registry-Provider-Befehle `*` als Wildcard behandelten. Der Aufruf wurde beendet, der Zustand danach mit der idempotenten .NET-Implementierung vollständig korrigiert.

## Offene Punkte / Folgeaufgaben

- Explorer-Fenster neu öffnen und beide direkten Befehle visuell anklicken.

## Angewendete Testleitplanken

`projekt-manager-test-entwurfsleitplanken`: strukturelle Windows-Integrationsprüfung ohne Produktionsdaten. Bewiesen wurden die Entfernung des Legacy-Schlüssels, `MultiSelectModel=Player` und ein nicht leerer `command`-Wert für beide Aktionen. Die native Klick-Abnahme bleibt ein manueller Windows-Test.
