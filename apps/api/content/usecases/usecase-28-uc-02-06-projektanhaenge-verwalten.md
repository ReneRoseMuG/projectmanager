<h1>UC 02/06: Projektanhänge verwalten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Dokumente zu einem Projekt hinzufügen, einsehen, herunterladen und bei Bedarf entfernen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte (für Upload und Löschung) bzw. mindestens Leserechte (für Anzeige und Download).</li></ul>
<h2>Ablauf</h2>
<h3>Ablauf — Anhang hochladen</h3>
<p>1. Der Akteur öffnet das Projekt und wählt „Attachment hinzufügen&quot;.<br>2. Das System öffnet einen Dateiauswahldialog.<br>3. Der Akteur wählt eine lokale Datei.<br>4. Das System prüft serverseitig: Authentifizierung, Berechtigung, Existenz des Projekts, Dateigröße und MIME-Typ.<br>5. Das System generiert einen eindeutigen persistenten Speichernamen, speichert die Datei und legt einen Attachment-Datensatz mit Projektreferenz und Metadaten (Originaldateiname, Speichername, MIME-Typ, Dateigröße, Erstellungszeitpunkt) an.<br>6. Das System aktualisiert die Anhangsliste in der UI.</p>
<h3>Ablauf — Anhang öffnen / herunterladen</h3>
<p>1. Der Akteur wählt einen Anhang aus der Liste.<br>2. Das System prüft Authentifizierung, Berechtigung und Existenz von Anhang und Projekt.<br>3. Für Inline-Anzeige (z. B. PDF, Bild): Das System liefert die Datei mit <code>Content-Disposition: inline</code>.<br>4. Für expliziten Download: Das System liefert die Datei mit <code>Content-Disposition: attachment</code>.</p>
<h3>Ablauf — Anhang entfernen</h3>
<p>1. Der Akteur klickt den Action-Button am Attachment-Badge.<br>2. Das System zeigt eine Sicherheitsfrage: „Soll nur die Verknüpfung zum Projekt entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)&quot;<br>3. Der Akteur wählt eine Option:</p>
<ul><li><strong>Entkopplung:</strong> Das System entfernt den Attachment-Datensatz. Die physische Datei verbleibt im Upload-Verzeichnis.</li><li><strong>Physische Löschung:</strong> Das System entfernt Datensatz und physische Datei vollständig.</li></ul>
<p>4. Das System aktualisiert die Anhangsliste.</p>
<h2>Alternativen</h2>
<ul><li>Projekt nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Berechtigung → HTTP 403.</li><li>Datei überschreitet Größelimit oder hat ungültigen Typ → HTTP 400, keine Persistenz.</li><li>Upload abgebrochen → keine Persistenz.</li><li>Anhang nicht vorhanden (bei Öffnen/Löschen) → HTTP 404.</li><li>Akteur bricht Sicherheitsfrage ab → keine Aktion, Anhang bleibt unverändert.</li><li>Technischer Fehler → HTTP 500, keine Teillöschung.</li></ul>
<h2>Ergebnis</h2>
<p>Anhänge sind dem Projekt zugeordnet und über die Anhangsliste zugänglich. Bei Entkopplung verbleibt die physische Datei im Upload-Verzeichnis. Bei physischer Löschung sind Datensatz und Datei vollständig entfernt. Vollständige Attachment-Regeln gemäß FT (19).</p>