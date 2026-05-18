<h1>UC 14/06: Deep-Link serverseitig validieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-14-benutzer-und-rollenverwaltung.md">FT (14): Benutzer- und Rollenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Benutzer ohne ausreichende Rolle</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass direkte URL-Aufrufe keine unzulässigen Aktionen ermöglichen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist authentifiziert.</li><li>Der Benutzer besitzt nicht die erforderliche Rolle.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur ruft eine geschützte Route direkt auf.<br>2. Das System prüft serverseitig die Rolle.<br>3. Das System verweigert Zugriff.<br>4. Das System antwortet mit 403.</p>
<h2>Alternativen</h2>
<ul><li>Route existiert nicht → 404.</li><li>Technischer Fehler → 500.</li></ul>
<h2>Ergebnis</h2>
<p>Keine unzulässige Aktion wird ausgeführt.</p>