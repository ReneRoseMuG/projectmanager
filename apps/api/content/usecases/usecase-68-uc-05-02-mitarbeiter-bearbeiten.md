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
<p>1. Akteur öffnet die Mitarbeiterverwaltung.<br>2. Akteur wählt einen bestehenden Mitarbeiter.<br>3. System lädt die aktuellen Stammdaten einschließlich Versionskennung.<br>4. Akteur ändert zulässige Felder.<br>5. Akteur speichert die Änderungen.<br>6. System prüft die Versionskennung.<br>7. System validiert die Eingaben.<br>8. System persistiert die Änderungen.<br>9. System erhöht die Versionskennung.<br>10. System aktualisiert alle abhängigen Anzeige- und Auswahlansichten.</p>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter existiert nicht →</li></ul>
<p>System antwortet mit 404.</p>
<ul><li>Akteur ohne Berechtigung →</li></ul>
<p>System blockiert mit 403.</p>
<ul><li>Versionskonflikt (parallele Bearbeitung) →</li></ul>
<p>System blockiert mit 409 und speichert nicht.</p>
<ul><li>Ungültige Eingaben →</li></ul>
<p>System antwortet mit 400 und speichert nicht.</p>
<ul><li>Technischer Persistenzfehler →</li></ul>
<p>System antwortet mit 500.</p>
<h2>Ergebnis</h2>
<ul><li>Die geänderten Stammdaten sind persistent gespeichert.</li><li>Die Versionskennung wurde erhöht.</li><li>Terminzuweisungen bleiben unverändert.</li><li>Historische Termine bleiben unverändert.</li><li>Kalenderansichten, Kartenansichten und Terminformulare zeigen bei erneuter Abfrage die aktualisierten Mitarbeiterdaten.</li><li>Es entstehen keine inkonsistenten FK-Zustände.</li></ul>