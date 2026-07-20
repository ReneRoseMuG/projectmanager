# MS-80: Importvertrag für Dokumente

## Gültigkeit

Der neue Vertrag gilt ab **19.07.26** für Projekt Manager **0.1.0 / MS-80**. Er ist für Weboberfläche, Windows-Explorer-Importer und MCP verbindlich. Die Umstellung ist ein Breaking Change für selbst gebaute Aufrufer, die bisher Kategorieparameter oder mehrere Sammlungen übergeben haben.

## Einheitlicher Dokumentimport

Alle drei Clients verwenden `POST /api/documents` mit demselben Multipart-Feld `file`. Es gibt keinen zweiten Upload-Endpunkt, keinen alternativen Speicherpfad und keine zusätzliche Dateikopie. Die API verwendet weiterhin das konfigurierte `UPLOAD_DIR`, das zentrale Dateigrößenlimit von 25 MB und den SHA-256-Hash des bestehenden Attachment-Modells.

Zulässige Zuordnungen:

- keine Sammlung oder genau eine direkte Sammlung über `folder=<id>`;
- bis zu 20 DMS-Tags über `tags=<id,id,...>`;
- keine Kategorien.

Die API validiert Sammlung und Tags vor der Dateianlage. Unbekannte Sammlungen liefern `NOT_FOUND`; unbekannte, fachfremde oder geschützte Tags liefern `BAD_REQUEST`. Das alte Mehrfachfeld `folders` wird mit einem MS-80-Migrationshinweis abgelehnt. Windows-Importer und MCP lehnen auch `category` und `categories` strikt ab. Beim direkten HTTP-Endpunkt besteht noch ein bekannter Vertragsfehler: Fastify entfernt diese unbekannten Queryfelder und der Upload wird ohne Kategorie mit `201` angelegt, statt mit `400` abzubrechen. Das Feld darf nicht mehr gesendet werden; die serverseitige Ablehnung wird in einer Folgesitzung nachgeführt. Das erfolgreiche Ergebnis enthält insbesondere `isInDocumentLibrary: true`, `folders`, `tags`, eine geschützte `/api/attachments/:id/content`-URL und `version`.

## Attachment-Uploads an Fachobjekte

MCP und Web verlangen bei Owner-Uploads seit dem Stichtag eine explizite Auswahl:

- `attachment-only`: nur am Fachobjekt sichtbar;
- `document-library`: zusätzlich in der Dokumentbibliothek sichtbar.

Eine fehlende Auswahl wird abgelehnt. Ein bereits bibliothekssichtbares Attachment wird durch eine spätere reine Attachment-Verwendung nicht aus der Bibliothek entfernt; Sichtbarkeit wird nicht implizit herabgestuft.

## MCP

- `list_document_library_options` liefert die hierarchischen Sammlungen und zuweisbaren DMS-Tags.
- `add_document_to_library` importiert ohne Sammlung oder mit `folderId` sowie optionalen `tagIds`.
- `add_attachment_to_parent`, `add_attachments_to_parent` und die optionalen Attachments der Listenwerkzeuge verlangen pro Datei `libraryVisibility`.

Unbekannte Felder wie `categoryId`, `categoryIds` oder `folderIds` werden im DMS-Importwerkzeug nicht still verworfen, sondern von der strikten MCP-Validierung abgelehnt.

## Windows-Explorer-Importer

Der Importer wird als Workspace gebaut:

`npm run build -w apps/windows-importer`

Anschließend registriert `scripts/register-document-manager-context-menu.ps1` für den aktuellen Windows-Benutzer die Aktionen „Ins Dokument Management kopieren“ und „Ins Dokument Management verschieben“. `scripts/unregister-document-manager-context-menu.ps1` entfernt diese Einträge wieder. Der Dialog bietet „Keine Sammlung“ oder genau eine Sammlung als Radio-Auswahl und eine Mehrfachauswahl für DMS-Tags; Kategorien werden nicht mehr geladen oder dargestellt.

Beim Verschieben wird die Quelldatei erst nach einer erfolgreichen `201`-Antwort gelöscht. Bei API-, Validierungs- oder Netzwerkfehlern bleibt sie erhalten. Kann sie nach dem erfolgreichen Import lokal nicht gelöscht werden, meldet der Importer „importiert, aber nicht verschoben“ und gibt das angelegte Dokument zurück.
