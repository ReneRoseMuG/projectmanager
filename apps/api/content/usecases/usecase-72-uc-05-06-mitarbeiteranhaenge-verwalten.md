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
<p>1. Akteur öffnet die Detailansicht eines Mitarbeiters.<br>2. Akteur wählt die Funktion „Anhang hinzufügen“.<br>3. Akteur wählt eine Datei aus.<br>4. System prüft:</p>
<ul><li>Dateiformat,</li><li>Dateigröße,</li><li>Authentifizierung.</li></ul>
<p>5. System speichert die Datei serverseitig.<br>6. System legt einen Attachment-Datensatz mit Parent-Referenz auf den Mitarbeiter an.<br>7. System gibt die gespeicherten Metadaten zurück.<br>8. System aktualisiert die Anhangsliste in der UI.</p>
<h3>Ablauf – Anzeigen / Herunterladen</h3>
<p>1. Akteur öffnet die Anhangsliste.<br>2. System lädt alle dem Mitarbeiter zugeordneten Attachments.<br>3. Akteur wählt einen Anhang.<br>4. System liefert Datei über gesicherten Download-Endpunkt aus.</p>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter existiert nicht →</li></ul>
<p>System antwortet mit 404.</p>
<ul><li>Akteur ohne Berechtigung →</li></ul>
<p>System blockiert mit 403.</p>
<ul><li>Ungültiges Dateiformat oder Größe →</li></ul>
<p>System antwortet mit 400.</p>
<ul><li>Technischer Speicherfehler →</li></ul>
<p>System antwortet mit 500.</p>
<ul><li>DELETE-Anfrage auf Attachment →</li></ul>
<p>System blockiert mit 405 oder 403.</p>
<h2>Ergebnis</h2>
<ul><li>Der Anhang ist eindeutig dem Mitarbeiter zugeordnet.</li><li>Keine Termin- oder Projektdaten wurden verändert.</li><li>Mehrere Anhänge sind parallel zulässig.</li><li>Anhänge existieren unabhängig von Terminzuweisungen.</li><li>Es erfolgt keine physische Löschung bestehender Dateien.</li><li>Parallele Uploads verschiedener Akteure sind zulässig und erzeugen getrennte Datensätze.</li></ul>