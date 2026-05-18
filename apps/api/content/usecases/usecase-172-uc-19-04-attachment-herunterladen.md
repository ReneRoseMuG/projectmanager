<h1>UC 19/04: Attachment herunterladen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser (rollenabhängig)</p>
<h2>Ziel</h2>
<p>Ein Attachment eines Parent-Objekts (Projekt, Kunde, Mitarbeiter oder Termin) lokal speichern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Attachment existiert.</li><li>Das zugehörige Parent-Objekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Leserechte für das Parent-Objekt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur wählt die Download-Funktion für ein Attachment.<br>2. Das System prüft serverseitig:</p>
<ul><li>Existenz des Attachments,</li><li>Existenz des Parent-Objekts,</li><li>Leseberechtigung des Akteurs.</li></ul>
<p>3. Das System ruft den Download-Endpunkt mit Download-Parameter auf.<br>4. Das System liefert:</p>
<ul><li>korrekten MIME-Typ,</li><li>Content-Disposition „attachment“,</li><li>den gespeicherten Dateistream.</li></ul>
<p>5. Der Browser startet den Download.</p>
<h2>Alternativen</h2>
<ul><li>Attachment nicht auffindbar → System antwortet mit 404.</li><li>Akteur ohne Leserechte → System blockiert mit 403.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Die Datei wird lokal gespeichert.</li><li>Es werden keine persistenten Daten verändert.</li></ul>