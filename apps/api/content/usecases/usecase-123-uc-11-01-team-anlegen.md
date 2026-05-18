<h1>UC 11/01: Team anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-11-team-verwaltung.md">FT (11): Team Verwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent</p>
<h2>Ziel</h2>
<p>Ein neues Team anlegen, um häufig genutzte Mitarbeiterkombinationen schnell verwenden zu können.</p>
<h2>Vorbedingungen</h2>
<ul><li>Es existieren aktive Mitarbeiter.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Berechtigung zur Teamanlage.</li></ul>
<h3>Auslöser</h3>
<p>Der Akteur startet die Funktion „Team anlegen“.</p>
<h2>Ablauf</h2>
<p>1. Das System erzeugt automatisch eine Bezeichnung für das neue Team.<br>2. Das System lädt ausschließlich aktive Mitarbeiter ohne bestehende Teamzuordnung (<code>team_id = null</code>).<br>3. Der Akteur wählt einen oder mehrere angezeigte Mitarbeiter aus.<br>4. Der Akteur bestätigt die Eingabe.<br>5. Das System prüft serverseitig für jeden ausgewählten Mitarbeiter:</p>
<ul><li>Der Mitarbeiter existiert.</li><li>Der Mitarbeiter ist aktiv.</li><li>Der Mitarbeiter besitzt keine bestehende Teamzuordnung.</li></ul>
<p>6. Das System persistiert das Team.<br>7. Das System setzt für jeden ausgewählten Mitarbeiter das Feld <code>team_id</code> auf die ID des neu angelegten Teams.<br>8. Das System erzeugt eine Versionskennung für das Team.</p>
<h2>Alternativen</h2>
<ul><li>Keine Mitarbeiter ausgewählt → Das System lehnt die Speicherung ab und fordert zur Auswahl auf.</li><li>Ein ausgewählter Mitarbeiter ist zwischenzeitlich einem anderen Team zugeordnet worden → Das System antwortet mit 409 Conflict, es erfolgt keine Persistierung.</li><li>Versionskonflikt bei paralleler Anlage mit identischer Bezeichnung → Das System behandelt dies gemäß allgemeiner Persistenzregeln.</li><li>Abbruch durch den Akteur → Keine Persistierung.</li><li>Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung erfolgt.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Ein neues Team existiert persistent.</li><li>Alle zugeordneten Mitarbeiter besitzen <code>team_id = neuesTeam</code>.</li><li>Kein Mitarbeiter ist mehreren Teams zugeordnet.</li><li>Die Teamliste ist konsistent.</li></ul>