# Log: Document Management System (MS-75) umgesetzt

**Datum:** 03.07.26  
**Uhrzeit:** 12:04:02  
**Schritt:** Feature — MS-75 „Document Management System" (Pakete 1–7 / TASK-421…427)  
**Status:** ⚠️ Umsetzung abgeschlossen, Tests offen

## Was wurde umgesetzt

Der komplette Stack für die Dokumentenverwaltung wurde neu gebaut — eine Organisations- und Sichtungsebene über den bestehenden Anhängen, ohne die Datei-Infrastruktur (Upload, Vorschau, Nextcloud-Ablage) anzufassen.

- **Datenmodell:** Neue Tabellen `attachment_categories` und `attachment_folders` (hierarchisch, optional projektgebunden) sowie drei Verknüpfungstabellen für Kategorien, Labels und Sammlungen. `attachments` um Anzeigename und Beschreibung erweitert; `tags` um ein Schutz-Kennzeichen für System-Labels. Eine additive Migration wurde erzeugt und geprüft.
- **Backend-Logik:** Kategorie- und Sammlungsverwaltung (mit Zyklusschutz, damit keine Sammlung unter sich selbst rutscht), Dokument-Organisation, Label-Zuweisung mit Schutz der System-Labels, Metadatenpflege und die gefilterte Bibliotheks-Abfrage. Direktupload von Dokumenten ohne Bindung an ein Fachobjekt.
- **Wichtige Verhaltensänderung:** Anhänge werden beim Löschen eines Projekts/Meilensteins/einer Aufgabe/eines Tickets/Features **nicht mehr automatisch gelöscht**. Sie bleiben erhalten und erscheinen im DMS unter „Nicht einsortiert". Endgültiges Löschen ist nur noch eine bewusste Aktion.
- **API:** Alle neuen Endpunkte laufen unter der bestehenden Anhang-Berechtigung — keine neue Rechte-Ressource.
- **Frontend:** Neuer Navigationseintrag „Dokumente" mit Bibliothek-Seite: Sammlungs-Navigation (inkl. „Nicht einsortiert"), Filter nach Kategorie/Label/Typ und Suche, Upload, Dokumentliste sowie ein Detail-Bereich zum Pflegen von Anzeigename/Beschreibung, Labels und Kategorien. Sammlungen und Kategorien lassen sich direkt anlegen.

## Wichtige Entscheidungen

- Umsetzung auf eigenem Branch `feature/ms-75-dms`, getrennt vom übrigen Arbeitsstand.
- Der System-Label-Schutz wurde vollständig als Datenbank-Kennzeichen gebaut (auf Wunsch), auch wenn aktuell noch keine Labels als geschützt markiert sind — der Mechanismus steht, die konkrete Markierung ist ein kleiner Folgeschritt.

## Durchgeführte Prüfungen

- **Alle Kompilate grün:** geteilte Typen, Backend und Web-Oberfläche bauen fehlerfrei.
- Der invasive Umbau des Anhang-Aufräumens wurde nach jeder Änderung gegen den Compiler abgesichert.

## Offene Punkte / Blocker

- **Automatisierte Tests noch nicht ausgeführt:** Die Backend-Integrationstests konnten in dieser Umgebung nicht laufen — der Aufbau der Test-Datenbank läuft reproduzierbar in eine Zeitüberschreitung (nicht durch die Migration verursacht). Die dedizierten DMS-Tests (Schema/Cascade, Services, API-Endpunkte) und der End-to-End-Browserflow sind daher noch zu schreiben und auszuführen, sobald die Test-DB wieder greift.
- **Feinschliff Oberfläche:** Vorschau erfolgt vorerst über einen Download-Link (kein Vorschau-Panel mit Blättern); Einsortieren per Drag-and-drop und der Ausschluss geschützter Labels direkt im Label-Auswahlfeld fehlen noch (serverseitig ist der Schutz aber aktiv).
- **Architektur-Leitfaden:** Die neue Datenmodell-Ebene und die geänderte Aufräum-Logik sollten ergänzt werden (Formulierungsvorschlag liegt bereit, Aufnahme nach Freigabe).

## Was der Nutzer erwarten kann

Nach dem nächsten App-Start (die Migration wird dabei automatisch eingespielt) gibt es links den neuen Bereich **„Dokumente"**. Dort lassen sich Dateien direkt hochladen, in Sammlungen ablegen, kategorisieren, mit Labels versehen, filtern und mit Anzeigename/Beschreibung versehen. Bestehende Anhänge bleiben beim Löschen ihres Fachobjekts künftig erhalten.
