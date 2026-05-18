<h1>UC 07/08: Termin in externen Kalender übertragen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Neuen Termin im externen Kalender anlegen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Termin wurde neu erstellt.</li><li>Externer Kalender ist konfiguriert.</li></ul>
<h2>Ablauf</h2>
<ul><li>System erzeugt Event-Daten aus Termin.</li><li>System sendet Event an Kalender-API.</li><li>Externe Event-ID wird gespeichert.</li><li>Status wird protokolliert.</li></ul>
<h2>Alternativen</h2>
<ul><li>API nicht erreichbar → Fehler wird protokolliert.</li></ul>
<h2>Ergebnis</h2>
<p>Termin ist im externen Kalender sichtbar.</p>