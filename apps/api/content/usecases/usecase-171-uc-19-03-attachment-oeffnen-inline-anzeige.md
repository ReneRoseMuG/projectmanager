<h1>UC 19/03: Attachment öffnen (Inline-Anzeige)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser (rollenabhängig)</p>
<h2>Ziel</h2>
<p>Ein Attachment eines Parent-Objekts (Projekt, Kunde, Mitarbeiter oder Termin) direkt im Browser anzeigen, sofern der Dateityp Inline-Anzeige unterstützt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Attachment existiert.</li><li>Das zugehörige Parent-Objekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Leserechte für das Parent-Objekt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur wählt ein Attachment aus der Liste.<br>2. Das System prüft serverseitig:</p>
<ul><li>Existenz des Attachments,</li><li>Existenz des Parent-Objekts,</li><li>Leseberechtigung des Akteurs.</li></ul>
<p>3. Das System ruft den Download-Endpunkt auf.<br>4. Das System liefert die Datei mit:</p>
<ul><li>korrektem MIME-Typ,</li><li>Content-Disposition „inline“, sofern Dateityp Inline-Anzeige erlaubt.</li></ul>
<p>5. Der Browser zeigt die Datei an.</p>
<h2>Alternativen</h2>
<ul><li>Dateityp nicht inlinefähig → System liefert Content-Disposition „attachment“.</li><li>Attachment existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Leserechte → System blockiert mit 403.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Das Attachment wird inline angezeigt oder als Download behandelt.</li><li>Es werden keine persistenten Daten verändert.</li></ul>