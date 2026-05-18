<h1>UC 07/10: Terminänderung im CalDAV-Kalender aktualisieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Externen Kalender an geänderten Termin anpassen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Termin besitzt external_event_id.</li></ul>
<h2>Ablauf</h2>
<ul><li>System erzeugt aktualisierte iCalendar-Daten.</li><li>System sendet HTTP PUT an bestehende Event-URL.</li><li>Status wird aktualisiert.</li><li>Logeintrag wird erstellt.</li></ul>
<h2>Alternativen</h2>
<ul><li>Event extern nicht vorhanden → Event wird neu angelegt.</li></ul>
<h2>Ergebnis</h2>
<p>Externer Kalender entspricht internem Stand.</p>