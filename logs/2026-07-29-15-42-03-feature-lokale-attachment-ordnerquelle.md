# Log: Lokale Attachment-Ordnerquelle

**Datum:** 29.07.26  
**Uhrzeit:** 15:42:03  
**Schritt:** Feature — Lokale Windows-Ordnerquelle für Item-Attachments  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Jedes unterstützte Item kann einen vorhandenen lokalen Windows-Ordner als Attachment-Quelle verknüpfen. Die Auswahl erfolgt über einen nativen Windows-Ordnerdialog; alternativ kann ein absoluter Pfad manuell eingegeben werden. Dateien und Unterordner werden paginiert direkt von der Festplatte angezeigt, können im Standardprogramm geöffnet, einzeln heruntergeladen und zusammen mit PM-Attachments als ZIP genutzt werden. Die Dateien bleiben an ihrem Ursprungsort: Der Projekt Manager speichert nur die versionierte Item-Verknüpfung und löscht beim Entfernen dieser Verknüpfung niemals lokale Inhalte. Reale Pfade werden kanonisiert; Pfad-Traversal und Symlink-Ausbrüche aus dem freigegebenen Root werden abgewiesen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Versionierte lokale Ordnerverknüpfungen |
| `apps/api/src/db/migrations/20260729132743_flawless_marvel_boy/` | neu | Wiederanlaufsichere Tabellenmigration mit Metadaten |
| `apps/api/src/repositories/attachment-local-folder.repository.ts` | neu | Ownergebundene Persistenzzugriffe |
| `apps/api/src/services/attachment-local-folder.service.ts` | neu | Pfadschutz, Navigation, Öffnen und Windows-Dialog |
| `apps/api/src/routes/attachment-local-folders.ts` | neu | Authentifizierte Read-/Write-Endpunkte |
| `apps/api/src/app.ts` | geändert | Registrierung der lokalen Ordner-Routen |
| `apps/web/src/api/attachments.ts` | geändert | Lokale Ordner- und Datei-API |
| `apps/web/src/hooks/useAttachments.ts` | geändert | Query-Hooks und Mutationen |
| `apps/web/src/queries/queryKeys.ts` | geändert | Owner- und pfadbezogene Query-Keys |
| `apps/web/src/components/attachments/AttachmentList.tsx` | geändert | Festplattenquelle und Ordnernavigation |
| `apps/web/src/components/*/*Form.tsx` | geändert | Explorer in allen sechs Itemtypen eingebunden |
| `tests/fixtures/api/app.ts` | geändert | Test-Routen registriert |
| `tests/fixtures/api/db.ts` | geändert | Neue Tabelle in Testisolation aufgenommen |
| `tests/integration/api/attachment-explorer.test.ts` | neu | Echte Migration, API, DB und Dateisystemeffekte |
| `tests/unit/web/components/attachments/AttachmentList.test.tsx` | neu | Auswahl und Anzeige der lokalen Quelle |

## Testleitplanken

Angewendet wurde `test-entwurfsleitplanken`. Die Integrationsebene führt die generierte Migration auf einer zufällig benannten isolierten MySQL-Testdatenbank aus und verwendet ausschließlich eindeutige Betriebssystem-Temp-Verzeichnisse; produktive Datenbank und produktives Upload-Verzeichnis bleiben unberührt. Ohne Mocks werden CRUD, Pagination, Dateiinhalt, Pfad-Traversal, ZIP, Berechtigungen und der Erhalt der Ursprungsdateien geprüft. Der native Dialog selbst wird auf der Unit-Ebene über seinen direkten Hook-Vertrag isoliert.

## Probleme und Abweichungen

Die produktive `.env` verweist auf die zentrale Aiven-Datenbank. Deshalb wurde die Migration bewusst nicht mit dem regulären Migrationskommando gegen diese Verbindung ausgeführt, sondern sicher und erfolgreich über die isolierte Testdatenbank angewandt. Die zusätzliche visuelle Browserprüfung war wegen einer fehlenden Browser-Laufzeitfreigabe nicht möglich.

## Offene Punkte / Folgeaufgaben

Beim Löschen eines Items bleiben polymorphe Ordnerlink-Zeilen derzeit als inaktive Datensätze bestehen; direkter Datei- und Ordnerzugriff ist danach durch die Owner-Existenzprüfung gesperrt. Eine spätere physische Bereinigung dieser inaktiven Metadaten wäre möglich, ist für Nutzung und Sicherheit jedoch nicht erforderlich.
