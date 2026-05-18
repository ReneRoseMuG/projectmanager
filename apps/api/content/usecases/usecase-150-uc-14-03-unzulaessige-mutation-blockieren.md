<h1>UC 14/03: Unzulässige Mutation blockieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-14-benutzer-und-rollenverwaltung.md">FT (14): Benutzer- und Rollenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Leser oder Disponent ohne ausreichende Rechte</p>
<h2>Ziel</h2>
<p>Verhindern, dass ein Benutzer eine nicht erlaubte Mutation ausführt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist authentifiziert.</li><li>Der Benutzer besitzt nicht die erforderliche Rolle.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur löst eine schreibende Aktion aus.<br>2. Das System prüft serverseitig die Rolle.<br>3. Das System erkennt fehlende Berechtigung.<br>4. Das System blockiert die Mutation.<br>5. Das System antwortet mit 403.</p>
<h2>Alternativen</h2>
<ul><li>UI verhindert bereits die Anzeige der Aktion → Keine Mutation möglich.</li><li>Manipulierter Request → Serverseitige Blockade greift.</li></ul>
<h2>Ergebnis</h2>
<p>Keine fachliche Änderung wird persistiert.</p>