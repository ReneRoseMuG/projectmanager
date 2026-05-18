<h1>UC 06/06: Zustand Geparkt bei Wechsel weg von Parkplatz automatisch entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-06-automatische-regeln.md">FT (06): Automatische Regeln</a></li></ul>
<h2>Akteur</h2>
<p>System</p>
<h2>Ziel</h2>
<p>Den Zustand „Geparkt“ automatisch entfernen, sobald ein Termin den Parkplatz verlässt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Termin ist der Tour „Parkplatz“ zugeordnet.</li><li>Der Termin trägt den Zustand „Geparkt“.</li><li>Die Tourzuordnung wird auf eine andere Tour geändert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur ändert die Tourzuordnung des Termins auf eine reguläre Tour.<br>2. Das System erkennt, dass der Termin die Tour „Parkplatz“ verlässt.<br>3. Das System entfernt den Zustand „Geparkt“.<br>4. Das System speichert die neue Tourzuordnung.</p>
<h2>Alternativen</h2>
<ul><li>Der Termin bleibt auf dem Parkplatz: Der Zustand „Geparkt“ bleibt erhalten.</li><li>Die Änderung wird abgebrochen: Der Termin bleibt unverändert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin liegt auf einer regulären Tour und trägt den Zustand „Geparkt“ nicht mehr.</p>