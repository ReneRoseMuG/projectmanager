# MS-80 – Dokumentenmanagement: Nutzung und Betrieb

**Stand:** 28.08.26  
**Gültiges Modell:** Globale DMS-Dokumente mit Sammlungen und Tags; davon getrennte exklusive Parent-Anhänge und lokale Windows-Ordner  
**Entfallenes Modell:** Kategorien

## Nutzung aus Anwendersicht

### Upload und getrennte Dateiquellen

Ein Upload an einem Projekt, Meilenstein, einer Aufgabe, einem Feature, Ticket oder Wiki-Eintrag erzeugt immer einen exklusiven Parent-Anhang. Er erscheint nicht im globalen DMS und wird zusammen mit seinem Parent endgültig gelöscht. Unterordner in einer Parent-Dateiansicht sind ownerlokale Ordner und keine DMS-Sammlungen.

Ein Direktupload auf der Seite **Dokumente** ist dagegen immer ein globaler DMS-Import. Er kann optional genau einer direkten Sammlung und bis zu 20 DMS-Tags zugeordnet werden. Ein vorhandenes DMS-Dokument lässt sich anschließend bewusst und ohne Dateikopie mit einem Parent verknüpfen und dort in ownerlokalen Ordnern einsortieren.

Lokale Windows-Ordner bilden die dritte Dateiquelle. Das Lösen ihrer Einbindung entfernt nur die Konfiguration im Projekt Manager; Ordner und Dateien im Windows-Dateisystem bleiben unverändert.

### Sammlungen und Untersammlungen

Ein Dokument besitzt höchstens eine direkte Sammlung. Sammlungen dürfen beliebig tief verschachtelt werden. Die Auswahl einer Sammlung umfasst immer deren gesamten Unterbaum.

Beispiel: Das Bild liegt direkt in **Sauna → Oval Sauna**. Es wird bei **Oval Sauna** und bei der übergeordneten Sammlung **Sauna** gefunden. Es erhält dadurch keine zweite direkte Zuordnung zu **Sauna**. Wird **Oval Sauna** unter eine andere Sammlung verschoben, ändert sich der übergeordnete Suchbereich automatisch.

Eine Sammlung kann nur gelöscht werden, wenn sie weder direkte Dokumente noch direkte Untersammlungen enthält. Beim Verschieben verhindern API und Oberfläche Selbstbezüge und Zyklen.

### Tags und Filter

Die früheren Kategorien wurden vollständig in Tags der Domäne `dms` überführt und anschließend entfernt. DMS-Tags stehen in der Hauptnavigation; die Detailansicht dient weiterhin zum Ändern der Tag-Zuordnung. Vorschaukarten zeigen bis zu drei Tags und fassen weitere Tags als `+N` zugänglich zusammen.

Mehrere ausgewählte Tags werden mit UND-Semantik kombiniert: Ein Dokument muss alle ausgewählten Tags besitzen. Sammlung, Tags, Dateityp und Suche sind miteinander kombinierbar. Aktive Filter erscheinen einzeln entfernbar; die Auswahl liegt in der URL und bleibt bei Reload, Zurück und Vor erhalten.

Alte Kategorie-Endpunkte und Kategorie-Zuordnungen existieren nicht mehr. Windows-Importer und MCP lehnen alte Kategoriefelder strikt ab. Für den direkten HTTP-Upload besteht noch ein dokumentierter Vertragsfehler: Fastify entfernt `category` derzeit aus der Query und legt das Dokument ohne Kategorie mit `201` an, statt `400` zu liefern. Aufrufer dürfen das Feld nicht mehr senden; die serverseitige Ablehnung ist eine Folgeaufgabe.

### Manueller Duplikat-Check

Der Duplikat-Check wird in der Dokumentenbibliothek bewusst manuell gestartet. Er liest ausschließlich Datensätze des Typs `document`, berechnet SHA-256-Inhaltshashes und gruppiert identische Inhalte. Fehlende, nicht lesbare oder während des Scans geänderte Dateien erscheinen getrennt als Probleme.

Der Check führt keine automatische Zusammenführung, Löschung oder Umbenennung aus. Lesen des letzten Ergebnisses benötigt `documents:read`, das Starten eines neuen Scans `documents:write`.

### Entfernen und Löschen

- **Exklusiven Parent-Anhang löschen:** Datensatz, Parent-Zuordnung, Vorschauen und physische Datei werden entfernt; ein bloßes Entknüpfen ist nicht vorgesehen.
- **DMS-Link lösen:** Nur die Verbindung zum gewählten Fachobjekt wird entfernt. DMS-Dokument, Sammlung, Tags, Vorschauen und Datei bleiben erhalten.
- **DMS-Dokument endgültig löschen:** Dokument, sämtliche Parent-Links, Vorschauen und physische Datei werden entfernt; dafür ist `documents:delete` und eine ausdrückliche Bestätigung erforderlich.

Die Abläufe sind versionsgesichert und werden im Journal unterscheidbar protokolliert. Originaldateien und generierte Vorschauen werden nur über authentifizierte API-Routen ausgeliefert; erratbare `/uploads`- oder `/previews`-URLs sind nicht verfügbar.

## Clients und Verträge

- Web, Windows-Importer und MCP verwenden für Direktimporte denselben Endpunkt `POST /api/documents` und denselben physischen Speicherpfad.
- Der Windows-Importer bietet Kopieren/Verschieben sowie genau eine optionale Sammlung und DMS-Tags an.
- MCP stellt `list_document_library_options` und `add_document_to_library` sowie eigene Werkzeuge zum Auflisten, Verknüpfen und Lösen von Parent-Dokumentlinks bereit. Owner-bezogene MCP-Uploads erzeugen ausschließlich Parent-Anhänge und akzeptieren keine Bibliotheksauswahl.
- Der detaillierte technische Importvertrag steht in [dms-ms-80-importvertrag.md](./dms-ms-80-importvertrag.md).

## Backup vor dem Kategorie-Cleanup

Vor dem irreversiblen Cleanup wurde am 19.07.26 das gekoppelte Backup `backups/ms80-2026-07-19T17-09-17-317Z` erzeugt. Der Ordner ist bewusst über `.gitignore` ausgeschlossen und muss wie Produktivdaten zugriffsgeschützt aufbewahrt werden.

| Bestandteil | Nachweis |
|---|---|
| Datenbankdump | 87 Tabellen; SHA-256 `3ff667e8582f734c996da648c1161aea59b5b1897be96a32e4cd2ee6eeccc864` |
| Uploadarchiv | 520 Dateien, 641.334.924 Byte; SHA-256 `d2539c897f3d72e8d554c721d16f213956ad8bf0a29cae8e876bd749e01cdddf` |
| Kategoriequelle | 12 Kategorien und 348 Relationen |
| Tagziel | 352 Attachment-Tag-Relationen insgesamt; Nullverlust zuvor fachlich belegt |

Das Werkzeug `scripts/ms80-backup.mjs` erzeugt Dump, Uploadarchiv und Manifest gemeinsam. `verify` prüft beide Prüfsummen, stellt den Dump ausschließlich in einer lokalen, zufällig benannten Testdatenbank wieder her, extrahiert das Uploadarchiv in ein temporäres Verzeichnis und vergleicht sämtliche Tabellen- und Dateinachweise. Die Wiederherstellungsprobe dieses Backups war erfolgreich; die temporäre Datenbank und das temporäre Uploadverzeichnis wurden anschließend entfernt.

```text
node scripts/ms80-backup.mjs create
node scripts/ms80-backup.mjs verify backups/ms80-2026-07-19T17-09-17-317Z
```

## Rollout-Reihenfolge und Verantwortlichkeit

1. **Release-Verantwortung:** Wartungsfenster und Schreibstopp freigeben; Versionen von API, Web, MCP und Windows-Importer gemeinsam festlegen.
2. **Datenbankbetrieb:** Unmittelbar vor dem Rollout ein neues gekoppeltes Backup erzeugen und mit `verify` in der lokalen Testdatenbank rückspielen.
3. **Datenbankbetrieb:** Nullverlust-Gate bestätigen. Die Cleanup-Migration bricht selbstständig ab, wenn eine Kategorie oder Kategorie-Relation keinen kompatiblen DMS-Tag beziehungsweise keine Zielrelation besitzt.
4. **Release-Verantwortung:** API, Web, MCP und Importer als zusammengehörigen Vertrag ausrollen; keine alte API gegen neue Clients oder umgekehrt betreiben.
5. **Anwendungsverantwortung:** Smoke-Tests für Bibliotheksliste, Sammlungsunterbaum, Mehrfach-Tags, DMS-Direktupload, exklusiven Parent-Upload, Parent-Ordner, Dokumentlink, lokale Windows-Ordner, manuellen Duplikat-Check und geschützten Download durchführen.
6. **Fachliche Abnahme:** Stichproben der zwölf migrierten Tags, der bekannten Sammlungen und der bibliothekssichtbaren Attachments prüfen.
7. **Release-Verantwortung:** Erst nach dokumentierten Testergebnissen und erledigten Blockern den Meilenstein schließen. Umgesetzte, aber noch nicht abgenommene Aufgaben bleiben gemäß Projektregel `Wartend`.

## Monitoring nach dem Rollout

Für die ersten 60 Minuten und erneut nach 24 Stunden werden protokolliert:

- HTTP-Fehlerquote und gruppierte `401`, `403`, `404`, `409` und `500` für `/api/documents`, `/api/attachment-folders`, `/api/tags` und `/api/documents/:id/content`;
- p50/p95/p99 der Bibliotheksliste, Suche, Unterbaumfilterung und Mehrfach-Tag-Filterung;
- Laufzeit, Zahl verarbeiteter Dateien und getrennte Datei-Probleme des manuellen Duplikat-Checks;
- Anzahl Datensätze je `kind` (`document` und `parent_attachment`), Parent-Dokumentlinks sowie unerwartete Typänderungen;
- fehlende physische Dateien gegenüber den Attachment-Datensätzen;
- Konfliktrate bei Metadaten-, Tag-, Sammlungs- und Lebenszyklusänderungen;
- Importfehler getrennt nach Web, Windows-Importer und MCP.

Alarmgrenzen sind an die vorhandene Betriebsumgebung anzuschließen. Als sofortiger Abbruchgrund gelten neue fehlende Dateien, nicht erklärbare Sichtbarkeitsänderungen, wiederholte `500`-Antworten oder ein deutlicher Anstieg der p95-Laufzeit gegenüber der Vorhermessung.

## Rollback-Grenzen

`DROP TABLE` ist in MySQL nicht transaktional rückrollbar. Nach Anwendung der Cleanup-Migration reicht daher ein Code-Rollback nicht aus. Für einen vollständigen Rückweg müssen Datenbankdump und Uploadarchiv desselben Manifests gemeinsam verwendet werden.

Der sichere Rückweg lautet: Schreibzugriffe stoppen, aktuelles Fehlerbild und Journal sichern, das verifizierte Backup in eine isolierte Zieldatenbank und ein separates Uploadverzeichnis rückspielen, Tabellen- und Dateinachweise erneut prüfen und anschließend die Anwendung kontrolliert auf dieses Paar umschalten. Nach dem Backup entstandene Schreibvorgänge sind darin nicht enthalten; ein automatisches Zusammenführen wird nicht unterstützt. Deshalb soll die Rollbackentscheidung während des Schreibstopps beziehungsweise unmittelbar nach den Smoke-Tests fallen.

## Bekannte offene Abnahmepunkte

- Der vollständige serielle Testlauf ist noch nicht grün. Bekannte rote Alt-Tests und nicht ausführbare Browser-/Web-Testpfade werden gemäß Nutzerfreigabe in einer separaten Sitzung korrigiert.
- Der neue Cleanup-Migrationstest wurde angelegt, startete aber wegen unvollständiger Testfixture-Daten rot; aus diesem roten Test wurde in dieser Sitzung kein Fix abgeleitet.
- Der vollständige API-Testlauf meldet 14 rote Fälle. Darunter ist der Vertragsbefund, dass `POST /api/documents?category=...` den unbekannten Parameter derzeit ignoriert und den Upload mit `201` anlegt.
- Der In-App-Browser war nicht verfügbar, daher steht die echte Browserausführung der neuen DMS-E2E-Fälle aus.

Der Cleanup ist technisch angewandt und durch das Migrations-Gate sowie das erfolgreich rückgespielte Vorher-Backup abgesichert. TASK-506 und MS-80 bleiben bis zur fachlichen und testseitigen Abnahme offen.
