<h1>UC 05/07: Mitarbeiter anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Mitarbeiterdaten in Listen- und Detailansichten anzeigen, rollenbasiert gefiltert.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Mitarbeiterbestand ist im System vorhanden.</li></ul>
<h2>Ablauf</h2>
<h3>Ablauf – Listenansicht</h3>
<p>1. Akteur öffnet die Mitarbeiterverwaltung.<br>2. System ermittelt die Rolle des Akteurs.<br>3. System lädt Mitarbeiterdaten:</p>
<ul><li>Administrator erhält aktive und inaktive Mitarbeiter.</li><li>Disponent erhält ausschließlich aktive Mitarbeiter.</li><li>Leser erhält ausschließlich Lesedaten gemäß seiner Rolle.</li></ul>
<p>4. System stellt Daten in Board- oder Tabellenansicht dar.</p>
<h3>Ablauf – Detailansicht</h3>
<p>1. Akteur wählt einen Mitarbeiter aus der Liste.<br>2. System lädt vollständige Stammdaten.<br>3. System lädt zugehörige Anhänge.<br>4. System lädt Terminübersicht gemäß UC 03.<br>5. System zeigt Detailansicht an.</p>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter existiert nicht →</li></ul>
<p>System antwortet mit 404.</p>
<ul><li>Akteur ohne Leserechte →</li></ul>
<p>System blockiert mit 403.</p>
<ul><li>Keine Mitarbeiter vorhanden →</li></ul>
<p>System zeigt leere Liste ohne Fehler.</p>
<ul><li>Parallel wird Mitarbeiter deaktiviert →</li></ul>
<p>Disponent erhält bei nächster Abfrage aktualisierte Liste ohne diesen Mitarbeiter.</p>
<h2>Ergebnis</h2>
<ul><li>Mitarbeiterdaten werden rollenbasiert korrekt angezeigt.</li><li>Disponenten sehen keine deaktivierten Mitarbeiter.</li><li>Administratoren sehen vollständigen Bestand.</li><li>Terminübersicht entspricht dem aktuellen Stand der Terminrelation.</li><li>Es erfolgt keinerlei fachliche Datenänderung.</li><li>Es entstehen keine inkonsistenten Zustände durch Anzeigeoperationen.</li></ul>