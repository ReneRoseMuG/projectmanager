<h1>UC 11/03: Team löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-11-team-verwaltung.md">FT (11): Team Verwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent</p>
<h2>Ziel</h2>
<p>Ein nicht mehr benötigtes Team entfernen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Team existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Berechtigung zum Löschen von Teams.</li><li>Das Team besitzt eine gültige Versionskennung.</li></ul>
<h3>Auslöser</h3>
<p>Der Akteur wählt ein Team zum Löschen aus.</p>
<h2>Ablauf</h2>
<p>1. Der Akteur startet „Team löschen“.<br>2. Das System fordert eine Bestätigung an.<br>3. Der Akteur bestätigt den Löschvorgang.<br>4. Das System prüft serverseitig die Versionskennung.<br>5. Das System setzt bei allen Mitarbeitern dieses Teams das Feld <code>team_id = null</code>.<br>6. Das System löscht das Team.</p>
<h2>Alternativen</h2>
<ul><li>Versionskonflikt → Das System antwortet mit 409 Conflict, keine Löschung.</li><li>Abbruch durch den Akteur → Keine Löschung.</li><li>Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Das Team existiert nicht mehr.</li><li>Alle ehemals zugeordneten Mitarbeiter besitzen <code>team_id = null</code>.</li><li>Kein verwaister Zustand entsteht.</li></ul>