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
<ol><li>Akteur öffnet die Mitarbeiterverwaltung.</li><li>System ermittelt die Rolle des Akteurs.</li><li>System lädt Mitarbeiterdaten:<ul><li>Administrator erhält aktive und inaktive Mitarbeiter.</li><li>Disponent erhält ausschließlich aktive Mitarbeiter.</li><li>Leser erhält ausschließlich Lesedaten gemäß seiner Rolle.</li></ul></li><li>System stellt Daten in Board- oder Tabellenansicht dar.</li></ol>
<h3>Ablauf – Detailansicht</h3>
<ol><li>Akteur wählt einen Mitarbeiter aus der Liste.</li><li>System lädt vollständige Stammdaten.</li><li>System lädt zugehörige Anhänge.</li><li>System lädt Terminübersicht gemäß UC 03.</li><li>System zeigt Detailansicht an.</li></ol>
<h2>Alternativen</h2>
<ul><li>Mitarbeiter existiert nicht → System antwortet mit 404.</li><li>Akteur ohne Leserechte → System blockiert mit 403.</li><li>Keine Mitarbeiter vorhanden → System zeigt leere Liste ohne Fehler.</li><li>Parallel wird Mitarbeiter deaktiviert → Disponent erhält bei nächster Abfrage aktualisierte Liste ohne diesen Mitarbeiter.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Mitarbeiterdaten werden rollenbasiert korrekt angezeigt.</li><li>Disponenten sehen keine deaktivierten Mitarbeiter.</li><li>Administratoren sehen vollständigen Bestand.</li><li>Terminübersicht entspricht dem aktuellen Stand der Terminrelation.</li><li>Es erfolgt keinerlei fachliche Datenänderung.</li><li>Es entstehen keine inkonsistenten Zustände durch Anzeigeoperationen.</li></ul>