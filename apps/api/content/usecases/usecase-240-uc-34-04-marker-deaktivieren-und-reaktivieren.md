<h1>UC 34/04: Marker deaktivieren und reaktivieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-34-kalendermarker-feiertage-betriebsferien.md">FT (34): Kalendermarker, Feiertage und Betriebsferien</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Einen gespeicherten Marker zeitweise aus der Kalenderanzeige entfernen und später wieder anzeigen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Akteur ist als Administrator angemeldet.</li><li>Ein gespeicherter Kalendermarker existiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Administrator öffnet <code>Stammdaten &gt; Feiertage</code>.<br>2. Administrator wählt einen aktiven Marker.<br>3. Administrator deaktiviert den Marker.<br>4. System speichert den Marker mit Aktiv-Status inaktiv.<br>5. System entfernt den Marker aus dem Kalender-Leseendpunkt.<br>6. Administrator reaktiviert den Marker bei Bedarf.<br>7. System nimmt den Marker wieder in die Kalenderanzeige auf.</p>
<h2>Alternativen</h2>
<ul><li>Wird der Marker nur bearbeitet, bleibt sein Aktiv-Status unverändert.</li><li>Ein späterer Seed darf den deaktivierten Marker nicht wieder aktivieren.</li></ul>
<h2>Ergebnis</h2>
<p>Der Aktiv-Status steuert die Kalenderanzeige, ohne den gespeicherten Marker aus der Verwaltung zu entfernen.</p>