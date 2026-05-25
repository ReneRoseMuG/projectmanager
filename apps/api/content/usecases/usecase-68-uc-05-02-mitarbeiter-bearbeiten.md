<h1>UC 05/02: Mitarbeiter bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Bestehende Stammdaten eines Mitarbeiters ändern, ohne Termin- oder Historienlogik zu beeinflussen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Mitarbeiter existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Administrator oder Disponent.</li><li>Der Mitarbeiterdatensatz enthält eine gültige Versionskennung (Optimistic Locking).</li><li>Der Mitarbeiter ist nicht physisch gelöscht.</li></ul>
<h2>Ablauf</h2>
<ol><li>Akteur öffnet die Mitarbeiterverwaltung.</li><li>Akteur wählt einen bestehenden Mitarbeiter.</li><li>System lädt die aktuellen Stammdaten einschließlich Versionskennung.</li><li>Akteur ändert zulässige Felder.</li><li>Akteur speichert die Änderungen.</li><li>System prüft die Versionskennung.</li><li>System validiert die Eingaben.</li><li>System persistiert die Änderungen.</li><li>System erhöht die Versionskennung.</li><li>System aktualisiert alle abhängigen Anzeige- und Auswahlansichten.</li></ol>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Berechtigung → System blockiert mit 403.</li><li>Versionskonflikt (parallele Bearbeitung) → System blockiert mit 409 und speichert nicht.</li><li>Ungültige Eingaben → System antwortet mit 400 und speichert nicht.</li><li>Technischer Persistenzfehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Die geänderten Stammdaten sind persistent gespeichert.</li><li>Die Versionskennung wurde erhöht.</li><li>Terminzuweisungen bleiben unverändert.</li><li>Historische Termine bleiben unverändert.</li><li>Kalenderansichten, Kartenansichten und Terminformulare zeigen bei erneuter Abfrage die aktualisierten Mitarbeiterdaten.</li><li>Es entstehen keine inkonsistenten FK-Zustände.</li></ul>