<h1>UC 34/01: Kalendermarker im Kalender anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-34-kalendermarker-feiertage-betriebsferien.md">FT (34): Kalendermarker, Feiertage und Betriebsferien</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Kalenderrelevante Marker im Wochen- und Monatskalender erkennen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist angemeldet.</li><li>Für den sichtbaren Zeitraum existieren aktive Kalendermarker.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet Wochen- oder Monatskalender.<br>2. System lädt aktive Kalendermarker für den sichtbaren Zeitraum.<br>3. System hinterlegt betroffene Tage farbig entsprechend der Markerart.<br>4. Im Wochenkalender markiert System den betroffenen Tag als durchgehende Spalte über alle sichtbaren Tour-Lanes.<br>5. Im Monatskalender markiert System die volle betroffene Tageskachel.<br>6. System zeigt den Marker im Tageskopf abhängig vom verfügbaren Platz als Volltext, kompakten Platzhalter oder Icon.<br>7. Bei komprimierter Darstellung bleibt der vollständige Markername per Hover erreichbar.</p>
<h2>Alternativen</h2>
<ul><li>Gibt es keine aktiven Marker im sichtbaren Zeitraum, bleibt die Kalenderansicht unverändert.</li><li>Sind mehrere Marker auf demselben Tag aktiv, zeigt die Oberfläche im Tageskopf nur einen Primärmarker in verdichteter Form an.</li></ul>
<h2>Ergebnis</h2>
<p>Akteur erkennt Feiertage, Betriebsfeiertage und Betriebsferien im Kalender, ohne dass Terminbedienung, Drag &amp; Drop oder Klickverhalten blockiert werden.</p>