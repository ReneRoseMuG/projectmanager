<h1>UC 14/01: Benutzer anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-14-benutzer-und-rollenverwaltung.md">FT (14): Benutzer- und Rollenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Admin</p>
<h2>Ziel</h2>
<p>Einen neuen Benutzer mit einer gültigen Rolle im System anlegen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Admin.</li><li>Es existiert mindestens ein weiterer Admin im System.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Benutzerverwaltung.<br>2. Der Akteur wählt die Funktion „Benutzer anlegen“.<br>3. Das System zeigt ein Formular zur Erfassung der Benutzerdaten an.<br>4. Der Akteur erfasst die erforderlichen Stammdaten.<br>5. Der Akteur wählt eine Rolle aus (Leser, Disponent oder Admin).<br>6. Der Akteur speichert.<br>7. Das System prüft die Admin-Berechtigung serverseitig.<br>8. Das System validiert die Eingaben.<br>9. Das System persistiert den Benutzer mit der gewählten Rolle.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur besitzt keine Admin-Rolle → System antwortet mit 403.</li><li>Pflichtfelder fehlen → System lehnt ab und speichert nicht.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<p>Ein neuer Benutzer existiert persistent mit genau einer Rolle.</p>