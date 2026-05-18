<h1>UC 06/03: Messe-Workflow bei Zuordnung zur Tour Messe</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-06-automatische-regeln.md">FT (06): Automatische Regeln</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Bei Zuordnung eines Termins zur Tour „Messe“ den Messe-Zustand und eine Messe-Notiz anbieten.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin existiert.</li><li>Der Termin ist noch nicht der Tour „Messe“ zugeordnet.</li><li>Für den Termin existiert noch keine passende Messe-Notiz.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur ordnet den Termin der Tour „Messe“ zu.<br>2. Das System erkennt die Zuordnung zur Messe-Tour.<br>3. Das System setzt den Messe-Tag.<br>4. Das System bietet eine Messe-Notiz aus einer Systemvorlage an.<br>5. Wenn der Akteur den Vorschlag annimmt, öffnet das System die vorbereitete Notiz.<br>6. Der Akteur prüft und speichert die Notiz.</p>
<h2>Alternativen</h2>
<ul><li>Der Akteur lehnt die Notiz ab: Der Messe-Tag bleibt gesetzt, es wird keine Notiz erstellt.</li><li>Eine passende Messe-Notiz existiert bereits: Das System schlägt keine weitere Notiz vor.</li><li>Der Akteur bricht die Notizerstellung ab: Es wird keine Notiz gespeichert.</li><li>Der Termin wird von der Messe-Tour auf eine andere Tour verschoben: Das System entfernt den Messe-Tag automatisch.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin trägt den Messe-Tag und besitzt bei Annahme des Vorschlags eine passende Messe-Notiz. Wird der Termin aus der Messe-Tour entfernt, verschwindet der Messe-Tag.</p>