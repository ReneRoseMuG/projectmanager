<h1>UC 16/08: Unberechtigter Zugriff auf Hilfetext-Verwaltung verhindern</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass nur Administratoren Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder löschen dürfen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt keine Admin-Rechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur versucht, die Hilfetext-Verwaltung aufzurufen oder eine Verwaltungsaktion auszuführen.<br>2. Das System prüft serverseitig die Rolle des Akteurs.<br>3. Das System verweigert den Zugriff auf Verwaltungsfunktionen.<br>4. Das System liefert einen Berechtigungsfehler zurück.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur versucht, direkt über einen API-Endpunkt eine Verwaltungsaktion auszuführen → Das System prüft die Rolle und blockiert ebenfalls mit einem Berechtigungsfehler.</li><li>Technischer Fehler → Das System liefert einen Fehlerstatus zurück.</li></ul>
<h2>Ergebnis</h2>
<p>Nicht berechtigte Rollen können keine Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder löschen. Die Integrität der Hilfetexte bleibt gewahrt.</p>