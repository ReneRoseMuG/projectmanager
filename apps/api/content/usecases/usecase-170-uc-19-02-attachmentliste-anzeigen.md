<h1>UC 19/02: Attachmentliste anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser (rollenabhängig)</p>
<h2>Ziel</h2>
<p>Alle einem Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) zugeordneten Attachments anzeigen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Parent-Objekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Leserechte für das Parent-Objekt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Detailansicht des Parent-Objekts.<br>2. Das System prüft serverseitig die Leseberechtigung.<br>3. Das System lädt alle dem Parent-Objekt zugeordneten Attachments.<br>4. Das System liefert für jedes Attachment mindestens:</p>
<ul><li>Originaldateiname,</li><li>Dateigröße,</li><li>MIME-Typ,</li><li>Erstellungszeitpunkt.</li></ul>
<p>5. Das System zeigt die strukturierte Liste in der UI an.</p>
<h2>Alternativen</h2>
<ul><li>Keine Attachments vorhanden → System zeigt eine leere Liste.</li><li>Parent-Objekt existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Leserechte → System blockiert mit 403.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Alle vorhandenen Attachments sind vollständig und konsistent sichtbar.</li><li>Es werden keine Daten verändert.</li></ul>