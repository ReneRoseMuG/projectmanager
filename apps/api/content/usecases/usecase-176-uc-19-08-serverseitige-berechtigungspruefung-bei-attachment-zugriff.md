<h1>UC 19/08: Serverseitige Berechtigungsprüfung bei Attachment-Zugriff</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-19-attachments.md">FT (19): Attachments</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass jeder Zugriff auf ein Attachment ausschließlich auf Basis der Parent-Berechtigungen erfolgt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Attachment existiert.</li><li>Ein Zugriff (Anzeige oder Download) wird angefordert.</li></ul>
<h2>Ablauf</h2>
<p>1. Das System identifiziert das angeforderte Attachment.<br>2. Das System ermittelt das zugehörige Parent-Objekt.<br>3. Das System prüft die Berechtigung des Akteurs für dieses Parent-Objekt.<br>4. Bei gültiger Berechtigung wird der Zugriff gewährt.<br>5. Bei fehlender Berechtigung wird der Zugriff verweigert.</p>
<h2>Alternativen</h2>
<ul><li>Attachment existiert nicht → System antwortet mit 404.</li><li>Parent-Objekt existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Berechtigung → System blockiert mit 403.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Alternativen</h2>
<h2>Ergebnis</h2>
<ul><li>Attachment-Zugriffe sind vollständig an Parent-Berechtigungen gebunden.</li><li>Es existieren keine eigenständigen Attachment-Berechtigungen.</li><li>Direkter Zugriff auf das Upload-Verzeichnis ist nicht möglich.</li></ul>