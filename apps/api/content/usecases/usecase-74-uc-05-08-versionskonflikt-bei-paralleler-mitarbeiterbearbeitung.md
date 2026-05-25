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
<ol><li>Akteur A öffnet die Detailansicht des Mitarbeiters.</li><li>Akteur B öffnet denselben Mitarbeiter.</li><li>System liefert beiden Akteuren denselben Versionsstand.</li><li>Akteur A ändert Daten und speichert.</li><li>System validiert die Version.</li><li>System persistiert die Änderungen.</li><li>System erhöht die Versionskennung.</li><li>Akteur B ändert Daten auf Basis der alten Version.</li><li>Akteur B speichert.</li><li>System erkennt eine abweichende Versionskennung.</li><li>System blockiert den Speichervorgang.</li></ol>
<h2>Alternativen</h2>
<ul><li>Akteur B lädt vor dem Speichern neu → System liefert aktuellen Stand, kein Konflikt.</li><li>Einer der Akteure bricht ab → Kein Konflikt.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Der zuletzt gültig gespeicherte Zustand bleibt unverändert.</li><li>Es erfolgt keine stille Überschreibung.</li><li>Das System antwortet mit HTTP 409 Conflict.</li><li>Die Fehlermeldung weist explizit auf einen Versionskonflikt hin.</li><li>Der Akteur muss den Datensatz neu laden, bevor erneut gespeichert werden kann.</li><li>Die Datenbank enthält zu keinem Zeitpunkt einen inkonsistenten Zustand.</li></ul>