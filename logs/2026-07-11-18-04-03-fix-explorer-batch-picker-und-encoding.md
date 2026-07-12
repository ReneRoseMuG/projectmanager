# Log: Explorer-Batch, Mehrfach-Picker und Encoding

**Datum:** 11.07.26  
**Uhrzeit:** 18:04:03  
**Schritt:** Fix / Feature — Explorer-Batch, Mehrfach-Picker und Encoding  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die fehlerhafte Annahme, `MultiSelectModel=Player` würde klassische Registry-Verben selbst zu einem Prozess bündeln, wurde korrigiert. Explorer-Aufrufe starten nun unsichtbar über `wscript.exe`; ein mutex-geschützter PowerShell-Koordinator sammelt die pro Datei eintreffenden Pfade in einer kurzlebigen Queue, dedupliziert sie und öffnet genau einen Dialog. Der Dialog verwendet für Sammlungen, Kategorien und Tags drei gleichwertige, durchsuchbare Checkbox-Picker. Im Tag-Picker kann ein neuer DMS-Tag angelegt werden; er wird nach erfolgreicher API-Antwort sofort ergänzt und ausgewählt. Upload-API und Importer unterstützen mehrere Sammlungs- und Kategorie-IDs, während die bisherigen singulären Web-Parameter kompatibel bleiben. UTF-8-BOM und explizite UTF-8-Konsolencodierung verhindern Mojibake in statischen Beschriftungen und geladenen Namen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/document-manager-import-launcher.vbs` | neu | Unsichtbarer Explorer-Start über Windows Script Host |
| `scripts/document-manager-import-launcher.ps1` | neu | Mutex-Queue und Zusammenführung mehrerer Dateiaufrufe |
| `scripts/document-manager-import-dialog.ps1` | geändert | Drei Mehrfach-Picker, Tag-Erstellung und UTF-8-Korrektur |
| `scripts/register-document-manager-context-menu.ps1` | geändert | Registry-Befehle auf WScript-Launcher umgestellt |
| `apps/windows-importer/src/importer.ts` | geändert | Mehrfachzuordnungen und DMS-Tag-Erstellung |
| `apps/windows-importer/src/cli.ts` | geändert | CLI-Befehl `create-tag` |
| `apps/api/src/services/document-import.service.ts` | geändert | Gebündelte Vorabvalidierung und n:m-Zuordnung |
| `apps/api/src/routes/dms.ts` | geändert | Rückwärtskompatibler Mehrfach-Uploadvertrag |
| `apps/api/src/repositories/attachment-folder.repository.ts` | geändert | Gebündelter Abruf mehrerer Sammlungen |
| `tests/integration/api/dms.test.ts` | geändert | Zwei Sammlungen, Kategorien und Tags im echten Upload |
| `tests/unit/windows-importer/importer.test.ts` | geändert | Mehrfach-URL und Tag-Erstellung abgesichert |

## Probleme und Abweichungen

Der vorherige Registry-Ansatz öffnete trotz `MultiSelectModel=Player` pro ausgewählter Datei einen eigenen Prozess und Dialog. Das war eine falsche technische Annahme und entsprach nicht dem bestätigten Auftrag. Der neue Koordinator behebt dies ohne native COM-/MSIX-Shell-Erweiterung. Ein abgebrochener Integrationstest wurde anschließend vollständig neu ausgeführt und ist grün.

## Offene Punkte / Folgeaufgaben

- Manueller Explorer-Klick mit einer realen Mehrfachauswahl als abschließende Nutzerabnahme.

## Angewendete Testleitplanken

`projekt-manager-test-entwurfsleitplanken`: Acht Unit-Tests mit echten Temp-Dateien und gemockter HTTP-Grenze; 20 API-Integrationstests mit echter Fastify-App, isolierter MySQL-Test-DB, echten Rollen und Temp-Uploadordner. Der native Queue-Test führte drei Dateien in genau einem WPF-Fenster zusammen und bestätigte die Anzeige „3 Datei(en)“. UI-Automation bestätigte „Größe“, alle drei Picker, „Tag anlegen“ und null Mojibake-Einträge. Der vollständige Monorepo-Build und gezielte ESLint-Lauf sind grün.
