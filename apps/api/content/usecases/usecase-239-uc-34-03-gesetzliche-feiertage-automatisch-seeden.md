<h1>UC 34/03: Gesetzliche Feiertage automatisch seeden</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-34-kalendermarker-feiertage-betriebsferien.md">FT (34): Kalendermarker, Feiertage und Betriebsferien</a></li></ul>
<h2>Akteur</h2>
<p>System, Administrator</p>
<h2>Ziel</h2>
<p>Gesetzliche Feiertage automatisch als gespeicherte Kalendermarker bereitstellen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Feiertagsberechnung für Deutschland ist verfügbar.</li><li>Der Kalendermarker-Bestand ist beschreibbar.</li></ul>
<h2>Ablauf</h2>
<p>1. System startet den Feiertags-Seed über System-Seed oder nach dem ersten erfolgreichen Admin-Login des Tages.<br>2. System bestimmt den Zeitraum aktuelles Jahr bis aktuelles Jahr plus fünf Jahre.<br>3. System berechnet bundesweite und regionale gesetzliche Feiertage.<br>4. System bildet daraus Kalendermarker mit Quelle <code>automatic</code>.<br>5. System prüft je Marker, ob die fachliche Identität aus Datum, Typ, Quelle, Geltung und Bundesländern bereits existiert.<br>6. System ergänzt nur fehlende Marker und überschreibt vorhandene Marker mit identischer fachlicher Identität nicht.</p>
<h2>Alternativen</h2>
<ul><li>Existiert ein Marker bereits, bleibt er unverändert.</li><li>Läuft am selben Tag ein weiterer Admin-Login, wird kein erneuter Login-Seed ausgeführt.</li><li>Nicht-Admin-Logins lösen keinen Feiertags-Seed aus.</li><li>Schlägt der Seed technisch fehl, bleiben bereits vorhandene Marker unverändert nutzbar.</li></ul>
<h2>Ergebnis</h2>
<p>Gesetzliche Feiertage liegen als gespeicherte Kalendermarker vor. Editierte Werte bestehender Marker bleiben erhalten.</p>