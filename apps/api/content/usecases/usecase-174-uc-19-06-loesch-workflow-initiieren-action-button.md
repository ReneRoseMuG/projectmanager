<h1>UC 19/06: Lösch-Workflow initiieren (Action Button)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Ein Attachment über den Action-Button am Attachment-Badge gezielt entfernen — entweder durch Entkopplung vom Parent-Objekt oder durch physische Löschung von Datensatz und Datei.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Attachment existiert.</li><li>Das zugehörige Parent-Objekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte für das Parent-Objekt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur klickt den Action-Button am Attachment-Badge.<br>2. Das System zeigt einen Bestätigungsdialog mit der Sicherheitsfrage: „Soll nur die Verknüpfung zum [Parent-Typ] entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)“<br>3. Der Akteur wählt eine der beiden Optionen oder bricht ab.<br>4. Bei Entkopplung: Das System entfernt den Attachment-Datensatz. Die physische Datei bleibt erhalten.<br>5. Bei physischer Löschung: Das System entfernt den Attachment-Datensatz und löscht die physische Datei aus dem Upload-Verzeichnis.<br>6. Das System prüft serverseitig Authentifizierung, Berechtigung und Existenz von Attachment und Parent.<br>7. Das System aktualisiert die Attachmentliste in der UI.</p>
<h2>Alternativen</h2>
<ul><li>Akteur bricht den Dialog ab → keine Aktion, Attachment bleibt unverändert.</li><li>Attachment existiert nicht → System antwortet mit 404.</li><li>Parent-Objekt existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Änderungsrechte → System blockiert mit 403.</li><li>Technischer Fehler → System antwortet mit 500, keine Teillöschung.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Bei Entkopplung: Datensatz ist entfernt, Datei bleibt im Upload-Verzeichnis erhalten.</li><li>Bei physischer Löschung: Datensatz und Datei sind vollständig entfernt.</li><li>Die Attachmentliste zeigt den aktuellen Stand konsistent an.</li></ul>