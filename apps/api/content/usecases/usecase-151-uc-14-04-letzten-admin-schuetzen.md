<h1>UC 14/04: Letzten Admin schützen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-14-benutzer-und-rollenverwaltung.md">FT (14): Benutzer- und Rollenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass das System niemals ohne Admin bleibt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Es existiert genau ein Admin.</li><li>Der Akteur versucht, diesen herabzustufen oder zu löschen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur startet die Rollenänderung oder Löschung.<br>2. Das System prüft die Anzahl verbleibender Admins.<br>3. Das System erkennt, dass kein weiterer Admin existiert.<br>4. Das System blockiert die Aktion.<br>5. Das System antwortet mit 409.</p>
<h2>Alternativen</h2>
<ul><li>Es existieren mehrere Admins → Aktion wird erlaubt.</li></ul>
<h2>Ergebnis</h2>
<p>Mindestens ein Admin bleibt im System erhalten.</p>