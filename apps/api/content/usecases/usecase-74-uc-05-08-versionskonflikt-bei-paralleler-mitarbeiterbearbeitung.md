<h1>UC 05/08: Versionskonflikt bei paralleler Mitarbeiterbearbeitung</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-05-mitarbeiterverwaltung.md">FT (05): Mitarbeiterverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass bei paralleler Bearbeitung desselben Mitarbeiters keine unbeabsichtigten Datenüberschreibungen entstehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Mitarbeiter existiert.</li><li>Zwei Akteure sind gleichzeitig angemeldet.</li><li>Beide Akteure haben Änderungsrechte.</li><li>Der Mitarbeiterdatensatz besitzt eine Versionskennung.</li><li>Beide Akteure öffnen denselben Mitarbeiterdatensatz.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur A öffnet die Detailansicht des Mitarbeiters.<br>2. Akteur B öffnet denselben Mitarbeiter.<br>3. System liefert beiden Akteuren denselben Versionsstand.<br>4. Akteur A ändert Daten und speichert.<br>5. System validiert die Version.<br>6. System persistiert die Änderungen.<br>7. System erhöht die Versionskennung.<br>8. Akteur B ändert Daten auf Basis der alten Version.<br>9. Akteur B speichert.<br>10. System erkennt eine abweichende Versionskennung.<br>11. System blockiert den Speichervorgang.</p>
<h2>Alternativen</h2>
<ul><li>Akteur B lädt vor dem Speichern neu →</li></ul>
<p>System liefert aktuellen Stand, kein Konflikt.</p>
<ul><li>Einer der Akteure bricht ab →</li></ul>
<p>Kein Konflikt.</p>
<ul><li>Technischer Fehler →</li></ul>
<p>System antwortet mit 500.</p>
<h2>Ergebnis</h2>
<ul><li>Der zuletzt gültig gespeicherte Zustand bleibt unverändert.</li><li>Es erfolgt keine stille Überschreibung.</li><li>Das System antwortet mit HTTP 409 Conflict.</li><li>Die Fehlermeldung weist explizit auf einen Versionskonflikt hin.</li><li>Der Akteur muss den Datensatz neu laden, bevor erneut gespeichert werden kann.</li><li>Die Datenbank enthält zu keinem Zeitpunkt einen inkonsistenten Zustand.</li></ul>