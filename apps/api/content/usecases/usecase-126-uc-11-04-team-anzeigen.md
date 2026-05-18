<h1>UC 11/04: Team anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-11-team-verwaltung.md">FT (11): Team Verwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent</p>
<h2>Ziel</h2>
<p>Eine Übersicht über vorhandene Teams und deren Zusammensetzung erhalten.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Leseberechtigung.</li></ul>
<h3>Auslöser</h3>
<p>Der Akteur ruft die Teamübersicht auf oder wählt ein Team aus.</p>
<h2>Ablauf</h2>
<p>1. Das System lädt alle Teams.<br>2. Das System lädt zu jedem Team die aktuell zugeordneten aktiven Mitarbeiter (<code>team_id = teamId</code>).<br>3. Das System zeigt Bezeichnung und Mitarbeiterliste an.</p>
<h2>Alternativen</h2>
<ul><li>Keine Teams vorhanden → Das System zeigt eine entsprechende Information an.</li><li>Technischer Fehler → Das System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die Zusammensetzung der Teams ist vollständig und konsistent sichtbar.</li></ul>