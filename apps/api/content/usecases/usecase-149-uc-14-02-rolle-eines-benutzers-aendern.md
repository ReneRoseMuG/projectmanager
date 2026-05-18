<h1>UC 14/02: Rolle eines Benutzers ändern</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-14-benutzer-und-rollenverwaltung.md">FT (14): Benutzer- und Rollenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Die Rolle eines bestehenden Benutzers ändern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer existiert.</li><li>Der Akteur besitzt die Rolle Admin.</li><li>Es bleibt mindestens ein Admin im System erhalten.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Detailansicht eines Benutzers.<br>2. Der Akteur ändert die Rolle.<br>3. Der Akteur speichert.<br>4. Das System prüft serverseitig die Admin-Berechtigung.<br>5. Das System prüft, ob nach der Änderung mindestens ein Admin verbleibt.<br>6. Das System persistiert die neue Rolle.</p>
<h2>Alternativen</h2>
<ul><li>Letzter Admin würde entfernt → System blockiert mit 409.</li><li>Akteur ohne Admin-Rolle → System blockiert mit 403.</li><li>Versionskonflikt → System blockiert mit 409.</li></ul>
<h2>Ergebnis</h2>
<p>Die Rolle ist aktualisiert und wirkt systemweit.</p>