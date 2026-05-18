<h1>UC 08/05: Journal ohne Leseberechtigung nicht öffnen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-08-journal-aenderungshistorie.md">FT (08): Journal / Änderungshistorie</a></li></ul>
<h2>Akteur</h2>
<p>Benutzer ohne Journal-Leseberechtigung</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass nur berechtigte Rollen Journalinhalte sehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Benutzer ist angemeldet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Benutzer versucht, das Journal zu öffnen.<br>2. Das System prüft die Rolle und Leseberechtigung.<br>3. Bei fehlender Berechtigung zeigt das System keine Journalinhalte an und blockiert den Zugriff.</p>
<h2>Alternativen</h2>
<p>Keine.</p>
<h2>Ergebnis</h2>
<p>Die Änderungshistorie bleibt auf Administratoren und Disponenten mit Berechtigung beschränkt.</p>