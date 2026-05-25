<h1>UC 05/03: Mitarbeiter-Termine anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Die Stammdaten eines Mitarbeiters einsehen und nachvollziehen, welchen Terminen dieser Mitarbeiter aktuell oder in der Vergangenheit zugeordnet ist.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Mitarbeiter existiert.</li><li>Der Nutzer ist berechtigt, Mitarbeiterdaten einzusehen.</li></ul>
<h2>Auslöser</h2>
<p>Der Nutzer wählt einen Mitarbeiter zur Anzeige aus.</p>
<h2>Ablauf</h2>
<ol><li>Der Nutzer wählt einen bestehenden Mitarbeiter aus.</li><li>Das System zeigt die Stammdaten des Mitarbeiters an.</li><li>Das System ermittelt alle Termine (Terminauswahl in der Sidebar und alle Termine auf Anfrage), denen der Mitarbeiter zugewiesen ist, über die Termin-Mitarbeiter-Relation.</li><li>Das System zeigt zu jedem Termin die relevanten Informationen an.</li><li>Das System stellt sicher, dass auch vergangene Termine angezeigt werden.</li></ol>
<h2>Alternativen</h2>
<ul><li>Dem Mitarbeiter sind keine Termine zugewiesen: Das System zeigt eine leere Terminliste an.</li></ul>
<h2>Ergebnis</h2>
<p>Die Stammdaten des Mitarbeiters sowie eine vollständige Übersicht aller zugeordneten Termine sind sichtbar.</p>
<p>Die Terminliste bildet die Einsatzhistorie des Mitarbeiters ab.</p>
<h2>Angezeigte Informationen (Terminliste)</h2>
<ul><li>Terminzeitraum (Start- und ggf. Enddatum)</li><li>Terminbezeichnung</li><li>Zugeordnete Tour</li><li>Zugeordneter Kunde</li></ul>