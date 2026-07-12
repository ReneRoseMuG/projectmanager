# Log: WPF-Einzeldatei-Dialog

**Datum:** 11.07.26  
**Uhrzeit:** 08:51:16  
**Schritt:** Fix — WPF-Einzeldatei-Dialog  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der WPF-Dialog erzeugte bei genau einer ausgewählten Datei ein einzelnes PowerShell-Objekt statt einer Collection. Das Setzen von `ListView.ItemsSource` brach deshalb vor Anzeige des Fensters ab und ließ lediglich ein kurz aufblinkendes Terminal zurück. Die erzeugten Dateizeilen werden nun immer explizit als Array gekapselt. Der Dialog wurde anschließend kontrolliert mit einer sowie mit zwei realen Repo-Dateien gestartet; in beiden Fällen blieb der Prozess offen und besaß den Fenstertitel „Dokument Management“. Beide Testprozesse wurden ohne Import wieder beendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/document-manager-import-dialog.ps1` | geändert | Dateizeilen auch im Einzelfall als Collection bereitstellen |

## Probleme und Abweichungen

Keine. Es wurden keine Dokumente importiert oder Quelldateien verändert.

## Offene Punkte / Folgeaufgaben

- Manueller Explorer-Klick mit einer und mehreren ausgewählten Dateien.

## Angewendete Testleitplanken

`projekt-manager-test-entwurfsleitplanken`: native Windows-Integrationsprüfung mit realen, nur lesend verwendeten Repo-Dateien. Bewiesen wurde, dass der WPF-Prozess für eine und zwei Dateien offen bleibt und das erwartete Fenster erzeugt; die Importaktion wurde bewusst nicht ausgelöst.
