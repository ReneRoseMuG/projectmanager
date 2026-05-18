<h1>UC 34/02: Feiertage und Betriebsmarker verwalten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-34-kalendermarker-feiertage-betriebsferien.md">FT (34): Kalendermarker, Feiertage und Betriebsferien</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Gespeicherte Kalendermarker prüfen und Betriebsfeiertage oder Betriebsferien pflegen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Akteur ist als Administrator oder Disponent angemeldet.</li><li>Der Bereich <code>Einstellungen &gt; Feiertage</code> ist erreichbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet <code>Einstellungen &gt; Feiertage</code>.<br>2. System zeigt gespeicherte gesetzliche Feiertage, Betriebsfeiertage und Betriebsferien in der Tabelle.<br>3. Akteur legt einen neuen Betriebsfeiertag oder eine neue Betriebsferienperiode an.<br>4. System validiert Datum, Zeitraum, Typ und Pflichtfelder.<br>5. System speichert den Marker im Kalendermarker-Bestand.<br>6. System aktualisiert Tabelle und Kalenderdaten.</p>
<h2>Alternativen</h2>
<ul><li>Akteur bearbeitet einen bestehenden Marker.</li><li>Akteur löscht einen Marker, wenn dies fachlich zulässig ist.</li><li>Leser ruft den Bereich auf oder den Schreibpfad direkt: System verweigert die Pflege serverseitig.</li><li>Bei ungültigen Eingaben lehnt das System die Speicherung ab.</li></ul>
<h2>Ergebnis</h2>
<p>Der gespeicherte Kalendermarker-Bestand ist aktualisiert und wird in Kalenderansichten berücksichtigt, sofern der Marker aktiv ist.</p>