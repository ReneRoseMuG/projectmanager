<h1>UC 34/05: Visualisierungsstil global wählen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-34-kalendermarker-feiertage-betriebsferien.md">FT (34): Kalendermarker, Feiertage und Betriebsferien</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Die Intensität der Kalendermarker-Darstellung global festlegen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Akteur ist als Administrator oder Disponent angemeldet.</li><li>Der Bereich <code>Einstellungen &gt; Feiertage</code> ist geöffnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur sieht die Stilauswahl <code>Dezent</code>, <code>Standard</code>, <code>Hervorgehoben</code>.<br>2. Akteur wählt einen Stil.<br>3. System speichert den Stil als globales Setting.<br>4. Wochen- und Monatskalender verwenden den wirksamen Stil beim nächsten Laden oder Aktualisieren für Hintergrundmarkierung und Markerchips.<br>5. System verändert dabei nur die Intensität der Farben, nicht Markerart, Markertext, Persistenz oder Seed-Logik.</p>
<h2>Alternativen</h2>
<ul><li>Ist kein Stil gespeichert, gilt <code>Standard</code>.</li><li>Ungültige Werte werden serverseitig abgelehnt.</li><li>Leser versucht den Schreibpfad direkt zu nutzen: System lehnt serverseitig ab.</li></ul>
<h2>Ergebnis</h2>
<p>Die Markerfarbe wird global in der gewählten Intensität dargestellt. Die fachliche Markerlogik bleibt unverändert.</p>