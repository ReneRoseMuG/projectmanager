<h1>UC 05/06: Mitarbeiteranhänge verwalten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Dokumente einem Mitarbeiter hinzufügen sowie bestehende Anhänge einsehen und herunterladen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Mitarbeiter existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte für Mitarbeiter.</li><li>Die hochzuladende Datei entspricht den erlaubten Formaten und Größenbeschränkungen.</li></ul>
<h2>Ablauf</h2>
<h3>Ablauf – Upload</h3>
<ol><li>Akteur öffnet die Detailansicht eines Mitarbeiters.</li><li>Akteur wählt die Funktion „Anhang hinzufügen“.</li><li>Akteur wählt eine Datei aus.</li><li>System prüft:<ul><li>Dateiformat,</li><li>Dateigröße,</li><li>Authentifizierung.</li></ul></li><li>System speichert die Datei serverseitig.</li><li>System legt einen Attachment-Datensatz mit Parent-Referenz auf den Mitarbeiter an.</li><li>System gibt die gespeicherten Metadaten zurück.</li><li>System aktualisiert die Anhangsliste in der UI.</li></ol>
<h3>Ablauf – Anzeigen / Herunterladen</h3>
<ol><li>Akteur öffnet die Anhangsliste.</li><li>System lädt alle dem Mitarbeiter zugeordneten Attachments.</li><li>Akteur wählt einen Anhang.</li><li>System liefert Datei über gesicherten Download-Endpunkt aus.</li></ol>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Berechtigung → System blockiert mit 403.</li><li>Ungültiges Dateiformat oder Größe → System antwortet mit 400.</li><li>Technischer Speicherfehler → System antwortet mit 500.</li><li>DELETE-Anfrage auf Attachment → System blockiert mit 405 oder 403.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Der Anhang ist eindeutig dem Mitarbeiter zugeordnet.</li><li>Keine Termin- oder Projektdaten wurden verändert.</li><li>Mehrere Anhänge sind parallel zulässig.</li><li>Anhänge existieren unabhängig von Terminzuweisungen.</li><li>Es erfolgt keine physische Löschung bestehender Dateien.</li><li>Parallele Uploads verschiedener Akteure sind zulässig und erzeugen getrennte Datensätze.</li></ul>