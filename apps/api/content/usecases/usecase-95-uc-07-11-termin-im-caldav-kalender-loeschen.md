<h1>UC 07/11: Termin im CalDAV-Kalender löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Externes Event entfernen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Termin wird intern gelöscht.</li><li>external_event_id ist vorhanden.</li></ul>
<h2>Ablauf</h2>
<ul><li>System sendet HTTP DELETE an Event-URL.</li><li>external_event_id wird entfernt.</li><li>Logeintrag wird erstellt.</li></ul>
<h2>Alternativen</h2>
<ul><li>Event nicht auffindbar → Fehler protokollieren, intern fortfahren.</li></ul>
<h2>Ergebnis</h2>
<p>Termin ist extern nicht mehr sichtbar.</p>