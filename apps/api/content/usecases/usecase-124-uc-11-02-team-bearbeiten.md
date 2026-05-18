<h1>UC 11/02: Team bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-11-team-verwaltung.md">FT (11): Team Verwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent</p>
<h2>Ziel</h2>
<p>Ein bestehendes Team anpassen, indem Mitarbeiter hinzugefügt oder entfernt werden.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Team existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Berechtigung zur Teambearbeitung.</li><li>Das Team besitzt eine gültige Versionskennung.</li></ul>
<h3>Auslöser</h3>
<p>Der Akteur öffnet ein bestehendes Team zur Bearbeitung.</p>
<h2>Ablauf</h2>
<p>1. Das System lädt Teamdaten inklusive aktueller Versionskennung.<br>2. Das System lädt als auswählbare Mitarbeiter:</p>
<ul><li>alle aktiven Mitarbeiter ohne Teamzuordnung (<code>team_id = null</code>),</li><li>alle aktiven Mitarbeiter, die bereits diesem Team zugeordnet sind.</li></ul>
<p>3. Der Akteur verändert die Mitarbeiterliste.<br>4. Der Akteur bestätigt die Änderungen.<br>5. Das System prüft serverseitig:</p>
<ul><li>Versionskennung ist unverändert.</li><li>Jeder neu hinzugefügte Mitarbeiter existiert.</li><li>Jeder neu hinzugefügte Mitarbeiter ist aktiv.</li><li>Kein neu hinzugefügter Mitarbeiter ist einem anderen Team zugeordnet.</li></ul>
<p>6. Das System entfernt <code>team_id</code> bei Mitarbeitern, die aus dem Team entfernt wurden.<br>7. Das System setzt <code>team_id</code> bei neu hinzugefügten Mitarbeitern auf die Team-ID.<br>8. Das System erhöht die Versionskennung des Teams.<br>9. Das System persistiert die Änderungen atomar.</p>
<h2>Alternativen</h2>
<ul><li>Versionskennung hat sich zwischenzeitlich geändert → Das System antwortet mit 409 Conflict, keine Persistierung.</li><li>Ein neu hinzugefügter Mitarbeiter wurde parallel einem anderen Team zugeordnet → Das System antwortet mit 409 Conflict, keine Persistierung.</li><li>Abbruch durch den Akteur → Keine Persistierung.</li><li>Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung erfolgt.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die Mitarbeiterliste des Teams ist aktualisiert.</li><li>Kein Mitarbeiter ist mehreren Teams zugeordnet.</li><li>Die Team-Version ist erhöht.</li><li>Der Datenzustand ist konsistent.</li></ul>